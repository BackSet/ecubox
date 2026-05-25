import { useMemo } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { FlaskConical, PackageSearch } from 'lucide-react';
import { PublicPageHero } from '@/components/public/PublicPageHero';
import { PublicPageLayout } from '@/components/public/PublicPageLayout';
import { PublicSupportStrip } from '@/components/public/PublicSupportStrip';
import { codigoFromResolved } from '@/lib/tracking/trackingDisplayUtils';
import {
  TRACKING_SAMPLES,
  getDefaultTrackingSampleCodigo,
  normalizeTrackingSampleCodigo,
  resolveTrackingSample,
} from '@/lib/tracking/trackingSamples';
import { TrackingResultsSection } from '@/pages/tracking/components/TrackingResultsSection';
import { TrackingSampleBanner } from '@/pages/tracking/components/TrackingSampleBanner';
import { cn } from '@/lib/utils';

export function TrackingSamplePage() {
  const navigate = useNavigate();
  const codigoRaw = useRouterState({
    select: (s) => new URLSearchParams(s.location.searchStr).get('codigo') ?? '',
  });

  const codigo = codigoRaw.trim()
    ? normalizeTrackingSampleCodigo(codigoRaw)
    : getDefaultTrackingSampleCodigo();

  const resolved = useMemo(() => resolveTrackingSample(codigo), [codigo]);

  const currentTrackingUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.pathname = '/tracking/ejemplo';
    url.searchParams.set('codigo', codigoFromResolved(resolved, codigo));
    return url.toString();
  }, [resolved, codigo]);

  function selectSample(nextCodigo: string) {
    void navigate({
      to: '/tracking/ejemplo',
      search: { codigo: nextCodigo } as never,
    });
  }

  return (
    <PublicPageLayout headerVariant="tool" mainClassName="mobile-safe-inline py-5 sm:py-8">
      <div className="content-container-wide w-full space-y-6">
          <PublicPageHero
            badge="Demostración"
            badgeIcon={FlaskConical}
            title="Ejemplos de rastreo"
            description="Explora cómo se ve el seguimiento público con guías de muestra. Toda la información mostrada es ficticia."
          />

          <PublicSupportStrip />

          <TrackingSampleBanner />

          <section className="landing-card space-y-4 p-5 sm:p-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
                Guías de ejemplo
              </h2>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Selecciona un código para ver distintos escenarios: guía master, pieza en tránsito
                o pieza lista para retiro.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {TRACKING_SAMPLES.map((sample) => {
                const active =
                  normalizeTrackingSampleCodigo(sample.codigo).toUpperCase() ===
                  codigo.toUpperCase();
                return (
                  <button
                    key={sample.codigo}
                    type="button"
                    onClick={() => selectSample(sample.codigo)}
                    className={cn(
                      'rounded-lg border p-4 text-left transition-colors',
                      active
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                        : 'border-[var(--color-landing-border)] bg-[var(--color-landing-card-muted)] hover:border-[var(--color-primary)]/40'
                    )}
                    aria-current={active ? 'true' : undefined}
                  >
                    <p className="font-mono text-sm font-semibold text-[var(--color-foreground)]">
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
            <p className="text-xs text-[var(--color-muted-foreground)]">
              ¿Tienes un envío real?{' '}
              <Link to="/tracking" className="font-medium text-[var(--color-primary)] hover:underline">
                Ir al rastreo oficial
              </Link>
            </p>
          </section>

          {resolved ? (
            <TrackingResultsSection
              resolved={resolved}
              codigo={codigo}
              shareUrl={currentTrackingUrl}
              onSelectPieza={selectSample}
              exportsDisabled
            />
          ) : (
            <div className="landing-card flex flex-col items-center gap-3 p-8 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-landing-card-muted)] landing-text-muted">
                <PackageSearch className="h-6 w-6" />
              </span>
              <p className="text-sm landing-text-muted">
                No encontramos un ejemplo para ese código. Elige una guía de la lista superior.
              </p>
            </div>
          )}
        </div>
    </PublicPageLayout>
  );
}

