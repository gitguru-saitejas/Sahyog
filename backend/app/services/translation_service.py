import re
import time
from app.services.llm import generate_text


def identify_language(text: str) -> str:
    """
    Lightweight language identifier.
    Returns 'kn' if Kannada characters are found, otherwise 'en'.
    """
    if not text:
        return "en"
    if re.search(r"[\u0C80-\u0CFF]", text):
        return "kn"
    return "en"


def translate_to_english(text: str, source_language: str) -> str:
    """
    Translates non-English (Kannada) text to English.
    Uses the active LLM provider (Gemini or Ollama) via generate_text().
    Returns original text if source_language is 'en'.
    Raises ValueError on translation failure.

    For Gemini: output is naturally short for a query translation (~20-50 words).
    max_output_tokens=300 is a generous safety cap.
    For Ollama: num_predict/num_ctx are passed via options; ignored by Gemini.
    """
    if not text or not text.strip():
        return text

    if source_language != "kn":
        return text

    system_prompt = (
        "You are a medical translator. Translate the Kannada text to English.\n"
        "Rules:\n"
        "- Translate only. Do not answer the medical question.\n"
        "- Do not add medical information or explanations.\n"
        "- Preserve all numbers, measurements, dates, and dosages exactly.\n"
        "- Preserve medicine names, symptoms, and negation exactly.\n"
        "- Return only the translated English text — nothing else."
    )

    user_prompt = f"Translate to English:\n{text}"

    try:
        start_time = time.time()
        translated = generate_text(
            user_prompt,
            system_prompt,
            # Ollama-specific options (silently ignored by Gemini provider):
            timeout=240.0,
            think=False,
            options={
                "num_predict": 200,
                "num_ctx": 1024,
            },
            # Gemini cap — a Kannada query translated to English is at most ~50 words:
            max_output_tokens=300,
        )
        latency = time.time() - start_time

        if not translated or not translated.strip():
            raise ValueError("Translation returned empty response.")

        cleaned = translated.strip()
        print(f"[GEMINI GUIDANCE PIPELINE] KN → EN: {latency:.2f}s | Input chars: {len(text)} | Output chars: {len(cleaned)}")
        return cleaned
    except Exception as e:
        print(f"[TRANSLATION SERVICE] Error during Kannada → English translation: {type(e).__name__}")
        raise ValueError(f"Kannada to English translation failed: {str(e)}")


def translate_from_english(text: str, target_language: str) -> str:
    """
    Translates English text to Kannada (or other target language in future).
    Uses the active LLM provider (Gemini or Ollama) via generate_text().
    Returns original text if target_language is 'en'.
    Raises ValueError on translation failure.

    Translation-only behaviour is enforced by the system prompt:
    no summarisation, no new medical facts, no altered dosages,
    no altered warnings, no hallucinated recommendations.

    For Gemini: max_output_tokens=800 generously covers any Sahyog guidance answer.
    For Ollama: num_predict/num_ctx options are passed; ignored by Gemini.
    """
    if not text or not text.strip():
        return text

    if target_language != "kn":
        return text

    system_prompt = (
        "You are a medical translator. Translate the English text to Kannada.\n"
        "Rules:\n"
        "- Translate only. Do not add information or remove information.\n"
        "- Do not add diagnoses, advice, or explanations beyond what is in the text.\n"
        "- Preserve all medicine names, dosages, numbers, measurements, and dates exactly.\n"
        "- Preserve all safety warnings and negation exactly.\n"
        "- Preserve uncertainty (e.g. 'may', 'should', 'consult your doctor').\n"
        "- Return natural, understandable Kannada suitable for a patient.\n"
        "- Return only the translated Kannada text — nothing else."
    )

    user_prompt = f"Translate to Kannada:\n{text}"

    try:
        start_time = time.time()
        translated = generate_text(
            user_prompt,
            system_prompt,
            # Ollama-specific options (silently ignored by Gemini provider):
            timeout=240.0,
            think=False,
            options={
                "num_predict": 512,
                "num_ctx": 2048,
            },
            # Gemini cap — generous for any Sahyog guidance answer in Kannada:
            max_output_tokens=800,
        )
        latency = time.time() - start_time

        if not translated or not translated.strip():
            raise ValueError("Translation returned empty response.")

        cleaned = translated.strip()
        print(f"[GEMINI GUIDANCE PIPELINE] EN → KN: {latency:.2f}s | Input chars: {len(text)} | Output chars: {len(cleaned)}")
        return cleaned
    except Exception as e:
        print(f"[TRANSLATION SERVICE] Error during English → Kannada translation: {type(e).__name__}")
        raise ValueError(f"English to Kannada translation failed: {str(e)}")
