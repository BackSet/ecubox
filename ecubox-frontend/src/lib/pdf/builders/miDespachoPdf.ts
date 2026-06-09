import { jsPDF } from 'jspdf';
import type { MiDespachoDetalle, MiDespachoPieza } from '@/types/mis-despacho';
import {
  createDocCtx,
  drawDocFooter,
  drawDocHeader,
  drawMetaRow,
  drawSectionTitle,
  drawTable,
  drawTotalBar,
  fmtFechaHora,
  fmtNumero,
  safeStr,
  type ColumnDef,
} from '@/lib/pdf/builders/internal-doc';

const TIPO_LABELS: Record<string, string> = {
  DOMICILIO: 'Domicilio',
  AGENCIA: 'Agencia',
  AGENCIA_COURIER_ENTREGA: 'Punto de entrega',
};

/** Comprobante PDF del despacho desde la vista de cliente (solo sus piezas). */
export function buildMiDespachoPdf(d: MiDespachoDetalle): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const ctx = createDocCtx(doc);
  const codigo = safeStr(d.numeroGuia, `#${d.despachoId}`);

  const header = () =>
    drawDocHeader(ctx, {
      titulo: 'Comprobante de envío',
      subtitulo: 'Mis entregas — ECUBOX',
      codigo,
      meta: `Despacho ${d.despachoId} · ${fmtFechaHora(d.fecha)}`,
    });
  ctx.onPageBreak = () => {
    header();
  };
  header();

  drawMetaRow(ctx, [
    {
      titulo: 'Envío',
      filas: [
        { label: 'Guía', value: codigo, bold: true },
        { label: 'Fecha', value: fmtFechaHora(d.fecha) },
        { label: 'Precinto', value: safeStr(d.codigoPrecinto) },
      ],
    },
    {
      titulo: 'Entrega',
      filas: [
        { label: 'Tipo', value: d.tipoEntrega ? TIPO_LABELS[d.tipoEntrega] ?? d.tipoEntrega : '-' },
        { label: 'Destino', value: safeStr(d.destinoNombre) },
        { label: 'Piezas', value: String(d.totalPiezas) },
      ],
    },
  ]);

  drawSectionTitle(ctx, 'Piezas');

  const columns: ColumnDef<MiDespachoPieza>[] = [
    { key: 'n', label: '#', weight: 0.5, align: 'right', render: (_r, i) => String(i + 1) },
    { key: 'guia', label: 'Guía', weight: 2, align: 'left', mono: true, render: (r) => safeStr(r.numeroGuia) },
    { key: 'ref', label: 'Ref', weight: 1.4, align: 'left', render: (r) => safeStr(r.ref) },
    { key: 'cont', label: 'Contenido', weight: 2.4, align: 'left', render: (r) => safeStr(r.contenido) },
    {
      key: 'estado',
      label: 'Estado',
      weight: 1.8,
      align: 'left',
      render: (r) => safeStr(r.estadoNombre ?? r.estadoCodigo),
    },
    { key: 'lbs', label: 'Lbs', weight: 1, align: 'right', render: (r) => fmtNumero(r.pesoLbs) },
    { key: 'kg', label: 'Kg', weight: 1, align: 'right', render: (r) => fmtNumero(r.pesoKg) },
  ];
  drawTable(ctx, { columns, rows: d.piezas, empty: 'Sin piezas' });

  drawTotalBar(ctx, {
    left: `${d.totalPiezas} pieza(s)`,
    right: `${fmtNumero(d.pesoLbsTotal)} lbs · ${fmtNumero(d.pesoKgTotal)} kg`,
  });

  drawDocFooter(doc, { left: 'ECUBOX · Comprobante de Mis entregas' });
  return doc;
}
