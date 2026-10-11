import logging
import json
import re
from app.core.data_loader import data_store
from app.services.pdf_parser import extract_text_from_pdf
from app.ai.ai_client import ask_ai  # <-- UBAH: Pakai ai_client, bukan ollama_client

logger = logging.getLogger(__name__)

def clean_and_parse_json(response_text: str) -> dict:
    """
    Membersihkan respons AI dari markdown (```json) dan memastikannya valid JSON.
    Ini adalah peluru perak untuk mencegah error JSONDecodeError.
    """
    # 1. Hapus spasi di awal dan akhir
    text = response_text.strip()
    
    # 2. Hapus block markdown ```json ... ``` atau ``` ... ``` menggunakan Regex
    text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*```$', '', text, flags=re.IGNORECASE)
    text = text.strip()
    
    # 3. Coba parse menjadi dictionary Python
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.error(f"❌ Gagal parse JSON. Error: {e}")
        logger.error(f"❌ Raw text dari AI (300 char pertama): {text[:300]}...")
        raise ValueError("AI gagal memformat jawaban menjadi JSON yang valid. Periksa prompt atau coba lagi.")

async def analyze_cv(file_bytes: bytes) -> dict:
    """Pipeline lengkap: PDF -> Text -> AI Gateway -> Structured JSON."""
    
    # 1. Ekstrak teks dari PDF
    raw_text = await extract_text_from_pdf(file_bytes)
    if not raw_text:
        raise ValueError("PDF kosong atau tidak mengandung teks yang bisa dibaca.")

    # 2. Ambil Prompt Template dari memori (DataLoader)
    prompts = data_store.get("prompt_templates", {}).get("prompts", {})
    cv_prompt = prompts.get("cv_extraction", {})
    
    system_prompt = cv_prompt.get("system", "Anda adalah sistem ATS ahli. HANYA balas dengan JSON valid.")
    user_prompt_template = cv_prompt.get("user", "Ekstrak CV ini: {cv_text}")
    
    # 3. Masukkan teks CV ke dalam prompt
    final_user_prompt = user_prompt_template.replace("{cv_text}", raw_text)

    # Tambahan paksa di akhir prompt untuk memastikan AI tidak ngelantur
    final_user_prompt += "\n\nPENTING: Balas HANYA dengan string JSON murni. JANGAN gunakan markdown (```json), JANGAN tambahkan teks pembuka atau penutup."

    logger.info("🧠 Mengirim CV ke AI Gateway untuk dianalisis...")
    
    # 4. Panggil ask_ai (ini akan otomatis route ke Groq karena settings.AI_PROVIDER == "cloud")
    raw_ai_response = await ask_ai(
        prompt=final_user_prompt, 
        system_prompt=system_prompt,
        want_json=True
    )

    # 5. Bersihkan dan parse JSON menggunakan fungsi aman kita
    structured_data = clean_and_parse_json(raw_ai_response)

    # 6. Kembalikan hasil
    return {
        "raw_text": raw_text,
        "structured_data": structured_data
    }
