import os
import uuid
import tempfile
import subprocess
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from pydantic import BaseModel, Field
from app.core.config import settings
from app.services.stt_service import transcribe_audio
from app.services.tts_service import synthesize_speech

router = APIRouter()

ALLOWED_EXTENSIONS = {
    ".wav", ".mp4", ".m4a", ".webm", ".ogg", ".aac", ".mp3", ".3gp", ".flac"
}

@router.post("/transcribe")
async def transcribe_audio_endpoint(
    file: UploadFile = File(...),
    language: str = "kn",
    decoder: str = "ctc"
):
    """
    Endpoint to transcribe uploaded audio file.
    Converts input format to 16kHz mono WAV using FFmpeg, runs STT, and returns transcription.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing filename on upload."
        )

    # Validate file extension
    ext = os.path.splitext(file.filename.lower())[1]
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {sorted(list(ALLOWED_EXTENSIONS))}"
        )

    # Use secure UUID-based names in the system temp directory
    temp_dir = tempfile.gettempdir()
    input_temp_path = os.path.join(temp_dir, f"sahyog_in_{uuid.uuid4()}{ext}")
    output_temp_path = os.path.join(temp_dir, f"sahyog_out_{uuid.uuid4()}.wav")

    try:
        # Save upload to temporary file
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty."
            )
        
        with open(input_temp_path, "wb") as f:
            f.write(content)

        # Convert uploaded format to mono, 16kHz, pcm_s16le WAV using FFmpeg
        cmd = [
            settings.FFMPEG_PATH,
            "-y",
            "-i", input_temp_path,
            "-ac", "1",
            "-ar", "16000",
            "-c:a", "pcm_s16le",
            output_temp_path
        ]

        print(f"[SPEECH ENDPOINT] Converting audio: {' '.join(cmd)}")
        try:
            result = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=True,
                timeout=30
            )
        except subprocess.CalledProcessError as cpe:
            stderr = cpe.stderr.decode("utf-8", errors="ignore")
            print(f"[SPEECH ENDPOINT] FFmpeg failed with error: {stderr}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or corrupt audio file. Conversion failed."
            )
        except subprocess.TimeoutExpired:
            print("[SPEECH ENDPOINT] FFmpeg process timed out.")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Audio conversion processing timed out."
            )
        except Exception as err:
            print(f"[SPEECH ENDPOINT] FFmpeg failed to execute: {err}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="FFmpeg utility is not configured properly or missing from system PATH."
            )

        # Run STT Service to transcribe the converted WAV file
        try:
            transcription = transcribe_audio(
                wav_path=output_temp_path,
                language=language,
                decoder=decoder
            )
        except ValueError as ve:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(ve)
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )

        return {
            "text": transcription,
            "language": language.strip().lower()
        }

    finally:
        # Guarantee cleanup of all temporary files
        if os.path.exists(input_temp_path):
            try:
                os.remove(input_temp_path)
            except Exception as e:
                print(f"[SPEECH ENDPOINT] Failed to clean up temp input file: {e}")
        if os.path.exists(output_temp_path):
            try:
                os.remove(output_temp_path)
            except Exception as e:
                print(f"[SPEECH ENDPOINT] Failed to clean up temp output file: {e}")


class TTSSynthesisRequest(BaseModel):
    text: str = Field(..., description="The text to synthesize to speech.")
    language: str = Field("kn", description="The language of the text. Currently only 'kn' is supported.")
    speaker: str = Field("Anu", description="The voice speaker name.")

@router.post("/synthesize")
async def synthesize_speech_endpoint(request: TTSSynthesisRequest):
    """
    Endpoint to synthesize Kannada text into speech WAV audio using Indic Parler-TTS.
    """
    text = request.text.strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text input cannot be empty or whitespace only."
        )

    # Sensible text-length limit to prevent accidental extremely expensive generation
    if len(text) > 2000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text input exceeds maximum limit of 2000 characters."
        )

    language = request.language.strip().lower()
    if language not in ("kn", "hi"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported language code '{request.language}'. Currently 'kn' and 'hi' are supported."
        )

    speaker = request.speaker.strip()
    if speaker != "Anu":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported speaker '{request.speaker}'. Available: ['Anu']."
        )

    try:
        wav_bytes = synthesize_speech(text, language=language, speaker=speaker)
        return Response(content=wav_bytes, media_type="audio/wav")
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        print(f"[SPEECH ENDPOINT] TTS synthesis error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate speech. Internal TTS inference failure."
        )
