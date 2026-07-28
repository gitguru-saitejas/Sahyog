import unittest
from unittest.mock import patch, MagicMock
import os
import uuid
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.session import Base
from app.models import family_account, patient, user, hospital, rag, audit, chat
from app.models.chat import ChatSession, ChatMessage
from app.models.patient import Patient
from app.services.llm import validate_evidence
from app.services.guidance import generate_patient_guidance_answer

class TestPatientGuidanceEvidenceValidation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Use a temporary SQLite database for testing patient guidance
        cls.db_path = "test_sahyog_patient_guidance.db"
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
        self.db.query(ChatMessage).delete()
        self.db.query(ChatSession).delete()
        self.db.query(Patient).delete()
        self.db.commit()

        # Seed a dummy patient for chat session relationships
        self.patient_id = str(uuid.uuid4())
        self.patient = Patient(
            id=self.patient_id,
            patient_code="PAT123",
            family_account_id=str(uuid.uuid4()),
            first_name="Test",
            last_name="Patient",
            date_of_birth=datetime.date(1990, 1, 1),
            gender="FEMALE",
            blood_group="O+",
            relation="SELF",
            aadhaar_hash="dummy_hash",
            aadhaar_last4="1234",
            address_line1="123 St",
            city="Mumbai",
            district="Mumbai",
            state="Maharashtra",
            pincode="400001"
        )
        self.db.add(self.patient)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    @patch("app.services.llm.generate_text")
    def test_validate_evidence_supported_exact(self, mock_generate_text):
        mock_generate_text.return_value = "SUPPORTED"
        chunks = [{"document_title": "Doc A", "content": "Caffeine in pregnancy guideline."}]
        res = validate_evidence("Can I drink coffee?", chunks)
        self.assertEqual(res, "SUPPORTED")

    @patch("app.services.llm.generate_text")
    def test_validate_evidence_fail_closed_variations(self, mock_generate_text):
        chunks = [{"document_title": "Doc A", "content": "Some context text."}]
        
        # Test case: with trailing punctuation
        mock_generate_text.return_value = "SUPPORTED."
        self.assertEqual(validate_evidence("Question?", chunks), "SUPPORTED")
        
        # Test case: lowercase
        mock_generate_text.return_value = "supported"
        self.assertEqual(validate_evidence("Question?", chunks), "SUPPORTED")
        
        # Test case: "Yes"
        mock_generate_text.return_value = "Yes"
        self.assertEqual(validate_evidence("Question?", chunks), "UNSUPPORTED")

        # Test case: "Probably supported"
        mock_generate_text.return_value = "Probably supported"
        self.assertEqual(validate_evidence("Question?", chunks), "UNSUPPORTED")

        # Test case: "The evidence is supported"
        mock_generate_text.return_value = "The evidence is supported"
        self.assertEqual(validate_evidence("Question?", chunks), "UNSUPPORTED")

        # Test case: Empty output
        mock_generate_text.return_value = ""
        self.assertEqual(validate_evidence("Question?", chunks), "UNSUPPORTED")

        # Test case: whitespace surrounding supported should pass if stripped
        mock_generate_text.return_value = "  SUPPORTED  \n"
        self.assertEqual(validate_evidence("Question?", chunks), "SUPPORTED")

    @patch("app.services.llm.generate_text")
    def test_validate_evidence_error_fail_closed(self, mock_generate_text):
        mock_generate_text.side_effect = Exception("Ollama connection failed")
        chunks = [{"document_title": "Doc A", "content": "Some context text."}]
        res = validate_evidence("Question?", chunks)
        self.assertEqual(res, "UNSUPPORTED")

    @patch("app.services.guidance.retrieve_similar_chunks")
    @patch("app.services.guidance.validate_evidence")
    @patch("app.services.guidance.llm_generate_text")
    def test_guidance_pipeline_unsupported_evidence(self, mock_llm_generate, mock_validate, mock_retrieve):
        # Mock retrieval returning some chunks
        mock_retrieve.return_value = [
            {"document_title": "Hemorrhage Guide", "content": "Discusses severe blood loss treatment.", "similarity_score": 0.8}
        ]
        # Mock validator returning UNSUPPORTED
        mock_validate.return_value = "UNSUPPORTED"

        res = generate_patient_guidance_answer(
            db=self.db,
            question="Is spotting normal?",
            patient_id=self.patient_id,
            hospital_id=None,
            session_id=None,
            guidance_topic="PREGNANCY"
        )

        # Assert answer generation was NOT called
        mock_llm_generate.assert_not_called()

        # Assert fallback response returned
        self.assertEqual(res["answer"], "I'm sorry, but I couldn't find sufficient relevant guidance in the knowledge base.")
        self.assertEqual(res["sources"], [])
        self.assertIsNotNone(res["session_id"])

        # Verify database chat persistence
        session = self.db.query(ChatSession).filter(ChatSession.id == res["session_id"]).first()
        self.assertIsNotNone(session)
        messages = self.db.query(ChatMessage).filter(ChatMessage.session_id == session.id).order_by(ChatMessage.created_at).all()
        self.assertEqual(len(messages), 2)
        self.assertEqual(messages[0].sender_type, "PATIENT")
        self.assertEqual(messages[0].message_text, "Is spotting normal?")
        self.assertEqual(messages[1].sender_type, "AI")
        self.assertEqual(messages[1].message_text, "I'm sorry, but I couldn't find sufficient relevant guidance in the knowledge base.")

    @patch("app.services.guidance.retrieve_similar_chunks")
    @patch("app.services.guidance.validate_evidence")
    @patch("app.services.guidance.llm_generate_text")
    def test_guidance_pipeline_supported_evidence(self, mock_llm_generate, mock_validate, mock_retrieve):
        # Mock retrieval
        mock_retrieve.return_value = [
            {"document_title": "Pregnancy Caffeine Guide", "content": "Caffeine limit is 200mg daily.", "similarity_score": 0.9}
        ]
        # Mock validator
        mock_validate.return_value = "SUPPORTED"
        # Mock generation LLM
        mock_llm_generate.return_value = "You can drink up to 200mg of caffeine per day."

        res = generate_patient_guidance_answer(
            db=self.db,
            question="Can I drink coffee?",
            patient_id=self.patient_id,
            hospital_id=None,
            session_id=None,
            guidance_topic="PREGNANCY"
        )

        # Assert answer generation WAS called
        mock_llm_generate.assert_called_once()

        # Assert normal answer returned
        self.assertEqual(res["answer"], "You can drink up to 200mg of caffeine per day.")
        self.assertEqual(len(res["sources"]), 1)
        self.assertEqual(res["sources"][0]["document_title"], "Pregnancy Caffeine Guide")

        # Verify database chat persistence
        session = self.db.query(ChatSession).filter(ChatSession.id == res["session_id"]).first()
        self.assertIsNotNone(session)
        messages = self.db.query(ChatMessage).filter(ChatMessage.session_id == session.id).order_by(ChatMessage.created_at).all()
        self.assertEqual(len(messages), 2)
        self.assertEqual(messages[1].sender_type, "AI")
        self.assertEqual(messages[1].message_text, "You can drink up to 200mg of caffeine per day.")

    def test_diversify_chunks(self):
        from app.services.rag import diversify_chunks
        chunks = [
            {"document_title": "Doc A", "similarity_score": 0.9, "content": "1"},
            {"document_title": "Doc A", "similarity_score": 0.8, "content": "2"},
            {"document_title": "Doc A", "similarity_score": 0.7, "content": "3"},
            {"document_title": "Doc B", "similarity_score": 0.6, "content": "4"},
            {"document_title": "Doc B", "similarity_score": 0.5, "content": "5"},
            {"document_title": "Doc C", "similarity_score": 0.4, "content": "6"},
        ]
        
        # Limit 4, max 1 per document
        diversified = diversify_chunks(chunks, final_limit=4, max_per_document=1)
        self.assertEqual(len(diversified), 3) # Doc A (0.9), Doc B (0.6), Doc C (0.4)
        self.assertEqual(diversified[0]["document_title"], "Doc A")
        self.assertEqual(diversified[0]["similarity_score"], 0.9)
        self.assertEqual(diversified[1]["document_title"], "Doc B")
        self.assertEqual(diversified[1]["similarity_score"], 0.6)
        self.assertEqual(diversified[2]["document_title"], "Doc C")
        self.assertEqual(diversified[2]["similarity_score"], 0.4)
        
        # Limit 4, max 2 per document
        diversified_2 = diversify_chunks(chunks, final_limit=4, max_per_document=2)
        # Doc A (0.9), Doc A (0.8), Doc B (0.6), Doc B (0.5)
        self.assertEqual(len(diversified_2), 4)
        self.assertEqual(diversified_2[0]["similarity_score"], 0.9)
        self.assertEqual(diversified_2[1]["similarity_score"], 0.8)
        self.assertEqual(diversified_2[2]["similarity_score"], 0.6)
        self.assertEqual(diversified_2[3]["similarity_score"], 0.5)

        # Limit 5, max 1 per document. Doc A (0.9), Doc B (0.6), Doc C (0.4) (first pass)
        # Then fills remaining with unused highest score: Doc A (0.8), Doc A (0.7) (second pass)
        diversified_3 = diversify_chunks(chunks, final_limit=5, max_per_document=1)
        self.assertEqual(len(diversified_3), 5)
        self.assertEqual(diversified_3[0]["similarity_score"], 0.9)
        self.assertEqual(diversified_3[1]["similarity_score"], 0.6)
        self.assertEqual(diversified_3[2]["similarity_score"], 0.4)
        self.assertEqual(diversified_3[3]["similarity_score"], 0.8)
        self.assertEqual(diversified_3[4]["similarity_score"], 0.7)
