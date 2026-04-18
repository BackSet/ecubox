import ExcelJS from 'exceljs';
import type { Despacho, Saca, TamanioSaca } from '@/types/despacho';
import { lbsToKg } from '@/lib/utils/weight';

/**
 * Construye un XLSX del despacho con el mismo lenguaje visual que el manifiesto
 * de envio consolidado del backend (cabecera azul, caja de metadatos, tabla con
 * grilla, filas alternas, totales y pie). Una hoja por saca + hoja "Resumen".
 */

const TAMANIO_LABELS: Record<TamanioSaca, string> = {
  INDIVIDUAL: 'Paquete individual',
  PEQUENO: 'Saca pequena',
  MEDIANO: 'Saca mediana',
  GRANDE: 'Saca grande',
};

const TIPO_LABELS: Record<string, string> = {
  DOMICILIO: 'Domicilio',
  AGENCIA: 'Agencia',
  AGENCIA_DISTRIBUIDOR: 'Agencia distribuidor',
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
  totalBg: 'C7DBFF',
};

function fmtFechaHora(s?: string): string {
  if (!s) return '-';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
}

function n(v?: number | null): number {
  if (v == null || Number.isNaN(Number(v))) return 0;
  return Number(v);
}

function safe(v?: string | null): string {
  return v && String(v).trim() ? String(v).trim() : '';
}

function totalSacaLbs(s: Saca): number {
  return (s.paquetes ?? []).reduce((sum, p) => sum + n(p.pesoLbs), 0);
}

function destinoFor(d: Despacho): { titulo: string; nombre: string; direccion: string; telefono: string } {
  if (d.tipoEntrega === 'DOMICILIO') {
    return {
      titulo: 'Entrega a domicilio',
      nombre: safe(d.destinatarioNombre),
      direccion: safe(d.destinatarioDireccion),
      telefono: safe(d.destinatarioTelefono),
    };
  }
  if (d.tipoEntrega === 'AGENCIA_DISTRIBUIDOR') {
    return {
      titulo: 'Entrega en agencia distribuidor',
      nombre: safe(d.agenciaDistribuidorNombre),
      direccion: '',
      telefono: '',
    };
  }
  return {
    titulo: 'Entrega en agencia',
    nombre: safe(d.agenciaNombre),
    direccion: '',
    telefono: '',
  };
}

// ----- Estilos reutilizables -----

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
const FILL_PRIMARY_SOFT: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: COLORS.primarySoft },
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

const PAQUETE_COLS: ColumnDef[] = [
  { key: 'idx', label: '#', width: 5, align: 'center' },
  { key: 'guia', label: 'Guia (pieza)', width: 26, align: 'left' },
  { key: 'master', label: 'Tracking master', width: 22, align: 'left' },
  { key: 'pieza', label: 'Pieza', width: 8, align: 'center' },
  { key: 'destinatario', label: 'Destinatario', width: 30, align: 'left' },
  { key: 'telefono', label: 'Telefono', width: 14, align: 'left' },
  { key: 'direccion', label: 'Direccion', width: 32, align: 'left' },
  { key: 'cantonProv', label: 'Canton / Provincia', width: 20, align: 'left' },
  { key: 'contenido', label: 'Contenido', width: 28, align: 'left' },
  { key: 'estado', label: 'Estado', width: 18, align: 'left' },
  { key: 'lbs', label: 'Peso (lbs)', width: 12, align: 'right', numFmt: '#,##0.00' },
  { key: 'kg', label: 'Peso (kg)', width: 12, align: 'right', numFmt: '#,##0.00' },
];

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

function setColumnWidths(ws: ExcelJS.Worksheet, cols: ColumnDef[]) {
  cols.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width;
  });
}

function buildHeaderBanner(
  ws: ExcelJS.Worksheet,
  startRow: number,
  totalCols: number,
  titulo: string,
  subtitulo: string,
  badge: string,
): number {
  // Fila titulo (banda azul)
  const tRow = ws.getRow(startRow);
  tRow.height = 28;
  const tCell = tRow.getCell(1);
  tCell.value = titulo;
  tCell.font = FONT_TITLE;
  tCell.fill = FILL_PRIMARY;
  tCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.mergeCells(startRow, 1, startRow, totalCols - 1);
  // Badge a la derecha
  const badgeCell = tRow.getCell(totalCols);
  badgeCell.value = badge;
  badgeCell.font = { ...FONT_TITLE, size: 11 };
  badgeCell.fill = FILL_PRIMARY;
  badgeCell.alignment = { horizontal: 'right', vertical: 'middle' };

  // Subtitulo
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
  // Cada fila: label1 | value1 | (spacer) | label2 | value2 (resto fusionado)
  // Estructura: col1 = label, col2..colMid = value, colMid+1 = label2, ... = value2
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

function applyPaqueteRow(
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
    if (v == null || v === '') {
      cell.value = c.key === 'lbs' || c.key === 'kg' ? '—' : '';
    } else {
      cell.value = v as ExcelJS.CellValue;
    }
    cell.font = FONT_CELL;
    cell.alignment = { horizontal: c.align, vertical: 'middle', wrapText: c.key === 'direccion' || c.key === 'destinatario' };
    if (c.numFmt && typeof v === 'number') cell.numFmt = c.numFmt;
    if (zebra) cell.fill = FILL_ZEBRA;
    applyBorders(cell);
  });
}

function buildSubtotalRow(
  ws: ExcelJS.Worksheet,
  rowIdx: number,
  totalCols: number,
  paquetes: number,
  totalLbs: number,
  totalKg: number,
  label = 'Subtotal saca',
) {
  const r = ws.getRow(rowIdx);
  r.height = 20;
  const labelCell = r.getCell(1);
  labelCell.value = `${label}  ·  ${paquetes} paquete${paquetes === 1 ? '' : 's'}`;
  labelCell.font = FONT_TOTAL;
  labelCell.fill = FILL_PRIMARY_SOFT;
  labelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  applyBorders(labelCell);
  ws.mergeCells(rowIdx, 1, rowIdx, totalCols - 2);
  for (let c = 2; c <= totalCols - 2; c++) {
    const cc = r.getCell(c);
    cc.fill = FILL_PRIMARY_SOFT;
    applyBorders(cc);
  }
  const lbsCell = r.getCell(totalCols - 1);
  lbsCell.value = Number(totalLbs.toFixed(2));
  lbsCell.font = FONT_TOTAL;
  lbsCell.numFmt = '#,##0.00';
  lbsCell.fill = FILL_PRIMARY_SOFT;
  lbsCell.alignment = { horizontal: 'right', vertical: 'middle' };
  applyBorders(lbsCell);

  const kgCell = r.getCell(totalCols);
  kgCell.value = Number(totalKg.toFixed(2));
  kgCell.font = FONT_TOTAL;
  kgCell.numFmt = '#,##0.00';
  kgCell.fill = FILL_PRIMARY_SOFT;
  kgCell.alignment = { horizontal: 'right', vertical: 'middle' };
  applyBorders(kgCell);
}

function buildTotalGeneralRow(
  ws: ExcelJS.Worksheet,
  rowIdx: number,
  totalCols: number,
  sacas: number,
  paquetes: number,
  totalLbs: number,
  totalKg: number,
) {
  const r = ws.getRow(rowIdx);
  r.height = 24;
  const labelCell = r.getCell(1);
  labelCell.value = `TOTAL DESPACHO  ·  ${sacas} saca${sacas === 1 ? '' : 's'}  ·  ${paquetes} paquete${paquetes === 1 ? '' : 's'}`;
  labelCell.font = { ...FONT_TOTAL, color: { argb: COLORS.white } };
  labelCell.fill = FILL_PRIMARY;
  labelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  applyBorders(labelCell);
  ws.mergeCells(rowIdx, 1, rowIdx, totalCols - 2);
  for (let c = 2; c <= totalCols - 2; c++) {
    const cc = r.getCell(c);
    cc.fill = FILL_PRIMARY;
    applyBorders(cc);
  }
  const lbsCell = r.getCell(totalCols - 1);
  lbsCell.value = Number(totalLbs.toFixed(2));
  lbsCell.font = { ...FONT_TOTAL, color: { argb: COLORS.white } };
  lbsCell.numFmt = '#,##0.00';
  lbsCell.fill = FILL_PRIMARY;
  lbsCell.alignment = { horizontal: 'right', vertical: 'middle' };
  applyBorders(lbsCell);

  const kgCell = r.getCell(totalCols);
  kgCell.value = Number(totalKg.toFixed(2));
  kgCell.font = { ...FONT_TOTAL, color: { argb: COLORS.white } };
  kgCell.numFmt = '#,##0.00';
  kgCell.fill = FILL_PRIMARY;
  kgCell.alignment = { horizontal: 'right', vertical: 'middle' };
  applyBorders(kgCell);
}

function buildPie(ws: ExcelJS.Worksheet, rowIdx: number, totalCols: number, despacho: Despacho) {
  const r = ws.getRow(rowIdx);
  r.height = 14;
  const cell = r.getCell(1);
  const ahora = new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
  cell.value = `Generado el ${ahora}  ·  Despacho ${safe(despacho.numeroGuia) || `#${despacho.id}`}  ·  ECUBOX`;
  cell.font = FONT_FOOTER;
  cell.alignment = { horizontal: 'right', vertical: 'middle' };
  ws.mergeCells(rowIdx, 1, rowIdx, totalCols);
}

function configurePrint(ws: ExcelJS.Worksheet, totalCols: number) {
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

function columnLetter(col: number): string {
  let s = '';
  while (col > 0) {
    const r = (col - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    col = Math.floor((col - 1) / 26);
  }
  return s;
}

/** Genera y descarga el archivo XLSX del despacho. */
export async function downloadDespachoXlsx(despacho: Despacho): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ECUBOX';
  wb.created = new Date();

  const sacas = despacho.sacas ?? [];
  const destino = destinoFor(despacho);
  const totalPaquetes = sacas.reduce((s, x) => s + (x.paquetes?.length ?? 0), 0);
  const totalLbs = sacas.reduce((s, x) => s + totalSacaLbs(x), 0);
  const totalKg = lbsToKg(totalLbs);

  // ============================================================
  // Hoja 1: Manifiesto consolidado del despacho
  // ============================================================
  const ws = wb.addWorksheet('Despacho', {
    views: [{ showGridLines: false }],
  });
  setColumnWidths(ws, PAQUETE_COLS);
  const totalCols = PAQUETE_COLS.length;

  let row = 1;
  row = buildHeaderBanner(
    ws,
    row,
    totalCols,
    'DOCUMENTO DE DESPACHO',
    'Documento interno de logistica - ECUBOX',
    safe(despacho.numeroGuia) || `#${despacho.id}`,
  );
  row += 1; // espacio

  row = buildMetaBox(ws, row, totalCols, [
    ['Guia', safe(despacho.numeroGuia) || '—', 'Distribuidor', safe(despacho.distribuidorNombre) || '—'],
    ['ID interno', String(despacho.id), 'Tipo de entrega', TIPO_LABELS[despacho.tipoEntrega] ?? despacho.tipoEntrega],
    ['Fecha despacho', fmtFechaHora(despacho.fechaHora), 'Codigo precinto', safe(despacho.codigoPrecinto) || '—'],
    ['Operario', safe(despacho.operarioNombre) || '—', destino.titulo, destino.nombre || '—'],
    ['Total sacas', String(sacas.length), 'Telefono destino', destino.telefono || '—'],
    ['Total paquetes', String(totalPaquetes), 'Direccion destino', destino.direccion || '—'],
    [
      'Peso total (lbs)',
      totalLbs.toFixed(2),
      'Peso total (kg)',
      totalKg.toFixed(2),
    ],
  ]);
  row += 1;

  row = buildSectionTitle(ws, row, totalCols, 'Detalle de paquetes por saca');

  // Cabecera de tabla
  buildTableHeader(ws, row, PAQUETE_COLS);
  const firstHeaderRow = row;
  row++;

  if (sacas.length === 0 || totalPaquetes === 0) {
    const r = ws.getRow(row);
    r.height = 18;
    const c = r.getCell(1);
    c.value = 'Este despacho no tiene sacas asignadas o no contiene paquetes.';
    c.font = { ...FONT_FOOTER, italic: true };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.mergeCells(row, 1, row, totalCols);
    row++;
  } else {
    let counter = 0;
    sacas.forEach((saca, sacaIdx) => {
      // Fila de saca (encabezado)
      const sacaRow = ws.getRow(row);
      sacaRow.height = 20;
      const sacaCell = sacaRow.getCell(1);
      const tamLabel = saca.tamanio ? TAMANIO_LABELS[saca.tamanio] ?? saca.tamanio : 'Sin tamano';
      sacaCell.value = `Saca #${sacaIdx + 1}  ·  ${safe(saca.numeroOrden)}  ·  ${tamLabel}  ·  ${saca.paquetes?.length ?? 0} paquete${(saca.paquetes?.length ?? 0) === 1 ? '' : 's'}`;
      sacaCell.font = { ...FONT_TOTAL, color: { argb: COLORS.primary } };
      sacaCell.fill = FILL_PRIMARY_SOFT;
      sacaCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      applyBorders(sacaCell);
      ws.mergeCells(row, 1, row, totalCols);
      for (let cc = 2; cc <= totalCols; cc++) {
        applyBorders(sacaRow.getCell(cc));
        sacaRow.getCell(cc).fill = FILL_PRIMARY_SOFT;
      }
      row++;

      const paquetes = saca.paquetes ?? [];
      if (paquetes.length === 0) {
        const r = ws.getRow(row);
        r.height = 16;
        const c = r.getCell(1);
        c.value = 'Esta saca no tiene paquetes asociados.';
        c.font = { ...FONT_FOOTER };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.mergeCells(row, 1, row, totalCols);
        row++;
      } else {
        paquetes.forEach((p, i) => {
          counter++;
          const lbs = n(p.pesoLbs);
          const kg = n(p.pesoKg ?? lbsToKg(lbs));
          applyPaqueteRow(
            ws,
            row,
            PAQUETE_COLS,
            [
              counter,
              safe(p.numeroGuia),
              safe(p.guiaMasterTrackingBase),
              p.piezaNumero != null && p.piezaTotal != null ? `${p.piezaNumero}/${p.piezaTotal}` : '',
              safe(p.destinatarioNombre),
              safe(p.destinatarioTelefono),
              safe(p.destinatarioDireccion),
              [p.destinatarioCanton, p.destinatarioProvincia].filter(Boolean).join(', '),
              safe(p.contenido),
              safe(p.estadoRastreoNombre ?? p.estadoRastreoCodigo),
              p.pesoLbs != null ? Number(lbs.toFixed(2)) : null,
              p.pesoLbs != null ? Number(kg.toFixed(2)) : null,
            ],
            i % 2 === 1,
          );
          row++;
        });
        const sLbs = totalSacaLbs(saca);
        const sKg = lbsToKg(sLbs);
        buildSubtotalRow(ws, row, totalCols, paquetes.length, sLbs, sKg);
        row++;
      }
    });

    // Total general
    buildTotalGeneralRow(ws, row, totalCols, sacas.length, totalPaquetes, totalLbs, totalKg);
    const lastDataRow = row;
    row++;

    // Freeze + autofilter
    ws.views = [{ state: 'frozen', ySplit: firstHeaderRow }];
    ws.autoFilter = {
      from: { row: firstHeaderRow, column: 1 },
      to: { row: lastDataRow, column: totalCols },
    };
  }

  row++;
  buildPie(ws, row, totalCols, despacho);

  configurePrint(ws, totalCols);

  // ============================================================
  // Hoja 2: Resumen de sacas
  // ============================================================
  const wsSacas = wb.addWorksheet('Sacas', { views: [{ showGridLines: false }] });
  const SACA_COLS: ColumnDef[] = [
    { key: 'idx', label: '#', width: 5, align: 'center' },
    { key: 'numero', label: 'Saca', width: 22, align: 'left' },
    { key: 'tamanio', label: 'Tamano', width: 22, align: 'left' },
    { key: 'paquetes', label: 'Paquetes', width: 12, align: 'center' },
    { key: 'lbs', label: 'Peso (lbs)', width: 14, align: 'right', numFmt: '#,##0.00' },
    { key: 'kg', label: 'Peso (kg)', width: 14, align: 'right', numFmt: '#,##0.00' },
  ];
  setColumnWidths(wsSacas, SACA_COLS);
  let r2 = 1;
  r2 = buildHeaderBanner(
    wsSacas,
    r2,
    SACA_COLS.length,
    'RESUMEN DE SACAS',
    `Despacho ${safe(despacho.numeroGuia) || `#${despacho.id}`}`,
    `${sacas.length} saca${sacas.length === 1 ? '' : 's'}`,
  );
  r2 += 1;
  buildTableHeader(wsSacas, r2, SACA_COLS);
  const headerRowSacas = r2;
  r2++;
  sacas.forEach((s, i) => {
    const lbs = totalSacaLbs(s);
    const kg = lbsToKg(lbs);
    applyPaqueteRow(
      wsSacas,
      r2,
      SACA_COLS,
      [
        i + 1,
        safe(s.numeroOrden),
        s.tamanio ? TAMANIO_LABELS[s.tamanio] ?? s.tamanio : '',
        s.paquetes?.length ?? 0,
        Number(lbs.toFixed(2)),
        Number(kg.toFixed(2)),
      ],
      i % 2 === 1,
    );
    r2++;
  });
  buildTotalGeneralRow(wsSacas, r2, SACA_COLS.length, sacas.length, totalPaquetes, totalLbs, totalKg);
  const lastSacasRow = r2;
  r2++;
  wsSacas.views = [{ state: 'frozen', ySplit: headerRowSacas }];
  wsSacas.autoFilter = {
    from: { row: headerRowSacas, column: 1 },
    to: { row: lastSacasRow, column: SACA_COLS.length },
  };
  configurePrint(wsSacas, SACA_COLS.length);

  // ----- Descargar -----
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `despacho-${safe(despacho.numeroGuia) || despacho.id}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
