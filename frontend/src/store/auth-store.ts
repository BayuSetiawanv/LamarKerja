import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios, { AxiosError } from "axios";
import { apiClient } from "@/lib/api-client";

export interface User {
  id: string;
  email: string;
  full_name?: string;
}

// Helper function untuk ekstrak pesan error secara type-safe
function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<{ detail?: string }>;
    return axiosErr.response?.data?.detail || axiosErr.message || fallback;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isHydrated: boolean; // ← Track apakah Zustand selesai load dari localStorage

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setHydrated: () => void; // ← BARU: setter untuk menandai rehydration selesai
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isHydrated: false, // ← BARU: awal false, jadi true setelah rehydration

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const formData = new URLSearchParams();
          formData.append("username", email);
          formData.append("password", password);

          const response = await apiClient.post(
            "/api/v1/auth/login",
            formData,
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
          );

          const { access_token } = response.data;
          localStorage.setItem("access_token", access_token);

          const payload = JSON.parse(atob(access_token.split(".")[1]));
          const user: User = {
            id: payload.sub,
            email: payload.sub,
          };

          set({
            user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err: unknown) {
          const errorMessage = extractErrorMessage(err, "Login gagal");
          set({ error: errorMessage, isLoading: false });
          throw err;
        }
      },

      register: async (email, password, fullName) => {
        set({ isLoading: true, error: null });
        try {
          await apiClient.post("/api/v1/auth/register", {
            email,
            password,
            full_name: fullName,
          });
          set({ isLoading: false });
        } catch (err: unknown) {
          const errorMessage = extractErrorMessage(err, "Registrasi gagal");
          set({ error: errorMessage, isLoading: false });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem("access_token");
        set({ user: null, token: null, isAuthenticated: false });
      },

      clearError: () => set({ error: null }),
      
      // BARU: method untuk menandai rehydration selesai
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: "lamarkerja-auth",
      partialize: (state) => ({
        token: state.token,
        user: state.user, // ← Juga persist user agar tidak perlu parse ulang JWT
      }),
      // BARU: callback yang jalan setelah Zustand selesai load dari localStorage
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated();
        }
      },
    }
  )
);