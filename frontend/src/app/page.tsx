import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sparkles, FileText, Target, PenLine,
  Upload, Brain, ArrowRight, ShieldCheck,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "CV Analyzer AI",
    desc: "Upload PDF Anda, AI Cloud mengekstrak skills, pengalaman, dan pendidikan menjadi data terstruktur dalam hitungan detik.",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: Target,
    title: "Smart ATS Scoring",
    desc: "AI menilai kecocokan CV Anda dengan lowongan kerja, lengkap dengan analisis kekuatan, kelemahan, dan saran perbaikan.",
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: PenLine,
    title: "Cover Letter Generator",
    desc: "Surat lamaran persuasif yang ditulis AI, disesuaikan dengan profil Anda dan kebutuhan perusahaan tujuan.",
    gradient: "from-yellow-500 to-amber-600",
  },
];

const steps = [
  { icon: Upload, title: "1. Upload CV", desc: "Seret file PDF Anda ke platform" },
  { icon: Brain, title: "2. AI Menganalisis", desc: "AI Cloud membaca & memahami profil Anda secara instan" },
  { icon: Sparkles, title: "3. Dapatkan Insight", desc: "Skor ATS, saran, dan cover letter siap pakai" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* ===== NAVBAR ===== */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl gradient-warm flex items-center justify-center shadow-warm">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="font-bold text-lg sm:text-xl tracking-tight">
              LamarKerja<span className="text-primary">.AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" asChild className="hidden sm:inline-flex text-sm sm:text-base">
              <Link href="/login">Masuk</Link>
            </Button>
            <Button asChild className="gradient-warm text-white shadow-warm hover:shadow-warm-lg hover:opacity-95 text-sm sm:text-base px-4 sm:px-6 h-9 sm:h-10">
              <Link href="/register">Daftar Gratis</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 sm:pt-24 sm:pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-accent text-accent-foreground text-xs sm:text-sm font-medium mb-6 sm:mb-8">
            <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4" />
            Ditenagai oleh Groq Cloud — Cepat & Akurat
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-4 sm:mb-6 text-balance px-2">
            <span className="gradient-warm-text">CV Cerdas,</span>
            <br />
            Karir Melesat.
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-2 sm:px-0">
            Platform AI yang menganalisis CV Anda, memberi skor ATS yang jujur,
            dan menulis cover letter persuasif — disesuaikan untuk setiap lowongan yang Anda lamar.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <Button size="lg" asChild className="gradient-warm text-white shadow-warm-lg hover:shadow-warm-xl hover:opacity-95 text-sm sm:text-base px-6 sm:px-10 h-11 sm:h-14 w-full sm:w-auto">
              <Link href="/register">
                Mulai Sekarang — Gratis
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-sm sm:text-base px-6 sm:px-10 h-11 sm:h-14 w-full sm:w-auto">
              <Link href="/login">Saya Sudah Punya Akun</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center mb-12 sm:mb-14 px-2 sm:px-0">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
            Tiga Senjata Utama Anda
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
            Semua ditenagai oleh AI Llama 3 berkecepatan tinggi (Groq Cloud)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
          {features.map((f, i) => (
            <div
              key={i}
              className="group bg-card border border-border/50 rounded-2xl p-6 sm:p-8 shadow-warm hover:shadow-warm-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform shadow-warm`}>
                <f.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">{f.title}</h3>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-16 sm:py-20 bg-accent/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-10 sm:mb-14 px-2">
            Semudah 1-2-3
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 md:gap-10 max-w-5xl mx-auto">
            {steps.map((s, i) => (
              <div key={i} className="text-center px-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl gradient-warm flex items-center justify-center mb-4 sm:mb-5 shadow-warm">
                  <s.icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm sm:text-base">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center rounded-2xl sm:rounded-3xl gradient-warm p-8 sm:p-12 md:p-16 shadow-warm-xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
            Siap Membuat HRD Melirik CV Anda?
          </h2>
          <p className="text-white/90 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 px-2">
            Bergabunglah sekarang dan biarkan AI menjadi career coach pribadi Anda.
          </p>
          <Button size="lg" asChild variant="secondary" className="text-sm sm:text-base px-8 sm:px-10 h-11 sm:h-14 w-full sm:w-auto">
            <Link href="/register">Buat Akun Gratis</Link>
          </Button>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-border/50 py-6 sm:py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs sm:text-sm text-muted-foreground">
          © 2026 LamarKerja.AI · Dibangun dengan Next.js, FastAPI, PostgreSQL & Groq AI
        </div>
      </footer>
    </div>
  );
}
