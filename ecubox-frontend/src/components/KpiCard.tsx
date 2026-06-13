import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SurfaceCard } from '@/components/ui/surface-card';

export type KpiTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'primary'
  | 'info';

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: number | string;
  /** Contexto bajo el valor (máx. 2 líneas). Si se omite, se reserva espacio sin texto visible. */
  hint?: string;
  tone?: KpiTone;
  to?: string;
  className?: string;
}

const TONE_ACCENT: Record<KpiTone, string> = {
  neutral: '',
  primary: 'border-l-[var(--color-primary)]',
  success: 'border-l-[var(--color-success)]',
  warning: 'border-l-[var(--color-warning)]',
  danger: 'border-l-[var(--color-destructive)]',
  info: 'border-l-[var(--color-info)]',
};

const TONE_BADGE: Record<KpiTone, string> = {
  neutral: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
  primary:
    'bg-[color-mix(in_oklab,var(--color-primary)_18%,transparent)] text-[var(--color-primary)]',
  success:
    'bg-[color-mix(in_oklab,var(--color-success)_18%,transparent)] text-[var(--color-success)]',
  warning:
    'bg-[color-mix(in_oklab,var(--color-warning)_18%,transparent)] text-[var(--color-warning)]',
  danger:
    'bg-[color-mix(in_oklab,var(--color-destructive)_18%,transparent)] text-[var(--color-destructive)]',
  info: 'bg-[color-mix(in_oklab,var(--color-info)_18%,transparent)] text-[var(--color-info)]',
};

const TONE_ACCENT_WIDTH = 'border-l-[3px]';

export function KpiCard({
  icon,
  label,
  value,
  hint,
  tone = 'neutral',
  to,
  className,
}: KpiCardProps) {
  const trimmedHint = hint?.trim();
  const ariaLabel = trimmedHint
    ? `${label}: ${value}. ${trimmedHint}`
    : `${label}: ${value}`;
  const showAccent = tone !== 'neutral';
  const cardClassName = cn(
    'h-full p-4',
    showAccent && TONE_ACCENT_WIDTH,
    showAccent && TONE_ACCENT[tone],
    to && 'ui-surface-hover',
    className
  );

  const inner = (
    <div className="flex h-full min-h-[7.5rem] flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-md [&>svg]:h-5 [&>svg]:w-5',
              'transition-transform [transition-duration:var(--motion-normal)] [transition-timing-function:var(--motion-ease-standard)]',
              to && 'group-hover:scale-105',
              TONE_BADGE[tone]
            )}
            aria-hidden
          >
            {icon}
          </span>
          <p
            className="pt-0.5 text-[13px] font-medium leading-snug text-[var(--color-foreground)] line-clamp-2 [overflow-wrap:anywhere]"
            title={label}
          >
            {label}
          </p>
        </div>
        {to && (
          <ArrowRight
            className="mt-1 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] opacity-0 transition group-hover:opacity-100"
            strokeWidth={1.75}
            aria-hidden
          />
        )}
      </div>
      <div className="mt-auto min-w-0">
        <p
          className="text-[28px] font-semibold leading-none tracking-tight text-[var(--color-foreground)] tabular-nums"
          title={
            typeof value === 'string' || typeof value === 'number'
              ? String(value)
              : undefined
          }
        >
          {value}
        </p>
        <div className="mt-2 min-h-[2.5rem]">
          {trimmedHint ? (
            <p
              className="text-[12px] leading-snug text-[var(--color-muted-foreground)] line-clamp-2"
              title={trimmedHint}
            >
              {trimmedHint}
            </p>
          ) : (
            <span className="sr-only">Sin detalle adicional</span>
          )}
        </div>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        aria-label={ariaLabel}
        className={cn(
          'group block h-full rounded-md outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/40'
        )}
      >
        <SurfaceCard className={cardClassName}>{inner}</SurfaceCard>
      </Link>
    );
  }

  return <SurfaceCard className={cardClassName}>{inner}</SurfaceCard>;
}
