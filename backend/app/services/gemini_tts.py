import os
import io
import re
import wave
import time
from typing import List
from google import genai
from google.genai import types
from google.genai.errors import APIError
from app.core.config import settings

def get_gemini_client() -> genai.Client:
    """
    Initializes and returns the Gemini client using settings.
    """
    if not settings.GEMINI_TTS_API_KEY:
        raise ValueError("GEMINI_TTS_API_KEY is not configured in settings.")
    return genai.Client(api_key=settings.GEMINI_TTS_API_KEY)

def chunk_text_for_tts(text: str, max_chars: int = 300) -> List[str]:
    """
    Splits text into chunks of maximum size max_chars.
    Prefers sentence boundaries (. ? ! । \n) and word boundaries.
    Handles Kannada and Hindi Unicode safely.
    """
    if not text or not text.strip():
        return []
        
    # Split text keeping delimiters using lookbehind to avoid losing sentence punctuation
    sentences = re.split(r'(?<=[.?!।\n\r])\s*', text)
    
    chunks = []
    current_chunk = []
    current_len = 0
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        sentence_len = len(sentence)
        if current_len + sentence_len + (1 if current_chunk else 0) <= max_chars:
            current_chunk.append(sentence)
            current_len += sentence_len + (1 if len(current_chunk) > 1 else 0)
        else:
            if current_chunk:
                chunks.append(" ".join(current_chunk))
                current_chunk = []
                current_len = 0
                
            if sentence_len > max_chars:
                # Split large sentence by words
                words = sentence.split(" ")
                word_chunk = []
                word_len = 0
                for word in words:
                    if not word:
                        continue
                    w_len = len(word)
                    if word_len + w_len + (1 if word_chunk else 0) <= max_chars:
                        word_chunk.append(word)
                        word_len += w_len + (1 if len(word_chunk) > 1 else 0)
                    else:
                        if word_chunk:
                            chunks.append(" ".join(word_chunk))
                        word_chunk = [word]
                        word_len = w_len
                if word_chunk:
                    current_chunk = word_chunk
                    current_len = word_len
            else:
                current_chunk = [sentence]
                current_len = sentence_len
                
    if current_chunk:
        chunks.append(" ".join(current_chunk))
        
    return chunks

def strip_wav_header(audio_data: bytes) -> bytes:
    """
    Strips the WAV header if present, returning raw PCM bytes.
    Standard WAV header is 44 bytes.
    """
    if audio_data.startswith(b'RIFF') and len(audio_data) > 44 and audio_data[8:12] == b'WAVE':
        return audio_data[44:]
    return audio_data

def pcm_to_wav(pcm_data: bytes, sample_rate: int = 24000, channels: int = 1, sample_width: int = 2) -> bytes:
    """
    Wraps raw PCM bytes in a WAV container.
    """
    if pcm_data.startswith(b'RIFF') and len(pcm_data) > 12 and pcm_data[8:12] == b'WAVE':
        return pcm_data
        
    wav_buf = io.BytesIO()
    with wave.open(wav_buf, "wb") as wav_file:
        wav_file.setnchannels(channels)
        wav_file.setsampwidth(sample_width)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_data)
    return wav_buf.getvalue()

def _generate_audio_chunk(
    client: genai.Client,
    text: str,
    voice_name: str = "Aoede",
    retries: int = 2,
    backoff: float = 1.0
) -> bytes:
    """
    Invokes Gemini API to generate audio for a single text chunk.
    Includes conservative retry strategy for transient errors.
    """
    model = settings.GEMINI_TTS_MODEL or "gemini-2.5-flash-preview-tts"
    
    config = types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name=voice_name
                )
            )
        )
    )
    
    for attempt in range(retries + 1):
        try:
            print(f"[GEMINI TTS] Attempt {attempt + 1}: Generating audio for chunk (length {len(text)})...")
            response = client.models.generate_content(
                model=model,
                contents=text,
                config=config
            )
            
            if not response.candidates or not response.candidates[0].content.parts:
                raise ValueError("Gemini API returned an empty response structure.")
                
            part = response.candidates[0].content.parts[0]
            if not part.inline_data or not part.inline_data.data:
                raise ValueError("Response contains no inline audio data.")
                
            return part.inline_data.data
            
        except APIError as api_err:
            status_code = getattr(api_err, "code", None)
            # Retry only transient status codes (429, 503, 504)
            if status_code in (429, 503, 504) and attempt < retries:
                sleep_time = backoff * (2 ** attempt)
                print(f"[GEMINI TTS] Transient APIError {status_code}. Retrying in {sleep_time}s...")
                time.sleep(sleep_time)
            else:
                print(f"[GEMINI TTS] Permanent APIError or max retries reached: {api_err}")
                raise RuntimeError(f"Gemini API Error: {str(api_err)}")
        except Exception as e:
            if attempt < retries:
                sleep_time = backoff * (2 ** attempt)
                print(f"[GEMINI TTS] Unexpected error: {e}. Retrying in {sleep_time}s...")
                time.sleep(sleep_time)
            else:
                print(f"[GEMINI TTS] Unexpected error or max retries reached: {e}")
                raise e

def generate_gemini_tts(text: str, language: str = "kn", speaker: str = "Anu") -> bytes:
    """
    Main orchestration function for Gemini TTS.
    Splits text, calls Gemini API for chunks, strips headers, merges raw PCM, and returns WAV bytes.
    """
    client = get_gemini_client()
    
    cleaned_text = text.strip()
    if not cleaned_text:
        raise ValueError("Text input cannot be empty or whitespace only.")
        
    chunks = chunk_text_for_tts(cleaned_text, max_chars=300)
    if not chunks:
        raise ValueError("Failed to generate segments for Text-to-Speech.")
        
    # Map default speaker Anu to a valid Gemini prebuilt voice
    # Available voices in Gemini: "Aoede", "Charon", "Kore", "Puck", "Fenrir"
    voice_name = "Aoede"
    
    pcm_chunks = []
    for idx, chunk in enumerate(chunks):
        print(f"[GEMINI TTS] Processing segment {idx + 1}/{len(chunks)}...")
        chunk_audio = _generate_audio_chunk(client, chunk, voice_name=voice_name)
        if chunk_audio:
            raw_pcm = strip_wav_header(chunk_audio)
            pcm_chunks.append(raw_pcm)
            
    if not pcm_chunks:
        raise RuntimeError("No audio data could be generated for the provided text.")
        
    combined_pcm = b"".join(pcm_chunks)
    wav_bytes = pcm_to_wav(combined_pcm)
    return wav_bytes
