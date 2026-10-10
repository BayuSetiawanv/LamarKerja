import logging
from app.core.data_loader import data_store
from app.services.pdf_parser import extract_text_from_pdf
from app.ai.ollama_client import ask_ollama

logger = logging.getLogger(__name__)

async def analyze_cv(file_bytes: bytes) -> dict:
    """Pipeline lengkap: PDF -> Text -> AI -> Structured JSON."""
    
    # 1. Ekstrak teks dari PDF
    raw_text = await extract_text_from_pdf(file_bytes)
    if not raw_text:
        raise ValueError("PDF kosong atau tidak mengandung teks yang bisa dibaca.")

    # 2. Ambil Prompt Template dari memori (DataLoader)
    prompts = data_store.get("prompt_templates", {}).get("prompts", {})
    cv_prompt = prompts.get("cv_extraction", {})
    
    system_prompt = cv_prompt.get("system", "Anda adalah sistem ATS ahli.")
    user_prompt_template = cv_prompt.get("user", "Ekstrak CV ini: {cv_text}")
    
    # 3. Masukkan teks CV ke dalam prompt
    final_user_prompt = user_prompt_template.replace("{cv_text}", raw_text)

    logger.info("🧠 Mengirim CV ke AI (Ollama) untuk dianalisis...")
    
    # 4. Panggil Ollama
    structured_data = await ask_ollama(
        prompt=final_user_prompt, 
        system_prompt=system_prompt
    )

    # 5. Kembalikan hasil (Teks mentah + Data terstruktur)
    return {
        "raw_text": raw_text,
        "structured_data": structured_data
    }