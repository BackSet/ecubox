import type { jsPDF } from 'jspdf';

export type PdfRgb = [number, number, number];

/**
 * Tema base para PDFs internos (despachos, manifiestos, etc.).
 * Mantiene compatibilidad histórica con builders previos.
 */
export const PDF_THEME = {
  margin: 10,
  pageWidthLandscape: 297,
  pageBottom: 200,
  colors: {
    text: [18, 24, 39] as PdfRgb,
    muted: [98, 108, 129] as PdfRgb,
    border: [200, 206, 220] as PdfRgb,
    accent: [71, 95, 167] as PdfRgb,
    row: [245, 247, 252] as PdfRgb,
  },
};

/**
 * Paleta espejada de los tokens CSS de ECUBOX (`src/index.css`).
 * Estos valores se usan en builders que deben mantener consistencia visual
 * con la web (ej. tracking público).
 */
export const ECUBOX_PDF_COLORS = {
  background: [246, 247, 249] as PdfRgb,
  card: [255, 255, 255] as PdfRgb,
  cardSoft: [251, 250, 255] as PdfRgb,
  cardHeader: [244, 240, 254] as PdfRgb,
  text: [10, 22, 40] as PdfRgb,
  muted: [107, 114, 128] as PdfRgb,
  border: [226, 230, 237] as PdfRgb,
  borderSoft: [237, 233, 250] as PdfRgb,
  primary: [123, 63, 228] as PdfRgb,
  primarySoftFill: [244, 240, 254] as PdfRgb,
  primarySoftStroke: [203, 184, 246] as PdfRgb,
  success: [22, 163, 74] as PdfRgb,
  successFill: [228, 247, 233] as PdfRgb,
  successStroke: [167, 219, 184] as PdfRgb,
  warning: [180, 95, 6] as PdfRgb,
  warningFill: [254, 243, 220] as PdfRgb,
  warningStroke: [240, 196, 110] as PdfRgb,
  info: [37, 99, 235] as PdfRgb,
  infoFill: [232, 240, 255] as PdfRgb,
  infoStroke: [148, 184, 247] as PdfRgb,
  destructive: [218, 41, 28] as PdfRgb,
  destructiveFill: [253, 230, 228] as PdfRgb,
  destructiveStroke: [240, 167, 162] as PdfRgb,
  row: [249, 247, 254] as PdfRgb,
};

export const TRACKING_COMPACT_A4_THEME = {
  margin: 8,
  pageWidthLandscape: 297,
  pageBottom: 200,
  lineHeight: 3.9,
  cardPadding: 3,
  sectionGap: 3,
  cardHeaderHeight: 6.6,
  cardRadius: 2.2,
  footerHeight: 9,
  contentGap: 2.2,
  colors: ECUBOX_PDF_COLORS,
  fonts: {
    title: 13,
    subtitle: 7,
    section: 9,
    body: 7.6,
    label: 6.7,
    value: 8.4,
    metric: 11,
    badge: 6.6,
  },
};

export function setPdfTitle(doc: jsPDF, text: string, x: number, y: number) {
  doc.setTextColor(...PDF_THEME.colors.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(text, x, y);
}

export function setPdfSubtitle(doc: jsPDF, text: string, x: number, y: number) {
  doc.setTextColor(...PDF_THEME.colors.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(text, x, y);
}

export function drawDivider(doc: jsPDF, x: number, y: number, width: number) {
  doc.setDrawColor(...PDF_THEME.colors.border);
  doc.line(x, y, x + width, y);
}

export function drawFooter(doc: jsPDF, text: string) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_THEME.colors.muted);
    doc.text(text, PDF_THEME.margin, 206);
    doc.text(`Página ${i}/${total}`, 277, 206, { align: 'right' });
  }
}

/** Dibuja el borde de una "card" (rectángulo) para una sección. */
export function drawCardBorder(
  doc: jsPDF,
  x: number,
  yStart: number,
  width: number,
  yEnd: number
) {
  doc.setDrawColor(...PDF_THEME.colors.border);
  doc.rect(x, yStart, width, Math.max(2, yEnd - yStart));
}

