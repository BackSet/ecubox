import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowLeft,
  Building2,
  CalendarRange,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  Eraser,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter as FilterIcon,
  Home,
  Info,
  Loader2,
  MapPin,
  Package as PackageIcon,
  Pencil,
  PlusCircle,
  Printer,
  Search,
  Square,
  Trash2,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';
import { toast } from 'sonner';
import { notify } from '@/lib/notify';
import {
  useManifiesto,
  useAsignarDespachos,
  useDeleteManifiesto,
  useDespachosCandidatosManifiesto,
} from '@/hooks/useManifiestos';
import { useAgencias } from '@/hooks/useAgencias';
import { useCouriersEntregaAdmin } from '@/hooks/useCouriersEntregaAdmin';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { DetailHeaderSkeleton } from '@/components/skeletons/DetailHeaderSkeleton';
import { KpiCardsGridSkeleton } from '@/components/skeletons/KpiCardSkeleton';
import { SurfaceCardSkeleton } from '@/components/skeletons/SurfaceCardSkeleton';
import { ListItemsSkeleton } from '@/components/skeletons/ListItemsSkeleton';
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
import { buildManifiestoPdf } from '@/lib/pdf/builders/manifiestoPdf';
import { runJsPdfAction } from '@/lib/pdf/actions';
import { downloadManifiestoXlsx } from '@/lib/xlsx/manifiestoXlsx';
import { ManifiestoForm } from './ManifiestoForm';
import type {
  DespachoEnManifiesto,
  FiltroManifiesto,
} from '@/types/manifiesto';

const FILTRO_LABELS: Record<FiltroManifiesto, string> = {
  POR_PERIODO: 'Por período',
  POR_COURIER_ENTREGA: 'Por courier de entrega',
  POR_AGENCIA: 'Por agencia',
};

const TIPO_LABELS: Record<string, string> = {
  DOMICILIO: 'Domicilio',
  AGENCIA: 'Agencia',
  AGENCIA_COURIER_ENTREGA: 'Punto de entrega',
};

const TIPO_BADGE: Record<string, string> = {
  DOMICILIO:
    'border-[var(--color-info)]/30 bg-[var(--color-info)]/10 text-[var(--color-info)]',
  AGENCIA:
    'border-[var(--color-primary)]/30 bg-[var(--color-muted)] text-[var(--color-primary)]',
  AGENCIA_COURIER_ENTREGA:
    'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
};

const FILTRO_BADGE: Record<FiltroManifiesto, string> = {
  POR_PERIODO:
    'border-[var(--color-primary)]/30 bg-[var(--color-muted)] text-[var(--color-primary)]',
  POR_COURIER_ENTREGA:
    'border-[var(--color-info)]/30 bg-[var(--color-info)]/10 text-[var(--color-info)]',
  POR_AGENCIA:
    'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
};

type TipoExportFilter = 'TODOS' | 'DOMICILIO' | 'AGENCIA' | 'AGENCIA_COURIER_ENTREGA';

const TIPO_EXPORT_OPTIONS: Array<{ value: TipoExportFilter; label: string }> = [
  { value: 'TODOS', label: 'Todos los tipos' },
  { value: 'DOMICILIO', label: 'Solo domicilio' },
  { value: 'AGENCIA', label: 'Solo agencia' },
  { value: 'AGENCIA_COURIER_ENTREGA', label: 'Solo punto de entrega' },
];

const SIN_FILTRO = '__all__';

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
  const { data: couriersEntrega = [] } = useCouriersEntregaAdmin();

  const deleteMutation = useDeleteManifiesto();

  const [editOpen, setEditOpen] = useState(false);
  const [asignarOpen, setAsignarOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>(SIN_FILTRO);
  const [pdfTipoEntrega, setPdfTipoEntrega] = useState<TipoExportFilter>('TODOS');
  const [pdfAgenciaId, setPdfAgenciaId] = useState<number>(0);
  const [pdfCourierEntregaId, setPdfCourierEntregaId] = useState<number>(0);
  const [exporting, setExporting] = useState<'pdf' | 'print' | 'xlsx' | null>(null);
  const [exportFiltersOpen, setExportFiltersOpen] = useState(false);

  if (!idValido) return <ErrorScreen mensaje="ID de manifiesto no válido" />;
  if (isLoading) {
    return (
      <div className="page-stack" aria-busy="true" aria-live="polite">
        <DetailHeaderSkeleton badges={2} metaLines={2} />
        <KpiCardsGridSkeleton count={3} />
        <SurfaceCardSkeleton bodyLines={4} />
        <ListTableShell>
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Despacho</TableHead>
                <TableHead className="hidden md:table-cell">Courier de entrega</TableHead>
                <TableHead className="hidden lg:table-cell">Agencia</TableHead>
                <TableHead>Consignatario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRowsSkeleton
                columns={4}
                columnClasses={{
                  1: 'hidden md:table-cell',
                  2: 'hidden lg:table-cell',
                }}
              />
            </TableBody>
          </Table>
        </ListTableShell>
        <span className="sr-only">Cargando manifiesto...</span>
      </div>
    );
  }
  if (error || !manifiesto) return <ErrorScreen mensaje="No se pudo cargar el manifiesto" />;

  const m = manifiesto;
  const despachos = m.despachos ?? [];
  const dias = diasEntre(m.fechaInicio, m.fechaFin);

  const stats = (() => {
    let domicilio = 0;
    let agencia = 0;
    let agenciaDist = 0;
    const couriersEntregaSet = new Set<string>();
    const agenciasSet = new Set<string>();
    for (const d of despachos) {
      if (d.tipoEntrega === 'DOMICILIO') domicilio += 1;
      else if (d.tipoEntrega === 'AGENCIA') agencia += 1;
      else if (d.tipoEntrega === 'AGENCIA_COURIER_ENTREGA') agenciaDist += 1;
      if (d.courierEntregaNombre) couriersEntregaSet.add(d.courierEntregaNombre);
      if (d.agenciaNombre) agenciasSet.add(d.agenciaNombre);
    }
    return {
      domicilio,
      agencia,
      agenciaDist,
      couriersEntrega: couriersEntregaSet.size,
      agencias: agenciasSet.size,
    };
  })();

  const tiposPresentes = (() => {
    const set = new Set<string>();
    for (const d of despachos) if (d.tipoEntrega) set.add(d.tipoEntrega);
    return Array.from(set);
  })();

  const courierEntregaSeleccionado = couriersEntrega.find((d) => d.id === pdfCourierEntregaId);
  const agenciaSeleccionada = agencias.find((a) => a.id === pdfAgenciaId);

  const filtrarDespachos = (lista: DespachoEnManifiesto[]) => {
    let raw = lista;
    if (pdfTipoEntrega !== 'TODOS') {
      raw = raw.filter((d) => d.tipoEntrega === pdfTipoEntrega);
    }
    if (courierEntregaSeleccionado) {
      raw = raw.filter((d) => d.courierEntregaNombre === courierEntregaSeleccionado.nombre);
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
        d.courierEntregaNombre?.toLowerCase().includes(q) ||
        d.agenciaNombre?.toLowerCase().includes(q) ||
        d.consignatarioNombre?.toLowerCase().includes(q),
    );
  })();

  async function handlePdfManifiesto(mode: 'download' | 'print') {
    if (exporting) return;
    setExporting(mode === 'download' ? 'pdf' : 'print');
    const labels =
      mode === 'download'
        ? { loading: 'Generando PDF del manifiesto...', success: 'PDF generado', error: 'No se pudo generar el PDF' }
        : { loading: 'Preparando vista de impresión...', success: 'Vista de impresión lista', error: 'No se pudo preparar la impresión' };
    try {
      await notify.run(
        (async () => {
          const doc = buildManifiestoPdf({
            manifiesto: m,
            despachos: despachosFiltradosExport,
            filtroAgenciaNombre: agenciaSeleccionada?.nombre,
            filtroCourierEntregaNombre: courierEntregaSeleccionado?.nombre,
          });
          runJsPdfAction(doc, {
            mode,
            filename: `manifiesto-${(m.codigo && m.codigo.trim() !== '' ? m.codigo : String(m.id)).replace(/[^a-zA-Z0-9_-]+/g, '_')}.pdf`,
            printMode: 'popup',
          });
        })(),
        labels,
      );
    } catch {
      // notificado por notify.run
    } finally {
      setExporting(null);
    }
  }

  async function handleExcel() {
    if (exporting) return;
    setExporting('xlsx');
    try {
      await notify.run(
        downloadManifiestoXlsx({
          manifiesto: m,
          despachos: despachosFiltradosExport,
          filtroAgenciaNombre: agenciaSeleccionada?.nombre,
          filtroCourierEntregaNombre: courierEntregaSeleccionado?.nombre,
        }),
        {
          loading: 'Generando Excel del manifiesto...',
          success: 'Excel generado',
          error: 'No se pudo generar el Excel',
        },
      );
    } catch {
      // notificado por notify.run
    } finally {
      setExporting(null);
    }
  }

  const hayFiltrosExport =
    pdfCourierEntregaId !== 0 || pdfAgenciaId !== 0 || pdfTipoEntrega !== 'TODOS';
  const hayFiltrosTabla = tipoFilter !== SIN_FILTRO || search.trim() !== '';
  const codigoVisible = m.codigo && m.codigo.trim() !== '' ? m.codigo : `#${m.id}`;

  return (
    <div className="page-stack">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: '/manifiestos' })}
        className="-ml-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a manifiestos
      </Button>

      {/* ===== HEADER CARD ===== */}
      <SurfaceCard className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md',
                'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
              )}
            >
              <FileText className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Manifiesto · #{m.id}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1
                  className="break-all font-mono text-xl font-semibold leading-tight text-foreground"
                  title={codigoVisible}
                >
                  {codigoVisible}
                </h1>
                <CopyButton value={codigoVisible} title="Copiar código del manifiesto" />
                <Badge
                  variant="outline"
                  className={cn(FILTRO_BADGE[m.filtroTipo] ?? '', 'font-normal')}
                >
                  {FILTRO_LABELS[m.filtroTipo] ?? m.filtroTipo}
                </Badge>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
                {m.filtroCourierEntregaNombre && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {m.filtroCourierEntregaNombre}
                  </span>
                )}
                {m.filtroAgenciaNombre && (
                  <span className="inline-flex items-center gap-1">
                    <Warehouse className="h-3 w-3" />
                    {m.filtroAgenciaNombre}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              className="gap-1.5"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={!!exporting}
              onClick={() => handlePdfManifiesto('print')}
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
              className="gap-1.5"
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
              className="gap-1.5 text-[var(--color-success)] hover:text-[var(--color-success)] dark:text-[var(--color-success)] dark:hover:text-[var(--color-success)]"
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
              size="icon"
              className="text-[var(--color-destructive)] hover:text-[var(--color-destructive)]"
              aria-label="Eliminar manifiesto"
              title="Eliminar manifiesto"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
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
            despachos.length === 0
              ? 'Sin despachos asignados'
              : `${despachos.length} en el período`
          }
        />
        <KpiCard
          icon={<Home className="h-5 w-5" />}
          label="A domicilio"
          value={stats.domicilio}
          tone={stats.domicilio > 0 ? 'success' : 'neutral'}
          hint={
            stats.domicilio === 0
              ? 'Sin entregas a domicilio'
              : `${stats.domicilio} ${stats.domicilio === 1 ? 'entrega' : 'entregas'}`
          }
        />
        <KpiCard
          icon={<MapPin className="h-5 w-5" />}
          label="Agencia / Punto"
          value={stats.agencia + stats.agenciaDist}
          tone={stats.agencia + stats.agenciaDist > 0 ? 'primary' : 'neutral'}
          hint={
            stats.agencia + stats.agenciaDist === 0
              ? 'Sin agencia ni punto'
              : `${stats.agencia} ag · ${stats.agenciaDist} pto`
          }
        />
        <KpiCard
          icon={<Building2 className="h-5 w-5" />}
          label="Couriers / Agencias"
          value={stats.couriersEntrega + stats.agencias}
          tone="neutral"
          hint={
            stats.couriersEntrega + stats.agencias === 0
              ? 'Sin destinos asignados'
              : `${stats.couriersEntrega} courier${stats.couriersEntrega === 1 ? '' : 's'} · ${stats.agencias} agencia${stats.agencias === 1 ? '' : 's'}`
          }
        />
      </div>

      {/* ===== INFORMACIÓN ===== */}
      <InfoCard title="Información del manifiesto" icon={<Info className="h-4 w-4" />}>
        <InfoRow
          label="Código"
          value={codigoVisible}
          mono
          valueExtra={<CopyButton value={codigoVisible} small />}
        />
        <InfoRow label="ID interno" value={`#${m.id}`} mono />
        <InfoRow
          label="Período"
          value={`${fmtFechaCorta(m.fechaInicio)} → ${fmtFechaCorta(m.fechaFin)}`}
        />
        <InfoRow
          label="Duración"
          value={dias != null ? `${dias} ${dias === 1 ? 'día' : 'días'}` : '—'}
        />
        <InfoRow label="Tipo de filtro" value={FILTRO_LABELS[m.filtroTipo] ?? m.filtroTipo} />
        {m.filtroCourierEntregaNombre && (
          <InfoRow label="Courier de entrega" value={m.filtroCourierEntregaNombre} />
        )}
        {m.filtroAgenciaNombre && <InfoRow label="Agencia" value={m.filtroAgenciaNombre} />}
        <InfoRow
          label="Despachos asignados"
          value={`${despachos.length} despacho${despachos.length === 1 ? '' : 's'}`}
        />
      </InfoCard>

      {/* ===== FILTROS DE EXPORTACIÓN (colapsables) ===== */}
      <SurfaceCard className="overflow-hidden">
        <button
          type="button"
          onClick={() => setExportFiltersOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition hover:bg-[var(--color-muted)]/50"
          aria-expanded={exportFiltersOpen}
          aria-controls="export-filters-panel"
        >
          <div className="flex items-center gap-2">
            <FilterIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros de exportación</span>
            {hayFiltrosExport ? (
              <Badge
                variant="outline"
                className="border-[var(--color-primary)]/40 bg-[var(--color-muted)] text-[var(--color-primary)] font-normal"
              >
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
          <div id="export-filters-panel" className="border-t border-border px-4 py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Tipo de entrega
                </label>
                <Select
                  value={pdfTipoEntrega}
                  onValueChange={(v) => setPdfTipoEntrega(v as TipoExportFilter)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_EXPORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Courier de entrega
                </label>
                <Select
                  value={String(pdfCourierEntregaId)}
                  onValueChange={(v) => setPdfCourierEntregaId(Number(v))}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Todos los couriers</SelectItem>
                    {couriersEntrega.map((d) => (
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
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Estos filtros se aplican al imprimir, descargar PDF o Excel.
              </p>
              {hayFiltrosExport && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPdfTipoEntrega('TODOS');
                    setPdfCourierEntregaId(0);
                    setPdfAgenciaId(0);
                  }}
                  className="h-8 gap-1.5 text-xs"
                >
                  <Eraser className="h-3 w-3" />
                  Limpiar
                </Button>
              )}
            </div>
            {hayFiltrosExport && despachosFiltradosExport.length === 0 && (
              <div className="mt-3 rounded-md border border-dashed border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-3 py-2 text-xs text-[var(--color-warning)]">
                Con estos filtros no quedará ningún despacho en el documento exportado.
              </div>
            )}
          </div>
        )}
      </SurfaceCard>

      {/* ===== DESPACHOS DEL MANIFIESTO ===== */}
      <SurfaceCard className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="inline-flex items-center gap-2 text-base font-semibold">
              <Truck className="h-4 w-4 text-[var(--color-primary)]" />
              Despachos en el manifiesto
              <span className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {despachosVisibles.length}
                {hayFiltrosTabla && despachosVisibles.length !== despachos.length
                  ? ` de ${despachos.length}`
                  : ''}
              </span>
            </h2>
            {hayFiltrosTabla && despachosVisibles.length !== despachos.length && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Mostrando {despachosVisibles.length} de {despachos.length} despacho
                {despachos.length === 1 ? '' : 's'} con los filtros aplicados.
              </p>
            )}
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2 sm:max-w-2xl sm:justify-end">
            {despachos.length > 0 && (
              <>
                <div className="relative w-full sm:max-w-[280px]">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar guía, consignatario..."
                    className="h-8 pl-7 pr-7 text-sm"
                  />
                  {search.trim() !== '' && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-[var(--color-muted)] hover:text-foreground"
                      aria-label="Limpiar búsqueda"
                      title="Limpiar"
                    >
                      <Eraser className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {tiposPresentes.length > 1 && (
                  <Select value={tipoFilter} onValueChange={setTipoFilter}>
                    <SelectTrigger className="h-8 w-[11rem] text-xs">
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
                    <Eraser className="h-3 w-3" />
                    Limpiar
                  </Button>
                )}
              </>
            )}
            <Button size="sm" onClick={() => setAsignarOpen(true)} className="h-8 gap-1.5">
              <PlusCircle className="h-4 w-4" />
              Agregar despachos
            </Button>
          </div>
        </div>

        {despachos.length === 0 ? (
          <EmptyState
            icon={PackageIcon}
            title="No hay despachos asignados"
            description="Agrega despachos manualmente desde el botón superior, o usa los sugeridos por el período."
            action={
              <Button onClick={() => setAsignarOpen(true)} className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Asignar despachos
              </Button>
            }
          />
        ) : despachosVisibles.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-border bg-[var(--color-muted)]/20 px-4 py-3 text-sm text-muted-foreground">
            <span>Sin coincidencias para los filtros aplicados.</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setTipoFilter(SIN_FILTRO);
              }}
            >
              <Eraser className="mr-1 h-3.5 w-3.5" />
              Limpiar
            </Button>
          </div>
        ) : (
          <ListTableShell>
            <Table className="min-w-[900px] text-left">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[3.5rem] text-center">#</TableHead>
                  <TableHead className="w-[12rem]">Guía</TableHead>
                  <TableHead className="hidden w-[8rem] md:table-cell">Tipo</TableHead>
                  <TableHead className="min-w-[12rem]">Consignatario</TableHead>
                  <TableHead className="min-w-[12rem]">Courier de entrega</TableHead>
                  <TableHead className="min-w-[10rem]">Agencia</TableHead>
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
                    <TableCell className="hidden align-top md:table-cell">
                      <Badge
                        variant="outline"
                        className={cn(TIPO_BADGE[d.tipoEntrega] ?? '', 'font-normal')}
                      >
                        {TIPO_LABELS[d.tipoEntrega] ?? d.tipoEntrega ?? '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      {d.consignatarioNombre ?? (
                        <span className="italic text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      {d.courierEntregaNombre ?? (
                        <span className="italic text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      {d.agenciaNombre ?? (
                        <span className="italic text-muted-foreground">—</span>
                      )}
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
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="¿Eliminar manifiesto?"
        description="Los despachos asignados quedarán libres. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          await notify.run(deleteMutation.mutateAsync(m.id), {
            loading: 'Eliminando manifiesto...',
            success: 'Manifiesto eliminado',
            error: 'No se pudo eliminar el manifiesto',
          });
          navigate({ to: '/manifiestos' });
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
          d.courierEntregaNombre?.toLowerCase().includes(q) ||
          d.agenciaNombre?.toLowerCase().includes(q) ||
          d.consignatarioNombre?.toLowerCase().includes(q),
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

  async function handleAsignar() {
    const cantidad = selectedIds.length;
    try {
      await notify.run(
        asignar.mutateAsync({ id: manifiestoId, body: { despachoIds: selectedIds } }),
        {
          loading: `Asignando ${cantidad} despacho${cantidad === 1 ? '' : 's'}...`,
          success: `${cantidad} despacho${cantidad === 1 ? '' : 's'} asignado${cantidad === 1 ? '' : 's'}`,
          error: 'No se pudieron asignar los despachos',
        },
      );
      setSelectedIds([]);
      onClose();
    } catch {
      // notificado por notify.run
    }
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-muted)] text-[var(--color-primary)]">
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
              placeholder="Buscar por guía, courier o consignatario..."
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
            <div aria-busy="true" aria-live="polite">
              <ListItemsSkeleton rows={6} withTrailing />
              <span className="sr-only">Cargando despachos...</span>
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
                            <Badge variant="outline" className="border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)] font-normal">
                              <Check className="mr-1 h-3 w-3" />
                              Ya asignado
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {d.courierEntregaNombre && (
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {d.courierEntregaNombre}
                            </span>
                          )}
                          {d.agenciaNombre && (
                            <span className="inline-flex items-center gap-1">
                              <Warehouse className="h-3 w-3" />
                              {d.agenciaNombre}
                            </span>
                          )}
                          {d.consignatarioNombre && (
                            <span className="inline-flex items-center gap-1">
                              <Home className="h-3 w-3" />
                              {d.consignatarioNombre}
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
      <div className="ui-alert ui-alert-error">
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
