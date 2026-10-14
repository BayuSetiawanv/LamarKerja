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

  // Close sidebar on route change (mobile)
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
    <div className="min-h-screen bg-background">
      {/* ===== MOBILE HEADER (Only visible on < 1024px) ===== */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-16 border-b border-border/50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-full items-center justify-between px-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSidebarOpen(true)}
            className="hover:bg-accent/50"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl gradient-warm flex items-center justify-center shadow-warm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              LamarKerja<span className="text-primary">.AI</span>
            </span>
          </Link>
          
          <div className="w-9" /> {/* Spacer untuk center logo */}
        </div>
      </header>

      {/* ===== OVERLAY (Mobile sidebar backdrop) ===== */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ===== SIDEBAR ===== */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 border-r border-border/50 bg-card/95 backdrop-blur-md shadow-xl transition-all duration-300 ease-in-out",
        "lg:translate-x-0 lg:static lg:shadow-none",
        isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border/50">
          <Link href="/" className="flex items-center gap-2" onClick={() => setIsSidebarOpen(false)}>
            <div className="w-9 h-9 rounded-xl gradient-warm flex items-center justify-center shadow-warm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              LamarKerja<span className="text-primary">.AI</span>
            </span>
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden hover:bg-accent/50"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  "hover:translate-x-1",
                  active
                    ? "gradient-warm text-white shadow-warm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", active && "text-white")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer Section (Theme + User + Logout) */}
        <div className="p-4 border-t border-border/50 space-y-2 bg-card/50">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-background/50">
            <span className="text-xs text-muted-foreground font-medium">Tema</span>
            <ThemeToggle />
          </div>

          {/* User Email */}
          <div className="px-3 py-2 text-xs text-muted-foreground truncate font-medium" title={user?.email ?? ""}>
            {user?.email ?? "User"}
          </div>

          {/* Logout Button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className={cn(
        "min-h-screen transition-all duration-300",
        "lg:ml-64",
        "pt-16 lg:pt-0"
      )}>
        <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
