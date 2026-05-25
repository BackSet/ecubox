import { Children, type ReactNode } from 'react';
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
        'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/40',
        active ? palette.active : palette.idle,
        className,
      )}
    >
      {icon && <span className="flex shrink-0 items-center [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}
      <span className="whitespace-nowrap">{label}</span>
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
  active: string;
  idle: string;
  countActive: string;
  countIdle: string;
}

const PALETTES: Record<ChipFiltroTone, PaletteEntry> = {
  primary: {
    active: 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm',
    idle: 'border-[var(--color-border)] bg-[var(--color-muted)]/50 text-[var(--color-foreground)] hover:bg-[var(--color-muted)]',
    countActive: 'bg-[var(--color-primary-foreground)]/20 text-[var(--color-primary-foreground)]',
    countIdle: 'bg-[var(--color-background)] text-[var(--color-muted-foreground)]',
  },
  success: {
    active:
      'border-[var(--color-success)] bg-[var(--color-success)] text-white shadow-sm',
    idle:
      'border-[color-mix(in_oklab,var(--color-success)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-success)_10%,transparent)] text-[var(--color-success)] hover:bg-[color-mix(in_oklab,var(--color-success)_16%,transparent)]',
    countActive: 'bg-white/20 text-white',
    countIdle: 'bg-[color-mix(in_oklab,var(--color-success)_18%,transparent)] text-[var(--color-success)]',
  },
  warning: {
    active:
      'border-[var(--color-warning)] bg-[var(--color-warning)] text-white shadow-sm',
    idle:
      'border-[color-mix(in_oklab,var(--color-warning)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-warning)_10%,transparent)] text-[var(--color-warning)] hover:bg-[color-mix(in_oklab,var(--color-warning)_16%,transparent)]',
    countActive: 'bg-white/20 text-white',
    countIdle: 'bg-[color-mix(in_oklab,var(--color-warning)_18%,transparent)] text-[var(--color-warning)]',
  },
  danger: {
    active:
      'border-[var(--color-destructive)] bg-[var(--color-destructive)] text-white shadow-sm',
    idle:
      'border-[color-mix(in_oklab,var(--color-destructive)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-destructive)_10%,transparent)] text-[var(--color-destructive)] hover:bg-[color-mix(in_oklab,var(--color-destructive)_16%,transparent)]',
    countActive: 'bg-white/20 text-white',
    countIdle:
      'bg-[color-mix(in_oklab,var(--color-destructive)_18%,transparent)] text-[var(--color-destructive)]',
  },
  neutral: {
    active: 'border-[var(--color-foreground)] bg-[var(--color-foreground)] text-[var(--color-background)] shadow-sm',
    idle: 'border-[var(--color-border)] bg-[var(--color-muted)]/50 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]',
    countActive: 'bg-[var(--color-background)]/20 text-[var(--color-background)]',
    countIdle: 'bg-[var(--color-background)] text-[var(--color-muted-foreground)]',
  },
};

export function ChipFiltroRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {children}
    </div>
  );
}

/** Contenedor que oculta la fila de chips cuando todos los hijos son null (p. ej. hideWhenZero). */
export function ChipFiltroGroup({ children }: { children: ReactNode }) {
  const visible = Children.toArray(children).filter(Boolean);
  if (visible.length === 0) return null;
  return <>{visible}</>;
}
