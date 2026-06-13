import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import {
  AlertTriangle,
  Boxes,
  ChartNoAxesCombined,
  CircleAlert,
  ShieldAlert,
  Clock3,
  DollarSign,
  FileDown,
  PackageSearch,
  PackageCheck,
  Scale,
  Timer,
  TrendingDown,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';
import { KpiCard } from '@/components/KpiCard';
import { KpiCardsGrid } from '@/components/KpiCardsGrid';
import { InlineErrorBanner } from '@/components/InlineErrorBanner';
import { KpiCardsGridSkeleton } from '@/components/skeletons/KpiCardSkeleton';
import { SurfaceCardSkeleton } from '@/components/skeletons/SurfaceCardSkeleton';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { SurfaceCard } from '@/components/ui/surface-card';
import { PageHeader } from '@/components/PageHeader';
import { PageCard } from '@/components/PageCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useEstadisticas } from '@/hooks/useEstadisticas';
import type { MetricaComparable } from '@/types/estadisticas';
import { SeriesChart, StatusDistributionChart } from './EstadisticasCharts';
import { PeriodSelector } from './PeriodSelector';
import {
  GRANULARIDAD_LABEL,
  normalizeSearch,
  searchToApiParams,
  type EstadisticasSearch,
} from './periodo';

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatNumber(value: number | null | undefined, digits = 0) {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-EC', { maximumFractionDigits: digits }).format(value);
}

function formatMoney(value: number | null | undefined) {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Texto de comparación contra el periodo anterior equivalente. */
function comparaHint(metrica: MetricaComparable): string {
  if (!metrica.comparacionDisponible) {
    return 'Sin periodo anterior comparable';
  }
  if (metrica.variacionPct == null) {
    const dif = metrica.diferencia ?? 0;
    const signo = dif > 0 ? '+' : '';
    return `${signo}${formatNumber(dif, 1)} vs. periodo anterior`;
  }
  const arrow = metrica.variacionPct >= 0 ? '▲' : '▼';
  return `${arrow} ${formatNumber(Math.abs(metrica.variacionPct), 1)} % vs. periodo anterior`;
}

function tono(metrica: MetricaComparable): 'success' | 'danger' | 'neutral' {
  if (metrica.variacionPct == null) return 'neutral';
  if (metrica.variacionPct > 0) return 'success';
  if (metrica.variacionPct < 0) return 'danger';
  return 'neutral';
}

export function EstadisticasPage() {
  const navigate = useNavigate();
  const rawSearch = useSearch({ strict: false });
  const search = normalizeSearch(rawSearch as Record<string, unknown>);
  const apiParams = useMemo(() => searchToApiParams(search), [JSON.stringify(search)]);

  const [exportando, setExportando] = useState(false);
  const { data, isLoading, isFetching, isError, refetch } = useEstadisticas(apiParams);

  function setSearch(next: EstadisticasSearch) {
    void navigate({ to: '/estadisticas', search: next as never });
  }

  const mejorPunto = useMemo(() => {
    const serie = data?.resultados.despachosSerie ?? [];
    if (!serie.length) return null;
    return serie.reduce((best, item) => (item.total > best.total ? item : best));
  }, [data]);

  async function handleExportPdf() {
    if (!data || exportando) return;
    setExportando(true);
    try {
      await notify.run(
        (async () => {
          const [{ buildEstadisticasPdf }, { runJsPdfAction }] = await Promise.all([
            import('@/lib/pdf/builders/estadisticasPdf'),
            import('@/lib/pdf/actions'),
          ]);
          const doc = buildEstadisticasPdf(data);
          runJsPdfAction(doc, {
            mode: 'download',
            filename: `estadisticas-${data.periodo.desde}_a_${data.periodo.hastaInclusivo}.pdf`,
          });
        })(),
        {
          loading: 'Generando PDF de estadísticas...',
          success: 'PDF generado',
          error: 'No se pudo generar el PDF',
        },
      );
    } catch {
      // notificado por notify.run
    } finally {
      setExportando(false);
    }
  }

  const resultados = data?.resultados;
  const estadoActual = data?.estadoActual;

  return (
    <div className="page-stack">
      <PageHeader
        title="Estadísticas operativas"
        description="Tendencias del periodo y fotografía operativa actual para apoyar decisiones."
        icon={<ChartNoAxesCombined className="h-5 w-5 text-[var(--color-primary)]" />}
        actions={
          <>
            <PeriodSelector value={search} onChange={setSearch} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={!data || exportando}
              className="gap-1.5"
            >
              <FileDown className="h-4 w-4" aria-hidden />
              {exportando ? 'Generando...' : 'Exportar PDF'}
            </Button>
          </>
        }
      />

      {isError && (
        <InlineErrorBanner
          message="No se pudieron cargar las estadísticas"
          hint="Verifica el periodo seleccionado. Los datos anteriores se conservarán mientras se reintenta."
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      )}

      {isLoading && !data ? (
        <>
          <KpiCardsGridSkeleton count={8} />
          <SurfaceCardSkeleton />
          <div className="grid gap-4 xl:grid-cols-3">
            <SurfaceCardSkeleton className="xl:col-span-2" />
            <SurfaceCardSkeleton />
          </div>
        </>
      ) : data && resultados && estadoActual ? (
        <>
          {/* ── Cabecera del periodo ── */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3">
            <div>
              <p className="text-[13px] font-semibold text-[var(--color-foreground)]">
                {formatDate(data.periodo.desde)} – {formatDate(data.periodo.hastaInclusivo)}
                {data.periodoParcial && (
                  <span className="ml-2 inline-flex rounded-full bg-[var(--color-info)]/15 px-2 py-0.5 text-[11px] font-medium text-[var(--color-info)]">
                    Período en curso
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--color-muted-foreground)]">
                Comparado con {formatDate(data.periodoAnterior.desde)} –{' '}
                {formatDate(data.periodoAnterior.hastaInclusivo)} · Granularidad{' '}
                {GRANULARIDAD_LABEL[data.granularidad].toLowerCase()}
              </p>
            </div>
            <p className="text-[11px] text-[var(--color-muted-foreground)]">
              Fotografía generada {formatDateTime(data.generadoEn)}
            </p>
          </div>

          {/* ── Resultados del periodo (histórico + comparación) ── */}
          <section className="space-y-3">
            <h2 className="text-[14px] font-semibold text-[var(--color-foreground)]">
              Resultados del periodo
            </h2>
            <KpiCardsGrid>
              <KpiCard
                icon={<Truck />}
                label="Despachos"
                value={formatNumber(resultados.despachos.actual)}
                hint={comparaHint(resultados.despachos)}
                tone={tono(resultados.despachos)}
              />
              <KpiCard
                icon={<PackageCheck />}
                label="Paquetes despachados"
                value={formatNumber(resultados.paquetesDespachados.actual)}
                hint={comparaHint(resultados.paquetesDespachados)}
                tone={tono(resultados.paquetesDespachados)}
              />
              <KpiCard
                icon={<Boxes />}
                label="Paquetes registrados"
                value={formatNumber(resultados.paquetesRegistrados.actual)}
                hint={comparaHint(resultados.paquetesRegistrados)}
                tone={tono(resultados.paquetesRegistrados)}
              />
              <KpiCard
                icon={<Scale />}
                label="Peso despachado"
                value={`${formatNumber(resultados.pesoDespachadoLbs.actual, 1)} lbs`}
                hint={comparaHint(resultados.pesoDespachadoLbs)}
                tone={tono(resultados.pesoDespachadoLbs)}
              />
              <KpiCard
                icon={<Timer />}
                label="Tiempo promedio de despacho"
                value={
                  resultados.tiempoPromedioDespachoDias.actual != null
                    ? `${formatNumber(resultados.tiempoPromedioDespachoDias.actual, 1)} días`
                    : '—'
                }
                hint={comparaHint(resultados.tiempoPromedioDespachoDias)}
                tone="info"
              />
              <KpiCard
                icon={<TrendingUp />}
                label="Margen bruto estimado"
                value={formatMoney(resultados.margenBruto.actual)}
                hint={comparaHint(resultados.margenBruto)}
                tone="primary"
                to="/liquidaciones"
              />
              <KpiCard
                icon={<TrendingDown />}
                label="Costo de distribución"
                value={formatMoney(resultados.costoDistribucion.actual)}
                hint={comparaHint(resultados.costoDistribucion)}
                tone="warning"
                to="/liquidaciones"
              />
              <KpiCard
                icon={<DollarSign />}
                label="Ingreso neto aproximado"
                value={formatMoney(resultados.ingresoNeto.actual)}
                hint={comparaHint(resultados.ingresoNeto)}
                tone="success"
                to="/liquidaciones"
              />
            </KpiCardsGrid>

            <PageCard
              title="Evolución del periodo"
              description="Compara despachos realizados con nuevos paquetes registrados."
            >
              <SeriesChart
                despachos={resultados.despachosSerie}
                registros={resultados.registrosSerie}
                granularidad={data.granularidad}
              />
              {mejorPunto && (
                <p className="mt-3 text-[12px] text-[var(--color-muted-foreground)]">
                  Mayor actividad: {mejorPunto.etiqueta} ({formatNumber(mejorPunto.total)} despachos).
                </p>
              )}
            </PageCard>
          </section>

          {/* ── Estado operativo actual (fotografía, sin comparación) ── */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[14px] font-semibold text-[var(--color-foreground)]">
                Estado operativo actual
              </h2>
              <p className="text-[12px] text-[var(--color-muted-foreground)]">
                No depende del periodo seleccionado.
              </p>
            </div>
            <KpiCardsGrid>
              <KpiCard
                icon={<Clock3 />}
                label="Pendientes de despacho"
                value={formatNumber(estadoActual.pendientesDespacho)}
                hint="Sin despacho asignado actualmente"
                tone="warning"
              />
              <KpiCard
                icon={<AlertTriangle />}
                label="Demorados"
                value={formatNumber(estadoActual.demoradosSinDespachar)}
                hint={`Superan ${data.diasMaxSinDespachar} días laborables sin despacho`}
                tone={estadoActual.demoradosSinDespachar > 0 ? 'danger' : 'neutral'}
              />
              <KpiCard
                icon={<CircleAlert />}
                label="Entregados sin despacho"
                value={formatNumber(estadoActual.entregadosSinDespacho)}
                hint="Estado final sin despacho registrado"
                tone={estadoActual.entregadosSinDespacho > 0 ? 'warning' : 'neutral'}
              />
              <KpiCard
                icon={<ShieldAlert />}
                label="Otras excepciones"
                value={formatNumber(estadoActual.excepcionesOperativas)}
                hint="Inconsistencias operativas o de integridad"
                tone={estadoActual.excepcionesOperativas > 0 ? 'danger' : 'neutral'}
              />
            </KpiCardsGrid>

            <PageCard
              title="Inventario por estado"
              description="Situación actual de todos los paquetes."
            >
              <StatusDistributionChart data={estadoActual.distribucion} />
            </PageCard>

            {estadoActual.entregadosSinDespacho > 0 && (
              <SurfaceCard className="overflow-hidden border-[var(--color-warning)]/40">
                <div className="border-b border-[var(--color-border)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-[14px] font-semibold text-[var(--color-foreground)]">
                        Entregados sin despacho registrado
                      </h3>
                      <p className="mt-1 text-[12px] text-[var(--color-muted-foreground)]">
                        Alcanzaron el estado final del flujo, pero no conservan una relación con un
                        despacho.
                      </p>
                    </div>
                    <span className="rounded-full bg-[var(--color-warning)]/15 px-2.5 py-1 text-[12px] font-medium text-[var(--color-warning)]">
                      {estadoActual.entregadosSinDespacho} inconsistencias
                    </span>
                  </div>
                </div>
                <div className="table-responsive">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Guía / referencia</TableHead>
                        <TableHead>Guía master</TableHead>
                        <TableHead>Consignatario</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Registrado</TableHead>
                        <TableHead>Señal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {estadoActual.paquetesEntregadosSinDespacho.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Link
                              to="/tracking"
                              search={{ codigo: item.numeroGuia } as never}
                              className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                            >
                              <PackageSearch className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              {item.numeroGuia}
                            </Link>
                            <p className="text-[11px] text-[var(--color-muted-foreground)]">
                              {item.referencia}
                            </p>
                          </TableCell>
                          <TableCell>
                            {item.guiaMasterId != null ? (
                              <Link
                                to="/guias-master/$id"
                                params={{ id: String(item.guiaMasterId) }}
                                className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                              >
                                {item.guiaMaster ?? `#${item.guiaMasterId}`}
                              </Link>
                            ) : (
                              (item.guiaMaster ?? '—')
                            )}
                          </TableCell>
                          <TableCell>{item.consignatario ?? '—'}</TableCell>
                          <TableCell>{item.estado ?? '—'}</TableCell>
                          <TableCell>{formatDate(item.registradoEn.slice(0, 10))}</TableCell>
                          <TableCell>
                            <span className="inline-flex rounded-full bg-[var(--color-warning)]/15 px-2 py-1 text-[11px] font-semibold text-[var(--color-warning)]">
                              Entregado sin despacho
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {estadoActual.entregadosSinDespacho >
                  estadoActual.paquetesEntregadosSinDespacho.length && (
                  <p className="border-t border-[var(--color-border)] px-4 py-2 text-[11px] text-[var(--color-muted-foreground)]">
                    Se muestran las 100 inconsistencias más antiguas.
                  </p>
                )}
              </SurfaceCard>
            )}

            {estadoActual.excepcionesOperativas > 0 && (
              <SurfaceCard className="overflow-hidden border-[var(--color-destructive)]/35">
                <div className="border-b border-[var(--color-border)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-[var(--color-destructive)]" />
                        <h3 className="text-[14px] font-semibold text-[var(--color-foreground)]">
                          Excepciones operativas y de integridad
                        </h3>
                      </div>
                      <p className="mt-1 text-[12px] text-[var(--color-muted-foreground)]">
                        Casos que contradicen las reglas normales del flujo y requieren revisión.
                      </p>
                    </div>
                    <span className="rounded-full bg-[var(--color-destructive)]/10 px-2.5 py-1 text-[12px] font-medium text-[var(--color-destructive)]">
                      {estadoActual.excepcionesOperativas} excepciones
                    </span>
                  </div>
                </div>
                <div className="table-responsive">
                  <Table className="min-w-[920px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Severidad</TableHead>
                        <TableHead>Módulo</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead>Excepción</TableHead>
                        <TableHead>Detalle</TableHead>
                        <TableHead>Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {estadoActual.excepciones.map((item, index) => (
                        <TableRow key={`${item.codigo}-${item.entidadId}-${index}`}>
                          <TableCell>
                            <span
                              className={
                                item.severidad === 'ALTA'
                                  ? 'inline-flex rounded-full bg-[var(--color-destructive)]/10 px-2 py-1 text-[11px] font-semibold text-[var(--color-destructive)]'
                                  : 'inline-flex rounded-full bg-[var(--color-warning)]/15 px-2 py-1 text-[11px] font-semibold text-[var(--color-warning)]'
                              }
                            >
                              {item.severidad}
                            </span>
                          </TableCell>
                          <TableCell>{item.modulo}</TableCell>
                          <TableCell className="font-mono text-[12px]">{item.referencia}</TableCell>
                          <TableCell className="font-medium">{item.titulo}</TableCell>
                          <TableCell className="max-w-sm text-[12px] text-[var(--color-muted-foreground)]">
                            {item.detalle}
                          </TableCell>
                          <TableCell>
                            <a
                              href={item.ruta}
                              className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                            >
                              Revisar
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {estadoActual.excepcionesOperativas > estadoActual.excepciones.length && (
                  <p className="border-t border-[var(--color-border)] px-4 py-2 text-[11px] text-[var(--color-muted-foreground)]">
                    Se muestran las primeras 200 excepciones priorizadas por severidad.
                  </p>
                )}
              </SurfaceCard>
            )}

            <PageCard
              padding="none"
              title="Paquetes demorados sin despacho"
              description={`Paquetes que superan ${data.diasMaxSinDespachar} días laborables desde su registro y todavía no tienen despacho.`}
              actions={
                <span className="rounded-full bg-[var(--color-destructive)]/10 px-2.5 py-1 text-[12px] font-medium text-[var(--color-destructive)]">
                  {estadoActual.demoradosSinDespachar} casos
                </span>
              }
              className="overflow-hidden"
            >
              <div className="table-responsive">
                <Table className="min-w-[820px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guía / referencia</TableHead>
                      <TableHead>Guía master</TableHead>
                      <TableHead>Consignatario</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Registrado</TableHead>
                      <TableHead className="text-right">Días laborables</TableHead>
                      <TableHead className="text-right">Atraso laborable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isFetching && !data ? (
                      <TableRowsSkeleton columns={7} />
                    ) : estadoActual.paquetesDemorados.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-10 text-center text-[var(--color-muted-foreground)]"
                        >
                          No hay paquetes que superen el tiempo estimado sin despacho.
                        </TableCell>
                      </TableRow>
                    ) : (
                      estadoActual.paquetesDemorados.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Link
                              to="/tracking"
                              search={{ codigo: item.numeroGuia } as never}
                              className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                              title="Ver rastreo del paquete"
                            >
                              <PackageSearch className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              {item.numeroGuia}
                            </Link>
                            <p className="text-[11px] text-[var(--color-muted-foreground)]">
                              {item.referencia}
                            </p>
                          </TableCell>
                          <TableCell>
                            {item.guiaMasterId != null ? (
                              <Link
                                to="/guias-master/$id"
                                params={{ id: String(item.guiaMasterId) }}
                                className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                                title="Abrir guía master"
                              >
                                {item.guiaMaster ?? `#${item.guiaMasterId}`}
                              </Link>
                            ) : (
                              <span className="text-[var(--color-muted-foreground)]">
                                {item.guiaMaster ?? '—'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{item.consignatario ?? '—'}</TableCell>
                          <TableCell>{item.estado ?? '—'}</TableCell>
                          <TableCell>{formatDate(item.registradoEn.slice(0, 10))}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {item.diasSinDespachar}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums text-[var(--color-destructive)]">
                            +{item.diasAtraso}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {estadoActual.demoradosSinDespachar > estadoActual.paquetesDemorados.length && (
                <p className="border-t border-[var(--color-border)] px-4 py-2 text-[11px] text-[var(--color-muted-foreground)]">
                  Se muestran los 100 casos más antiguos.
                </p>
              )}
            </PageCard>
          </section>
        </>
      ) : null}
    </div>
  );
}
