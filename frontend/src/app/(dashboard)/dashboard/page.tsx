"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText, Target, PenLine, ArrowRight, Upload, CheckCircle2,
} from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCVStore } from "@/store/cv-store";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import type { CV } from "@/types";

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const mounted = useIsMounted();

  const cvs = useCVStore((s) => s.cvs);
  const currentCV = useCVStore((s) => s.currentCV);
  const setCurrentCV = useCVStore((s) => s.setCurrentCV);
  const latestScore = useCVStore((s) => s.latestScore);
  const latestCoverLetter = useCVStore((s) => s.latestCoverLetter);
  const user = useAuthStore((s) => s.user);

  if (!mounted) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold gradient-warm-text">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Memuat...</p>
        </div>
      </div>
    );
  }

  // 🔥 PERUBAHAN #1: Untuk ATS, bawa ID CV via URL query param
  const handlePickAndGo = (cv: CV, target: "ats" | "letter") => {
    setCurrentCV(cv);
    if (target === "ats") {
      router.push(`/dashboard/ats?cv=${cv.id}`);
    } else {
      router.push("/dashboard/cover-letter");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold gradient-warm-text">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Selamat datang kembali{user?.email ? `, ${user.email}` : ""}. Siap optimasi CV hari ini?
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="shadow-warm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total CV</p>
                <p className="text-3xl font-bold mt-1">{cvs.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-warm">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-warm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Skor ATS Terakhir</p>
                <p className="text-3xl font-bold mt-1">
                  {latestScore ? latestScore.overall_score : "—"}
                  {latestScore && <span className="text-base text-muted-foreground">/100</span>}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-warm">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-warm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cover Letter</p>
                <p className="text-3xl font-bold mt-1">
                  {latestCoverLetter ? "Siap" : "Belum"}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-warm">
                <PenLine className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-warm border-border/50">
        <CardHeader>
          <CardTitle>CV Terbaru Anda</CardTitle>
          <CardDescription>
            Pilih CV dan langsung lanjut ke analisis skor ATS atau pembuatan cover letter
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cvs.length === 0 ? (
            <div className="text-center py-12">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-semibold mb-2">Belum ada CV terupload</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Upload CV pertama Anda dan biarkan AI mulai bekerja
              </p>
              <Button asChild className="gradient-warm text-white shadow-warm">
                <Link href="/dashboard/upload">
                  Upload CV Sekarang <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {cvs.slice(0, 5).map((cv) => (
                <div
                  key={cv.id}
                  className={cn(
                    "flex items-center justify-between gap-3 p-4 rounded-lg border transition-colors",
                    currentCV?.id === cv.id
                      ? "bg-accent/60 border-primary/50"
                      : "bg-accent/40 border-border/50 hover:border-primary/40"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      {/* 🔥 PERUBAHAN #2: Badge skor di samping nama file */}
                      <p className="font-medium text-sm truncate flex items-center gap-2 flex-wrap">
                        <span className="truncate">{cv.file_name}</span>
                        {cv.ats_result && cv.ats_score != null && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shrink-0">
                            Skor: {cv.ats_score}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(cv.created_at)}</p>
                    </div>
                    {currentCV?.id === cv.id && (
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 text-success text-xs font-medium shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Aktif
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePickAndGo(cv, "ats")}
                      title="Hitung skor ATS untuk CV ini"
                    >
                      <Target className="w-4 h-4" />
                      <span className="hidden md:inline ml-1">Skor ATS</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePickAndGo(cv, "letter")}
                      title="Buat cover letter untuk CV ini"
                    >
                      <PenLine className="w-4 h-4" />
                      <span className="hidden md:inline ml-1">Cover Letter</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}