import os
import json
import time
import urllib.request
import urllib.error
from app.core.config import settings


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

def check_model_health() -> bool:
    """
    Checks whether the configured LLM provider is reachable and ready.
    For Gemini: verifies the API key is set and the SDK can be imported.
    For Ollama: checks the /api/tags endpoint for the configured model.
    Called during startup/health checks only — not on every request.
    """
    if settings.LLM_PROVIDER == "gemini":
        return _check_gemini_health()
    return _check_ollama_health()


def _check_gemini_health() -> bool:
    """Verifies the Gemini API key is configured and SDK is importable."""
    if not settings.GEMINI_LLM_API_KEY:
        print("[LLM SERVICE] Gemini health check failed: GEMINI_LLM_API_KEY is not set.")
        return False
    try:
        from google import genai  # noqa: F401
        print("[LLM SERVICE] Gemini provider ready (SDK available, key configured).")
        return True
    except ImportError as e:
        print(f"[LLM SERVICE] Gemini health check import failed: {repr(e)}")
        return False


def _check_ollama_health() -> bool:
    """Checks if Ollama is running and the configured generation model is installed."""
    ollama_url = settings.OLLAMA_API_URL
    model_name = settings.LLM_MODEL
    try:
        url = f"{ollama_url.rstrip('/')}/api/tags"
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=3) as response:
            res = json.loads(response.read().decode("utf-8"))
            models = res.get("models", [])
            installed_names = [m.get("name") for m in models]
            for name in installed_names:
                if name == model_name or name == f"{model_name}:latest" or model_name == f"{name}:latest":
                    return True
            return False
    except Exception as e:
        print(f"[LLM SERVICE] Ollama health check failed: {e}")
        return False


# ---------------------------------------------------------------------------
# Provider router — public API used by guidance.py and translation_service.py
# ---------------------------------------------------------------------------

def generate_text(
    prompt: str,
    system_prompt: str,
    timeout: float = None,
    think: bool = True,
    options: dict = None,
    max_output_tokens: int = None
) -> str:
    """
    Generates text using the configured LLM provider (Gemini or Ollama).

    Parameters:
        prompt           – The user-facing prompt / question / translation request.
        system_prompt    – The system instruction to control model behaviour.
        timeout          – Request timeout in seconds (Ollama only; ignored for Gemini).
        think            – Enable/disable thinking mode (Ollama/Qwen only; ignored for Gemini).
        options          – Ollama-specific generation options dict (ignored for Gemini).
        max_output_tokens– Maximum tokens to generate (maps to Gemini max_output_tokens).
    """
    if settings.LLM_PROVIDER == "gemini":
        return _generate_text_gemini(prompt, system_prompt, max_output_tokens=max_output_tokens)
    return _generate_text_ollama(prompt, system_prompt, timeout=timeout, think=think, options=options)


# ---------------------------------------------------------------------------
# Gemini implementation
# ---------------------------------------------------------------------------

def _generate_text_gemini(
    prompt: str,
    system_prompt: str,
    max_output_tokens: int = None
) -> str:
    """
    Generates text via the Google Gemini API using the google-genai SDK.

    Security: The API key is read from settings.GEMINI_API_KEY and is NEVER
    logged, printed, included in exception messages, or propagated to callers.

    Error handling covers: invalid/missing key, rate limit, quota exhaustion,
    network failure, timeout, empty response, and safety-filter blocks.
    """
    if not settings.GEMINI_LLM_API_KEY:
        print("[LLM SERVICE] Gemini generation failed: GEMINI_LLM_API_KEY is not configured.")
        raise RuntimeError("Guidance service temporarily unavailable.")

    try:
        from google import genai
        from google.genai import types
    except ImportError as e:
        print(f"[LLM SERVICE] Gemini import failed: {repr(e)}")
        raise RuntimeError("Guidance service temporarily unavailable.")

    try:
        client = genai.Client(api_key=settings.GEMINI_LLM_API_KEY)

        config_kwargs = {
            "system_instruction": system_prompt,
            "thinking_config": types.ThinkingConfig(
                thinking_level="minimal"
            ),
        }
        if max_output_tokens:
            config_kwargs["max_output_tokens"] = max_output_tokens

        response = client.models.generate_content(
            model=settings.GEMINI_LLM_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(**config_kwargs),
        )

        # Check for safety-filtered responses
        if response.candidates:
            candidate = response.candidates[0]
            finish_reason = getattr(candidate, "finish_reason", None)
            if finish_reason and str(finish_reason) == "SAFETY":
                print("[LLM SERVICE] Gemini response blocked by safety filter.")
                raise RuntimeError("Guidance service temporarily unavailable.")

        text = response.text
        if not text or not text.strip():
            print("[LLM SERVICE] Gemini returned an empty response.")
            raise RuntimeError("Gemini returned an empty response.")

        return text.strip()

    except RuntimeError:
        # Already handled above — re-raise directly
        raise
    except Exception as e:
        print(f"[LLM SERVICE] Gemini generation error: {type(e).__name__}: {e}")
        raise RuntimeError("Guidance service temporarily unavailable.")


# ---------------------------------------------------------------------------
# Ollama implementation (unchanged, kept as fallback)
# ---------------------------------------------------------------------------

def _generate_text_ollama(
    prompt: str,
    system_prompt: str,
    timeout: float = None,
    think: bool = True,
    options: dict = None
) -> str:
    """
    Generates text using the configured Ollama generation model.
    keep_alive="10m" keeps the model resident across sequential Kannada pipeline calls.
    """
    ollama_url = settings.OLLAMA_API_URL
    model_name = settings.LLM_MODEL
    if timeout is None:
        timeout = settings.LLM_TIMEOUT

    url = f"{ollama_url.rstrip('/')}/api/generate"
    payload = {
        "model": model_name,
        "prompt": prompt,
        "system": system_prompt,
        "stream": False,
        "keep_alive": "10m",
        "options": {
            "temperature": 0.0
        }
    }
    if options:
        payload["options"].update(options)

    if not think:
        payload["think"] = False

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            res = json.loads(response.read().decode("utf-8"))
            if "response" in res:
                return res["response"].strip()
            else:
                raise ValueError("Ollama response did not contain 'response' field.")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        print(f"[LLM SERVICE] Ollama HTTP Error {e.code}: {body}")
        raise RuntimeError(f"Ollama generation failed with status {e.code}: {body}")
    except urllib.error.URLError as e:
        print(f"[LLM SERVICE] Ollama URL Error (connection/timeout): {e.reason}")
        raise ConnectionError(f"Ollama generation connection failed: {e.reason}")
    except Exception as e:
        print(f"[LLM SERVICE] Ollama unexpected generation failure: {e}")
        raise RuntimeError(f"Ollama generation failed: {str(e)}")


# ---------------------------------------------------------------------------
# Evidence validation (uses generate_text — automatically routes to provider)
# ---------------------------------------------------------------------------

def validate_evidence(question: str, chunks: list) -> str:
    """
    Validates whether the retrieved chunks contain direct and explicit information
    to answer the question. Returns "SUPPORTED" or "UNSUPPORTED" strictly.
    Routes to the active LLM provider (Gemini or Ollama).
    """
    if not chunks:
        return "UNSUPPORTED"

    start_time = time.time()

    # Format context chunks
    context_parts = []
    for idx, chunk in enumerate(chunks):
        context_parts.append(
            f"SOURCE {idx+1}\n"
            f"Document: {chunk.get('document_title')}\n"
            f"Content:\n{chunk.get('content')}\n"
        )
    context_text = "\n".join(context_parts)

    system_prompt = (
        "Determine whether the retrieved knowledge-base evidence contains enough directly relevant information to provide a useful grounded answer to the patient's question. "
        "Return SUPPORTED only when the answer can be generated using the retrieved evidence without adding external medical knowledge. "
        "For broad questions asking for general guidelines, recommendations, precautions, or an overview:\n"
        "- The context does not need to contain every possible recommendation.\n"
        "- It must contain multiple directly relevant recommendations sufficient to provide a useful partial overview.\n"
        "- The answer must be limited to what the retrieved evidence actually supports.\n\n"
        "For specific questions:\n"
        "- The context must directly support the requested information.\n\n"
        "Return UNSUPPORTED when:\n"
        "- evidence is irrelevant,\n"
        "- evidence is only tangentially related,\n"
        "- evidence is insufficient,\n"
        "- answering would require outside medical knowledge,\n"
        "- or the requested information is absent.\n\n"
        "Do not answer the question. Output exactly one word: SUPPORTED or UNSUPPORTED."
    )

    user_prompt = (
        f"Retrieved Context:\n{context_text}\n"
        f"Patient Question:\n{question}\n\n"
        "Validation Result:"
    )

    result = "UNSUPPORTED"
    try:
        model_output = generate_text(
            user_prompt,
            system_prompt,
            # Ollama-specific params (ignored by Gemini provider):
            timeout=45.0,
            think=False,
            options={"stop": [".", "\n", " "]},
            # Gemini-specific: single word output, generous cap
            max_output_tokens=100,
        )
        if model_output:
            # Strip and take only the first word to guard against verbose Gemini responses
            first_word = model_output.strip().split()[0].upper().rstrip(".")
            print(f"[LLM SERVICE] Evidence validation raw output: '{model_output.strip()}' -> parsed: '{first_word}'")
            if first_word == "SUPPORTED":
                result = "SUPPORTED"
    except Exception as e:
        print(f"[LLM SERVICE] Evidence validation exception: {type(e).__name__}")
    finally:
        latency = time.time() - start_time
        print(f"[LLM SERVICE] Evidence validation took {latency:.2f}s. Result: {result}")

    return result
