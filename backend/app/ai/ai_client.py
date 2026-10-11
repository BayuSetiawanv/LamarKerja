import httpx
import logging
import asyncio
from app.config import settings

logger = logging.getLogger(__name__)


async def ask_ai(prompt: str, system_prompt: str = "", want_json: bool = True, max_retries: int = 2, max_tokens: int = 4096) -> str:
    """
    AI Gateway dengan retry logic untuk handle transient errors (400/429/500).
    """
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    if settings.AI_PROVIDER == "cloud":
        base_url = settings.AI_BASE_URL.rstrip('/')
        url = f"{base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.AI_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.AI_MODEL,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": max_tokens,
        }
        # Tidak pakai response_format karena beberapa model tidak support
        provider_name = f"Cloud ({settings.AI_MODEL})"
    else:
        url = f"{settings.OLLAMA_BASE_URL}/api/chat"
        headers = {}
        payload = {
            "model": settings.OLLAMA_MODEL,
            "messages": messages,
            "stream": False,
        }
        if want_json:
            payload["format"] = "json"
        provider_name = f"Local ({settings.OLLAMA_MODEL})"

    timeout = httpx.Timeout(300.0, connect=10.0)
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            logger.info(f"📤 Mengirim request ke AI via {provider_name}... (attempt {attempt + 1}/{max_retries + 1})")

            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, json=payload, headers=headers)

                # Log detail jika error
                if response.status_code >= 400:
                    error_body = response.text[:500]  # Potong agar tidak terlalu panjang
                    logger.error(f"❌ HTTP {response.status_code}: {error_body}")
                    
                    # Retry hanya untuk error transient (429, 500, 503)
                    if response.status_code in [429, 500, 503] and attempt < max_retries:
                        wait_time = (attempt + 1) * 1.5  # Exponential backoff: 1.5s, 3s
                        logger.info(f"⏳ Rate limit/server error, menunggu {wait_time}s lalu retry...")
                        await asyncio.sleep(wait_time)
                        continue
                    
                    # Untuk 400, jangan retry (biasanya masalah content/prompt)
                    response.raise_for_status()

                response.raise_for_status()
                data = response.json()

            if settings.AI_PROVIDER == "cloud":
                content = data["choices"][0]["message"]["content"]
            else:
                content = data["message"]["content"]

            logger.info(f"✅ AI ({provider_name}) berhasil merespons!")
            return content

        except httpx.HTTPStatusError as e:
            last_error = e
            if attempt < max_retries:
                wait_time = (attempt + 1) * 1.5
                logger.warning(f"⚠️ HTTP error, retry dalam {wait_time}s...")
                await asyncio.sleep(wait_time)
                continue
            logger.error(f"❌ HTTP Error after {max_retries + 1} attempts: {e.response.status_code} - {e.response.text[:200]}")
            raise ValueError(f"API error: {e.response.status_code} - {e.response.text[:200]}")
        except httpx.TimeoutException:
            last_error = "timeout"
            if attempt < max_retries:
                wait_time = (attempt + 1) * 1.5
                logger.warning(f"⚠️ Timeout, retry dalam {wait_time}s...")
                await asyncio.sleep(wait_time)
                continue
            logger.error("❌ Timeout: AI terlalu lama merespons")
            raise ValueError("AI timeout (melebihi 5 menit)")
        except Exception as e:
            last_error = e
            logger.error(f"❌ Unexpected error: {type(e).__name__}: {e}")
            if attempt < max_retries:
                await asyncio.sleep(1)
                continue
            raise ValueError(f"Unexpected error: {str(e)}")

    # Jika loop selesai tanpa return/raise
    raise ValueError(f"Gagal setelah {max_retries + 1} percobaan. Error terakhir: {last_error}")
