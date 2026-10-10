import json
from pathlib import Path

# Menentukan path folder data (naik 3 level dari scripts -> backend -> root -> data)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

print(f"📂 Menulis file JSON ke: {DATA_DIR}\n")

# Struktur data dummy yang VALID secara JSON. 
# Nanti Anda bisa edit file aslinya di VSCode untuk memasukkan data lengkap yang saya berikan sebelumnya.
dummy_data = {
    "skills_database.json": {
        "version": "1.0.0", "categories": [
            {"category_id": "it", "category_name": "IT", "skills": [
                {"skill_id": "py", "name": "Python", "aliases": ["python3", "py"], "demand": "very_high"}
            ]}
        ]
    },
    "ats_rules.json": {
        "version": "1.0.0", "rules": [
            {"rule_id": "1", "rule": "No tables or columns", "severity": "critical", "fix": "Gunakan satu kolom."}
        ]
    },
    "action_verbs.json": {
        "version": "1.0.0", "categories": [
            {"category": "leadership", "verbs": ["led", "managed", "directed"]}
        ]
    },
    "departments.json": {
        "version": "1.0.0", "departments": [
            {"dept_id": "it", "name": "Information Technology"}
        ]
    },
    "prompt_templates.json": {
        "version": "1.0.0", "prompts": {
            "cv_extraction": {"system": "Extract CV to JSON", "user": "{cv_text}", "response_format": "json_object"}
        }
    },
    "scoring_criteria.json": {
        "version": "1.0.0", "components": [
            {"component_id": "skills", "weight": 40}, {"component_id": "experience", "weight": 25}
        ]
    },
    "experience_levels.json": {
        "version": "1.0.0", "levels": [
            {"level_id": "entry", "min_years": 0, "max_years": 1}
        ]
    },
    "job_title_mappings.json": {
        "version": "1.0.0", "mappings": [
            {"canonical_title": "Software Engineer", "aliases": ["SWE", "Programmer"]}
        ]
    },
    "edge_cases.json": {
        "version": "1.0.0", "edge_cases": [
            {"case_id": "career_gap", "name": "Career Gap", "handling": "Do not penalize"}
        ]
    },
    "document_templates.json": {
        "version": "1.0.0", "cv_templates": [
            {"template_id": "ats_standard", "name": "ATS Standard Single Column"}
        ]
    }
}

# Loop untuk menulis semua file
for filename, content in dummy_data.items():
    filepath = DATA_DIR / filename
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(content, f, indent=2, ensure_ascii=False)
    print(f"✅ Berhasil membuat: {filename}")

print("\n🎉 Semua file JSON berhasil di-generate!")
print("💡 Silakan buka folder 'data/' di VSCode dan edit file-filenya dengan data asli yang lebih lengkap.")