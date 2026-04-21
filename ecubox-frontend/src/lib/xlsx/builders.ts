import type ExcelJS from 'exceljs';
import { FILLS, FONTS, XLSX_COLORS } from '@/lib/xlsx/theme';

/**
 * Helpers compartidos para construir XLSX consistentes en todo el sistema.
 *
 * Cada función dibuja un bloque (banner, caja de metadatos, cabecera de
 * tabla, fila de datos, totales, pie) con la paleta morada de marca y
 * devuelve la siguiente fila libre, evitando que el caller calcule offsets
 * a mano (que es donde aparecían las superposiciones).
 */

export interface ColumnDef {
  key: string;
  label: string;
  width: number;
  align: 'left' | 'center' | 'right';
  numFmt?: string;
  /** Si es `true` se aplica wrap text. */
  wrap?: boolean;
  /** Si es `true` se renderiza con fuente monospace en las celdas. */
  mono?: boolean;
}

// ============================================================
// Estilos básicos
// ============================================================

export function applyBorders(cell: ExcelJS.Cell, color = XLSX_COLORS.border) {
  cell.border = {
    top: { style: 'thin', color: { argb: color } },
    bottom: { style: 'thin', color: { argb: color } },
    left: { style: 'thin', color: { argb: color } },
    right: { style: 'thin', color: { argb: color } },
  };
}

export function setColumnWidths(ws: ExcelJS.Worksheet, cols: ColumnDef[]) {
  cols.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width;
  });
}

export function columnLetter(col: number): string {
  let s = '';
  let n = col;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// ============================================================
// Banner superior
// ============================================================

export interface HeaderBannerOpts {
  titulo: string;
  subtitulo: string;
  badge?: string;
}

export function buildHeaderBanner(
  ws: ExcelJS.Worksheet,
  startRow: number,
  totalCols: number,
  opts: HeaderBannerOpts,
): number {
  const { titulo, subtitulo, badge } = opts;

  // Fila 1: título (banda morada) + badge a la derecha.
  const tRow = ws.getRow(startRow);
  tRow.height = 30;

  const tCell = tRow.getCell(1);
  tCell.value = titulo;
  tCell.font = FONTS.title;
  tCell.fill = FILLS.primary;
  tCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.mergeCells(startRow, 1, startRow, badge ? totalCols - 1 : totalCols);

  // Pintar el resto de columnas con el mismo color para que la banda
  // se extienda a todo el ancho aunque no estén fusionadas.
  for (let c = 2; c <= totalCols; c++) {
    const cc = tRow.getCell(c);
    if (!cc.fill) cc.fill = FILLS.primary;
  }

  if (badge) {
    const badgeCell = tRow.getCell(totalCols);
    badgeCell.value = badge;
    badgeCell.font = FONTS.badge;
    badgeCell.fill = FILLS.primaryDark;
    badgeCell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  // Fila 2: subtítulo
  const sRow = ws.getRow(startRow + 1);
  sRow.height = 16;
  const sCell = sRow.getCell(1);
  sCell.value = subtitulo;
  sCell.font = FONTS.subtitle;
  sCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.mergeCells(startRow + 1, 1, startRow + 1, totalCols);

  // Línea de respiro
  return startRow + 3;
}

// ============================================================
// Caja de metadatos (label/value en 2 columnas)
// ============================================================

export type MetaRow = [string, string, string, string];

export function buildMetaBox(
  ws: ExcelJS.Worksheet,
  startRow: number,
  totalCols: number,
  filas: MetaRow[],
): number {
  const mid = Math.floor(totalCols / 2);
  filas.forEach((fila) => {
    const r = ws.getRow(startRow);
    r.height = 19;

    const lab1 = r.getCell(1);
    lab1.value = fila[0];
    lab1.font = FONTS.metaLabel;
    lab1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    lab1.fill = FILLS.cardHeader;
    applyBorders(lab1);

    const val1 = r.getCell(2);
    val1.value = fila[1];
    val1.font = FONTS.metaValue;
    val1.alignment = { horizontal: 'left', vertical: 'middle' };
    applyBorders(val1);
    ws.mergeCells(startRow, 2, startRow, mid);

    const lab2 = r.getCell(mid + 1);
    lab2.value = fila[2];
    lab2.font = FONTS.metaLabel;
    lab2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    lab2.fill = FILLS.cardHeader;
    applyBorders(lab2);

    const val2 = r.getCell(mid + 2);
    val2.value = fila[3];
    val2.font = FONTS.metaValue;
    val2.alignment = { horizontal: 'left', vertical: 'middle' };
    applyBorders(val2);
    ws.mergeCells(startRow, mid + 2, startRow, totalCols);

    startRow++;
  });
  return startRow;
}

// ============================================================
// Título de sección
// ============================================================

export function buildSectionTitle(
  ws: ExcelJS.Worksheet,
  rowIdx: number,
  totalCols: number,
  title: string,
): number {
  const r = ws.getRow(rowIdx);
  r.height = 22;
  const cell = r.getCell(1);
  cell.value = title;
  cell.font = FONTS.sectionTitle;
  cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.mergeCells(rowIdx, 1, rowIdx, totalCols);
  return rowIdx + 1;
}

// ============================================================
// Tabla
// ============================================================

export function buildTableHeader(
  ws: ExcelJS.Worksheet,
  rowIdx: number,
  cols: ColumnDef[],
): ExcelJS.Row {
  const row = ws.getRow(rowIdx);
  row.height = 24;
  cols.forEach((c, i) => {
    const cell = row.getCell(i + 1);
    cell.value = c.label;
    cell.font = FONTS.tableHeader;
    cell.fill = FILLS.primary;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyBorders(cell, XLSX_COLORS.primaryDark);
  });
  return row;
}

export function applyDataRow(
  ws: ExcelJS.Worksheet,
  rowIdx: number,
  cols: ColumnDef[],
  values: (string | number | null | undefined)[],
  zebra: boolean,
) {
  const row = ws.getRow(rowIdx);
  row.height = 18;
  cols.forEach((c, i) => {
    const cell = row.getCell(i + 1);
    const v = values[i];
    if (v == null || v === '') {
      cell.value = '';
    } else {
      cell.value = v as ExcelJS.CellValue;
    }
    cell.font = c.mono ? FONTS.cellMono : FONTS.cell;
    cell.alignment = {
      horizontal: c.align,
      vertical: 'middle',
      wrapText: c.wrap === true,
    };
    if (c.numFmt && typeof v === 'number') cell.numFmt = c.numFmt;
    if (zebra) cell.fill = FILLS.zebra;
    applyBorders(cell);
  });
}

// ============================================================
// Subgrupo (encabezado de saca, etc.)
// ============================================================

export function buildGroupHeader(
  ws: ExcelJS.Worksheet,
  rowIdx: number,
  totalCols: number,
  text: string,
): number {
  const r = ws.getRow(rowIdx);
  r.height = 22;
  const cell = r.getCell(1);
  cell.value = text;
  cell.font = { ...FONTS.total, color: { argb: XLSX_COLORS.primary } };
  cell.fill = FILLS.cardHeader;
  cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  applyBorders(cell, XLSX_COLORS.primarySoftStroke);
  ws.mergeCells(rowIdx, 1, rowIdx, totalCols);
  for (let c = 2; c <= totalCols; c++) {
    const cc = r.getCell(c);
    cc.fill = FILLS.cardHeader;
    applyBorders(cc, XLSX_COLORS.primarySoftStroke);
  }
  return rowIdx + 1;
}

// ============================================================
// Subtotal y total general
// ============================================================

export interface TotalCell {
  /** Índice de columna (1-based) donde va el valor. */
  col: number;
  value: number;
  numFmt?: string;
}

export function buildSubtotalRow(
  ws: ExcelJS.Worksheet,
  rowIdx: number,
  totalCols: number,
  label: string,
  totals: TotalCell[],
): number {
  const r = ws.getRow(rowIdx);
  r.height = 21;
  const lastTotalCol = totals.length > 0 ? Math.min(...totals.map((t) => t.col)) - 1 : totalCols;

  const labelCell = r.getCell(1);
  labelCell.value = label;
  labelCell.font = FONTS.total;
  labelCell.fill = FILLS.primarySoft;
  labelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  applyBorders(labelCell, XLSX_COLORS.primarySoftStroke);
  if (lastTotalCol > 1) {
    ws.mergeCells(rowIdx, 1, rowIdx, lastTotalCol);
    for (let c = 2; c <= lastTotalCol; c++) {
      const cc = r.getCell(c);
      cc.fill = FILLS.primarySoft;
      applyBorders(cc, XLSX_COLORS.primarySoftStroke);
    }
  }

  totals.forEach((t) => {
    const cell = r.getCell(t.col);
    cell.value = t.value;
    cell.font = FONTS.total;
    cell.fill = FILLS.primarySoft;
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    if (t.numFmt) cell.numFmt = t.numFmt;
    applyBorders(cell, XLSX_COLORS.primarySoftStroke);
  });
  return rowIdx + 1;
}

export function buildTotalGeneralRow(
  ws: ExcelJS.Worksheet,
  rowIdx: number,
  totalCols: number,
  label: string,
  totals: TotalCell[],
): number {
  const r = ws.getRow(rowIdx);
  r.height = 26;
  const lastLabelCol = totals.length > 0 ? Math.min(...totals.map((t) => t.col)) - 1 : totalCols;

  const labelCell = r.getCell(1);
  labelCell.value = label;
  labelCell.font = FONTS.totalLight;
  labelCell.fill = FILLS.primary;
  labelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  applyBorders(labelCell, XLSX_COLORS.primaryDark);
  if (lastLabelCol > 1) {
    ws.mergeCells(rowIdx, 1, rowIdx, lastLabelCol);
    for (let c = 2; c <= lastLabelCol; c++) {
      const cc = r.getCell(c);
      cc.fill = FILLS.primary;
      applyBorders(cc, XLSX_COLORS.primaryDark);
    }
  }

  totals.forEach((t) => {
    const cell = r.getCell(t.col);
    cell.value = t.value;
    cell.font = FONTS.totalLight;
    cell.fill = FILLS.primary;
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    if (t.numFmt) cell.numFmt = t.numFmt;
    applyBorders(cell, XLSX_COLORS.primaryDark);
  });
  return rowIdx + 1;
}

// ============================================================
// Pie y configuración de impresión
// ============================================================

export function buildPie(
  ws: ExcelJS.Worksheet,
  rowIdx: number,
  totalCols: number,
  text: string,
): number {
  const r = ws.getRow(rowIdx);
  r.height = 14;
  const cell = r.getCell(1);
  cell.value = text;
  cell.font = FONTS.footer;
  cell.alignment = { horizontal: 'right', vertical: 'middle' };
  ws.mergeCells(rowIdx, 1, rowIdx, totalCols);
  return rowIdx + 1;
}

export function configurePrint(ws: ExcelJS.Worksheet, totalCols: number) {
  ws.pageSetup.orientation = 'landscape';
  ws.pageSetup.paperSize = 9; // A4
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;
  ws.pageSetup.fitToHeight = 0;
  ws.pageSetup.margins = {
    left: 0.4,
    right: 0.4,
    top: 0.5,
    bottom: 0.5,
    header: 0.2,
    footer: 0.2,
  };
  ws.pageSetup.printArea = `A1:${columnLetter(totalCols)}1000`;
}

// ============================================================
// Descargador genérico
// ============================================================

export async function downloadWorkbook(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
