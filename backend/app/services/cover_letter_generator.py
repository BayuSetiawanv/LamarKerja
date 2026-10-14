import logging
from datetime import datetime
from typing import Optional, List

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

_MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
              "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

def _format_date(language: str) -> str:
    now = datetime.now()
    if language == "en":
        day = now.day
        suffix = "th" if 11 <= day % 100 <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
        return f"{now.strftime('%B')} {day}{suffix}, {now.year}"
    return f"{now.day} {_MONTHS_ID[now.month - 1]} {now.year}"


# ===== Templates per bahasa (Struktur 5 bagian) =====
LANGUAGE_TEMPLATES = {
    "id": {
        "language_instruction": "BAHASA INDONESIA yang profesional, sopan, dan jelas",
        "greeting_named": "Yth. {recipient},",
        "greeting_with_company": "Yth. Bapak/Ibu HR Manager {company},",
        "greeting_generic": "Yth. Bapak/Ibu HR Manager,",
        "closing": "Hormat saya,",
        "default_title": "Human Resources Manager",
        "paragraph_labels": [
            "PERKENALAN (tujuan surat, posisi yang dilamar, sumber lowongan, siapa Anda)",
            "PENGALAMAN & SKILL #1 (latar belakang pendidikan/organisasi/skill relevan)",
            "PENGALAMAN & SKILL #2 (pengalaman praktik/proyek/kerja yang relevan)",
            "KESIMPULAN KECOCOKAN & LAMPIRAN",
            "PENUTUP & HARAPAN"
        ],
    },
    "en": {
        "language_instruction": "PROFESSIONAL ENGLISH that is polite, clear, and straightforward",
        "greeting_named": "Dear {recipient},",
        "greeting_with_company": "Dear Mr./Ms. HR Manager of {company},",
        "greeting_generic": "Dear Mr./Ms. HR Manager,",
        "closing": "Sincerely,",
        "default_title": "Human Resources Manager",
        "paragraph_labels": [
            "INTRODUCTION (purpose of the letter, position applied, job source, who you are)",
            "EXPERIENCE & SKILLS #1 (education/organization/relevant skills)",
            "EXPERIENCE & SKILLS #2 (relevant practical/project/work experience)",
            "FIT SUMMARY & ATTACHMENTS",
            "CLOSING & HOPE"
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
    # ===== Parameter baru =====
    recipient_name: Optional[str] = None,      # contoh: "Mr. Bobi Putra Lesmana"
    recipient_title: Optional[str] = None,     # contoh: "Human Resources Manager"
    company_location: Optional[str] = None,    # contoh: "West Jakarta"
    job_source: Optional[str] = None,          # contoh: "job portal", "LinkedIn"
    attachments: Optional[List[str]] = None,   # contoh: ["Curriculum Vitae", "Transkrip Nilai"]
) -> str:
    """
    Generate cover letter dengan struktur:
    1. Informasi penerima  2. Tanggal  3. Salam pembuka
    4. Isi (perkenalan, pengalaman & skill, penutup & harapan)  5. Salam penutup
    """

    if language not in LANGUAGE_TEMPLATES:
        language = "id"
    tmpl = LANGUAGE_TEMPLATES[language]
    is_en = language == "en"

    # ===== 1. Ekstraksi identitas =====
    name_placeholder = "[Your Name]" if is_en else "[Nama Anda]"
    name = _clean_value(_find_name(cv_data, raw_text), name_placeholder)
    email = _clean_value(_find_email(cv_data, raw_text), "")
    phone = _clean_value(_find_phone(cv_data), "")
    location = _clean_value(_find_location(cv_data), "")

    # ===== 2. Ringkasan CV =====
    cv_info_text = f"{'Name' if is_en else 'Nama'}: {name}\n\n"

    # Pendidikan
    if isinstance(cv_data, dict):
        education = cv_data.get("education") or cv_data.get("pendidikan") or []
        if isinstance(education, dict):
            education = [education]
        if isinstance(education, list) and education:
            cv_info_text += f"{'Education' if is_en else 'Pendidikan'}:\n"
            for edu in education[:1]:
                if isinstance(edu, dict):
                    degree = edu.get("degree") or edu.get("major") or edu.get("jurusan") or ""
                    school = edu.get("school") or edu.get("institution") or edu.get("university") or edu.get("universitas") or ""
                    year = edu.get("year") or edu.get("end_date") or edu.get("graduation_year") or ""
                    cv_info_text += f"- {degree} - {school} {year}".rstrip() + "\n"
                elif isinstance(edu, str):
                    cv_info_text += f"- {edu}\n"
            cv_info_text += "\n"

    # Skills
    skills: list = []
    if isinstance(cv_data, dict):
        for k in ("skills", "hard_skills", "technical_skills", "core_skills", "competencies", "keahlian"):
            skills = _flat_list(cv_data.get(k))
            if skills:
                break
    if skills:
        cv_info_text += f"Top Skills: {', '.join(str(s) for s in skills[:10])}\n\n"

    # Pengalaman kerja / magang / organisasi
    if isinstance(cv_data, dict):
        experience = cv_data.get("experience") or cv_data.get("work_experience") or []
        if isinstance(experience, list) and experience:
            cv_info_text += f"{'Work Experience' if is_en else 'Pengalaman Kerja'}:\n"
            for exp in experience[:3]:
                if isinstance(exp, dict):
                    role = exp.get("title", exp.get("role", "Position" if is_en else "Posisi"))
                    comp = exp.get("company", "Company" if is_en else "Perusahaan")
                    duration = exp.get("duration") or exp.get("period") or ""
                    line = f"- {role} {'at' if is_en else 'di'} {comp}"
                    if duration:
                        line += f" ({duration})"
                    cv_info_text += line + "\n"
                    desc = exp.get("description")
                    if isinstance(desc, list):
                        desc = "; ".join(str(x) for x in desc)
                    if isinstance(desc, str) and desc:
                        cv_info_text += f"  Key focus: {desc[:200]}\n"
            cv_info_text += "\n"

        organization = cv_data.get("organizations") or cv_data.get("organization") or cv_data.get("organisasi") or []
        if isinstance(organization, list) and organization:
            cv_info_text += f"{'Organizations' if is_en else 'Organisasi'}:\n"
            for org in organization[:2]:
                if isinstance(org, dict):
                    cv_info_text += f"- {org.get('role', org.get('title', ''))} - {org.get('name', org.get('organization', ''))}\n"
                elif isinstance(org, str):
                    cv_info_text += f"- {org}\n"
            cv_info_text += "\n"

    # ===== 3. Insight ATS =====
    ats_info = ""
    if isinstance(ats_result, dict):
        matched = ats_result.get("matched_skills") or []
        strengths = ats_result.get("strengths") or ""
        if matched:
            header = "TOP MATCHED SKILLS (Use these)" if is_en else "SKILLS PALING COCOK (Gunakan ini)"
            ats_info += f"{header}: {', '.join(str(s) for s in matched[:5])}\n"
        if strengths:
            header = "KEY STRENGTH" if is_en else "KEKUATAN UTAMA"
            ats_info += f"{header}: {str(strengths)[:150]}\n"
        ats_info += "\n"

    # ===== 4. Info perusahaan, posisi, sumber, lampiran =====
    company_info = f"{'COMPANY NAME' if is_en else 'NAMA PERUSAHAAN'}: {company_name}\n" if company_name else ""
    role_info = f"{'TARGET POSITION' if is_en else 'POSISI YANG DILAMAR'}: {target_role}\n" if target_role else ""
    source_info = f"{'JOB SOURCE' if is_en else 'SUMBER LOWONGAN'}: {job_source}\n" if job_source else ""

    attach_list = [a for a in (attachments or ["Curriculum Vitae"]) if a and a.strip()]
    attach_info = f"{'ATTACHED DOCUMENTS' if is_en else 'DOKUMEN TERLAMPIR'}: {', '.join(attach_list)}\n"

    # ===== 5. System prompt: 5 paragraf sesuai struktur =====
    lang_instr = tmpl["language_instruction"]
    p = tmpl["paragraph_labels"]

    system_prompt = f"""You are an elite career coach and professional resume writer.

Your task: Write the BODY of a cover letter in {lang_instr}.

CONSTRAINTS:
1. MAXIMUM 300 WORDS TOTAL.
2. Write exactly 5 SHORT paragraphs (2-3 sentences each), separated by a blank line.
3. Do NOT copy-paste duties from the CV. Explain experience and skills in a natural, relevant way.
4. Tone: professional, polite, and warm.

REQUIRED 5-PARAGRAPH STRUCTURE:
- Paragraph 1 ({p[0]}): Express interest in the target position. Mention where the job was advertised if JOB SOURCE is provided. Briefly introduce who you are (education/status/background from CV).
- Paragraph 2 ({p[1]}): Explain education, organizational experience, or skills that are relevant to the Job Description.
- Paragraph 3 ({p[2]}): Explain the most relevant practical experience (work, internship, project) and what you learned or achieved. Use numbers if available in the CV.
- Paragraph 4 ({p[3]}): State your belief that your background prepares you to contribute to the company. Mention the ATTACHED DOCUMENTS exactly as listed.
- Paragraph 5 ({p[4]}): Thank the reader for their time and express hope for the opportunity to discuss your qualifications further.

STRICT RULES:
- DO NOT write recipient info, date, greeting, or signature (the system adds these).
- DO NOT use bullet points.
- DO NOT fabricate facts, documents, or experience that are not in the data.
- ONLY output the 5 paragraphs of the body."""

    jd_label = "JOB DESCRIPTION" if is_en else "LOWONGAN KERJA"
    candidate_label = "CANDIDATE DATA" if is_en else "DATA KANDIDAT"
    reminder = (
        "Remember: ONLY 5 short paragraphs, max 300 words, no greeting/signature."
        if is_en else
        "Ingat: HANYA 5 paragraf pendek, maksimal 300 kata, tanpa salam pembuka/penutup."
    )

    user_prompt = f"""Write the body of a professional cover letter (5 paragraphs) for the following candidate.

{candidate_label}:
{cv_info_text}
{ats_info}
{jd_label}:
{job_description}

{company_info}{role_info}{source_info}{attach_info}
{reminder}"""

    logger.info(f"📝 Mengirim request ke AI untuk generate cover letter (5 paragraf, {language})...")

    try:
        body = await ask_ai(
            prompt=user_prompt,
            system_prompt=system_prompt,
            want_json=False,
            max_tokens=1200,
        )

    # 🔥 PERBAIKAN 2: Validasi ketat. Jika kosong, coba 1x lagi sebelum fallback
    if not 
        body or not body.strip() or len(body.strip()) < 50:
            logger.warning("⚠️ AI mengembalikan body kosong/terlalu pendek. Melakukan 1x retry otomatis...")
            body = await ask_ai(
                prompt=user_prompt + "\n(PENTING: Jangan kosong, tulis cover letter terbaik yang pernah anda buat)",
                system_prompt=system_prompt,
                want_json=False,
                max_tokens=1200,
            )
    else:
        logger.info(f"✅ Body cover letter berhasil di-generate! (Panjang: {len(body)} karakter)")
        
    except Exception as e:
        logger.error(f"❌ Gagal generate cover letter: {type(e).__name__}: {e}")
        raise ValueError(f"Gagal generate cover letter: {str(e)}")

    # ===== 6. Rakit surat final sesuai struktur =====

    # (a) Informasi penerima
    recipient_lines = []
    if recipient_name and recipient_name.strip():
        recipient_lines.append(recipient_name.strip())
    recipient_lines.append((recipient_title or tmpl["default_title"]).strip())
    if company_name:
        recipient_lines.append(company_name.strip())
    if company_location and company_location.strip():
        recipient_lines.append(company_location.strip())
    recipient_block = "\n".join(recipient_lines)

    # (b) Tanggal (rata kanan dilakukan di frontend / template PDF)
    city = location.split(",")[0].strip() if location else ""
    date_line = f"{city}, {_format_date(language)}" if city else _format_date(language)

    # (c) Salam pembuka
    if recipient_name and recipient_name.strip():
        greeting = tmpl["greeting_named"].format(recipient=recipient_name.strip())
    elif company_name:
        greeting = tmpl["greeting_with_company"].format(company=company_name)
    else:
        greeting = tmpl["greeting_generic"]

    # (d) Salam penutup + nama (+ kontak)
    signature = f"{tmpl['closing']}\n\n\n{name}"
    contact_bits = [b for b in (phone, email) if b]
    if contact_bits:
        signature += "\n" + " | ".join(contact_bits)

    final_letter = (
        recipient_block
        + "\n\n"
        + date_line
        + "\n\n"
        + greeting
        + "\n\n"
        + body.strip()
        + "\n\n"
        + signature
    )

    return final_letter
