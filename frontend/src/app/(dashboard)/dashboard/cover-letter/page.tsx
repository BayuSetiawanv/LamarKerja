"use client";

import { useEffect, useSyncExternalStore, useState } from "react";
import Link from "next/link";
import {
  PenLine, Loader2, AlertCircle, Copy, Check, History,
  Upload, ArrowLeft, Building2, FileQuestion, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCVStore } from "@/store/cv-store";
import { cn } from "@/lib/utils";
import type { CoverLetterDetail, CoverLetterResult } from "@/types";
import {
  exportCoverLetterToPdf,
  detectLetterLanguage,
  buildCoverLetterFileName,
} from "@/lib/export-pdf";

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function formatDateTime(dateString: string): string {
  const d = new Date(dateString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CoverLetterPage() {
  const mounted = useIsMounted();

  const [selectedCVId, setSelectedCVId] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("cv") || "";
    }
    return "";
  });
  const [jobDescription, setJobDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [localError, setLocalError] = useState<string | null>(null);
  const [viewingLetter, setViewingLetter] = useState<CoverLetterDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [copied, setCopied] = useState(false);

  const cvs = useCVStore((s) => s.cvs);
  const currentCV = useCVStore((s) => s.currentCV);
  const latestCoverLetter = useCVStore((s) => s.latestCoverLetter);
  const letterForCVId = useCVStore((s) => s.letterForCVId);
  const isGeneratingLetter = useCVStore((s) => s.isGeneratingLetter);
  const storeError = useCVStore((s) => s.error);
  const generateCoverLetter = useCVStore((s) => s.generateCoverLetter);
  const coverLetters = useCVStore((s) => s.coverLetters);
  const fetchCoverLetters = useCVStore((s) => s.fetchCoverLetters);
  const fetchCoverLetterDetail = useCVStore((s) => s.fetchCoverLetterDetail);

  // Muat riwayat saat halaman dibuka
  useEffect(() => {
    fetchCoverLetters();
  }, [fetchCoverLetters]);

  const validCurrentId =
    currentCV && cvs.some((c) => c.id === currentCV.id) ? currentCV.id : "";
  const effectiveCVId =
    selectedCVId || validCurrentId || (cvs.length > 0 ? cvs[0].id : "");
  const selectedCV = cvs.find((c) => c.id === effectiveCVId) ?? null;

  // LOGIKA INTI: surat per-CV, BUKAN global
  const sessionLetter: CoverLetterResult | null =
    letterForCVId === effectiveCVId ? latestCoverLetter : null;
  const letterToShow: CoverLetterResult | CoverLetterDetail | null =
    viewingLetter ?? sessionLetter;
  const hasLetter = Boolean(letterToShow);

  const handleGenerate = async () => {
    setLocalError(null);
    if (!effectiveCVId) {
      setLocalError("Pilih CV terlebih dahulu");
      return;
    }
    if (jobDescription.trim().length < 50) {
      setLocalError("Job description minimal 50 karakter");
      return;
    }
    setViewingLetter(null);
    setCopied(false);
    try {
      await generateCoverLetter(
        effectiveCVId,
        jobDescription,
        companyName || undefined,
        targetRole || undefined,
        language
      );
      fetchCoverLetters();
    } catch {
      /* error ditangani store */
    }
  };

  const openLetter = async (id: string) => {
    setIsLoadingDetail(true);
    setLocalError(null);
    try {
      const detail = await fetchCoverLetterDetail(id);
      setViewingLetter(detail);
      setCopied(false);
    } catch {
      setLocalError("Gagal memuat surat. Coba lagi.");
    }
    setIsLoadingDetail(false);
  };

  const copyLetter = async () => {
    const text = !letterToShow
      ? ""
      : "letter_text" in letterToShow
        ? letterToShow.letter_text
        : letterToShow.cover_letter;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setLocalError("Gagal menyalin otomatis. Blok teksnya lalu tekan Ctrl+C.");
    }
  };

  // 🔥 BARU: Download PDF
  const downloadPdf = () => {
    const text = !letterToShow
      ? ""
      : "letter_text" in letterToShow
        ? letterToShow.letter_text
        : letterToShow.cover_letter;
    if (!text) return;

    const company = viewingLetter?.company_name ?? companyName ?? null;
    const lang = detectLetterLanguage(text);
    exportCoverLetterToPdf(text, buildCoverLetterFileName(company, lang));
  };

  if (!mounted) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold gradient-warm-text">Cover Letter</h1>
        <p className="text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  // Ambil teks yang akan ditampilkan
  const displayText = !letterToShow
    ? ""
    : "letter_text" in letterToShow
      ? letterToShow.letter_text
      : letterToShow.cover_letter;

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold gradient-warm-text">Cover Letter Generator</h1>
        <p className="text-muted-foreground mt-1">
          Surat lamaran profesional 5 paragraf, tersimpan otomatis di riwayat Anda
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* ===== KOLOM KIRI: FORM + HASIL ===== */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-warm border-border/50">
            <CardHeader>
              <CardTitle>Detail Lamaran</CardTitle>
              <CardDescription>
                AI akan menulis surat berdasarkan CV + hasil skor ATS Anda
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
                      <option key={cv.id} value={cv.id}>{cv.file_name}</option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Nama Perusahaan (opsional)</Label>
                  <Input
                    id="company"
                    placeholder="Contoh: Tokopedia"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Posisi yang Dilamar (opsional)</Label>
                  <Input
                    id="role"
                    placeholder="Contoh: Backend Engineer"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Bahasa Surat</Label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as "id" | "en")}
                    className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm focus:border-ring focus:ring-2 focus:ring-ring/50 outline-none"
                  >
                    <option value="id">🇮🇩 Bahasa Indonesia</option>
                    <option value="en">🇬🇧 English</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jd">Job Description</Label>
                <Textarea
                  id="jd"
                  placeholder="Tempel teks lowongan kerja di sini (minimal 50 karakter)..."
                  rows={6}
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
                onClick={handleGenerate}
                disabled={isGeneratingLetter || cvs.length === 0}
                className="w-full gradient-warm text-white shadow-warm hover:shadow-warm-lg h-11"
              >
                {isGeneratingLetter ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI sedang menulis surat Anda... (10-20 detik)
                  </>
                ) : (
                  <>
                    <PenLine className="w-4 h-4 mr-2" />
                    Generate Cover Letter
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* EMPTY STATE: CV belum pernah dibuatkan surat */}
          {!isGeneratingLetter && !hasLetter && cvs.length > 0 && (
            <Card className="shadow-warm border-border/50">
              <CardContent className="py-12 text-center">
                <FileQuestion className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-semibold mb-2">CV ini belum pernah dibuatkan surat</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Belum ada cover letter tersimpan untuk{" "}
                  <span className="font-medium text-foreground">{selectedCV?.file_name ?? "CV ini"}</span>.
                  Isi form di atas lalu klik <span className="font-medium">Generate Cover Letter</span>.
                </p>
              </CardContent>
            </Card>
          )}

          {/* ===== SURAT (hanya milik CV yang terpilih) ===== */}
          {hasLetter && !isGeneratingLetter && letterToShow && (
            <Card className="shadow-warm-lg border-border/50 animate-in fade-in duration-500">
              <CardHeader>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <PenLine className="w-5 h-5 text-primary" />
                      Cover Letter Anda
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {viewingLetter
                        ? `Dari riwayat · ${viewingLetter.company_name ?? "Tanpa perusahaan"} · ${formatDateTime(viewingLetter.created_at)}`
                        : `Untuk: ${selectedCV?.file_name ?? "CV"}${companyName ? ` (${companyName})` : ""} · ${language === "en" ? "🇬🇧 English" : "🇮🇩 Indonesia"}`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {viewingLetter && (
                      <Button variant="outline" size="sm" onClick={() => setViewingLetter(null)}>
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Kembali ke Hasil Baru
                      </Button>
                    )}
                    {/* 🔥 BARU: Tombol Download PDF */}
                    <Button size="sm" variant="outline" onClick={downloadPdf}>
                      <Download className="w-4 h-4 mr-1" />
                      Download PDF
                    </Button>
                    <Button size="sm" onClick={copyLetter} className="gradient-warm text-white shadow-warm">
                      {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                      {copied ? "Tersalin!" : "Salin Surat"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-5 rounded-lg bg-white dark:bg-slate-900 border border-border/50 whitespace-pre-wrap text-sm leading-relaxed">
                  {displayText}
                </div>
              </CardContent>
            </Card>
          )}

          {cvs.length === 0 && (
            <Card className="shadow-warm border-border/50">
              <CardContent className="py-12 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-semibold mb-2">Belum ada CV untuk dibuatkan surat</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Upload CV terlebih dahulu agar AI bisa menulis surat berbasis data Anda
                </p>
                <Button asChild className="gradient-warm text-white shadow-warm">
                  <Link href="/dashboard/upload">Upload CV Sekarang</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ===== KOLOM KANAN: RIWAYAT SURAT ===== */}
        <Card className="shadow-warm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Riwayat Surat
            </CardTitle>
            <CardDescription>
              {coverLetters.length} surat tersimpan di akun Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-140 overflow-y-auto">
            {isLoadingDetail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                <Loader2 className="w-4 h-4 animate-spin" /> Memuat surat...
              </div>
            )}

            {coverLetters.length === 0 && !isLoadingDetail ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Belum ada surat tersimpan. Surat yang Anda generate akan muncul di sini.
              </p>
            ) : (
              coverLetters.map((l) => (
                <button
                  key={l.id}
                  onClick={() => openLetter(l.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-colors",
                    viewingLetter?.id === l.id
                      ? "border-primary bg-accent/60"
                      : "border-border/50 bg-accent/30 hover:border-primary/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary shrink-0" />
                    <p className="font-medium text-sm truncate">
                      {l.company_name ?? "Tanpa nama perusahaan"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {l.target_role ?? "Posisi umum"} · {formatDateTime(l.created_at)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{l.letter_snippet}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}