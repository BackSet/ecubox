import { Plane } from 'lucide-react';

function RouteNode({
  flag,
  title,
  subtitle,
}: {
  flag: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <span className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--color-landing-border)] bg-[var(--color-landing-card-muted)] text-lg">
        {flag}
      </span>
      <span className="text-[11px] font-semibold landing-text">{title}</span>
      <span className="text-[10px] landing-text-muted">{subtitle}</span>
    </div>
  );
}

export function HeroRouteIllustration() {
  return (
    <div className="landing-card relative overflow-hidden p-4 sm:p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 landing-mesh opacity-40"
      />
      <p className="relative mb-4 text-xs font-medium uppercase tracking-wider landing-text-muted">
        Ruta express
      </p>
      <div className="relative flex items-center justify-between gap-2">
        <RouteNode flag="🇺🇸" title="New Jersey" subtitle="Casillero USA" />
        <RouteConnector />
        <RouteNode flag="🇪🇨" title="Ecuador" subtitle="Entrega final" />
      </div>
    </div>
  );
}

function RouteConnector() {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1">
      <div className="relative flex w-full items-center">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--color-primary)]/50 to-[var(--color-primary)]" />
        <span className="mx-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-md">
          <Plane className="size-4 -rotate-45" aria-hidden />
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-ecubox-acento-claro)]/60 to-transparent" />
      </div>
      <span className="text-[10px] font-medium text-[var(--color-primary)]">En tránsito</span>
    </div>
  );
}
