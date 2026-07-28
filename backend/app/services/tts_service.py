from app.services.gemini_tts import generate_gemini_tts

def synthesize_speech(text: str, language: str = "kn", speaker: str = "Anu") -> bytes:
    """
    Synthesizes Kannada/Hindi text into WAV bytes using Gemini TTS.
    Delegates to the dedicated gemini_tts service.
    """
    lang_lower = language.strip().lower()
    if lang_lower not in ("kn", "hi"):
        raise ValueError(f"Unsupported language code '{language}'. Currently 'kn' and 'hi' are supported.")
        
    if speaker != "Anu":
        raise ValueError(f"Unsupported speaker '{speaker}'. Available: ['Anu']")
        
    return generate_gemini_tts(text, language=lang_lower, speaker=speaker)
