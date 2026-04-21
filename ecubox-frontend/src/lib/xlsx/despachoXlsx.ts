import ExcelJS from 'exceljs';
import type { Despacho, Saca, TamanioSaca } from '@/types/despacho';
import { lbsToKg } from '@/lib/utils/weight';
import {
  applyDataRow,
  buildGroupHeader,
  buildHeaderBanner,
  buildMetaBox,
  buildPie,
  buildSectionTitle,
  buildSubtotalRow,
  buildTableHeader,
  buildTotalGeneralRow,
  configurePrint,
  downloadWorkbook,
  setColumnWidths,
  type ColumnDef,
} from '@/lib/xlsx/builders';
import { FONTS } from '@/lib/xlsx/theme';

/**
 * Construye un XLSX del despacho con la identidad visual de ECUBOX (paleta
 * morada de marca, fuente Calibri y estructura coherente con el PDF).
 *
 * Hojas: "Despacho" (paquetes agrupados por saca con subtotales y total
 * general) y "Sacas" (resumen por saca).
 */

const TAMANIO_LABELS: Record<TamanioSaca, string> = {
  INDIVIDUAL: 'Paquete individual',
  PEQUENO: 'Saca pequeña',
  MEDIANO: 'Saca mediana',
  GRANDE: 'Saca grande',
};

const TIPO_LABELS: Record<string, string> = {
  DOMICILIO: 'Domicilio',
  AGENCIA: 'Agencia',
  AGENCIA_COURIER_ENTREGA: 'Punto de entrega',
};

function fmtFechaHora(s?: string): string {
  if (!s) return '-';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
}

function num(v?: number | null): number {
  if (v == null || Number.isNaN(Number(v))) return 0;
  return Number(v);
}

function safe(v?: string | null): string {
  return v && String(v).trim() ? String(v).trim() : '';
}

function totalSacaLbs(s: Saca): number {
  return (s.paquetes ?? []).reduce((sum, p) => sum + num(p.pesoLbs), 0);
}

function destinoFor(d: Despacho): {
  titulo: string;
  nombre: string;
  direccion: string;
  telefono: string;
} {
  if (d.tipoEntrega === 'DOMICILIO') {
    return {
      titulo: 'Entrega a domicilio',
      nombre: safe(d.consignatarioNombre),
      direccion: safe(d.consignatarioDireccion),
      telefono: safe(d.consignatarioTelefono),
    };
  }
  if (d.tipoEntrega === 'AGENCIA_COURIER_ENTREGA') {
    return {
      titulo: 'Entrega en punto',
      nombre: safe(d.agenciaCourierEntregaNombre),
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

const PAQUETE_COLS: ColumnDef[] = [
  { key: 'idx', label: '#', width: 5, align: 'center' },
  { key: 'guia', label: 'Guía (pieza)', width: 26, align: 'left', mono: true },
  { key: 'master', label: 'Tracking master', width: 22, align: 'left', mono: true },
  { key: 'pieza', label: 'Pieza', width: 8, align: 'center' },
  { key: 'consignatario', label: 'Consignatario', width: 30, align: 'left', wrap: true },
  { key: 'telefono', label: 'Teléfono', width: 14, align: 'left' },
  { key: 'direccion', label: 'Dirección', width: 32, align: 'left', wrap: true },
  { key: 'cantonProv', label: 'Cantón / Provincia', width: 20, align: 'left' },
  { key: 'contenido', label: 'Contenido', width: 28, align: 'left', wrap: true },
  { key: 'estado', label: 'Estado', width: 18, align: 'left' },
  { key: 'lbs', label: 'Peso (lbs)', width: 12, align: 'right', numFmt: '#,##0.00' },
  { key: 'kg', label: 'Peso (kg)', width: 12, align: 'right', numFmt: '#,##0.00' },
];

const SACA_COLS: ColumnDef[] = [
  { key: 'idx', label: '#', width: 5, align: 'center' },
  { key: 'numero', label: 'Saca', width: 22, align: 'left' },
  { key: 'tamanio', label: 'Tamaño', width: 22, align: 'left' },
  { key: 'paquetes', label: 'Paquetes', width: 12, align: 'center' },
  { key: 'lbs', label: 'Peso (lbs)', width: 14, align: 'right', numFmt: '#,##0.00' },
  { key: 'kg', label: 'Peso (kg)', width: 14, align: 'right', numFmt: '#,##0.00' },
];

export async function downloadDespachoXlsx(despacho: Despacho): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ECUBOX';
  wb.created = new Date();

  const sacas = despacho.sacas ?? [];
  const destino = destinoFor(despacho);
  const totalPaquetes = sacas.reduce((s, x) => s + (x.paquetes?.length ?? 0), 0);
  const totalLbs = sacas.reduce((s, x) => s + totalSacaLbs(x), 0);
  const totalKg = lbsToKg(totalLbs);
  const numeroGuia = safe(despacho.numeroGuia) || `#${despacho.id}`;

  // ============================================================
  // Hoja 1: Despacho con paquetes agrupados por saca
  // ============================================================
  const ws = wb.addWorksheet('Despacho', { views: [{ showGridLines: false }] });
  setColumnWidths(ws, PAQUETE_COLS);
  const totalCols = PAQUETE_COLS.length;

  let row = 1;
  row = buildHeaderBanner(ws, row, totalCols, {
    titulo: `DOCUMENTO DE DESPACHO  ${numeroGuia}`,
    subtitulo: 'Hoja operativa de logística · ECUBOX',
    badge: TIPO_LABELS[despacho.tipoEntrega]?.toUpperCase() ?? 'DESPACHO',
  });

  row = buildMetaBox(ws, row, totalCols, [
    [
      'Guía',
      numeroGuia,
      'Courier de entrega',
      safe(despacho.courierEntregaNombre) || '—',
    ],
    [
      'ID interno',
      String(despacho.id),
      'Tipo de entrega',
      TIPO_LABELS[despacho.tipoEntrega] ?? despacho.tipoEntrega,
    ],
    [
      'Fecha despacho',
      fmtFechaHora(despacho.fechaHora),
      'Código precinto',
      safe(despacho.codigoPrecinto) || '—',
    ],
    ['Operario', safe(despacho.operarioNombre) || '—', destino.titulo, destino.nombre || '—'],
    ['Total sacas', String(sacas.length), 'Teléfono destino', destino.telefono || '—'],
    [
      'Total paquetes',
      String(totalPaquetes),
      'Dirección destino',
      destino.direccion || '—',
    ],
    [
      'Peso total (lbs)',
      totalLbs.toFixed(2),
      'Peso total (kg)',
      totalKg.toFixed(2),
    ],
  ]);
  row += 1;

  row = buildSectionTitle(ws, row, totalCols, 'Detalle de paquetes por saca');

  buildTableHeader(ws, row, PAQUETE_COLS);
  const firstHeaderRow = row;
  row++;

  if (sacas.length === 0 || totalPaquetes === 0) {
    const r = ws.getRow(row);
    r.height = 20;
    const c = r.getCell(1);
    c.value = 'Este despacho no tiene sacas asignadas o no contiene paquetes.';
    c.font = { ...FONTS.footer, italic: true };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.mergeCells(row, 1, row, totalCols);
    row++;
  } else {
    let counter = 0;
    sacas.forEach((saca, sacaIdx) => {
      const ps = saca.paquetes ?? [];
      const tam = saca.tamanio
        ? TAMANIO_LABELS[saca.tamanio] ?? saca.tamanio
        : 'Sin tamaño';
      row = buildGroupHeader(
        ws,
        row,
        totalCols,
        `Saca #${sacaIdx + 1}  ·  ${safe(saca.numeroOrden)}  ·  ${tam}  ·  ${ps.length} paquete${ps.length === 1 ? '' : 's'}`,
      );

      if (ps.length === 0) {
        const r = ws.getRow(row);
        r.height = 18;
        const c = r.getCell(1);
        c.value = 'Esta saca no tiene paquetes asociados.';
        c.font = FONTS.footer;
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.mergeCells(row, 1, row, totalCols);
        row++;
      } else {
        ps.forEach((p, i) => {
          counter++;
          const lbs = num(p.pesoLbs);
          const kg = num(p.pesoKg ?? lbsToKg(lbs));
          applyDataRow(
            ws,
            row,
            PAQUETE_COLS,
            [
              counter,
              safe(p.numeroGuia),
              safe(p.guiaMasterTrackingBase),
              p.piezaNumero != null && p.piezaTotal != null
                ? `${p.piezaNumero}/${p.piezaTotal}`
                : '',
              safe(p.consignatarioNombre),
              safe(p.consignatarioTelefono),
              safe(p.consignatarioDireccion),
              [p.consignatarioCanton, p.consignatarioProvincia]
                .filter(Boolean)
                .join(', '),
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
        row = buildSubtotalRow(
          ws,
          row,
          totalCols,
          `Subtotal saca  ·  ${ps.length} paquete${ps.length === 1 ? '' : 's'}`,
          [
            { col: totalCols - 1, value: Number(sLbs.toFixed(2)), numFmt: '#,##0.00' },
            { col: totalCols, value: Number(sKg.toFixed(2)), numFmt: '#,##0.00' },
          ],
        );
      }
    });

    row = buildTotalGeneralRow(
      ws,
      row,
      totalCols,
      `TOTAL DESPACHO  ·  ${sacas.length} saca${sacas.length === 1 ? '' : 's'}  ·  ${totalPaquetes} paquete${totalPaquetes === 1 ? '' : 's'}`,
      [
        { col: totalCols - 1, value: Number(totalLbs.toFixed(2)), numFmt: '#,##0.00' },
        { col: totalCols, value: Number(totalKg.toFixed(2)), numFmt: '#,##0.00' },
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
    `Generado el ${new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}  ·  Despacho ${numeroGuia}  ·  ECUBOX`,
  );
  configurePrint(ws, totalCols);

  // ============================================================
  // Hoja 2: Resumen de sacas
  // ============================================================
  const wsSacas = wb.addWorksheet('Sacas', { views: [{ showGridLines: false }] });
  setColumnWidths(wsSacas, SACA_COLS);

  let r2 = 1;
  r2 = buildHeaderBanner(wsSacas, r2, SACA_COLS.length, {
    titulo: 'RESUMEN DE SACAS',
    subtitulo: `Despacho ${numeroGuia}`,
    badge: `${sacas.length} SACA${sacas.length === 1 ? '' : 'S'}`,
  });

  buildTableHeader(wsSacas, r2, SACA_COLS);
  const headerRowSacas = r2;
  r2++;

  sacas.forEach((s, i) => {
    const lbs = totalSacaLbs(s);
    const kg = lbsToKg(lbs);
    applyDataRow(
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
  r2 = buildTotalGeneralRow(
    wsSacas,
    r2,
    SACA_COLS.length,
    `TOTAL  ·  ${sacas.length} saca${sacas.length === 1 ? '' : 's'}  ·  ${totalPaquetes} paquete${totalPaquetes === 1 ? '' : 's'}`,
    [
      {
        col: SACA_COLS.length - 1,
        value: Number(totalLbs.toFixed(2)),
        numFmt: '#,##0.00',
      },
      {
        col: SACA_COLS.length,
        value: Number(totalKg.toFixed(2)),
        numFmt: '#,##0.00',
      },
    ],
  );
  const lastSacasRow = r2 - 1;

  wsSacas.views = [{ state: 'frozen', ySplit: headerRowSacas }];
  wsSacas.autoFilter = {
    from: { row: headerRowSacas, column: 1 },
    to: { row: lastSacasRow, column: SACA_COLS.length },
  };
  configurePrint(wsSacas, SACA_COLS.length);

  await downloadWorkbook(wb, `despacho-${(safe(despacho.numeroGuia) || String(despacho.id)).replace(/[^a-zA-Z0-9_-]+/g, '_')}.xlsx`);
}
