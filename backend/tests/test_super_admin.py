import unittest
from unittest.mock import patch, MagicMock
import os
import uuid
import json
from fastapi import HTTPException, UploadFile
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from io import BytesIO

from app.database.session import Base
from app.models import family_account, patient, user, hospital, rag, audit
from app.models.hospital import Hospital
from app.models.rag import RagDocument, DocumentChunk
from app.services.rag import ingest_document, ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES

class TestSuperAdminRagIngestion(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Use a temporary SQLite database for testing RAG ingestion
        cls.db_path = "test_sahyog.db"
        cls.engine = create_engine(f"sqlite:///{cls.db_path}")
        Base.metadata.create_all(bind=cls.engine)
        cls.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(cls.db_path):
            try:
                os.remove(cls.db_path)
            except Exception:
                pass

    def setUp(self):
        self.db = self.SessionLocal()
        # Clean up database tables for isolation
        self.db.query(DocumentChunk).delete()
        self.db.query(RagDocument).delete()
        self.db.query(Hospital).delete()
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def create_mock_upload_file(self, filename: str, content: bytes, content_type: str = "text/plain") -> UploadFile:
        file_like = BytesIO(content)
        mock_file = MagicMock()
        mock_file.read.side_effect = file_like.read
        mock_file.seek.side_effect = file_like.seek
        
        return UploadFile(
            file=mock_file,
            filename=filename,
            size=len(content),
            headers=MagicMock()
        )

    @patch("app.services.rag.upload_rag_document")
    def test_pre_upload_validation_invalid_extension(self, mock_upload):
        mock_file = self.create_mock_upload_file("test.exe", b"some binary code")
        with self.assertRaises(HTTPException) as context:
            ingest_document(
                db=self.db,
                hospital_id=None,
                uploaded_by=str(uuid.uuid4()),
                title="Test Ext",
                category="Clinical Guide",
                version="1.0",
                file=mock_file
            )
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("Unsupported file type", context.exception.detail)
        mock_upload.assert_not_called()

    @patch("app.services.rag.upload_rag_document")
    def test_pre_upload_validation_empty_file(self, mock_upload):
        mock_file = self.create_mock_upload_file("test.txt", b"")
        with self.assertRaises(HTTPException) as context:
            ingest_document(
                db=self.db,
                hospital_id=None,
                uploaded_by=str(uuid.uuid4()),
                title="Test Empty",
                category="Clinical Guide",
                version="1.0",
                file=mock_file
            )
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("empty", context.exception.detail)
        mock_upload.assert_not_called()

    @patch("app.services.rag.upload_rag_document")
    def test_pre_upload_validation_large_file(self, mock_upload):
        large_content = b"x" * (MAX_FILE_SIZE_BYTES + 1)
        mock_file = self.create_mock_upload_file("large.txt", large_content)
        
        with self.assertRaises(HTTPException) as context:
            ingest_document(
                db=self.db,
                hospital_id=None,
                uploaded_by=str(uuid.uuid4()),
                title="Test Large",
                category="Clinical Guide",
                version="1.0",
                file=mock_file
            )
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("exceeds maximum size", context.exception.detail)
        mock_upload.assert_not_called()

    @patch("app.services.rag.upload_rag_document")
    def test_hospital_scope_validation_invalid_uuid(self, mock_upload):
        mock_file = self.create_mock_upload_file("test.txt", b"Valid text content")
        with self.assertRaises(HTTPException) as context:
            ingest_document(
                db=self.db,
                hospital_id="invalid-uuid-string",
                uploaded_by=str(uuid.uuid4()),
                title="Test Invalid Hosp ID",
                category="Clinical Guide",
                version="1.0",
                file=mock_file
            )
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("Invalid hospital_id UUID format", context.exception.detail)
        mock_upload.assert_not_called()

    @patch("app.services.rag.upload_rag_document")
    def test_hospital_scope_validation_non_existent(self, mock_upload):
        mock_file = self.create_mock_upload_file("test.txt", b"Valid text content")
        non_existent_uuid = str(uuid.uuid4())
        with self.assertRaises(HTTPException) as context:
            ingest_document(
                db=self.db,
                hospital_id=non_existent_uuid,
                uploaded_by=str(uuid.uuid4()),
                title="Test Non-Existent Hosp",
                category="Clinical Guide",
                version="1.0",
                file=mock_file
            )
        self.assertEqual(context.exception.status_code, 404)
        self.assertIn("does not exist", context.exception.detail)
        mock_upload.assert_not_called()

    @patch("app.services.rag.upload_rag_document")
    def test_hospital_scope_validation_deleted(self, mock_upload):
        h_id = str(uuid.uuid4())
        from datetime import datetime, timezone
        deleted_hospital = Hospital(
            id=h_id,
            name="Deleted Hospital",
            email="deleted@hospital.com",
            address="123 Road",
            contact_number="12345",
            deleted_at=datetime.now(timezone.utc)
        )
        self.db.add(deleted_hospital)
        self.db.commit()

        mock_file = self.create_mock_upload_file("test.txt", b"Valid text content")
        with self.assertRaises(HTTPException) as context:
            ingest_document(
                db=self.db,
                hospital_id=h_id,
                uploaded_by=str(uuid.uuid4()),
                title="Test Deleted Hosp",
                category="Clinical Guide",
                version="1.0",
                file=mock_file
            )
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("deactivated or deleted", context.exception.detail)
        mock_upload.assert_not_called()

    @patch("app.services.rag.get_embeddings_batch")
    @patch("app.services.rag.delete_rag_document")
    @patch("app.services.rag.upload_rag_document")
    def test_compensating_cleanup_on_rag_failure(self, mock_upload, mock_delete, mock_embeddings):
        mock_embeddings.side_effect = Exception("Embedding engine offline")
        mock_file = self.create_mock_upload_file("test.txt", b"Valid text content")

        with self.assertRaises(HTTPException) as context:
            ingest_document(
                db=self.db,
                hospital_id=None,
                uploaded_by=str(uuid.uuid4()),
                title="Test Failure",
                category="Clinical Guide",
                version="1.0",
                file=mock_file
            )
        
        self.assertEqual(context.exception.status_code, 500)
        self.assertIn("Incomplete RAG Ingestion Pipeline", context.exception.detail)
        
        mock_upload.assert_called_once()
        mock_delete.assert_called_once()
        
        docs_count = self.db.query(RagDocument).count()
        self.assertEqual(docs_count, 0)

    @patch("app.services.rag.get_embeddings_batch")
    @patch("app.services.rag.delete_rag_document")
    @patch("app.services.rag.upload_rag_document")
    def test_compensating_cleanup_warning_log_on_delete_failure(self, mock_upload, mock_delete, mock_embeddings):
        mock_embeddings.side_effect = Exception("Embedding engine offline")
        mock_delete.side_effect = Exception("Supabase Storage API timed out")
        mock_file = self.create_mock_upload_file("test.txt", b"Valid text content")

        import sys
        from io import StringIO
        old_stdout = sys.stdout
        sys.stdout = StringIO()
        
        try:
            with self.assertRaises(HTTPException) as context:
                ingest_document(
                    db=self.db,
                    hospital_id=None,
                    uploaded_by=str(uuid.uuid4()),
                    title="Test Double Failure",
                    category="Clinical Guide",
                    version="1.0",
                    file=mock_file
                )
            
            output = sys.stdout.getvalue()
        finally:
            sys.stdout = old_stdout
            
        self.assertEqual(context.exception.status_code, 500)
        self.assertIn("Incomplete RAG Ingestion Pipeline", context.exception.detail)
        
        self.assertIn("Compensating storage cleanup failed", output)
        mock_upload.assert_called_once()
        mock_delete.assert_called_once()
        
        docs_count = self.db.query(RagDocument).count()
        self.assertEqual(docs_count, 0)

    @patch("app.services.rag.get_embeddings_batch")
    @patch("app.services.rag.upload_rag_document")
    def test_ingest_document_success(self, mock_upload, mock_embeddings):
        # Successful mock embedding (exactly 1024 dimensions)
        mock_embeddings.return_value = [[0.05] * 1024]
        mock_file = self.create_mock_upload_file("test.txt", b"Valid document content to ingest and embed.")
        
        doc = ingest_document(
            db=self.db,
            hospital_id=None,
            uploaded_by=str(uuid.uuid4()),
            title="Valid Guidelines",
            category="Clinical Standards",
            version="1.0",
            file=mock_file
        )
        
        self.assertIsNotNone(doc.id)
        self.assertEqual(doc.title, "Valid Guidelines")
        mock_upload.assert_called_once()
        mock_embeddings.assert_called()
        
        # Verify document chunk was inserted with 1024 dims
        chunks = self.db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).all()
        self.assertTrue(len(chunks) > 0)
        self.assertEqual(len(chunks[0].embedding), 1024)

    @patch("urllib.request.urlopen")
    def test_get_embeddings_success(self, mock_urlopen):
        # Mock response payload for Ollama /api/embed
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "embeddings": [[0.1] * 1024]
        }).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        from app.services.rag import get_embeddings
        vector = get_embeddings("sample text")
        self.assertEqual(len(vector), 1024)
        self.assertEqual(vector[0], 0.1)

    @patch("urllib.request.urlopen")
    def test_get_embeddings_invalid_dimensions(self, mock_urlopen):
        # Test incorrect dimensions returned by the endpoint (e.g. 512)
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "embeddings": [[0.1] * 512]
        }).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        from app.services.rag import get_embeddings
        with self.assertRaises(ValueError) as context:
            get_embeddings("sample text")
        self.assertIn("Incompatible embedding dimensions", str(context.exception))

    @patch("urllib.request.urlopen")
    def test_get_embeddings_connection_refused(self, mock_urlopen):
        from urllib.error import URLError
        # Simulate local connection failure/timeout
        mock_urlopen.side_effect = URLError(reason=ConnectionRefusedError("Connection refused"))
        
        from app.services.rag import get_embeddings
        with self.assertRaises(ConnectionError) as context:
            get_embeddings("sample text")
        self.assertIn("Ollama embedding service is unreachable", str(context.exception))

    @patch("urllib.request.urlopen")
    def test_get_embeddings_model_missing(self, mock_urlopen):
        from urllib.error import HTTPError
        # Simulate missing model error returned in response body
        error_fp = BytesIO(b'model "mxbai-embed-large" not found, pull it first')
        mock_urlopen.side_effect = HTTPError(
            url="http://localhost:11434/api/embed",
            code=404,
            msg="Not Found",
            hdrs=None,
            fp=error_fp
        )
        
        from app.services.rag import get_embeddings
        with self.assertRaises(ValueError) as context:
            get_embeddings("sample text")
        self.assertIn("model 'mxbai-embed-large' is not installed", str(context.exception))
        self.assertIn("ollama pull", str(context.exception))

    @patch("app.services.rag.get_embeddings")
    def test_retrieve_similar_chunks_scoping(self, mock_get_embeddings):
        # Verify standard pgvector query filters and security scoping
        mock_get_embeddings.return_value = [0.2] * 1024
        
        mock_db = MagicMock()
        mock_result = MagicMock()
        
        mock_row1 = MagicMock()
        mock_row1.chunk_id = "chunk-1"
        mock_row1.content = "Sodium intake standard guidelines"
        mock_row1.document_title = "Global Guidelines"
        mock_row1.similarity_score = 0.89
        
        mock_row2 = MagicMock()
        mock_row2.chunk_id = "chunk-2"
        mock_row2.content = "Sodium intake hospital local guideline"
        mock_row2.document_title = "Hospital A Guidelines"
        mock_row2.similarity_score = 0.81
        
        mock_result.fetchall.return_value = [mock_row1, mock_row2]
        mock_db.execute.return_value = mock_result
        
        from app.services.rag import retrieve_similar_chunks
        results = retrieve_similar_chunks(
            db=mock_db,
            query_text="sodium intake limits",
            limit=5,
            hospital_id="hospital-A-uuid"
        )
        
        # Verify get_embeddings query embedding call
        mock_get_embeddings.assert_called_once_with("sodium intake limits")
        
        # Verify db.execute was called and verify passed parameters
        mock_db.execute.assert_called_once()
        called_args, called_kwargs = mock_db.execute.call_args
        params = called_kwargs.get("params") or called_args[1]
        
        self.assertEqual(params["hospital_id"], "hospital-A-uuid")
        self.assertEqual(params["limit"], 5)
        self.assertTrue(params["query_vector"].startswith("[0.2,0.2,"))
        
        # Verify result content mapped
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["chunk_id"], "chunk-1")
        self.assertEqual(results[0]["document_title"], "Global Guidelines")
        self.assertEqual(results[1]["chunk_id"], "chunk-2")
        self.assertEqual(results[1]["document_title"], "Hospital A Guidelines")

    @patch("app.services.rag.get_embeddings")
    def test_retrieve_similar_chunks_isolation(self, mock_get_embeddings):
        # Verify scoping query rules for Global vs current-hospital vs other-hospital
        mock_get_embeddings.return_value = [0.2] * 1024
        
        mock_db = MagicMock()
        mock_result = MagicMock()
        mock_row = MagicMock()
        mock_row.chunk_id = "chunk-1"
        mock_row.content = "Isolation test content"
        mock_row.document_title = "Global/Local Document"
        mock_row.similarity_score = 0.95
        
        mock_result.fetchall.return_value = [mock_row]
        mock_db.execute.return_value = mock_result
        
        from app.services.rag import retrieve_similar_chunks
        
        # Test case A: Retrieval scoping with specific hospital ID
        target_hospital_id = str(uuid.uuid4())
        results = retrieve_similar_chunks(
            db=mock_db,
            query_text="hypertension limits",
            limit=3,
            hospital_id=target_hospital_id
        )
        
        # Verify db.execute parameters enforce the scoping correctly
        mock_db.execute.assert_called_once()
        called_args, called_kwargs = mock_db.execute.call_args
        sql_statement = called_args[0]
        params = called_kwargs.get("params") or called_args[1]
        
        self.assertEqual(params["hospital_id"], target_hospital_id)
        self.assertEqual(params["limit"], 3)
        self.assertTrue(params["query_vector"].startswith("[0.2,0.2,"))
        
        # Assert SQL query has the correct logical scoping boundaries
        sql_str = str(sql_statement)
        # Filters to include matching hospital scope (both global / IS NULL and the allowed hospital_id)
        self.assertIn("d.hospital_id IS NULL OR d.hospital_id = :hospital_id", sql_str)

