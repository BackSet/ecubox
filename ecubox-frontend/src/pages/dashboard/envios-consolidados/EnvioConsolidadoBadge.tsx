import {
  Ban,
  Boxes,
  Lock,
  PackageCheck,
  PlaneLanding,
  Send,
  Unlock,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import type {
  EnvioConsolidado,
  EstadoEnvioConsolidadoOperativo,
} from '@/types/envio-consolidado';

export const ENVIO_CONSOLIDADO_ESTADO_ORDEN: EstadoEnvioConsolidadoOperativo[] = [
  'VACIO',
  'EN_PREPARACION',
  'CERRADO',
  'ENVIADO_DESDE_USA',
  'ARRIBADO_ECUADOR',
  'RECIBIDO_EN_BODEGA',
  'LIQUIDADO',
  'CANCELADO',
];

export function resolveEstadoOperativoConsolidado(
  envio: Pick<
    EnvioConsolidado,
    'estadoOperativo' | 'cerrado' | 'totalPaquetes' | 'estadoPago'
  >,
): EstadoEnvioConsolidadoOperativo {
  if (envio.estadoOperativo) return envio.estadoOperativo;
  // Fallback para respuestas pre-V107
  if (envio.estadoPago === 'PAGADO') return 'LIQUIDADO';
  if (envio.cerrado) return 'CERRADO';
  if (envio.totalPaquetes > 0) return 'EN_PREPARACION';
  return 'VACIO';
}

/**
 * Estado operativo persistido del envío consolidado — flujo v2 (V107).
 */
/** Descripciones de referencia del estado operativo del envío consolidado — flujo v2 (V107). */
export const ENVIO_CONSOLIDADO_ESTADO_DESCRIPCIONES: Record<EstadoEnvioConsolidadoOperativo, string> = {
  VACIO: 'Envío consolidado creado sin paquetes.',
  EN_PREPARACION: 'Se están registrando los paquetes que viajan en ese Envío consolidado.',
  CERRADO: 'Ya se terminó de registrar la información del Envío consolidado y sus paquetes.',
  ENVIADO_DESDE_USA: 'El Envío consolidado fue marcado como enviado desde USA.',
  ARRIBADO_ECUADOR: 'El Envío consolidado llegó a Ecuador / aduana destino.',
  RECIBIDO_EN_BODEGA: 'El Envío consolidado fue recibido en Lote de recepción.',
  LIQUIDADO: 'Cierre administrativo del Envío consolidado.',
  CANCELADO: 'Envío consolidado anulado.',
};

export const ENVIO_CONSOLIDADO_ESTADO_UI: Record<
  EstadoEnvioConsolidadoOperativo,
  { label: string; tone: StatusTone; icon: LucideIcon }
> = {
  VACIO:            { label: 'Vacío',              tone: 'neutral',  icon: Boxes       },
  EN_PREPARACION:   { label: 'En preparación',     tone: 'info',     icon: Unlock      },
  CERRADO:          { label: 'Cerrado',             tone: 'primary',  icon: Lock        },
  ENVIADO_DESDE_USA:{ label: 'Enviado desde USA',  tone: 'primary',  icon: Send        },
  ARRIBADO_ECUADOR: { label: 'Arribado a Ecuador',  tone: 'primary',  icon: PlaneLanding},
  RECIBIDO_EN_BODEGA:{ label: 'Recibido en bodega',tone: 'success',  icon: PackageCheck},
  LIQUIDADO:        { label: 'Liquidado',           tone: 'success',  icon: Wallet      },
  CANCELADO:        { label: 'Cancelado',           tone: 'neutral',  icon: Ban         },
};

export function EnvioConsolidadoBadge({
  cerrado,
  estadoOperativo,
}: {
  cerrado: boolean;
  estadoOperativo?: EstadoEnvioConsolidadoOperativo | null;
}) {
  const estado = estadoOperativo || (cerrado ? 'CERRADO' : 'EN_PREPARACION');
  const ui = ENVIO_CONSOLIDADO_ESTADO_UI[estado];
  const Icon = ui.icon;
  return (
    <StatusBadge tone={ui.tone} title={ENVIO_CONSOLIDADO_ESTADO_DESCRIPCIONES[estado]}>
      <Icon className="h-3 w-3" />
      {ui.label}
    </StatusBadge>
  );
}
