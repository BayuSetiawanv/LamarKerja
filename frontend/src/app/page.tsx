import Link from "next/link";
import { Button } from "@/components/ui/button";   // ← TAMBAHKAN BARIS INI
import {
  Sparkles, FileText, Target, PenLine,
  Upload, Brain, ArrowRight, ShieldCheck,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "CV Analyzer AI",
    desc: "Upload PDF Anda, AI lokal mengekstrak skills, pengalaman, dan pendidikan menjadi data terstruktur dalam hitungan menit.",
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
  { icon: Brain, title: "2. AI Menganalisis", desc: "Llama 3.2 membaca & memahami profil Anda" },
  { icon: Sparkles, title: "3. Dapatkan Insight", desc: "Skor ATS, saran, dan cover letter siap pakai" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* ===== NAVBAR ===== */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-warm flex items-center justify-center shadow-warm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">
              LamarKerja<span className="text-primary">.AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Masuk</Link>
            </Button>
            <Button asChild className="gradient-warm text-white shadow-warm hover:shadow-warm-lg hover:opacity-95">
              <Link href="/register">Daftar Gratis</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-8">
            <ShieldCheck className="w-4 h-4" />
            100% AI Lokal — Data Anda tidak pernah meninggalkan mesin Anda
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-balance">
            <span className="gradient-warm-text">CV Cerdas,</span>
            <br />
            Karir Melesat.
          </h1>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Platform AI yang menganalisis CV Anda, memberi skor ATS yang jujur,
            dan menulis cover letter persuasif — disesuaikan untuk setiap lowongan yang Anda lamar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="gradient-warm text-white shadow-warm-lg hover:shadow-warm-xl hover:opacity-95 text-base px-10 h-14">
              <Link href="/register">
                Mulai Sekarang — Gratis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base px-10 h-14">
              <Link href="/login">Saya Sudah Punya Akun</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Tiga Senjata Utama Anda
          </h2>
          <p className="text-muted-foreground text-lg">
            Semua ditenagai oleh Llama 3.2 yang berjalan lokal di infrastruktur Anda
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((f, i) => (
            <div
              key={i}
              className="group bg-card border border-border/50 rounded-2xl p-8 shadow-warm hover:shadow-warm-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`w-14 h-14 rounded-xl bg-linear-to-br ${f.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-warm`}>
                <f.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-20 bg-accent/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-14">
            Semudah 1-2-3
          </h2>
          <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl gradient-warm flex items-center justify-center mb-5 shadow-warm">
                  <s.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto text-center rounded-3xl gradient-warm p-12 md:p-16 shadow-warm-xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Siap Membuat HRD Melirik CV Anda?
          </h2>
          <p className="text-white/90 text-lg mb-8">
            Bergabunglah sekarang dan biarkan AI menjadi career coach pribadi Anda.
          </p>
          <Button size="lg" asChild variant="secondary" className="text-base px-10 h-14">
            <Link href="/register">Buat Akun Gratis</Link>
          </Button>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 LamarKerja.AI · Dibangun dengan Next.js, FastAPI, PostgreSQL & Llama 3.2
        </div>
      </footer>
    </div>
  );
}