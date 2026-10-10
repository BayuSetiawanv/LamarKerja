"use client";

import { useSyncExternalStore, useState } from "react";
import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  Target, Loader2, CheckCircle2, AlertCircle, Award,
  TrendingUp, TrendingDown, Lightbulb, Quote, AlertTriangle,
  HelpCircle, BarChart3, ShieldAlert, FileQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCVStore } from "@/store/cv-store";
import { cn } from "@/lib/utils";
import type { ATSScoreResult } from "@/types";

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function CircularScore({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 60;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80 ? "text-emerald-500" :
    score >= 60 ? "text-amber-500" :
    "text-rose-500";
  const bg =
    score >= 80 ? "stroke-emerald-200" :
    score >= 60 ? "stroke-amber-200" :
    "stroke-rose-200";

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="60" strokeWidth="12" fill="none" className={bg} />
        <circle
          cx="70" cy="70" r="60" strokeWidth="12" fill="none"
          stroke="currentColor" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className={cn("transition-all duration-1000 ease-out", color)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-4xl font-bold", color)}>{score}</span>
        <span className="text-xs text-muted-foreground mt-1">dari 100</span>
      </div>
    </div>
  );
}

function DimensionBar({ label, score, justification, icon: Icon }: {
  label: string;
  score: number;
  justification: string;
  icon: ComponentType<{ className?: string }>;
}) {
  const color =
    score >= 80 ? "bg-emerald-500" :
    score >= 60 ? "bg-amber-500" :
    "bg-rose-500";
  return (
    <div className="p-4 rounded-lg border border-border/50 bg-accent/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">{label}</span>
        </div>
        <span className={cn(
          "font-bold text-lg",
          score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-rose-600"
        )}>
          {score}
        </span>
      </div>
      <div className="h-2 rounded-full bg-accent overflow-hidden mb-2">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${score}%` }} />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{justification}</p>
    </div>
  );
}

export default function ATSPage() {
  const router = useRouter();
  const mounted = useIsMounted();

  // ✅ FIX: Inisialisasi state langsung dari URL parameter (tanpa useEffect)
  const [selectedCVId, setSelectedCVId] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("cv") || "";
    }
    return "";
  });
  const [jobDescription, setJobDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const cvs = useCVStore((s) => s.cvs);
  const currentCV = useCVStore((s) => s.currentCV);
  const latestScore = useCVStore((s) => s.latestScore);
  const scoredCVId = useCVStore((s) => s.scoredCVId);
  const isScoring = useCVStore((s) => s.isScoring);
  const storeError = useCVStore((s) => s.error);
  const scoreCV = useCVStore((s) => s.scoreCV);

  const validCurrentId =
    currentCV && cvs.some((c) => c.id === currentCV.id) ? currentCV.id : "";
  const effectiveCVId =
    selectedCVId || validCurrentId || (cvs.length > 0 ? cvs[0].id : "");
  const selectedCV = cvs.find((c) => c.id === effectiveCVId) ?? null;

  // 🔑 LOGIKA INTI: hasil per-CV, BUKAN global
  const sessionScore = scoredCVId === effectiveCVId ? latestScore : null;
  const resultToShow: ATSScoreResult | null =
    sessionScore ?? selectedCV?.ats_result ?? null;

  const handleScore = async () => {
    setLocalError(null);
    if (!effectiveCVId) {
      setLocalError("Pilih CV terlebih dahulu");
      return;
    }
    if (jobDescription.trim().length < 50) {
      setLocalError("Job description minimal 50 karakter");
      return;
    }
    try {
      await scoreCV(effectiveCVId, jobDescription, targetRole || undefined);
    } catch {
      /* error ditangani store */
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold gradient-warm-text">ATS Scoring</h1>
        <p className="text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold gradient-warm-text">ATS Scoring Mendalam</h1>
        <p className="text-muted-foreground mt-1">
          Evaluasi kritis dengan 5 dimensi penilaian dan analisis berbasis bukti
        </p>
      </div>

      {/* ===== FORM ===== */}
      <Card className="shadow-warm border-border/50">
        <CardHeader>
          <CardTitle>Detail Lowongan</CardTitle>
          <CardDescription>
            Pilih CV dan tempel deskripsi pekerjaan yang ingin dilamar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Pilih CV</Label>
            <select
              value={effectiveCVId}
              onChange={(e) => setSelectedCVId(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm focus:border-ring focus:ring-2 focus:ring-ring/50 outline-none"
            >
              {cvs.length === 0 ? (
                <option value="">— Belum ada CV, upload dulu —</option>
              ) : (
                cvs.map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.file_name}
                    {cv.ats_result ? ` (skor: ${cv.ats_score ?? "-"})` : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Posisi / Target Role (opsional)</Label>
            <Input
              id="role"
              placeholder="Contoh: Senior Backend Engineer"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jd">Job Description</Label>
            <Textarea
              id="jd"
              placeholder="Tempel teks lengkap lowongan kerja di sini (minimal 50 karakter)..."
              rows={8}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{jobDescription.length} karakter</p>
          </div>

          {(localError || storeError) && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {localError ?? storeError}
            </div>
          )}

          <Button
            onClick={handleScore}
            disabled={isScoring || cvs.length === 0}
            className="w-full gradient-warm text-white shadow-warm hover:shadow-warm-lg h-11"
          >
            {isScoring ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                AI sedang menganalisis mendalam... (15-30 detik)
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                Analisis Mendalam
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 🔑 EMPTY STATE: CV belum pernah dianalisis — TIDAK pakai skor global */}
      {!isScoring && !resultToShow && cvs.length > 0 && (
        <Card className="shadow-warm border-border/50">
          <CardContent className="py-12 text-center">
            <FileQuestion className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-semibold mb-2">CV ini belum pernah dianalisis</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Belum ada hasil tersimpan untuk{" "}
              <span className="font-medium text-foreground">{selectedCV?.file_name ?? "CV ini"}</span>.
              Tempel job description di atas, lalu klik <span className="font-medium">Analisis Mendalam</span>.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ===== HASIL: hanya milik CV yang terpilih ===== */}
      {resultToShow && !isScoring && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Header + skor utama */}
          <Card className="shadow-warm-lg border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    Evaluasi Mendalam AI Recruiter
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Untuk: <span className="font-medium text-foreground">{selectedCV?.file_name ?? "CV"}</span>
                  </CardDescription>
                </div>
                {resultToShow.competitive_positioning && (
                  <div className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                    {resultToShow.competitive_positioning}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <CircularScore score={resultToShow.overall_score} />
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200">
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium mb-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Skills Cocok ({resultToShow.matched_skills.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {resultToShow.matched_skills.slice(0, 10).map((s, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-xs bg-emerald-200 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200">
                    <p className="text-xs text-rose-700 dark:text-rose-300 font-medium mb-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Skills Hilang ({resultToShow.missing_skills.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {resultToShow.missing_skills.slice(0, 10).map((s, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-xs bg-rose-200 text-rose-900 dark:bg-rose-800 dark:text-rose-100">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5 Dimensi — Label Bahasa Indonesia */}
          {resultToShow.detailed_breakdown && (
            <Card className="shadow-warm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Analisis 5 Dimensi
                </CardTitle>
                <CardDescription>Penilaian mendalam dengan rubrik terstruktur</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                <DimensionBar
                  label="Kedalaman Teknis"
                  icon={Target}
                  score={resultToShow.detailed_breakdown.technical_depth.score}
                  justification={resultToShow.detailed_breakdown.technical_depth.justification}
                />
                <DimensionBar
                  label="Dampak Bisnis"
                  icon={TrendingUp}
                  score={resultToShow.detailed_breakdown.business_impact.score}
                  justification={resultToShow.detailed_breakdown.business_impact.justification}
                />
                <DimensionBar
                  label="Relevansi Pengalaman"
                  icon={Award}
                  score={resultToShow.detailed_breakdown.experience_relevance.score}
                  justification={resultToShow.detailed_breakdown.experience_relevance.justification}
                />
                <DimensionBar
                  label="Jejak Karir"
                  icon={TrendingUp}
                  score={resultToShow.detailed_breakdown.career_trajectory.score}
                  justification={resultToShow.detailed_breakdown.career_trajectory.justification}
                />
                <DimensionBar
                  label="Keberagaman Portofolio"
                  icon={BarChart3}
                  score={resultToShow.detailed_breakdown.portfolio_diversity.score}
                  justification={resultToShow.detailed_breakdown.portfolio_diversity.justification}
                />
              </CardContent>
            </Card>
          )}

          {/* Strengths & Weaknesses */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="shadow-warm border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                  Kekuatan Kandidat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{resultToShow.strengths}</p>
              </CardContent>
            </Card>
            <Card className="shadow-warm border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                  <TrendingDown className="w-5 h-5" />
                  Kekurangan & Gap
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{resultToShow.weaknesses}</p>
              </CardContent>
            </Card>
          </div>

          {/* Evidence Quotes - ✅ FIX: Gunakan HTML entities untuk kutip */}
          {resultToShow.evidence_quotes && resultToShow.evidence_quotes.length > 0 && (
            <Card className="shadow-warm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Quote className="w-5 h-5 text-primary" />
                  Bukti dari CV (Kutipan Langsung)
                </CardTitle>
                <CardDescription>Setiap klaim AI didukung kutipan spesifik dari CV Anda</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {resultToShow.evidence_quotes.map((quote, i) => (
                  <div key={i} className="p-4 rounded-lg bg-accent/40 border-l-4 border-primary italic text-sm">
                    &ldquo;{quote}&rdquo;
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Red Flags */}
          {resultToShow.red_flags && resultToShow.red_flags.length > 0 && (
            <Card className="shadow-warm border-amber-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <ShieldAlert className="w-5 h-5" />
                  Red Flags & Concerns
                </CardTitle>
                <CardDescription>Hal yang mungkin ditanyakan atau diragukan recruiter</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {resultToShow.red_flags.map((flag, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm">{flag}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Interview Questions */}
          {resultToShow.interview_questions && resultToShow.interview_questions.length > 0 && (
            <Card className="shadow-warm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  Pertanyaan Interview untuk Anda
                </CardTitle>
                <CardDescription>Siapkan jawaban untuk pertanyaan yang kemungkinan besar akan muncul</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {resultToShow.interview_questions.map((q, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-lg bg-accent/40 border border-border/50">
                    <div className="w-6 h-6 rounded-full gradient-warm text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-sm">{q}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Suggestions */}
          <Card className="shadow-warm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                Saran Spesifik untuk Meningkatkan Peluang
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {resultToShow.actionable_suggestions.map((s, i) => (
                <div key={i} className="flex gap-3 p-4 rounded-lg bg-accent/40 border border-border/50">
                  <div className="w-7 h-7 rounded-full gradient-warm text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-warm">
                    {i + 1}
                  </div>
                  <p className="text-sm leading-relaxed pt-0.5">{s}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {cvs.length === 0 && !resultToShow && (
        <Card className="shadow-warm border-border/50">
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-semibold mb-2">Belum ada CV untuk dianalisis</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Upload CV terlebih dahulu di menu Upload CV
            </p>
            <Button
              onClick={() => router.push("/dashboard/upload")}
              className="gradient-warm text-white shadow-warm"
            >
              Upload CV Sekarang
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}