import fitz  # PyMuPDF

doc = fitz.open()
page = doc.new_page()

cv_text = """BUDI SANTOSO
Software Engineer
budi.santoso@email.com | +62 812-3456-7890 | Jakarta

PROFESSIONAL SUMMARY
Software Engineer with 2 years of experience building web applications and machine learning models.

WORK EXPERIENCE
PT Teknologi Maju - Jakarta
Junior Software Engineer (Jan 2023 - Present)
- Developed RESTful APIs using Python FastAPI for e-commerce platform
- Implemented machine learning model for product recommendation
- Reduced API response time by 40% through database optimization

SKILLS
Python, JavaScript, SQL, FastAPI, React, Docker, Git, PostgreSQL, Machine Learning

EDUCATION
Universitas Indonesia
Bachelor of Computer Science (2019 - 2023)
"""

rect = fitz.Rect(72, 72, 523, 770)
page.insert_textbox(rect, cv_text, fontsize=11)
doc.save("test_cv.pdf")
print("✅ test_cv.pdf berhasil dibuat di folder backend/")