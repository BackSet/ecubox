import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { PackageSearch, ShieldCheck } from 'lucide-react';
import { PublicPageHero } from '@/components/public/PublicPageHero';
import { PublicPageLayout } from '@/components/public/PublicPageLayout';
import { PublicSupportStrip } from '@/components/public/PublicSupportStrip';
import { SurfaceCardSkeleton } from '@/components/skeletons/SurfaceCardSkeleton';
import { KeyValueGridSkeleton } from '@/components/skeletons/KeyValueGridSkeleton';
import { ListItemsSkeleton } from '@/components/skeletons/ListItemsSkeleton';
import { getTrackingByCodigo } from '@/lib/api/tracking.service';
import type { TrackingResolveResponse } from '@/lib/api/tracking.service';
import { notify } from '@/lib/notify';
import { TrackingSearchPanel } from '@/pages/tracking/components/TrackingSearchPanel';
import { TrackingResultsSection } from '@/pages/tracking/components/TrackingResultsSection';
import { trackingSearchSchema } from '@/lib/schemas/primitives';
import { codigoFromResolved } from '@/lib/tracking/trackingDisplayUtils';

function getCodigoFromUrl(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return (params.get('codigo') ?? params.get('numeroGuia') ?? '').trim();
}

export function TrackingPage() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [resolved, setResolved] = useState<TrackingResolveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoQueryDone, setAutoQueryDone] = useState(false);
  const activeRequestRef = useRef<AbortController | null>(null);

  const currentTrackingUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const cod = codigoFromResolved(resolved, codigo);
    const url = new URL(window.location.href);
    if (cod) {
      url.searchParams.set('codigo', cod);
      url.searchParams.delete('numeroGuia');
    }
    return url.toString();
  }, [resolved, codigo]);

  function updateUrlWithCodigo(cod: string) {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('codigo', cod);
    url.searchParams.delete('numeroGuia');
    window.history.replaceState({}, '', url.toString());
  }

  function normalizarCodigo(raw: string): string {
    return raw
      .trim()
      .replace(/\s*\/\s*/g, '/')
      .replace(/\s+/g, ' ');
  }

  function validateCodigo(rawCodigo: string): string | null {
    const parsed = trackingSearchSchema.safeParse(rawCodigo);
    if (!parsed.success) {
      return parsed.error.issues[0]?.message ?? 'Código no válido';
    }
    return null;
  }

  async function executeSearch(rawCodigo: string) {
    const cod = normalizarCodigo(rawCodigo);
    const validation = validateCodigo(cod);
    if (validation) {
      setValidationError(validation);
      setError(null);
      setResolved(null);
      return;
    }
    setValidationError(null);
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    updateUrlWithCodigo(cod);
    setError(null);
    setResolved(null);
    setLoading(true);
    try {
      const data = await getTrackingByCodigo(cod, { signal: controller.signal });
      setResolved(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const message =
        err instanceof Error ? err.message : 'No pudimos cargar el rastreo en este momento.';
      const status = (err as Error & { status?: number })?.status;
      if (status === 429) {
        notify.warning(message, { duration: 6000 });
      }
      setError(message);
    } finally {
      setLoading(false);
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
      }
    }
  }

  useEffect(() => {
    if (autoQueryDone) return;
    const codFromUrl = getCodigoFromUrl();
    if (!codFromUrl) {
      setAutoQueryDone(true);
      return;
    }
    setCodigo(codFromUrl);
    setAutoQueryDone(true);
    void executeSearch(codFromUrl);
  }, [autoQueryDone, navigate]);

  useEffect(() => {
    return () => {
      activeRequestRef.current?.abort();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await executeSearch(codigo);
  }

  function handleSelectPieza(numeroGuia: string) {
    setCodigo(numeroGuia);
    void executeSearch(numeroGuia);
  }

  const sinResultados =
    autoQueryDone && !loading && !error && !resolved && !validationError;

  return (
    <PublicPageLayout headerVariant="tool" mainClassName="mobile-safe-inline py-5 sm:py-8">
      <div className="content-container-wide w-full space-y-6">
          <PublicPageHero
            badge="Rastreo público"
            badgeIcon={PackageSearch}
            title="Rastreo de envío"
            description="Ingresa el número de paquete o de guía para ver el estado de tu envío."
            aside={
              <p className="landing-text-muted hidden max-w-xs items-center gap-1.5 text-xs lg:flex">
                <ShieldCheck className="size-3.5 shrink-0 text-[var(--color-success)]" />
                Información oficial de ECUBOX
              </p>
            }
          />

          <PublicSupportStrip />

          <TrackingSearchPanel
            numeroGuia={codigo}
            loading={loading}
            validationError={validationError}
            onNumeroGuiaChange={(value) => {
              setCodigo(value);
              if (validationError) setValidationError(null);
            }}
            onSubmit={handleSubmit}
          />

          {loading && !resolved && !error && (
            <section
              className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-3"
              aria-busy="true"
              aria-live="polite"
            >
              <div className="space-y-5 xl:col-span-2">
                <div className="landing-card p-5 sm:p-6">
                  <SurfaceCardSkeleton bodyLines={3} className="border-0 bg-transparent p-0 shadow-none" />
                </div>
                <div className="landing-card p-5 sm:p-6">
                  <KeyValueGridSkeleton rows={6} cols={2} />
                </div>
                <div className="landing-card p-5 sm:p-6">
                  <ListItemsSkeleton rows={4} withTrailing />
                </div>
              </div>
              <aside className="space-y-5">
                <div className="landing-card p-5 sm:p-6">
                  <SurfaceCardSkeleton bodyLines={4} className="border-0 bg-transparent p-0 shadow-none" />
                </div>
              </aside>
              <span className="sr-only">Buscando información del envío...</span>
            </section>
          )}

          {error && (
            <div className="space-y-3">
              <div
                className="landing-card flex flex-col items-start gap-3 border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 p-5 text-sm text-[var(--color-destructive)] sm:flex-row sm:items-center sm:justify-between"
                role="alert"
              >
                <div className="flex items-start gap-2.5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-destructive)]/15">
                    <PackageSearch className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold">No pudimos completar la búsqueda</p>
                    <p className="mt-0.5 text-[var(--color-destructive)]/85">{error}</p>
                  </div>
                </div>
              </div>
              <PublicSupportStrip message="¿No encuentras tu guía?" />
            </div>
          )}

          {sinResultados && (
            <div className="landing-card flex flex-col items-center gap-3 p-8 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-landing-card-muted)] landing-text-muted">
                <PackageSearch className="h-6 w-6" />
              </span>
              <div className="space-y-1">
                <p className="text-base font-semibold landing-text">
                  Aún no has consultado un envío
                </p>
                <p className="landing-text-muted max-w-md text-sm">
                  Ingresa el número de guía o pieza arriba para ver el estado, el avance
                  y los datos de entrega de tu envío.
                </p>
              </div>
            </div>
          )}

          {resolved ? (
            <TrackingResultsSection
              resolved={resolved}
              codigo={codigo}
              shareUrl={currentTrackingUrl}
              onSelectPieza={handleSelectPieza}
            />
          ) : null}
        </div>
    </PublicPageLayout>
  );
}
