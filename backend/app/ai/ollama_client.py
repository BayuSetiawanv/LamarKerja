import json
import logging
from app.ai.ai_client import ask_ai

logger = logging.getLogger(__name__)


async def ask_ollama(prompt: str, system_prompt: str = "") -> dict:
    """Mengirim prompt ke AI dan memaksa output berupa JSON."""
    raw_content = await ask_ai(prompt, system_prompt, want_json=True)

    # Cleanup markdown code block jika model menambahkannya
    if raw_content.startswith("```json"):
        raw_content = raw_content[7:]
    if raw_content.startswith("```"):
        raw_content = raw_content[3:]
    if raw_content.endswith("```"):
        raw_content = raw_content[:-3]

    try:
        return json.loads(raw_content.strip())
    except json.JSONDecodeError:
        logger.error("❌ AI tidak mengembalikan format JSON yang valid.")
        raise ValueError("AI gagal memformat jawaban menjadi JSON.")