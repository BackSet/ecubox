import {
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  Package,
  PackageCheck,
  PackageOpen,
  Send,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import type { EstadoGuiaMaster } from '@/types/guia-master';
import type { EstadoRastreoCliente } from '@/types/estado-rastreo';
import {
  StatusBadge,
  getRastreoStatusTone,
  type StatusTone,
} from '@/components/ui/StatusBadge';
import type { EstadoLeyendaItem } from '@/components/estados/EstadosLeyendaDialog';

/**
 * Etiquetas de estado pensadas para el CLIENTE final.
 * Evita jergas internas y usa lenguaje cercano a la experiencia del
 * cliente que envía paquetes desde EE.UU.
 *
 * Sincronizado con el enum del backend tras la migración V107.
 */
export const MI_GUIA_ESTADO_LABELS: Record<EstadoGuiaMaster, string> = {
  SIN_PAQUETES_REGISTRADOS: 'Sin paquetes registrados',
  CON_PAQUETES_REGISTRADOS: 'En espera de envío',
  PENDIENTE_VERIFICACION: 'Pendiente de verificación',
  VERIFICADA: 'Verificada',
  ENVIO_PARCIAL: 'En camino a Ecuador (parcial)',
  ENVIO_COMPLETO: 'En camino a Ecuador',
  RECEPCION_PARCIAL: 'Recibida parcialmente',
  RECEPCION_COMPLETA: 'Recibida en bodega',
  DESPACHO_PARCIAL: 'En camino (parcial)',
  DESPACHO_COMPLETADO: 'Entregada',
  CANCELADA: 'Cancelada',
  EN_REVISION: 'En revisión',
};

export const MI_GUIA_ESTADO_LABELS_CORTOS: Record<EstadoGuiaMaster, string> = {
  SIN_PAQUETES_REGISTRADOS: 'Sin paquetes',
  CON_PAQUETES_REGISTRADOS: 'En espera',
  PENDIENTE_VERIFICACION: 'Pend. verificación',
  VERIFICADA: 'Verificada',
  ENVIO_PARCIAL: 'En camino (parcial)',
  ENVIO_COMPLETO: 'En camino',
  RECEPCION_PARCIAL: 'Parcial en bodega',
  RECEPCION_COMPLETA: 'En bodega',
  DESPACHO_PARCIAL: 'En camino',
  DESPACHO_COMPLETADO: 'Entregada',
  CANCELADA: 'Cancelada',
  EN_REVISION: 'En revisión',
};

export const MI_GUIA_ESTADO_DESCRIPCIONES: Record<EstadoGuiaMaster, string> = {
  SIN_PAQUETES_REGISTRADOS:
    'La Guía master existe en el sistema pero aún no tiene paquetes asociados.',
  CON_PAQUETES_REGISTRADOS:
    'Hay paquetes registrados pero ninguno fue asignado a un envío consolidado todavía.',
  PENDIENTE_VERIFICACION:
    'La Guía master fue registrada, pero aún no fue validada. Pendiente de revisión por admin/operario.',
  VERIFICADA:
    'Aprobada por el equipo. El sistema calcula automáticamente el estado derivado.',
  ENVIO_PARCIAL:
    'Algunos paquetes de la Guía master fueron incluidos en Envío consolidado, pero no todos.',
  ENVIO_COMPLETO:
    'Todos los paquetes registrados de la Guía master fueron incluidos en Envío consolidado.',
  RECEPCION_PARCIAL:
    'Algunos paquetes enviados de esa Guía master fueron recibidos en Ecuador.',
  RECEPCION_COMPLETA:
    'Todos los paquetes enviados de esa Guía master fueron recibidos.',
  DESPACHO_PARCIAL:
    'Algunos paquetes recibidos de la Guía master fueron despachados.',
  DESPACHO_COMPLETADO:
    'Todos los paquetes recibidos/despachables fueron despachados o entregados.',
  CANCELADA:
    'La Guía master fue anulada.',
  EN_REVISION:
    'La Guía master está incorrecta, dudosa o requiere corrección.',
};

export const MI_GUIA_ESTADO_TONES: Record<EstadoGuiaMaster, StatusTone> = {
  SIN_PAQUETES_REGISTRADOS: 'neutral',
  CON_PAQUETES_REGISTRADOS: 'neutral',
  PENDIENTE_VERIFICACION: 'warning',
  VERIFICADA: 'info',
  ENVIO_PARCIAL: 'primary',
  ENVIO_COMPLETO: 'primary',
  RECEPCION_PARCIAL: 'warning',
  RECEPCION_COMPLETA: 'info',
  DESPACHO_PARCIAL: 'primary',
  DESPACHO_COMPLETADO: 'success',
  CANCELADA: 'neutral',
  EN_REVISION: 'warning',
};

export const MI_GUIA_ESTADO_ICONS: Record<EstadoGuiaMaster, LucideIcon> = {
  SIN_PAQUETES_REGISTRADOS: Package,
  CON_PAQUETES_REGISTRADOS: Package,
  PENDIENTE_VERIFICACION: Clock,
  VERIFICADA: ShieldCheck,
  ENVIO_PARCIAL: Send,
  ENVIO_COMPLETO: Send,
  RECEPCION_PARCIAL: PackageOpen,
  RECEPCION_COMPLETA: PackageCheck,
  DESPACHO_PARCIAL: Truck,
  DESPACHO_COMPLETADO: CheckCircle2,
  CANCELADA: Ban,
  EN_REVISION: Eye,
};

/**
 * Orden recomendado para presentar al cliente: flujo natural del envío.
 */
export const MI_GUIA_ESTADO_ORDEN: EstadoGuiaMaster[] = [
  'PENDIENTE_VERIFICACION',
  'VERIFICADA',
  'EN_REVISION',
  'SIN_PAQUETES_REGISTRADOS',
  'CON_PAQUETES_REGISTRADOS',
  'ENVIO_PARCIAL',
  'ENVIO_COMPLETO',
  'RECEPCION_PARCIAL',
  'RECEPCION_COMPLETA',
  'DESPACHO_PARCIAL',
  'DESPACHO_COMPLETADO',
  'CANCELADA',
];

/**
 * Items para la leyenda "¿Qué significa cada estado?" de las guías del
 * cliente, en el orden natural del flujo.
 */
export function getMisGuiasLeyendaItems(): EstadoLeyendaItem[] {
  return MI_GUIA_ESTADO_ORDEN.map((estado) => ({
    key: estado,
    label: MI_GUIA_ESTADO_LABELS[estado],
    descripcion: MI_GUIA_ESTADO_DESCRIPCIONES[estado],
    tone: MI_GUIA_ESTADO_TONES[estado],
    icon: MI_GUIA_ESTADO_ICONS[estado],
  }));
}

/**
 * La leyenda configurable puede traer el placeholder {dias} (días
 * transcurridos en el estado). En el catálogo genérico no hay un paquete
 * concreto, así que se muestra como "X" (p. ej. "lleva X días en aduana").
 */
export function renderLeyendaGenerica(leyenda?: string | null): string | null {
  if (!leyenda) return null;
  return leyenda.replaceAll('{dias}', 'X');
}

/**
 * Items para la leyenda de estados de rastreo de las piezas del cliente,
 * a partir del catálogo configurable (GET /api/mis-guias/estados-rastreo).
 */
export function getEstadosRastreoLeyendaItems(
  estados: EstadoRastreoCliente[] | undefined,
): EstadoLeyendaItem[] {
  return (estados ?? []).map((e) => ({
    key: String(e.id),
    label: e.nombre,
    descripcion: renderLeyendaGenerica(e.leyenda),
    tone: getRastreoStatusTone(e.tipoFlujo ?? null),
  }));
}

interface MiGuiaEstadoBadgeProps {
  estado: EstadoGuiaMaster;
  withTitle?: boolean;
  withIcon?: boolean;
}

export function MiGuiaEstadoBadge({
  estado,
  withTitle = true,
  withIcon = true,
}: MiGuiaEstadoBadgeProps) {
  const Icon = MI_GUIA_ESTADO_ICONS[estado];
  return (
    <StatusBadge
      tone={MI_GUIA_ESTADO_TONES[estado] ?? 'neutral'}
      title={withTitle ? MI_GUIA_ESTADO_DESCRIPCIONES[estado] : undefined}
      icon={withIcon && Icon ? <Icon className="h-3 w-3" /> : undefined}
    >
      {MI_GUIA_ESTADO_LABELS[estado] ?? estado}
    </StatusBadge>
  );
}
