import { type HTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md border border-transparent bg-[var(--color-muted)] px-2 py-0.5 text-[11px] font-medium leading-none text-[var(--color-foreground)]',
  {
    variants: {
      tone: {
        success: '',
        info: '',
        warning: '',
        error: '',
        primary: '',
        neutral: '',
      },
      solid: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        tone: 'success',
        solid: true,
        class: 'border-transparent bg-[var(--color-success)] text-[var(--color-success-foreground)]',
      },
      {
        tone: 'info',
        solid: true,
        class: 'border-transparent bg-[var(--color-info)] text-[var(--color-info-foreground)]',
      },
      {
        tone: 'warning',
        solid: true,
        class: 'border-transparent bg-[var(--color-warning)] text-[var(--color-warning-foreground)]',
      },
      {
        tone: 'error',
        solid: true,
        class: 'border-transparent bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)]',
      },
      {
        tone: 'primary',
        solid: true,
        class: 'border-transparent bg-[var(--color-primary)] text-[var(--color-primary-foreground)]',
      },
    ],
    defaultVariants: {
      tone: 'neutral',
      solid: false,
    },
  },
);

export type StatusTone = 'success' | 'info' | 'warning' | 'error' | 'primary' | 'neutral';

const TONE_DOT_COLOR: Record<StatusTone, string> = {
  success: 'bg-[var(--color-success)]',
  info: 'bg-[var(--color-info)]',
  warning: 'bg-[var(--color-warning)]',
  error: 'bg-[var(--color-destructive)]',
  primary: 'bg-[var(--color-primary)]',
  neutral: 'bg-[var(--color-muted-foreground)]',
};

export interface StatusBadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  /**
   * Si se provee, reemplaza al dot semantico por el icono dado.
   * El componente padre es responsable de aplicar el tamano (ej: h-3 w-3).
   */
  icon?: ReactNode;
  /**
   * Oculta tanto el dot como el icono.
   */
  hideIndicator?: boolean;
}

function StatusBadge({
  className,
  tone,
  solid,
  icon,
  hideIndicator,
  children,
  ...props
}: StatusBadgeProps) {
  const resolvedTone: StatusTone = (tone ?? 'neutral') as StatusTone;
  const showDot = !solid && !icon && !hideIndicator;
  const showIcon = !!icon && !hideIndicator;
  return (
    <span
      className={cn(statusBadgeVariants({ tone, solid }), className)}
      {...props}
    >
      {showIcon && <span aria-hidden className="inline-flex shrink-0">{icon}</span>}
      {showDot && (
        <span
          aria-hidden
          className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full', TONE_DOT_COLOR[resolvedTone])}
        />
      )}
      {children}
    </span>
  );
}

/**
 * Mapeo canonico de estados de dominio a tono semantico.
 * Las cadenas son normalizadas (uppercase) antes de buscar.
 */
const DOMAIN_TONE_MAP: Record<string, StatusTone> = {
  // Genericos
  ACTIVO: 'success',
  ACTIVA: 'success',
  INACTIVO: 'neutral',
  INACTIVA: 'neutral',
  COMPLETADO: 'success',
  COMPLETADA: 'success',
  FINALIZADO: 'success',
  FINALIZADA: 'success',
  CANCELADO: 'error',
  CANCELADA: 'error',
  ANULADO: 'error',
  ANULADA: 'error',
  ELIMINADO: 'error',
  PENDIENTE: 'warning',
  EN_PROGRESO: 'info',
  EN_PROCESO: 'info',
  EN_TRANSITO: 'info',
  ENTREGADO: 'success',
  ENTREGADA: 'success',
  RECIBIDO: 'success',
  RECIBIDA: 'success',
  RECHAZADO: 'error',
  RECHAZADA: 'error',
  // Paquete
  REGISTRADO: 'info',
  EN_BODEGA: 'info',
  ASIGNADO: 'primary',
  DESPACHADO: 'success',
  VENCIDO: 'error',
  // Guia master / consolidado
  ABIERTA: 'info',
  ABIERTO: 'info',
  CERRADA: 'success',
  CERRADO: 'success',
  CERRADA_CON_FALTANTE: 'warning',
  EN_DESPACHO: 'info',
  PARCIAL: 'warning',
  // Guia master v2 (CANCELADA ya está mapeada arriba como 'error')
  EN_ESPERA_RECEPCION: 'neutral',
  RECEPCION_PARCIAL: 'warning',
  RECEPCION_COMPLETA: 'info',
  DESPACHO_PARCIAL: 'primary',
  DESPACHO_COMPLETADO: 'success',
  DESPACHO_INCOMPLETO: 'warning',
  EN_REVISION: 'warning',
  // Despacho
  PREPARADO: 'info',
  EN_RUTA: 'info',
  // Manifiesto
  GENERADO: 'success',
  // Lote
  ABIERTO_RECEPCION: 'info',
  CERRADO_RECEPCION: 'success',
};

export function getDomainStatusTone(status: string | null | undefined): StatusTone {
  if (!status) return 'neutral';
  const key = String(status).trim().toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
  return DOMAIN_TONE_MAP[key] ?? 'neutral';
}

interface DomainStatusBadgeProps extends Omit<StatusBadgeProps, 'tone'> {
  status: string | null | undefined;
  label?: string;
  tone?: StatusTone;
}

/**
 * Badge de estado de dominio: resuelve el tono via `getDomainStatusTone`.
 */
function DomainStatusBadge({ status, label, tone, ...props }: DomainStatusBadgeProps) {
  const resolvedTone = tone ?? getDomainStatusTone(status);
  const text = label ?? (status ? String(status).replace(/_/g, ' ') : '');
  return (
    <StatusBadge tone={resolvedTone} {...props}>
      {text}
    </StatusBadge>
  );
}

export { StatusBadge, DomainStatusBadge, statusBadgeVariants };
