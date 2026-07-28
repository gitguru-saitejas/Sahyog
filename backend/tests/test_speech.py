import unittest
from unittest.mock import patch, MagicMock
import os
import tempfile
from fastapi.testclient import TestClient

from app.main import app
from app.services.stt_service import transcribe_audio
from app.services.tts_service import synthesize_speech

class TestSpeechSTTIntegration(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch("app.services.stt_service.get_model")
    @patch("soundfile.read")
    @patch("app.services.stt_service.os.path.exists", return_value=True)
    def test_stt_service_success(self, mock_exists, mock_sf_read, mock_get_model):
        # Mock soundfile reading: mono, 16000Hz, length 1 second
        import numpy as np
        mock_sf_read.return_value = (np.zeros(16000), 16000)

        # Mock model callable
        mock_model = MagicMock()
        mock_model.return_value = "ಗರ್ಭಾವಸ್ಥೆಯಲ್ಲಿ ಕಾಫಿ ಕುಡಿಯಬಹುದೇ"
        mock_get_model.return_value = mock_model

        # Call transcribe
        res = transcribe_audio("dummy.wav", language="kn", decoder="ctc")
        self.assertEqual(res, "ಗರ್ಭಾವಸ್ಥೆಯಲ್ಲಿ ಕಾಫಿ ಕುಡಿಯಬಹುದೇ")
        
        # Verify model call arguments
        mock_model.assert_called_once()
        called_args, _ = mock_model.call_args
        # arg 0: wav tensor, arg 1: lang, arg 2: decoder
        self.assertEqual(called_args[1], "kn")
        self.assertEqual(called_args[2], "ctc")

    def test_stt_service_invalid_language(self):
        with self.assertRaises(ValueError) as context:
            transcribe_audio("dummy.wav", language="invalid-lang-code", decoder="ctc")
        self.assertIn("Unsupported language code", str(context.exception))

    def test_stt_service_invalid_decoder(self):
        with self.assertRaises(ValueError) as context:
            transcribe_audio("dummy.wav", language="kn", decoder="invalid-decoder")
        self.assertIn("Unsupported decoder", str(context.exception))

    @patch("app.api.endpoints.speech.transcribe_audio")
    @patch("app.api.endpoints.speech.subprocess.run")
    def test_speech_endpoint_success_and_cleanup(self, mock_subprocess_run, mock_transcribe_audio):
        # Mock transcribe_audio
        mock_transcribe_audio.return_value = "ಟೆಸ್ಟ್ ಧ್ವನಿ"

        # Mock FFmpeg subprocess run
        mock_subprocess_run.return_value = MagicMock(returncode=0)

        # We will track file creations/removals
        removed_files = []
        
        def spy_remove(path):
            removed_files.append(path)

        with patch("app.api.endpoints.speech.os.remove", side_effect=spy_remove), \
             patch("app.api.endpoints.speech.os.path.exists", return_value=True):
            response = self.client.post(
                "/api/speech/transcribe?language=kn",
                files={"file": ("test.webm", b"mockwebmbytes", "audio/webm")}
            )

        # Assert status code
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"text": "ಟೆಸ್ಟ್ ಧ್ವನಿ", "language": "kn"})

        # Assert temporary files were deleted
        self.assertEqual(len(removed_files), 2)
        # Should contain input and output temp file paths
        self.assertTrue(any("sahyog_in_" in f for f in removed_files))
        self.assertTrue(any("sahyog_out_" in f for f in removed_files))

    @patch("app.api.endpoints.speech.subprocess.run")
    def test_speech_endpoint_ffmpeg_failure_cleanup(self, mock_subprocess_run):
        import subprocess
        # Mock FFmpeg raising error
        mock_subprocess_run.side_effect = subprocess.CalledProcessError(
            returncode=1,
            cmd="ffmpeg",
            stderr=b"FFmpeg error details"
        )

        removed_files = []
        
        def spy_remove(path):
            removed_files.append(path)

        with patch("app.api.endpoints.speech.os.remove", side_effect=spy_remove), \
             patch("app.api.endpoints.speech.os.path.exists", return_value=True):
            response = self.client.post(
                "/api/speech/transcribe?language=kn",
                files={"file": ("test.webm", b"badbytes", "audio/webm")}
            )

        # Assert conversion failure results in 400 Bad Request
        self.assertEqual(response.status_code, 400)
        self.assertIn("Conversion failed", response.json()["detail"])

        # Check that cleanup still removed the temp input file even on failure
        self.assertEqual(len(removed_files), 2) # Both input and output WAV paths cleaned up
        self.assertTrue(any("sahyog_in_" in f for f in removed_files))

    def test_speech_endpoint_empty_file(self):
        response = self.client.post(
            "/api/speech/transcribe?language=kn",
            files={"file": ("test.wav", b"", "audio/wav")}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("empty", response.json()["detail"].lower())

    def test_speech_endpoint_invalid_extension(self):
        response = self.client.post(
            "/api/speech/transcribe?language=kn",
            files={"file": ("test.txt", b"some plain text", "text/plain")}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unsupported file format", response.json()["detail"])

    # =========================================================================
    # TEXT TO SPEECH (TTS) TESTS
    # =========================================================================

    @patch("app.services.tts_service.get_model_and_tokenizers")
    @patch("soundfile.write")
    def test_tts_service_success(self, mock_sf_write, mock_get_model_and_tokenizers):
        # Setup mocks
        mock_model = MagicMock()
        mock_model.config.sampling_rate = 24000
        mock_model.generate.return_value = MagicMock(
            cpu=MagicMock(
                return_value=MagicMock(
                    numpy=MagicMock(
                        return_value=MagicMock(
                            squeeze=MagicMock(return_value=[0.0, 0.0])
                        )
                    )
                )
            )
        )
        
        mock_tokenizer = MagicMock()
        mock_tokenizer.return_value = MagicMock(
            to=MagicMock(return_value=MagicMock(input_ids=[1], attention_mask=[1]))
        )
        
        mock_desc_tokenizer = MagicMock()
        mock_desc_tokenizer.return_value = MagicMock(
            to=MagicMock(return_value=MagicMock(input_ids=[2], attention_mask=[2]))
        )
        
        mock_get_model_and_tokenizers.return_value = (mock_model, mock_tokenizer, mock_desc_tokenizer)

        # Patch open & file exists so the temp file reading yields mock audio bytes
        with patch("builtins.open", unittest.mock.mock_open(read_data=b"mock_wav_bytes")), \
             patch("app.services.tts_service.os.path.exists", return_value=True), \
             patch("app.services.tts_service.os.remove") as mock_remove:
            
            res = synthesize_speech("ಗರ್ಭಾವಸ್ಥೆಯಲ್ಲಿ ಕಾಫಿ ಸೇವನೆಯನ್ನು ಮಿತಿಗೊಳಿಸುವುದು ಉತ್ತಮ.", language="kn", speaker="Anu")
            self.assertEqual(res, b"mock_wav_bytes")
            
        mock_model.generate.assert_called_once()

    def test_tts_service_invalid_language(self):
        with self.assertRaises(ValueError) as context:
            synthesize_speech("ಟೆಸ್ಟ್", language="invalid-lang", speaker="Anu")
        self.assertIn("Unsupported language code", str(context.exception))

    def test_tts_service_invalid_speaker(self):
        with self.assertRaises(ValueError) as context:
            synthesize_speech("ಟೆಸ್ಟ್", language="kn", speaker="invalid-speaker")
        self.assertIn("Unsupported speaker", str(context.exception))

    @patch("app.api.endpoints.speech.synthesize_speech")
    def test_speech_endpoint_synthesize_success(self, mock_synthesize_speech):
        mock_synthesize_speech.return_value = b"mock_wav_binary_content"

        response = self.client.post(
            "/api/speech/synthesize",
            json={
                "text": "ಗರ್ಭಾವಸ್ಥೆಯಲ್ಲಿ ಕಾಫಿ ಸೇವನೆಯನ್ನು ಮಿತಿಗೊಳಿಸುವುದು ಉತ್ತಮ.",
                "language": "kn",
                "speaker": "Anu"
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["content-type"], "audio/wav")
        self.assertEqual(response.content, b"mock_wav_binary_content")
        mock_synthesize_speech.assert_called_once_with(
            "ಗರ್ಭಾವಸ್ಥೆಯಲ್ಲಿ ಕಾಫಿ ಸೇವನೆಯನ್ನು ಮಿತಿಗೊಳಿಸುವುದು ಉತ್ತಮ.",
            language="kn",
            speaker="Anu"
        )

    def test_speech_endpoint_synthesize_empty_text(self):
        response = self.client.post(
            "/api/speech/synthesize",
            json={
                "text": "   ",
                "language": "kn",
                "speaker": "Anu"
            }
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("empty or whitespace only", response.json()["detail"])

    def test_speech_endpoint_synthesize_large_text(self):
        large_text = "ಅ" * 501
        response = self.client.post(
            "/api/speech/synthesize",
            json={
                "text": large_text,
                "language": "kn",
                "speaker": "Anu"
            }
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("exceeds maximum limit", response.json()["detail"])

    def test_speech_endpoint_synthesize_invalid_language(self):
        response = self.client.post(
            "/api/speech/synthesize",
            json={
                "text": "ಕನ್ನಡ",
                "language": "en",
                "speaker": "Anu"
            }
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unsupported language code", response.json()["detail"])

    def test_speech_endpoint_synthesize_invalid_speaker(self):
        response = self.client.post(
            "/api/speech/synthesize",
            json={
                "text": "ಕನ್ನಡ",
                "language": "kn",
                "speaker": "Ramesh"
            }
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unsupported speaker", response.json()["detail"])

    @patch("app.api.endpoints.speech.synthesize_speech")
    def test_speech_endpoint_synthesize_failure(self, mock_synthesize_speech):
        mock_synthesize_speech.side_effect = Exception("Model loader failure")

        response = self.client.post(
            "/api/speech/synthesize",
            json={
                "text": "ಕನ್ನಡ",
                "language": "kn",
                "speaker": "Anu"
            }
        )
        self.assertEqual(response.status_code, 500)
        self.assertIn("Internal TTS inference failure", response.json()["detail"])
