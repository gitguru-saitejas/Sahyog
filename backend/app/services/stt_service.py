import os
import torch
import torchaudio
import soundfile as sf
from transformers import AutoModel

MODEL_NAME = "ai4bharat/indic-conformer-600m-multilingual"

# Cache for the loaded model instance
_model_instance = None

SUPPORTED_LANGUAGES = {
    "as", "bn", "brx", "dgo", "gu", "hi", "kn", "ks", "kok", "mai", 
    "ml", "mni", "mr", "ne", "or", "pa", "sa", "sat", "sd", "ta", "te", "ur"
}

SUPPORTED_DECODERS = {"ctc"}

def get_model():
    """Lazily loads and caches the IndicConformer model."""
    global _model_instance
    if _model_instance is None:
        try:
            print(f"[STT SERVICE] Loading IndicConformer model: {MODEL_NAME}...")
            _model_instance = AutoModel.from_pretrained(MODEL_NAME, trust_remote_code=True)
            print("[STT SERVICE] Model loaded successfully.")
        except Exception as e:
            print(f"[STT SERVICE] Failed to load IndicConformer model: {e}")
            raise RuntimeError(f"Failed to initialize STT model: {str(e)}")
    return _model_instance

def transcribe_audio(wav_path: str, language: str = "kn", decoder: str = "ctc") -> str:
    """
    Transcribes the given WAV file using IndicConformer.
    Accepts any common audio converted to WAV, resamples to 16kHz, converts to mono.
    """
    lang_lower = language.strip().lower()
    dec_lower = decoder.strip().lower()

    if lang_lower not in SUPPORTED_LANGUAGES:
        raise ValueError(f"Unsupported language code '{language}'. Must be one of: {sorted(list(SUPPORTED_LANGUAGES))}")

    if dec_lower not in SUPPORTED_DECODERS:
        raise ValueError(f"Unsupported decoder '{decoder}'. Must be one of: {list(SUPPORTED_DECODERS)}")

    if not os.path.exists(wav_path):
        raise FileNotFoundError(f"Audio file not found: {wav_path}")

    try:
        # Load audio using soundfile to prevent torch codec library dependency issues on Windows
        audio, sr = sf.read(wav_path)
    except Exception as e:
        raise ValueError(f"Failed to read audio file via soundfile: {str(e)}")

    try:
        # Construct torch tensor from numpy array
        wav = torch.tensor(audio, dtype=torch.float32)

        # Handle multi-channel/stereo to mono conversion
        if wav.ndim > 1:
            wav = torch.mean(wav, dim=1)

        # Batch dimension: shape becomes (1, samples)
        wav = wav.unsqueeze(0)

        # Resample to 16000 Hz if necessary
        if sr != 16000:
            resampler = torchaudio.transforms.Resample(orig_freq=sr, new_freq=16000)
            wav = resampler(wav)

        model = get_model()

        print(f"[STT SERVICE] Transcribing query in language='{lang_lower}' decoder='{dec_lower}'...")
        with torch.no_grad():
            result = model(wav, lang_lower, dec_lower)
        
        if result is None:
            raise ValueError("Model returned empty transcription result.")
            
        transcription = str(result).strip()
        print(f"[STT SERVICE] Transcription complete. Length: {len(transcription)}")
        return transcription

    except Exception as e:
        print(f"[STT SERVICE] Transcription failure: {e}")
        raise RuntimeError(f"STT inference failed: {str(e)}")
