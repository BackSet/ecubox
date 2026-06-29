import type { jsPDF } from 'jspdf';
import {
  ECUBOX_LOGO_HORIZONTAL_DARK_DATA_URL,
  ECUBOX_LOGO_HORIZONTAL_LIGHT_DATA_URL,
} from '@/lib/pdf/generated-brand-logo-data';

const LOGO_HORIZONTAL_RATIO = 210 / 56;

export interface DrawEcuboxPdfLogoOptions {
  x: number;
  y: number;
  width: number;
  tone: 'light' | 'dark';
}

export function getEcuboxPdfLogoHeight(width: number): number {
  return width / LOGO_HORIZONTAL_RATIO;
}

export function drawEcuboxPdfLogo(
  doc: jsPDF,
  { x, y, width, tone }: DrawEcuboxPdfLogoOptions,
): void {
  const logoDataUrl =
    tone === 'dark'
      ? ECUBOX_LOGO_HORIZONTAL_DARK_DATA_URL
      : ECUBOX_LOGO_HORIZONTAL_LIGHT_DATA_URL;

  doc.addImage(
    logoDataUrl,
    'PNG',
    x,
    y,
    width,
    getEcuboxPdfLogoHeight(width),
    `ecubox-logo-horizontal-${tone}`,
    'FAST',
  );
}
