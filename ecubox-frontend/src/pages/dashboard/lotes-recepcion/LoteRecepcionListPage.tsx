import { useCallback, useEffect, useMemo, useState } from 'react';
import { TablePagination } from '@/components/ui/TablePagination';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  Boxes,
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
import { useDeleteLoteRecepcion, useLotesRecepcion } from '@/hooks/useLotesRecepcion';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { InlineErrorBanner } from '@/components/InlineErrorBanner';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { KpiCardsGridSkeleton } from '@/components/skeletons/KpiCardSkeleton';
import { FiltrosBarSkeleton } from '@/components/skeletons/FiltrosBarSkeleton';
import { ListTableShell } from '@/components/ListTableShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { KpiCard } from '@/components/KpiCard';
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

const SIN_FILTRO = '__todos__';
type Periodo = typeof SIN_FILTRO | 'hoy' | '7d' | '30d' | 'mes' | 'custom';

/**
 * Devuelve el rango [inicio, fin) en milisegundos para un periodo dado, o
 * null si el periodo no implica un rango fijo (todos / personalizado).
 * El "fin" es exclusivo (00:00 del dia siguiente).
 */
function rangoDePeriodo(p: Periodo): { from: number; to: number } | null {
  if (p === SIN_FILTRO || p === 'custom') return null;
  const ahora = new Date();
  const inicioHoy = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate(),
  );
  const dia = 24 * 60 * 60 * 1000;
  if (p === 'hoy') {
    return { from: inicioHoy.getTime(), to: inicioHoy.getTime() + dia };
  }
  if (p === '7d') {
    return {
      from: inicioHoy.getTime() - 6 * dia,
      to: inicioHoy.getTime() + dia,
    };
  }
  if (p === '30d') {
    return {
      from: inicioHoy.getTime() - 29 * dia,
      to: inicioHoy.getTime() + dia,
    };
  }
  // mes en curso
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const inicioMesSig = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
  return { from: inicioMes.getTime(), to: inicioMesSig.getTime() };
}

/**
 * Convierte un input type="date" (yyyy-mm-dd) a timestamp en hora local.
 * Si el input esta vacio o invalido, retorna null.
 */
function dateInputAMs(s: string, finDelDia: boolean): number | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d, finDelDia ? 23 : 0, finDelDia ? 59 : 0, finDelDia ? 59 : 0, finDelDia ? 999 : 0);
  return date.getTime();
}

export function LoteRecepcionListPage() {
  const navigate = useNavigate();
  const { data: lotes, isLoading, isFetching, error, refetch } = useLotesRecepcion();
  const deleteLote = useDeleteLoteRecepcion();
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

  // Operarios distintos presentes en los lotes, para poblar el dropdown.
  const operarios = useMemo(() => {
    const set = new Set<string>();
    for (const l of lotes ?? []) {
      const n = l.operarioNombre?.trim();
      if (n) set.add(n);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' }),
    );
  }, [lotes]);

  const list = useMemo(() => {
    const raw = lotes ?? [];
    const q = search.trim().toLowerCase();

    // Resolver el rango de fecha activo. Si periodo === 'custom' usamos
    // los inputs desde/hasta; si no, derivamos del periodo seleccionado.
    let rango: { from: number; to: number } | null = null;
    if (periodo === 'custom') {
      const from = dateInputAMs(desde, false);
      const to = dateInputAMs(hasta, true);
      if (from != null || to != null) {
        rango = {
          from: from ?? Number.NEGATIVE_INFINITY,
          to: to ?? Number.POSITIVE_INFINITY,
        };
      }
    } else {
      rango = rangoDePeriodo(periodo);
    }

    return raw.filter((l) => {
      if (operarioFiltro && (l.operarioNombre ?? '') !== operarioFiltro) {
        return false;
      }
      if (rango) {
        const t = l.fechaRecepcion ? new Date(l.fechaRecepcion).getTime() : NaN;
        if (Number.isNaN(t)) return false;
        if (t < rango.from || t > rango.to) return false;
      }
      if (!q) return true;
      return (
        String(l.id).includes(q) ||
        (l.observaciones?.toLowerCase().includes(q) ?? false) ||
        (l.operarioNombre?.toLowerCase().includes(q) ?? false) ||
        (l.numeroGuiasEnvio?.some((g) => g.toLowerCase().includes(q)) ?? false)
      );
    });
  }, [lotes, search, operarioFiltro, periodo, desde, hasta]);

  const tieneFiltros =
    !!operarioFiltro || periodo !== SIN_FILTRO || desde !== '' || hasta !== '';

  const limpiarFiltros = useCallback(() => {
    setOperarioFiltro(undefined);
    setPeriodo(SIN_FILTRO);
    setDesde('');
    setHasta('');
  }, []);

  const stats = useMemo(() => {
    const all = lotes ?? [];
    if (all.length === 0) {
      return { total: 0, paquetes: 0, hoy: 0, guiasUnicas: 0 };
    }
    const guias = new Set<string>();
    let paquetes = 0;
    let hoy = 0;
    const ahora = new Date();
    const hoyStr = `${ahora.getFullYear()}-${ahora.getMonth()}-${ahora.getDate()}`;
    for (const l of all) {
      paquetes += l.totalPaquetes ?? 0;
      l.numeroGuiasEnvio?.forEach((g) => guias.add(g));
      if (l.fechaRecepcion) {
        const d = new Date(l.fechaRecepcion);
        if (!Number.isNaN(d.getTime())) {
          const dStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          if (dStr === hoyStr) hoy += 1;
        }
      }
    }
    return { total: all.length, paquetes, hoy, guiasUnicas: guias.size };
  }, [lotes]);

  const pagedList = useMemo(
    () => list.slice(page * size, page * size + size),
    [list, page, size],
  );
  const totalPages = Math.max(1, Math.ceil(list.length / Math.max(1, size)));
  useEffect(() => {
    if (page > 0 && page >= totalPages) setPage(totalPages - 1);
  }, [page, totalPages]);

  if (error && (!lotes || lotes.length === 0)) {
    return (
      <InlineErrorBanner
        message="Error al cargar lotes de recepción"
        hint="Verifica tu conexión o intenta de nuevo."
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );
  }

  const allLotes = lotes ?? [];

  return (
    <div className="page-stack">
      {error && allLotes.length > 0 && (
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
          <Link to="/lotes-recepcion/nuevo">
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Registrar nuevo lote
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <KpiCardsGridSkeleton count={4} />
      ) : (
        allLotes.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon={<PackageCheck className="h-5 w-5" />}
            label="Lotes registrados"
            value={stats.total}
            tone="primary"
          />
          <KpiCard
            icon={<Boxes className="h-5 w-5" />}
            label="Paquetes recibidos"
            value={stats.paquetes}
            tone="success"
          />
          <KpiCard
            icon={<FileText className="h-5 w-5" />}
            label="Guías únicas"
            value={stats.guiasUnicas}
            tone="neutral"
          />
          <KpiCard
            icon={<CalendarClock className="h-5 w-5" />}
            label="Lotes hoy"
            value={stats.hoy}
            tone={stats.hoy > 0 ? 'warning' : 'neutral'}
          />
        </div>
        )
      )}

      {isLoading ? (
        <FiltrosBarSkeleton chips={0} filters={2} />
      ) : (
        allLotes.length > 0 && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Operario
            </span>
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
              className="h-9 w-[14rem]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Período
            </span>
            <Select
              value={periodo}
              onValueChange={(v) => setPeriodo(v as Periodo)}
            >
              <SelectTrigger className="h-9 w-[12rem]">
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
          </div>
          {periodo === 'custom' && (
            <>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="filtro-desde"
                  className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Desde
                </label>
                <Input
                  id="filtro-desde"
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  max={hasta || undefined}
                  className="h-9 w-[10rem]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="filtro-hasta"
                  className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Hasta
                </label>
                <Input
                  id="filtro-hasta"
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  min={desde || undefined}
                  className="h-9 w-[10rem]"
                />
              </div>
            </>
          )}
          {tieneFiltros && (
            <Button
              type="button"
              variant="ghost"
              onClick={limpiarFiltros}
              className="ml-auto h-9 gap-1.5 whitespace-nowrap"
            >
              <X className="h-3.5 w-3.5 shrink-0" />
              <span>Limpiar filtros</span>
            </Button>
          )}
        </div>
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
      ) : allLotes.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="No hay lotes de recepción"
          description='Registra un lote desde el botón "Registrar nuevo lote". Solo se incluirán las guías que tengan paquetes en el sistema.'
          action={
            <Link to="/lotes-recepcion/nuevo">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Registrar nuevo lote
              </Button>
            </Link>
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
            {list.length} lote{list.length === 1 ? '' : 's'}
            {list.length !== allLotes.length ? ` de ${allLotes.length}` : ''}
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
                {pagedList.map((l) => (
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
            totalElements={list.length}
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
