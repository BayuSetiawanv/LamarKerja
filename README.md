# 🚀 LamarKerja AI

AI-powered CV optimizer and cover letter generator for job seekers.

## 🎯 Features
- Upload CV (PDF) + Paste Job Description
- AI analyzes match score and provides gap analysis
- Generate optimized CV + personalized cover letter
- Track application history

## 🛠️ Tech Stack
- **Backend:** FastAPI, PostgreSQL + pgvector, Redis, Celery, MinIO
- **AI:** Ollama (Llama 3), Sentence Transformers, LangChain
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Infrastructure:** Docker, Docker Compose

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+

### Setup
```bash
# Clone repository
git clone <repo-url>
cd lamarkerja-ai

# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Access services
# Backend API: http://localhost:8000/docs
# Frontend: http://localhost:3000
# MinIO Console: http://localhost:9001