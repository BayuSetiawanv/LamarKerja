"use client";

import { useCallback, useSyncExternalStore, useRef, useState } from "react";
import Link from "next/link";
import {
  UploadCloud, FileText, X, Loader2, CheckCircle2,
  AlertCircle, Sparkles, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCVStore } from "@/store/cv-store";
import { cn } from "@/lib/utils";
import type { CVStructuredData } from "@/types";

const MAX_SIZE_MB = 10;

// React 19 hydration-safe client detection
const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ===== TYPE DEFINITION untuk JSON values (pengganti `any`) =====
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

// ===== HELPER: Ekstraksi nama dengan fallback berlapis =====
function extractName(data?: CVStructuredData, rawText?: string): string {
  if (!data && !rawText) return "-";

  const sd = (data || {}) as Record<string, JsonValue>;

  // Helper untuk ambil string dari value
  const asString = (v: JsonValue | undefined): string | null => {
    if (typeof v === "string" && v.trim().length > 2 && v.trim().length < 80) {
      return v.trim();
    }
    return null;
  };

  // Helper untuk akses nested property dengan aman
  const getNested = (obj: Record<string, JsonValue | undefined>, ...keys: string[]): string | null => {
    for (const key of keys) {
      const v = obj[key];
      const s = asString(v);
      if (s) return s;
    }
    return null;
  };

  // Lapis 1: Cek key di level atas
  const topLevel = getNested(sd, "name", "full_name", "nama", "nama_lengkap");
  if (topLevel) return topLevel;

  // Lapis 2: Cek di nested objects (contact, personal_info, dll)
  const nestedKeys = ["contact", "personal_info", "contact_info", "header", "profile", "data_pribadi"];
  for (const nk of nestedKeys) {
    const nested = sd[nk];
    if (nested && typeof nested === "object" && nested !== null && !Array.isArray(nested)) {
      const found = getNested(nested as Record<string, JsonValue | undefined>, "name", "full_name", "nama", "nama_lengkap");
      if (found) return found;
    }
  }

  // Lapis 3: Fallback dari raw_text
  if (rawText) {
    const forbidden = new Set([
      "PROFILE", "SUMMARY", "WORK", "EXPERIENCE", "EDUCATION",
      "SKILLS", "RINGKASAN", "PENGALAMAN", "PENDIDIKAN",
      "KEAHLIAN", "PROYEK", "SERTIFIKASI", "NO",
    ]);
    for (const line of rawText.split("\n")) {
      const cleaned = line.replace(/\|/g, "").trim();
      if (!cleaned) continue;
      const firstWord = cleaned.split(/\s+/)[0]?.toUpperCase() || "";
      if (forbidden.has(firstWord)) continue;
      const m = cleaned.match(/^([A-Z][A-Za-z.'\-]*(?:\s+[A-Z]?[A-Za-z.'\-]*){0,4})/);
      if (m && m[1].length >= 3 && m[1].length <= 60) return m[1].trim();
      break;
    }
  }

  return "-";
}

// ===== HELPER: Ekstraksi email dengan fallback berlapis =====
function extractEmail(data?: CVStructuredData, rawText?: string): string {
  if (!data && !rawText) return "-";

  const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
  const sd = (data || {}) as Record<string, JsonValue>;

  // Helper untuk ekstrak email dari string
  const findEmail = (s: string): string | null => {
    const m = s.match(EMAIL_RE);
    return m ? m[0] : null;
  };

  // Lapis 1: Cek key langsung di level atas
  const directKeys = ["email", "e_mail", "email_address", "alamat_email"];
  for (const k of directKeys) {
    const v = sd[k];
    if (typeof v === "string" && v.includes("@")) {
      const found = findEmail(v);
      if (found) return found;
    }
  }

  // Lapis 2: Cek di nested objects
  const nestedKeys = ["contact", "personal_info", "contact_info", "header"];
  for (const nk of nestedKeys) {
    const nested = sd[nk];
    if (nested && typeof nested === "object" && nested !== null && !Array.isArray(nested)) {
      for (const k of directKeys) {
        const v = (nested as Record<string, JsonValue | undefined>)[k];
        if (typeof v === "string" && v.includes("@")) {
          const found = findEmail(v);
          if (found) return found;
        }
      }
    }
  }

  // Lapis 3: Walk seluruh struktur JSON
  const walk = (node: JsonValue): string | null => {
    if (typeof node === "string" && node.includes("@") && node.length < 150) {
      return findEmail(node);
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        const r = walk(item);
        if (r) return r;
      }
    } else if (node && typeof node === "object") {
      for (const val of Object.values(node)) {
        if (val !== undefined) {
          const r = walk(val);
          if (r) return r;
        }
      }
    }
    return null;
  };
  const walked = walk(sd as JsonValue);
  if (walked) return walked;

  // Lapis 4: Regex dari raw_text
  if (rawText) {
    const m = rawText.match(EMAIL_RE);
    if (m) return m[0];
  }

  return "-";
}

// ===== HELPER: Ekstraksi skills =====
function extractSkills(data?: CVStructuredData): string[] {
  const raw = data?.skills;
  if (!raw) return [];
  if (typeof raw === "string") {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(raw)) {
    const out: string[] = [];
    for (const item of raw) {
      if (typeof item === "string") {
        out.push(item);
      } else if (item && typeof item === "object") {
        const list = (item as { list?: unknown }).list;
        if (Array.isArray(list)) out.push(...list.map(String));
      }
    }
    return out;
  }
  return [];
}

export default function UploadPage() {
  const mounted = useIsMounted();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [result, setResult] = useState<null | { 
    id: string; 
    file_name: string; 
    structured_data?: CVStructuredData;
    raw_text?: string;
  }>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadCV = useCVStore((s) => s.uploadCV);
  const isUploading = useCVStore((s) => s.isUploading);
  const storeError = useCVStore((s) => s.error);

  const acceptFile = useCallback((f: File) => {
    setLocalError(null);
    setResult(null);
    if (!f.name.toLowerCase().endsWith(".pdf") && f.type !== "application/pdf") {
      setLocalError("Hanya file PDF yang diperbolehkan.");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setLocalError(`Ukuran file maksimal ${MAX_SIZE_MB} MB.`);
      return;
    }
    setFile(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) acceptFile(f);
    },
    [acceptFile]
  );

  const handleUpload = async () => {
    if (!file) return;
    try {
      const cv = await uploadCV(file);
      setResult(cv);
      setFile(null);
    } catch {
      // Error ditampilkan dari store
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-8 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold gradient-warm-text">Upload CV</h1>
          <p className="text-muted-foreground mt-1">Memuat...</p>
        </div>
      </div>
    );
  }

  const skills = extractSkills(result?.structured_data);
  const detectedName = result ? extractName(result.structured_data, result.raw_text) : "-";
  const detectedEmail = result ? extractEmail(result.structured_data, result.raw_text) : "-";

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold gradient-warm-text">Upload CV</h1>
        <p className="text-muted-foreground mt-1">
          Upload CV PDF Anda dan biarkan AI mengekstrak profil profesional Anda
        </p>
      </div>

      {isUploading ? (
        <Card className="shadow-warm border-border/50">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl gradient-warm flex items-center justify-center mb-6 animate-pulse shadow-warm-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI sedang membaca CV Anda...</h3>
            <p className="text-muted-foreground mb-10">
              Proses ini memakan waktu 5-20 detik. Jangan tutup halaman ini.
            </p>
            <div className="max-w-xs mx-auto space-y-4 text-left text-sm">
              {[
                "Mengekstrak teks dari PDF",
                "AI menganalisis profil & pengalaman",
                "Menyimpan hasil ke database",
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                  {step}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : result ? (
        <Card className="shadow-warm-lg border-border/50">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-success flex items-center justify-center shadow-warm">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">CV Berhasil Dianalisis!</h3>
                <p className="text-sm text-muted-foreground">{result.file_name}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-accent/40 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Nama Terdeteksi</p>
                <p className={cn(
                  "font-medium",
                  detectedName === "-" && "text-muted-foreground italic"
                )}>
                  {detectedName}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-accent/40 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Email Terdeteksi</p>
                <p className={cn(
                  "font-medium break-all",
                  detectedEmail === "-" && "text-muted-foreground italic"
                )}>
                  {detectedEmail}
                </p>
              </div>
            </div>

            {skills.length > 0 && (
              <div className="mb-8">
                <p className="text-xs text-muted-foreground mb-2">
                  Skills yang ditemukan AI ({skills.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {skills.slice(0, 15).map((s, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium"
                    >
                      {s}
                    </span>
                  ))}
                  {skills.length > 15 && (
                    <span className="px-3 py-1 rounded-full bg-accent/60 text-xs text-muted-foreground">
                      +{skills.length - 15} lainnya
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button asChild className="gradient-warm text-white shadow-warm">
                <Link href="/dashboard/ats">
                  Lanjut: Hitung Skor ATS <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setResult(null)}>
                Upload CV Lain
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-warm border-border/50">
          <CardContent className="p-8">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all",
                isDragging
                  ? "border-primary bg-accent/60 scale-[1.01]"
                  : "border-border hover:border-primary/50 hover:bg-accent/30"
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) acceptFile(f);
                  e.target.value = "";
                }}
              />
              <div className="w-16 h-16 mx-auto rounded-2xl gradient-warm flex items-center justify-center mb-6 shadow-warm">
                <UploadCloud className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Seret & lepas CV PDF Anda di sini
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                atau klik untuk memilih file dari komputer
              </p>
              <p className="text-xs text-muted-foreground">
                PDF saja · Maksimal {MAX_SIZE_MB} MB
              </p>
            </div>

            {(localError || storeError) && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {localError ?? storeError}
              </div>
            )}

            {file && (
              <div className="mt-4 flex items-center justify-between p-4 rounded-lg bg-accent/40 border border-border/50">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full mt-6 gradient-warm text-white shadow-warm hover:shadow-warm-lg hover:opacity-95 h-12"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengupload & Menganalisis...
                </>
              ) : (
                "Upload & Analisis dengan AI"
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}