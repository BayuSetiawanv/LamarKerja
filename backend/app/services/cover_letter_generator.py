import logging
from typing import Optional

from app.ai.ai_client import ask_ai
from app.services.llm_ats_scorer import _find_email, _find_name, _flat_list

logger = logging.getLogger(__name__)


# ===== Helper kontak tambahan =====
def _find_phone(cv_data: dict) -> str:
    if isinstance(cv_data, dict):
        for block in (cv_data, cv_data.get("contact"), cv_data.get("personal_info"), cv_data.get("contact_info"), cv_data.get("header")):
            if isinstance(block, dict):
                for key in ("phone", "phone_number", "telepon", "no_hp", "nomor_telepon", "mobile"):
                    v = block.get(key)
                    if isinstance(v, str) and v.strip():
                        return v.strip()
    return ""

def _find_location(cv_data: dict) -> str:
    if isinstance(cv_data, dict):
        for block in (cv_data, cv_data.get("contact"), cv_data.get("personal_info"), cv_data.get("contact_info")):
            if isinstance(block, dict):
                for key in ("location", "address", "city", "lokasi", "alamat"):
                    v = block.get(key)
                    if isinstance(v, str) and v.strip():
                        return v.strip()
    return ""

def _clean_value(v: str, placeholder: str) -> str:
    v = (v or "").strip()
    if not v or v == "-" or v.startswith("("):
        return placeholder
    return v


# ===== Templates per bahasa (Struktur 4 Paragraf Padat) =====
LANGUAGE_TEMPLATES = {
    "id": {
        "language_instruction": "BAHASA INDONESIA yang sangat profesional, persuasif, dan langsung pada inti (tanpa basa-basi)",
        "greeting_with_company": "Yth. Hiring Manager {company},",
        "greeting_generic": "Yth. Hiring Manager,",
        "closing": "Hormat saya,\n\n{name}",
        "paragraph_labels": [
            "PEMBUKA KUAT (Posisi & Hook)",
            "PENCAPAIAN UTAMA #1 (Relevan dengan JD)",
            "PENCAPAIAN UTAMA #2 & KECOCOKAN PERUSAHAAN",
            "PENUTUP & CALL TO ACTION"
        ],
    },
    "en": {
        "language_instruction": "PROFESSIONAL ENGLISH that is highly concise, persuasive, and direct (no fluff)",
        "greeting_with_company": "Dear Hiring Manager at {company},",
        "greeting_generic": "Dear Hiring Manager,",
        "closing": "Sincerely,\n\n{name}",
        "paragraph_labels": [
            "STRONG OPENING (Position & Hook)",
            "CORE ACHIEVEMENT #1 (Relevant to JD)",
            "CORE ACHIEVEMENT #2 & COMPANY FIT",
            "CLOSING & CALL TO ACTION"
        ],
    },
}


async def generate_cover_letter(
    cv_data: dict,
    job_description: str,
    company_name: Optional[str] = None,
    target_role: Optional[str] = None,
    raw_text: str = "",
    ats_result: Optional[dict] = None,
    language: str = "id",
) -> str:
    """
    Generate cover letter 4 paragraf yang SANGAT PADAT. 
    Hanya berisi poin-poin penting, maksimal 250 kata.
    """

    if language not in LANGUAGE_TEMPLATES:
        language = "id"
    tmpl = LANGUAGE_TEMPLATES[language]

    # ===== 1. Ekstraksi identitas =====
    name_placeholder = "[Your Name]" if language == "en" else "[Nama Anda]"
    name = _clean_value(_find_name(cv_data, raw_text), name_placeholder)
    email = _clean_value(_find_email(cv_data, raw_text), "")
    phone = _clean_value(_find_phone(cv_data), "")
    location = _clean_value(_find_location(cv_data), "")

    # ===== 2. Susun ringkasan CV (Hanya ambil data terpenting agar AI fokus) =====
    cv_info_text = f"{'Name' if language == 'en' else 'Nama'}: {name}\n"
    if email: cv_info_text += f"Email: {email}\n"
    if phone: cv_info_text += f"{'Phone' if language == 'en' else 'Telepon'}: {phone}\n"
    cv_info_text += "\n"

    skills: list = []
    if isinstance(cv_data, dict):
        for k in ("skills", "hard_skills", "technical_skills", "core_skills", "competencies", "keahlian"):
            skills = _flat_list(cv_data.get(k))
            if skills: break
    if skills:
        # 🔥 Hanya kirim 10 skill teratas agar AI tidak bingung
        cv_info_text += f"Top Skills: {', '.join(str(s) for s in skills[:10])}\n\n"

    if isinstance(cv_data, dict):
        experience = cv_data.get("experience") or cv_data.get("work_experience") or []
        if isinstance(experience, list) and experience:
            exp_label = "Work Experience" if language == "en" else "Pengalaman Kerja"
            cv_info_text += f"{exp_label}:\n"
            # 🔥 Hanya ambil 2 pengalaman terbaru
            for exp in experience[:2]: 
                if isinstance(exp, dict):
                    if language == "en":
                        line = f"- {exp.get('title', exp.get('role', 'Position'))} at {exp.get('company', 'Company')}"
                    else:
                        line = f"- {exp.get('title', exp.get('role', 'Posisi'))} di {exp.get('company', 'Perusahaan')}"
                    cv_info_text += line + "\n"
                    desc = exp.get("description")
                    if isinstance(desc, list): desc = "; ".join(str(x) for x in desc)
                    # 🔥 Potong deskripsi, hanya ambil intinya
                    if isinstance(desc, str) and desc:
                        cv_info_text += f"  Key focus: {desc[:150]}\n" 
            cv_info_text += "\n"

    # ===== 3. Suntikkan insight ATS (Hanya yang paling kuat) =====
    ats_info = ""
    if isinstance(ats_result, dict):
        matched = ats_result.get("matched_skills") or []
        strengths = ats_result.get("strengths") or ""
        if matched:
            header = "TOP MATCHED SKILLS (Use these)" if language == "en" else "SKILLS PALING COCOK (Gunakan ini)"
            ats_info += f"{header}: {', '.join(str(s) for s in matched[:3])}\n" # 🔥 Hanya top 3
        if strengths:
            header = "KEY STRENGTH" if language == "en" else "KEKUATAN UTAMA"
            ats_info += f"{header}: {strengths[:100]}\n"
        ats_info += "\n"

    # ===== 4. Info perusahaan & posisi =====
    company_label = "COMPANY NAME" if language == "en" else "NAMA PERUSAHAAN"
    role_label = "TARGET POSITION" if language == "en" else "POSISI YANG DILAMAR"
    company_info = f"{company_label}: {company_name}\n" if company_name else ""
    role_info = f"{role_label}: {target_role}\n" if target_role else ""

    # ===== 5. 🔥 SYSTEM PROMPT: SANGAT KETAT (4 Paragraf, Poin Penting Saja) =====
    lang_instr = tmpl["language_instruction"]
    p = tmpl["paragraph_labels"]

    system_prompt = f"""You are an elite career coach and professional resume writer.

Your task: Write the BODY of a cover letter in {lang_instr}.

CRITICAL CONSTRAINTS:
1. MAXIMUM 250 WORDS TOTAL. Keep it extremely concise and impactful.
2. Write in exactly 4 SHORT paragraphs (2-3 sentences per paragraph).
3. DO NOT copy-paste duties from the CV. Tell a brief STORY of IMPACT and ACHIEVEMENT.
4. Use a professional yet warm and personal tone.

REQUIRED 4-PARAGRAPH STRUCTURE:
- Paragraph 1 ({p[0]}): State the position applied for. Add 1 powerful sentence on WHY you are the perfect fit. No clichés like "I am writing to apply".
- Paragraph 2 ({p[1]}): Highlight ONLY the single most relevant achievement/skill from the CV that matches the Job Description. Use numbers/metrics if possible.
- Paragraph 3 ({p[2]}): Highlight ONE more relevant skill/achievement and connect it directly to how you can solve the company's needs (inferred from JD).
- Paragraph 4 ({p[3]}): Reiterate enthusiasm briefly and politely request an interview.

STRICT RULES:
- DO NOT write header, opening greeting, or signature (the system adds these).
- DO NOT use bullet points. Write in standard paragraph format.
- DO NOT fabricate facts.
- ONLY output the 4 paragraphs of the body."""

    jd_label = "JOB DESCRIPTION" if language == "en" else "LOWONGAN KERJA"
    candidate_label = "CANDIDATE DATA" if language == "en" else "DATA KANDIDAT"
    reminder = "Remember: ONLY 4 short paragraphs. MAX 250 words. Focus on IMPACT, not duties." if language == "en" else "Ingat: HANYA 4 paragraf pendek. MAKSIMAL 250 kata. Fokus pada DAMPAK/PENCAPAIAN, bukan daftar tugas."

    user_prompt = f"""Write the body of a highly concise and professional cover letter (4 paragraphs) for the following candidate.

{candidate_label}:
{cv_info_text}
{ats_info}
{jd_label}:
{job_description}

{company_info}{role_info}
{reminder}"""

    logger.info(f"📝 Mengirim request ke AI untuk generate cover letter padat (4 paragraf, {language})...")

    try:
        # 🔥 max_tokens=600 membatasi AI secara fisik agar tidak bertele-tele (~400-450 kata max, biasanya stop di 250 kata dengan prompt ini)
        body = await ask_ai(
            prompt=user_prompt,
            system_prompt=system_prompt,
            want_json=False,
            max_tokens=600, 
        )
        logger.info(f"✅ Body cover letter ({language}) berhasil di-generate!")
    except Exception as e:
        logger.error(f"❌ Gagal generate cover letter: {type(e).__name__}: {e}")
        raise ValueError(f"Gagal generate cover letter: {str(e)}")

    # ===== 6. Rakit surat final =====
    header_lines = [name]
    contact_bits = [b for b in (phone, email, location) if b]
    if contact_bits:
        header_lines.append(" | ".join(contact_bits))

    greeting = (
        tmpl["greeting_with_company"].format(company=company_name)
        if company_name
        else tmpl["greeting_generic"]
    )
    closing = tmpl["closing"].format(name=name)

    final_letter = (
        "\n".join(header_lines)
        + "\n\n"
        + greeting
        + "\n\n"
        + body.strip()
        + "\n\n"
        + closing
    )

    return final_letter
