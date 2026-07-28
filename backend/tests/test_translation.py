import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# Register SQLAlchemy models first to avoid mapper lookup error
from app.models import family_account, patient, user, hospital, rag, audit, chat
from app.main import app
from app.services.translation_service import (
    identify_language,
    translate_to_english,
    translate_from_english
)
from app.services.guidance import generate_patient_guidance_answer

class TestTranslationService(unittest.TestCase):

    def test_identify_language_kannada(self):
        text = "ಗರ್ಭಾವಸ್ಥೆಯಲ್ಲಿ ಯಾವ ಆಹಾರಗಳನ್ನು ತಪ್ಪಿಸಬೇಕು?"
        self.assertEqual(identify_language(text), "kn")

    def test_identify_language_english(self):
        text = "What foods should I avoid during pregnancy?"
        self.assertEqual(identify_language(text), "en")

    def test_identify_language_mixed(self):
        text = "Pregnant women ಕಾಫಿ ಕುಡಿಯಬಹುದೇ"
        self.assertEqual(identify_language(text), "kn")

    @patch("app.services.translation_service.generate_text")
    def test_translate_to_english_success(self, mock_generate_text):
        mock_generate_text.return_value = "What foods should be avoided?"
        res = translate_to_english("ಯಾವ ಆಹಾರಗಳನ್ನು ತಪ್ಪಿಸಬೇಕು?", "kn")
        self.assertEqual(res, "What foods should be avoided?")
        mock_generate_text.assert_called_once()

    def test_translate_to_english_bypass(self):
        res = translate_to_english("What foods should I avoid?", "en")
        self.assertEqual(res, "What foods should I avoid?")

    @patch("app.services.translation_service.generate_text")
    def test_translate_from_english_success(self, mock_generate_text):
        mock_generate_text.return_value = "ಕಾಫಿ ಕುಡಿಯಬೇಡಿ."
        res = translate_from_english("Do not drink coffee.", "kn")
        self.assertEqual(res, "ಕಾಫಿ ಕುಡಿಯಬೇಡಿ.")
        mock_generate_text.assert_called_once()

    def test_translate_from_english_bypass(self):
        res = translate_from_english("Do not drink coffee.", "en")
        self.assertEqual(res, "Do not drink coffee.")

    @patch("app.services.translation_service.generate_text")
    def test_translate_failure(self, mock_generate_text):
        mock_generate_text.side_effect = Exception("Ollama offline")
        with self.assertRaises(ValueError):
            translate_to_english("ಟೆಸ್ಟ್", "kn")

    @patch("app.services.translation_service.generate_text")
    def test_translate_empty_response(self, mock_generate_text):
        mock_generate_text.return_value = ""
        with self.assertRaises(ValueError):
            translate_from_english("Hello", "kn")


class TestGroundedGuidanceTranslationPipeline(unittest.TestCase):
    def setUp(self):
        self.db = MagicMock()

    @patch("app.services.guidance.retrieve_similar_chunks")
    @patch("app.services.guidance.validate_evidence")
    @patch("app.services.guidance.llm_generate_text")
    @patch("app.services.guidance.get_or_create_session")
    @patch("app.services.translation_service.generate_text")
    def test_kannada_guidance_pipeline_flow(
        self, 
        mock_trans_generate, 
        mock_get_session, 
        mock_llm_generate, 
        mock_validate, 
        mock_retrieve
    ):
        # 1. Mock Kannada -> English translation
        # 2. Mock English -> Kannada translation
        mock_trans_generate.side_effect = [
            "What foods to avoid?",  # Input query translation
            "ಕಾಫಿ ಕುಡಿಯಬೇಡಿ."        # Final answer translation
        ]

        # Mock retrieval returning some chunks
        mock_retrieve.return_value = [
            {"document_title": "Doc A", "content": "Avoid caffeine in pregnancy.", "similarity_score": 0.8}
        ]
        # Mock evidence validator returning SUPPORTED
        mock_validate.return_value = "SUPPORTED"
        # Mock RAG answer generation
        mock_llm_generate.return_value = "Do not drink coffee."
        
        # Mock DB session persistence
        mock_session = MagicMock()
        mock_session.id = "session-id"
        mock_get_session.return_value = mock_session

        res = generate_patient_guidance_answer(
            db=self.db,
            question="ಗರ್ಭಾವಸ್ಥೆಯಲ್ಲಿ ಯಾವ ಆಹಾರಗಳನ್ನು ತಪ್ಪಿಸಬೇಕು?",
            patient_id="patient-id",
            hospital_id=None,
            session_id=None,
            guidance_topic="PREGNANCY",
            language="kn"
        )

        # Verify Kannada -> English translation was called first with Kannada question
        # Verify RAG retrieved chunks using the English translation
        mock_retrieve.assert_called_once()
        called_args, called_kwargs = mock_retrieve.call_args
        self.assertEqual(called_kwargs["query_text"], "What foods to avoid?")

        # Verify evidence validator validated using the English translation
        mock_validate.assert_called_once_with("What foods to avoid?", mock_retrieve.return_value)

        # Verify final answer translated to Kannada
        self.assertEqual(res["answer"], "ಕಾಫಿ ಕುಡಿಯಬೇಡಿ.")

        # Verify sources are preserved and NOT translated
        self.assertEqual(res["sources"], [{"document_title": "Doc A", "similarity_score": 0.8}])

    @patch("app.services.guidance.retrieve_similar_chunks")
    @patch("app.services.guidance.validate_evidence")
    @patch("app.services.guidance.llm_generate_text")
    @patch("app.services.translation_service.generate_text")
    def test_english_guidance_pipeline_bypasses_translation(
        self, 
        mock_trans_generate, 
        mock_llm_generate, 
        mock_validate, 
        mock_retrieve
    ):
        mock_retrieve.return_value = [
            {"document_title": "Doc A", "content": "Avoid caffeine.", "similarity_score": 0.8}
        ]
        mock_validate.return_value = "SUPPORTED"
        mock_llm_generate.return_value = "Do not drink coffee."

        # Verify English query does NOT trigger translation
        res = generate_patient_guidance_answer(
            db=self.db,
            question="What foods to avoid?",
            patient_id="patient-id",
            hospital_id=None,
            session_id=None,
            guidance_topic="PREGNANCY",
            language="en"
        )

        mock_trans_generate.assert_not_called()
        self.assertEqual(res["answer"], "Do not drink coffee.")
