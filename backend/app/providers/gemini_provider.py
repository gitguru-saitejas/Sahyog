import logging
from google import genai
from google.genai import types
from google.genai.errors import APIError
from app.core.config import settings

logger = logging.getLogger("sahyog.summarize")

class GeminiProvider:
    def __init__(self):
        # Retrieve the key from Settings (which resolves from .env)
        # Fallback to system environment variable if settings key is empty
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            import os
            api_key = os.environ.get("GEMINI_API_KEY", "")
            
        self.api_key = api_key
        self.client = None
        
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                logger.info("[GEMINI PROVIDER] Successfully initialized Google Gen AI Client.")
            except Exception as e:
                logger.error(f"[GEMINI PROVIDER] Error initializing Gemini client: {str(e)}")
        else:
            logger.warning("[GEMINI PROVIDER] GEMINI_API_KEY is not set. Gemini Provider initialized without a client.")

    def generate_structured_json(self, prompt: str, system_instruction: str) -> str:
        """
        Sends context and instructs Gemini to return structured JSON.
        Handles API failures and raised exceptions gracefully.
        """
        if not self.client:
            logger.error("[GEMINI PROVIDER] Attempted LLM call but Gen AI client is not initialized (missing API key).")
            raise RuntimeError("Gemini Client is not configured. Please check your GEMINI_API_KEY environment variable.")

        try:
            logger.info("[GEMINI PROVIDER] Calling Gemini API (gemini-2.5-flash)...")
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    temperature=0.2, # Low temperature for accurate clinical summaries
                ),
            )
            logger.info("[GEMINI PROVIDER] Gemini API response received.")
            return response.text
        except APIError as e:
            logger.error(f"[GEMINI PROVIDER] Google Gen AI APIError: {e.message} (code: {e.code})")
            raise RuntimeError(f"Gemini API failure: {e.message}")
        except Exception as e:
            logger.error(f"[GEMINI PROVIDER] Unexpected error during Gemini call: {str(e)}")
            raise RuntimeError(f"Failed to communicate with Gen AI service: {str(e)}")
