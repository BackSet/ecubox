import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { getTarifaCalculadoraPublic } from '@/lib/api/tarifa-calculadora.service';
import { onKeyDownNumericDecimal, sanitizeNumericDecimal } from '@/lib/inputFilters';
import { lbsToKg, kgToLbs } from '@/lib/utils/weight';
import {
  AlertTriangle,
  Calculator,
  Check,
  Copy,
  Info,
  Package as PackageIcon,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { KeyValueGridSkeleton } from '@/components/skeletons/KeyValueGridSkeleton';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

const MIN_PESO_LBS_RECARGO = 4;
const RECARGO_ENVIO_MENOR_PESO = 3.5;

const PRESETS_LBS: Array<{ label: string; valor: number }> = [
  { label: '1 lb', valor: 1 },
  { label: '2 lb', valor: 2 },
  { label: '5 lb', valor: 5 },
  { label: '10 lb', valor: 10 },
  { label: '20 lb', valor: 20 },
];

function fmtLbs(n: number): string {
  return n.toLocaleString('es-EC', { maximumFractionDigits: 2 });
}

function fmtMoneda(n: number): string {
  return n.toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function CalculadoraPage() {
  const [tarifaPorLibra, setTarifaPorLibra] = useState<number | null>(null);
  const [tarifaError, setTarifaError] = useState<string | null>(null);
  const [tarifaLoading, setTarifaLoading] = useState(true);
  const [pesoLbs, setPesoLbs] = useState<string>('');
  const [pesoKg, setPesoKg] = useState<string>('');
  const [copiado, setCopiado] = useState(false);

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
  const hasValidPeso = !Number.isNaN(pesoLbsNum) && pesoLbsNum > 0;
  const tarifa = tarifaPorLibra ?? 0;
  const tarifaConfigurada = tarifa > 0;
  const costoBase = hasValidPeso && tarifaConfigurada ? pesoLbsNum * tarifa : null;
  const aplicaRecargo = hasValidPeso && pesoLbsNum < MIN_PESO_LBS_RECARGO;
  const recargoEnvio = aplicaRecargo ? RECARGO_ENVIO_MENOR_PESO : 0;
  const costoEstimado = costoBase != null ? costoBase + recargoEnvio : null;
  const lbsParaEvitarRecargo = aplicaRecargo
    ? Math.max(0, MIN_PESO_LBS_RECARGO - pesoLbsNum)
    : 0;

  const handleCopiarResultado = async () => {
    if (costoEstimado == null) return;
    const lineas = [
      `Cotización ECUBOX`,
      `Peso: ${fmtLbs(pesoLbsNum)} lb (${fmtLbs(lbsToKg(pesoLbsNum))} kg)`,
      `Tarifa: ${fmtMoneda(tarifa)} / lb`,
      `Subtotal: ${fmtMoneda(costoBase ?? 0)}`,
      aplicaRecargo
        ? `Recargo (< ${MIN_PESO_LBS_RECARGO} lb): ${fmtMoneda(RECARGO_ENVIO_MENOR_PESO)}`
        : null,
      `Total: ${fmtMoneda(costoEstimado)}`,
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lineas.join('\n'));
      setCopiado(true);
      toast.success('Cotización copiada');
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <div className="landing-shell">
      <div className="landing-overlay" />
      <SiteHeader variant="tool" />

      <main className="mobile-safe-inline relative z-10 flex-1 py-6 sm:py-10">
        <div className="content-container w-full max-w-3xl space-y-6">
          <div className="space-y-3 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <Calculator className="h-6 w-6" />
            </span>
            <div className="space-y-1.5">
              <h1 className="responsive-title landing-text font-bold tracking-tight">
                Calculadora de envío
              </h1>
              <p className="landing-text-muted text-sm sm:text-base">
                Ingresa el peso de tu paquete para obtener un costo estimado todo
                incluido con transporte Servientrega.
              </p>
            </div>
          </div>

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
                      {tarifaConfigurada ? `${fmtMoneda(tarifa)} / libra` : 'No configurada'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone="success">Servientrega incluido</StatusBadge>
                  {tarifaConfigurada && (
                    <StatusBadge tone="warning">
                      Recargo {fmtMoneda(RECARGO_ENVIO_MENOR_PESO)} si &lt; {MIN_PESO_LBS_RECARGO} lb
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
                <div className="flex items-center justify-between gap-2">
                  <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
                    <Scale className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                    Peso del paquete
                  </h2>
                  {(pesoLbs || pesoKg) && (
                    <button
                      type="button"
                      onClick={limpiar}
                      className="inline-flex items-center gap-1 text-xs text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Limpiar
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                    Atajos
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="pesoLbs" className="mb-1.5 block text-sm">
                      Peso (libras)
                    </Label>
                    <div className="relative">
                      <Input
                        id="pesoLbs"
                        type="text"
                        inputMode="decimal"
                        value={pesoLbs}
                        onChange={(e) => handleLbsChange(e.target.value)}
                        onKeyDown={(e) => onKeyDownNumericDecimal(e, pesoLbs)}
                        placeholder="0.00"
                        className="h-11 pr-10 text-base"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--color-muted-foreground)]">
                        lb
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="pesoKg" className="mb-1.5 block text-sm">
                      Peso (kilogramos)
                    </Label>
                    <div className="relative">
                      <Input
                        id="pesoKg"
                        type="text"
                        inputMode="decimal"
                        value={pesoKg}
                        onChange={(e) => handleKgChange(e.target.value)}
                        onKeyDown={(e) => onKeyDownNumericDecimal(e, pesoKg)}
                        placeholder="0.00"
                        className="h-11 pr-10 text-base"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--color-muted-foreground)]">
                        kg
                      </span>
                    </div>
                  </div>
                </div>

                {aplicaRecargo && tarifaConfigurada && (
                  <div className="ui-alert ui-alert-warning flex items-start gap-2">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      Tu paquete pesa menos de{' '}
                      <span className="font-semibold">{MIN_PESO_LBS_RECARGO} lb</span>,
                      por lo que se aplicará el recargo. Agrega{' '}
                      <span className="font-semibold">{fmtLbs(lbsParaEvitarRecargo)} lb</span>{' '}
                      más para evitarlo.
                    </span>
                  </div>
                )}
              </section>

              {costoEstimado !== null && tarifaConfigurada ? (
                <section className="landing-card-elevated overflow-hidden">
                  <div className="space-y-4 p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                          Costo estimado
                        </p>
                        <p className="mt-1 text-3xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-4xl">
                          {fmtMoneda(costoEstimado)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                          Para un paquete de{' '}
                          <span className="font-medium text-[var(--color-foreground)]">
                            {fmtLbs(pesoLbsNum)} lb
                          </span>{' '}
                          ({fmtLbs(lbsToKg(pesoLbsNum))} kg)
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopiarResultado}
                        className={`gap-2 ${copiado ? 'border-[var(--color-success)] text-[var(--color-success)]' : ''}`}
                      >
                        {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copiado ? 'Copiado' : 'Copiar'}
                      </Button>
                    </div>

                    <dl className="space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]/60 p-3.5 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-[var(--color-muted-foreground)]">
                          {fmtLbs(pesoLbsNum)} lb × {fmtMoneda(tarifa)}/lb
                        </dt>
                        <dd className="font-medium text-[var(--color-foreground)]">
                          {fmtMoneda(costoBase ?? 0)}
                        </dd>
                      </div>
                      {aplicaRecargo && (
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-[var(--color-warning)]">
                            Recargo envío (&lt; {MIN_PESO_LBS_RECARGO} lb)
                          </dt>
                          <dd className="font-medium text-[var(--color-warning)]">
                            +{fmtMoneda(RECARGO_ENVIO_MENOR_PESO)}
                          </dd>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-2 text-base">
                        <dt className="font-semibold text-[var(--color-foreground)]">
                          Total estimado
                        </dt>
                        <dd className="font-bold text-[var(--color-primary)]">
                          {fmtMoneda(costoEstimado)}
                        </dd>
                      </div>
                    </dl>

                    <p className="text-[11px] leading-relaxed text-[var(--color-muted-foreground)]">
                      * Este valor es referencial. El costo final puede variar según
                      embalaje, dimensiones y revisión aduanal.
                    </p>
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
      </main>

      <SiteFooter />
    </div>
  );
}
