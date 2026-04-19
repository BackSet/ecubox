import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ChipFiltroTone = 'primary' | 'success' | 'danger' | 'warning' | 'neutral';

export interface ChipFiltroProps {
  label: string;
  count?: number;
  active: boolean;
  tone?: ChipFiltroTone;
  icon?: ReactNode;
  onClick: () => void;
  /** Si es true, el chip no se renderiza cuando count === 0 y no esta activo. */
  hideWhenZero?: boolean;
  className?: string;
}

/**
 * Chip clickeable usado como filtro rapido en las paginas de listado.
 *
 * Patron de tonos:
 * - primary: filtro neutro / "Todos" (default)
 * - success: estados positivos (listos, recibidos, pagados)
 * - warning: estados de atencion (pendientes, parcial)
 * - danger: estados negativos (invalidos, vencidos, anulados)
 * - neutral: estados sin connotacion (vacio, sin asignar)
 *
 * El conteo se muestra como badge integrado, con `tabular-nums` para que los
 * digitos no salten al cambiar de valor. Cuando el chip esta activo, el color
 * del tono pasa a ser fondo solido; cuando esta inactivo, solo color de borde
 * y texto, manteniendo el peso visual bajo.
 */
export function ChipFiltro({
  label,
  count,
  active,
  tone = 'primary',
  icon,
  onClick,
  hideWhenZero,
  className,
}: ChipFiltroProps) {
  if (hideWhenZero && !active && count === 0) return null;

  const palette = PALETTES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors',
        active ? palette.activeBg : palette.idle,
        className,
      )}
    >
      {icon && <span className="flex shrink-0 items-center">{icon}</span>}
      <span>{label}</span>
      {count != null && (
        <span
          className={cn(
            'inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
            active ? palette.countActive : palette.countIdle,
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

interface PaletteEntry {
  activeBg: string;
  idle: string;
  countActive: string;
  countIdle: string;
}

const PALETTES: Record<ChipFiltroTone, PaletteEntry> = {
  primary: {
    activeBg: 'bg-primary text-primary-foreground border-primary',
    idle: 'border-border text-foreground hover:bg-[var(--color-muted)]',
    countActive: 'bg-primary-foreground/20 text-primary-foreground',
    countIdle: 'bg-[var(--color-muted)] text-muted-foreground',
  },
  success: {
    activeBg:
      'bg-[var(--color-success)] text-white border-[var(--color-success)]',
    idle: 'border-[var(--color-success)]/30 text-[var(--color-success)] hover:bg-[var(--color-success)]/10',
    countActive: 'bg-white/20 text-white',
    countIdle: 'bg-[var(--color-success)]/15 text-[var(--color-success)]',
  },
  warning: {
    activeBg:
      'bg-[var(--color-warning)] text-white border-[var(--color-warning)]',
    idle: 'border-[var(--color-warning)]/30 text-[var(--color-warning)] hover:bg-[var(--color-warning)]/10',
    countActive: 'bg-white/20 text-white',
    countIdle: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  },
  danger: {
    activeBg:
      'bg-[var(--color-destructive)] text-white border-[var(--color-destructive)]',
    idle: 'border-[var(--color-destructive)]/30 text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10',
    countActive: 'bg-white/20 text-white',
    countIdle:
      'bg-[var(--color-destructive)]/15 text-[var(--color-destructive)]',
  },
  neutral: {
    activeBg: 'bg-foreground text-background border-foreground',
    idle: 'border-border text-muted-foreground hover:bg-[var(--color-muted)]',
    countActive: 'bg-background/20 text-background',
    countIdle: 'bg-[var(--color-muted)] text-muted-foreground',
  },
};

/**
 * Contenedor estandar para una fila de chips de filtro rapido. Aporta wrap,
 * espaciado y comportamiento responsive consistente.
 */
export function ChipFiltroRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {children}
    </div>
  );
}
