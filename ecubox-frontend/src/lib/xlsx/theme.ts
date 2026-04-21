import type ExcelJS from 'exceljs';
import { ECUBOX_HEX_COLORS } from '@/lib/pdf/theme';

/**
 * Tokens visuales para Excel (ExcelJS). Espejan la paleta de marca de ECUBOX
 * declarada en `lib/pdf/theme.ts`, garantizando que el PDF y el XLSX
 * comparten exactamente los mismos colores.
 *
 * La fuente es Calibri por compatibilidad nativa con Office; los pesos y
 * tamaños están elegidos para que el documento sea legible en pantalla y
 * en impresión.
 */
export const XLSX_COLORS = ECUBOX_HEX_COLORS;

export const FONT_NAME = 'Calibri';

export const FONTS = {
  title: { name: FONT_NAME, bold: true, size: 14, color: { argb: XLSX_COLORS.white } },
  subtitle: {
    name: FONT_NAME,
    italic: true,
    size: 9,
    color: { argb: XLSX_COLORS.muted },
  },
  badge: {
    name: FONT_NAME,
    bold: true,
    size: 10,
    color: { argb: XLSX_COLORS.white },
  },
  metaLabel: {
    name: FONT_NAME,
    bold: true,
    size: 9,
    color: { argb: XLSX_COLORS.muted },
  },
  metaValue: { name: FONT_NAME, size: 11, color: { argb: XLSX_COLORS.text } },
  sectionTitle: {
    name: FONT_NAME,
    bold: true,
    size: 12,
    color: { argb: XLSX_COLORS.primary },
  },
  tableHeader: {
    name: FONT_NAME,
    bold: true,
    size: 10,
    color: { argb: XLSX_COLORS.white },
  },
  cell: { name: FONT_NAME, size: 10, color: { argb: XLSX_COLORS.text } },
  cellMono: { name: 'Consolas', bold: true, size: 10, color: { argb: XLSX_COLORS.text } },
  total: { name: FONT_NAME, bold: true, size: 10, color: { argb: XLSX_COLORS.text } },
  totalLight: {
    name: FONT_NAME,
    bold: true,
    size: 11,
    color: { argb: XLSX_COLORS.white },
  },
  footer: {
    name: FONT_NAME,
    italic: true,
    size: 8,
    color: { argb: XLSX_COLORS.muted },
  },
} satisfies Record<string, Partial<ExcelJS.Font>>;

export const FILLS = {
  primary: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: XLSX_COLORS.primary },
  } satisfies ExcelJS.Fill,
  primaryDark: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: XLSX_COLORS.primaryDark },
  } satisfies ExcelJS.Fill,
  primarySoft: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: XLSX_COLORS.primarySoftFill },
  } satisfies ExcelJS.Fill,
  cardHeader: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: XLSX_COLORS.cardHeader },
  } satisfies ExcelJS.Fill,
  zebra: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: XLSX_COLORS.row },
  } satisfies ExcelJS.Fill,
  successFill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: XLSX_COLORS.successFill },
  } satisfies ExcelJS.Fill,
  warningFill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: XLSX_COLORS.warningFill },
  } satisfies ExcelJS.Fill,
  destructiveFill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: XLSX_COLORS.destructiveFill },
  } satisfies ExcelJS.Fill,
};
