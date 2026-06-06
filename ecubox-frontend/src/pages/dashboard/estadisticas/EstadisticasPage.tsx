import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  Boxes,
  CalendarRange,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useEstadisticas } from '@/hooks/useEstadisticas';
import { MonthlyChart, StatusDistributionChart } from './EstadisticasCharts';

const PERIODS = [6, 12, 24] as const;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat('es-EC', {
    maximumFractionDigits: digits,
  }).format(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Promedio de la serie sobre `total`. */
function promedioSerie(series: { total: number }[]): number {
  if (!series.length) return 0;
  return series.reduce((sum, item) => sum + item.total, 0) / series.length;
}

/** Proyección simple del próximo mes: media de los últimos 3 meses. */
function proyeccionProximoMes(series: { total: number }[]): number {
  if (!series.length) return 0;
  const ultimos = series.slice(-3);
  return Math.round(ultimos.reduce((sum, item) => sum + item.total, 0) / ultimos.length);
}

/** Variación % del último mes respecto al anterior. */
function tendenciaPct(series: { total: number }[]): number | null {
  if (series.length < 2) return null;
  const ultimo = series[series.length - 1].total;
  const previo = series[series.length - 2].total;
  if (previo === 0) return ultimo > 0 ? 100 : 0;
  return Math.round(((ultimo - previo) / previo) * 100);
}

function MetricTile({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: number | null;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-[22px] font-semibold tabular-nums text-[var(--color-foreground)]">
          {value}
        </span>
        {trend != null && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
              trend >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-destructive)]'
            }`}
          >
            {trend >= 0 ? (
              <TrendingUp className="h-3 w-3" aria-hidden />
            ) : (
              <TrendingDown className="h-3 w-3" aria-hidden />
            )}
            {trend >= 0 ? '+' : ''}
            {trend}%
          </span>
        )}
      </div>
      {hint ? (
        <p className="mt-0.5 text-[11px] text-[var(--color-muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function EstadisticasPage() {
  const [meses, setMeses] = useState(12);
  const [exportando, setExportando] = useState(false);
  const { data, isLoading, isFetching, isError, refetch } = useEstadisticas(meses);

  const mejorMes = useMemo(() => {
    if (!data?.despachosPorMes.length) return null;
    return data.despachosPorMes.reduce((best, item) =>
      item.total > best.total ? item : best,
    );
  }, [data]);

  const proyeccion = useMemo(() => {
    if (!data) return null;
    const tasaDespacho =
      data.resumen.paquetesRegistrados > 0
        ? (data.resumen.paquetesDespachados / data.resumen.paquetesRegistrados) * 100
        : 0;
    return {
      promedioDespachos: promedioSerie(data.despachosPorMes),
      promedioRegistros: promedioSerie(data.paquetesRegistradosPorMes),
      proyDespachos: proyeccionProximoMes(data.despachosPorMes),
      proyRegistros: proyeccionProximoMes(data.paquetesRegistradosPorMes),
      tendenciaDespachos: tendenciaPct(data.despachosPorMes),
      tasaDespacho,
    };
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
            filename: `estadisticas-${meses}m-${new Date().toISOString().slice(0, 10)}.pdf`,
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

  return (
    <div className="page-stack">
      <header className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ChartNoAxesCombined className="h-5 w-5 text-[var(--color-primary)]" />
            <h1 className="text-[18px] font-semibold text-[var(--color-foreground)]">
              Estadísticas operativas
            </h1>
          </div>
          <p className="mt-1 text-[13px] text-[var(--color-muted-foreground)]">
            Tendencias y alertas para apoyar decisiones de operación.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <label className="flex items-center gap-2 text-[13px] text-[var(--color-muted-foreground)]">
            <CalendarRange className="h-4 w-4" />
            Período
            <select
              value={meses}
              onChange={(event) => setMeses(Number(event.target.value))}
              className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-[var(--color-foreground)]"
            >
              {PERIODS.map((period) => (
                <option key={period} value={period}>
                  Últimos {period} meses
                </option>
              ))}
            </select>
          </label>
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
        </div>
      </header>

      {isError && (
        <InlineErrorBanner
          message="No se pudieron cargar las estadísticas"
          hint="Los datos anteriores se conservarán mientras se reintenta."
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      )}

      {isLoading && !data ? (
        <>
          <KpiCardsGridSkeleton count={11} />
          <SurfaceCardSkeleton />
          <div className="grid gap-4 xl:grid-cols-3">
            <SurfaceCardSkeleton className="xl:col-span-2" />
            <SurfaceCardSkeleton />
          </div>
        </>
      ) : data ? (
        <>
          <KpiCardsGrid>
            <KpiCard
              icon={<Truck />}
              label="Despachos del período"
              value={formatNumber(data.resumen.totalDespachos)}
              hint={mejorMes ? `Mayor actividad: ${mejorMes.etiqueta}` : 'Sin actividad'}
              tone="primary"
            />
            <KpiCard
              icon={<PackageCheck />}
              label="Paquetes despachados"
              value={formatNumber(data.resumen.paquetesDespachados)}
              hint="Incluidos en los despachos del período"
              tone="success"
            />
            <KpiCard
              icon={<Boxes />}
              label="Paquetes registrados"
              value={formatNumber(data.resumen.paquetesRegistrados)}
              hint={`Desde ${formatDate(data.periodoDesde)}`}
              tone="info"
            />
            <KpiCard
              icon={<Clock3 />}
              label="Pendientes de despacho"
              value={formatNumber(data.resumen.pendientesDespacho)}
              hint="Sin despacho asignado actualmente"
              tone="warning"
            />
            <KpiCard
              icon={<AlertTriangle />}
              label="Demorados"
              value={formatNumber(data.resumen.demoradosSinDespachar)}
              hint={`Superan ${data.diasMaxSinDespachar} días sin despacho`}
              tone={data.resumen.demoradosSinDespachar > 0 ? 'danger' : 'neutral'}
            />
            <KpiCard
              icon={<CircleAlert />}
              label="Entregados sin despacho"
              value={formatNumber(data.resumen.entregadosSinDespacho)}
              hint="Estado final sin despacho registrado"
              tone={data.resumen.entregadosSinDespacho > 0 ? 'warning' : 'neutral'}
            />
            <KpiCard
              icon={<ShieldAlert />}
              label="Otras excepciones"
              value={formatNumber(data.resumen.excepcionesOperativas)}
              hint="Inconsistencias operativas o de integridad"
              tone={data.resumen.excepcionesOperativas > 0 ? 'danger' : 'neutral'}
            />
            <KpiCard
              icon={<Scale />}
              label="Peso despachado"
              value={`${formatNumber(data.resumen.pesoDespachadoLbs, 1)} lb`}
              hint="Peso registrado de paquetes despachados"
              tone="neutral"
            />
            <KpiCard
              icon={<Timer />}
              label="Tiempo promedio de despacho"
              value={
                data.resumen.tiempoPromedioDespachoDias != null
                  ? `${formatNumber(data.resumen.tiempoPromedioDespachoDias, 1)} días`
                  : '—'
              }
              hint="Desde el registro hasta el despacho"
              tone="info"
            />
            <KpiCard
              icon={<CalendarRange />}
              label="Tiempo estimado de entrega"
              value="7 a 12 días"
              hint="Días laborables desde el despacho"
              tone="info"
            />
            <KpiCard
              icon={<TrendingUp />}
              label="Margen bruto estimado"
              value={formatMoney(data.resumen.margenBruto)}
              hint="Peso registrado × margen histórico por libra"
              tone="primary"
              to="/liquidaciones"
            />
            <KpiCard
              icon={<TrendingDown />}
              label="Costo de distribución"
              value={formatMoney(data.resumen.costoDistribucion)}
              hint="Estimado con costos por libra de liquidaciones"
              tone="warning"
              to="/liquidaciones"
            />
            <KpiCard
              icon={<DollarSign />}
              label="Ingreso neto aproximado"
              value={formatMoney(data.resumen.ingresoNetoAproximado)}
              hint="Margen estimado menos distribución estimada"
              tone="success"
              to="/liquidaciones"
            />
          </KpiCardsGrid>

          {data.resumen.entregadosSinDespacho > 0 && (
            <div className="ui-alert ui-alert-warning">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              <div>
                <p className="text-[13px] font-medium text-[var(--color-foreground)]">
                  Hay {data.resumen.entregadosSinDespacho} paquete(s) entregado(s) sin despacho registrado
                </p>
                <p className="text-[12px] text-[var(--color-muted-foreground)]">
                  No se consideran demorados, pero conviene revisar y corregir su trazabilidad histórica.
                </p>
              </div>
            </div>
          )}

          {proyeccion && (
            <SurfaceCard className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[var(--color-primary)]" aria-hidden />
                <h2 className="text-[14px] font-semibold text-[var(--color-foreground)]">
                  Proyección y ritmo
                </h2>
              </div>
              <p className="mb-4 mt-1 text-[12px] text-[var(--color-muted-foreground)]">
                Estimación del próximo mes según el promedio de los últimos 3 meses. Úsala como
                referencia, no como pronóstico exacto.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricTile
                  label="Próx. mes · Despachos"
                  value={formatNumber(proyeccion.proyDespachos)}
                  trend={proyeccion.tendenciaDespachos}
                  hint="Estimado"
                />
                <MetricTile
                  label="Próx. mes · Registrados"
                  value={formatNumber(proyeccion.proyRegistros)}
                  hint="Paquetes esperados"
                />
                <MetricTile
                  label="Promedio mensual"
                  value={formatNumber(proyeccion.promedioDespachos, 1)}
                  hint="Despachos por mes en el período"
                />
                <MetricTile
                  label="Tasa de despacho"
                  value={`${formatNumber(proyeccion.tasaDespacho, 0)}%`}
                  hint="Despachados / registrados"
                />
              </div>
            </SurfaceCard>
          )}

          <div className="grid gap-4 xl:grid-cols-3">
            <SurfaceCard className="p-4 xl:col-span-2">
              <h2 className="text-[14px] font-semibold text-[var(--color-foreground)]">
                Evolución mensual
              </h2>
              <p className="mb-4 mt-1 text-[12px] text-[var(--color-muted-foreground)]">
                Compara despachos realizados con nuevos paquetes registrados.
              </p>
              <MonthlyChart
                despachos={data.despachosPorMes}
                registros={data.paquetesRegistradosPorMes}
              />
            </SurfaceCard>

            <SurfaceCard className="p-4">
              <h2 className="text-[14px] font-semibold text-[var(--color-foreground)]">
                Inventario por estado
              </h2>
              <p className="mb-4 mt-1 text-[12px] text-[var(--color-muted-foreground)]">
                Situación actual de todos los paquetes.
              </p>
              <StatusDistributionChart data={data.paquetesPorEstado} />
            </SurfaceCard>
          </div>

          {data.resumen.entregadosSinDespacho > 0 && (
            <SurfaceCard className="overflow-hidden border-[var(--color-warning)]/40">
              <div className="border-b border-[var(--color-border)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-[14px] font-semibold text-[var(--color-foreground)]">
                      Entregados sin despacho registrado
                    </h2>
                    <p className="mt-1 text-[12px] text-[var(--color-muted-foreground)]">
                      Alcanzaron el estado final del flujo, pero no conservan una relación con un despacho.
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--color-warning)]/15 px-2.5 py-1 text-[12px] font-medium text-[var(--color-warning)]">
                    {data.resumen.entregadosSinDespacho} inconsistencias
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
                    {data.paquetesEntregadosSinDespacho.map((item) => (
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
                            item.guiaMaster ?? '—'
                          )}
                        </TableCell>
                        <TableCell>{item.consignatario ?? '—'}</TableCell>
                        <TableCell>{item.estado ?? '—'}</TableCell>
                        <TableCell>{formatDate(item.registradoEn)}</TableCell>
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
              {data.resumen.entregadosSinDespacho >
                data.paquetesEntregadosSinDespacho.length && (
                <p className="border-t border-[var(--color-border)] px-4 py-2 text-[11px] text-[var(--color-muted-foreground)]">
                  Se muestran las 100 inconsistencias más antiguas.
                </p>
              )}
            </SurfaceCard>
          )}

          {data.resumen.excepcionesOperativas > 0 && (
            <SurfaceCard className="overflow-hidden border-[var(--color-destructive)]/35">
              <div className="border-b border-[var(--color-border)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-[var(--color-destructive)]" />
                      <h2 className="text-[14px] font-semibold text-[var(--color-foreground)]">
                        Excepciones operativas y de integridad
                      </h2>
                    </div>
                    <p className="mt-1 text-[12px] text-[var(--color-muted-foreground)]">
                      Casos que contradicen las reglas normales del flujo y requieren revisión.
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--color-destructive)]/10 px-2.5 py-1 text-[12px] font-medium text-[var(--color-destructive)]">
                    {data.resumen.excepcionesOperativas} excepciones
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
                    {data.excepcionesOperativas.map((item, index) => (
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
                        <TableCell className="font-mono text-[12px]">
                          {item.referencia}
                        </TableCell>
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
              {data.resumen.excepcionesOperativas > data.excepcionesOperativas.length && (
                <p className="border-t border-[var(--color-border)] px-4 py-2 text-[11px] text-[var(--color-muted-foreground)]">
                  Se muestran las primeras 200 excepciones priorizadas por severidad.
                </p>
              )}
            </SurfaceCard>
          )}

          <SurfaceCard className="overflow-hidden">
            <div className="border-b border-[var(--color-border)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-[14px] font-semibold text-[var(--color-foreground)]">
                    Paquetes demorados sin despacho
                  </h2>
                  <p className="mt-1 text-[12px] text-[var(--color-muted-foreground)]">
                    Registrados hace más de {data.diasMaxSinDespachar} días y todavía sin despacho asignado.
                  </p>
                </div>
                <span className="rounded-full bg-[var(--color-destructive)]/10 px-2.5 py-1 text-[12px] font-medium text-[var(--color-destructive)]">
                  {data.resumen.demoradosSinDespachar} casos
                </span>
              </div>
            </div>
            <div className="table-responsive">
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Guía / referencia</TableHead>
                  <TableHead>Guía master</TableHead>
                  <TableHead>Consignatario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Registrado</TableHead>
                  <TableHead className="text-right">Días</TableHead>
                  <TableHead className="text-right">Atraso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFetching && !data ? (
                  <TableRowsSkeleton columns={7} />
                ) : data.paquetesDemorados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-[var(--color-muted-foreground)]">
                      No hay paquetes que superen el tiempo estimado sin despacho.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.paquetesDemorados.map((item) => (
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
                        <p className="text-[11px] text-[var(--color-muted-foreground)]">{item.referencia}</p>
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
                          <span className="text-[var(--color-muted-foreground)]">{item.guiaMaster ?? '—'}</span>
                        )}
                      </TableCell>
                      <TableCell>{item.consignatario ?? '—'}</TableCell>
                      <TableCell>{item.estado ?? '—'}</TableCell>
                      <TableCell>{formatDate(item.registradoEn)}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.diasSinDespachar}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-[var(--color-destructive)]">
                        +{item.diasAtraso}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
            {data.resumen.demoradosSinDespachar > data.paquetesDemorados.length && (
              <p className="border-t border-[var(--color-border)] px-4 py-2 text-[11px] text-[var(--color-muted-foreground)]">
                Se muestran los 100 casos más antiguos.
              </p>
            )}
          </SurfaceCard>
        </>
      ) : null}
    </div>
  );
}
