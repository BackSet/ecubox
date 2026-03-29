import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { EcuboxLogo } from '@/components/brand';
import { getTrackingByNumeroGuia } from '@/lib/api/tracking.service';
import type { TrackingResponse, TrackingEstadoItem } from '@/lib/api/tracking.service';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { buildTrackingPdf } from '@/lib/pdf/builders/trackingPdf';
import { runJsPdfAction } from '@/lib/pdf/actions';
import { TrackingSearchPanel } from '@/pages/tracking/components/TrackingSearchPanel';
import { TrackingSummaryCard } from '@/pages/tracking/components/TrackingSummaryCard';
import { TrackingProgressCard } from '@/pages/tracking/components/TrackingProgressCard';
import { TrackingTimeline } from '@/pages/tracking/components/TrackingTimeline';
import { TrackingActionsBar } from '@/pages/tracking/components/TrackingActionsBar';
import { TrackingDetailsCard } from '@/pages/tracking/components/TrackingDetailsCard';
import { TrackingDespachoCard } from '@/pages/tracking/components/TrackingDespachoCard';
import { TrackingPaquetesDespachoCard } from '@/pages/tracking/components/TrackingPaquetesDespachoCard';
import { TrackingOperadorEntregaCard } from '@/pages/tracking/components/TrackingOperadorEntregaCard';

function getNumeroGuiaFromUrl(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('numeroGuia') ?? '';
}

function formatFechaEstadoDesde(iso: string | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('es-EC', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

export function TrackingPage() {
  const [numeroGuia, setNumeroGuia] = useState('');
  const [result, setResult] = useState<TrackingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoQueryDone, setAutoQueryDone] = useState(false);
  const resultCardRef = useRef<HTMLDivElement>(null);
  const activeRequestRef = useRef<AbortController | null>(null);

  const currentTrackingUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const guia = (result?.numeroGuia ?? numeroGuia).trim();
    const url = new URL(window.location.href);
    if (guia) {
      url.searchParams.set('numeroGuia', guia);
    }
    return url.toString();
  }, [result?.numeroGuia, numeroGuia]);

  function updateUrlWithGuia(guia: string) {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('numeroGuia', guia);
    window.history.replaceState({}, '', url.toString());
  }

  function validateNumeroGuia(rawGuia: string): string | null {
    const guia = rawGuia.trim();
    if (!guia) return 'Ingresa un número de guía para consultar.';
    if (guia.length < 4) return 'La guía debe tener al menos 4 caracteres.';
    if (!/^[A-Za-z0-9-]+$/.test(guia)) return 'La guía solo puede contener letras, números y guion.';
    return null;
  }

  async function executeSearch(rawGuia: string) {
    const guia = rawGuia.trim();
    const validation = validateNumeroGuia(guia);
    if (validation) {
      setValidationError(validation);
      setError(null);
      setResult(null);
      return;
    }
    setValidationError(null);
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    updateUrlWithGuia(guia);
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const data = await getTrackingByNumeroGuia(guia, { signal: controller.signal });
      setResult(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const message = err instanceof Error ? err.message : 'Error al consultar el tracking.';
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
    const guiaFromUrl = getNumeroGuiaFromUrl().trim();
    if (!guiaFromUrl) {
      setAutoQueryDone(true);
      return;
    }
    setNumeroGuia(guiaFromUrl);
    setAutoQueryDone(true);
    void executeSearch(guiaFromUrl);
  }, [autoQueryDone]);

  useEffect(() => {
    return () => {
      activeRequestRef.current?.abort();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await executeSearch(numeroGuia);
  }

  async function handleCopyLink() {
    if (!currentTrackingUrl) return;
    try {
      await navigator.clipboard.writeText(currentTrackingUrl);
      toast.success('Enlace de seguimiento copiado.');
    } catch {
      toast.error('No se pudo copiar el enlace.');
    }
  }

  async function handleShare() {
    if (!currentTrackingUrl) return;
    const title = 'Seguimiento de envío ECUBOX';
    const text = `Revisa el estado de tu envío con la guía ${result?.numeroGuia ?? numeroGuia}.`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url: currentTrackingUrl });
        return;
      } catch {
        // Si el usuario cancela o falla, usamos fallback de copiado.
      }
    }
    await handleCopyLink();
  }

  async function handleDownloadImage() {
    if (!result || !resultCardRef.current) return;
    try {
      const canvas = await captureTrackingCanvas();
      const filename = `tracking-${result.numeroGuia}.png`;
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((value) => resolve(value), 'image/png');
      });
      const link = document.createElement('a');
      link.download = filename;
      if (blob != null) {
        const url = URL.createObjectURL(blob);
        link.href = url;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } else {
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      toast.success('Imagen descargada.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`No se pudo descargar la imagen. ${message}`);
    }
  }

  async function handleDownloadPdf() {
    if (!result) return;
    try {
      const doc = buildTrackingPdf(result);
      runJsPdfAction(doc, { mode: 'download', filename: `tracking-${result.numeroGuia}.pdf` });
      toast.success('PDF generado.');
    } catch {
      toast.error('No se pudo generar el PDF.');
    }
  }

  function normalizeCloneColors(clonedDoc: Document) {
    const source = clonedDoc.querySelector('[data-tracking-export="true"]');
    const all = source ? source.querySelectorAll('*') : clonedDoc.querySelectorAll('*');
    const safeColorForProp = (prop: string): string => {
      if (prop === 'background-color') return 'rgb(255, 255, 255)';
      if (prop === 'outline-color') return 'transparent';
      if (prop === 'fill') return 'rgb(10, 22, 40)';
      if (prop === 'stroke') return 'rgb(10, 22, 40)';
      return 'rgb(10, 22, 40)';
    };
    for (const el of Array.from(all)) {
      const styles = clonedDoc.defaultView?.getComputedStyle(el);
      if (!styles) continue;
      for (const prop of Array.from(styles)) {
        const value = styles.getPropertyValue(prop);
        if (value && value.includes('oklab(')) {
          (el as HTMLElement).style.setProperty(prop, safeColorForProp(prop), 'important');
        }
      }
    }
  }

  async function captureTrackingCanvas() {
    if (!resultCardRef.current) throw new Error('No hay contenido para exportar');
    return html2canvas(resultCardRef.current, {
      backgroundColor: '#ffffff',
      scale: Math.max(2, window.devicePixelRatio || 1),
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: normalizeCloneColors,
    });
  }

  const estados: TrackingEstadoItem[] = result?.estados ?? [];
  const fechaFormateada = formatFechaEstadoDesde(result?.fechaEstadoDesde);
  const currentIndex = estados.findIndex((e) => e.esActual);
  const estadosBase = estados.filter((e) => e.tipoFlujo !== 'ALTERNO');
  const totalPasosBase = estadosBase.length;
  const pasoBaseActual = (() => {
    if (currentIndex < 0) return 0;
    const visiblesHastaActual = estados.slice(0, currentIndex + 1);
    return visiblesHastaActual.filter((e) => e.tipoFlujo !== 'ALTERNO').length;
  })();
  const hasDespachoInfo = result?.despacho != null;
  const hasPaquetesDespacho = (result?.paquetesDespacho?.length ?? 0) > 0;
  const hasOperadorEntrega = result?.operadorEntrega != null;

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      <header className="border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="inline-flex p-1 -m-1 rounded-lg hover:bg-[var(--color-muted)] transition" aria-label="ECUBOX - Inicio">
            <EcuboxLogo variant="light" size="lg" asLink={false} />
          </Link>
          <Link
            to="/"
            className="text-sm text-[var(--color-muted-foreground)] hover:underline"
          >
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6">
        <div className="w-full max-w-6xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-foreground)]">
              Seguimiento de envío
            </h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Consulta el estado de tu paquete con la guía ECUBOX.
            </p>
          </div>

          <TrackingSearchPanel
            numeroGuia={numeroGuia}
            loading={loading}
            validationError={validationError}
            onNumeroGuiaChange={(value) => {
              setNumeroGuia(value);
              if (validationError) setValidationError(null);
            }}
            onSubmit={handleSubmit}
          />

          {error && (
            <div
              className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)] text-sm"
              role="alert"
            >
              {error}
            </div>
          )}

          {result ? (
            <section ref={resultCardRef} data-tracking-export="true" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                  <TrackingSummaryCard result={result} fechaFormateada={fechaFormateada} />
                  {hasDespachoInfo ? <TrackingDespachoCard result={result} /> : null}
                  {hasDespachoInfo && hasPaquetesDespacho ? <TrackingPaquetesDespachoCard result={result} /> : null}
                  <TrackingProgressCard
                    result={result}
                    totalPasosBase={totalPasosBase}
                    pasoBaseActual={pasoBaseActual}
                  />
                  <TrackingTimeline estados={estados} currentIndex={currentIndex} />
                </div>
                <div className="space-y-4">
                  <TrackingDetailsCard result={result} />
                  {hasDespachoInfo && hasOperadorEntrega ? <TrackingOperadorEntregaCard result={result} /> : null}
                  <TrackingActionsBar
                    onShare={() => {
                      void handleShare();
                    }}
                    onCopyLink={() => {
                      void handleCopyLink();
                    }}
                    onDownloadImage={() => {
                      void handleDownloadImage();
                    }}
                    onDownloadPdf={() => {
                      void handleDownloadPdf();
                    }}
                  />
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
