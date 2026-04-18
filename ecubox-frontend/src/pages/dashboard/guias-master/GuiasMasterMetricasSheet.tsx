import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  Clock,
  Flame,
  Loader2,
  Settings2,
  ShieldAlert,
  Sparkles,
  Timer,
  XCircle,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDashboardGuiasMaster } from '@/hooks/useGuiasMaster';
import type { EstadoGuiaMaster, GuiaMaster } from '@/types/guia-master';
import {
  GUIA_MASTER_ESTADO_COLORS,
  GUIA_MASTER_ESTADO_LABELS_PLURAL,
  GuiaMasterEstadoBadge,
} from './_estado';

interface GuiasMasterMetricasSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ESTADO_ORDER: EstadoGuiaMaster[] = [
  'INCOMPLETA',
  'PARCIAL_RECIBIDA',
  'COMPLETA_RECIBIDA',
  'PARCIAL_DESPACHADA',
  'CERRADA',
  'CERRADA_CON_FALTANTE',
];

export function GuiasMasterMetricasSheet({
  open,
  onOpenChange,
}: GuiasMasterMetricasSheetProps) {
  const navigate = useNavigate();
  const { data, isLoading, error } = useDashboardGuiasMaster();

  const conteos = data?.conteosPorEstado ?? ({} as Record<EstadoGuiaMaster, number>);
  const topAntiguas = data?.topAntiguasSinCompletar ?? [];

  const totalGuias = useMemo(
    () => Object.values(conteos).reduce((a, b) => a + (b ?? 0), 0),
    [conteos]
  );

  const estadosOrdenados = useMemo(() => {
    const presentes = new Set(Object.keys(conteos) as EstadoGuiaMaster[]);
    const ordenados = ESTADO_ORDER.filter((e) => presentes.has(e));
    for (const e of presentes) {
      if (!ordenados.includes(e)) ordenados.push(e);
    }
    return ordenados;
  }, [conteos]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto bg-[var(--color-background)] sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-border bg-[var(--color-muted)]/30 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-lg">Métricas de guías master</SheetTitle>
              <p className="text-xs text-muted-foreground">
                Resumen operativo y estado de las guías en el sistema.
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 p-4">
          {isLoading ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-[var(--color-muted)]/30 p-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando métricas...
            </div>
          ) : error || !data ? (
            <div className="flex items-start gap-2 rounded-md border border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/10 p-3 text-sm text-[var(--color-destructive)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Error al cargar las métricas. Intenta nuevamente.</span>
            </div>
          ) : (
            <>
              <section className="space-y-2">
                <SectionTitle icon={<Sparkles className="h-3.5 w-3.5" />}>
                  Resumen
                </SectionTitle>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <KpiCard
                    icon={<Boxes className="h-4 w-4" />}
                    label="Total"
                    value={totalGuias}
                    accent="primary"
                  />
                  <KpiCard
                    icon={<Flame className="h-4 w-4" />}
                    label="Activas"
                    value={data.totalActivas ?? 0}
                    accent="blue"
                  />
                  <KpiCard
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    label="Cerradas"
                    value={data.totalCerradas ?? 0}
                    accent="emerald"
                  />
                  <KpiCard
                    icon={<XCircle className="h-4 w-4" />}
                    label="C/ faltante"
                    value={data.totalCerradasConFaltante ?? 0}
                    accent="red"
                  />
                </div>
              </section>

              <section className="space-y-2">
                <SectionTitle icon={<BarChart3 className="h-3.5 w-3.5" />}>
                  Distribución por estado
                </SectionTitle>
                <div className="space-y-1.5 rounded-md border border-border bg-[var(--color-card)] p-3">
                  {estadosOrdenados.length === 0 ? (
                    <p className="py-2 text-center text-xs text-muted-foreground">
                      Sin datos disponibles
                    </p>
                  ) : (
                    estadosOrdenados.map((est) => (
                      <EstadoRow
                        key={est}
                        estado={est}
                        count={conteos[est] ?? 0}
                        total={totalGuias}
                      />
                    ))
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <SectionTitle icon={<Settings2 className="h-3.5 w-3.5" />}>
                  Parámetros activos
                </SectionTitle>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <ParametroCard
                    icon={<Boxes className="h-4 w-4" />}
                    label="Mín. piezas para despacho parcial"
                    value={String(data.minPiezasParaDespachoParcial)}
                  />
                  <ParametroCard
                    icon={<Timer className="h-4 w-4" />}
                    label="Auto-cierre"
                    value={`${data.diasParaAutoCierre} días`}
                  />
                  <ParametroCard
                    icon={<ShieldAlert className="h-4 w-4" />}
                    label="Despacho parcial"
                    value={
                      data.requiereConfirmacionDespachoParcial
                        ? 'Confirma operario'
                        : 'Automático'
                    }
                  />
                </div>
              </section>

              <section className="space-y-2">
                <SectionTitle icon={<Clock className="h-3.5 w-3.5" />}>
                  Más antiguas sin cerrar
                </SectionTitle>
                {topAntiguas.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-[var(--color-muted)]/30 p-4 text-center text-xs text-muted-foreground">
                    No hay guías activas pendientes.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-md border border-border bg-[var(--color-card)]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Guía</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="w-[8rem] text-right">
                            Antigüedad
                          </TableHead>
                          <TableHead className="w-[2rem]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topAntiguas.map((g) => (
                          <AntiguaRow
                            key={g.id}
                            guia={g}
                            diasAutoCierre={data.diasParaAutoCierre}
                            onNavigate={(id) => {
                              onOpenChange(false);
                              navigate({
                                to: '/guias-master/$id',
                                params: { id: String(id) },
                              });
                            }}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionTitle({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      <span>{children}</span>
    </h3>
  );
}

const ACCENT_STYLES = {
  primary:
    'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 text-[var(--color-primary)]',
  blue: 'border-blue-300/40 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300',
  emerald:
    'border-emerald-300/40 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300',
  red: 'border-red-300/40 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300',
  amber:
    'border-amber-300/40 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300',
} as const;

type Accent = keyof typeof ACCENT_STYLES;

function KpiCard({
  icon,
  label,
  value,
  accent = 'primary',
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: Accent;
}) {
  return (
    <div className="rounded-md border border-border bg-[var(--color-card)] p-3 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-md border ${ACCENT_STYLES[accent]}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-1 text-2xl font-semibold leading-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

function ParametroCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-[var(--color-card)] p-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-muted)] text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function EstadoRow({
  estado,
  count,
  total,
}: {
  estado: EstadoGuiaMaster;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 font-medium ${
            GUIA_MASTER_ESTADO_COLORS[estado] ?? ''
          }`}
        >
          {GUIA_MASTER_ESTADO_LABELS_PLURAL[estado] ?? estado}
        </span>
        <span className="font-mono tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{count}</span>
          <span className="ml-1 text-[11px]">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-muted)]">
        <div
          className={`h-full rounded-full ${barClassFor(estado)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function barClassFor(estado: EstadoGuiaMaster): string {
  switch (estado) {
    case 'INCOMPLETA':
      return 'bg-muted-foreground/40';
    case 'PARCIAL_RECIBIDA':
      return 'bg-amber-400 dark:bg-amber-500';
    case 'COMPLETA_RECIBIDA':
      return 'bg-blue-400 dark:bg-blue-500';
    case 'PARCIAL_DESPACHADA':
      return 'bg-indigo-400 dark:bg-indigo-500';
    case 'CERRADA':
      return 'bg-emerald-500';
    case 'CERRADA_CON_FALTANTE':
      return 'bg-red-500';
    default:
      return 'bg-muted-foreground/40';
  }
}

function AntiguaRow({
  guia: g,
  diasAutoCierre,
  onNavigate,
}: {
  guia: GuiaMaster;
  diasAutoCierre: number;
  onNavigate: (id: number) => void;
}) {
  const dias = g.fechaPrimeraRecepcion
    ? Math.floor(
        (Date.now() - new Date(g.fechaPrimeraRecepcion).getTime()) / 86_400_000
      )
    : null;
  const enRiesgo = dias != null && dias >= diasAutoCierre - 1;
  const cerca = dias != null && dias >= Math.floor(diasAutoCierre * 0.7) && !enRiesgo;
  const pct =
    dias != null && diasAutoCierre > 0
      ? Math.min(100, Math.round((dias / diasAutoCierre) * 100))
      : 0;

  return (
    <TableRow
      className="cursor-pointer transition-colors hover:bg-[var(--color-muted)]/40"
      onClick={() => onNavigate(g.id)}
    >
      <TableCell className="align-top">
        <div className="space-y-0.5">
          <p
            className="break-all font-mono text-xs font-medium text-foreground"
            title={g.trackingBase}
          >
            {g.trackingBase}
          </p>
          {g.destinatarioNombre && (
            <p
              className="truncate text-[11px] text-muted-foreground"
              title={g.destinatarioNombre}
            >
              {g.destinatarioNombre}
            </p>
          )}
        </div>
      </TableCell>
      <TableCell className="align-top">
        <GuiaMasterEstadoBadge estado={g.estadoGlobal} />
      </TableCell>
      <TableCell className="align-top text-right">
        {dias != null ? (
          <div className="flex flex-col items-end gap-1">
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold ${
                enRiesgo
                  ? 'text-red-700 dark:text-red-300'
                  : cerca
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-foreground'
              }`}
            >
              {enRiesgo && <AlertTriangle className="h-3.5 w-3.5" />}
              {dias} d
            </span>
            <div className="h-1 w-16 overflow-hidden rounded-full bg-[var(--color-muted)]">
              <div
                className={`h-full rounded-full ${
                  enRiesgo
                    ? 'bg-red-500'
                    : cerca
                      ? 'bg-amber-400 dark:bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="align-top text-muted-foreground">
        <ArrowRight className="h-4 w-4" />
      </TableCell>
    </TableRow>
  );
}
