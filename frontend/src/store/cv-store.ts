import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { useAuthStore } from "./auth-store";
import type { CV, ATSScoreResult, CoverLetterResult, CoverLetterListItem, CoverLetterDetail } from "@/types";

interface CVState {
  cvs: CV[];
  currentCV: CV | null;
  latestScore: ATSScoreResult | null;
  scoredCVId: string | null;
  latestCoverLetter: CoverLetterResult | null;
  letterForCVId: string | null;              // 🔥 BARU
  coverLetters: CoverLetterListItem[];
  isUploading: boolean;
  isScoring: boolean;
  isGeneratingLetter: boolean;
  error: string | null;

  uploadCV: (file: File) => Promise<CV>;
  scoreCV: (cvId: string, jobDescription: string, targetRole?: string) => Promise<ATSScoreResult>;
  generateCoverLetter: (
    cvId: string,
    jobDescription: string,
    companyName?: string,
    targetRole?: string,
    language?: "id" | "en"
  ) => Promise<CoverLetterResult>;
  fetchCVs: () => Promise<void>;
  fetchCoverLetters: () => Promise<void>;
  fetchCoverLetterDetail: (id: string) => Promise<CoverLetterDetail>;
  setCurrentCV: (cv: CV) => void;
  clearError: () => void;
  clearAll: () => void;
}

const initialState = {
  cvs: [] as CV[],
  currentCV: null,
  latestScore: null,
  scoredCVId: null,
  latestCoverLetter: null,
  letterForCVId: null,                       // 🔥 BARU
  coverLetters: [],
  isUploading: false,
  isScoring: false,
  isGeneratingLetter: false,
  error: null,
};

export const useCVStore = create<CVState>()(
  persist(
    (set) => ({
      ...initialState,

      uploadCV: async (file) => {
        set({ isUploading: true, error: null });
        try {
          const formData = new FormData();
          formData.append("file", file);

          const response = await apiClient.post("/api/v1/cvs/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          const cvData = response.data.cv || response.data;
          const cv: CV = cvData;

          set((state) => ({
            cvs: [cv, ...state.cvs],
            currentCV: cv,
            isUploading: false,
          }));
          return cv;
        } catch (err) {
          const message = getApiErrorMessage(err, "Gagal upload CV");
          set({ error: message, isUploading: false });
          throw err;
        }
      },

      scoreCV: async (cvId, jobDescription, targetRole) => {
        set({ isScoring: true, error: null });
        try {
          const response = await apiClient.post("/api/v1/ats/score", {
            cv_id: cvId,
            job_description: jobDescription,
            target_role: targetRole,
          });

          const score: ATSScoreResult = response.data;
          set({
            latestScore: score,
            scoredCVId: cvId,
            isScoring: false,
          });
          return score;
        } catch (err) {
          const message = getApiErrorMessage(err, "Gagal menghitung skor ATS");
          set({ error: message, isScoring: false });
          throw err;
        }
      },

            generateCoverLetter: async (cvId, jobDescription, companyName, targetRole, language = "id") => {
        set({ isGeneratingLetter: true, error: null });
        try {
          const response = await apiClient.post("/api/v1/cover-letters/generate", {
            cv_id: cvId,
            job_description: jobDescription,
            company_name: companyName,
            target_role: targetRole,
            language,
          });

          const letter: CoverLetterResult = response.data;
          set({
            latestCoverLetter: letter,
            letterForCVId: cvId,
            isGeneratingLetter: false,
          });
          return letter;
        } catch (err) {
          const message = getApiErrorMessage(err, "Gagal generate cover letter");
          set({ error: message, isGeneratingLetter: false });
          throw err;
        }
      },

      fetchCVs: async () => {
        set({ error: null });
        try {
          const response = await apiClient.get("/api/v1/cvs/my-cvs");
          const cvs: CV[] = response.data;
          set({ cvs });
        } catch (err) {
          const message = getApiErrorMessage(err, "Gagal memuat daftar CV");
          set({ error: message });
        }
      },

      fetchCoverLetters: async () => {
        try {
          const response = await apiClient.get("/api/v1/cover-letters/my-letters");
          set({ coverLetters: response.data });
        } catch (err) {
          const message = getApiErrorMessage(err, "Gagal memuat riwayat cover letter");
          set({ error: message });
        }
      },

      fetchCoverLetterDetail: async (id) => {
        const response = await apiClient.get(`/api/v1/cover-letters/${id}`);
        return response.data as CoverLetterDetail;
      },

      setCurrentCV: (cv) => set({ currentCV: cv }),
      clearError: () => set({ error: null }),
      clearAll: () => set(initialState),
    }),
    {
      name: "lamarkerja-cv",
      partialize: (state) => ({
        cvs: state.cvs,
        currentCV: state.currentCV,
        latestScore: state.latestScore,
        scoredCVId: state.scoredCVId,
        latestCoverLetter: state.latestCoverLetter,
        letterForCVId: state.letterForCVId,   // 🔥 BARU: persist survive refresh
      }),
    }
  )
);

// ========================================
// SUBSCRIPTION: Auto-clear CV store saat user logout / ganti akun
// ========================================
if (typeof window !== "undefined") {
  let lastToken = useAuthStore.getState().token;

  useAuthStore.subscribe((state) => {
    const currentToken = state.token;

    if (currentToken !== lastToken) {
      console.log("🔐 Auth berubah (logout/ganti akun) → Membersihkan data CV lokal");
      useCVStore.getState().clearAll();
    }

    lastToken = currentToken;
  });
}