import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Building2,
  CalendarRange,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Truck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useManifiestos, useDeleteManifiesto } from '@/hooks/useManifiestos';
import { getManifiesto } from '@/lib/api/manifiestos.service';
import { downloadManifiestoXlsx } from '@/lib/xlsx/manifiestoXlsx';
import { ManifiestoForm } from './ManifiestoForm';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ListTableShell } from '@/components/ListTableShell';
import { KpiCard } from '@/components/KpiCard';
import { ChipFiltro } from '@/components/ChipFiltro';
import { FiltrosBar, FiltroCampo } from '@/components/FiltrosBar';
import { MonoTrunc } from '@/components/MonoTrunc';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { buildManifiestoPdf } from '@/lib/pdf/builders/manifiestoPdf';
import { runJsPdfAction } from '@/lib/pdf/actions';
import type {
  EstadoManifiesto,
  FiltroManifiesto,
  Manifiesto,
} from '@/types/manifiesto';

const SIN_FILTRO = '__all__';

const ESTADO_LABELS: Record<EstadoManifiesto, string> = {
  PENDIENTE: 'Pendiente',
  PAGADO: 'Pagado',
  ANULADO: 'Anulado',
};

const ESTADO_BADGE: Record<EstadoManifiesto, string> = {
  PENDIENTE:
    'border-[color-mix(in_oklab,var(--color-warning)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-warning)_15%,transparent)] text-[color-mix(in_oklab,var(--color-warning)_75%,var(--color-foreground))]',
  PAGADO:
    'border-[color-mix(in_oklab,var(--color-success)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-success)_15%,transparent)] text-[color-mix(in_oklab,var(--color-success)_75%,var(--color-foreground))]',
  ANULADO:
    'border-[color-mix(in_oklab,var(--color-destructive)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-destructive)_15%,transparent)] text-[color-mix(in_oklab,var(--color-destructive)_75%,var(--color-foreground))]',
};

const FILTRO_LABELS: Record<FiltroManifiesto, string> = {
  POR_PERIODO: 'Por período',
  POR_DISTRIBUIDOR: 'Por distribuidor',
  POR_AGENCIA: 'Por agencia',
};

const ESTADO_ORDER: EstadoManifiesto[] = ['PENDIENTE', 'PAGADO', 'ANULADO'];

function fmtMoneda(value?: number | null): string {
  if (value == null) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
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

export function ManifiestoListPage() {
  const navigate = useNavigate();
  const { data: manifiestos, isLoading, error } = useManifiestos();
  const deleteManifiesto = useDeleteManifiesto();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoManifiesto | typeof SIN_FILTRO>(
    SIN_FILTRO,
  );
  const [filtroTipoFilter, setFiltroTipoFilter] = useState<FiltroManifiesto | undefined>(
    undefined,
  );
  const [exporting, setExporting] = useState<{
    id: number;
    mode: 'pdf' | 'print' | 'xlsx';
  } | null>(null);

  const allManifiestos = manifiestos ?? [];

  const stats = useMemo(() => {
    let total = 0;
    let pendientes = 0;
    let pagados = 0;
    let anulados = 0;
    let totalPagar = 0;
    let totalDespachos = 0;
    for (const m of allManifiestos) {
      total += 1;
      if (m.estado === 'PENDIENTE') pendientes += 1;
      else if (m.estado === 'PAGADO') pagados += 1;
      else if (m.estado === 'ANULADO') anulados += 1;
      if (m.estado !== 'ANULADO') {
        totalPagar += Number(m.totalPagar ?? 0);
      }
      totalDespachos += Number(m.cantidadDespachos ?? 0);
    }
    return { total, pendientes, pagados, anulados, totalPagar, totalDespachos };
  }, [allManifiestos]);

  const tiposPresentes = useMemo(() => {
    const set = new Set<FiltroManifiesto>();
    for (const m of allManifiestos) set.add(m.filtroTipo);
    return Array.from(set);
  }, [allManifiestos]);

  const list = useMemo(() => {
    let raw = allManifiestos;
    if (estadoFilter !== SIN_FILTRO) {
      raw = raw.filter((m) => m.estado === estadoFilter);
    }
    if (filtroTipoFilter) {
      raw = raw.filter((m) => m.filtroTipo === filtroTipoFilter);
    }
    const q = search.trim().toLowerCase();
    if (!q) return raw;
    return raw.filter(
      (m) =>
        m.codigo?.toLowerCase().includes(q) ||
        m.filtroDistribuidorNombre?.toLowerCase().includes(q) ||
        m.filtroAgenciaNombre?.toLowerCase().includes(q) ||
        String(m.id).includes(q),
    );
  }, [allManifiestos, estadoFilter, filtroTipoFilter, search]);

  const tieneFiltros = estadoFilter !== SIN_FILTRO || filtroTipoFilter != null;
  const limpiarFiltros = () => {
    setEstadoFilter(SIN_FILTRO);
    setFiltroTipoFilter(undefined);
  };

  const handleExport = async (id: number, mode: 'pdf' | 'print' | 'xlsx') => {
    if (exporting) return;
    setExporting({ id, mode });
    try {
      const detalle = await getManifiesto(id);
      if (mode === 'xlsx') {
        await downloadManifiestoXlsx({
          manifiesto: detalle,
          despachos: detalle.despachos ?? [],
        });
        toast.success('Excel generado');
        return;
      }
      const doc = buildManifiestoPdf({
        manifiesto: detalle,
        despachos: detalle.despachos ?? [],
      });
      runJsPdfAction(doc, {
        mode: mode === 'pdf' ? 'download' : 'print',
        filename: `manifiesto-${detalle.codigo ?? detalle.id}.pdf`,
        printMode: 'popup',
      });
      if (mode === 'pdf') toast.success('PDF generado');
    } catch {
      toast.error(mode === 'xlsx' ? 'No se pudo generar el Excel' : 'No se pudo generar el PDF');
    } finally {
      setExporting(null);
    }
  };

  if (isLoading) {
    return <LoadingState text="Cargando manifiestos..." />;
  }
  if (error) {
    return (
      <div className="ui-alert ui-alert-error">
        Error al cargar manifiestos.
      </div>
    );
  }

  return (
    <div className="page-stack">
      <ListToolbar
        title="Manifiestos"
        searchPlaceholder="Buscar por código, distribuidor, agencia..."
        onSearchChange={setSearch}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo manifiesto
          </Button>
        }
      />

      {allManifiestos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon={<FileText className="h-5 w-5" />}
            label="Total manifiestos"
            value={stats.total}
            tone="primary"
            hint={
              stats.totalDespachos > 0
                ? `${stats.totalDespachos} despachos en total`
                : undefined
            }
          />
          <KpiCard
            icon={<Clock className="h-5 w-5" />}
            label="Pendientes"
            value={stats.pendientes}
            tone={stats.pendientes > 0 ? 'warning' : 'neutral'}
            hint={stats.pendientes > 0 ? 'Por liquidar' : 'Sin pendientes'}
          />
          <KpiCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Pagados"
            value={stats.pagados}
            tone={stats.pagados > 0 ? 'success' : 'neutral'}
            hint={stats.anulados > 0 ? `${stats.anulados} anulado(s)` : undefined}
          />
          <KpiCard
            icon={<DollarSign className="h-5 w-5" />}
            label="A pagar"
            value={fmtMoneda(stats.totalPagar)}
            tone="neutral"
            hint="Suma de manifiestos no anulados"
          />
        </div>
      )}

      {allManifiestos.length > 0 && (
        <FiltrosBar
          hayFiltrosActivos={tieneFiltros}
          onLimpiar={limpiarFiltros}
          chips={
            <>
              <ChipFiltro
                label="Todos"
                count={stats.total}
                active={estadoFilter === SIN_FILTRO}
                onClick={() => setEstadoFilter(SIN_FILTRO)}
              />
              {ESTADO_ORDER.map((estado) => {
                const count =
                  estado === 'PENDIENTE'
                    ? stats.pendientes
                    : estado === 'PAGADO'
                      ? stats.pagados
                      : stats.anulados;
                const active = estadoFilter === estado;
                const tone =
                  estado === 'PENDIENTE'
                    ? ('warning' as const)
                    : estado === 'PAGADO'
                      ? ('success' as const)
                      : ('danger' as const);
                const Icon =
                  estado === 'PENDIENTE'
                    ? Clock
                    : estado === 'PAGADO'
                      ? CheckCircle2
                      : XCircle;
                return (
                  <ChipFiltro
                    key={estado}
                    label={ESTADO_LABELS[estado]}
                    count={count}
                    active={active}
                    tone={tone}
                    icon={<Icon className="h-3.5 w-3.5" />}
                    onClick={() =>
                      setEstadoFilter(active ? SIN_FILTRO : estado)
                    }
                    hideWhenZero
                  />
                );
              })}
            </>
          }
          filtros={
            tiposPresentes.length > 1 && (
              <FiltroCampo label="Tipo de filtro">
                <SearchableCombobox<FiltroManifiesto>
                  value={filtroTipoFilter}
                  onChange={(v) =>
                    setFiltroTipoFilter(
                      v == null ? undefined : (v as FiltroManifiesto),
                    )
                  }
                  options={tiposPresentes}
                  getKey={(t) => t}
                  getLabel={(t) => FILTRO_LABELS[t]}
                  placeholder="Todos los tipos"
                  searchPlaceholder="Buscar tipo..."
                  emptyMessage="Sin tipos"
                  className="h-9 w-full"
                />
              </FiltroCampo>
            )
          }
        />
      )}

      {allManifiestos.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay manifiestos"
          description="Crea un manifiesto para liquidar despachos por periodo, distribuidor o agencia."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crear manifiesto
            </Button>
          }
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin resultados"
          description="No hay manifiestos que coincidan con los filtros."
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {list.length} manifiesto{list.length === 1 ? '' : 's'}
            {list.length !== allManifiestos.length
              ? ` de ${allManifiestos.length}`
              : ''}
          </p>
          <ListTableShell>
            <Table className="min-w-[940px] text-left">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[14rem]">Manifiesto</TableHead>
                  <TableHead className="w-[12rem]">Periodo</TableHead>
                  <TableHead className="min-w-[12rem]">Filtro</TableHead>
                  <TableHead className="w-[7rem] text-center">Despachos</TableHead>
                  <TableHead className="w-[8rem] text-right">Distribuidor</TableHead>
                  <TableHead className="w-[8rem] text-right">Agencia</TableHead>
                  <TableHead className="w-[9rem] text-right">Total a pagar</TableHead>
                  <TableHead className="w-[6rem]">Estado</TableHead>
                  <TableHead className="w-12 text-right" aria-label="Acciones" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((m) => (
                  <TableRow
                    key={m.id}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate({
                        to: '/manifiestos/$id',
                        params: { id: String(m.id) },
                      })
                    }
                  >
                    <TableCell className="align-top">
                      <ManifiestoCell manifiesto={m} />
                    </TableCell>
                    <TableCell className="align-top">
                      <PeriodoCell inicio={m.fechaInicio} fin={m.fechaFin} />
                    </TableCell>
                    <TableCell className="align-top">
                      <FiltroCell manifiesto={m} />
                    </TableCell>
                    <TableCell className="text-center align-top">
                      <DespachosBadge total={m.cantidadDespachos ?? 0} />
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <MoneyCell value={m.totalDistribuidor} />
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <MoneyCell value={m.totalAgencia} />
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <span
                        className={cn(
                          'font-mono text-sm font-semibold tabular-nums',
                          m.estado === 'ANULADO' && 'text-muted-foreground line-through',
                        )}
                      >
                        {fmtMoneda(m.totalPagar)}
                      </span>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge
                        variant="outline"
                        className={cn(ESTADO_BADGE[m.estado], 'font-normal')}
                      >
                        {m.estado === 'PAGADO' && (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        )}
                        {m.estado === 'ANULADO' && (
                          <XCircle className="mr-1 h-3 w-3" />
                        )}
                        {m.estado === 'PENDIENTE' && (
                          <Clock className="mr-1 h-3 w-3" />
                        )}
                        {ESTADO_LABELS[m.estado]}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="text-right align-top"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowActionsMenu
                        items={[
                          {
                            label: 'Ver detalle',
                            icon: Eye,
                            onSelect: () =>
                              navigate({
                                to: '/manifiestos/$id',
                                params: { id: String(m.id) },
                              }),
                          },
                          {
                            label: 'Editar manifiesto',
                            icon: Pencil,
                            onSelect: () => setEditingId(m.id),
                          },
                          { type: 'separator' },
                          {
                            label: 'Imprimir',
                            icon: Printer,
                            onSelect: () => handleExport(m.id, 'print'),
                            loading:
                              exporting?.id === m.id && exporting.mode === 'print',
                            disabled: exporting?.id === m.id,
                          },
                          {
                            label: 'Descargar PDF',
                            icon: FileDown,
                            onSelect: () => handleExport(m.id, 'pdf'),
                            loading:
                              exporting?.id === m.id && exporting.mode === 'pdf',
                            disabled: exporting?.id === m.id,
                          },
                          {
                            label: 'Descargar Excel',
                            icon: FileSpreadsheet,
                            onSelect: () => handleExport(m.id, 'xlsx'),
                            loading:
                              exporting?.id === m.id && exporting.mode === 'xlsx',
                            disabled: exporting?.id === m.id,
                          },
                          { type: 'separator' },
                          {
                            label: 'Eliminar',
                            icon: Trash2,
                            destructive: true,
                            onSelect: () => setDeleteConfirmId(m.id),
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ListTableShell>
        </>
      )}

      {createOpen && (
        <ManifiestoForm
          onClose={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
        />
      )}
      {editingId != null && (
        <ManifiestoForm
          id={editingId}
          onClose={() => setEditingId(null)}
          onSuccess={() => setEditingId(null)}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="¿Eliminar manifiesto?"
        description="Los despachos quedarán sin asignar a este manifiesto. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteManifiesto.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          try {
            await deleteManifiesto.mutateAsync(deleteConfirmId);
            toast.success('Manifiesto eliminado');
          } catch (err: unknown) {
            toast.error(getApiErrorMessage(err) ?? 'Error al eliminar el manifiesto');
            throw err;
          }
        }}
      />
    </div>
  );
}

function ManifiestoCell({ manifiesto: m }: { manifiesto: Manifiesto }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <MonoTrunc
        value={m.codigo ?? ''}
        className="font-medium text-foreground"
      />
      <span className="font-mono text-[11px] text-muted-foreground">#{m.id}</span>
    </div>
  );
}

function PeriodoCell({
  inicio,
  fin,
}: {
  inicio?: string | null;
  fin?: string | null;
}) {
  if (!inicio && !fin) {
    return <span className="text-xs italic text-muted-foreground">—</span>;
  }
  const dias = diasEntre(inicio, fin);
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="inline-flex items-center gap-1.5 text-sm">
        <CalendarRange className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="tabular-nums">{fmtFechaCorta(inicio)}</span>
      </span>
      <span className="pl-5 text-xs text-muted-foreground tabular-nums">
        → {fmtFechaCorta(fin)}
      </span>
      {dias != null && (
        <span className="pl-5 text-[11px] text-muted-foreground">
          {dias} {dias === 1 ? 'día' : 'días'}
        </span>
      )}
    </div>
  );
}

function FiltroCell({ manifiesto: m }: { manifiesto: Manifiesto }) {
  if (m.filtroTipo === 'POR_DISTRIBUIDOR') {
    return (
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Distribuidor
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate" title={m.filtroDistribuidorNombre ?? undefined}>
            {m.filtroDistribuidorNombre ?? '—'}
          </span>
        </span>
      </div>
    );
  }
  if (m.filtroTipo === 'POR_AGENCIA') {
    return (
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Agencia
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate" title={m.filtroAgenciaNombre ?? undefined}>
            {m.filtroAgenciaNombre ?? '—'}
          </span>
        </span>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Período
      </span>
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <CalendarRange className="h-3.5 w-3.5 shrink-0" />
        Por período
      </span>
    </div>
  );
}

function DespachosBadge({ total }: { total: number }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-normal',
        total > 0
          ? 'border-[var(--color-primary)]/30 bg-[var(--color-muted)] text-[var(--color-primary)]'
          : 'text-muted-foreground',
      )}
    >
      <Truck className="h-3 w-3" />
      {total}
    </Badge>
  );
}

function MoneyCell({ value }: { value?: number | null }) {
  if (value == null) {
    return <span className="text-xs italic text-muted-foreground">—</span>;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) {
    return (
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {fmtMoneda(0)}
      </span>
    );
  }
  return (
    <span className="font-mono text-sm tabular-nums text-foreground">
      {fmtMoneda(n)}
    </span>
  );
}
