import unittest
import os
import sys
import uuid
import math
from unittest.mock import patch, MagicMock
from io import BytesIO
from fastapi import UploadFile
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError

# Add backend root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend")))

from app.models import family_account, patient, user, hospital, rag, audit
from app.models.hospital import Hospital
from app.models.rag import RagDocument, DocumentChunk
from app.database.session import Base
from app.services.rag import ingest_document, retrieve_similar_chunks, get_embeddings
from app.core.config import settings

class TestPatientGuidanceRagRetrieval(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # 1. Establish Database Connection (Postgres vs SQLite)
        cls.db_is_postgres = False
        cls.db_path = "test_sahyog_patient_guidance.db"
        
        try:
            # Attempt to connect to production/configured DB
            cls.engine = create_engine(settings.DATABASE_URL, connect_args={"connect_timeout": 3} if "postgresql" in settings.DATABASE_URL else {})
            cls.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
            cls.db = cls.SessionLocal()
            
            # Simple test query to verify connection
            cls.db.execute(text("SELECT 1")).fetchone()
            cls.db_is_postgres = "postgresql" in settings.DATABASE_URL
            print("\n" + "="*80)
            print("PRODUCTION PGVECTOR VALIDATION MODE ACTIVE")
            print(f"Connected to remote PostgreSQL instance at {settings.DATABASE_URL.split('@')[-1]}")
            print("="*80 + "\n")
        except (OperationalError, Exception) as e:
            # Fall back to SQLite
            print("\n" + "="*80)
            print("LOCAL RETRIEVAL LOGIC VALIDATION (SQLITE FALLBACK) ACTIVE")
            print("Production PostgreSQL database is unreachable in this test execution environment.")
            print(f"Details: {e}")
            print(f"Using local SQLite test database: {cls.db_path}")
            print("="*80 + "\n")
            
            if os.path.exists(cls.db_path):
                try:
                    os.remove(cls.db_path)
                except Exception:
                    pass
            cls.engine = create_engine(f"sqlite:///{cls.db_path}")
            Base.metadata.create_all(bind=cls.engine)
            cls.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
            cls.db = cls.SessionLocal()

        # 2. Seed Test Hospitals
        cls.hospital_a_id = None
        cls.hospital_b_id = None
        
        # Clean existing test seed data if it exists (cascade will delete chunks)
        cls.db.query(RagDocument).filter(RagDocument.title.like("%Patient Guidance%")).delete(synchronize_session=False)
        cls.db.query(RagDocument).filter(RagDocument.title.like("%Operations Document%")).delete(synchronize_session=False)
        cls.db.query(RagDocument).filter(RagDocument.title.like("%Standards Document%")).delete(synchronize_session=False)
        
        # Seed hospital records if not present (checking by email to prevent duplicate unique constraint errors)
        for name in ["Hospital A Clinic", "Hospital B Clinic"]:
            email = f"contact@{name.lower().replace(' ', '')}.com"
            existing_hosp = cls.db.query(Hospital).filter(Hospital.email == email).first()
            if existing_hosp:
                if name == "Hospital A Clinic":
                    cls.hospital_a_id = existing_hosp.id
                else:
                    cls.hospital_b_id = existing_hosp.id
            else:
                h_id = str(uuid.uuid4())
                h = Hospital(
                    id=h_id,
                    name=name,
                    email=email,
                    address=f"123 {name} Road",
                    contact_number="1234567890"
                )
                cls.db.add(h)
                if name == "Hospital A Clinic":
                    cls.hospital_a_id = h_id
                else:
                    cls.hospital_b_id = h_id
        cls.db.commit()

        # 3. Controlled Document Content
        cls.guidance_content_hypertension = """
Hypertension means that blood pressure remains higher than the recommended range.
People with hypertension should monitor their blood pressure regularly.
Reducing excessive dietary sodium can help support blood pressure management.
Regular physical activity is an important part of a healthy lifestyle for people managing hypertension.
Patients should take medicines according to the instructions provided by their healthcare professional.
Patients should attend recommended follow-up appointments to monitor their condition.
Patients experiencing severe or concerning symptoms should seek appropriate medical attention.
"""

        cls.guidance_content_diabetes = """
Diabetes Mellitus involves persistent high blood sugar levels.
Patients with diabetes should monitor their blood glucose levels regularly.
Reducing sugar intake is key to managing diabetes.
"""

        cls.guidance_content_asthma = """
Asthma causes inflammation of the airways making breathing difficult.
Using a rescue inhaler regularly can help relieve acute asthma symptoms.
Avoid triggers like dust and pollen to prevent asthma attacks.
"""

        # Non-Patient Guidance matching documents (for isolation test)
        cls.operations_content = """
Staff duties must be completed by 8:00 AM daily.
Hospital operations require all patient check-in records to be uploaded within 2 hours of check-in.
Do not share login credentials.
"""

        cls.standards_content = """
Clinical standards mandate all surgical equipment must be sterilized.
Double-check patient identity parameters before prescribing medication.
"""

    @classmethod
    def tearDownClass(cls):
        cls.db.close()
        if not cls.db_is_postgres and os.path.exists(cls.db_path):
            try:
                os.remove(cls.db_path)
            except Exception:
                pass

    def create_mock_file(self, filename: str, content: str) -> UploadFile:
        content_bytes = content.encode("utf-8")
        file_like = BytesIO(content_bytes)
        mock_file = MagicMock()
        mock_file.read.side_effect = file_like.read
        mock_file.seek.side_effect = file_like.seek
        return UploadFile(
            file=mock_file,
            filename=filename,
            size=len(content_bytes),
            headers=MagicMock()
        )

    @patch("app.services.rag.upload_rag_document")
    def test_run_complete_rag_validation(self, mock_upload):
        # Mock Supabase upload to prevent external network calls
        mock_upload.side_effect = lambda path, content, content_type: path

        print("\n=== STEP 5: VERIFY INGESTION STATE ===")
        # Ingest Global Hypertension Guidance Document
        file_hyp = self.create_mock_file("hypertension_guidance.txt", self.guidance_content_hypertension)
        doc_hyp = ingest_document(
            db=self.db,
            hospital_id=None,
            uploaded_by=None,
            title="Hypertension Patient Guidance",
            category="PATIENT_GUIDANCE",
            version="1.0",
            file=file_hyp
        )
        self.assertIsNotNone(doc_hyp.id)
        self.assertEqual(doc_hyp.category, "PATIENT_GUIDANCE")
        self.assertIsNone(doc_hyp.hospital_id)
        
        # Verify chunks exists
        chunks = self.db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_hyp.id).all()
        self.assertGreater(len(chunks), 0)
        
        # Verify embedding size matches config settings
        first_chunk = chunks[0]
        self.assertIsNotNone(first_chunk.embedding)
        self.assertEqual(len(first_chunk.embedding), settings.EMBEDDING_DIMENSIONS)
        print(f"Ingested document '{doc_hyp.title}' | Chunks generated: {len(chunks)} | Embedding Dim: {len(first_chunk.embedding)}")
        print("Ingestion verification: PASSED")

        # Seed other documents for ranking, scoping, and isolation testing
        # Diabetes Global Guidance
        file_diab = self.create_mock_file("diabetes_guidance.txt", self.guidance_content_diabetes)
        doc_diab = ingest_document(self.db, None, None, "Diabetes Patient Guidance", "PATIENT_GUIDANCE", "1.0", file_diab)

        # Asthma Global Guidance
        file_asth = self.create_mock_file("asthma_guidance.txt", self.guidance_content_asthma)
        doc_asth = ingest_document(self.db, None, None, "Asthma Patient Guidance", "PATIENT_GUIDANCE", "1.0", file_asth)

        # Hospital A Guidance (Hypertension)
        file_hyp_a = self.create_mock_file("hypertension_guidance_hosp_a.txt", "Hospital A Specific Guidance:\nPatients in Hospital A should follow local salt control protocols.")
        doc_hyp_a = ingest_document(self.db, self.hospital_a_id, None, "Hospital A Patient Guidance", "PATIENT_GUIDANCE", "1.0", file_hyp_a)

        # Hospital B Guidance (Hypertension)
        file_hyp_b = self.create_mock_file("hypertension_guidance_hosp_b.txt", "Hospital B Specific Guidance:\nPatients in Hospital B should follow strict daily tracking charts.")
        doc_hyp_b = ingest_document(self.db, self.hospital_b_id, None, "Hospital B Patient Guidance", "PATIENT_GUIDANCE", "1.0", file_hyp_b)

        # Non-Patient Guidance: HOSPITAL_OPERATIONS
        file_ops = self.create_mock_file("ops.txt", self.operations_content)
        doc_ops = ingest_document(self.db, None, None, "Operations Document", "HOSPITAL_OPERATIONS", "1.0", file_ops)

        # Non-Patient Guidance: CLINICAL_STANDARDS
        file_std = self.create_mock_file("std.txt", self.standards_content)
        doc_std = ingest_document(self.db, None, None, "Standards Document", "CLINICAL_STANDARDS", "1.0", file_std)

        print("\n=== STEP 7: TEST QUERY EMBEDDING ===")
        test_query = "What lifestyle changes can help manage hypertension?"
        q_emb = get_embeddings(test_query)
        self.assertIsNotNone(q_emb)
        self.assertEqual(len(q_emb), settings.EMBEDDING_DIMENSIONS)
        print(f"Query: '{test_query}' | Dimension parsed: {len(q_emb)}")
        print("Query embedding verification: PASSED")

        test_results = []
        similarity_data = []

        # Helper method to print test results in the exact requested format
        def run_validation_case(test_name, query, expected_substring, limit=5, hospital_id=None, category=None, threshold=0.50):
            print(f"\nTEST: {test_name}")
            print(f"QUERY: {query}")
            print(f"EXPECTED: {expected_substring}")
            
            chunks = retrieve_similar_chunks(
                db=self.db,
                query_text=query,
                limit=limit,
                hospital_id=hospital_id,
                category=category,
                threshold=threshold
            )
            
            print("RESULTS:")
            matched = False
            top_score = 0.0
            highest_irrelevant_score = 0.0
            
            for idx, c in enumerate(chunks, 1):
                score = c["similarity_score"]
                doc_title = c["document_title"]
                doc_cat = c["document_category"]
                h_scope = c["hospital_id"] or "Global"
                chunk_id = c["chunk_id"]
                content = c["content"]
                
                print(f"\nRank {idx}")
                print(f"Document: {doc_title}")
                print(f"Category: {doc_cat}")
                print(f"Hospital Scope: {h_scope}")
                print(f"Chunk ID: {chunk_id}")
                print(f"Similarity: {score:.4f}")
                print(f"Content: {content[:180]}...")
                
                is_relevant = expected_substring.lower() in content.lower() if expected_substring else False
                if is_relevant:
                    matched = True
                    if top_score == 0.0:
                        top_score = score
                else:
                    if score > highest_irrelevant_score:
                        highest_irrelevant_score = score

            passed = matched if expected_substring else (len(chunks) == 0)
            result_str = "PASS" if passed else "FAIL"
            reason_str = "Relevant context matched above similarity threshold." if passed else "Target context not found or below threshold."
            
            if not expected_substring and len(chunks) == 0:
                reason_str = "No chunks exceeded threshold as expected for unsupported query."
                
            print(f"\nRESULT: {result_str}")
            print(f"REASON: {reason_str}")
            
            test_results.append({
                "test_name": test_name,
                "expected": expected_substring or "No match",
                "actual": chunks[0]["content"] if chunks else "No match",
                "score": f"{chunks[0]['similarity_score']:.4f}" if chunks else "N/A",
                "result": result_str
            })
            
            similarity_data.append({
                "query": query[:25],
                "relevant": f"{top_score:.4f}" if top_score > 0.0 else "N/A",
                "irrelevant": f"{highest_irrelevant_score:.4f}" if highest_irrelevant_score > 0.0 else "N/A",
                "threshold": f"{threshold:.2f}",
                "result": result_str
            })

            # Unit assertions
            if expected_substring:
                self.assertTrue(matched, f"Test '{test_name}' failed to retrieve the expected substring '{expected_substring}'.")
            else:
                self.assertEqual(len(chunks), 0, f"Test '{test_name}' expected empty results, but got chunks.")

        # Test Case 1: Exact Guidance Retrieval
        run_validation_case(
            test_name="Exact Guidance Retrieval",
            query="What lifestyle changes can help manage hypertension?",
            expected_substring="Regular physical activity is an important part of a healthy lifestyle",
            category="PATIENT_GUIDANCE"
        )

        # Test Case 2: Paraphrased Query
        run_validation_case(
            test_name="Paraphrased Query",
            query="What daily habits can help someone control high blood pressure?",
            expected_substring="lifestyle",
            category="PATIENT_GUIDANCE"
        )

        # Test Case 3: Sodium Guidance
        run_validation_case(
            test_name="Sodium Guidance",
            query="Should someone with high blood pressure reduce salt intake?",
            expected_substring="sodium",
            category="PATIENT_GUIDANCE"
        )

        # Test Case 4: Physical Activity
        run_validation_case(
            test_name="Physical Activity",
            query="Is exercise useful for managing hypertension?",
            expected_substring="physical activity",
            category="PATIENT_GUIDANCE"
        )

        # Test Case 5: Medication Guidance
        run_validation_case(
            test_name="Medication Guidance",
            query="How should hypertension medicines be taken?",
            expected_substring="instructions provided by their healthcare professional",
            category="PATIENT_GUIDANCE"
        )

        # Test Case 6: Follow-up Guidance
        run_validation_case(
            test_name="Follow-up Guidance",
            query="Should someone with hypertension attend follow-up appointments?",
            expected_substring="attend recommended follow-up appointments",
            category="PATIENT_GUIDANCE"
        )

        # Test Case 7: Unsupported Query (Blood Group - expect no chunks because threshold rejects it)
        run_validation_case(
            test_name="Unsupported Query",
            query="What is the patient's blood group?",
            expected_substring=None,
            category="PATIENT_GUIDANCE",
            threshold=0.55  # slightly higher to ensure rejection of irrelevant text
        )

        # Multiple Document Test
        print("\nTEST: Multiple Document Test")
        print("QUERY: 'How can reducing salt help with high blood pressure?'")
        chunks_multi = retrieve_similar_chunks(db=self.db, query_text="How can reducing salt help with high blood pressure?", limit=5, category="PATIENT_GUIDANCE")
        self.assertGreater(len(chunks_multi), 0)
        # Verify Hypertension guidance ranks higher than Diabetes or Asthma
        top_doc = chunks_multi[0]["document_title"]
        print(f"Top-1 document ranked: '{top_doc}'")
        self.assertEqual(top_doc, "Hypertension Patient Guidance")
        print("Multiple Document ranking verification: PASSED")

        # Top-K Validation (Verify limits 1, 3, and 5)
        for k in [1, 3, 5]:
            chunks_k = retrieve_similar_chunks(db=self.db, query_text="lifestyle changes for blood pressure", limit=k, category="PATIENT_GUIDANCE")
            self.assertTrue(len(chunks_k) <= k)
            if k == 1:
                self.assertEqual(len(chunks_k), 1)
            print(f"Top-K={k} limit validation: PASSED")

        # Global Scope Retrieval
        print("\nTEST: Global Scope Retrieval")
        # Ensure Global guidance is accessible without hospital context (hospital_id = None)
        global_chunks = retrieve_similar_chunks(db=self.db, query_text="hypertension sodium", limit=3, hospital_id=None, category="PATIENT_GUIDANCE")
        self.assertTrue(any(c["hospital_id"] is None for c in global_chunks))
        # Ensure Global guidance remains accessible under Hospital A context
        hosp_a_chunks = retrieve_similar_chunks(db=self.db, query_text="hypertension sodium", limit=3, hospital_id=self.hospital_a_id, category="PATIENT_GUIDANCE")
        self.assertTrue(any(c["hospital_id"] is None for c in hosp_a_chunks))
        print("Global scope retrieval verification: PASSED")

        # Hospital Specific Retrieval & Cross-Hospital Isolation
        print("\nTEST: Hospital Scope & Cross-Hospital Isolation")
        # Retrieve as Hospital A: expects Global and Hospital A chunks, NO Hospital B chunks
        chunks_hosp_a = retrieve_similar_chunks(db=self.db, query_text="local specific salt tracking guidance", limit=5, hospital_id=self.hospital_a_id, category="PATIENT_GUIDANCE")
        hosp_a_doc_titles = [c["document_title"] for c in chunks_hosp_a]
        self.assertIn("Hospital A Patient Guidance", hosp_a_doc_titles)
        self.assertNotIn("Hospital B Patient Guidance", hosp_a_doc_titles)

        # Retrieve as Hospital B: expects Global and Hospital B chunks, NO Hospital A chunks
        chunks_hosp_b = retrieve_similar_chunks(db=self.db, query_text="local specific salt tracking guidance", limit=5, hospital_id=self.hospital_b_id, category="PATIENT_GUIDANCE")
        hosp_b_doc_titles = [c["document_title"] for c in chunks_hosp_b]
        self.assertIn("Hospital B Patient Guidance", hosp_b_doc_titles)
        self.assertNotIn("Hospital A Patient Guidance", hosp_b_doc_titles)

        # Retrieve without hospital context: expects Global chunks, NO Hospital A or Hospital B chunks
        chunks_no_hosp = retrieve_similar_chunks(db=self.db, query_text="local specific salt tracking guidance", limit=5, hospital_id=None, category="PATIENT_GUIDANCE")
        no_hosp_doc_titles = [c["document_title"] for c in chunks_no_hosp]
        self.assertNotIn("Hospital A Patient Guidance", no_hosp_doc_titles)
        self.assertNotIn("Hospital B Patient Guidance", no_hosp_doc_titles)
        print("Hospital scope and cross-hospital isolation verification: PASSED")

        # Category Isolation Test
        print("\nTEST: Category Isolation")
        # Querying with category="PATIENT_GUIDANCE": expects only PATIENT_GUIDANCE documents, NO HOSPITAL_OPERATIONS or CLINICAL_STANDARDS
        guidance_only = retrieve_similar_chunks(db=self.db, query_text="Hospital operations check check check", limit=5, category="PATIENT_GUIDANCE")
        categories_retrieved = [c["document_category"] for c in guidance_only]
        self.assertTrue(all(cat == "PATIENT_GUIDANCE" for cat in categories_retrieved))
        self.assertNotIn("HOSPITAL_OPERATIONS", categories_retrieved)
        self.assertNotIn("CLINICAL_STANDARDS", categories_retrieved)
        print("Category isolation verification: PASSED")

        # Empty/Invalid Query Tests
        print("\nTEST: Empty/Invalid Query Verification")
        self.assertEqual(len(retrieve_similar_chunks(db=self.db, query_text="", limit=5)), 0)
        self.assertEqual(len(retrieve_similar_chunks(db=self.db, query_text="   ", limit=5)), 0)
        print("Empty and whitespace query input verification: PASSED")

        # Chunking Validation
        print("\nTEST: Chunking Length Boundaries")
        self.assertTrue(all(len(c.content) <= 500 for c in chunks))
        print("Chunking size limits verification: PASSED")

        # Print final validation matrices
        print("\n\n" + "="*80)
        print("FINAL RETRIEVAL VALIDATION MATRIX")
        print("="*80)
        print(f"{'Test':<20} | {'Expected Substring':<30} | {'Score':<6} | {'Result':<5}")
        print("-" * 80)
        for r in test_results:
            print(f"{r['test_name'][:20]:<20} | {r['expected'][:30]:<30} | {r['score']:<6} | {r['result']:<5}")
        print("="*80 + "\n")

        print("="*80)
        print("SIMILARITY THRESHOLD VALIDATION MATRIX")
        print("="*80)
        print(f"{'Query':<25} | {'Relevant':<8} | {'Irrelevant':<10} | {'Threshold':<9} | {'Result':<5}")
        print("-" * 80)
        for s in similarity_data:
            print(f"{s['query']:<25} | {s['relevant']:<8} | {s['irrelevant']:<10} | {s['threshold']:<9} | {s['result']:<5}")
        print("="*80 + "\n")

if __name__ == "__main__":
    unittest.main()
