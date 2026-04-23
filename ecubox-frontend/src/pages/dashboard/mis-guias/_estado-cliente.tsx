import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  Package,
  PackageCheck,
  PackageOpen,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import type { EstadoGuiaMaster } from '@/types/guia-master';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';

/**
 * Etiquetas de estado pensadas para el CLIENTE final.
 * Evita jergas internas y usa lenguaje cercano a la experiencia del
 * cliente que envia paquetes desde EE.UU.
 *
 * Sincronizado con el enum del backend tras la migracion V66.
 */
export const MI_GUIA_ESTADO_LABELS: Record<EstadoGuiaMaster, string> = {
  SIN_PIEZAS_REGISTRADAS: 'Sin piezas registradas',
  EN_ESPERA_RECEPCION: 'En espera de recepción',
  RECEPCION_PARCIAL: 'Recibida parcialmente',
  RECEPCION_COMPLETA: 'Recibida en bodega',
  DESPACHO_PARCIAL: 'En camino (parcial)',
  DESPACHO_COMPLETADO: 'Entregada',
  DESPACHO_INCOMPLETO: 'Entregada con piezas faltantes',
  CANCELADA: 'Cancelada',
  EN_REVISION: 'En revisión',
};

export const MI_GUIA_ESTADO_LABELS_CORTOS: Record<EstadoGuiaMaster, string> = {
  SIN_PIEZAS_REGISTRADAS: 'Sin piezas',
  EN_ESPERA_RECEPCION: 'En espera',
  RECEPCION_PARCIAL: 'Parcial en bodega',
  RECEPCION_COMPLETA: 'En bodega',
  DESPACHO_PARCIAL: 'En camino',
  DESPACHO_COMPLETADO: 'Entregada',
  DESPACHO_INCOMPLETO: 'Con faltante',
  CANCELADA: 'Cancelada',
  EN_REVISION: 'En revisión',
};

export const MI_GUIA_ESTADO_DESCRIPCIONES: Record<EstadoGuiaMaster, string> = {
  SIN_PIEZAS_REGISTRADAS:
    'Registraste la guía pero aún no asociaste piezas. Cuando las registres, podrás seguir su avance.',
  EN_ESPERA_RECEPCION:
    'Ya hay piezas asociadas; aún no hemos recibido ninguna en la bodega de EE.UU. Te avisaremos cuando lleguen.',
  RECEPCION_PARCIAL:
    'Algunas piezas ya llegaron a la bodega de EE.UU. y otras siguen en camino.',
  RECEPCION_COMPLETA:
    'Todas las piezas están en la bodega de EE.UU. listas para ser despachadas a Ecuador.',
  DESPACHO_PARCIAL:
    'Parte de tus piezas ya está en camino a Ecuador. El resto se enviará pronto.',
  DESPACHO_COMPLETADO:
    'Todas las piezas fueron despachadas y entregadas a tu consignatario.',
  DESPACHO_INCOMPLETO:
    'Cerramos esta guía, pero algunas piezas no llegaron a la bodega. Contáctanos si necesitas ayuda.',
  CANCELADA:
    'Esta guía fue cancelada. Si crees que es un error, contáctanos.',
  EN_REVISION:
    'Estamos revisando algún detalle de tu guía. Te contactaremos pronto.',
};

export const MI_GUIA_ESTADO_TONES: Record<EstadoGuiaMaster, StatusTone> = {
  SIN_PIEZAS_REGISTRADAS: 'neutral',
  EN_ESPERA_RECEPCION: 'neutral',
  RECEPCION_PARCIAL: 'info',
  RECEPCION_COMPLETA: 'info',
  DESPACHO_PARCIAL: 'primary',
  DESPACHO_COMPLETADO: 'success',
  DESPACHO_INCOMPLETO: 'warning',
  CANCELADA: 'neutral',
  EN_REVISION: 'warning',
};

export const MI_GUIA_ESTADO_ICONS: Record<EstadoGuiaMaster, LucideIcon> = {
  SIN_PIEZAS_REGISTRADAS: Package,
  EN_ESPERA_RECEPCION: Clock,
  RECEPCION_PARCIAL: PackageOpen,
  RECEPCION_COMPLETA: PackageCheck,
  DESPACHO_PARCIAL: Truck,
  DESPACHO_COMPLETADO: CheckCircle2,
  DESPACHO_INCOMPLETO: AlertTriangle,
  CANCELADA: Ban,
  EN_REVISION: Eye,
};

/**
 * Orden recomendado para presentar al cliente: flujo natural del envio.
 * EN_REVISION y CANCELADA van al final por ser excepcionales.
 */
export const MI_GUIA_ESTADO_ORDEN: EstadoGuiaMaster[] = [
  'SIN_PIEZAS_REGISTRADAS',
  'EN_ESPERA_RECEPCION',
  'RECEPCION_PARCIAL',
  'RECEPCION_COMPLETA',
  'DESPACHO_PARCIAL',
  'DESPACHO_COMPLETADO',
  'DESPACHO_INCOMPLETO',
  'EN_REVISION',
  'CANCELADA',
];

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
