"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Upload, Target, PenLine, LogOut, Sparkles, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";   // ← BARU
import { useAuthStore } from "@/store/auth-store";
import { useCVStore } from "@/store/cv-store";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/upload", label: "Upload CV", icon: Upload },
  { href: "/dashboard/ats", label: "ATS Scoring", icon: Target },
  { href: "/dashboard/cover-letter", label: "Cover Letter", icon: PenLine },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const fetchCVs = useCVStore((s) => s.fetchCVs);

  useEffect(() => {
    if (isHydrated && !token) {
      router.replace("/login");
    }
  }, [isHydrated, token, router]);

  useEffect(() => {
    if (isHydrated && token) {
      fetchCVs();
    }
  }, [isHydrated, token, fetchCVs]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-xl gradient-warm flex items-center justify-center mb-4 animate-pulse shadow-warm">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            Memuat sesi Anda...
          </p>
        </div>
      </div>
    );
  }

  if (!token) return null;

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen">
      {/* ===== SIDEBAR ===== */}
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-border/50 bg-card/90 backdrop-blur-sm flex flex-col z-40">
        {/* Logo */}
        <div className="p-6 border-b border-border/50">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-warm flex items-center justify-center shadow-warm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              LamarKerja<span className="text-primary">.AI</span>
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "gradient-warm text-white shadow-warm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 🔥 THEME TOGGLE + User & Logout */}
        <div className="p-4 border-t border-border/50 space-y-2">
          {/* 🔥 NEW: Theme Toggle */}
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs text-muted-foreground">Tema</span>
            <ThemeToggle />
          </div>

          <div className="px-4 py-1 text-xs text-muted-foreground truncate" title={user?.email ?? ""}>
            {user?.email ?? "User"}
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" /> Keluar
          </Button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="ml-64 p-8 md:p-10 min-h-screen bg-background">
        {children}
      </main>
    </div>
  );
}