import { jsPDF } from "jspdf";

/**
 * Export teks cover letter menjadi PDF format A4.
 * Font Times (formal), margin 20mm, multi-halaman otomatis.
 */
export function exportCoverLetterToPdf(letterText: string, fileName: string): void {
  if (!letterText.trim()) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();   // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 6;

  // Font formal untuk surat lamaran
  doc.setFont("times", "normal");
  doc.setFontSize(11);

  // Pecah teks agar muat lebar halaman (empty line antar paragraf tetap terjaga)
  const lines = doc.splitTextToSize(letterText, maxWidth) as string[];

  let y = margin;
  for (const line of lines) {
    // Jika melewati batas bawah → halaman baru
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  }

  doc.save(fileName);
}

/**
 * Deteksi bahasa surat secara sederhana untuk penamaan file.
 */
export function detectLetterLanguage(text: string): "id" | "en" {
  return /Sincerely,|Dear Hiring Manager/i.test(text) ? "en" : "id";
}

/**
 * Nama file PDF yang rapi: CoverLetter_Tokopedia_EN_2026-10-08.pdf
 */
export function buildCoverLetterFileName(
  companyName: string | null | undefined,
  language: "id" | "en"
): string {
  const safeCompany = (companyName || "Umum").replace(/[^\w\-]+/g, "_");
  const date = new Date().toISOString().slice(0, 10);
  const lang = language === "en" ? "EN" : "ID";
  return `CoverLetter_${safeCompany}_${lang}_${date}.pdf`;
}