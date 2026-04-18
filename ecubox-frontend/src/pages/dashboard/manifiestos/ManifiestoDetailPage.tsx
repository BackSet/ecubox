import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowLeft,
  Building2,
  Calculator,
  CalendarRange,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  DollarSign,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter as FilterIcon,
  Home,
  Info,
  Loader2,
  Pencil,
  PlusCircle,
  Printer,
  RefreshCw,
  Search,
  Square,
  Trash2,
  Truck,
  Users,
  Warehouse,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useManifiesto,
  useRecalcularTotales,
  useAsignarDespachos,
  useCambiarEstadoManifiesto,
  useDeleteManifiesto,
  useDespachosCandidatosManifiesto,
} from '@/hooks/useManifiestos';
import { useAgencias } from '@/hooks/useAgencias';
import { useDistribuidoresAdmin } from '@/hooks/useDistribuidoresAdmin';
import { LoadingState } from '@/components/LoadingState';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { KpiCard } from '@/components/KpiCard';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { buildManifiestoPdf } from '@/lib/pdf/builders/manifiestoPdf';
import { runJsPdfAction } from '@/lib/pdf/actions';
import { downloadManifiestoXlsx } from '@/lib/xlsx/manifiestoXlsx';
import { ManifiestoForm } from './ManifiestoForm';
import type {
  DespachoEnManifiesto,
  EstadoManifiesto,
  FiltroManifiesto,
} from '@/types/manifiesto';

const ESTADO_LABELS: Record<EstadoManifiesto, string> = {
  PENDIENTE: 'Pendiente',
  PAGADO: 'Pagado',
  ANULADO: 'Anulado',
};

const ESTADO_BADGE: Record<EstadoManifiesto, string> = {
  PENDIENTE:
    'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  PAGADO:
    'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  ANULADO:
    'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
};

const ESTADO_ICON: Record<
  EstadoManifiesto,
  React.ComponentType<{ className?: string }>
> = {
  PENDIENTE: Clock,
  PAGADO: CheckCircle2,
  ANULADO: XCircle,
};

const FILTRO_LABELS: Record<FiltroManifiesto, string> = {
  POR_PERIODO: 'Por período',
  POR_DISTRIBUIDOR: 'Por distribuidor',
  POR_AGENCIA: 'Por agencia',
};

const TIPO_LABELS: Record<string, string> = {
  DOMICILIO: 'Domicilio',
  AGENCIA: 'Agencia',
  AGENCIA_DISTRIBUIDOR: 'Agencia distribuidor',
};

const TIPO_BADGE: Record<string, string> = {
  DOMICILIO:
    'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
  AGENCIA:
    'border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-200',
  AGENCIA_DISTRIBUIDOR:
    'border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-200',
};

const SIN_FILTRO = '__all__';

function fmtMoneda(value?: number | null): string {
  if (value == null) return '$0.00';
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0.00';
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtFechaCorta(s?: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function diasEntre(inicio?: string | null, fin?: string | null): number | null {
  if (!inicio || !fin) return null;
  const a = new Date(inicio);
  const b = new Date(fin);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const ms = b.getTime() - a.getTime();
  if (ms < 0) return null;
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

export function ManifiestoDetailPage() {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const id = params.id != null ? Number(params.id) : NaN;
  const idValido = !Number.isNaN(id);

  const { data: manifiesto, isLoading, error } = useManifiesto(idValido ? id : null);
  const { data: agencias = [] } = useAgencias();
  const { data: distribuidores = [] } = useDistribuidoresAdmin();

  const recalcular = useRecalcularTotales();
  const cambiarEstado = useCambiarEstadoManifiesto();
  const deleteMutation = useDeleteManifiesto();

  const [editOpen, setEditOpen] = useState(false);
  const [asignarOpen, setAsignarOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmAnular, setConfirmAnular] = useState(false);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>(SIN_FILTRO);
  const [pdfAgenciaId, setPdfAgenciaId] = useState<number>(0);
  const [pdfDistribuidorId, setPdfDistribuidorId] = useState<number>(0);
  const [exporting, setExporting] = useState<'pdf' | 'print' | 'xlsx' | null>(null);
  const [exportFiltersOpen, setExportFiltersOpen] = useState(false);

  if (!idValido) return <ErrorScreen mensaje="ID de manifiesto no válido" />;
  if (isLoading) return <LoadingState text="Cargando manifiesto..." />;
  if (error || !manifiesto) return <ErrorScreen mensaje="No se pudo cargar el manifiesto" />;

  const m = manifiesto;
  const despachos = m.despachos ?? [];
  const dias = diasEntre(m.fechaInicio, m.fechaFin);
  const estadoLabel = ESTADO_LABELS[m.estado] ?? m.estado;
  const EstadoIcon = ESTADO_ICON[m.estado] ?? Clock;

  const stats = (() => {
    let domicilio = 0;
    let agencia = 0;
    let agenciaDist = 0;
    const distribuidoresSet = new Set<string>();
    for (const d of despachos) {
      if (d.tipoEntrega === 'DOMICILIO') domicilio += 1;
      else if (d.tipoEntrega === 'AGENCIA') agencia += 1;
      else if (d.tipoEntrega === 'AGENCIA_DISTRIBUIDOR') agenciaDist += 1;
      if (d.distribuidorNombre) distribuidoresSet.add(d.distribuidorNombre);
    }
    return {
      domicilio,
      agencia,
      agenciaDist,
      distribuidores: distribuidoresSet.size,
    };
  })();

  const tiposPresentes = (() => {
    const set = new Set<string>();
    for (const d of despachos) if (d.tipoEntrega) set.add(d.tipoEntrega);
    return Array.from(set);
  })();

  const distribuidorSeleccionado = distribuidores.find((d) => d.id === pdfDistribuidorId);
  const agenciaSeleccionada = agencias.find((a) => a.id === pdfAgenciaId);

  const filtrarDespachos = (lista: DespachoEnManifiesto[]) => {
    let raw = lista;
    if (distribuidorSeleccionado) {
      raw = raw.filter((d) => d.distribuidorNombre === distribuidorSeleccionado.nombre);
    }
    if (agenciaSeleccionada) {
      raw = raw.filter((d) => d.agenciaNombre === agenciaSeleccionada.nombre);
    }
    return raw;
  };

  const despachosFiltradosExport = filtrarDespachos(despachos);

  const despachosVisibles = (() => {
    let raw = despachos;
    if (tipoFilter !== SIN_FILTRO) {
      raw = raw.filter((d) => d.tipoEntrega === tipoFilter);
    }
    const q = search.trim().toLowerCase();
    if (!q) return raw;
    return raw.filter(
      (d) =>
        d.numeroGuia?.toLowerCase().includes(q) ||
        d.distribuidorNombre?.toLowerCase().includes(q) ||
        d.agenciaNombre?.toLowerCase().includes(q) ||
        d.destinatarioNombre?.toLowerCase().includes(q),
    );
  })();

  function handleRecalcular() {
    recalcular.mutate(m.id, {
      onSuccess: () => toast.success('Totales recalculados'),
      onError: (err: unknown) =>
        toast.error(getApiErrorMessage(err) ?? 'Error al recalcular'),
    });
  }

  function handleCambiarEstado(estado: EstadoManifiesto) {
    if (estado === m.estado) return;
    if (estado === 'ANULADO') {
      setConfirmAnular(true);
      return;
    }
    cambiarEstado.mutate(
      { id: m.id, estado },
      {
        onSuccess: () => toast.success(`Estado cambiado a ${ESTADO_LABELS[estado]}`),
        onError: (err: unknown) =>
          toast.error(getApiErrorMessage(err) ?? 'Error al cambiar estado'),
      },
    );
  }

  function handlePdfManifiesto(mode: 'download' | 'print') {
    if (exporting) return;
    setExporting(mode === 'download' ? 'pdf' : 'print');
    try {
      const doc = buildManifiestoPdf({
        manifiesto: m,
        despachos: despachosFiltradosExport,
        filtroAgenciaNombre: agenciaSeleccionada?.nombre,
        filtroDistribuidorNombre: distribuidorSeleccionado?.nombre,
      });
      runJsPdfAction(doc, {
        mode,
        filename: `manifiesto-${m.codigo ?? m.id}.pdf`,
        printMode: 'popup',
      });
      if (mode === 'download') toast.success('PDF generado');
    } catch {
      toast.error('No se pudo generar el PDF');
    } finally {
      setExporting(null);
    }
  }

  async function handleExcel() {
    if (exporting) return;
    setExporting('xlsx');
    try {
      await downloadManifiestoXlsx({
        manifiesto: m,
        despachos: despachosFiltradosExport,
        filtroAgenciaNombre: agenciaSeleccionada?.nombre,
        filtroDistribuidorNombre: distribuidorSeleccionado?.nombre,
      });
      toast.success('Excel generado');
    } catch {
      toast.error('No se pudo generar el Excel');
    } finally {
      setExporting(null);
    }
  }

  const hayFiltrosExport = pdfDistribuidorId !== 0 || pdfAgenciaId !== 0;
  const hayFiltrosTabla = tipoFilter !== SIN_FILTRO || search.trim() !== '';

  return (
    <div className="space-y-4">
      {/* ===== HEADER CARD ===== */}
      <SurfaceCard className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Link to="/manifiestos">
              <Button variant="ghost" size="icon" aria-label="Volver">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
                'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
              )}
            >
              <FileText className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-all font-mono text-2xl font-semibold tracking-tight text-foreground">
                  {m.codigo ?? `#${m.id}`}
                </h1>
                <CopyButton value={m.codigo ?? String(m.id)} title="Copiar código" />
                <Badge
                  variant="outline"
                  className={cn(ESTADO_BADGE[m.estado], 'gap-1 font-normal')}
                >
                  <EstadoIcon className="h-3 w-3" />
                  {estadoLabel}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  ID #{m.id}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarRange className="h-3 w-3" />
                  {fmtFechaCorta(m.fechaInicio)} → {fmtFechaCorta(m.fechaFin)}
                </span>
                {dias != null && (
                  <span>
                    {dias} {dias === 1 ? 'día' : 'días'}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  {despachos.length} despacho{despachos.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-2">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePdfManifiesto('print')}
              disabled={!!exporting}
              className="gap-2"
            >
              {exporting === 'print' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              Imprimir
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePdfManifiesto('download')}
              disabled={!!exporting}
              className="gap-2 text-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              {exporting === 'pdf' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExcel}
              disabled={!!exporting}
              className="gap-2 text-emerald-700 hover:text-emerald-700"
            >
              {exporting === 'xlsx' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalcular}
              disabled={recalcular.isPending}
              className="gap-2"
            >
              {recalcular.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4" />
              )}
              Recalcular
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="gap-2 text-[var(--color-destructive)] hover:text-[var(--color-destructive)]"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </div>
        </div>
      </SurfaceCard>

      {/* ===== KPIS ===== */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<Truck className="h-5 w-5" />}
          label="Despachos"
          value={despachos.length}
          tone="primary"
          hint={
            stats.domicilio + stats.agencia + stats.agenciaDist > 0
              ? `${stats.domicilio} dom · ${stats.agencia + stats.agenciaDist} ag.`
              : undefined
          }
        />
        <KpiCard
          icon={<Building2 className="h-5 w-5" />}
          label="Total distribuidor"
          value={fmtMoneda(m.totalDistribuidor)}
          tone="neutral"
          hint={
            stats.distribuidores > 0
              ? `${stats.distribuidores} distribuidor${stats.distribuidores === 1 ? '' : 'es'}`
              : undefined
          }
        />
        <KpiCard
          icon={<Warehouse className="h-5 w-5" />}
          label="Total agencia"
          value={fmtMoneda(m.totalAgencia)}
          tone="neutral"
          hint={`Flete ${fmtMoneda(m.subtotalAgenciaFlete)}`}
        />
        <KpiCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total a pagar"
          value={fmtMoneda(m.totalPagar)}
          tone={m.estado === 'ANULADO' ? 'neutral' : 'primary'}
          hint={m.estado === 'ANULADO' ? 'Manifiesto anulado' : 'Suma final'}
        />
      </div>

      {/* ===== INFORMACIÓN + RESUMEN FINANCIERO ===== */}
      <div className="grid gap-3 lg:grid-cols-2">
        <InfoCard title="Información del manifiesto" icon={<Info className="h-4 w-4" />}>
          <InfoRow label="Código" value={m.codigo ?? `#${m.id}`} mono valueExtra={<CopyButton value={m.codigo ?? String(m.id)} small />} />
          <InfoRow label="ID interno" value={`#${m.id}`} mono />
          <InfoRow
            label="Periodo"
            value={`${fmtFechaCorta(m.fechaInicio)} → ${fmtFechaCorta(m.fechaFin)}`}
          />
          <InfoRow
            label="Duración"
            value={dias != null ? `${dias} ${dias === 1 ? 'día' : 'días'}` : '—'}
          />
          <InfoRow label="Tipo de filtro" value={FILTRO_LABELS[m.filtroTipo] ?? m.filtroTipo} />
          {m.filtroDistribuidorNombre && (
            <InfoRow label="Distribuidor" value={m.filtroDistribuidorNombre} />
          )}
          {m.filtroAgenciaNombre && <InfoRow label="Agencia" value={m.filtroAgenciaNombre} />}

          {/* Cambio de estado */}
          <div className="pt-2">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Cambiar estado
            </p>
            <div className="inline-flex rounded-md border border-border bg-card p-0.5">
              {(['PENDIENTE', 'PAGADO', 'ANULADO'] as EstadoManifiesto[]).map((est) => {
                const Ic = ESTADO_ICON[est];
                const active = m.estado === est;
                return (
                  <button
                    key={est}
                    type="button"
                    onClick={() => handleCambiarEstado(est)}
                    disabled={cambiarEstado.isPending || active}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-medium transition disabled:cursor-default',
                      active
                        ? est === 'PAGADO'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : est === 'ANULADO'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-amber-500 text-white shadow-sm'
                        : 'text-muted-foreground hover:bg-[var(--color-muted)] hover:text-foreground',
                    )}
                  >
                    <Ic className="h-3 w-3" />
                    {ESTADO_LABELS[est]}
                  </button>
                );
              })}
            </div>
          </div>
        </InfoCard>

        <InfoCard title="Resumen financiero" icon={<DollarSign className="h-4 w-4" />}>
          <InfoRow
            label="Subtotal domicilio"
            value={fmtMoneda(m.subtotalDomicilio)}
            valueClassName="font-mono text-sm tabular-nums"
          />
          <InfoRow
            label="Subtotal agencia (flete)"
            value={fmtMoneda(m.subtotalAgenciaFlete)}
            valueClassName="font-mono text-sm tabular-nums"
          />
          <InfoRow
            label="Subtotal comisión agencias"
            value={fmtMoneda(m.subtotalComisionAgencias)}
            valueClassName="font-mono text-sm tabular-nums"
          />
          <div className="my-1 border-t border-dashed border-border" />
          <InfoRow
            label="Total distribuidor"
            value={fmtMoneda(m.totalDistribuidor)}
            valueClassName="font-mono text-sm font-semibold tabular-nums"
          />
          <InfoRow
            label="Total agencia"
            value={fmtMoneda(m.totalAgencia)}
            valueClassName="font-mono text-sm font-semibold tabular-nums"
          />
          <div className="mt-2 flex items-center justify-between rounded-md border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
              Total a pagar
            </span>
            <span
              className={cn(
                'font-mono text-lg font-bold tabular-nums text-[var(--color-primary)]',
                m.estado === 'ANULADO' && 'line-through opacity-60',
              )}
            >
              {fmtMoneda(m.totalPagar)}
            </span>
          </div>
        </InfoCard>
      </div>

      {/* ===== FILTROS DE EXPORTACIÓN (colapsables) ===== */}
      <SurfaceCard className="overflow-hidden">
        <button
          type="button"
          onClick={() => setExportFiltersOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition hover:bg-[var(--color-muted)]/50"
        >
          <div className="flex items-center gap-2">
            <FilterIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros de exportación</span>
            {hayFiltrosExport ? (
              <Badge variant="outline" className="border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                {despachosFiltradosExport.length} de {despachos.length}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">Todos los despachos</span>
            )}
          </div>
          {exportFiltersOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {exportFiltersOpen && (
          <div className="border-t border-border px-4 py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Distribuidor
                </label>
                <Select
                  value={String(pdfDistribuidorId)}
                  onValueChange={(v) => setPdfDistribuidorId(Number(v))}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Todos los distribuidores</SelectItem>
                    {distribuidores.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.nombre} ({d.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Agencia
                </label>
                <Select
                  value={String(pdfAgenciaId)}
                  onValueChange={(v) => setPdfAgenciaId(Number(v))}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Todas las agencias</SelectItem>
                    {agencias.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.nombre} ({a.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Estos filtros se aplican al imprimir, descargar PDF o Excel.
              </p>
              {hayFiltrosExport && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPdfDistribuidorId(0);
                    setPdfAgenciaId(0);
                  }}
                  className="gap-1.5 text-xs"
                >
                  <RefreshCw className="h-3 w-3" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        )}
      </SurfaceCard>

      {/* ===== DESPACHOS DEL MANIFIESTO ===== */}
      <SurfaceCard className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Despachos en el manifiesto
            </h2>
            <Badge variant="outline" className="font-normal">
              {despachosVisibles.length}
              {hayFiltrosTabla && despachosVisibles.length !== despachos.length
                ? ` de ${despachos.length}`
                : ''}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {despachos.length > 0 && (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar guía, destinatario..."
                    className="h-8 w-[16rem] pl-8 text-xs"
                  />
                </div>
                {tiposPresentes.length > 1 && (
                  <Select value={tipoFilter} onValueChange={setTipoFilter}>
                    <SelectTrigger className="h-8 w-[10rem] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SIN_FILTRO}>Todos los tipos</SelectItem>
                      {tiposPresentes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TIPO_LABELS[t] ?? t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {hayFiltrosTabla && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setTipoFilter(SIN_FILTRO);
                    }}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Limpiar
                  </Button>
                )}
              </>
            )}
            <Button
              size="sm"
              onClick={() => setAsignarOpen(true)}
              className="h-8 gap-1.5"
            >
              <PlusCircle className="h-4 w-4" />
              Agregar despachos
            </Button>
          </div>
        </div>

        {despachos.length === 0 ? (
          <div className="p-2">
            <EmptyState
              icon={Truck}
              title="No hay despachos asignados"
              description="Agrega despachos manualmente desde el botón superior, o usa los sugeridos por el período."
              action={
                <Button onClick={() => setAsignarOpen(true)} className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Asignar despachos
                </Button>
              }
            />
          </div>
        ) : despachosVisibles.length === 0 ? (
          <div className="p-2">
            <EmptyState
              icon={Search}
              title="Sin resultados"
              description="No hay despachos que coincidan con los filtros aplicados."
            />
          </div>
        ) : (
          <ListTableShell>
            <Table className="min-w-[900px] text-left">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[3.5rem] text-center">#</TableHead>
                  <TableHead className="w-[12rem]">Guía</TableHead>
                  <TableHead className="w-[8rem]">Tipo</TableHead>
                  <TableHead className="min-w-[12rem]">Distribuidor</TableHead>
                  <TableHead className="min-w-[10rem]">Agencia</TableHead>
                  <TableHead className="min-w-[12rem]">Destinatario</TableHead>
                  <TableHead className="w-[5rem] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {despachosVisibles.map((d, idx) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-center align-top text-xs text-muted-foreground tabular-nums">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex items-center gap-1">
                        <span className="break-all font-mono text-sm font-medium text-foreground">
                          {d.numeroGuia}
                        </span>
                        <CopyButton value={d.numeroGuia} small title="Copiar guía" />
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge
                        variant="outline"
                        className={cn(
                          TIPO_BADGE[d.tipoEntrega] ?? '',
                          'font-normal',
                        )}
                      >
                        {TIPO_LABELS[d.tipoEntrega] ?? d.tipoEntrega ?? '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      {d.distribuidorNombre ?? <span className="italic text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      {d.agenciaNombre ?? <span className="italic text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      {d.destinatarioNombre ?? <span className="italic text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Ver despacho"
                        title="Ver despacho"
                        onClick={() =>
                          navigate({
                            to: '/despachos/$id',
                            params: { id: String(d.id) },
                          })
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ListTableShell>
        )}
      </SurfaceCard>

      {/* ===== MODALES ===== */}
      {editOpen && (
        <ManifiestoForm
          id={m.id}
          onClose={() => setEditOpen(false)}
          onSuccess={() => setEditOpen(false)}
        />
      )}

      <AsignarDespachosDialog
        open={asignarOpen}
        onClose={() => setAsignarOpen(false)}
        manifiestoId={m.id}
        yaAsignadosIds={despachos.map((d) => d.id)}
      />

      <ConfirmDialog
        open={confirmAnular}
        onOpenChange={setConfirmAnular}
        title="¿Anular este manifiesto?"
        description="El manifiesto quedará marcado como anulado y dejará de contar para los totales pendientes. Puedes revertir el cambio cambiándolo a otro estado."
        confirmLabel="Sí, anular"
        variant="destructive"
        loading={cambiarEstado.isPending}
        onConfirm={async () => {
          try {
            await cambiarEstado.mutateAsync({ id: m.id, estado: 'ANULADO' });
            toast.success('Manifiesto anulado');
          } catch (err: unknown) {
            toast.error(getApiErrorMessage(err) ?? 'Error al anular');
            throw err;
          }
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="¿Eliminar manifiesto?"
        description="Los despachos asignados quedarán libres. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          try {
            await deleteMutation.mutateAsync(m.id);
            toast.success('Manifiesto eliminado');
            navigate({ to: '/manifiestos' });
          } catch (err: unknown) {
            toast.error(getApiErrorMessage(err) ?? 'Error al eliminar');
            throw err;
          }
        }}
      />
    </div>
  );
}

// ============================================================
// Diálogo "Asignar despachos" mejorado
// ============================================================

function AsignarDespachosDialog({
  open,
  onClose,
  manifiestoId,
  yaAsignadosIds,
}: {
  open: boolean;
  onClose: () => void;
  manifiestoId: number;
  yaAsignadosIds: number[];
}) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const yaAsignados = useMemo(() => new Set(yaAsignadosIds), [yaAsignadosIds]);
  const { data: candidatos = [], isLoading } = useDespachosCandidatosManifiesto(
    open ? manifiestoId : null,
  );
  const asignar = useAsignarDespachos();

  const candidatosFiltrados = useMemo(() => {
    let raw = candidatos;
    const q = search.trim().toLowerCase();
    if (q) {
      raw = raw.filter(
        (d) =>
          d.numeroGuia?.toLowerCase().includes(q) ||
          d.distribuidorNombre?.toLowerCase().includes(q) ||
          d.agenciaNombre?.toLowerCase().includes(q) ||
          d.destinatarioNombre?.toLowerCase().includes(q),
      );
    }
    return raw;
  }, [candidatos, search]);

  const seleccionablesIds = useMemo(
    () => candidatosFiltrados.filter((d) => !yaAsignados.has(d.id)).map((d) => d.id),
    [candidatosFiltrados, yaAsignados],
  );

  const allSelected =
    seleccionablesIds.length > 0 && seleccionablesIds.every((id) => selectedIds.includes(id));

  function toggleDespacho(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !seleccionablesIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...seleccionablesIds])));
    }
  }

  function handleAsignar() {
    asignar.mutate(
      { id: manifiestoId, body: { despachoIds: selectedIds } },
      {
        onSuccess: () => {
          toast.success(
            `${selectedIds.length} despacho${selectedIds.length === 1 ? '' : 's'} asignado${selectedIds.length === 1 ? '' : 's'}`,
          );
          setSelectedIds([]);
          onClose();
        },
        onError: (err: unknown) =>
          toast.error(getApiErrorMessage(err) ?? 'Error al asignar despachos'),
      },
    );
  }

  function handleClose() {
    setSearch('');
    setSelectedIds([]);
    onClose();
  }

  const totalSeleccionables = candidatos.filter((d) => !yaAsignados.has(d.id)).length;
  const yaAsignadosCount = candidatos.filter((d) => yaAsignados.has(d.id)).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-[720px]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle>Asignar despachos al manifiesto</DialogTitle>
              <DialogDescription>
                Despachos sugeridos por el período del manifiesto. Selecciona los que quieres
                incluir.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 py-2">
          <div className="relative flex-1 min-w-[14rem]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por guía, distribuidor o destinatario..."
              className="h-9 pl-8 text-sm"
              autoFocus
            />
          </div>
          {seleccionablesIds.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleAll}
              className="h-9 gap-1.5"
            >
              {allSelected ? (
                <>
                  <Square className="h-3.5 w-3.5" />
                  Quitar todo
                </>
              ) : (
                <>
                  <CheckSquare className="h-3.5 w-3.5" />
                  Seleccionar todo
                </>
              )}
            </Button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Cargando despachos...
            </div>
          ) : candidatos.length === 0 ? (
            <div className="p-6 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">No hay despachos disponibles</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Verifica que existan despachos en el período del manifiesto.
              </p>
            </div>
          ) : candidatosFiltrados.length === 0 ? (
            <div className="p-6 text-center">
              <Search className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">Sin resultados</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ningún despacho coincide con la búsqueda.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {candidatosFiltrados.map((d) => {
                const yaEsta = yaAsignados.has(d.id);
                const checked = yaEsta || selectedIds.includes(d.id);
                return (
                  <li key={d.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-start gap-3 px-3 py-2.5 transition',
                        yaEsta
                          ? 'cursor-not-allowed bg-[var(--color-muted)]/30 opacity-70'
                          : 'hover:bg-[var(--color-muted)]/40',
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={yaEsta}
                        onCheckedChange={() => !yaEsta && toggleDespacho(d.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="break-all font-mono text-sm font-medium text-foreground">
                            {d.numeroGuia}
                          </span>
                          {d.tipoEntrega && (
                            <Badge
                              variant="outline"
                              className={cn(
                                TIPO_BADGE[d.tipoEntrega] ?? '',
                                'font-normal',
                              )}
                            >
                              {TIPO_LABELS[d.tipoEntrega] ?? d.tipoEntrega}
                            </Badge>
                          )}
                          {yaEsta && (
                            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 font-normal">
                              <Check className="mr-1 h-3 w-3" />
                              Ya asignado
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {d.distribuidorNombre && (
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {d.distribuidorNombre}
                            </span>
                          )}
                          {d.agenciaNombre && (
                            <span className="inline-flex items-center gap-1">
                              <Warehouse className="h-3 w-3" />
                              {d.agenciaNombre}
                            </span>
                          )}
                          {d.destinatarioNombre && (
                            <span className="inline-flex items-center gap-1">
                              <Home className="h-3 w-3" />
                              {d.destinatarioNombre}
                            </span>
                          )}
                          {d.fechaHora && (
                            <span className="inline-flex items-center gap-1">
                              <CalendarRange className="h-3 w-3" />
                              {fmtFechaCorta(d.fechaHora)}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="items-center justify-between sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {selectedIds.length > 0 ? (
              <>
                <strong className="text-foreground">{selectedIds.length}</strong> seleccionado
                {selectedIds.length === 1 ? '' : 's'} ·{' '}
              </>
            ) : null}
            {totalSeleccionables} disponible{totalSeleccionables === 1 ? '' : 's'}
            {yaAsignadosCount > 0 ? ` · ${yaAsignadosCount} ya asignado${yaAsignadosCount === 1 ? '' : 's'}` : ''}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={asignar.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAsignar}
              disabled={selectedIds.length === 0 || asignar.isPending}
              className="gap-2"
            >
              {asignar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {asignar.isPending
                ? 'Asignando...'
                : `Asignar ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Componentes auxiliares
// ============================================================

function ErrorScreen({ mensaje }: { mensaje: string }) {
  return (
    <div className="space-y-3">
      <Link to="/manifiestos">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </Link>
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        {mensaje}
      </div>
    </div>
  );
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SurfaceCard className="p-4">
      <div className="mb-3 flex items-center gap-2">
        {icon && <span className="text-[var(--color-primary)]">{icon}</span>}
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="space-y-2.5">{children}</div>
    </SurfaceCard>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
  valueClassName,
  valueExtra,
}: {
  label: string;
  value: string | React.ReactNode;
  mono?: boolean;
  valueClassName?: string;
  valueExtra?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-3 text-sm">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-1">
        <span
          className={cn(
            'min-w-0 break-words text-foreground',
            mono && 'font-mono',
            valueClassName,
          )}
        >
          {value}
        </span>
        {valueExtra}
      </div>
    </div>
  );
}

function CopyButton({
  value,
  title,
  small = false,
}: {
  value: string;
  title?: string;
  small?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar');
    }
  }
  const Icon = copied ? Check : Copy;
  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={title ?? 'Copiar'}
      title={title ?? 'Copiar'}
      className={cn(
        'shrink-0 rounded text-muted-foreground transition-colors hover:bg-[var(--color-muted)] hover:text-foreground',
        small ? 'p-0.5' : 'p-1',
        copied && 'text-[var(--color-success)]',
      )}
    >
      <Icon className={small ? 'h-3 w-3' : 'h-4 w-4'} />
    </button>
  );
}
