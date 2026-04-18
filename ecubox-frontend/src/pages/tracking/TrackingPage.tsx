import { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, PackageSearch, ShieldCheck } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { getTrackingByCodigo } from '@/lib/api/tracking.service';
import type {
  TrackingResolveResponse,
  TrackingResponse,
  TrackingEstadoItem,
} from '@/lib/api/tracking.service';
import { toast } from 'sonner';
import { buildTrackingPdf } from '@/lib/pdf/builders/trackingPdf';
import { buildTrackingMasterPdf } from '@/lib/pdf/builders/trackingMasterPdf';
import { runJsPdfAction } from '@/lib/pdf/actions';
import {
  copyImageBlobToClipboard,
  downloadBlob,
  snapshotNodeToPdf,
  snapshotToBlob,
  type SnapshotFormat,
} from '@/lib/exporters/domSnapshot';
import { TrackingSearchPanel } from '@/pages/tracking/components/TrackingSearchPanel';
import { TrackingSummaryCard } from '@/pages/tracking/components/TrackingSummaryCard';
import { TrackingProgressCard } from '@/pages/tracking/components/TrackingProgressCard';
import { TrackingTimeline } from '@/pages/tracking/components/TrackingTimeline';
import { TrackingActionsBar } from '@/pages/tracking/components/TrackingActionsBar';
import { TrackingDetailsCard } from '@/pages/tracking/components/TrackingDetailsCard';
import { TrackingDespachoCard } from '@/pages/tracking/components/TrackingDespachoCard';
import { TrackingPaquetesDespachoCard } from '@/pages/tracking/components/TrackingPaquetesDespachoCard';
import { TrackingOperadorEntregaCard } from '@/pages/tracking/components/TrackingOperadorEntregaCard';
import { TrackingMasterView } from '@/pages/tracking/components/TrackingMasterView';
import { TrackingPiezasList } from '@/pages/tracking/components/TrackingPiezasList';

function getCodigoFromUrl(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return (params.get('codigo') ?? params.get('numeroGuia') ?? '').trim();
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

function codigoFromResolved(resolved: TrackingResolveResponse | null, fallback: string): string {
  if (!resolved) return fallback.trim();
  if (resolved.tipo === 'PIEZA') return resolved.pieza?.numeroGuia ?? fallback.trim();
  if (resolved.tipo === 'GUIA_MASTER') return resolved.master?.trackingBase ?? fallback.trim();
  return fallback.trim();
}

export function TrackingPage() {
  const [codigo, setCodigo] = useState('');
  const [resolved, setResolved] = useState<TrackingResolveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoQueryDone, setAutoQueryDone] = useState(false);
  const resultCardRef = useRef<HTMLDivElement>(null);
  const masterCardRef = useRef<HTMLDivElement>(null);
  const activeRequestRef = useRef<AbortController | null>(null);

  const pieza: TrackingResponse | null =
    resolved?.tipo === 'PIEZA' ? resolved.pieza ?? null : null;
  const master = resolved?.tipo === 'GUIA_MASTER' ? resolved.master ?? null : null;

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

  /**
   * Normaliza el codigo ingresado al formato canonico de `paquete.numero_guia`:
   * `<trackingBase> <pieza>/<total>`. Esto permite que el operario pegue valores
   * con espacios extra o con espacios alrededor de la barra (ej. "ABC 1 / 2")
   * y aun asi resuelvan correctamente contra el backend.
   */
  function normalizarCodigo(raw: string): string {
    return raw
      .trim()
      .replace(/\s*\/\s*/g, '/')
      .replace(/\s+/g, ' ');
  }

  function validateCodigo(rawCodigo: string): string | null {
    const c = normalizarCodigo(rawCodigo);
    if (!c) return 'Ingresa un código de guía o envío para consultar.';
    if (c.replace(/\s/g, '').length < 4) {
      return 'El código debe tener al menos 4 caracteres.';
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
        err instanceof Error ? err.message : 'No pudimos cargar el seguimiento en este momento.';
      const status = (err as Error & { status?: number })?.status;
      if (status === 429) {
        toast.warning(message, { duration: 6000 });
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
  }, [autoQueryDone]);

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
    const cod = codigoFromResolved(resolved, codigo);
    const title = 'Seguimiento de envío ECUBOX';
    const text = `Revisa el estado de tu envío con el código ${cod}.`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url: currentTrackingUrl });
        return;
      } catch {
        // fallback a copiar
      }
    }
    await handleCopyLink();
  }

  function buildExportFilename(extension: string, scope: 'pieza' | 'master' = 'pieza'): string {
    const baseRaw =
      scope === 'master'
        ? master?.trackingBase ?? 'tracking-master'
        : pieza?.numeroGuia ?? 'tracking';
    const base = baseRaw.replace(/[^A-Za-z0-9._-]+/g, '_');
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const prefix = scope === 'master' ? 'consolidado' : 'tracking';
    return `${prefix}-${base}-${yyyy}${mm}${dd}.${extension}`;
  }

  function getActiveExportNode(): HTMLDivElement | null {
    if (pieza) return resultCardRef.current;
    if (master) return masterCardRef.current;
    return null;
  }

  function getActiveExportScope(): 'pieza' | 'master' | null {
    if (pieza) return 'pieza';
    if (master) return 'master';
    return null;
  }

  async function handleDownloadImage(format: SnapshotFormat = 'png') {
    const node = getActiveExportNode();
    const scope = getActiveExportScope();
    if (!node || !scope) return;
    const tid = toast.loading(
      format === 'png' ? 'Generando imagen PNG...' : 'Generando imagen JPEG...',
    );
    try {
      const blob = await snapshotToBlob(node, format, {
        quality: format === 'jpeg' ? 0.92 : undefined,
      });
      downloadBlob(blob, buildExportFilename(format === 'png' ? 'png' : 'jpg', scope));
      toast.success('Imagen descargada.', { id: tid });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`No se pudo descargar la imagen. ${message}`, { id: tid });
    }
  }

  async function handleCopyImage() {
    const node = getActiveExportNode();
    if (!node) return;
    const tid = toast.loading('Copiando imagen al portapapeles...');
    try {
      const blob = await snapshotToBlob(node, 'png');
      await copyImageBlobToClipboard(blob);
      toast.success('Imagen copiada al portapapeles.', { id: tid });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`No se pudo copiar la imagen. ${message}`, { id: tid });
    }
  }

  async function handleDownloadPdf(mode: 'estructurado' | 'snapshot' = 'estructurado') {
    const node = getActiveExportNode();
    const scope = getActiveExportScope();
    if (!node || !scope) return;
    const tid = toast.loading(
      mode === 'estructurado'
        ? 'Generando PDF estructurado...'
        : 'Generando PDF visual (puede tomar unos segundos)...',
    );
    try {
      const filename = buildExportFilename('pdf', scope);
      if (mode === 'estructurado') {
        const doc =
          scope === 'master' && master
            ? buildTrackingMasterPdf(master)
            : pieza
              ? buildTrackingPdf(pieza)
              : null;
        if (!doc) throw new Error('No hay datos disponibles para exportar.');
        runJsPdfAction(doc, { mode: 'download', filename });
      } else {
        const refLabel =
          scope === 'master'
            ? master?.trackingBase ?? 'consolidado'
            : pieza?.numeroGuia ?? 'tracking';
        const result = await snapshotNodeToPdf(node, filename, {
          orientation: 'portrait',
          margin: 8,
          jpegQuality: 0.92,
          footerLeft: `ECUBOX · ${refLabel}`,
        });
        result.download();
      }
      toast.success(
        mode === 'estructurado' ? 'PDF estructurado descargado.' : 'PDF visual descargado.',
        { id: tid },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`No se pudo generar el PDF. ${message}`, { id: tid });
    }
  }

  async function handlePrintPdf() {
    const scope = getActiveExportScope();
    if (!scope) return;
    const tid = toast.loading('Preparando vista previa de impresión...');
    try {
      const doc =
        scope === 'master' && master
          ? buildTrackingMasterPdf(master)
          : pieza
            ? buildTrackingPdf(pieza)
            : null;
      if (!doc) throw new Error('No hay datos disponibles para imprimir.');
      runJsPdfAction(doc, {
        mode: 'print',
        filename: buildExportFilename('pdf', scope),
      });
      toast.success('Vista previa abierta.', { id: tid });
    } catch {
      toast.error('No se pudo abrir la vista previa.', { id: tid });
    }
  }

  const estados: TrackingEstadoItem[] = pieza?.estados ?? [];
  const fechaFormateada = formatFechaEstadoDesde(pieza?.fechaEstadoDesde);
  const currentIndex = estados.findIndex((e) => e.esActual);
  const estadosBase = estados.filter((e) => e.tipoFlujo !== 'ALTERNO');
  const totalPasosBase = estadosBase.length;
  const pasoBaseActual = (() => {
    if (currentIndex < 0) return 0;
    const visiblesHastaActual = estados.slice(0, currentIndex + 1);
    return visiblesHastaActual.filter((e) => e.tipoFlujo !== 'ALTERNO').length;
  })();
  const hasDespachoInfo = pieza?.despacho != null;
  const hasPaquetesDespacho = (pieza?.paquetesDespacho?.length ?? 0) > 0;
  const hasOperadorEntrega = pieza?.operadorEntrega != null;
  const piezasHermanas = pieza?.master?.piezas ?? [];
  const tieneMultiplesPiezas = piezasHermanas.length > 1;
  const totalEsperadasMaster =
    pieza?.master?.totalPiezasEsperadas ?? pieza?.master?.piezasRegistradas ?? 0;

  const sinResultados =
    autoQueryDone && !loading && !error && !resolved && !validationError;

  return (
    <div className="landing-shell">
      <div className="landing-overlay" />
      <SiteHeader variant="tool" />

      <main className="mobile-safe-inline relative z-10 flex-1 py-5 sm:py-8">
        <div className="content-container-wide w-full space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-2">
              <span className="landing-chip inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-primary)]">
                <PackageSearch className="h-3 w-3" />
                Rastreo público
              </span>
              <h1 className="responsive-title landing-text font-bold tracking-tight">
                Seguimiento de envío
              </h1>
              <p className="landing-text-muted text-sm sm:text-base">
                Ingresa el número de pieza o la guía del consolidador para ver su estado.
              </p>
            </div>
            <p className="landing-text-muted hidden items-center gap-1.5 text-xs sm:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-success)]" />
              Información oficial de ECUBOX
            </p>
          </div>

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
            <div className="landing-card flex items-center justify-center gap-2 p-8 text-sm landing-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando información del envío...
            </div>
          )}

          {error && (
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

          {resolved?.tipo === 'GUIA_MASTER' && resolved.master ? (
            <section className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-3 items-start">
                <div
                  ref={masterCardRef}
                  data-tracking-export="true"
                  className="xl:col-span-2 space-y-5"
                >
                  <TrackingMasterView
                    master={resolved.master}
                    onSelectPieza={handleSelectPieza}
                  />
                </div>
                <aside className="space-y-5 xl:sticky xl:top-4">
                  <TrackingActionsBar
                    onShare={handleShare}
                    onCopyLink={handleCopyLink}
                    onPrintPdf={handlePrintPdf}
                    onDownloadPdf={handleDownloadPdf}
                    onDownloadImage={handleDownloadImage}
                    onCopyImage={handleCopyImage}
                  />
                </aside>
              </div>
            </section>
          ) : null}

          {pieza ? (
            <section ref={resultCardRef} data-tracking-export="true" className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-3 items-start">
                <div className="xl:col-span-2 space-y-5">
                  <TrackingSummaryCard result={pieza} fechaFormateada={fechaFormateada} />
                  <TrackingProgressCard
                    result={pieza}
                    totalPasosBase={totalPasosBase}
                    pasoBaseActual={pasoBaseActual}
                  />
                  <TrackingTimeline estados={estados} currentIndex={currentIndex} />
                  {tieneMultiplesPiezas ? (
                    <TrackingPiezasList
                      piezas={piezasHermanas}
                      totalEsperadas={totalEsperadasMaster}
                      numeroGuiaActual={pieza.numeroGuia}
                      onSelectPieza={handleSelectPieza}
                      titulo={
                        pieza.master?.trackingBase
                          ? `Otras piezas de la guía ${pieza.master.trackingBase}`
                          : 'Otras piezas de esta guía'
                      }
                    />
                  ) : null}
                  {hasDespachoInfo ? <TrackingDespachoCard result={pieza} /> : null}
                  {hasDespachoInfo && hasPaquetesDespacho ? (
                    <TrackingPaquetesDespachoCard result={pieza} />
                  ) : null}
                </div>
                <aside className="space-y-5 xl:sticky xl:top-4">
                  <TrackingDetailsCard result={pieza} />
                  {hasDespachoInfo && hasOperadorEntrega ? (
                    <TrackingOperadorEntregaCard result={pieza} />
                  ) : null}
                  <TrackingActionsBar
                    onShare={handleShare}
                    onCopyLink={handleCopyLink}
                    onPrintPdf={handlePrintPdf}
                    onDownloadPdf={handleDownloadPdf}
                    onDownloadImage={handleDownloadImage}
                    onCopyImage={handleCopyImage}
                  />
                </aside>
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
