import { Plane } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Banderas vía code points para evitar problemas de encoding en el archivo fuente. */
const FLAG_US = String.fromCodePoint(0x1f1fa, 0x1f1f8);
const FLAG_EC = String.fromCodePoint(0x1f1ea, 0x1f1e8);

function RouteNode({
  flag,
  flagLabel,
  title,
  subtitle,
}: {
  flag: string;
  flagLabel: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-w-[4.75rem] flex-1 flex-col items-center gap-2 text-center sm:min-w-[5.5rem]">
      <span
        className="inline-flex size-11 items-center justify-center rounded-full border border-[var(--color-landing-border)] bg-[var(--color-landing-card)] text-[1.65rem] leading-none shadow-sm ring-1 ring-black/5 dark:ring-white/10"
        role="img"
        aria-label={flagLabel}
      >
        {flag}
      </span>
      <span className="max-w-[6.5rem] text-xs font-semibold leading-tight landing-text sm:text-[13px]">
        {title}
      </span>
      <span className="max-w-[6.5rem] text-[10px] leading-snug landing-text-muted sm:text-[11px]">
        {subtitle}
      </span>
    </div>
  );
}

export function HeroRouteIllustration() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--color-landing-border)] bg-[var(--color-landing-card)]/80 p-4 sm:p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 landing-mesh opacity-35"
      />
      <p className="relative mb-5 text-[11px] font-semibold uppercase tracking-[0.14em] landing-text-muted">
        Ruta express
      </p>
      <div className="relative flex items-start justify-between gap-1 sm:gap-2">
        <RouteNode
          flag={FLAG_US}
          flagLabel="Estados Unidos"
          title="New Jersey"
          subtitle="Casillero USA"
        />
        <RouteConnector />
        <RouteNode
          flag={FLAG_EC}
          flagLabel="Ecuador"
          title="Ecuador"
          subtitle="Entrega final"
        />
      </div>
    </div>
  );
}

function RouteConnector() {
  return (
    <div className="flex min-w-0 flex-[1.15] flex-col items-center gap-2 px-0.5 pt-1.5 sm:px-1">
      <div className="relative flex w-full items-center">
        <div
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--color-primary)]/35 to-[var(--color-primary)]/70"
        />
        <span
          className={cn(
            'mx-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full',
            'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]',
            'shadow-md shadow-[var(--color-primary)]/25 ring-2 ring-[var(--color-primary)]/20',
          )}
        >
          <Plane className="size-4 -rotate-45" aria-hidden />
        </span>
        <div
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-[var(--color-primary)]/70 via-[var(--color-ecubox-acento-claro)]/50 to-transparent"
        />
      </div>
      <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary)] sm:text-[11px]">
        En tránsito
      </span>
    </div>
  );
}
