import type { jsPDF } from 'jspdf';

export type PdfRgb = [number, number, number];

/**
 * Paleta espejada de los tokens CSS de ECUBOX (`src/index.css`).
 * Es la ÚNICA fuente de verdad de color para PDFs y Excel del sistema.
 *
 * Cualquier documento generado (PDF interno, PDF público de tracking,
 * XLSX y reportes del backend) debe consumir estos tokens para mantener
 * coherencia visual con la web.
 */
export const ECUBOX_PDF_COLORS = {
  background: [246, 247, 249] as PdfRgb,
  card: [255, 255, 255] as PdfRgb,
  cardSoft: [251, 250, 255] as PdfRgb,
  cardHeader: [244, 240, 254] as PdfRgb,
  text: [10, 22, 40] as PdfRgb,
  textStrong: [3, 11, 25] as PdfRgb,
  muted: [107, 114, 128] as PdfRgb,
  border: [226, 230, 237] as PdfRgb,
  borderSoft: [237, 233, 250] as PdfRgb,
  primary: [123, 63, 228] as PdfRgb,
  primaryDark: [86, 32, 188] as PdfRgb,
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
  white: [255, 255, 255] as PdfRgb,
};

/**
 * Equivalencias en HEX (sin '#') para usar en ExcelJS / Apache POI.
 * Espejo 1:1 de `ECUBOX_PDF_COLORS`.
 */
export const ECUBOX_HEX_COLORS = {
  background: 'F6F7F9',
  card: 'FFFFFF',
  cardSoft: 'FBFAFF',
  cardHeader: 'F4F0FE',
  text: '0A1628',
  textStrong: '030B19',
  muted: '6B7280',
  border: 'E2E6ED',
  borderSoft: 'EDE9FA',
  primary: '7B3FE4',
  primaryDark: '5620BC',
  primarySoftFill: 'F4F0FE',
  primarySoftStroke: 'CBB8F6',
  success: '16A34A',
  successFill: 'E4F7E9',
  successStroke: 'A7DBB8',
  warning: 'B45F06',
  warningFill: 'FEF3DC',
  warningStroke: 'F0C46E',
  info: '2563EB',
  infoFill: 'E8F0FF',
  infoStroke: '94B8F7',
  destructive: 'DA291C',
  destructiveFill: 'FDE6E4',
  destructiveStroke: 'F0A7A2',
  row: 'F9F7FE',
  white: 'FFFFFF',
};

/**
 * Tokens de spacing/tipografía para los documentos internos del sistema
 * (manifiestos, despachos, etc.). Son las constantes que evitan overlaps
 * porque cada bloque conoce su altura mínima.
 */
export const PDF_DOC = {
  // Geometría (mm) — A4 horizontal por defecto.
  pageW: 297,
  pageH: 210,
  margin: 12,
  headerH: 22,
  footerY: 203,
  contentBottom: 196,

  // Espaciado vertical entre bloques.
  gap: 5,
  gapSm: 3,
  gapLg: 7,

  // Cards
  cardRadius: 1.8,
  cardPadX: 3.2,
  cardPadY: 3.2,

  // Tipografía
  fonts: {
    title: 15,
    subtitle: 9,
    sectionTitle: 9.5,
    metaLabel: 6.8,
    metaValue: 9,
    kpiLabel: 6.5,
    kpiValue: 13.5,
    tableHeader: 7.6,
    tableCell: 8.2,
    badge: 7.2,
    footer: 7.5,
    total: 10,
  },

  // Tabla
  rowMinH: 6.4,
  rowLineH: 3.7,
  cellPadX: 2.2,
} as const;

/**
 * Tema legacy mantenido por compatibilidad con builders previos. Los nuevos
 * builders deben usar `ECUBOX_PDF_COLORS` y `PDF_DOC` directamente.
 *
 * @deprecated Use `ECUBOX_PDF_COLORS` y `PDF_DOC`.
 */
export const PDF_THEME = {
  margin: PDF_DOC.margin,
  pageWidthLandscape: PDF_DOC.pageW,
  pageBottom: PDF_DOC.contentBottom,
  colors: {
    text: ECUBOX_PDF_COLORS.text,
    muted: ECUBOX_PDF_COLORS.muted,
    border: ECUBOX_PDF_COLORS.border,
    accent: ECUBOX_PDF_COLORS.primary,
    row: ECUBOX_PDF_COLORS.row,
  },
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
  doc.setTextColor(...ECUBOX_PDF_COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(text, x, y);
}

export function setPdfSubtitle(doc: jsPDF, text: string, x: number, y: number) {
  doc.setTextColor(...ECUBOX_PDF_COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(text, x, y);
}

export function drawDivider(doc: jsPDF, x: number, y: number, width: number) {
  doc.setDrawColor(...ECUBOX_PDF_COLORS.border);
  doc.line(x, y, x + width, y);
}

export function drawFooter(doc: jsPDF, text: string) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...ECUBOX_PDF_COLORS.muted);
    doc.text(text, PDF_DOC.margin, 206);
    doc.text(`Página ${i}/${total}`, 277, 206, { align: 'right' });
  }
}

/** Dibuja el borde de una "card" (rectángulo) para una sección. */
export function drawCardBorder(
  doc: jsPDF,
  x: number,
  yStart: number,
  width: number,
  yEnd: number,
) {
  doc.setDrawColor(...ECUBOX_PDF_COLORS.border);
  doc.rect(x, yStart, width, Math.max(2, yEnd - yStart));
}
