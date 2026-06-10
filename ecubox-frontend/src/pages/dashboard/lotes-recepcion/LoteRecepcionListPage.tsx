import { useCallback, useMemo, useState } from 'react';
import { TablePagination } from '@/components/ui/TablePagination';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  CalendarClock,
  Eye,
  FileText,
  PackageCheck,
  Plus,
  Trash2,
  UserCircle2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useDeleteLoteRecepcion,
  useLotesRecepcionPaginated,
  useLoteRecepcionResumen,
} from '@/hooks/useLotesRecepcion';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { InlineErrorBanner } from '@/components/InlineErrorBanner';
import { PageErrorState } from '@/components/PageErrorState';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { KpiCardsGridSkeleton } from '@/components/skeletons/KpiCardSkeleton';
import { FiltrosBarSkeleton } from '@/components/skeletons/FiltrosBarSkeleton';
import { FiltrosBar, FiltroCampo } from '@/components/FiltrosBar';
import { ListTableShell } from '@/components/ListTableShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { KpiCard } from '@/components/KpiCard';
import { KpiCardsGrid } from '@/components/KpiCardsGrid';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api/error-message';
import type { LoteRecepcion } from '@/types/lote-recepcion';
import { useAuthStore } from '@/stores/authStore';

const SIN_FILTRO = '__todos__';
type Periodo = typeof SIN_FILTRO | 'hoy' | '7d' | '30d' | 'mes' | 'custom';

/** Formatea una fecha local como yyyy-MM-dd (formato que espera el backend). */
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Resuelve el rango de fechas (inclusive, yyyy-MM-dd) que se envía al servidor
 * según el período seleccionado o los inputs personalizados. Devuelve campos
 * vacíos cuando no hay restricción de fecha.
 */
function rangoFechas(
  periodo: Periodo,
  desde: string,
  hasta: string,
): { desde?: string; hasta?: string } {
  if (periodo === 'custom') {
    return { desde: desde || undefined, hasta: hasta || undefined };
  }
  if (periodo === SIN_FILTRO) return {};
  const ahora = new Date();
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  if (periodo === 'hoy') return { desde: ymd(hoy), hasta: ymd(hoy) };
  if (periodo === '7d') {
    const f = new Date(hoy);
    f.setDate(f.getDate() - 6);
    return { desde: ymd(f), hasta: ymd(hoy) };
  }
  if (periodo === '30d') {
    const f = new Date(hoy);
    f.setDate(f.getDate() - 29);
    return { desde: ymd(f), hasta: ymd(hoy) };
  }
  // mes en curso: del día 1 al último día del mes.
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
  return { desde: ymd(inicioMes), hasta: ymd(finMes) };
}

export function LoteRecepcionListPage() {
  const navigate = useNavigate();
  const deleteLote = useDeleteLoteRecepcion();
  const hasLotesCreate = useAuthStore((s) => s.hasPermission('LOTES_RECEPCION_CREATE'));
  const hasLotesDelete = useAuthStore((s) => s.hasPermission('LOTES_RECEPCION_DELETE'));
  const [search, setSearchRaw] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [operarioFiltro, setOperarioFiltroRaw] = useState<string | undefined>(
    undefined,
  );
  const [periodo, setPeriodoRaw] = useState<Periodo>(SIN_FILTRO);
  const [desde, setDesdeRaw] = useState('');
  const [hasta, setHastaRaw] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSizeRaw] = useState(25);
  const setSearch = (v: string) => { setSearchRaw(v); setPage(0); };
  const setOperarioFiltro = (v: string | undefined) => { setOperarioFiltroRaw(v); setPage(0); };
  const setPeriodo = (v: Periodo) => { setPeriodoRaw(v); setPage(0); };
  const setDesde = (v: string) => { setDesdeRaw(v); setPage(0); };
  const setHasta = (v: string) => { setHastaRaw(v); setPage(0); };
  const setSize = (v: number) => { setSizeRaw(v); setPage(0); };

  // Rango de fechas server-side derivado del período o de los inputs custom.
  const { desde: desdeParam, hasta: hastaParam } = useMemo(
    () => rangoFechas(periodo, desde, hasta),
    [periodo, desde, hasta],
  );

  // Resumen liviano (KPIs del universo + operarios para el dropdown).
  const resumenQuery = useLoteRecepcionResumen();
  const resumen = resumenQuery.data;
  const operarios = resumen?.operarios ?? [];
  const stats = {
    total: resumen?.total ?? 0,
    paquetes: resumen?.paquetes ?? 0,
    guiasUnicas: resumen?.guiasUnicas ?? 0,
    hoy: resumen?.hoy ?? 0,
  };

  // Tabla paginada server-side (búsqueda + operario + rango de fechas).
  const pageQuery = useLotesRecepcionPaginated({
    q: search.trim() || undefined,
    operario: operarioFiltro,
    desde: desdeParam,
    hasta: hastaParam,
    page,
    size,
  });
  const list = pageQuery.data?.content ?? [];
  const totalElements = pageQuery.data?.totalElements ?? 0;
  const totalPages = pageQuery.data?.totalPages ?? 0;

  const isLoading = pageQuery.isLoading;
  const isFetching = pageQuery.isFetching || resumenQuery.isFetching;
  const error = pageQuery.error;
  const refetch = () => {
    pageQuery.refetch();
    resumenQuery.refetch();
  };

  const tieneFiltros =
    !!operarioFiltro || periodo !== SIN_FILTRO || desde !== '' || hasta !== '';

  const limpiarFiltros = useCallback(() => {
    setOperarioFiltro(undefined);
    setPeriodo(SIN_FILTRO);
    setDesde('');
    setHasta('');
  }, []);

  if (error && totalElements === 0) {
    return (
      <PageErrorState
        message="Error al cargar lotes de recepción"
        hint="Verifica tu conexión o intenta de nuevo."
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );
  }

  const hayLotes = stats.total > 0;

  return (
    <div className="page-stack">
      {error && list.length > 0 && (
        <InlineErrorBanner
          message="No se pudieron actualizar los lotes"
          hint="Mostrando los resultados anteriores. Reintentando en segundo plano."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      )}
      <ListToolbar
        title="Lotes de recepción"
        searchPlaceholder="Buscar por #, observaciones, operario o número de guía..."
        onSearchChange={setSearch}
        actions={
          hasLotesCreate && (
          <Link to="/lotes-recepcion/nuevo">
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Registrar nuevo lote
            </Button>
          </Link>
          )
        }
      />

      {isLoading ? (
        <KpiCardsGridSkeleton count={3} />
      ) : (
        hayLotes && (
        <KpiCardsGrid>
          <KpiCard
            icon={<PackageCheck className="h-5 w-5" />}
            label="Lotes registrados"
            value={stats.total}
            tone="primary"
            hint={`${stats.paquetes} paquete(s) recibidos`}
          />
          <KpiCard
            icon={<FileText className="h-5 w-5" />}
            label="Guías únicas"
            value={stats.guiasUnicas}
            tone="neutral"
            hint="Guías distintas en recepción"
          />
          <KpiCard
            icon={<CalendarClock className="h-5 w-5" />}
            label="Lotes hoy"
            value={stats.hoy}
            tone={stats.hoy > 0 ? 'warning' : 'neutral'}
            hint={
              stats.hoy > 0
                ? 'Recepciones del día actual'
                : 'Sin lotes hoy'
            }
          />
        </KpiCardsGrid>
        )
      )}

      {isLoading ? (
        <FiltrosBarSkeleton chips={0} filters={2} />
      ) : (
        hayLotes && (
        <FiltrosBar
          hayFiltrosActivos={tieneFiltros}
          onLimpiar={limpiarFiltros}
          filtros={
            <>
              <FiltroCampo label="Operario" width="w-[14rem]">
                <SearchableCombobox<string>
                  value={operarioFiltro}
                  onChange={(v) =>
                    setOperarioFiltro(v === undefined ? undefined : String(v))
                  }
                  options={operarios}
                  getKey={(n) => n}
                  getLabel={(n) => n}
                  placeholder="Todos"
                  searchPlaceholder="Buscar operario..."
                  emptyMessage="Sin operarios"
                  className="h-9 w-full"
                />
              </FiltroCampo>
              <FiltroCampo label="Período" width="w-[12rem]">
                <Select
                  value={periodo}
                  onValueChange={(v) => setPeriodo(v as Periodo)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_FILTRO}>Cualquier fecha</SelectItem>
                    <SelectItem value="hoy">Hoy</SelectItem>
                    <SelectItem value="7d">Últimos 7 días</SelectItem>
                    <SelectItem value="30d">Últimos 30 días</SelectItem>
                    <SelectItem value="mes">Este mes</SelectItem>
                    <SelectItem value="custom">Personalizado…</SelectItem>
                  </SelectContent>
                </Select>
              </FiltroCampo>
              {periodo === 'custom' && (
                <>
                  <FiltroCampo label="Desde" htmlFor="filtro-desde" width="w-[10rem]">
                    <Input
                      id="filtro-desde"
                      type="date"
                      value={desde}
                      onChange={(e) => setDesde(e.target.value)}
                      max={hasta || undefined}
                      className="h-9 w-full"
                    />
                  </FiltroCampo>
                  <FiltroCampo label="Hasta" htmlFor="filtro-hasta" width="w-[10rem]">
                    <Input
                      id="filtro-hasta"
                      type="date"
                      value={hasta}
                      onChange={(e) => setHasta(e.target.value)}
                      min={desde || undefined}
                      className="h-9 w-full"
                    />
                  </FiltroCampo>
                </>
              )}
            </>
          }
        />
        )
      )}

      {isLoading ? (
        <ListTableShell>
          <Table className="min-w-[820px] text-left">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[14rem]">Recepción</TableHead>
                <TableHead>Paquetes</TableHead>
                <TableHead>Guías</TableHead>
                <TableHead className="min-w-[14rem]">Operario</TableHead>
                <TableHead className="hidden min-w-[14rem] md:table-cell">Observaciones</TableHead>
                <TableHead className="w-12 text-right" aria-label="Acciones" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRowsSkeleton
                columns={6}
                columnClasses={{ 4: 'hidden md:table-cell' }}
              />
            </TableBody>
          </Table>
        </ListTableShell>
      ) : stats.total === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="No hay lotes de recepción"
          description='Registra un lote desde el botón "Registrar nuevo lote". Solo se incluirán las guías que tengan paquetes en el sistema.'
          action={
            hasLotesCreate ? (
            <Link to="/lotes-recepcion/nuevo">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Registrar nuevo lote
              </Button>
            </Link>
            ) : undefined
          }
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="Sin resultados"
          description={
            tieneFiltros || search.trim() !== ''
              ? 'No hay lotes que coincidan con los filtros aplicados.'
              : 'No hay lotes que coincidan con la búsqueda.'
          }
          action={
            tieneFiltros ? (
              <Button variant="outline" onClick={limpiarFiltros}>
                <X className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {totalElements} lote{totalElements === 1 ? '' : 's'}
            {totalElements !== stats.total ? ` de ${stats.total}` : ''}
          </p>
          <ListTableShell>
            <Table className="min-w-[820px] text-left">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[14rem]">Recepción</TableHead>
                  <TableHead>Paquetes</TableHead>
                  <TableHead>Guías</TableHead>
                  <TableHead className="min-w-[14rem]">Operario</TableHead>
                  <TableHead className="hidden min-w-[14rem] md:table-cell">Observaciones</TableHead>
                  <TableHead className="w-12 text-right" aria-label="Acciones" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((l) => (
                  <TableRow
                    key={l.id}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate({
                        to: '/lotes-recepcion/$id',
                        params: { id: String(l.id) },
                      })
                    }
                  >
                    <TableCell className="align-top">
                      <RecepcionCell lote={l} />
                    </TableCell>
                    <TableCell className="align-top">
                      <PaquetesBadge total={l.totalPaquetes ?? 0} />
                    </TableCell>
                    <TableCell className="align-top">
                      <GuiasCount total={l.numeroGuiasEnvio?.length ?? 0} />
                    </TableCell>
                    <TableCell className="align-top">
                      <OperarioCell nombre={l.operarioNombre} />
                    </TableCell>
                    <TableCell className="hidden max-w-[18rem] align-top md:table-cell">
                      <ObservacionesCell texto={l.observaciones} />
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
                                to: '/lotes-recepcion/$id',
                                params: { id: String(l.id) },
                              }),
                          },
                          { type: 'separator' },
                          {
                            label: 'Eliminar lote',
                            icon: Trash2,
                            destructive: true,
                            hidden: !hasLotesDelete,
                            onSelect: () => setDeleteConfirmId(l.id),
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
            totalElements={totalElements}
            totalPages={totalPages}
            onPageChange={setPage}
            onSizeChange={setSize}
          />
        </>
      )}

      <ConfirmDialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="¿Eliminar lote de recepción?"
        description="Se eliminará el lote y se revertirá el estado de los paquetes asociados cuando aplique. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteLote.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          try {
            const result = await deleteLote.mutateAsync(deleteConfirmId);
            const reverted = result.paquetesRevertidos ?? 0;
            toast.success(
              reverted > 0
                ? `Lote eliminado. ${reverted} paquete${reverted === 1 ? '' : 's'} volvieron al estado anterior.`
                : 'Lote eliminado correctamente',
            );
          } catch (err: unknown) {
            toast.error(getApiErrorMessage(err) ?? 'Error al eliminar el lote');
            throw err;
          }
        }}
      />
    </div>
  );
}

function RecepcionCell({ lote }: { lote: LoteRecepcion }) {
  const d = lote.fechaRecepcion ? new Date(lote.fechaRecepcion) : null;
  const valido = d && !Number.isNaN(d.getTime());
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs font-mono text-muted-foreground">#{lote.id}</span>
      {valido ? (
        <>
          <span className="text-sm font-medium text-foreground">
            {d!.toLocaleDateString('es-EC', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {d!.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
            {' · '}
            {relativeTime(d!) ?? ''}
          </span>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )}
    </div>
  );
}

function OperarioCell({ nombre }: { nombre?: string | null }) {
  if (!nombre) {
    return <span className="text-xs italic text-muted-foreground">—</span>;
  }
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <UserCircle2 className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate" title={nombre}>
        {nombre}
      </span>
    </div>
  );
}

function GuiasCount({ total }: { total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Badge
        className={
          total > 0
            ? 'bg-primary/10 text-primary hover:bg-primary/15'
            : 'bg-[var(--color-muted)] text-muted-foreground hover:bg-[var(--color-muted)]'
        }
      >
        {total}
      </Badge>
      <span className="text-xs text-muted-foreground">
        guía{total === 1 ? '' : 's'}
      </span>
    </div>
  );
}

function PaquetesBadge({ total }: { total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Badge
        className={
          total > 0
            ? 'bg-primary/10 text-primary hover:bg-primary/15'
            : 'bg-[var(--color-muted)] text-muted-foreground hover:bg-[var(--color-muted)]'
        }
      >
        {total}
      </Badge>
      <span className="text-xs text-muted-foreground">
        paquete{total === 1 ? '' : 's'}
      </span>
    </div>
  );
}

function ObservacionesCell({ texto }: { texto?: string | null }) {
  const t = texto?.trim();
  if (!t) {
    return <span className="text-xs italic text-muted-foreground">Sin observaciones</span>;
  }
  return (
    <p
      className="line-clamp-2 break-words text-sm text-muted-foreground"
      title={t}
    >
      {t}
    </p>
  );
}

function relativeTime(date: Date): string | null {
  const diffMs = date.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  if (abs < 60) return rtf.format(diffSec, 'second');
  const min = Math.round(diffSec / 60);
  if (Math.abs(min) < 60) return rtf.format(min, 'minute');
  const hr = Math.round(min / 60);
  if (Math.abs(hr) < 24) return rtf.format(hr, 'hour');
  const day = Math.round(hr / 24);
  if (Math.abs(day) < 30) return rtf.format(day, 'day');
  const month = Math.round(day / 30);
  if (Math.abs(month) < 12) return rtf.format(month, 'month');
  const year = Math.round(month / 12);
  return rtf.format(year, 'year');
}
