import { jsPDF } from 'jspdf';
import type { TrackingResponse } from '@/lib/api/tracking.service';
import {
  formatPdfFecha,
  formatPdfFechaHora,
  pdfSafe,
  TrackingDocumentRenderer,
  type DocumentTimelineItem,
} from '@/lib/pdf/builders/trackingPdfDocument';
import { kgToLbs, lbsToKg } from '@/lib/utils/weight';

function labelTipoEntrega(tipo?: string): string {
  if (!tipo) return 'Modalidad no disponible';
  if (tipo === 'DOMICILIO') return 'Entrega a domicilio';
  if (tipo === 'AGENCIA') return 'Retiro en agencia';
  if (tipo === 'AGENCIA_COURIER_ENTREGA') return 'Retiro en agencia aliada';
  return tipo;
}

function trackingHost(raw?: string): string {
  if (!raw || !raw.trim()) return '-';
  const value = raw.trim();
  try {
    return new URL(value).host || value;
  } catch {
    return value;
  }
}

function formatPesoDual(kg?: number | null, lbs?: number | null): string {
  const safeKg = kg ?? (lbs != null ? lbsToKg(lbs) : null);
  const safeLbs = lbs ?? (kg != null ? kgToLbs(kg) : null);
  if (safeKg == null && safeLbs == null) return '0 kg / 0 lbs';
  return `${safeKg ?? 0} kg / ${safeLbs ?? 0} lbs`;
}

function buildTimelineItems(
  estados: NonNullable<TrackingResponse['estados']>,
  currentIndex: number
): DocumentTimelineItem[] {
  let baseCounter = 0;
  const baseById = new Map<number, number>();
  estados.forEach((item) => {
    if (item.tipoFlujo === 'ALTERNO') return;
    baseCounter += 1;
    baseById.set(item.id, baseCounter);
  });

  return estados.map((item, idx) => {
    const isCompleted = !item.esActual && currentIndex >= 0 && idx < currentIndex;
    const isAlterno = item.tipoFlujo === 'ALTERNO';
    const baseStep = baseById.get(item.id);
    const subtitle = isAlterno
      ? 'Novedad informativa'
      : baseStep != null
        ? `Paso base ${baseStep}`
        : undefined;

    return {
      title: item.nombre,
      subtitle,
      date: item.fechaOcurrencia
        ? formatPdfFechaHora(item.fechaOcurrencia)
        : item.esActual || isCompleted
          ? undefined
          : undefined,
      isCurrent: item.esActual,
      isCompleted,
      isAlternate: isAlterno,
    };
  });
}

export function buildTrackingPdf(data: TrackingResponse): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const renderer = new TrackingDocumentRenderer(doc, { repeatHeroOnNewPage: true });

  const estados = data.estados ?? [];
  const currentIndex = estados.findIndex((s) => s.esActual);
  const totalBase = estados.filter((s) => s.tipoFlujo !== 'ALTERNO').length;
  const pasoBaseActual =
    currentIndex >= 0
      ? estados.slice(0, currentIndex + 1).filter((s) => s.tipoFlujo !== 'ALTERNO').length
      : 0;
  const progressPct = totalBase > 0 ? (pasoBaseActual / totalBase) * 100 : 0;

  const showDias =
    data.diasMaxRetiro != null && (data.diasTranscurridos != null || data.diasRestantes != null);

  const heroStats = [
  { label: 'Avance', value: `${Math.round(progressPct)}%` },
  ...(showDias
    ? [
        { label: 'Días transcurridos', value: String(data.diasTranscurridos ?? 0) },
        { label: 'Días restantes', value: String(data.diasRestantes ?? 0) },
      ]
    : []),
  ];

  renderer.drawHero({
    docType: 'Comprobante de rastreo',
    reference: pdfSafe(data.numeroGuia),
    statusLabel: pdfSafe(data.estadoRastreoNombre),
    statusVariant: 'accent',
    subtitle: `Estado actualizado el ${formatPdfFecha(data.fechaEstadoDesde)}`,
    progressPct,
    progressCaption:
      totalBase > 0
        ? `Paso base ${pasoBaseActual} de ${totalBase} en el flujo estimado del envío`
        : 'Flujo de estados no configurado',
    stats: heroStats.slice(0, 3),
  });

  if (data.flujoActual === 'ALTERNO') {
    renderer.drawCallout(
      'warning',
      'Envío en flujo alterno',
      data.motivoAlterno ?? 'Incidencia operativa registrada en el recorrido del paquete.'
    );
  }

  if (data.leyenda) {
    renderer.drawCallout('info', 'Información adicional', data.leyenda);
  }

  if (showDias && data.diasRestantes === 0) {
    renderer.drawCallout(
      'info',
      'Plazo de retiro',
      'El periodo de espera configurado para este envío ya se cumplió.'
    );
  }

  renderer.drawTimeline(buildTimelineItems(estados, currentIndex));

  const piezas = data.master?.piezas ?? [];
  if (piezas.length > 1) {
    const titulo = data.master?.trackingBase
      ? `Otras piezas de la guía ${data.master.trackingBase}`
      : 'Otras piezas de esta guía';
    renderer.drawSectionTitle(titulo, 'Piezas relacionadas al mismo consolidado.');
    renderer.drawTable(
      [
        { key: 'guia', label: 'Número de guía', widthRatio: 0.38 },
        { key: 'pieza', label: 'Pieza', widthRatio: 0.14 },
        { key: 'estado', label: 'Estado actual', widthRatio: 0.48 },
      ],
      piezas.map((p) => ({
        guia: pdfSafe(p.numeroGuia),
        pieza: p.piezaNumero && p.piezaTotal ? `${p.piezaNumero}/${p.piezaTotal}` : '-',
        estado: pdfSafe(p.estadoActualNombre),
      }))
    );
  }

  if (data.despacho) {
    const d = data.despacho;
    const agenciaDistribucion = pdfSafe(data.operadorEntrega?.courierEntregaNombre);

    renderer.drawSectionTitle(
      'Detalle logístico',
      'Información del despacho y consolidación del lote.'
    );
    renderer.drawKeyValueGrid([
      [
        { label: 'Guía de envío', value: pdfSafe(d.numeroGuia) },
        { label: 'Código de seguridad', value: pdfSafe(d.codigoPrecinto) },
      ],
      [
        { label: 'Agencia de distribución', value: agenciaDistribucion },
        { label: 'Envíos en el lote', value: String(d.totalPaquetes ?? 0) },
      ],
      [
        { label: 'Bolsas de transporte', value: String(d.totalSacas ?? 0) },
        { label: 'Peso total estimado', value: formatPesoDual(d.pesoTotalKg, d.pesoTotalLbs) },
      ],
    ]);

    const paquetes = data.paquetesDespacho ?? [];
    if (paquetes.length > 0) {
      renderer.drawSectionTitle(
        'Paquetes del despacho',
        `${paquetes.length} paquete(s) incluidos en este lote.`
      );
      renderer.drawTable(
        [
          { key: 'guia', label: 'Número de guía', widthRatio: 0.35 },
          { key: 'estado', label: 'Estado actual', widthRatio: 0.47 },
          { key: 'peso', label: 'Peso kg/lbs', widthRatio: 0.18 },
        ],
        paquetes.map((p) => ({
          guia: pdfSafe(p.numeroGuia),
          estado: pdfSafe(p.estadoRastreoNombre),
          peso: formatPesoDual(p.pesoKg, p.pesoLbs),
        }))
      );
    }
  }

  const dest = data.consignatario;
  renderer.drawSectionTitle(
    'Destinatario',
    'Datos disponibles según los eventos registrados por ECUBOX.'
  );
  renderer.drawKeyValueGrid([
    [
      { label: 'Nombre', value: pdfSafe(dest?.nombre ?? data.consignatarioNombre) },
      {
        label: 'Provincia / Cantón',
        value: `${pdfSafe(dest?.provincia)} / ${pdfSafe(dest?.canton)}`,
      },
    ],
  ]);

  if (data.despacho && data.operadorEntrega) {
    const op = data.operadorEntrega;
    renderer.drawSectionTitle(
      'Entrega',
      labelTipoEntrega(op.tipoEntrega)
    );

    const entregaRows: { label: string; value: string }[][] = [
      [
        { label: 'Courier de entrega', value: pdfSafe(op.courierEntregaNombre) },
        {
          label: 'Horario de reparto',
          value: pdfSafe(
            op.horarioRepartoCourierEntrega ??
              op.horarioAtencionAgencia ??
              op.horarioAtencionAgenciaCourierEntrega
          ),
        },
      ],
      [
        {
          label: 'Días máx. retiro domicilio',
          value: String(op.diasMaxRetiroDomicilio ?? 'No configurado'),
        },
        {
          label: 'Tracking del courier',
          value: (() => {
            const url = pdfSafe(op.paginaTrackingCourierEntrega);
            if (url === '-') return 'No disponible para este envío';
            return `${trackingHost(op.paginaTrackingCourierEntrega)} · ${url}`;
          })(),
        },
      ],
    ];

    if (op.tipoEntrega === 'AGENCIA') {
      entregaRows.push(
        [
          { label: 'Agencia', value: pdfSafe(op.agenciaNombre) },
          { label: 'Horario de atención', value: pdfSafe(op.horarioAtencionAgencia) },
        ],
        [
          {
            label: 'Dirección',
            value: `${pdfSafe(op.agenciaDireccion)} — ${pdfSafe(op.agenciaProvincia)} / ${pdfSafe(op.agenciaCanton)}`,
          },
          {
            label: 'Días máx. retiro agencia',
            value: String(op.diasMaxRetiroAgencia ?? 'No configurado'),
          },
        ],
        [
          {
            label: 'Encargado para el retiro',
            value: pdfSafe(op.agenciaEncargado),
          },
        ]
      );
    } else if (op.tipoEntrega === 'AGENCIA_COURIER_ENTREGA') {
      entregaRows.push(
        [
          { label: 'Punto de entrega', value: pdfSafe(op.agenciaCourierEntregaEtiqueta) },
          {
            label: 'Horario de atención',
            value: pdfSafe(op.horarioAtencionAgenciaCourierEntrega),
          },
        ],
        [
          {
            label: 'Dirección',
            value: `${pdfSafe(op.agenciaCourierEntregaDireccion)} — ${pdfSafe(op.agenciaCourierEntregaProvincia)} / ${pdfSafe(op.agenciaCourierEntregaCanton)}`,
          },
          {
            label: 'Días máx. retiro',
            value: String(op.diasMaxRetiroAgenciaCourierEntrega ?? 'No configurado'),
          },
        ]
      );
    }

    renderer.drawKeyValueGrid(entregaRows);
  }

  renderer.drawFooters(`Guía ${pdfSafe(data.numeroGuia)} · Comprobante de rastreo`);
  return doc;
}
