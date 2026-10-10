import re
import logging
from app.core.data_loader import data_store

logger = logging.getLogger(__name__)

def calculate_ats_score(cv_data: dict, job_description: str) -> dict:
    """
    Menghitung skor ATS berdasarkan kecocokan keywords dan skills.
    """
    # 1. Ambil data referensi dari memori (Singleton DataLoader)
    criteria = data_store.get("scoring_criteria", {})
    weights = criteria.get("weights", {
        "skills_match": 0.40,
        "experience_relevance": 0.25,
        "keywords_match": 0.20,
        "education_match": 0.10,
        "formatting_quality": 0.05
    })
    
    # 2. Ekstrak skills dari CV (hasil AI)
    cv_skills = set()
    if isinstance(cv_data, dict):
        raw_skills = cv_data.get("skills", [])
        if isinstance(raw_skills, list):
            cv_skills = set([s.lower().strip() for s in raw_skills if isinstance(s, str)])
        elif isinstance(raw_skills, str):
            cv_skills = set([s.lower().strip() for s in raw_skills.split(",")])

    # 3. Ekstrak keywords dari Job Description (Simple NLP)
    # Kita cari kata-kata yang sering muncul di JD (skills, tools, qualifications)
    jd_lower = job_description.lower()
    
    # Daftar skills umum (bisa diperluas dari skills_database.json nanti)
    common_tech_skills = [
        "python", "javascript", "java", "sql", "react", "node.js", "docker", 
        "aws", "git", "fastapi", "django", "flask", "machine learning", "ai",
        "frontend", "backend", "fullstack", "api", "rest", "graphql", "html", "css"
    ]
    
    jd_skills = set([skill for skill in common_tech_skills if skill in jd_lower])
    
    # 4. Hitung Match Percentage
    matched_skills = cv_skills.intersection(jd_skills)
    missing_skills = jd_skills.difference(cv_skills)
    
    if len(jd_skills) > 0:
        skills_match_score = (len(matched_skills) / len(jd_skills)) * 100
    else:
        skills_match_score = 50 # Default jika JD tidak punya skills spesifik
        
    # 5. Hitung Keywords Match (mencari kata kunci penting di JD yang ada di CV)
    important_keywords = ["experience", "years", "degree", "bachelor", "master", "team", "leadership"]
    cv_text_dump = str(cv_data).lower()
    keyword_hits = sum(1 for kw in important_keywords if kw in cv_text_dump and kw in jd_lower)
    keywords_score = min(100, (keyword_hits / len(important_keywords)) * 100 + 50)
    
    # 6. Hitung Overall Score (Weighted Average)
    # Untuk MVP ini, kita fokus ke skills_match dan keywords_match dulu
    overall_score = int(
        (skills_match_score * weights["skills_match"]) +
        (keywords_score * weights["keywords_match"]) +
        (70 * weights["experience_relevance"]) + # Placeholder: asumsi experience relevan
        (80 * weights["education_match"]) +      # Placeholder
        (90 * weights["formatting_quality"])     # Placeholder: asumsi format bagus
    )
    
    # Batasi skor 0-100
    overall_score = max(0, min(100, overall_score))
    
    # 7. Buat Suggestions
    suggestions = []
    if missing_skills:
        suggestions.append(f"💡 Tambahkan skills berikut ke CV Anda agar lebih relevan: {', '.join(list(missing_skills)[:5])}")
    if skills_match_score < 50:
        suggestions.append("⚠️ Kecocokan skills Anda dengan lowongan ini masih rendah. Pertimbangkan untuk menonjolkan proyek yang relevan.")
    if not suggestions:
        suggestions.append("🎉 CV Anda sudah sangat relevan dengan lowongan ini! Good luck!")
        
    return {
        "overall_score": overall_score,
        "match_percentage": round(skills_match_score, 2),
        "missing_keywords": list(missing_skills),
        "matched_skills": list(matched_skills),
        "suggestions": suggestions,
        "detailed_breakdown": {
            "skills_match": round(skills_match_score, 2),
            "keywords_match": round(keywords_score, 2),
            "weights_used": weights
        }
    }