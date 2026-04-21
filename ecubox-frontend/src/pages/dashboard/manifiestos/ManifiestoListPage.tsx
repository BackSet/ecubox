import { useEffect, useMemo, useState } from 'react';
import { TablePagination } from '@/components/ui/TablePagination';
import { useNavigate } from '@tanstack/react-router';
import {
  Building2,
  CalendarRange,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Truck,
} from 'lucide-react';
import { notify } from '@/lib/notify';
import { useManifiestos, useDeleteManifiesto } from '@/hooks/useManifiestos';
import { getManifiesto } from '@/lib/api/manifiestos.service';
import { downloadManifiestoXlsx } from '@/lib/xlsx/manifiestoXlsx';
import { ManifiestoForm } from './ManifiestoForm';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { InlineErrorBanner } from '@/components/InlineErrorBanner';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { KpiCardsGridSkeleton } from '@/components/skeletons/KpiCardSkeleton';
import { FiltrosBarSkeleton } from '@/components/skeletons/FiltrosBarSkeleton';
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
import { buildManifiestoPdf } from '@/lib/pdf/builders/manifiestoPdf';
import { runJsPdfAction } from '@/lib/pdf/actions';
import type { FiltroManifiesto, Manifiesto } from '@/types/manifiesto';

const FILTRO_LABELS: Record<FiltroManifiesto, string> = {
  POR_PERIODO: 'Por período',
  POR_COURIER_ENTREGA: 'Por courier de entrega',
  POR_AGENCIA: 'Por agencia',
};

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
  const { data: manifiestos, isLoading, isFetching, error, refetch } = useManifiestos();
  const deleteManifiesto = useDeleteManifiesto();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [search, setSearchRaw] = useState('');
  const [filtroTipoFilter, setFiltroTipoFilterRaw] = useState<FiltroManifiesto | undefined>(
    undefined,
  );
  const [page, setPage] = useState(0);
  const [size, setSizeRaw] = useState(25);
  const setSearch = (v: string) => { setSearchRaw(v); setPage(0); };
  const setFiltroTipoFilter = (v: FiltroManifiesto | undefined) => { setFiltroTipoFilterRaw(v); setPage(0); };
  const setSize = (v: number) => { setSizeRaw(v); setPage(0); };
  const [exporting, setExporting] = useState<{
    id: number;
    mode: 'pdf' | 'print' | 'xlsx';
  } | null>(null);

  const allManifiestos = manifiestos ?? [];

  const stats = useMemo(() => {
    let total = 0;
    let totalDespachos = 0;
    let porPeriodo = 0;
    let porCourier = 0;
    let porAgencia = 0;
    for (const m of allManifiestos) {
      total += 1;
      totalDespachos += Number(m.cantidadDespachos ?? 0);
      if (m.filtroTipo === 'POR_PERIODO') porPeriodo += 1;
      else if (m.filtroTipo === 'POR_COURIER_ENTREGA') porCourier += 1;
      else if (m.filtroTipo === 'POR_AGENCIA') porAgencia += 1;
    }
    return { total, totalDespachos, porPeriodo, porCourier, porAgencia };
  }, [allManifiestos]);

  const tiposPresentes = useMemo(() => {
    const set = new Set<FiltroManifiesto>();
    for (const m of allManifiestos) set.add(m.filtroTipo);
    return Array.from(set);
  }, [allManifiestos]);

  const list = useMemo(() => {
    let raw = allManifiestos;
    if (filtroTipoFilter) {
      raw = raw.filter((m) => m.filtroTipo === filtroTipoFilter);
    }
    const q = search.trim().toLowerCase();
    if (!q) return raw;
    return raw.filter(
      (m) =>
        m.codigo?.toLowerCase().includes(q) ||
        m.filtroCourierEntregaNombre?.toLowerCase().includes(q) ||
        m.filtroAgenciaNombre?.toLowerCase().includes(q) ||
        String(m.id).includes(q),
    );
  }, [allManifiestos, filtroTipoFilter, search]);

  const tieneFiltros = filtroTipoFilter != null;
  const limpiarFiltros = () => {
    setFiltroTipoFilter(undefined);
  };

  const handleExport = async (id: number, mode: 'pdf' | 'print' | 'xlsx') => {
    if (exporting) return;
    setExporting({ id, mode });
    const labels =
      mode === 'xlsx'
        ? { loading: 'Generando Excel del manifiesto...', success: 'Excel generado', error: 'No se pudo generar el Excel' }
        : mode === 'pdf'
          ? { loading: 'Generando PDF del manifiesto...', success: 'PDF generado', error: 'No se pudo generar el PDF' }
          : { loading: 'Preparando vista de impresión...', success: 'Vista de impresión lista', error: 'No se pudo preparar la impresión' };
    try {
      await notify.run(
        (async () => {
          const detalle = await getManifiesto(id);
          if (mode === 'xlsx') {
            await downloadManifiestoXlsx({
              manifiesto: detalle,
              despachos: detalle.despachos ?? [],
            });
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
        })(),
        labels,
      );
    } catch {
      // notificado por notify.run
    } finally {
      setExporting(null);
    }
  };

  const pagedList = useMemo(
    () => list.slice(page * size, page * size + size),
    [list, page, size],
  );
  const totalPages = Math.max(1, Math.ceil(list.length / Math.max(1, size)));
  useEffect(() => {
    if (page > 0 && page >= totalPages) setPage(totalPages - 1);
  }, [page, totalPages]);

  if (error && allManifiestos.length === 0) {
    return (
      <InlineErrorBanner
        message="Error al cargar manifiestos"
        hint="Verifica tu conexión o intenta de nuevo."
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );
  }

  return (
    <div className="page-stack">
      {error && allManifiestos.length > 0 && (
        <InlineErrorBanner
          message="No se pudieron actualizar los manifiestos"
          hint="Mostrando los resultados anteriores. Reintentando en segundo plano."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      )}
      <ListToolbar
        title="Manifiestos"
        searchPlaceholder="Buscar por #, código, courier o agencia..."
        onSearchChange={setSearch}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo manifiesto
          </Button>
        }
      />

      {isLoading ? (
        <KpiCardsGridSkeleton count={3} withHint />
      ) : (
        allManifiestos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <KpiCard
            icon={<FileText className="h-5 w-5" />}
            label="Total manifiestos"
            value={stats.total}
            tone="primary"
            hint={
              stats.totalDespachos > 0
                ? `${stats.totalDespachos} despachos en total`
                : 'Sin despachos asignados'
            }
          />
          <KpiCard
            icon={<Truck className="h-5 w-5" />}
            label="Despachos agrupados"
            value={stats.totalDespachos}
            tone={stats.totalDespachos > 0 ? 'success' : 'neutral'}
            hint="Suma de despachos en todos los manifiestos"
          />
          <KpiCard
            icon={<CalendarRange className="h-5 w-5" />}
            label="Por período"
            value={stats.porPeriodo}
            tone="neutral"
            hint={
              stats.porCourier > 0 || stats.porAgencia > 0
                ? `${stats.porCourier} courier · ${stats.porAgencia} agencia`
                : undefined
            }
          />
        </div>
        )
      )}

      {isLoading ? (
        <FiltrosBarSkeleton chips={0} filters={1} />
      ) : (
        allManifiestos.length > 0 && tiposPresentes.length > 1 && (
        <FiltrosBar
          hayFiltrosActivos={tieneFiltros}
          onLimpiar={limpiarFiltros}
          chips={
            <ChipFiltro
              label="Todos"
              count={stats.total}
              active={filtroTipoFilter == null}
              onClick={() => setFiltroTipoFilter(undefined)}
            />
          }
          filtros={
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
          }
        />
        )
      )}

      {isLoading ? (
        <ListTableShell>
          <Table className="min-w-[760px] text-left">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[14rem]">Manifiesto</TableHead>
                <TableHead className="hidden w-[14rem] md:table-cell">Periodo</TableHead>
                <TableHead className="hidden min-w-[14rem] lg:table-cell">Filtro</TableHead>
                <TableHead className="w-[7rem] text-center">Despachos</TableHead>
                <TableHead className="w-12 text-right" aria-label="Acciones" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRowsSkeleton
                columns={5}
                columnClasses={{
                  1: 'hidden md:table-cell',
                  2: 'hidden lg:table-cell',
                }}
              />
            </TableBody>
          </Table>
        </ListTableShell>
      ) : allManifiestos.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay manifiestos"
          description="Crea un manifiesto para registrar los despachos enviados en un periodo (a domicilio, agencia o punto de entrega)."
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
            <Table className="min-w-[760px] text-left">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[14rem]">Manifiesto</TableHead>
                  <TableHead className="hidden w-[14rem] md:table-cell">Periodo</TableHead>
                  <TableHead className="hidden min-w-[14rem] lg:table-cell">Filtro</TableHead>
                  <TableHead className="w-[7rem] text-center">Despachos</TableHead>
                  <TableHead className="w-12 text-right" aria-label="Acciones" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedList.map((m) => (
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
                      <div className="mt-1 md:hidden">
                        <PeriodoCell inicio={m.fechaInicio} fin={m.fechaFin} compact />
                      </div>
                    </TableCell>
                    <TableCell className="hidden align-top md:table-cell">
                      <PeriodoCell inicio={m.fechaInicio} fin={m.fechaFin} />
                    </TableCell>
                    <TableCell className="hidden align-top lg:table-cell">
                      <FiltroCell manifiesto={m} />
                    </TableCell>
                    <TableCell className="text-center align-top">
                      <DespachosBadge total={m.cantidadDespachos ?? 0} />
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
          <TablePagination
            page={page}
            size={size}
            totalElements={list.length}
            totalPages={totalPages}
            onPageChange={setPage}
            onSizeChange={setSize}
          />
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
          await notify.run(deleteManifiesto.mutateAsync(deleteConfirmId), {
            loading: 'Eliminando manifiesto...',
            success: 'Manifiesto eliminado',
            error: 'No se pudo eliminar el manifiesto',
          });
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
  compact = false,
}: {
  inicio?: string | null;
  fin?: string | null;
  compact?: boolean;
}) {
  if (!inicio && !fin) {
    return <span className="text-xs italic text-muted-foreground">—</span>;
  }
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <CalendarRange className="h-3 w-3 shrink-0" />
        <span className="tabular-nums">
          {fmtFechaCorta(inicio)} → {fmtFechaCorta(fin)}
        </span>
      </span>
    );
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
  if (m.filtroTipo === 'POR_COURIER_ENTREGA') {
    return (
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Courier de entrega
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate" title={m.filtroCourierEntregaNombre ?? undefined}>
            {m.filtroCourierEntregaNombre ?? '—'}
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
