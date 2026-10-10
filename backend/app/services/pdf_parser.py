import fitz  # PyMuPDF
import logging

logger = logging.getLogger(__name__)

async def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Mengekstrak semua teks dari file PDF."""
    try:
        # Buka PDF dari memory (bytes), bukan dari file path
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        return text.strip()
    except Exception as e:
        logger.error(f"❌ Gagal mengekstrak PDF: {e}")
        raise ValueError("File yang diupload bukan PDF yang valid atau tidak bisa dibaca.")