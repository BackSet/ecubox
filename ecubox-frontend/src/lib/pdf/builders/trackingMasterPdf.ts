import { jsPDF } from 'jspdf';
import type {
  EstadoGuiaMaster,
  TrackingMasterEventoItem,
  TrackingMasterResponse,
  TrackingPiezaItem,
} from '@/lib/api/tracking.service';
import {
  formatPdfFecha,
  formatPdfFechaHora,
  pdfSafe,
  TrackingDocumentRenderer,
  type DocumentBadgeVariant,
  type DocumentTimelineItem,
} from '@/lib/pdf/builders/trackingPdfDocument';
import { MI_GUIA_ESTADO_LABELS } from '@/lib/estados/guiaMasterEstados';

// Comprobante visible para el cliente: usa las etiquetas del catálogo compartido.
const ESTADO_LABELS: Record<EstadoGuiaMaster, string> = MI_GUIA_ESTADO_LABELS;

function variantFromEstado(estado?: EstadoGuiaMaster): DocumentBadgeVariant {
  switch (estado) {
    case 'RECEPCION_COMPLETA':
    case 'DESPACHO_COMPLETADO':
      return 'success';
    case 'RECEPCION_PARCIAL':
    case 'ENVIO_PARCIAL':
    case 'ENVIO_COMPLETO':
    case 'DESPACHO_PARCIAL':
      return 'info';
    case 'PENDIENTE_VERIFICACION':
    case 'EN_REVISION':
      return 'warning';
    case 'CANCELADA':
      return 'destructive';
    default:
      return 'neutral';
  }
}

function piezaEstadoLabel(item: TrackingPiezaItem): string {
  const base = pdfSafe(item.estadoActualNombre);
  if (item.bloqueado) return `${base} · Bloqueada`;
  if (item.enFlujoAlterno) return `${base} · Flujo alterno`;
  return base;
}

function buildActivityTimeline(events: TrackingMasterEventoItem[]): DocumentTimelineItem[] {
  const ordered = [...events]
    .sort((a, b) => {
      const at = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
      const bt = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
      return bt - at;
    })
    .slice(0, 30);

  return ordered.map((ev) => {
    const piezaLbl =
      ev.piezaNumero != null
        ? `Paquete ${ev.piezaNumero}${ev.piezaTotal ? `/${ev.piezaTotal}` : ''}`
        : 'Paquete';
    const title = ev.estadoNombre ? `${piezaLbl} · ${ev.estadoNombre}` : piezaLbl;
    return {
      title,
      subtitle: pdfSafe(ev.numeroGuia),
      date: ev.occurredAt ? formatPdfFechaHora(ev.occurredAt) : undefined,
      isCurrent: false,
      isCompleted: true,
    };
  });
}

export function buildTrackingMasterPdf(data: TrackingMasterResponse): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const renderer = new TrackingDocumentRenderer(doc, { repeatHeroOnNewPage: true });

  const total = data.totalPiezasEsperadas ?? data.piezasRegistradas ?? 0;
  const recibidas = data.piezasRecibidas ?? 0;
  const despachadas = data.piezasDespachadas ?? 0;
  const registradas = data.piezasRegistradas ?? 0;
  const estadoLabel = data.estadoGlobal ? ESTADO_LABELS[data.estadoGlobal] : 'Sin estado';
  const pctRec = total > 0 ? Math.min(100, (recibidas / total) * 100) : 0;

  renderer.drawHero({
    docType: 'Comprobante de guía',
    reference: pdfSafe(data.trackingBase),
    statusLabel: estadoLabel,
    statusVariant: variantFromEstado(data.estadoGlobal),
    subtitle: data.consignatarioNombre
      ? `Consignatario: ${pdfSafe(data.consignatarioNombre)}`
      : undefined,
    progressPct: pctRec,
    progressCaption:
      total > 0
        ? `Recepción ${recibidas}/${total} (${Math.round(pctRec)}%) · Despacho ${despachadas}/${total} (${Math.round(total > 0 ? (despachadas / total) * 100 : 0)}%)`
        : 'Total de paquetes esperados aún no definido',
    stats: [
      { label: 'Esperadas', value: String(total) },
      { label: 'Registradas', value: String(registradas) },
      { label: 'Recibidas', value: String(recibidas) },
      { label: 'Despachadas', value: String(despachadas) },
    ],
  });

  if (total === 0) {
    renderer.drawCallout(
      'info',
      'En preparación',
      'Aún no se ha definido el total de paquetes esperados para esta guía.'
    );
  }

  renderer.drawSectionTitle(
    'Fechas clave',
    'Hitos de tu guía.'
  );
  renderer.drawKeyValueGrid([
    [
      { label: 'Primera recepción', value: formatPdfFecha(data.fechaPrimeraRecepcion) },
      { label: 'Primer despacho', value: formatPdfFecha(data.fechaPrimeraPiezaDespachada) },
    ],
    [
      { label: 'Última actualización', value: formatPdfFecha(data.ultimaActualizacion) },
      { label: 'Estado global', value: estadoLabel },
    ],
  ]);

  const dest = data.consignatario;
  const nombre = dest?.nombre ?? data.consignatarioNombre ?? null;
  const provincia = dest?.provincia ?? null;
  const canton = dest?.canton ?? null;
  const tieneUbicacion = Boolean(provincia || canton);

  if (nombre || tieneUbicacion) {
    renderer.drawSectionTitle(
      'Consignatario',
      'Por privacidad no se exponen teléfonos ni direcciones exactas.'
    );
    renderer.drawKeyValueGrid([
      [
        { label: 'Nombre', value: pdfSafe(nombre) },
        {
          label: 'Provincia / Cantón',
          value: tieneUbicacion ? `${provincia ?? '-'} / ${canton ?? '-'}` : 'No disponible',
        },
      ],
    ]);
  }

  const piezas = data.piezas ?? [];
  if (piezas.length === 0) {
    renderer.drawSectionTitle('Paquetes de la guía');
    renderer.drawCallout('info', 'Sin paquetes registrados', 'Aún no se han registrado paquetes de esta guía.');
  } else {
    renderer.drawSectionTitle(
      `Paquetes de la guía (${piezas.length})`,
      'Listado de paquetes y su estado actual.'
    );
    renderer.drawTable(
      [
        { key: 'pieza', label: 'Paquete', widthRatio: 0.14 },
        { key: 'guia', label: 'Número de guía', widthRatio: 0.42 },
        { key: 'estado', label: 'Estado actual', widthRatio: 0.44 },
      ],
      piezas.map((p) => ({
        pieza:
          p.piezaNumero != null
            ? `${p.piezaNumero}${p.piezaTotal ? `/${p.piezaTotal}` : ''}`
            : '-',
        guia: pdfSafe(p.numeroGuia),
        estado: piezaEstadoLabel(p),
      }))
    );
  }

  const timeline = data.timeline ?? [];
  if (timeline.length > 0) {
    renderer.drawTimeline(buildActivityTimeline(timeline), 14, {
      title: 'Actividad reciente',
      description: 'Últimos eventos registrados en los paquetes de esta guía.',
    });
  }

  renderer.drawFooters(`Guía ${pdfSafe(data.trackingBase)} · Comprobante de rastreo`);
  return doc;
}
