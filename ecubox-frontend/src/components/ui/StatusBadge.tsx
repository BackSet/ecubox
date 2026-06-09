import { type HTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-0.5 text-[11px] font-medium leading-none',
  {
    variants: {
      tone: {
        neutral: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
        success: 'bg-[color-mix(in_oklab,var(--color-success)_14%,transparent)] text-[var(--color-success)]',
        info:    'bg-[color-mix(in_oklab,var(--color-info)_14%,transparent)] text-[var(--color-info)]',
        warning: 'bg-[color-mix(in_oklab,var(--color-warning)_14%,transparent)] text-[var(--color-warning)]',
        error:   'bg-[color-mix(in_oklab,var(--color-destructive)_14%,transparent)] text-[var(--color-destructive)]',
        primary: 'bg-[color-mix(in_oklab,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]',
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
        class: 'bg-[var(--color-success)] text-[var(--color-success-foreground)]',
      },
      {
        tone: 'info',
        solid: true,
        class: 'bg-[var(--color-info)] text-[var(--color-info-foreground)]',
      },
      {
        tone: 'warning',
        solid: true,
        class: 'bg-[var(--color-warning)] text-[var(--color-warning-foreground)]',
      },
      {
        tone: 'error',
        solid: true,
        class: 'bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)]',
      },
      {
        tone: 'primary',
        solid: true,
        class: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]',
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
  CANCELADA: 'neutral',
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
  // NOTA: los estados de rastreo de paquete son configurables en el catálogo, así que
  // su tono NO se mapea aquí por código (eso sería "quemarlos"). Use getRastreoStatusTone,
  // que deriva el tono del tipoFlujo del catálogo. Aquí solo van enums fijos del dominio.
  ASIGNADO: 'primary',
  DESPACHADO: 'success',
  VENCIDO: 'error',
  // Guia master / consolidado
  ABIERTA: 'info',
  ABIERTO: 'info',
  CERRADA: 'success',
  CERRADA_CON_FALTANTE: 'warning',
  EN_DESPACHO: 'info',
  PARCIAL: 'warning',
  // Guía master v2 (V107)
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
  EN_REVISION: 'warning',
  // Consolidado operativo v2 (V107)
  VACIO: 'neutral',
  EN_PREPARACION: 'info',
  CERRADO: 'primary',
  ENVIADO_DESDE_USA: 'primary',
  ARRIBADO_ECUADOR: 'primary',
  RECIBIDO_EN_BODEGA: 'success',
  LIQUIDADO: 'success',
  // Estados legacy (backward compat en historial)
  SIN_PIEZAS_REGISTRADAS: 'neutral',
  EN_ESPERA_RECEPCION: 'neutral',
  EN_TRANSITO_USA_ECUADOR: 'primary',
  DESPACHO_INCOMPLETO: 'error',
  // Despacho
  PREPARADO: 'info',
  EN_RUTA: 'info',
  // Estados genéricos de "generado"
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

/**
 * Tono de un estado de rastreo (catálogo configurable). Se deriva del `tipoFlujo`
 * del catálogo, NO del código del estado, para no quemar códigos en el código fuente:
 * cualquier estado que la empresa configure funciona sin tocar el front.
 *  - ALTERNO  → warning (novedad fuera del flujo normal, p. ej. retenido en aduana).
 *  - NORMAL   → info (paso esperado del recorrido).
 */
export function getRastreoStatusTone(
  tipoFlujo: 'NORMAL' | 'ALTERNO' | null | undefined,
): StatusTone {
  return tipoFlujo === 'ALTERNO' ? 'warning' : 'info';
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
