import { jsPDF } from 'jspdf';
import type { DespachoEnManifiesto, Manifiesto } from '@/types/manifiesto';
import { ECUBOX_PDF_COLORS, type PdfRgb } from '@/lib/pdf/theme';
import {
  createDocCtx,
  drawDocFooter,
  drawDocHeader,
  drawFirmas,
  drawInlineMetrics,
  drawKpiRow,
  drawMetaRow,
  drawSectionTitle,
  drawTable,
  drawTotalBar,
  fmtFechaCorta,
  fmtMoneda,
  safeStr,
  type ColumnDef,
} from '@/lib/pdf/builders/internal-doc';

/**
 * Construye el PDF del manifiesto de liquidación con la identidad visual de
 * ECUBOX (paleta morada, tipografía limpia, layout estructurado en cards y
 * tabla con repetición de cabecera). Toda la composición delega en los
 * helpers de `internal-doc.ts` para evitar superposiciones.
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

function diasEntre(inicio?: string | null, fin?: string | null): number | null {
  if (!inicio || !fin) return null;
  const a = new Date(inicio);
  const b = new Date(fin);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const ms = b.getTime() - a.getTime();
  if (ms < 0) return null;
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

function badgeForEstado(estado?: string | null): {
  text: string;
  bg: PdfRgb;
  fg: PdfRgb;
} {
  const text = (ESTADO_LABELS[estado ?? 'PENDIENTE'] ?? estado ?? 'Pendiente').toUpperCase();
  switch (estado) {
    case 'PAGADO':
      return { text, bg: ECUBOX_PDF_COLORS.successFill, fg: ECUBOX_PDF_COLORS.success };
    case 'ANULADO':
      return {
        text,
        bg: ECUBOX_PDF_COLORS.destructiveFill,
        fg: ECUBOX_PDF_COLORS.destructive,
      };
    case 'PENDIENTE':
    default:
      return { text, bg: ECUBOX_PDF_COLORS.warningFill, fg: ECUBOX_PDF_COLORS.warning };
  }
}

export interface BuildManifiestoPdfInput {
  manifiesto: Manifiesto;
  despachos: DespachoEnManifiesto[];
  filtroAgenciaNombre?: string;
  filtroCourierEntregaNombre?: string;
}

export function buildManifiestoPdf(input: BuildManifiestoPdfInput): jsPDF {
  const { manifiesto, despachos, filtroAgenciaNombre, filtroCourierEntregaNombre } = input;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const ctx = createDocCtx(doc);

  const codigo =
    safeStr(manifiesto.codigo) === '-' ? `#${manifiesto.id}` : safeStr(manifiesto.codigo);
  const dias = diasEntre(manifiesto.fechaInicio, manifiesto.fechaFin);
  const estadoLabel = ESTADO_LABELS[manifiesto.estado] ?? manifiesto.estado ?? 'Pendiente';
  const badge = badgeForEstado(manifiesto.estado);

  const header = () =>
    drawDocHeader(ctx, {
      titulo: 'Manifiesto de liquidación',
      subtitulo: 'Documento contable de ECUBOX',
      codigo,
      meta: `ID ${manifiesto.id} · ${despachos.length} despacho${despachos.length === 1 ? '' : 's'}`,
      badge,
    });

  ctx.onPageBreak = () => {
    header();
  };

  header();

  // Bloques de información general
  drawMetaRow(ctx, [
    {
      titulo: 'Manifiesto',
      filas: [
        { label: 'Código', value: codigo, bold: true },
        { label: 'Estado', value: estadoLabel },
        {
          label: 'Generado',
          value: new Date().toLocaleDateString('es-EC', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
        },
      ],
    },
    {
      titulo: 'Período',
      filas: [
        { label: 'Desde', value: fmtFechaCorta(manifiesto.fechaInicio), bold: true },
        { label: 'Hasta', value: fmtFechaCorta(manifiesto.fechaFin), bold: true },
        {
          label: 'Duración',
          value: dias != null ? `${dias} día${dias === 1 ? '' : 's'}` : '-',
        },
      ],
    },
    {
      titulo: 'Filtros aplicados',
      filas: [
        {
          label: 'Courier de entrega',
          value: safeStr(
            filtroCourierEntregaNombre ?? manifiesto.filtroCourierEntregaNombre ?? 'Todos',
          ),
        },
        {
          label: 'Agencia',
          value: safeStr(filtroAgenciaNombre ?? manifiesto.filtroAgenciaNombre ?? 'Todas'),
        },
        {
          label: 'Despachos incluidos',
          value: String(despachos.length),
          bold: true,
        },
      ],
    },
  ]);

  // KPI cards
  drawKpiRow(ctx, [
    { label: 'Despachos', value: String(despachos.length) },
    {
      label: 'Total courier de entrega',
      value: fmtMoneda(manifiesto.totalCourierEntrega),
    },
    { label: 'Total agencia', value: fmtMoneda(manifiesto.totalAgencia) },
    {
      label: 'Total a pagar',
      value: fmtMoneda(manifiesto.totalPagar),
      highlight: true,
    },
  ]);

  // Subtotales en línea
  drawInlineMetrics(ctx, 'Subtotales', [
    { label: 'Domicilio', value: fmtMoneda(manifiesto.subtotalDomicilio) },
    { label: 'Agencia (flete)', value: fmtMoneda(manifiesto.subtotalAgenciaFlete) },
    {
      label: 'Comisión agencias',
      value: fmtMoneda(manifiesto.subtotalComisionAgencias),
    },
  ]);

  // Sección + tabla de despachos
  drawSectionTitle(ctx, 'Despachos incluidos');

  const columns: ColumnDef<DespachoEnManifiesto>[] = [
    {
      key: 'idx',
      label: '#',
      weight: 0.04,
      align: 'center',
      render: (_d, i) => String(i + 1),
    },
    {
      key: 'guia',
      label: 'GUÍA',
      weight: 0.14,
      align: 'left',
      render: (d) => safeStr(d.numeroGuia),
      mono: true,
    },
    {
      key: 'courierEntrega',
      label: 'COURIER DE ENTREGA',
      weight: 0.22,
      align: 'left',
      render: (d) => safeStr(d.courierEntregaNombre),
    },
    {
      key: 'tipo',
      label: 'TIPO ENTREGA',
      weight: 0.13,
      align: 'left',
      render: (d) => TIPO_LABELS[d.tipoEntrega] ?? safeStr(d.tipoEntrega),
    },
    {
      key: 'agencia',
      label: 'AGENCIA',
      weight: 0.20,
      align: 'left',
      render: (d) => safeStr(d.agenciaNombre),
    },
    {
      key: 'consignatario',
      label: 'CONSIGNATARIO',
      weight: 0.27,
      align: 'left',
      render: (d) => safeStr(d.consignatarioNombre),
    },
  ];

  drawTable<DespachoEnManifiesto>(ctx, {
    columns,
    rows: despachos,
    empty: 'No hay despachos para los filtros seleccionados.',
  });

  if (despachos.length > 0) {
    drawTotalBar(ctx, {
      left: `TOTAL · ${despachos.length} despacho${despachos.length === 1 ? '' : 's'}`,
      right: `TOTAL A PAGAR  ${fmtMoneda(manifiesto.totalPagar)}`,
    });

    drawFirmas(ctx, [
      { titulo: 'Aprobación', subtitulo: 'ECUBOX' },
      { titulo: 'Conformidad', subtitulo: 'Courier de entrega / Agencia' },
    ]);
  }

  drawDocFooter(doc, {
    left: `ECUBOX · Manifiesto ${codigo} · Generado ${new Date().toLocaleString('es-EC', {
      dateStyle: 'short',
      timeStyle: 'short',
    })}`,
  });

  return doc;
}
