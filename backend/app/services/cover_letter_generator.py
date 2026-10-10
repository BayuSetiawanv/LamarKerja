import logging
from typing import Optional

from app.ai.ai_client import ask_ai
from app.services.llm_ats_scorer import _find_email, _find_name, _flat_list

logger = logging.getLogger(__name__)


# ===== Helper kontak tambahan (telepon & lokasi) =====
def _find_phone(cv_data: dict) -> str:
    if isinstance(cv_data, dict):
        for block in (
            cv_data,
            cv_data.get("contact"),
            cv_data.get("personal_info"),
            cv_data.get("contact_info"),
            cv_data.get("header"),
        ):
            if isinstance(block, dict):
                for key in ("phone", "phone_number", "telepon", "no_hp", "nomor_telepon", "mobile"):
                    v = block.get(key)
                    if isinstance(v, str) and v.strip():
                        return v.strip()
    return ""


def _find_location(cv_data: dict) -> str:
    if isinstance(cv_data, dict):
        for block in (
            cv_data,
            cv_data.get("contact"),
            cv_data.get("personal_info"),
            cv_data.get("contact_info"),
        ):
            if isinstance(block, dict):
                for key in ("location", "address", "city", "lokasi", "alamat"):
                    v = block.get(key)
                    if isinstance(v, str) and v.strip():
                        return v.strip()
    return ""


def _clean_value(v: str, placeholder: str) -> str:
    """Kembalikan placeholder jika nilai kosong atau pesan 'tidak terdeteksi'."""
    v = (v or "").strip()
    if not v or v == "-" or v.startswith("("):
        return placeholder
    return v


# ===== 🔥 BARU: Templates per bahasa =====
LANGUAGE_TEMPLATES = {
    "id": {
        "language_instruction": "BAHASA INDONESIA yang formal, hangat, dan persuasif",
        "greeting_with_company": "Yth. Hiring Manager {company},",
        "greeting_generic": "Yth. Hiring Manager,",
        "closing": "Hormat saya,\n\n{name}",
        "paragraph_labels": [
            "PENDAHULUAN",
            "SKILLS & KUALIFIKASI",
            "RISET PERUSAHAAN",
            "VALUE PROPOSITION",
            "PENUTUP",
        ],
    },
    "en": {
        "language_instruction": "PROFESSIONAL ENGLISH (formal yet warm and persuasive)",
        "greeting_with_company": "Dear Hiring Manager at {company},",
        "greeting_generic": "Dear Hiring Manager,",
        "closing": "Sincerely,\n\n{name}",
        "paragraph_labels": [
            "INTRODUCTION",
            "SKILLS & QUALIFICATIONS",
            "COMPANY RESEARCH",
            "VALUE PROPOSITION",
            "CLOSING",
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
    language: str = "id",   # ← 🔥 BARU: parameter bahasa
) -> str:
    """
    Generate cover letter profesional berstruktur 5 paragraf,
    tersedia dalam Bahasa Indonesia (id) atau English (en).
    """

    # Validasi bahasa — fallback ke Indonesia jika tidak dikenali
    if language not in LANGUAGE_TEMPLATES:
        language = "id"
    tmpl = LANGUAGE_TEMPLATES[language]

    # ===== 1. Ekstraksi identitas dengan helper robust =====
    name_placeholder = "[Your Name]" if language == "en" else "[Nama Anda]"
    name = _clean_value(_find_name(cv_data, raw_text), name_placeholder)
    email = _clean_value(_find_email(cv_data, raw_text), "")
    phone = _clean_value(_find_phone(cv_data), "")
    location = _clean_value(_find_location(cv_data), "")

    # ===== 2. Susun ringkasan CV untuk AI (label menyesuaikan bahasa) =====
    cv_info_text = f"{'Name' if language == 'en' else 'Nama'}: {name}\n"
    if email:
        cv_info_text += f"Email: {email}\n"
    if phone:
        cv_info_text += f"{'Phone' if language == 'en' else 'Telepon'}: {phone}\n"
    if location:
        cv_info_text += f"{'Location' if language == 'en' else 'Lokasi'}: {location}\n"
    cv_info_text += "\n"

    skills: list = []
    if isinstance(cv_data, dict):
        for k in ("skills", "hard_skills", "technical_skills", "core_skills", "competencies", "keahlian"):
            skills = _flat_list(cv_data.get(k))
            if skills:
                break
    if skills:
        cv_info_text += f"Skills: {', '.join(str(s) for s in skills[:20])}\n\n"

    if isinstance(cv_data, dict):
        experience = cv_data.get("experience") or cv_data.get("work_experience") or []
        if isinstance(experience, list) and experience:
            exp_label = "Work Experience" if language == "en" else "Pengalaman Kerja"
            cv_info_text += f"{exp_label}:\n"
            for exp in experience[:3]:
                if isinstance(exp, dict):
                    if language == "en":
                        line = f"- {exp.get('title', exp.get('role', 'Position'))} at {exp.get('company', 'Company')}"
                    else:
                        line = f"- {exp.get('title', exp.get('role', 'Posisi'))} di {exp.get('company', 'Perusahaan')}"
                    if exp.get("duration"):
                        line += f" ({exp.get('duration')})"
                    cv_info_text += line + "\n"
                    desc = exp.get("description")
                    if isinstance(desc, list):
                        desc = "; ".join(str(x) for x in desc)
                    if isinstance(desc, str) and desc:
                        cv_info_text += f"  {desc[:250]}\n"
                elif isinstance(exp, str):
                    cv_info_text += f"- {exp[:250]}\n"
            cv_info_text += "\n"

        education = cv_data.get("education") or cv_data.get("educations") or []
        if isinstance(education, list) and education:
            edu_label = "Education" if language == "en" else "Pendidikan"
            cv_info_text += f"{edu_label}:\n"
            for edu in education[:2]:
                if isinstance(edu, dict):
                    cv_info_text += f"- {edu.get('degree', edu.get('major', 'Degree'))} - {edu.get('institution', edu.get('university', 'Institution'))}\n"
                elif isinstance(edu, str):
                    cv_info_text += f"- {edu[:150]}\n"
            cv_info_text += "\n"

    # ===== 3. Suntikkan insight dari hasil ATS (jika CV sudah di-score) =====
    ats_info = ""
    if isinstance(ats_result, dict):
        matched = ats_result.get("matched_skills") or []
        strengths = ats_result.get("strengths") or ""
        quotes = ats_result.get("evidence_quotes") or []
        if matched:
            header = "MATCHED SKILLS (prioritize in paragraph 2)" if language == "en" else "SKILLS YANG TERBUKTI COCOK DENGAN LOWONGAN (prioritaskan di paragraf 2)"
            ats_info += f"{header}: {', '.join(str(s) for s in matched[:12])}\n"
        if strengths:
            header = "KEY STRENGTHS" if language == "en" else "KEKUATAN UTAMA KANDIDAT"
            ats_info += f"{header}: {strengths}\n"
        if quotes:
            header = "STRONGEST ACHIEVEMENTS FROM CV (use as evidence in paragraphs 2 & 4)" if language == "en" else "PENCAPAIAN TERKUAT DARI CV (gunakan sebagai bukti di paragraf 2 & 4)"
            ats_info += f"{header}:\n"
            ats_info += "\n".join(f"- {q}" for q in quotes[:3]) + "\n"
        ats_info += "\n"

    # ===== 4. Info perusahaan & posisi (label menyesuaikan bahasa) =====
    company_label = "COMPANY NAME" if language == "en" else "NAMA PERUSAHAAN"
    role_label = "TARGET POSITION" if language == "en" else "POSISI YANG DILAMAR"
    company_info = f"{company_label}: {company_name}\n" if company_name else ""
    role_info = f"{role_label}: {target_role}\n" if target_role else ""

    # ===== 5. 🔥 Prompt: system prompt adaptif per bahasa =====
    lang_instr = tmpl["language_instruction"]
    paragraph_labels = tmpl["paragraph_labels"]

    system_prompt = f"""You are a professional career coach and experienced cover letter writer with 10+ years of experience.

Your task: write the BODY of a cover letter in {lang_instr}.

REQUIRED STRUCTURE — exactly 5 paragraphs, each 3-5 sentences, no bullet points, no markdown:
1. {paragraph_labels[0]}: position applied for, company, source (optional), main reason for interest.
2. {paragraph_labels[1]}: highlight MOST RELEVANT skills and experience, include measurable achievements (numbers/metrics) from candidate data.
3. {paragraph_labels[2]}: demonstrate understanding of the company (industry, products, values, focus areas) inferred from the job description, then connect to the candidate.
4. {paragraph_labels[3]}: what differentiates the candidate and how that uniqueness addresses company needs.
5. {paragraph_labels[4]}: enthusiasm, willingness to interview, and gratitude.

STRICT RULES:
- DO NOT write header (name/contact), opening greeting, or signature — the system adds these automatically.
- DO NOT use placeholder brackets like [Company Name]; use the actual name provided, or a general phrase if unknown.
- DO NOT fabricate facts not present in the candidate data.
- ONLY output the 5 paragraphs of the body, no titles, no paragraph numbers.
- The ENTIRE output must be in the target language — do not mix languages."""

    jd_label = "JOB DESCRIPTION" if language == "en" else "LOWONGAN KERJA"
    candidate_label = "CANDIDATE DATA" if language == "en" else "DATA KANDIDAT"
    reminder = "Remember: only 5-paragraph body — no header, no opening greeting, no signature." if language == "en" else "Ingat: hanya body 5 paragraf — tanpa header, tanpa salam pembuka, tanpa tanda tangan."

    user_prompt = f"""Write the body of a cover letter (5 paragraphs) for the following candidate.

{candidate_label}:
{cv_info_text}
{ats_info}
{jd_label}:
{job_description}

{company_info}{role_info}
{reminder}"""

    logger.info(f"📝 Mengirim request ke AI untuk generate cover letter ({language})...")

    try:
        body = await ask_ai(
            prompt=user_prompt,
            system_prompt=system_prompt,
            want_json=False,
        )
        logger.info(f"✅ Body cover letter ({language}) berhasil di-generate!")
    except Exception as e:
        logger.error(f"❌ Gagal generate cover letter: {type(e).__name__}: {e}")
        raise ValueError(f"Gagal generate cover letter: {str(e)}")

    # ===== 6. 🔥 Rakit surat: header + salam + body + tanda tangan (salam & penutup adaptif) =====
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