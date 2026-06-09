import {
  Boxes,
  Lock,
  PackageCheck,
  Truck,
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
  'ENVIADO_DESDE_USA',
  'RECIBIDO_EN_BODEGA',
  'LIQUIDADO',
];

export function resolveEstadoOperativoConsolidado(
  envio: Pick<
    EnvioConsolidado,
    'estadoOperativo' | 'cerrado' | 'totalPaquetes' | 'estadoPago'
  >,
): EstadoEnvioConsolidadoOperativo {
  if (envio.estadoOperativo) return envio.estadoOperativo;
  if (envio.estadoPago === 'PAGADO') return 'LIQUIDADO';
  if (envio.cerrado) return 'ENVIADO_DESDE_USA';
  if (envio.totalPaquetes > 0) return 'EN_PREPARACION';
  return 'VACIO';
}

/**
 * Estado operativo derivado del envio consolidado.
 * `cerrado` queda como fallback operativo para respuestas antiguas del backend.
 */
export const ENVIO_CONSOLIDADO_ESTADO_UI: Record<
  EstadoEnvioConsolidadoOperativo,
  { label: string; tone: StatusTone; icon: LucideIcon }
> = {
  VACIO: { label: 'Vacío', tone: 'neutral', icon: Boxes },
  EN_PREPARACION: { label: 'En preparación', tone: 'info', icon: Unlock },
  ENVIADO_DESDE_USA: { label: 'Enviado desde USA', tone: 'primary', icon: Truck },
  RECIBIDO_EN_BODEGA: { label: 'Recibido en bodega', tone: 'success', icon: PackageCheck },
  LIQUIDADO: { label: 'Liquidado', tone: 'success', icon: Wallet },
};

export function EnvioConsolidadoBadge({
  cerrado,
  estadoOperativo,
}: {
  cerrado: boolean;
  estadoOperativo?: EstadoEnvioConsolidadoOperativo | null;
}) {
  const ui = estadoOperativo ? ENVIO_CONSOLIDADO_ESTADO_UI[estadoOperativo] : null;
  if (ui) {
    const Icon = ui.icon;
    return (
      <StatusBadge tone={ui.tone}>
        <Icon className="h-3 w-3" />
        {ui.label}
      </StatusBadge>
    );
  }
  const Icon = cerrado ? Lock : Unlock;
  return (
    <StatusBadge tone={cerrado ? 'neutral' : 'success'}>
      <Icon className="h-3 w-3" />
      {cerrado ? 'Enviado desde USA' : 'En preparación'}
    </StatusBadge>
  );
}
