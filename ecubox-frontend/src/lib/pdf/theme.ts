import type { jsPDF } from 'jspdf';

export const PDF_THEME = {
  margin: 10,
  pageWidthLandscape: 297,
  pageBottom: 200,
  colors: {
    text: [18, 24, 39] as [number, number, number],
    muted: [98, 108, 129] as [number, number, number],
    border: [200, 206, 220] as [number, number, number],
    accent: [71, 95, 167] as [number, number, number],
    row: [245, 247, 252] as [number, number, number],
  },
};

export const TRACKING_COMPACT_A4_THEME = {
  ...PDF_THEME,
  margin: 8,
  lineHeight: 3.9,
  cardPadding: 2.5,
  sectionGap: 2.5,
  cardHeaderHeight: 6,
  cardRadius: 1.6,
  footerHeight: 8,
  contentGap: 1.8,
  fonts: {
    title: 12,
    subtitle: 7,
    section: 9,
    body: 7.5,
    label: 6.8,
    value: 8,
    metric: 11,
    badge: 6.5,
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

