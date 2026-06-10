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
 * Catálogo unificado de estados de guía master para la vista del operario.
 * Sincronizado con el enum del backend tras la migración V107.
 */

export const GUIA_MASTER_ESTADO_LABELS: Record<EstadoGuiaMaster, string> = {
  SIN_PAQUETES_REGISTRADOS: 'Sin paquetes registrados',
  CON_PAQUETES_REGISTRADOS: 'Con paquetes registrados',
  PENDIENTE_VERIFICACION: 'Pendiente de verificación',
  VERIFICADA: 'Verificada',
  ENVIO_PARCIAL: 'Envío parcial',
  ENVIO_COMPLETO: 'Envío completo',
  RECEPCION_PARCIAL: 'Recepción parcial',
  RECEPCION_COMPLETA: 'Recepción completa',
  DESPACHO_PARCIAL: 'Despacho parcial',
  DESPACHO_COMPLETADO: 'Despacho completado',
  CANCELADA: 'Cancelada',
  EN_REVISION: 'En revisión',
};

export const GUIA_MASTER_ESTADO_LABELS_CORTOS: Record<EstadoGuiaMaster, string> = {
  SIN_PAQUETES_REGISTRADOS: 'Sin paquetes',
  CON_PAQUETES_REGISTRADOS: 'Con paquetes',
  PENDIENTE_VERIFICACION: 'Pend. verificación',
  VERIFICADA: 'Verificada',
  ENVIO_PARCIAL: 'Envío parcial',
  ENVIO_COMPLETO: 'Envío completo',
  RECEPCION_PARCIAL: 'Rec. parcial',
  RECEPCION_COMPLETA: 'Rec. completa',
  DESPACHO_PARCIAL: 'Desp. parcial',
  DESPACHO_COMPLETADO: 'Despachada',
  CANCELADA: 'Cancelada',
  EN_REVISION: 'En revisión',
};

export const GUIA_MASTER_ESTADO_LABELS_PLURAL: Record<EstadoGuiaMaster, string> = {
  SIN_PAQUETES_REGISTRADOS: 'Sin paquetes registrados',
  CON_PAQUETES_REGISTRADOS: 'Con paquetes registrados',
  PENDIENTE_VERIFICACION: 'Pendientes de verificación',
  VERIFICADA: 'Verificadas',
  ENVIO_PARCIAL: 'Envío parcial',
  ENVIO_COMPLETO: 'Envío completo',
  RECEPCION_PARCIAL: 'Recepción parcial',
  RECEPCION_COMPLETA: 'Recepción completa',
  DESPACHO_PARCIAL: 'Despacho parcial',
  DESPACHO_COMPLETADO: 'Despacho completado',
  CANCELADA: 'Canceladas',
  EN_REVISION: 'En revisión',
};

export const GUIA_MASTER_ESTADO_DESCRIPCIONES: Record<EstadoGuiaMaster, string> = {
  SIN_PAQUETES_REGISTRADOS:
    'La guía existe en el sistema pero aún no tiene paquetes asociados.',
  CON_PAQUETES_REGISTRADOS:
    'Hay paquetes registrados pero ninguno fue asignado a un envío consolidado todavía.',
  PENDIENTE_VERIFICACION:
    'Guía creada por el cliente. Pendiente de revisión y aprobación por el operario.',
  VERIFICADA:
    'Aprobada por el operario. El sistema calcula automáticamente el estado derivado.',
  ENVIO_PARCIAL:
    'Al menos un paquete está en un envío consolidado pero no todos (o no alcanza el total esperado).',
  ENVIO_COMPLETO:
    'Todos los paquetes esperados están en un envío consolidado. Lista para salir de USA.',
  RECEPCION_PARCIAL:
    'Se recibió al menos un paquete en bodega; faltan otros por llegar o registrarse.',
  RECEPCION_COMPLETA:
    'Todos los paquetes esperados están en bodega. Lista para iniciar despacho.',
  DESPACHO_PARCIAL:
    'Al menos un paquete fue despachado hacia el destino; quedan paquetes pendientes.',
  DESPACHO_COMPLETADO:
    'Todos los paquetes fueron despachados. Cierre exitoso.',
  CANCELADA:
    'Anulada por el operario (error de registro, cancelación del cliente o faltante definitivo).',
  EN_REVISION:
    'Pausada por el operario para validar algún dato. El recálculo automático no la sobreescribe.',
};

export const GUIA_MASTER_ESTADO_TONES: Record<EstadoGuiaMaster, StatusTone> = {
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

export const GUIA_MASTER_ESTADO_ICONS: Record<EstadoGuiaMaster, LucideIcon> = {
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

export const GUIA_MASTER_ESTADO_ORDEN: EstadoGuiaMaster[] = [
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

/** Estados terminales (la guía ya no avanzará más en el flujo automático). */
export const GUIA_MASTER_ESTADOS_TERMINALES: ReadonlySet<EstadoGuiaMaster> = new Set<EstadoGuiaMaster>([
  'DESPACHO_COMPLETADO',
  'CANCELADA',
]);

/** Estados que congelan el recálculo automático. */
export const GUIA_MASTER_ESTADOS_CONGELADOS: ReadonlySet<EstadoGuiaMaster> = new Set<EstadoGuiaMaster>([
  'PENDIENTE_VERIFICACION',
  'EN_REVISION',
  'DESPACHO_COMPLETADO',
  'CANCELADA',
]);

export interface GuiaMasterEstadoBadgeProps {
  estado: EstadoGuiaMaster;
  withIcon?: boolean;
  withTitle?: boolean;
}

export function GuiaMasterEstadoBadge({
  estado,
  withIcon = true,
  withTitle = true,
}: GuiaMasterEstadoBadgeProps) {
  const Icon = GUIA_MASTER_ESTADO_ICONS[estado];
  return (
    <StatusBadge
      tone={GUIA_MASTER_ESTADO_TONES[estado] ?? 'neutral'}
      title={withTitle ? GUIA_MASTER_ESTADO_DESCRIPCIONES[estado] : undefined}
      icon={withIcon && Icon ? <Icon className="h-3 w-3" /> : undefined}
    >
      {GUIA_MASTER_ESTADO_LABELS[estado] ?? estado}
    </StatusBadge>
  );
}
