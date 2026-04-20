import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  PackageCheck,
  PackageOpen,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import type { EstadoGuiaMaster } from '@/types/guia-master';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';

/**
 * Catalogo unificado de estados de guia master para la vista del operario.
 * Sincronizado con el enum del backend tras la migracion V66.
 */

export const GUIA_MASTER_ESTADO_LABELS: Record<EstadoGuiaMaster, string> = {
  EN_ESPERA_RECEPCION: 'En espera de recepción',
  RECEPCION_PARCIAL: 'Recepción parcial',
  RECEPCION_COMPLETA: 'Recepción completa',
  DESPACHO_PARCIAL: 'Despacho parcial',
  DESPACHO_COMPLETADO: 'Despacho completado',
  DESPACHO_INCOMPLETO: 'Despacho incompleto',
  CANCELADA: 'Cancelada',
  EN_REVISION: 'En revisión',
};

export const GUIA_MASTER_ESTADO_LABELS_CORTOS: Record<EstadoGuiaMaster, string> = {
  EN_ESPERA_RECEPCION: 'En espera',
  RECEPCION_PARCIAL: 'Rec. parcial',
  RECEPCION_COMPLETA: 'Rec. completa',
  DESPACHO_PARCIAL: 'Desp. parcial',
  DESPACHO_COMPLETADO: 'Despachada',
  DESPACHO_INCOMPLETO: 'Desp. incompleto',
  CANCELADA: 'Cancelada',
  EN_REVISION: 'En revisión',
};

export const GUIA_MASTER_ESTADO_LABELS_PLURAL: Record<EstadoGuiaMaster, string> = {
  EN_ESPERA_RECEPCION: 'En espera de recepción',
  RECEPCION_PARCIAL: 'Recepción parcial',
  RECEPCION_COMPLETA: 'Recepción completa',
  DESPACHO_PARCIAL: 'Despacho parcial',
  DESPACHO_COMPLETADO: 'Despacho completado',
  DESPACHO_INCOMPLETO: 'Despacho incompleto',
  CANCELADA: 'Canceladas',
  EN_REVISION: 'En revisión',
};

export const GUIA_MASTER_ESTADO_DESCRIPCIONES: Record<EstadoGuiaMaster, string> = {
  EN_ESPERA_RECEPCION:
    'La guia esta registrada pero aun no se ha recibido ninguna pieza fisica en la bodega.',
  RECEPCION_PARCIAL:
    'Se recibio al menos una pieza en bodega; faltan otras por llegar o registrarse.',
  RECEPCION_COMPLETA:
    'Todas las piezas esperadas estan en bodega. Lista para iniciar despacho.',
  DESPACHO_PARCIAL:
    'Al menos una pieza fue despachada hacia el destino; quedan piezas pendientes.',
  DESPACHO_COMPLETADO:
    'Todas las piezas fueron despachadas. Cierre exitoso.',
  DESPACHO_INCOMPLETO:
    'Cerrada manualmente o por timeout aceptando que faltaron piezas por llegar.',
  CANCELADA:
    'Anulada por el operario antes de despachar (error de registro o cancelacion del cliente).',
  EN_REVISION:
    'Pausada por el operario para validar algun dato. El recalculo automatico no la sobreescribe.',
};

export const GUIA_MASTER_ESTADO_TONES: Record<EstadoGuiaMaster, StatusTone> = {
  EN_ESPERA_RECEPCION: 'neutral',
  RECEPCION_PARCIAL: 'warning',
  RECEPCION_COMPLETA: 'info',
  DESPACHO_PARCIAL: 'primary',
  DESPACHO_COMPLETADO: 'success',
  DESPACHO_INCOMPLETO: 'error',
  CANCELADA: 'neutral',
  EN_REVISION: 'warning',
};

export const GUIA_MASTER_ESTADO_ICONS: Record<EstadoGuiaMaster, LucideIcon> = {
  EN_ESPERA_RECEPCION: Clock,
  RECEPCION_PARCIAL: PackageOpen,
  RECEPCION_COMPLETA: PackageCheck,
  DESPACHO_PARCIAL: Truck,
  DESPACHO_COMPLETADO: CheckCircle2,
  DESPACHO_INCOMPLETO: AlertTriangle,
  CANCELADA: Ban,
  EN_REVISION: Eye,
};

/** Orden recomendado para chips/filtros (sigue el ciclo de vida natural). */
export const GUIA_MASTER_ESTADO_ORDEN: EstadoGuiaMaster[] = [
  'EN_ESPERA_RECEPCION',
  'RECEPCION_PARCIAL',
  'RECEPCION_COMPLETA',
  'DESPACHO_PARCIAL',
  'EN_REVISION',
  'DESPACHO_COMPLETADO',
  'DESPACHO_INCOMPLETO',
  'CANCELADA',
];

/** Estados terminales (la guia ya no avanzara mas en el flujo automatico). */
export const GUIA_MASTER_ESTADOS_TERMINALES: ReadonlySet<EstadoGuiaMaster> = new Set<EstadoGuiaMaster>([
  'DESPACHO_COMPLETADO',
  'DESPACHO_INCOMPLETO',
  'CANCELADA',
]);

/** Estados que congelan el recalculo automatico (terminales + EN_REVISION). */
export const GUIA_MASTER_ESTADOS_CONGELADOS: ReadonlySet<EstadoGuiaMaster> = new Set<EstadoGuiaMaster>([
  ...GUIA_MASTER_ESTADOS_TERMINALES,
  'EN_REVISION',
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
