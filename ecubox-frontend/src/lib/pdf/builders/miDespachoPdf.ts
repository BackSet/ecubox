import { jsPDF } from 'jspdf';
import type { MiDespachoDetalle, MiDespachoPieza } from '@/types/mis-despacho';
import { modalidadLabelDetalle } from '@/lib/entregas/modalidad';
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

/** Comprobante PDF de la entrega desde la vista de cliente (solo sus paquetes). */
export function buildMiDespachoPdf(d: MiDespachoDetalle): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const ctx = createDocCtx(doc);
  const codigo = safeStr(d.numeroGuia, `Entrega #${d.despachoId}`);
  const confirmacion = d.entregaConfirmada ? 'Recibida' : 'Pendiente';

  const header = () =>
    drawDocHeader(ctx, {
      titulo: 'Comprobante de entrega',
      subtitulo: 'Mis entregas — ECUBOX',
      codigo,
      meta: `Entrega #${d.despachoId} · ${fmtFechaHora(d.fecha)}`,
    });
  ctx.onPageBreak = () => {
    header();
  };
  header();

  drawMetaRow(ctx, [
    {
      titulo: 'Entrega',
      filas: [
        { label: 'Número de rastreo', value: codigo, bold: true },
        { label: 'Fecha', value: fmtFechaHora(d.fecha) },
        { label: 'Confirmación', value: confirmacion },
      ],
    },
    {
      titulo: 'Destino',
      filas: [
        { label: 'Modalidad', value: modalidadLabelDetalle(d) },
        { label: 'Destino', value: safeStr(d.destinoNombre) },
        { label: 'Operador', value: safeStr(d.operadorEntregaNombre) },
        { label: 'Paquetes', value: String(d.totalPiezas) },
      ],
    },
  ]);

  drawSectionTitle(ctx, 'Paquetes');

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
  drawTable(ctx, { columns, rows: d.piezas, empty: 'Sin paquetes' });

  drawTotalBar(ctx, {
    left: `${d.totalPiezas} paquete(s)`,
    right: `${fmtNumero(d.pesoLbsTotal)} lbs · ${fmtNumero(d.pesoKgTotal)} kg`,
  });

  drawDocFooter(doc, { left: 'ECUBOX · Comprobante de Mis entregas' });
  return doc;
}
