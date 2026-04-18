import ExcelJS from 'exceljs';
import type { DespachoEnManifiesto, Manifiesto } from '@/types/manifiesto';

/**
 * Genera un XLSX profesional del manifiesto, alineado visualmente con el del
 * despacho: banner azul, caja de metadatos, KPIs financieros, tabla con
 * grilla, filas zebra, totales y pie. Hojas: "Manifiesto" + "Resumen
 * financiero".
 */

const TIPO_LABELS: Record<string, string> = {
  DOMICILIO: 'Domicilio',
  AGENCIA: 'Agencia',
  AGENCIA_DISTRIBUIDOR: 'Agencia distribuidor',
};

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  PAGADO: 'Pagado',
  ANULADO: 'Anulado',
};

const COLORS = {
  primary: '3F51B5',
  primarySoft: 'E8EAF6',
  border: 'DCE0E8',
  zebra: 'FAFBFE',
  headerBg: 'F5F7FC',
  white: 'FFFFFF',
  text: '212529',
  muted: '6C757D',
  successBg: 'D1FADF',
  successText: '1B5E20',
  warningBg: 'FEF0C7',
  warningText: '7A4F01',
  dangerBg: 'FECACA',
  dangerText: '7F1D1D',
};

function safe(v?: string | null): string {
  return v && String(v).trim() ? String(v).trim() : '';
}

function fmtFechaCorta(s?: string | null): string {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function diasEntre(inicio?: string | null, fin?: string | null): number | null {
  if (!inicio || !fin) return null;
  const a = new Date(inicio);
  const b = new Date(fin);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const ms = b.getTime() - a.getTime();
  if (ms < 0) return null;
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

// ----- estilos -----
const FONT_TITLE: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  bold: true,
  size: 14,
  color: { argb: COLORS.white },
};
const FONT_SUBTITLE: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  italic: true,
  size: 9,
  color: { argb: COLORS.muted },
};
const FONT_LABEL: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  bold: true,
  size: 9,
  color: { argb: COLORS.muted },
};
const FONT_VALUE: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  size: 11,
  color: { argb: COLORS.text },
};
const FONT_TABLE_HEADER: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  bold: true,
  size: 10,
  color: { argb: COLORS.white },
};
const FONT_CELL: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  size: 10,
  color: { argb: COLORS.text },
};
const FONT_TOTAL: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  bold: true,
  size: 10,
  color: { argb: COLORS.text },
};
const FONT_FOOTER: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  italic: true,
  size: 8,
  color: { argb: COLORS.muted },
};

const FILL_PRIMARY: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: COLORS.primary },
};
const FILL_HEADER_BG: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: COLORS.headerBg },
};
const FILL_ZEBRA: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: COLORS.zebra },
};

function fillEstado(estado?: string | null): {
  fill: ExcelJS.Fill;
  color: string;
} {
  switch (estado) {
    case 'PAGADO':
      return {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.successBg } },
        color: COLORS.successText,
      };
    case 'ANULADO':
      return {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.dangerBg } },
        color: COLORS.dangerText,
      };
    case 'PENDIENTE':
    default:
      return {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.warningBg } },
        color: COLORS.warningText,
      };
  }
}

function applyBorders(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.border } },
    bottom: { style: 'thin', color: { argb: COLORS.border } },
    left: { style: 'thin', color: { argb: COLORS.border } },
    right: { style: 'thin', color: { argb: COLORS.border } },
  };
}

interface ColumnDef {
  key: string;
  label: string;
  width: number;
  align: 'left' | 'center' | 'right';
  numFmt?: string;
}

const DESPACHO_COLS: ColumnDef[] = [
  { key: 'idx', label: '#', width: 5, align: 'center' },
  { key: 'guia', label: 'Guía', width: 24, align: 'left' },
  { key: 'distribuidor', label: 'Distribuidor', width: 30, align: 'left' },
  { key: 'tipo', label: 'Tipo entrega', width: 18, align: 'left' },
  { key: 'agencia', label: 'Agencia', width: 26, align: 'left' },
  { key: 'destinatario', label: 'Destinatario', width: 38, align: 'left' },
];

function setColumnWidths(ws: ExcelJS.Worksheet, cols: ColumnDef[]) {
  cols.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width;
  });
}

function buildTableHeader(ws: ExcelJS.Worksheet, rowIdx: number, cols: ColumnDef[]) {
  const row = ws.getRow(rowIdx);
  row.height = 22;
  cols.forEach((c, i) => {
    const cell = row.getCell(i + 1);
    cell.value = c.label;
    cell.font = FONT_TABLE_HEADER;
    cell.fill = FILL_PRIMARY;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyBorders(cell);
  });
  return row;
}

function buildHeaderBanner(
  ws: ExcelJS.Worksheet,
  startRow: number,
  totalCols: number,
  titulo: string,
  subtitulo: string,
  badge: string,
): number {
  const tRow = ws.getRow(startRow);
  tRow.height = 28;
  const tCell = tRow.getCell(1);
  tCell.value = titulo;
  tCell.font = FONT_TITLE;
  tCell.fill = FILL_PRIMARY;
  tCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.mergeCells(startRow, 1, startRow, totalCols - 1);

  const badgeCell = tRow.getCell(totalCols);
  badgeCell.value = badge;
  badgeCell.font = { ...FONT_TITLE, size: 11 };
  badgeCell.fill = FILL_PRIMARY;
  badgeCell.alignment = { horizontal: 'right', vertical: 'middle' };

  const sRow = ws.getRow(startRow + 1);
  sRow.height = 16;
  const sCell = sRow.getCell(1);
  sCell.value = subtitulo;
  sCell.font = FONT_SUBTITLE;
  sCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.mergeCells(startRow + 1, 1, startRow + 1, totalCols);

  return startRow + 2;
}

function buildMetaBox(
  ws: ExcelJS.Worksheet,
  startRow: number,
  totalCols: number,
  filas: Array<[string, string, string, string]>,
): number {
  const mid = Math.floor(totalCols / 2);
  filas.forEach((fila) => {
    const r = ws.getRow(startRow);
    r.height = 18;
    const lab1 = r.getCell(1);
    lab1.value = fila[0];
    lab1.font = FONT_LABEL;
    lab1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    lab1.fill = FILL_HEADER_BG;
    applyBorders(lab1);

    const val1 = r.getCell(2);
    val1.value = fila[1];
    val1.font = FONT_VALUE;
    val1.alignment = { horizontal: 'left', vertical: 'middle' };
    applyBorders(val1);
    ws.mergeCells(startRow, 2, startRow, mid);

    const lab2 = r.getCell(mid + 1);
    lab2.value = fila[2];
    lab2.font = FONT_LABEL;
    lab2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    lab2.fill = FILL_HEADER_BG;
    applyBorders(lab2);

    const val2 = r.getCell(mid + 2);
    val2.value = fila[3];
    val2.font = FONT_VALUE;
    val2.alignment = { horizontal: 'left', vertical: 'middle' };
    applyBorders(val2);
    ws.mergeCells(startRow, mid + 2, startRow, totalCols);

    startRow++;
  });
  return startRow;
}

function buildSectionTitle(
  ws: ExcelJS.Worksheet,
  rowIdx: number,
  totalCols: number,
  title: string,
): number {
  const r = ws.getRow(rowIdx);
  r.height = 20;
  const cell = r.getCell(1);
  cell.value = title;
  cell.font = { ...FONT_VALUE, bold: true, color: { argb: COLORS.primary }, size: 12 };
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.mergeCells(rowIdx, 1, rowIdx, totalCols);
  return rowIdx + 1;
}

function applyDespachoRow(
  ws: ExcelJS.Worksheet,
  rowIdx: number,
  cols: ColumnDef[],
  values: (string | number | null)[],
  zebra: boolean,
) {
  const row = ws.getRow(rowIdx);
  row.height = 16;
  cols.forEach((c, i) => {
    const cell = row.getCell(i + 1);
    const v = values[i];
    cell.value = (v ?? '') as ExcelJS.CellValue;
    cell.font = FONT_CELL;
    cell.alignment = {
      horizontal: c.align,
      vertical: 'middle',
      wrapText: c.key === 'distribuidor' || c.key === 'destinatario' || c.key === 'agencia',
    };
    if (c.numFmt && typeof v === 'number') cell.numFmt = c.numFmt;
    if (zebra) cell.fill = FILL_ZEBRA;
    if (c.key === 'guia') cell.font = { ...FONT_CELL, bold: true, name: 'Consolas' };
    applyBorders(cell);
  });
}

function buildTotalGeneralRow(
  ws: ExcelJS.Worksheet,
  rowIdx: number,
  totalCols: number,
  despachos: number,
  totalPagar: number,
) {
  const r = ws.getRow(rowIdx);
  r.height = 24;
  const labelCell = r.getCell(1);
  labelCell.value = `TOTAL MANIFIESTO  ·  ${despachos} despacho${despachos === 1 ? '' : 's'}`;
  labelCell.font = { ...FONT_TOTAL, color: { argb: COLORS.white } };
  labelCell.fill = FILL_PRIMARY;
  labelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  applyBorders(labelCell);
  ws.mergeCells(rowIdx, 1, rowIdx, totalCols - 1);
  for (let c = 2; c <= totalCols - 1; c++) {
    const cc = r.getCell(c);
    cc.fill = FILL_PRIMARY;
    applyBorders(cc);
  }
  const totalCell = r.getCell(totalCols);
  totalCell.value = Number(totalPagar.toFixed(2));
  totalCell.font = { ...FONT_TOTAL, color: { argb: COLORS.white }, size: 11 };
  totalCell.numFmt = '"$"#,##0.00';
  totalCell.fill = FILL_PRIMARY;
  totalCell.alignment = { horizontal: 'right', vertical: 'middle' };
  applyBorders(totalCell);
}

function buildPie(
  ws: ExcelJS.Worksheet,
  rowIdx: number,
  totalCols: number,
  manifiesto: Manifiesto,
) {
  const r = ws.getRow(rowIdx);
  r.height = 14;
  const cell = r.getCell(1);
  const ahora = new Date().toLocaleString('es-EC', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  const codigo = safe(manifiesto.codigo) || `#${manifiesto.id}`;
  cell.value = `Generado el ${ahora}  ·  Manifiesto ${codigo}  ·  ECUBOX`;
  cell.font = FONT_FOOTER;
  cell.alignment = { horizontal: 'right', vertical: 'middle' };
  ws.mergeCells(rowIdx, 1, rowIdx, totalCols);
}

function configurePrint(ws: ExcelJS.Worksheet, totalCols: number) {
  ws.pageSetup.orientation = 'landscape';
  ws.pageSetup.paperSize = 9;
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

function columnLetter(col: number): string {
  let s = '';
  while (col > 0) {
    const r = (col - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    col = Math.floor((col - 1) / 26);
  }
  return s;
}

export interface DownloadManifiestoXlsxInput {
  manifiesto: Manifiesto;
  despachos: DespachoEnManifiesto[];
  filtroDistribuidorNombre?: string | null;
  filtroAgenciaNombre?: string | null;
}

export async function downloadManifiestoXlsx(input: DownloadManifiestoXlsxInput): Promise<void> {
  const { manifiesto, despachos, filtroDistribuidorNombre, filtroAgenciaNombre } = input;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ECUBOX';
  wb.created = new Date();

  const codigo = safe(manifiesto.codigo) || `#${manifiesto.id}`;
  const dias = diasEntre(manifiesto.fechaInicio, manifiesto.fechaFin);
  const estado = ESTADO_LABELS[manifiesto.estado] ?? manifiesto.estado;

  // ============================================================
  // Hoja 1: Manifiesto (lista de despachos)
  // ============================================================
  const ws = wb.addWorksheet('Manifiesto', {
    views: [{ showGridLines: false }],
  });
  setColumnWidths(ws, DESPACHO_COLS);
  const totalCols = DESPACHO_COLS.length;

  let row = 1;
  row = buildHeaderBanner(
    ws,
    row,
    totalCols,
    `MANIFIESTO ${codigo}`,
    'Liquidación de despachos - ECUBOX',
    estado,
  );
  row += 1;

  row = buildMetaBox(ws, row, totalCols, [
    ['Código', codigo, 'Estado', estado],
    [
      'Período',
      `${fmtFechaCorta(manifiesto.fechaInicio)} - ${fmtFechaCorta(manifiesto.fechaFin)}`,
      'Duración',
      dias != null ? `${dias} día${dias === 1 ? '' : 's'}` : '-',
    ],
    [
      'Filtro distribuidor',
      safe(filtroDistribuidorNombre ?? manifiesto.filtroDistribuidorNombre ?? 'Todos') || 'Todos',
      'Filtro agencia',
      safe(filtroAgenciaNombre ?? manifiesto.filtroAgenciaNombre ?? 'Todas') || 'Todas',
    ],
    [
      'Despachos incluidos',
      String(despachos.length),
      'Generado',
      new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }),
    ],
  ]);
  row += 1;

  // Sección financiera (banner pequeño)
  row = buildSectionTitle(ws, row, totalCols, 'Resumen financiero');

  const finRows: Array<[string, string, string, string]> = [
    [
      'Subtotal domicilio',
      String(manifiesto.subtotalDomicilio ?? 0),
      'Total distribuidor',
      String(manifiesto.totalDistribuidor ?? 0),
    ],
    [
      'Subtotal agencia (flete)',
      String(manifiesto.subtotalAgenciaFlete ?? 0),
      'Total agencia',
      String(manifiesto.totalAgencia ?? 0),
    ],
    [
      'Subtotal comisión agencias',
      String(manifiesto.subtotalComisionAgencias ?? 0),
      'TOTAL A PAGAR',
      String(manifiesto.totalPagar ?? 0),
    ],
  ];

  const mid = Math.floor(totalCols / 2);
  finRows.forEach((fila, idx) => {
    const isTotal = idx === finRows.length - 1;
    const r = ws.getRow(row);
    r.height = 20;
    const lab1 = r.getCell(1);
    lab1.value = fila[0];
    lab1.font = FONT_LABEL;
    lab1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    lab1.fill = FILL_HEADER_BG;
    applyBorders(lab1);

    const val1 = r.getCell(2);
    val1.value = Number(Number(fila[1]).toFixed(2));
    val1.numFmt = '"$"#,##0.00';
    val1.font = FONT_VALUE;
    val1.alignment = { horizontal: 'right', vertical: 'middle' };
    applyBorders(val1);
    ws.mergeCells(row, 2, row, mid);

    const lab2 = r.getCell(mid + 1);
    lab2.value = fila[2];
    if (isTotal) {
      lab2.font = { ...FONT_TOTAL, color: { argb: COLORS.white } };
      lab2.fill = FILL_PRIMARY;
    } else {
      lab2.font = FONT_LABEL;
      lab2.fill = FILL_HEADER_BG;
    }
    lab2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    applyBorders(lab2);

    const val2 = r.getCell(mid + 2);
    val2.value = Number(Number(fila[3]).toFixed(2));
    val2.numFmt = '"$"#,##0.00';
    if (isTotal) {
      val2.font = { ...FONT_TOTAL, color: { argb: COLORS.white }, size: 12 };
      val2.fill = FILL_PRIMARY;
    } else {
      val2.font = FONT_VALUE;
    }
    val2.alignment = { horizontal: 'right', vertical: 'middle' };
    applyBorders(val2);
    ws.mergeCells(row, mid + 2, row, totalCols);

    row++;
  });
  row += 1;

  row = buildSectionTitle(ws, row, totalCols, 'Despachos incluidos');

  buildTableHeader(ws, row, DESPACHO_COLS);
  const firstHeaderRow = row;
  row++;

  if (despachos.length === 0) {
    const r = ws.getRow(row);
    r.height = 18;
    const c = r.getCell(1);
    c.value = 'No hay despachos para los filtros seleccionados.';
    c.font = { ...FONT_FOOTER, italic: true };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.mergeCells(row, 1, row, totalCols);
    row++;
  } else {
    despachos.forEach((d, i) => {
      applyDespachoRow(
        ws,
        row,
        DESPACHO_COLS,
        [
          i + 1,
          safe(d.numeroGuia),
          safe(d.distribuidorNombre),
          TIPO_LABELS[d.tipoEntrega] ?? safe(d.tipoEntrega),
          safe(d.agenciaNombre),
          safe(d.destinatarioNombre),
        ],
        i % 2 === 1,
      );
      row++;
    });
    buildTotalGeneralRow(ws, row, totalCols, despachos.length, Number(manifiesto.totalPagar ?? 0));
    const lastDataRow = row;
    row++;

    ws.views = [{ state: 'frozen', ySplit: firstHeaderRow }];
    ws.autoFilter = {
      from: { row: firstHeaderRow, column: 1 },
      to: { row: lastDataRow, column: totalCols },
    };
  }

  row++;
  buildPie(ws, row, totalCols, manifiesto);
  configurePrint(ws, totalCols);

  // ============================================================
  // Hoja 2: Resumen financiero (compacto y reutilizable)
  // ============================================================
  const wsFin = wb.addWorksheet('Resumen financiero', {
    views: [{ showGridLines: false }],
  });
  const FIN_COLS: ColumnDef[] = [
    { key: 'concepto', label: 'Concepto', width: 36, align: 'left' },
    { key: 'detalle', label: 'Detalle', width: 38, align: 'left' },
    { key: 'monto', label: 'Monto', width: 18, align: 'right', numFmt: '"$"#,##0.00' },
  ];
  setColumnWidths(wsFin, FIN_COLS);
  let r2 = 1;
  r2 = buildHeaderBanner(
    wsFin,
    r2,
    FIN_COLS.length,
    `RESUMEN FINANCIERO`,
    `Manifiesto ${codigo}`,
    estado,
  );
  r2 += 1;
  buildTableHeader(wsFin, r2, FIN_COLS);
  const finHeaderRow = r2;
  r2++;

  const finRows2: Array<[string, string, number]> = [
    ['Subtotal domicilio', 'Costos por entregas a domicilio', Number(manifiesto.subtotalDomicilio ?? 0)],
    ['Subtotal agencia (flete)', 'Costo de flete cubierto a la agencia', Number(manifiesto.subtotalAgenciaFlete ?? 0)],
    ['Subtotal comisión agencias', 'Comisiones devengadas por agencia', Number(manifiesto.subtotalComisionAgencias ?? 0)],
    ['Total distribuidor', 'Total liquidado al distribuidor', Number(manifiesto.totalDistribuidor ?? 0)],
    ['Total agencia', 'Total liquidado a agencia(s)', Number(manifiesto.totalAgencia ?? 0)],
  ];

  finRows2.forEach((fila, i) => {
    applyDespachoRow(
      wsFin,
      r2,
      FIN_COLS,
      [fila[0], fila[1], Number(fila[2].toFixed(2))],
      i % 2 === 1,
    );
    r2++;
  });

  // Total a pagar destacado
  buildTotalGeneralRow(
    wsFin,
    r2,
    FIN_COLS.length,
    despachos.length,
    Number(manifiesto.totalPagar ?? 0),
  );
  r2++;

  // Estado pintado
  const estadoRow = wsFin.getRow(r2);
  estadoRow.height = 22;
  const eLab = estadoRow.getCell(1);
  eLab.value = 'Estado del manifiesto';
  eLab.font = FONT_LABEL;
  eLab.fill = FILL_HEADER_BG;
  eLab.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  applyBorders(eLab);
  wsFin.mergeCells(r2, 1, r2, 2);
  const eVal = estadoRow.getCell(3);
  eVal.value = estado;
  const ec = fillEstado(manifiesto.estado);
  eVal.fill = ec.fill;
  eVal.font = { ...FONT_TOTAL, color: { argb: ec.color } };
  eVal.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorders(eVal);
  r2 += 2;

  buildPie(wsFin, r2, FIN_COLS.length, manifiesto);
  configurePrint(wsFin, FIN_COLS.length);
  wsFin.views = [{ state: 'frozen', ySplit: finHeaderRow }];

  // ----- Descargar -----
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `manifiesto-${codigo.replace(/[^a-zA-Z0-9_-]+/g, '_')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
