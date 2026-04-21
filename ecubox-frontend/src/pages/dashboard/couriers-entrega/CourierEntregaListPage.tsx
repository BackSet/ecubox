import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Building2,
  CalendarClock,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Link2,
  Mail,
  Pencil,
  Plus,
  Trash2,
  Truck,
} from 'lucide-react';
import { ChipFiltro } from '@/components/ChipFiltro';
import { FiltrosBar } from '@/components/FiltrosBar';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import {
  useCouriersEntregaPaginados,
  useDeleteCourierEntrega,
} from '@/hooks/useCouriersEntregaAdmin';
import { useSearchPagination } from '@/hooks/useSearchPagination';
import { usePuntosEntregaAdmin } from '@/hooks/usePuntosEntregaAdmin';
import { CourierEntregaForm } from './CourierEntregaForm';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { KpiCardsGridSkeleton } from '@/components/skeletons/KpiCardSkeleton';
import { FiltrosBarSkeleton } from '@/components/skeletons/FiltrosBarSkeleton';
import { InlineErrorBanner } from '@/components/InlineErrorBanner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ListTableShell } from '@/components/ListTableShell';
import { KpiCard } from '@/components/KpiCard';
import { TablePagination } from '@/components/ui/TablePagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api/error-message';
import type { CourierEntrega } from '@/types/despacho';

export function CourierEntregaListPage() {
  const { q, setQ, page, size, setPage, setSize, resetPage } =
    useSearchPagination({ initialSize: 25 });
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useCouriersEntregaPaginados({ q: q.trim() || undefined, page, size });
  const { data: agenciasDist = [] } = usePuntosEntregaAdmin();
  const deleteCourierEntrega = useDeleteCourierEntrega();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [chipActivo, setChipActivo] = useState<
    'todos' | 'con_tracking' | 'sin_tracking' | 'sin_agencias'
  >('todos');

  const all = useMemo<CourierEntrega[]>(() => data?.content ?? [], [data]);
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const agenciasPorCourierEntrega = useMemo(() => {
    const map = new Map<number, number>();
    for (const a of agenciasDist) {
      if (a.courierEntregaId) {
        map.set(a.courierEntregaId, (map.get(a.courierEntregaId) ?? 0) + 1);
      }
    }
    return map;
  }, [agenciasDist]);

  const baseList = useMemo(() => all, [all]);

  const tieneTrackingValido = useCallback(
    (d: CourierEntrega) =>
      !!(d.paginaTracking && /^https?:\/\//i.test(d.paginaTracking)),
    [],
  );

  const chipCounts = useMemo(() => {
    let conTracking = 0;
    let sinTracking = 0;
    let sinAgencias = 0;
    for (const d of baseList) {
      if (tieneTrackingValido(d)) conTracking += 1;
      else sinTracking += 1;
      const ag = agenciasPorCourierEntrega.get(d.id) ?? 0;
      if (ag === 0) sinAgencias += 1;
    }
    return { todos: baseList.length, conTracking, sinTracking, sinAgencias };
  }, [baseList, agenciasPorCourierEntrega, tieneTrackingValido]);

  const list = useMemo(() => {
    if (chipActivo === 'todos') return baseList;
    return baseList.filter((d) => {
      if (chipActivo === 'con_tracking') return tieneTrackingValido(d);
      if (chipActivo === 'sin_tracking') return !tieneTrackingValido(d);
      if (chipActivo === 'sin_agencias')
        return (agenciasPorCourierEntrega.get(d.id) ?? 0) === 0;
      return true;
    });
  }, [baseList, chipActivo, agenciasPorCourierEntrega, tieneTrackingValido]);

  const tieneFiltros = chipActivo !== 'todos' || q.trim().length > 0;
  const limpiarFiltros = useCallback(() => {
    setChipActivo('todos');
    setQ('');
    resetPage();
  }, [resetPage, setQ]);

  const stats = useMemo(() => {
    const total = totalElements;
    const conTracking = all.filter(
      (d) => d.paginaTracking && /^https?:\/\//i.test(d.paginaTracking),
    ).length;
    const conHorario = all.filter((d) => Boolean(d.horarioReparto?.trim())).length;
    const totalAgencias = agenciasDist.length;
    return { total, conTracking, conHorario, totalAgencias };
  }, [all, agenciasDist, totalElements]);

  if (error && !data) {
    return (
      <InlineErrorBanner
        message="Error al cargar couriers de entrega"
        hint="Verifica tu conexión o intenta de nuevo."
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );
  }

  return (
    <div className="page-stack">
      <ListToolbar
        title="Couriers de entrega"
        searchPlaceholder="Buscar por nombre, código, email, horario o página de tracking..."
        value={q}
        onSearchChange={setQ}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo courier de entrega
          </Button>
        }
      />

      {error && (
        <InlineErrorBanner
          message="No se pudieron actualizar los couriers de entrega"
          hint="Mostrando los resultados anteriores. Reintentando en segundo plano."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      )}

      {isLoading ? (
        <KpiCardsGridSkeleton count={4} withHint />
      ) : (
        totalElements > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon={<Truck className="h-4 w-4" />}
            label="Couriers de entrega"
            value={stats.total}
            tone="primary"
            hint={
              stats.total === 1 ? '1 registrado' : `${stats.total} registrados`
            }
          />
          <KpiCard
            icon={<Building2 className="h-4 w-4" />}
            label="Puntos de entrega asociados"
            value={stats.totalAgencias}
            tone="neutral"
            hint="Suma de puntos de entrega de todos los couriers"
          />
          <KpiCard
            icon={<Link2 className="h-4 w-4" />}
            label="Con tracking"
            value={stats.conTracking}
            tone="neutral"
            hint={`${stats.total - stats.conTracking} sin URL configurada`}
          />
          <KpiCard
            icon={<Clock className="h-4 w-4" />}
            label="Con horario"
            value={stats.conHorario}
            tone="neutral"
            hint={`${stats.total - stats.conHorario} sin horario definido`}
          />
        </div>
        )
      )}

      {isLoading ? (
        <FiltrosBarSkeleton chips={5} filters={0} />
      ) : (
        totalElements > 0 && (
        <FiltrosBar
          hayFiltrosActivos={tieneFiltros}
          onLimpiar={limpiarFiltros}
          chips={
            <>
              <ChipFiltro
                label="Todos"
                count={chipCounts.todos}
                active={chipActivo === 'todos'}
                onClick={() => {
                  setChipActivo('todos');
                  resetPage();
                }}
              />
              <ChipFiltro
                label="Con tracking"
                count={chipCounts.conTracking}
                active={chipActivo === 'con_tracking'}
                tone="success"
                onClick={() => {
                  setChipActivo('con_tracking');
                  resetPage();
                }}
                hideWhenZero
              />
              <ChipFiltro
                label="Sin tracking"
                count={chipCounts.sinTracking}
                active={chipActivo === 'sin_tracking'}
                tone="warning"
                onClick={() => {
                  setChipActivo('sin_tracking');
                  resetPage();
                }}
                hideWhenZero
              />
              <ChipFiltro
                label="Sin puntos de entrega"
                count={chipCounts.sinAgencias}
                active={chipActivo === 'sin_agencias'}
                tone="warning"
                onClick={() => {
                  setChipActivo('sin_agencias');
                  resetPage();
                }}
                hideWhenZero
              />
            </>
          }
        />
        )
      )}

      {isLoading ? (
        <ListTableShell>
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[20rem]">Courier de entrega</TableHead>
                <TableHead className="hidden min-w-[14rem] xl:table-cell">Operación</TableHead>
                <TableHead className="min-w-[14rem]">Contacto</TableHead>
                <TableHead className="hidden min-w-[16rem] lg:table-cell">Tracking</TableHead>
                <TableHead className="w-12 text-right" aria-label="Acciones" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRowsSkeleton
                columns={5}
                columnClasses={{
                  1: 'hidden xl:table-cell',
                  3: 'hidden lg:table-cell',
                }}
              />
            </TableBody>
          </Table>
        </ListTableShell>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={totalElements === 0 ? 'No hay couriers de entrega' : 'Sin resultados'}
          description={
            totalElements === 0
              ? 'Registra un courier de entrega para asignarlo a despachos y puntos de entrega.'
              : tieneFiltros
                ? 'No hay couriers de entrega que coincidan con los filtros aplicados.'
                : 'No se encontraron couriers de entrega con ese criterio.'
          }
          action={
            totalElements === 0 ? (
              <Button onClick={() => setCreateOpen(true)}>
                Registrar courier de entrega
              </Button>
            ) : (
              <Button variant="outline" onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            )
          }
        />
      ) : (
        <ListTableShell>
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[20rem]">Courier de entrega</TableHead>
                <TableHead className="hidden min-w-[14rem] xl:table-cell">Operación</TableHead>
                <TableHead className="min-w-[14rem]">Contacto</TableHead>
                <TableHead className="hidden min-w-[16rem] lg:table-cell">Tracking</TableHead>
                <TableHead className="w-12 text-right" aria-label="Acciones" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="max-w-[20rem] align-top">
                    <CourierEntregaCell
                      courierEntrega={d}
                      agenciasCount={agenciasPorCourierEntrega.get(d.id) ?? 0}
                    />
                  </TableCell>
                  <TableCell className="hidden max-w-[16rem] align-top xl:table-cell">
                    <OperacionCell
                      horario={d.horarioReparto}
                      diasMaxRetiroDomicilio={d.diasMaxRetiroDomicilio}
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <ContactoCell email={d.email} />
                  </TableCell>
                  <TableCell className="hidden max-w-[18rem] align-top lg:table-cell">
                    <TrackingCell url={d.paginaTracking} />
                  </TableCell>
                  <TableCell className="align-top text-right">
                    <RowActionsMenu
                      items={[
                        {
                          label: 'Editar courier de entrega',
                          icon: Pencil,
                          onSelect: () => setEditingId(d.id),
                        },
                        { type: 'separator' },
                        {
                          label: 'Eliminar',
                          icon: Trash2,
                          destructive: true,
                          onSelect: () => setDeleteConfirmId(d.id),
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ListTableShell>
      )}

      {totalElements > 0 && (
        <TablePagination
          page={page}
          size={size}
          totalElements={totalElements}
          totalPages={totalPages}
          onPageChange={setPage}
          onSizeChange={setSize}
          loading={isFetching}
        />
      )}

      {createOpen && (
        <CourierEntregaForm
          onClose={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
        />
      )}
      {editingId != null && (
        <CourierEntregaForm
          id={editingId}
          onClose={() => setEditingId(null)}
          onSuccess={() => setEditingId(null)}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="¿Eliminar courier de entrega?"
        description="Esta acción no se puede deshacer. El courier de entrega ya no estará disponible para nuevos despachos ni puntos de entrega."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteCourierEntrega.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          try {
            await deleteCourierEntrega.mutateAsync(deleteConfirmId);
            toast.success('Courier de entrega eliminado');
          } catch (err: unknown) {
            toast.error(
              getApiErrorMessage(err) ?? 'Error al eliminar el courier de entrega',
            );
            throw err;
          }
        }}
      />
    </div>
  );
}

// ============================================================================
// Celdas
// ============================================================================

function CourierEntregaCell({
  courierEntrega,
  agenciasCount,
}: {
  courierEntrega: CourierEntrega;
  agenciasCount: number;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Truck className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-medium text-foreground"
          title={courierEntrega.nombre}
        >
          {courierEntrega.nombre}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          {courierEntrega.codigo ? (
            <CodigoCopyBadge codigo={courierEntrega.codigo} />
          ) : (
            <span className="text-[11px] italic text-muted-foreground">
              Sin código
            </span>
          )}
          {agenciasCount > 0 && (
            <Badge
              variant="outline"
              className="h-5 rounded text-[11px] font-normal"
              title={`${agenciasCount} punto(s) de entrega asociado(s)`}
            >
              <Building2 className="mr-1 h-3 w-3" />
              {agenciasCount} punto{agenciasCount === 1 ? '' : 's'} de entrega
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function CodigoCopyBadge({ codigo }: { codigo: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(codigo);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar el código');
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Badge
        variant="outline"
        className="h-5 rounded font-mono text-[11px] font-normal uppercase"
      >
        {codigo}
      </Badge>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Código copiado' : 'Copiar código'}
        title={copied ? '¡Copiado!' : 'Copiar código'}
        className="rounded p-0.5 text-muted-foreground opacity-60 transition-opacity hover:bg-[var(--color-muted)] hover:text-foreground hover:opacity-100"
      >
        {copied ? (
          <Check className="h-3 w-3 text-[var(--color-success)]" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </span>
  );
}

function ContactoCell({ email }: { email?: string | null }) {
  const e = email?.trim();
  if (!e) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <a
      href={`mailto:${e}`}
      onClick={(ev) => ev.stopPropagation()}
      className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary hover:underline"
      title={`Enviar correo a ${e}`}
    >
      <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{e}</span>
    </a>
  );
}

function OperacionCell({
  horario,
  diasMaxRetiroDomicilio,
}: {
  horario?: string | null;
  diasMaxRetiroDomicilio?: number | null;
}) {
  const h = horario?.trim();
  const dias =
    diasMaxRetiroDomicilio != null && Number(diasMaxRetiroDomicilio) >= 0
      ? Number(diasMaxRetiroDomicilio)
      : null;
  if (!h && dias == null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="space-y-1 text-xs">
      {h && (
        <div className="flex min-w-0 items-start gap-1.5 text-foreground">
          <Clock className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="line-clamp-2" title={h}>
            {h}
          </span>
        </div>
      )}
      {dias != null && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarClock className="h-3 w-3 shrink-0" />
          <span>
            Domicilio hasta {dias} día{dias === 1 ? '' : 's'}
          </span>
        </div>
      )}
    </div>
  );
}

function TrackingCell({ url }: { url?: string | null }) {
  const u = url?.trim();
  if (!u) return <span className="text-xs text-muted-foreground">—</span>;
  const valida = /^https?:\/\/.+/i.test(u);
  if (!valida) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs italic text-muted-foreground"
        title={u}
      >
        <Link2 className="h-3 w-3" />
        URL inválida
      </span>
    );
  }
  return (
    <a
      href={u}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex max-w-full items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline"
      title={u}
    >
      <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{u}</span>
      <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
    </a>
  );
}

