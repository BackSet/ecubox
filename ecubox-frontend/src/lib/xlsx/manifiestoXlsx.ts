import ExcelJS from 'exceljs';
import type { DespachoEnManifiesto, Manifiesto } from '@/types/manifiesto';
import {
  applyBorders,
  applyDataRow,
  buildHeaderBanner,
  buildMetaBox,
  buildPie,
  buildSectionTitle,
  buildTableHeader,
  buildTotalGeneralRow,
  configurePrint,
  downloadWorkbook,
  setColumnWidths,
  type ColumnDef,
} from '@/lib/xlsx/builders';
import { FILLS, FONTS, XLSX_COLORS } from '@/lib/xlsx/theme';

/**
 * Genera un XLSX del manifiesto como <strong>listado logistico</strong> de
 * despachos enviados en un periodo (a domicilio, agencia o punto de
 * entrega). No incluye importes ni estado de pago: la liquidacion economica
 * vive en el modulo de Liquidaciones.
 *
 * <p>Hojas:
 * <ul>
 *   <li><b>Despachos</b>: listado completo con guia, tipo de entrega,
 *   consignatario, courier de entrega y agencia/punto.</li>
 *   <li><b>Resumen</b>: conteo por tipo de entrega y por courier/agencia
 *   para facilitar el cuadre logistico.</li>
 * </ul>
 */

const TIPO_LABELS: Record<string, string> = {
  DOMICILIO: 'Domicilio',
  AGENCIA: 'Agencia',
  AGENCIA_COURIER_ENTREGA: 'Punto de entrega',
};

const FILTRO_LABELS: Record<string, string> = {
  POR_PERIODO: 'Por período',
  POR_COURIER_ENTREGA: 'Por courier de entrega',
  POR_AGENCIA: 'Por agencia',
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

const DESPACHO_COLS: ColumnDef[] = [
  { key: 'idx', label: '#', width: 5, align: 'center' },
  { key: 'guia', label: 'Guía', width: 24, align: 'left', mono: true },
  { key: 'tipo', label: 'Tipo entrega', width: 18, align: 'left' },
  { key: 'consignatario', label: 'Consignatario', width: 38, align: 'left', wrap: true },
  { key: 'courierEntrega', label: 'Courier de entrega', width: 30, align: 'left', wrap: true },
  { key: 'agencia', label: 'Agencia / Punto', width: 28, align: 'left', wrap: true },
];

export interface DownloadManifiestoXlsxInput {
  manifiesto: Manifiesto;
  despachos: DespachoEnManifiesto[];
  filtroCourierEntregaNombre?: string | null;
  filtroAgenciaNombre?: string | null;
}

export async function downloadManifiestoXlsx(
  input: DownloadManifiestoXlsxInput,
): Promise<void> {
  const { manifiesto, despachos, filtroCourierEntregaNombre, filtroAgenciaNombre } = input;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ECUBOX';
  wb.created = new Date();

  const codigo = safe(manifiesto.codigo) || `#${manifiesto.id}`;
  const dias = diasEntre(manifiesto.fechaInicio, manifiesto.fechaFin);
  const filtroLabel = FILTRO_LABELS[manifiesto.filtroTipo] ?? safe(manifiesto.filtroTipo);

  // Conteos por tipo / courier / agencia para el resumen.
  let domicilio = 0;
  let agencia = 0;
  let agenciaPunto = 0;
  const couriersMap = new Map<string, number>();
  const agenciasMap = new Map<string, number>();
  for (const d of despachos) {
    if (d.tipoEntrega === 'DOMICILIO') domicilio += 1;
    else if (d.tipoEntrega === 'AGENCIA') agencia += 1;
    else if (d.tipoEntrega === 'AGENCIA_COURIER_ENTREGA') agenciaPunto += 1;
    if (d.courierEntregaNombre) {
      couriersMap.set(d.courierEntregaNombre, (couriersMap.get(d.courierEntregaNombre) ?? 0) + 1);
    }
    if (d.agenciaNombre) {
      agenciasMap.set(d.agenciaNombre, (agenciasMap.get(d.agenciaNombre) ?? 0) + 1);
    }
  }
  const totalAgencia = agencia + agenciaPunto;

  // ============================================================
  // Hoja 1: Despachos
  // ============================================================
  const ws = wb.addWorksheet('Despachos', { views: [{ showGridLines: false }] });
  setColumnWidths(ws, DESPACHO_COLS);
  const totalCols = DESPACHO_COLS.length;

  let row = 1;
  row = buildHeaderBanner(ws, row, totalCols, {
    titulo: `MANIFIESTO  ${codigo}`,
    subtitulo: 'Listado logístico de despachos · ECUBOX',
    badge: filtroLabel.toUpperCase(),
  });

  row = buildMetaBox(ws, row, totalCols, [
    ['Código', codigo, 'Tipo de filtro', filtroLabel],
    [
      'Período',
      `${fmtFechaCorta(manifiesto.fechaInicio)} – ${fmtFechaCorta(manifiesto.fechaFin)}`,
      'Duración',
      dias != null ? `${dias} día${dias === 1 ? '' : 's'}` : '-',
    ],
    [
      'Filtro courier de entrega',
      safe(filtroCourierEntregaNombre ?? manifiesto.filtroCourierEntregaNombre) || 'Todos',
      'Filtro agencia',
      safe(filtroAgenciaNombre ?? manifiesto.filtroAgenciaNombre) || 'Todas',
    ],
    [
      'Despachos incluidos',
      String(despachos.length),
      'Generado',
      new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }),
    ],
  ]);
  row += 1;

  // Sección + tabla de despachos
  row = buildSectionTitle(ws, row, totalCols, 'Despachos incluidos');

  buildTableHeader(ws, row, DESPACHO_COLS);
  const firstHeaderRow = row;
  row++;

  if (despachos.length === 0) {
    const r = ws.getRow(row);
    r.height = 20;
    const c = r.getCell(1);
    c.value = 'No hay despachos para los filtros seleccionados.';
    c.font = { ...FONTS.footer, italic: true };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.mergeCells(row, 1, row, totalCols);
    row++;
  } else {
    despachos.forEach((d, i) => {
      applyDataRow(
        ws,
        row,
        DESPACHO_COLS,
        [
          i + 1,
          safe(d.numeroGuia),
          TIPO_LABELS[d.tipoEntrega] ?? safe(d.tipoEntrega),
          safe(d.consignatarioNombre),
          safe(d.courierEntregaNombre),
          safe(d.agenciaNombre),
        ],
        i % 2 === 1,
      );
      row++;
    });
    row = buildTotalGeneralRow(
      ws,
      row,
      totalCols,
      `TOTAL  ·  ${despachos.length} despacho${despachos.length === 1 ? '' : 's'}`,
      [],
    );
    const lastDataRow = row - 1;
    ws.views = [{ state: 'frozen', ySplit: firstHeaderRow }];
    ws.autoFilter = {
      from: { row: firstHeaderRow, column: 1 },
      to: { row: lastDataRow, column: totalCols },
    };
  }

  row += 1;
  buildPie(
    ws,
    row,
    totalCols,
    `Generado el ${new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}  ·  Manifiesto ${codigo}  ·  ECUBOX`,
  );
  configurePrint(ws, totalCols);

  // ============================================================
  // Hoja 2: Resumen logístico
  // ============================================================
  const wsRes = wb.addWorksheet('Resumen', { views: [{ showGridLines: false }] });
  const RES_COLS: ColumnDef[] = [
    { key: 'concepto', label: 'Concepto', width: 36, align: 'left' },
    { key: 'detalle', label: 'Detalle', width: 42, align: 'left', wrap: true },
    { key: 'cantidad', label: 'Despachos', width: 14, align: 'right', numFmt: '0' },
  ];
  setColumnWidths(wsRes, RES_COLS);

  let r2 = 1;
  r2 = buildHeaderBanner(wsRes, r2, RES_COLS.length, {
    titulo: 'RESUMEN LOGÍSTICO',
    subtitulo: `Manifiesto ${codigo}`,
    badge: filtroLabel.toUpperCase(),
  });

  // --- Por tipo de entrega ---
  r2 = buildSectionTitle(wsRes, r2, RES_COLS.length, 'Por tipo de entrega');
  buildTableHeader(wsRes, r2, RES_COLS);
  const tipoHeaderRow = r2;
  r2++;

  const tipoRows: Array<[string, string, number]> = [
    ['Domicilio', 'Despachos entregados a domicilio del consignatario', domicilio],
    ['Agencia', 'Despachos entregados directamente en la agencia', agencia],
    ['Punto de entrega', 'Despachos enviados a un punto de entrega del courier', agenciaPunto],
  ];
  tipoRows.forEach((fila, i) => {
    applyDataRow(wsRes, r2, RES_COLS, [fila[0], fila[1], fila[2]], i % 2 === 1);
    r2++;
  });
  r2 = buildTotalGeneralRow(wsRes, r2, RES_COLS.length, 'Total despachos', [
    { col: RES_COLS.length, value: despachos.length, numFmt: '0' },
  ]);
  r2 += 1;

  // --- Por courier de entrega ---
  r2 = buildSectionTitle(wsRes, r2, RES_COLS.length, 'Por courier de entrega');
  buildTableHeader(wsRes, r2, RES_COLS);
  r2++;

  if (couriersMap.size === 0) {
    const rr = wsRes.getRow(r2);
    rr.height = 20;
    const c = rr.getCell(1);
    c.value = 'Sin couriers de entrega asignados.';
    c.font = { ...FONTS.footer, italic: true };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    wsRes.mergeCells(r2, 1, r2, RES_COLS.length);
    r2++;
  } else {
    Array.from(couriersMap.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([nombre, cant], i) => {
        applyDataRow(
          wsRes,
          r2,
          RES_COLS,
          [nombre, 'Despachos a cargo del courier', cant],
          i % 2 === 1,
        );
        r2++;
      });
  }
  r2 += 1;

  // --- Por agencia / punto ---
  r2 = buildSectionTitle(wsRes, r2, RES_COLS.length, 'Por agencia / punto de entrega');
  buildTableHeader(wsRes, r2, RES_COLS);
  r2++;

  if (agenciasMap.size === 0) {
    const rr = wsRes.getRow(r2);
    rr.height = 20;
    const c = rr.getCell(1);
    c.value = 'Sin agencias asignadas.';
    c.font = { ...FONTS.footer, italic: true };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    wsRes.mergeCells(r2, 1, r2, RES_COLS.length);
    r2++;
  } else {
    Array.from(agenciasMap.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([nombre, cant], i) => {
        applyDataRow(wsRes, r2, RES_COLS, [nombre, 'Despachos asignados', cant], i % 2 === 1);
        r2++;
      });
  }
  r2 += 1;

  // Highlight con totales globales (filtro tipo y total)
  const totalRow = wsRes.getRow(r2);
  totalRow.height = 22;
  const tLab = totalRow.getCell(1);
  tLab.value = 'Total general';
  tLab.font = FONTS.totalLight;
  tLab.fill = FILLS.primary;
  tLab.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  applyBorders(tLab, XLSX_COLORS.primaryDark);
  wsRes.mergeCells(r2, 1, r2, 2);
  const tVal = totalRow.getCell(3);
  tVal.value = despachos.length;
  tVal.numFmt = '0';
  tVal.font = FONTS.totalLight;
  tVal.fill = FILLS.primary;
  tVal.alignment = { horizontal: 'right', vertical: 'middle' };
  applyBorders(tVal, XLSX_COLORS.primaryDark);
  r2 += 2;

  buildPie(
    wsRes,
    r2,
    RES_COLS.length,
    `Generado el ${new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}  ·  Manifiesto ${codigo}  ·  ECUBOX  ·  ${totalAgencia} agencia/punto · ${domicilio} domicilio`,
  );
  configurePrint(wsRes, RES_COLS.length);
  wsRes.views = [{ state: 'frozen', ySplit: tipoHeaderRow }];

  await downloadWorkbook(wb, `manifiesto-${codigo.replace(/[^a-zA-Z0-9_-]+/g, '_')}.xlsx`);
}
