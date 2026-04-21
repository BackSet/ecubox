import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  CalendarDays,
  CalendarRange,
  CircleDollarSign,
  Eye,
  FileText,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { InlineErrorBanner } from '@/components/InlineErrorBanner';
import { KpiCard } from '@/components/KpiCard';
import { ChipFiltro } from '@/components/ChipFiltro';
import { FiltrosBar } from '@/components/FiltrosBar';
import { MonoTrunc } from '@/components/MonoTrunc';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TablePagination } from '@/components/ui/TablePagination';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSearchPagination } from '@/hooks/useSearchPagination';
import {
  useEliminarLiquidacion,
  useLiquidaciones,
} from '@/hooks/useLiquidacion';
import { getApiErrorMessage } from '@/lib/api/error-message';
import type {
  LiquidacionEstadoPagoFiltro,
  LiquidacionResumen,
} from '@/types/liquidacion';
import { NuevaLiquidacionDialog } from './NuevaLiquidacionDialog';
import { formatMoney } from './moneyFormat';

export function LiquidacionesListPage() {
  const navigate = useNavigate();
  const { q, page, size, setQ, setPage, setSize, resetPage } = useSearchPagination({
    initialSize: 20,
  });
  const [estadoPagoFilter, setEstadoPagoFilter] =
    useState<LiquidacionEstadoPagoFiltro>('TODOS');
  const [desdeDoc, setDesdeDoc] = useState<string>('');
  const [hastaDoc, setHastaDoc] = useState<string>('');
  const [desdePago, setDesdePago] = useState<string>('');
  const [hastaPago, setHastaPago] = useState<string>('');
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<LiquidacionResumen | null>(null);

  const params = useMemo(
    () => ({
      desdeDocumento: desdeDoc || undefined,
      hastaDocumento: hastaDoc || undefined,
      desdePago: desdePago || undefined,
      hastaPago: hastaPago || undefined,
      estadoPago: estadoPagoFilter === 'TODOS' ? undefined : estadoPagoFilter,
      q: q.trim() || undefined,
      page,
      size,
    }),
    [desdeDoc, hastaDoc, desdePago, hastaPago, estadoPagoFilter, q, page, size],
  );

  const { data, isLoading, isFetching, error, refetch } = useLiquidaciones(params);

  const { data: dataAll } = useLiquidaciones({ page: 0, size: 1000 });
  const stats = useMemo(() => {
    const all = dataAll?.content ?? [];
    let pagadas = 0;
    let noPagadas = 0;
    let netoAcum = 0;
    for (const l of all) {
      if (l.estadoPago === 'PAGADO') pagadas += 1;
      else noPagadas += 1;
      netoAcum += Number(l.ingresoNeto ?? 0);
    }
    return {
      total: dataAll?.totalElements ?? all.length,
      pagadas,
      noPagadas,
      netoAcum,
    };
  }, [dataAll]);

  const eliminarMutation = useEliminarLiquidacion();

  const items = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  const haySearch = !!q.trim();
  const hayFechas = !!(desdeDoc || hastaDoc || desdePago || hastaPago);
  const hayChip = estadoPagoFilter !== 'TODOS';
  const hayFiltrosActivos = hayFechas || hayChip;

  function limpiarFiltros() {
    setEstadoPagoFilter('TODOS');
    setDesdeDoc('');
    setHastaDoc('');
    setDesdePago('');
    setHastaPago('');
    resetPage();
  }

  async function handleEliminar() {
    if (!confirmDelete) return;
    try {
      await eliminarMutation.mutateAsync(confirmDelete.id);
      toast.success(`Liquidación ${confirmDelete.codigo} eliminada`);
      setConfirmDelete(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'Error al eliminar la liquidación');
    }
  }

  return (
    <div className="page-stack">
      <ListToolbar
        title="Liquidaciones"
        description="Documentos periódicos de cierre con costos al proveedor y costos del courier de entrega."
        searchPlaceholder="Buscar por código (LIQ-...)"
        value={q}
        onSearchChange={setQ}
        actions={
          <Button onClick={() => setNuevaOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nueva liquidación
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<Wallet className="h-5 w-5" />}
          label="Liquidaciones"
          value={stats.total}
          tone="primary"
        />
        <KpiCard
          icon={<CircleDollarSign className="h-5 w-5" />}
          label="No pagadas"
          value={stats.noPagadas}
          tone="warning"
        />
        <KpiCard
          icon={<CircleDollarSign className="h-5 w-5" />}
          label="Pagadas"
          value={stats.pagadas}
          tone="success"
        />
        <KpiCard
          icon={
            stats.netoAcum >= 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )
          }
          label="Ingreso neto acumulado"
          value={formatMoney(stats.netoAcum)}
          tone={stats.netoAcum >= 0 ? 'success' : 'warning'}
        />
      </div>

      <div className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]/50 p-3 md:grid-cols-2">
        <RangoFechas
          icon={<CalendarDays className="h-3.5 w-3.5" />}
          label="Fecha del documento"
          desde={desdeDoc}
          hasta={hastaDoc}
          onDesdeChange={(v) => {
            setDesdeDoc(v);
            resetPage();
          }}
          onHastaChange={(v) => {
            setHastaDoc(v);
            resetPage();
          }}
        />
        <RangoFechas
          icon={<CalendarRange className="h-3.5 w-3.5" />}
          label="Fecha de pago"
          desde={desdePago}
          hasta={hastaPago}
          onDesdeChange={(v) => {
            setDesdePago(v);
            resetPage();
          }}
          onHastaChange={(v) => {
            setHastaPago(v);
            resetPage();
          }}
        />
      </div>

      <FiltrosBar
        hayFiltrosActivos={hayFiltrosActivos}
        onLimpiar={limpiarFiltros}
        chips={
          <>
            <ChipFiltro
              label="Todas"
              count={stats.total}
              active={estadoPagoFilter === 'TODOS'}
              onClick={() => {
                setEstadoPagoFilter('TODOS');
                resetPage();
              }}
            />
            <ChipFiltro
              label="No pagadas"
              count={stats.noPagadas}
              active={estadoPagoFilter === 'NO_PAGADO'}
              tone="warning"
              onClick={() => {
                setEstadoPagoFilter('NO_PAGADO');
                resetPage();
              }}
            />
            <ChipFiltro
              label="Pagadas"
              count={stats.pagadas}
              active={estadoPagoFilter === 'PAGADO'}
              tone="success"
              onClick={() => {
                setEstadoPagoFilter('PAGADO');
                resetPage();
              }}
            />
          </>
        }
      />

      {error && items.length > 0 && (
        <InlineErrorBanner
          message="No se pudieron actualizar las liquidaciones"
          hint="Mostrando los resultados anteriores. Reintentando en segundo plano."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      )}

      {error && items.length === 0 && !isLoading ? (
        <InlineErrorBanner
          message="Error al cargar liquidaciones"
          hint="Verifica tu conexión o intenta de nuevo."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : !isLoading && items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={
            haySearch || hayFiltrosActivos
              ? 'Sin resultados'
              : 'No hay liquidaciones'
          }
          description={
            haySearch || hayFiltrosActivos
              ? 'Ajusta los filtros o limpia la búsqueda para ver más documentos.'
              : 'Crea una nueva liquidación para registrar el cierre de un período.'
          }
          action={
            !haySearch && !hayFiltrosActivos ? (
              <Button onClick={() => setNuevaOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Nueva liquidación
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ListTableShell>
            <Table className="min-w-[1080px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="hidden lg:table-cell">Período</TableHead>
                  <TableHead className="text-center">Consol.</TableHead>
                  <TableHead className="text-center">Despachos</TableHead>
                  <TableHead className="text-right">Margen</TableHead>
                  <TableHead className="text-right">Distribución</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead className="w-32 text-right" aria-label="Acciones" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRowsSkeleton
                    columns={10}
                    columnClasses={{ 2: 'hidden lg:table-cell' }}
                  />
                )}
                {items.map((l) => (
                  <TableRow
                    key={l.id}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate({
                        to: '/liquidaciones/$id',
                        params: { id: String(l.id) },
                      })
                    }
                  >
                    <TableCell>
                      <MonoTrunc value={l.codigo} className="font-medium text-foreground" />
                    </TableCell>
                    <TableCell className="text-xs">
                      <FechaCell value={l.fechaDocumento} />
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                      {formatPeriodo(l.periodoDesde, l.periodoHasta)}
                    </TableCell>
                    <TableCell className="text-center">
                      <CountBadge value={l.totalConsolidados} />
                    </TableCell>
                    <TableCell className="text-center">
                      <CountBadge value={l.totalDespachos} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatMoney(l.margenBruto)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatMoney(l.totalCostoDistribucion)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-mono text-sm font-semibold',
                        Number(l.ingresoNeto ?? 0) < 0
                          ? 'text-[var(--color-warning)]'
                          : 'text-[var(--color-success)]',
                      )}
                    >
                      {formatMoney(l.ingresoNeto)}
                    </TableCell>
                    <TableCell>
                      <PagoBadge estado={l.estadoPago} fechaPago={l.fechaPago} />
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate({
                              to: '/liquidaciones/$id',
                              params: { id: String(l.id) },
                            })
                          }
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          Abrir
                        </Button>
                        <RowActionsMenu
                          items={[
                            {
                              label: 'Eliminar',
                              icon: X,
                              destructive: true,
                              disabled: l.estadoPago === 'PAGADO',
                              onSelect: () => setConfirmDelete(l),
                            },
                          ]}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ListTableShell>

          <TablePagination
            page={page}
            size={size}
            totalElements={totalElements}
            totalPages={totalPages}
            onPageChange={setPage}
            onSizeChange={setSize}
            loading={isFetching}
          />
        </>
      )}

      <NuevaLiquidacionDialog
        open={nuevaOpen}
        onOpenChange={setNuevaOpen}
        onCreated={(liq) =>
          navigate({ to: '/liquidaciones/$id', params: { id: String(liq.id) } })
        }
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={`Eliminar liquidación ${confirmDelete?.codigo ?? ''}`}
        description="Se eliminarán todas las líneas (consolidados y despachos) asociadas. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={eliminarMutation.isPending}
        onConfirm={handleEliminar}
      />
    </div>
  );
}

function RangoFechas({
  icon,
  label,
  desde,
  hasta,
  onDesdeChange,
  onHastaChange,
}: {
  icon: React.ReactNode;
  label: string;
  desde: string;
  hasta: string;
  onDesdeChange: (v: string) => void;
  onHastaChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </Label>
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="date"
          value={desde}
          onChange={(e) => onDesdeChange(e.target.value)}
          aria-label={`${label} desde`}
        />
        <Input
          type="date"
          value={hasta}
          onChange={(e) => onHastaChange(e.target.value)}
          aria-label={`${label} hasta`}
        />
      </div>
    </div>
  );
}

function CountBadge({ value }: { value?: number }) {
  const v = value ?? 0;
  return (
    <span
      className={cn(
        'inline-flex min-w-[2rem] items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium',
        v === 0
          ? 'border-border bg-[var(--color-muted)]/40 text-muted-foreground'
          : 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 text-[var(--color-primary)]',
      )}
    >
      {v}
    </span>
  );
}

function PagoBadge({
  estado,
  fechaPago,
}: {
  estado: LiquidacionResumen['estadoPago'];
  fechaPago?: string;
}) {
  const isPagado = estado === 'PAGADO';
  return (
    <div className="flex flex-col leading-tight">
      <span
        className={cn(
          'inline-flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
          isPagado
            ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]'
            : 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
        )}
      >
        <CircleDollarSign className="h-3 w-3" />
        {isPagado ? 'Pagada' : 'No pagada'}
      </span>
      {isPagado && fechaPago && (
        <span className="mt-0.5 text-[11px] text-muted-foreground">
          {formatDateTime(fechaPago)}
        </span>
      )}
    </div>
  );
}

function FechaCell({ value }: { value?: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const date = parseLocalDate(value);
  if (!date) return <span className="text-muted-foreground">—</span>;
  return <span>{date.toLocaleDateString()}</span>;
}

function parseLocalDate(value: string): Date | null {
  if (!value) return null;
  const onlyDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const d = onlyDate ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatPeriodo(desde?: string, hasta?: string): string {
  if (!desde && !hasta) return '—';
  const f = (s?: string) => {
    const d = s ? parseLocalDate(s) : null;
    return d ? d.toLocaleDateString() : '—';
  };
  if (desde && hasta) return `${f(desde)} – ${f(hasta)}`;
  if (desde) return `desde ${f(desde)}`;
  return `hasta ${f(hasta)}`;
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}
