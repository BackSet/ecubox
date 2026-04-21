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
 * Genera un XLSX del manifiesto de liquidación con la identidad visual de
 * ECUBOX (paleta morada de marca, fuente Calibri, encabezados claros). Usa
 * los helpers compartidos de `lib/xlsx/builders.ts` para garantizar que
 * todos los exports del sistema sean coherentes.
 *
 * Hojas: "Manifiesto" (lista de despachos + resumen financiero compacto)
 * y "Resumen financiero" (vista detallada en tabla).
 */

const TIPO_LABELS: Record<string, string> = {
  DOMICILIO: 'Domicilio',
  AGENCIA: 'Agencia',
  AGENCIA_COURIER_ENTREGA: 'Punto de entrega',
};

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  PAGADO: 'Pagado',
  ANULADO: 'Anulado',
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
  { key: 'courierEntrega', label: 'Courier de entrega', width: 30, align: 'left', wrap: true },
  { key: 'tipo', label: 'Tipo entrega', width: 18, align: 'left' },
  { key: 'agencia', label: 'Agencia', width: 26, align: 'left', wrap: true },
  { key: 'consignatario', label: 'Consignatario', width: 38, align: 'left', wrap: true },
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
  const estado = ESTADO_LABELS[manifiesto.estado] ?? manifiesto.estado;

  // ============================================================
  // Hoja 1: Manifiesto (despachos + resumen financiero)
  // ============================================================
  const ws = wb.addWorksheet('Manifiesto', { views: [{ showGridLines: false }] });
  setColumnWidths(ws, DESPACHO_COLS);
  const totalCols = DESPACHO_COLS.length;

  let row = 1;
  row = buildHeaderBanner(ws, row, totalCols, {
    titulo: `MANIFIESTO  ${codigo}`,
    subtitulo: 'Documento contable · ECUBOX',
    badge: estado.toUpperCase(),
  });

  row = buildMetaBox(ws, row, totalCols, [
    ['Código', codigo, 'Estado', estado],
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

  // Resumen financiero compacto
  row = buildSectionTitle(ws, row, totalCols, 'Resumen financiero');

  const finRows: Array<[string, number, string, number, boolean]> = [
    [
      'Subtotal domicilio',
      Number(manifiesto.subtotalDomicilio ?? 0),
      'Total courier de entrega',
      Number(manifiesto.totalCourierEntrega ?? 0),
      false,
    ],
    [
      'Subtotal agencia (flete)',
      Number(manifiesto.subtotalAgenciaFlete ?? 0),
      'Total agencia',
      Number(manifiesto.totalAgencia ?? 0),
      false,
    ],
    [
      'Subtotal comisión agencias',
      Number(manifiesto.subtotalComisionAgencias ?? 0),
      'TOTAL A PAGAR',
      Number(manifiesto.totalPagar ?? 0),
      true,
    ],
  ];

  const mid = Math.floor(totalCols / 2);
  finRows.forEach((fila) => {
    const isTotal = fila[4];
    const r = ws.getRow(row);
    r.height = 21;

    const lab1 = r.getCell(1);
    lab1.value = fila[0];
    lab1.font = FONTS.metaLabel;
    lab1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    lab1.fill = FILLS.cardHeader;
    applyBorders(lab1);

    const val1 = r.getCell(2);
    val1.value = Number(Number(fila[1]).toFixed(2));
    val1.numFmt = '"$"#,##0.00';
    val1.font = FONTS.metaValue;
    val1.alignment = { horizontal: 'right', vertical: 'middle' };
    applyBorders(val1);
    ws.mergeCells(row, 2, row, mid);

    const lab2 = r.getCell(mid + 1);
    lab2.value = fila[2];
    if (isTotal) {
      lab2.font = FONTS.totalLight;
      lab2.fill = FILLS.primary;
      applyBorders(lab2, XLSX_COLORS.primaryDark);
    } else {
      lab2.font = FONTS.metaLabel;
      lab2.fill = FILLS.cardHeader;
      applyBorders(lab2);
    }
    lab2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    const val2 = r.getCell(mid + 2);
    val2.value = Number(Number(fila[3]).toFixed(2));
    val2.numFmt = '"$"#,##0.00';
    if (isTotal) {
      val2.font = FONTS.totalLight;
      val2.fill = FILLS.primary;
      applyBorders(val2, XLSX_COLORS.primaryDark);
    } else {
      val2.font = FONTS.metaValue;
      applyBorders(val2);
    }
    val2.alignment = { horizontal: 'right', vertical: 'middle' };
    ws.mergeCells(row, mid + 2, row, totalCols);

    row++;
  });
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
          safe(d.courierEntregaNombre),
          TIPO_LABELS[d.tipoEntrega] ?? safe(d.tipoEntrega),
          safe(d.agenciaNombre),
          safe(d.consignatarioNombre),
        ],
        i % 2 === 1,
      );
      row++;
    });
    row = buildTotalGeneralRow(
      ws,
      row,
      totalCols,
      `TOTAL MANIFIESTO  ·  ${despachos.length} despacho${despachos.length === 1 ? '' : 's'}`,
      [
        {
          col: totalCols,
          value: Number(Number(manifiesto.totalPagar ?? 0).toFixed(2)),
          numFmt: '"$"#,##0.00',
        },
      ],
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
  // Hoja 2: Resumen financiero detallado
  // ============================================================
  const wsFin = wb.addWorksheet('Resumen financiero', {
    views: [{ showGridLines: false }],
  });
  const FIN_COLS: ColumnDef[] = [
    { key: 'concepto', label: 'Concepto', width: 36, align: 'left' },
    { key: 'detalle', label: 'Detalle', width: 42, align: 'left', wrap: true },
    { key: 'monto', label: 'Monto', width: 18, align: 'right', numFmt: '"$"#,##0.00' },
  ];
  setColumnWidths(wsFin, FIN_COLS);

  let r2 = 1;
  r2 = buildHeaderBanner(wsFin, r2, FIN_COLS.length, {
    titulo: 'RESUMEN FINANCIERO',
    subtitulo: `Manifiesto ${codigo}`,
    badge: estado.toUpperCase(),
  });

  buildTableHeader(wsFin, r2, FIN_COLS);
  const finHeaderRow = r2;
  r2++;

  const finRows2: Array<[string, string, number]> = [
    [
      'Subtotal domicilio',
      'Costos por entregas a domicilio',
      Number(manifiesto.subtotalDomicilio ?? 0),
    ],
    [
      'Subtotal agencia (flete)',
      'Costo de flete cubierto a la agencia',
      Number(manifiesto.subtotalAgenciaFlete ?? 0),
    ],
    [
      'Subtotal comisión agencias',
      'Comisiones devengadas por agencia',
      Number(manifiesto.subtotalComisionAgencias ?? 0),
    ],
    [
      'Total courier de entrega',
      'Total liquidado al courier de entrega',
      Number(manifiesto.totalCourierEntrega ?? 0),
    ],
    [
      'Total agencia',
      'Total liquidado a la(s) agencia(s)',
      Number(manifiesto.totalAgencia ?? 0),
    ],
  ];
  finRows2.forEach((fila, i) => {
    applyDataRow(
      wsFin,
      r2,
      FIN_COLS,
      [fila[0], fila[1], Number(fila[2].toFixed(2))],
      i % 2 === 1,
    );
    r2++;
  });

  r2 = buildTotalGeneralRow(
    wsFin,
    r2,
    FIN_COLS.length,
    `TOTAL A PAGAR  ·  ${despachos.length} despacho${despachos.length === 1 ? '' : 's'}`,
    [
      {
        col: FIN_COLS.length,
        value: Number(Number(manifiesto.totalPagar ?? 0).toFixed(2)),
        numFmt: '"$"#,##0.00',
      },
    ],
  );

  // Estado destacado
  const estadoRow = wsFin.getRow(r2);
  estadoRow.height = 22;
  const eLab = estadoRow.getCell(1);
  eLab.value = 'Estado del manifiesto';
  eLab.font = FONTS.metaLabel;
  eLab.fill = FILLS.cardHeader;
  eLab.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  applyBorders(eLab);
  wsFin.mergeCells(r2, 1, r2, 2);
  const eVal = estadoRow.getCell(3);
  eVal.value = estado.toUpperCase();
  switch (manifiesto.estado) {
    case 'PAGADO':
      eVal.fill = FILLS.successFill;
      eVal.font = { ...FONTS.total, color: { argb: XLSX_COLORS.success } };
      break;
    case 'ANULADO':
      eVal.fill = FILLS.destructiveFill;
      eVal.font = { ...FONTS.total, color: { argb: XLSX_COLORS.destructive } };
      break;
    default:
      eVal.fill = FILLS.warningFill;
      eVal.font = { ...FONTS.total, color: { argb: XLSX_COLORS.warning } };
  }
  eVal.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorders(eVal);
  r2 += 2;

  buildPie(
    wsFin,
    r2,
    FIN_COLS.length,
    `Generado el ${new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}  ·  Manifiesto ${codigo}  ·  ECUBOX`,
  );
  configurePrint(wsFin, FIN_COLS.length);
  wsFin.views = [{ state: 'frozen', ySplit: finHeaderRow }];

  await downloadWorkbook(wb, `manifiesto-${codigo.replace(/[^a-zA-Z0-9_-]+/g, '_')}.xlsx`);
}
