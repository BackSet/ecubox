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
  hint?: string;
  tone?: KpiTone;
  to?: string;
  className?: string;
}

const TONE_DOT: Record<KpiTone, string> = {
  neutral: 'bg-[var(--color-muted-foreground)]',
  primary: 'bg-[var(--color-primary)]',
  success: 'bg-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]',
  danger: 'bg-[var(--color-destructive)]',
  info: 'bg-[var(--color-info)]',
};

export function KpiCard({
  icon,
  label,
  value,
  hint,
  tone = 'neutral',
  to,
  className,
}: KpiCardProps) {
  const showDot = tone !== 'neutral';
  const inner = (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2 text-[var(--color-muted-foreground)]">
        <span
          className="mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center"
          aria-hidden
        >
          {icon}
        </span>
        {/* Permitimos hasta 2 líneas (line-clamp-2) para evitar truncar
            etiquetas largas como "Ingreso neto acumulado". El title nativo
            sigue ofreciendo el texto completo en hover. */}
        <p
          className="flex-1 text-[12px] font-medium leading-snug line-clamp-2"
          title={label}
        >
          {label}
        </p>
        {showDot && (
          <span
            aria-hidden
            className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', TONE_DOT[tone])}
          />
        )}
        {to && (
          <ArrowRight
            className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:opacity-100"
            strokeWidth={1.75}
          />
        )}
      </div>
      <div className="min-w-0">
        <p
          className="text-[26px] font-semibold leading-none tracking-tight text-[var(--color-foreground)]"
          title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
        >
          {value}
        </p>
        {hint && (
          <p
            className="mt-2 truncate text-[12px] text-[var(--color-muted-foreground)]"
            title={hint}
          >
            {hint}
          </p>
        )}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          'group block rounded-md outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/40'
        )}
      >
        <SurfaceCard className={cn('p-4 transition hover:border-[var(--color-foreground)]/20', className)}>
          {inner}
        </SurfaceCard>
      </Link>
    );
  }

  return (
    <SurfaceCard className={cn('p-4', className)}>
      {inner}
    </SurfaceCard>
  );
}
