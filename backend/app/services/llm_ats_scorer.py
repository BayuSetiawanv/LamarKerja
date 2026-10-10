import json
import re
import logging
from app.ai.ai_client import ask_ai

logger = logging.getLogger(__name__)

# Key yang sudah ditangani eksplisit — tidak disapu ulang
HANDLED_KEYS = {
    "name", "full_name", "nama", "title", "current_title", "headline", "position",
    "job_title", "location", "address", "city", "email", "phone", "contact",
    "experience", "work_experience", "professional_experience", "employment_history",
    "work_history", "education", "educations", "academic", "academic_background",
    "projects", "personal_projects", "certifications", "certificates", "licenses",
    "soft_skills", "interpersonal_skills",
}

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")


def _first(data: dict, keys: list, default=None):
    for k in keys:
        if k in data and data[k]:
            return data[k]
    return default


def _flat_list(val) -> list:
    out = []
    if isinstance(val, list):
        for item in val:
            if isinstance(item, str):
                out.append(item)
            elif isinstance(item, dict):
                if "list" in item:
                    out.extend([str(x) for x in item["list"] if isinstance(x, (str, int))])
                elif "name" in item:
                    out.append(str(item["name"]))
    elif isinstance(val, str):
        out = [x.strip() for x in val.split(",") if x.strip()]
    return out


def _to_text(val, limit: int = 400) -> str:
    if isinstance(val, list):
        text = "; ".join(str(x) for x in val)
    elif isinstance(val, str):
        text = val
    else:
        text = str(val) if val else ""
    return text[:limit]


def _clean_raw_text(raw: str, max_chars: int = 6000) -> str:
    lines = []
    prev = None
    for line in raw.splitlines():
        cleaned = line.strip().strip("|").strip()
        if not cleaned or cleaned == prev:
            continue
        lines.append(cleaned)
        prev = cleaned
    return "\n".join(lines)[:max_chars]


def _find_email(cv_data: dict, raw_text: str) -> str:
    """Lapis 1: structured_data (semua kemungkinan key).
    Lapis 2: walk JSON tree untuk cari @.
    Lapis 3: regex dari raw_text.
    Lapis 4: fallback string "(email tidak terdeteksi)"."""

    # LAPIS 1: Cek key umum
    if isinstance(cv_data, dict):
        for block in (
            cv_data,
            cv_data.get("contact"),
            cv_data.get("personal_info"),
            cv_data.get("contact_info"),
            cv_data.get("header"),
            cv_data.get("profile"),
        ):
            if isinstance(block, dict):
                for key in ("email", "e_mail", "email_address", "alamat_email"):
                    v = block.get(key)
                    if isinstance(v, str):
                        m = EMAIL_RE.search(v)
                        if m:
                            logger.info(f"📧 Email ditemukan di structured_data[{key}]: {m.group(0)}")
                            return m.group(0)

        # LAPIS 2: Walk JSON tree — cari string apa pun yang mengandung @
        def walk(node):
            if isinstance(node, dict):
                for v in node.values():
                    result = walk(v)
                    if result:
                        return result
            elif isinstance(node, list):
                for v in node:
                    result = walk(v)
                    if result:
                        return result
            elif isinstance(node, str) and "@" in node and len(node) < 200:
                m = EMAIL_RE.search(node)
                if m:
                    return m.group(0)
            return None

        found = walk(cv_data)
        if found:
            logger.info(f"📧 Email ditemukan via walk JSON: {found}")
            return found

    # LAPIS 3: Regex dari raw_text
    if raw_text:
        m = EMAIL_RE.search(raw_text)
        if m:
            logger.info(f"📧 Email ditemukan via raw_text regex: {m.group(0)}")
            return m.group(0)

    logger.warning("⚠️ Email TIDAK ditemukan di structured_data maupun raw_text")
    return "(email tidak terdeteksi)"


def _find_name(cv_data: dict, raw_text: str) -> str:
    """Lapis 1: key umum di structured_data.
    Lapis 2: heuristik baris pertama raw_text.
    Lapis 3: fallback "(nama tidak terdeteksi)"."""

    # LAPIS 1: Cek key umum
    if isinstance(cv_data, dict):
        for block in (
            cv_data,
            cv_data.get("contact"),
            cv_data.get("personal_info"),
            cv_data.get("contact_info"),
            cv_data.get("header"),
            cv_data.get("profile"),
        ):
            if isinstance(block, dict):
                for key in ("name", "full_name", "nama", "nama_lengkap", "candidate_name"):
                    v = block.get(key)
                    if isinstance(v, str) and 2 < len(v.strip()) < 80:
                        logger.info(f"👤 Nama ditemukan di structured_data[{key}]: {v.strip()}")
                        return v.strip()

    # LAPIS 2: Baris pertama raw_text berisi rangkaian kata kapital
    if raw_text:
        for line in raw_text.splitlines():
            cleaned = line.strip().strip("|").strip()
            if not cleaned or cleaned.startswith("---"):
                continue
            # Skip judul section
            first_word = cleaned.split()[0].upper() if cleaned.split() else ""
            if first_word in {"PROFILE", "SUMMARY", "WORK", "EXPERIENCE", "EDUCATION",
                              "SKILLS", "RINGKASAN", "PENGALAMAN", "PENDIDIKAN",
                              "KEAHLIAN", "PROYEK", "SERTIFIKASI"}:
                continue
            # Ambil max 5 kata dari awal baris
            m = re.match(r"^([A-Z][A-Za-z.'\-]*(?:\s+[A-Z]?[A-Za-z.'\-]*){0,4})", cleaned)
            if m and 3 <= len(m.group(1)) <= 60:
                logger.info(f"👤 Nama ditemukan via raw_text baris 1: {m.group(1).strip()}")
                return m.group(1).strip()
            break

    logger.warning("⚠️ Nama TIDAK ditemukan di structured_data maupun raw_text")
    return "(nama tidak terdeteksi)"


def _summarize_cv(cv_data: dict, raw_text: str = "") -> str:
    """Summarizer SCHEMA-AGNOSTIC dengan logging diagnostik."""
    
    # 🔍 DIAGNOSTIK: Log apa yang kita terima
    logger.info(f"🔍 _summarize_cv dipanggil — cv_data type: {type(cv_data).__name__}, "
                f"raw_text length: {len(raw_text) if raw_text else 0}")
    
    summary_lines = []

    if isinstance(cv_data, dict):
        contact = cv_data.get("contact") if isinstance(cv_data.get("contact"), dict) else {}

        # 🔥 PANGGIL FUNGSI ROBUST dengan raw_text
        name = _find_name(cv_data, raw_text)
        title = _first(cv_data, ["title", "current_title", "headline", "position", "job_title"])
        location = _first(cv_data, ["location", "address", "city"]) or contact.get("location", contact.get("address"))
        email = _find_email(cv_data, raw_text)
        phone = contact.get("phone") or cv_data.get("phone")

        summary_lines.append(f"Nama: {name}")
        if title:
            summary_lines.append(f"Posisi: {title}")
        if location:
            summary_lines.append(f"Lokasi: {location}")
        summary_lines.append(f"Email: {email}")
        if phone:
            summary_lines.append(f"Telepon: {phone}")

        # Skills
        tech_skills = _flat_list(_first(cv_data, [
            "skills", "hard_skills", "technical_skills", "core_skills", "competencies"
        ]))
        soft_skills = _flat_list(_first(cv_data, ["soft_skills", "interpersonal_skills"]))
        if tech_skills:
            summary_lines.append(f"Skills teknis: {', '.join(tech_skills)}")
        if soft_skills:
            summary_lines.append(f"Soft skills: {', '.join(soft_skills)}")

        # Experience
        exp = _first(cv_data, [
            "experience", "work_experience", "professional_experience",
            "employment_history", "work_history"
        ], [])
        if isinstance(exp, list) and exp:
            summary_lines.append("Pengalaman kerja:")
            for e in exp[:5]:
                if isinstance(e, dict):
                    role = e.get("title", e.get("role", e.get("position", "?")))
                    company = e.get("company", e.get("organization", e.get("employer", "?")))
                    duration = e.get("duration", e.get("period", e.get("dates", "?")))
                    desc = _to_text(e.get("description", e.get("responsibilities", "")), 400)
                    summary_lines.append(f"- {role} di {company} ({duration}): {desc}")
                elif isinstance(e, str):
                    summary_lines.append(f"- {e[:300]}")

        # Education
        edu = _first(cv_data, ["education", "educations", "academic", "academic_background"], [])
        if isinstance(edu, list) and edu:
            summary_lines.append("Pendidikan:")
            for ed in edu[:3]:
                if isinstance(ed, dict):
                    degree = ed.get("degree", ed.get("title", ed.get("major", "?")))
                    inst = ed.get("institution", ed.get("school", ed.get("university", "?")))
                    year = ed.get("year", ed.get("graduation_year", ""))
                    summary_lines.append(f"- {degree} - {inst} {year}")
                elif isinstance(ed, str):
                    summary_lines.append(f"- {ed[:150]}")

        # Sertifikasi
        certs = _flat_list(_first(cv_data, ["certifications", "certificates", "licenses"]))
        if certs:
            summary_lines.append(f"Sertifikasi: {', '.join(certs[:8])}")

        # Proyek
        projects = _first(cv_data, ["projects", "personal_projects"], [])
        if isinstance(projects, list) and projects:
            summary_lines.append("Proyek:")
            for p in projects[:4]:
                if isinstance(p, dict):
                    pname = p.get("name", p.get("title", "?"))
                    pdesc = _to_text(p.get("description", ""), 200)
                    ptech = _flat_list(p.get("tech", p.get("technologies", [])))
                    line = f"- {pname}: {pdesc}"
                    if ptech:
                        line += f" [Teknologi: {', '.join(ptech)}]"
                    summary_lines.append(line)
                elif isinstance(p, str):
                    summary_lines.append(f"- {p[:200]}")

        # Sapu generik
        for key, value in cv_data.items():
            if key.lower() in HANDLED_KEYS:
                continue
            flat = _flat_list(value)
            if flat:
                summary_lines.append(f"{key}: {', '.join(flat)}")
            elif isinstance(value, dict):
                sub_parts = []
                for sk, sv in value.items():
                    f = _flat_list(sv)
                    if f:
                        sub_parts.append(f"{sk}: {', '.join(f)}")
                    elif isinstance(sv, str) and len(sv) < 200:
                        sub_parts.append(f"{sk}: {sv}")
                if sub_parts:
                    summary_lines.append(f"{key}: " + " | ".join(sub_parts))
            elif isinstance(value, str) and 0 < len(value) < 300:
                summary_lines.append(f"{key}: {value}")

    summary = "\n".join(summary_lines)

    # Selalu sertakan raw_text sebagai sumber kebenaran
    if raw_text:
        cleaned = _clean_raw_text(raw_text)
        summary += (
            "\n\n---\n"
            "TEKS LENGKAP CV (sumber utama — gunakan ini untuk memverifikasi setiap skill):\n"
            f"{cleaned}"
        )

    return summary


async def evaluate_cv_with_llm(cv_data: dict, job_description: str, raw_text: str = "") -> dict:
    """Evaluasi CV dengan AI — output 100% Bahasa Indonesia."""
    system_prompt = """Anda adalah Senior Technical Recruiter dengan pengalaman 15+ tahun di perusahaan teknologi top Indonesia (Tokopedia, Gojek, Traveloka, Bukalapak).

Anda TIDAK HANYA mencocokkan kata kunci. Anda MENGEVALUASI kandidat secara KRITIS dan MENDALAM seperti seorang hiring manager sungguhan.

ATURAN KETAT:
1. Sebelum menyatakan sebuah skill TIDAK ADA di CV, Anda WAJIB mencari skill tersebut (atau sinonimnya) di SELURUH teks CV, termasuk bagian KEAHLIAN TEKNIS / SKILLS / proyek / sertifikasi. Jika skill muncul di mana pun, ia MASUK matched_skills, BUKAN missing_skills.
2. missing_skills HANYA berisi skill yang diminta lowongan dan benar-benar tidak ditemukan di mana pun dalam CV.
3. Kutip bukti konkret dari CV (angka, metrik, nama proyek) untuk mendukung setiap klaim.
4. Jujurlah tentang kekurangan — ini membantu kandidat berkembang.
5. SEMUA TEKS dalam output WAJIB ditulis dalam BAHASA INDONESIA yang baik, natural, dan profesional.
6. WAJIB mengembalikan HANYA JSON valid tanpa markdown."""

    cv_summary = _summarize_cv(cv_data, raw_text)
    logger.info(f"📋 Ringkasan CV yang dikirim ke AI ({len(cv_summary)} chars)")
    # Log 5 baris pertama untuk verifikasi cepat
    first_lines = cv_summary.split("\n")[:8]
    logger.info(f"📋 Preview ringkasan:\n" + "\n".join(first_lines))

    user_prompt = f"""Lakukan evaluasi MENDALAM dan KRITIS terhadap kandidat ini untuk lowongan yang diberikan.

═══════════════════════════════════════
DATA CV KANDIDAT
═══════════════════════════════════════
{cv_summary}

═══════════════════════════════════════
LOWONGAN KERJA (TARGET)
═══════════════════════════════════════
{job_description}

═══════════════════════════════════════
PROSES BERPIKIR WAJIB
═══════════════════════════════════════

LANGKAH 1 — Ekstrak semua skill, teknologi, dan kualifikasi yang diminta lowongan.
LANGKAH 2 — Untuk SETIAP skill yang diekstrak, cari di SELURUH teks CV (bagian keahlian teknis, pengalaman kerja, proyek, sertifikasi, pendidikan).
LANGKAH 3 — Skill yang ditemukan → matched_skills. Skill yang TIDAK ditemukan → missing_skills.
LANGKAH 4 — Nilai 5 dimensi (skor 0-100):
  - Kedalaman Teknis: Seberapa dalam pemahaman teknologi?
  - Dampak Bisnis: Apakah ada hasil terukur?
  - Relevansi Pengalaman: Seberapa cocok dengan lowongan?
  - Jejak Karir: Progresi dan konsistensi?
  - Keberagaman Portofolio: Range teknologi?
LANGKAH 5 — overall_score = rata-rata tertimbang: Kedalaman 25%, Dampak 25%, Relevansi 25%, Jejak 15%, Keberagaman 10%.

FORMAT OUTPUT JSON (key dalam bahasa Inggris, value dalam Bahasa Indonesia):
{{
  "overall_score": [integer 0-100],
  "detailed_breakdown": {{
    "technical_depth": {{"score": [0-100], "justification": "[1-2 kalimat dalam Bahasa Indonesia dengan bukti konkret]"}},
    "business_impact": {{"score": [0-100], "justification": "[1-2 kalimat dengan metrik terukur]"}},
    "experience_relevance": {{"score": [0-100], "justification": "[1-2 kalimat]"}},
    "career_trajectory": {{"score": [0-100], "justification": "[1-2 kalimat]"}},
    "portfolio_diversity": {{"score": [0-100], "justification": "[1-2 kalimat]"}}
  }},
  "matched_skills": ["..."],
  "missing_skills": ["..."],
  "strengths": "[2-3 kalimat dengan bukti]",
  "weaknesses": "[2-3 kalimat jujur]",
  "evidence_quotes": ["[kutipan]", "..."],
  "red_flags": ["[jika ada]"],
  "interview_questions": ["[pertanyaan]", "..."],
  "competitive_positioning": "[top 10% / di atas rata-rata / rata-rata / di bawah rata-rata + alasan]",
  "actionable_suggestions": ["[saran 1]", "[saran 2]", "[saran 3]"]
}}

PENTING:
- Gunakan Bahasa Indonesia untuk semua narasi.
- Pertahankan nama skill teknis dalam bahasa aslinya.
- Jawaban RINGKAS tapi BERMAKNA agar JSON tidak terpotong.
"""

    logger.info("🧠 Mengirim CV dan JD ke AI untuk evaluasi MENDALAM...")

    max_json_retries = 2
    last_raw_content = ""

    for json_attempt in range(max_json_retries + 1):
        try:
            raw_content = await ask_ai(user_prompt, system_prompt, want_json=True)
            last_raw_content = raw_content

            if raw_content.startswith("```json"):
                raw_content = raw_content[7:]
            if raw_content.startswith("```"):
                raw_content = raw_content[3:]
            if raw_content.endswith("```"):
                raw_content = raw_content[:-3]

            parsed_result = json.loads(raw_content.strip())
            logger.info(f"✅ AI berhasil memberikan evaluasi ATS mendalam! (attempt {json_attempt + 1})")
            return parsed_result

        except json.JSONDecodeError as e:
            logger.error(f"❌ JSON tidak valid (attempt {json_attempt + 1}/{max_json_retries + 1}): {e}")
            logger.error(f"📄 Akhir response: ...{last_raw_content[-300:]}")
            if json_attempt < max_json_retries:
                logger.info("🔄 Retry dengan instruksi jawaban lebih ringkas...")
                user_prompt += "\n\nPENTING: Jawab LEBIH RINGKAS. justification maksimal 1 kalimat, evidence_quotes maksimal 3, agar JSON tidak terpotong."
                continue
            raise ValueError(f"AI gagal menghasilkan JSON valid setelah {max_json_retries + 1} percobaan.")

        except Exception as e:
            logger.error(f"❌ Gagal evaluasi ATS: {type(e).__name__}: {e}")
            raise ValueError(f"Gagal menganalisis dengan AI: {str(e)}")