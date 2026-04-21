import { jsPDF } from 'jspdf';
import type { DespachoEnManifiesto, Manifiesto } from '@/types/manifiesto';
import {
  createDocCtx,
  drawDocFooter,
  drawDocHeader,
  drawFirmas,
  drawKpiRow,
  drawMetaRow,
  drawSectionTitle,
  drawTable,
  drawTotalBar,
  fmtFechaCorta,
  safeStr,
  type ColumnDef,
} from '@/lib/pdf/builders/internal-doc';

/**
 * PDF del manifiesto como <strong>listado logistico</strong> de despachos
 * enviados en un periodo (a domicilio, agencia o punto de entrega).
 *
 * <p>No incluye importes, subtotales ni totales monetarios: la liquidacion
 * economica vive en el modulo de Liquidaciones. Aqui se prioriza una
 * vista clara para el responsable que entrega los paquetes (couriers,
 * agencias, consignatarios) con conteos por tipo de entrega.
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

function diasEntre(inicio?: string | null, fin?: string | null): number | null {
  if (!inicio || !fin) return null;
  const a = new Date(inicio);
  const b = new Date(fin);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const ms = b.getTime() - a.getTime();
  if (ms < 0) return null;
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
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

  // Conteos por tipo de entrega para los KPIs y la barra de total.
  let domicilio = 0;
  let agencia = 0;
  let agenciaPunto = 0;
  const couriersSet = new Set<string>();
  const agenciasSet = new Set<string>();
  for (const d of despachos) {
    if (d.tipoEntrega === 'DOMICILIO') domicilio += 1;
    else if (d.tipoEntrega === 'AGENCIA') agencia += 1;
    else if (d.tipoEntrega === 'AGENCIA_COURIER_ENTREGA') agenciaPunto += 1;
    if (d.courierEntregaNombre) couriersSet.add(d.courierEntregaNombre);
    if (d.agenciaNombre) agenciasSet.add(d.agenciaNombre);
  }
  const totalAgencia = agencia + agenciaPunto;

  const header = () =>
    drawDocHeader(ctx, {
      titulo: 'Manifiesto de despachos',
      subtitulo: 'Documento logístico de ECUBOX',
      codigo,
      meta: `ID ${manifiesto.id} · ${despachos.length} despacho${despachos.length === 1 ? '' : 's'}`,
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
        {
          label: 'Tipo de filtro',
          value: FILTRO_LABELS[manifiesto.filtroTipo] ?? safeStr(manifiesto.filtroTipo),
        },
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

  // KPI cards orientados a logística (sin importes).
  drawKpiRow(ctx, [
    { label: 'Despachos', value: String(despachos.length), highlight: true },
    { label: 'Domicilio', value: String(domicilio) },
    { label: 'Agencia / Punto', value: String(totalAgencia) },
    { label: 'Couriers', value: String(couriersSet.size) },
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
      weight: 0.15,
      align: 'left',
      render: (d) => safeStr(d.numeroGuia),
      mono: true,
    },
    {
      key: 'tipo',
      label: 'TIPO ENTREGA',
      weight: 0.13,
      align: 'left',
      render: (d) => TIPO_LABELS[d.tipoEntrega] ?? safeStr(d.tipoEntrega),
    },
    {
      key: 'consignatario',
      label: 'CONSIGNATARIO',
      weight: 0.26,
      align: 'left',
      render: (d) => safeStr(d.consignatarioNombre),
    },
    {
      key: 'courierEntrega',
      label: 'COURIER DE ENTREGA',
      weight: 0.22,
      align: 'left',
      render: (d) => safeStr(d.courierEntregaNombre),
    },
    {
      key: 'agencia',
      label: 'AGENCIA / PUNTO',
      weight: 0.20,
      align: 'left',
      render: (d) => safeStr(d.agenciaNombre),
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
      right: `${domicilio} domicilio · ${totalAgencia} agencia/punto · ${couriersSet.size} courier${couriersSet.size === 1 ? '' : 's'} · ${agenciasSet.size} agencia${agenciasSet.size === 1 ? '' : 's'}`,
    });

    drawFirmas(ctx, [
      { titulo: 'Responsable de envío', subtitulo: 'ECUBOX' },
      { titulo: 'Recibido conforme', subtitulo: 'Courier de entrega / Agencia' },
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
