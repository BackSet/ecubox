import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { getTarifaCalculadoraPublic } from '@/lib/api/tarifa-calculadora.service';
import { PesoInputPair } from '@/components/PesoInput';
import { sanitizeNumericDecimal } from '@/lib/inputFilters';
import { lbsToKg, kgToLbs } from '@/lib/utils/weight';
import {
  AlertTriangle,
  Calculator,
  Check,
  ChevronDown,
  Clipboard,
  Copy,
  FileDown,
  Image as ImageIcon,
  Info,
  Loader2,
  Package as PackageIcon,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Share2,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { KeyValueGridSkeleton } from '@/components/skeletons/KeyValueGridSkeleton';
import { PublicPageHero } from '@/components/public/PublicPageHero';
import { PublicPageLayout } from '@/components/public/PublicPageLayout';
import { PublicSupportStrip } from '@/components/public/PublicSupportStrip';
import { copyText } from '@/lib/clipboard';
import { notify } from '@/lib/notify';
import { TRACKING_SNAPSHOT_OPTIONS } from '@/lib/exporters/trackingSnapshotOptions';
import {
  COTIZACION_AVISO,
  buildCotizacionText,
  formatLbs,
  formatUsd,
  type CotizacionCalculadora,
} from '@/lib/calculadora/cotizacion';

const MIN_PESO_LBS_RECARGO = 4;
const RECARGO_ENVIO_MENOR_PESO = 3.5;
type PendingAction = 'share' | 'download-image' | 'copy-image' | 'export-pdf' | null;

const PRESETS_LBS: Array<{ label: string; valor: number }> = [
  { label: '1 lbs', valor: 1 },
  { label: '2 lbs', valor: 2 },
  { label: '5 lbs', valor: 5 },
  { label: '10 lbs', valor: 10 },
  { label: '20 lbs', valor: 20 },
];

export function CalculadoraPage() {
  const cotizacionRef = useRef<HTMLElement>(null);
  const [tarifaPorLibra, setTarifaPorLibra] = useState<number | null>(null);
  const [tarifaError, setTarifaError] = useState<string | null>(null);
  const [tarifaLoading, setTarifaLoading] = useState(true);
  const [pesoLbs, setPesoLbs] = useState<string>('');
  const [pesoKg, setPesoKg] = useState<string>('');
  const [copiado, setCopiado] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const cargarTarifa = useMemo(
    () => async (signal?: AbortSignal) => {
      setTarifaLoading(true);
      setTarifaError(null);
      try {
        const data = await getTarifaCalculadoraPublic();
        if (!signal?.aborted) setTarifaPorLibra(data.tarifaPorLibra);
      } catch {
        if (!signal?.aborted) setTarifaError('No se pudo cargar la tarifa.');
      } finally {
        if (!signal?.aborted) setTarifaLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    void cargarTarifa(controller.signal);
    return () => controller.abort();
  }, [cargarTarifa]);

  const handleLbsChange = (value: string) => {
    const sanitized = sanitizeNumericDecimal(value);
    setPesoLbs(sanitized);
    const n = sanitized === '' ? NaN : Number(sanitized);
    if (!Number.isNaN(n) && n >= 0) {
      setPesoKg(String(lbsToKg(n)));
    } else {
      setPesoKg('');
    }
  };

  const handleKgChange = (value: string) => {
    const sanitized = sanitizeNumericDecimal(value);
    setPesoKg(sanitized);
    const n = sanitized === '' ? NaN : Number(sanitized);
    if (!Number.isNaN(n) && n >= 0) {
      setPesoLbs(String(kgToLbs(n)));
    } else {
      setPesoLbs('');
    }
  };

  const aplicarPreset = (lbs: number) => {
    handleLbsChange(String(lbs));
  };

  const limpiar = () => {
    setPesoLbs('');
    setPesoKg('');
    setCopiado(false);
  };

  const pesoLbsNum = pesoLbs === '' ? NaN : Number(pesoLbs);
  const pesoIngresado = pesoLbs.trim() !== '' || pesoKg.trim() !== '';
  const hasValidPeso = !Number.isNaN(pesoLbsNum) && pesoLbsNum > 0;
  const pesoInvalido = pesoIngresado && !hasValidPeso;
  const tarifa = tarifaPorLibra ?? 0;
  const tarifaConfigurada = tarifa > 0;
  const costoBase = hasValidPeso && tarifaConfigurada ? pesoLbsNum * tarifa : null;
  const aplicaRecargo = hasValidPeso && pesoLbsNum < MIN_PESO_LBS_RECARGO;
  const recargoEnvio = aplicaRecargo ? RECARGO_ENVIO_MENOR_PESO : 0;
  const costoEstimado = costoBase != null ? costoBase + recargoEnvio : null;
  const lbsParaEvitarRecargo = aplicaRecargo
    ? Math.max(0, MIN_PESO_LBS_RECARGO - pesoLbsNum)
    : 0;
  const cotizacion: CotizacionCalculadora | null =
    costoEstimado != null && costoBase != null
      ? {
          pesoLbs: pesoLbsNum,
          pesoKg: lbsToKg(pesoLbsNum),
          tarifaPorLibra: tarifa,
          subtotal: costoBase,
          recargo: recargoEnvio,
          umbralRecargoLbs: MIN_PESO_LBS_RECARGO,
          total: costoEstimado,
          moneda: 'USD',
          aviso: COTIZACION_AVISO,
        }
      : null;
  const cotizacionText = cotizacion ? buildCotizacionText(cotizacion) : '';
  const exportFilenameDate = () => new Date().toISOString().slice(0, 10).replaceAll('-', '');

  const withCotizacionSnapshot = async <T,>(
    action: (exportNode: HTMLElement) => Promise<T>,
  ): Promise<T> => {
    const node = cotizacionRef.current;
    if (!node) throw new Error('No hay una cotización disponible.');
    const exportNode = node.cloneNode(true) as HTMLElement;
    exportNode.classList.add('tracking-export-capture');
    exportNode.setAttribute('aria-hidden', 'true');
    Object.assign(exportNode.style, {
      position: 'fixed',
      top: '0',
      left: '-10000px',
      zIndex: '-1',
    });
    document.body.appendChild(exportNode);
    try {
      return await action(exportNode);
    } finally {
      exportNode.remove();
    }
  };

  const handleCopiarResultado = async () => {
    if (!cotizacion) return;
    try {
      await copyText(cotizacionText);
      setCopiado(true);
      toast.success('Cotización copiada');
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const handleCompartirResultado = async () => {
    if (!cotizacion || pendingAction) return;
    setPendingAction('share');
    try {
      const { downloadBlob, snapshotToBlob } = await import('@/lib/exporters/domSnapshot');
      const filename = `cotizacion-ecubox-${exportFilenameDate()}.png`;
      const blob = await withCotizacionSnapshot((node) =>
        snapshotToBlob(node, 'png', TRACKING_SNAPSHOT_OPTIONS),
      );
      const file = new File([blob], filename, { type: 'image/png' });
      const shareData: ShareData = {
        title: 'Cotización de envío ECUBOX',
        text: cotizacionText,
        files: [file],
      };
      const canShareImage =
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare(shareData);

      if (canShareImage) {
        try {
          await navigator.share(shareData);
          toast.success('Cotización compartida como imagen');
        } catch (error) {
          if (
            typeof error === 'object' &&
            error !== null &&
            'name' in error &&
            error.name === 'AbortError'
          ) {
            return;
          }
          downloadBlob(blob, filename);
          toast.success('Imagen descargada para compartir');
        }
      } else {
        downloadBlob(blob, filename);
        toast.success('Imagen descargada para compartir');
      }
    } catch (error) {
      toast.error(
        `No se pudo compartir la imagen. ${error instanceof Error ? error.message : ''}`.trim(),
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleDescargarImagen = async () => {
    if (!cotizacion || pendingAction) return;
    setPendingAction('download-image');
    try {
      await notify.run(
        (async () => {
          const { downloadBlob, snapshotToBlob } = await import('@/lib/exporters/domSnapshot');
          const blob = await withCotizacionSnapshot((node) =>
            snapshotToBlob(node, 'png', TRACKING_SNAPSHOT_OPTIONS),
          );
          downloadBlob(blob, `cotizacion-ecubox-${exportFilenameDate()}.png`);
        })(),
        {
          loading: 'Generando imagen PNG...',
          success: 'Imagen descargada',
          error: (error) =>
            `No se pudo descargar la imagen. ${
              error instanceof Error ? error.message : ''
            }`.trim(),
        },
      );
    } catch {
      // notify.run muestra el error.
    } finally {
      setPendingAction(null);
    }
  };

  const handleCopiarImagen = async () => {
    if (!cotizacion || pendingAction) return;
    setPendingAction('copy-image');
    try {
      await notify.run(
        (async () => {
          const { copyImageBlobToClipboard, snapshotToBlob } = await import(
            '@/lib/exporters/domSnapshot'
          );
          const blob = await withCotizacionSnapshot((node) =>
            snapshotToBlob(node, 'png', TRACKING_SNAPSHOT_OPTIONS),
          );
          await copyImageBlobToClipboard(blob);
        })(),
        {
          loading: 'Copiando imagen al portapapeles...',
          success: 'Imagen copiada',
          error: (error) =>
            `No se pudo copiar la imagen. ${
              error instanceof Error ? error.message : ''
            }`.trim(),
        },
      );
    } catch {
      // notify.run muestra el error.
    } finally {
      setPendingAction(null);
    }
  };

  const handleExportarResultado = async () => {
    if (!cotizacion || pendingAction) return;
    setPendingAction('export-pdf');
    const date = exportFilenameDate();
    try {
      await notify.run(
        (async () => {
          const { snapshotNodeToPdf } = await import('@/lib/exporters/domSnapshot');
          await withCotizacionSnapshot(async (exportNode) => {
            const result = await snapshotNodeToPdf(
              exportNode,
              `cotizacion-ecubox-${date}.pdf`,
              {
                ...TRACKING_SNAPSHOT_OPTIONS,
                orientation: 'portrait',
                margin: 8,
                jpegQuality: 0.92,
                footerLeft: 'ECUBOX · Cotización de envío',
              },
            );
            result.download();
          });
        })(),
        {
          loading: 'Generando cotización completa...',
          success: 'Cotización descargada',
          error: (error) =>
            `No se pudo exportar la cotización. ${
              error instanceof Error ? error.message : ''
            }`.trim(),
        },
      );
    } catch {
      // notify.run muestra el error.
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <PublicPageLayout headerVariant="tool" mainClassName="mobile-safe-inline py-6 sm:py-10">
      <div className="content-container w-full max-w-3xl space-y-6">
          <PublicPageHero
            icon={Calculator}
            title="Calculadora de envío"
            description="Ingresa el peso de tu paquete para obtener un costo estimado todo incluido con transporte Servientrega."
          />

          <PublicSupportStrip />

          {tarifaError && (
            <div
              className="flex items-start justify-between gap-3 rounded-lg border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 p-4 text-sm text-[var(--color-destructive)]"
              role="alert"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{tarifaError}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-[var(--color-destructive)]/40 text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10"
                onClick={() => void cargarTarifa()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reintentar
              </Button>
            </div>
          )}

          {tarifaLoading && !tarifaError && (
            <>
              <section
                className="landing-card flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5"
                aria-busy="true"
                aria-live="polite"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-6 w-32 rounded-full" />
                  <Skeleton className="h-6 w-40 rounded-full" />
                </div>
              </section>
              <section className="landing-card space-y-5 p-4 sm:p-6" aria-hidden>
                <Skeleton className="h-4 w-40" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={`preset-skel-${i}`} className="h-8 w-16 rounded-full" />
                  ))}
                </div>
                <KeyValueGridSkeleton rows={2} cols={2} />
              </section>
              <span className="sr-only">Cargando tarifa...</span>
            </>
          )}

          {!tarifaLoading && !tarifaError && (
            <>
              <section className="landing-card flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                    <Truck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide landing-text-muted">
                      Tarifa actual
                    </p>
                    <p className="text-base font-semibold landing-text">
                      {tarifaConfigurada ? `${formatUsd(tarifa)} / libra` : 'No configurada'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone="success">Servientrega incluido</StatusBadge>
                  {tarifaConfigurada && (
                    <StatusBadge tone="warning">
                      Recargo {formatUsd(RECARGO_ENVIO_MENOR_PESO)} si &lt; {MIN_PESO_LBS_RECARGO} lbs
                    </StatusBadge>
                  )}
                </div>
              </section>

              {!tarifaConfigurada && (
                <div className="ui-alert ui-alert-warning flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    La tarifa aún no ha sido configurada. El costo estimado no estará
                    disponible hasta que se publique.
                  </span>
                </div>
              )}

              <section className="landing-card space-y-5 p-4 sm:p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5">
                    <span className="inline-flex items-center rounded-full bg-[var(--color-primary)]/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                      Paso 1
                    </span>
                    <h2 className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-foreground)]">
                      <Scale className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                      ¿Cuánto pesa tu paquete?
                    </h2>
                  </div>
                  {(pesoLbs || pesoKg) && (
                    <button
                      type="button"
                      onClick={limpiar}
                      className="inline-flex shrink-0 items-center gap-1 text-xs text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Limpiar
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                    Pesos frecuentes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS_LBS.map((p) => {
                      const activo = hasValidPeso && Math.abs(pesoLbsNum - p.valor) < 0.001;
                      return (
                        <button
                          key={p.valor}
                          type="button"
                          onClick={() => aplicarPreset(p.valor)}
                          className={`inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors ${
                            activo
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                              : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]'
                          }`}
                        >
                          <PackageIcon className="h-3 w-3" />
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Peso del paquete</Label>
                  <PesoInputPair
                    lbs={pesoLbs}
                    kg={pesoKg}
                    onLbsChange={handleLbsChange}
                    onKgChange={handleKgChange}
                    size="lg"
                    showHint
                    invalid={pesoInvalido}
                  />
                </div>

                {pesoInvalido && (
                  <div className="ui-alert flex items-start gap-2 border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>El peso debe ser mayor a 0 para calcular la cotización.</span>
                  </div>
                )}

                {aplicaRecargo && tarifaConfigurada && (
                  <div className="ui-alert ui-alert-warning flex items-start gap-2">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      Tu paquete pesa menos de{' '}
                      <span className="font-semibold">{MIN_PESO_LBS_RECARGO} lbs</span>,
                      por lo que se aplicará el recargo. Agrega{' '}
                      <span className="font-semibold">{formatLbs(lbsParaEvitarRecargo)} lbs</span>{' '}
                      más para evitarlo.
                    </span>
                  </div>
                )}
              </section>

              {costoEstimado !== null && tarifaConfigurada ? (
                <section
                  ref={cotizacionRef}
                  className="landing-card-elevated overflow-hidden"
                  data-calculadora-export-root
                >
                  {/* Total protagonista sobre fondo de marca */}
                  <div className="brand-gradient-bg px-5 py-5 sm:px-6 sm:py-6">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-primary-foreground)]/80">
                          <span className="inline-flex items-center rounded-full bg-[var(--color-primary-foreground)]/20 px-2 py-0.5">
                            Paso 2
                          </span>
                          Costo estimado total
                        </p>
                        <p className="mt-2 text-4xl font-bold tracking-tight text-[var(--color-primary-foreground)] sm:text-5xl">
                          {formatUsd(costoEstimado)}
                        </p>
                        <p className="mt-1.5 text-sm text-[var(--color-primary-foreground)]/85">
                          Paquete de{' '}
                          <span className="font-semibold text-[var(--color-primary-foreground)]">
                            {formatLbs(pesoLbsNum)} lbs
                          </span>{' '}
                          ({formatLbs(lbsToKg(pesoLbsNum))} kg)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-5 sm:p-6">
                    <dl className="space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]/60 p-3.5 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-[var(--color-muted-foreground)]">
                          {formatLbs(pesoLbsNum)} lbs × {formatUsd(tarifa)}/lbs
                        </dt>
                        <dd className="font-medium text-[var(--color-foreground)]">
                          {formatUsd(costoBase ?? 0)}
                        </dd>
                      </div>
                      {aplicaRecargo && (
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-[var(--color-warning)]">
                            Recargo envío (&lt; {MIN_PESO_LBS_RECARGO} lbs)
                          </dt>
                          <dd className="font-medium text-[var(--color-warning)]">
                            +{formatUsd(RECARGO_ENVIO_MENOR_PESO)}
                          </dd>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-2 text-base">
                        <dt className="font-semibold text-[var(--color-foreground)]">
                          Total estimado
                        </dt>
                        <dd className="font-bold text-[var(--color-primary)]">
                          {formatUsd(costoEstimado)}
                        </dd>
                      </div>
                    </dl>

                    <div className="flex flex-col gap-1 text-[11px] leading-relaxed text-[var(--color-muted-foreground)]">
                      <p>Moneda: USD</p>
                      <p>* {COTIZACION_AVISO}</p>
                    </div>

                    <div
                      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                      data-export-exclude
                      aria-label="Acciones de la cotización"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-10"
                        onClick={() => void handleCopiarResultado()}
                      >
                        {copiado ? (
                          <Check data-icon="inline-start" />
                        ) : (
                          <Copy data-icon="inline-start" />
                        )}
                        {copiado ? 'Texto copiado' : 'Copiar texto'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-10"
                        disabled={pendingAction !== null}
                        onClick={() => void handleCompartirResultado()}
                      >
                        {pendingAction === 'share' ? (
                          <Loader2 data-icon="inline-start" className="animate-spin" />
                        ) : (
                          <Share2 data-icon="inline-start" />
                        )}
                        Compartir imagen
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-10"
                            disabled={pendingAction !== null}
                          >
                            {pendingAction === 'download-image' ||
                            pendingAction === 'copy-image' ? (
                              <Loader2 data-icon="inline-start" className="animate-spin" />
                            ) : (
                              <ImageIcon data-icon="inline-start" />
                            )}
                            Opciones de imagen
                            <ChevronDown data-icon="inline-end" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => void handleDescargarImagen()}>
                              <FileDown />
                              <div>
                                <p className="font-medium">Descargar PNG</p>
                                <p className="text-xs text-muted-foreground">
                                  Guarda la cotización como imagen.
                                </p>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void handleCopiarImagen()}>
                              <Clipboard />
                              <div>
                                <p className="font-medium">Copiar imagen</p>
                                <p className="text-xs text-muted-foreground">
                                  Pégala en chats o documentos.
                                </p>
                              </div>
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        type="button"
                        variant="primary"
                        className="min-h-10"
                        disabled={pendingAction !== null}
                        onClick={() => void handleExportarResultado()}
                      >
                        {pendingAction === 'export-pdf' ? (
                          <Loader2 data-icon="inline-start" className="animate-spin" />
                        ) : (
                          <FileDown data-icon="inline-start" />
                        )}
                        Exportar completo
                      </Button>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="landing-card-muted rounded-2xl p-6 text-center">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-landing-card-muted)] landing-text-muted">
                    <Calculator className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm font-medium landing-text">
                    Ingresa el peso para ver tu cotización
                  </p>
                  <p className="mt-1 text-xs landing-text-muted">
                    Puedes usar libras o kilogramos: la conversión es automática.
                  </p>
                </section>
              )}

              <section className="landing-card flex flex-wrap items-center justify-between gap-3 p-4">
                <p className="text-sm landing-text-muted">
                  ¿Ya tienes un envío en camino?
                </p>
                <Link
                  to="/tracking"
                  className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-3.5 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary)]/90"
                >
                  <Search className="h-4 w-4" />
                  Rastrear envío
                </Link>
              </section>
            </>
          )}
        </div>
    </PublicPageLayout>
  );
}
