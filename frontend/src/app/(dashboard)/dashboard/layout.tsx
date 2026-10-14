"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Upload, Target, PenLine, LogOut, Sparkles, Loader2, Menu, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
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
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

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
    <>
      {/* ===== MOBILE LAYOUT (< 1024px) ===== */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        <header className="fixed top-0 left-0 right-0 z-40 h-16 border-b border-border/50 bg-background/95 backdrop-blur-md">
          <div className="flex h-full items-center justify-between px-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl gradient-warm flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg">LamarKerja.AI</span>
            </Link>
            
            <div className="w-9" />
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 border-r border-border/50 bg-card shadow-2xl transition-transform duration-300",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="h-16 flex items-center justify-between px-6 border-b border-border/50">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl gradient-warm flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">LamarKerja.AI</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium",
                    active
                      ? "gradient-warm text-white shadow-warm"
                      : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/50 space-y-2">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs text-muted-foreground">Tema</span>
              <ThemeToggle />
            </div>
            <div className="px-3 py-2 text-xs text-muted-foreground truncate">
              {user?.email}
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Keluar
            </Button>
          </div>
        </aside>

        {/* Mobile Main Content */}
        <main className="pt-16 min-h-screen">
          <div className="p-4">
            {children}
          </div>
        </main>
      </div>

      {/* ===== DESKTOP LAYOUT (≥ 1024px) ===== */}
      <div className="hidden lg:block">
        {/* Desktop Sidebar (Static) */}
        <aside className="fixed top-0 left-0 z-30 h-full w-64 border-r border-border/50 bg-card">
          <div className="h-16 flex items-center px-6 border-b border-border/50">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl gradient-warm flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">LamarKerja.AI</span>
            </Link>
          </div>

          <nav className="p-4 space-y-1">
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
                      : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/50 space-y-2">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs text-muted-foreground">Tema</span>
              <ThemeToggle />
            </div>
            <div className="px-3 py-2 text-xs text-muted-foreground truncate">
              {user?.email}
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Keluar
            </Button>
          </div>
        </aside>

        {/* Desktop Main Content */}
        <main className="ml-64 min-h-screen">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
