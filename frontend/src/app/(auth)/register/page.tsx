"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react"; // 🔥 TAMBAHKAN useState
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, Lock, User, Sparkles, AlertCircle, Eye, EyeOff } from "lucide-react"; // 🔥 TAMBAHKAN Eye, EyeOff
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";

interface RegisterFormValues {
  fullName: string;
  email: string;
  password: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const registerUser = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const storeError = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  // 🔥 STATE UNTUK SHOW/HIDE PASSWORD
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    defaultValues: { fullName: "", email: "", password: "" },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await registerUser(values.email, values.password, values.fullName);
      router.replace("/login"); // 🔥 Gunakan replace agar tidak menumpuk history
    } catch {
      // Error ditampilkan dari store
    }
  };

  return (
    <Card className="w-full max-w-md shadow-warm-lg border-border/50">
      <CardHeader className="text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl gradient-warm flex items-center justify-center mb-4 shadow-warm">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <CardTitle className="text-2xl">Buat Akun Baru</CardTitle>
        <CardDescription>
          Mulai optimasi CV Anda dalam hitungan menit
        </CardDescription>
      </CardHeader>

      <CardContent>
        {storeError && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {storeError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nama Lengkap</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="fullName"
                placeholder="Bayu Setiawan"
                className="pl-10"
                {...register("fullName", { required: "Nama wajib diisi" })}
              />
            </div>
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                className="pl-10"
                {...register("email", {
                  required: "Email wajib diisi",
                  pattern: { value: /^\S+@\S+\.\S+$/, message: "Format email tidak valid" },
                })}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"} // 🔥 UBAH TYPE DINAMIS
                placeholder="Minimal 6 karakter"
                className="pl-10 pr-10" // 🔥 TAMBAHKAN pr-10 AGAR TEKS TIDAK MENUMPUK IKON MATA
                {...register("password", {
                  required: "Password wajib diisi",
                  minLength: { value: 6, message: "Password minimal 6 karakter" },
                })}
              />
              {/* 🔥 TOMBOL SHOW/HIDE PASSWORD */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full gradient-warm text-white shadow-warm hover:shadow-warm-lg hover:opacity-95 h-11"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mendaftarkan...
              </>
            ) : (
              "Daftar Sekarang"
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Masuk di sini
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
