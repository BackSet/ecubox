import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium leading-none',
  {
    variants: {
      tone: {
        success:
          'border-[color-mix(in_oklab,var(--color-success)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-success)_15%,transparent)] text-[color-mix(in_oklab,var(--color-success)_75%,var(--color-foreground))]',
        info:
          'border-[color-mix(in_oklab,var(--color-info)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-info)_15%,transparent)] text-[color-mix(in_oklab,var(--color-info)_75%,var(--color-foreground))]',
        warning:
          'border-[color-mix(in_oklab,var(--color-warning)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-warning)_15%,transparent)] text-[color-mix(in_oklab,var(--color-warning)_75%,var(--color-foreground))]',
        error:
          'border-[color-mix(in_oklab,var(--color-destructive)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-destructive)_15%,transparent)] text-[color-mix(in_oklab,var(--color-destructive)_80%,var(--color-foreground))]',
        primary:
          'border-[color-mix(in_oklab,var(--color-primary)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-primary)_15%,transparent)] text-[color-mix(in_oklab,var(--color-primary)_75%,var(--color-foreground))]',
        neutral:
          'border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
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

export interface StatusBadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {}

function StatusBadge({ className, tone, solid, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ tone, solid }), className)}
      {...props}
    />
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
