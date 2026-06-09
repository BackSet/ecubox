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
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';

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
    'Registraste la guía pero aún no asociaste paquetes. Cuando los registres, podrás seguir su avance.',
  CON_PAQUETES_REGISTRADOS:
    'Ya hay paquetes asociados; están a la espera de ser incluidos en un envío consolidado.',
  PENDIENTE_VERIFICACION:
    'Tu guía está siendo revisada por nuestro equipo. Te notificaremos cuando sea aprobada.',
  VERIFICADA:
    'Tu guía fue aprobada. El sistema actualizará automáticamente su estado conforme avancen los paquetes.',
  ENVIO_PARCIAL:
    'Algunos de tus paquetes ya están en un envío consolidado hacia Ecuador; otros aún están pendientes.',
  ENVIO_COMPLETO:
    'Todos tus paquetes están en un envío consolidado y pronto saldrán hacia Ecuador.',
  RECEPCION_PARCIAL:
    'Algunos paquetes ya llegaron a la bodega en Ecuador y otros siguen en camino.',
  RECEPCION_COMPLETA:
    'Todos los paquetes están en la bodega en Ecuador, listos para ser despachados.',
  DESPACHO_PARCIAL:
    'Parte de tus paquetes ya está en camino a tu dirección. El resto se enviará pronto.',
  DESPACHO_COMPLETADO:
    'Todos los paquetes fueron despachados y entregados a tu consignatario.',
  CANCELADA:
    'Esta guía fue cancelada. Si crees que es un error, contáctanos.',
  EN_REVISION:
    'Estamos revisando algún detalle de tu guía. Te contactaremos pronto.',
};

export const MI_GUIA_ESTADO_TONES: Record<EstadoGuiaMaster, StatusTone> = {
  SIN_PAQUETES_REGISTRADOS: 'neutral',
  CON_PAQUETES_REGISTRADOS: 'neutral',
  PENDIENTE_VERIFICACION: 'warning',
  VERIFICADA: 'info',
  ENVIO_PARCIAL: 'primary',
  ENVIO_COMPLETO: 'primary',
  RECEPCION_PARCIAL: 'info',
  RECEPCION_COMPLETA: 'info',
  DESPACHO_PARCIAL: 'primary',
  DESPACHO_COMPLETADO: 'success',
  CANCELADA: 'neutral',
  EN_REVISION: 'warning',
};

export const MI_GUIA_ESTADO_ICONS: Record<EstadoGuiaMaster, LucideIcon> = {
  SIN_PAQUETES_REGISTRADOS: Package,
  CON_PAQUETES_REGISTRADOS: Clock,
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
 * EN_REVISION y CANCELADA van al final por ser excepcionales.
 */
export const MI_GUIA_ESTADO_ORDEN: EstadoGuiaMaster[] = [
  'SIN_PAQUETES_REGISTRADOS',
  'CON_PAQUETES_REGISTRADOS',
  'PENDIENTE_VERIFICACION',
  'ENVIO_PARCIAL',
  'ENVIO_COMPLETO',
  'RECEPCION_PARCIAL',
  'RECEPCION_COMPLETA',
  'DESPACHO_PARCIAL',
  'DESPACHO_COMPLETADO',
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
