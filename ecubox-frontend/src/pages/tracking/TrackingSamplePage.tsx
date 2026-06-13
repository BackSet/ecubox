import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, FlaskConical, LoaderCircle, PackageSearch } from 'lucide-react';
import { PublicPageHero } from '@/components/public/PublicPageHero';
import { PublicPageLayout } from '@/components/public/PublicPageLayout';
import { PublicSupportStrip } from '@/components/public/PublicSupportStrip';
import {
  getTrackingExampleByCodigo,
  getTrackingExamples,
} from '@/lib/api/tracking.service';
import { codigoFromResolved } from '@/lib/tracking/trackingDisplayUtils';
import { normalizeTrackingSampleCodigo } from '@/lib/tracking/trackingSamples';
import { TrackingResultsSection } from '@/pages/tracking/components/TrackingResultsSection';
import { TrackingSampleBanner } from '@/pages/tracking/components/TrackingSampleBanner';
import { cn } from '@/lib/utils';

export function TrackingSamplePage() {
  const navigate = useNavigate();
  const codigoRaw = useRouterState({
    select: (s) => new URLSearchParams(s.location.searchStr).get('codigo') ?? '',
  });
  const examplesQuery = useQuery({
    queryKey: ['tracking', 'examples'],
    queryFn: ({ signal }) => getTrackingExamples({ signal }),
    staleTime: 30_000,
  });
  const codigoUrl = normalizeTrackingSampleCodigo(codigoRaw);
  const codigo = codigoUrl || examplesQuery.data?.[0]?.codigo || '';
  const resolvedQuery = useQuery({
    queryKey: ['tracking', 'example', codigo],
    queryFn: ({ signal }) => getTrackingExampleByCodigo(codigo, { signal }),
    enabled: Boolean(codigo),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (codigoUrl || !codigo) return;
    void navigate({
      to: '/tracking/ejemplo',
      search: { codigo } as never,
      replace: true,
    });
  }, [codigo, codigoUrl, navigate]);

  const currentTrackingUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.pathname = '/tracking/ejemplo';
    url.searchParams.set(
      'codigo',
      codigoFromResolved(resolvedQuery.data ?? null, codigo),
    );
    return url.toString();
  }, [resolvedQuery.data, codigo]);

  function selectSample(nextCodigo: string) {
    void navigate({
      to: '/tracking/ejemplo',
      search: { codigo: nextCodigo } as never,
    });
  }

  const loading = examplesQuery.isLoading || (Boolean(codigo) && resolvedQuery.isLoading);
  const error = examplesQuery.error ?? resolvedQuery.error;
  const examples = examplesQuery.data ?? [];

  return (
    <PublicPageLayout headerVariant="tool" mainClassName="mobile-safe-inline py-5 sm:py-8">
      <div className="content-container-wide w-full space-y-6">
        <PublicPageHero
          badge="Demostración"
          badgeIcon={FlaskConical}
          title="Ejemplos de rastreo"
          description="Explora escenarios ficticios construidos con la configuración actual de estados de ECUBOX."
        />

        <PublicSupportStrip />
        <TrackingSampleBanner />

        <section className="landing-card space-y-4 p-5 sm:p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              Guías de ejemplo
            </h2>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Los nombres, leyendas, orden y flujos se obtienen del catálogo configurado.
            </p>
          </div>

          {examplesQuery.isLoading ? (
            <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-[var(--color-muted-foreground)]">
              <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              Cargando ejemplos…
            </div>
          ) : examples.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {examples.map((sample) => {
                const active = sample.codigo.toUpperCase() === codigo.toUpperCase();
                return (
                  <button
                    key={sample.codigo}
                    type="button"
                    onClick={() => selectSample(sample.codigo)}
                    className={cn(
                      'ui-transition min-w-0 rounded-lg border p-4 text-left',
                      active
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                        : 'border-[var(--color-landing-border)] bg-[var(--color-landing-card-muted)] hover:border-[var(--color-primary)]/40',
                    )}
                    aria-current={active ? 'true' : undefined}
                  >
                    <p className="truncate font-mono text-sm font-semibold text-[var(--color-foreground)]">
                      {sample.codigo}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[var(--color-foreground)]">
                      {sample.titulo}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                      {sample.descripcion}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : !examplesQuery.isError ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-[var(--color-border)] p-6 text-center">
              <PackageSearch className="h-6 w-6 text-[var(--color-muted-foreground)]" />
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No hay ejemplos disponibles porque no existe un catálogo público activo.
              </p>
            </div>
          ) : null}

          <p className="text-xs text-[var(--color-muted-foreground)]">
            ¿Tienes un envío real?{' '}
            <Link to="/tracking" className="font-medium text-[var(--color-primary)] hover:underline">
              Ir al rastreo oficial
            </Link>
          </p>
        </section>

        {error ? (
          <div className="ui-alert ui-alert-error flex items-start gap-2" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {error instanceof Error
                ? error.message
                : 'No pudimos cargar los ejemplos de rastreo.'}
            </span>
          </div>
        ) : null}

        {loading && !examplesQuery.isLoading ? (
          <div className="landing-card flex min-h-40 items-center justify-center gap-2 p-8 text-sm text-[var(--color-muted-foreground)]">
            <LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" />
            Cargando escenario…
          </div>
        ) : resolvedQuery.data ? (
          <TrackingResultsSection
            resolved={resolvedQuery.data}
            codigo={codigo}
            shareUrl={currentTrackingUrl}
            onSelectPieza={selectSample}
          />
        ) : null}
      </div>
    </PublicPageLayout>
  );
}
