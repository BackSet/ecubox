import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  CalendarClock,
  CheckCircle2,
  Eye,
  FileDown,
  FileSpreadsheet,
  Loader2,
  MapPin,
  PackageCheck,
  Printer,
  Scale,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SurfaceCard } from '@/components/ui/surface-card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MonoTrunc } from '@/components/MonoTrunc';
import { RowActionsMenu, type RowActionEntry } from '@/components/RowActionsMenu';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { obtenerMiDespacho } from '@/lib/api/mis-despachos.service';
import { formatWeightInline, normalizeWeight } from '@/lib/utils/weight';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useConfirmarEntrega, useMisDespachos } from '@/hooks/useMisDespachos';
import type { MiDespacho } from '@/types/mis-despacho';
import { TablePagination } from '@/components/ui/TablePagination';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import {
  ListToolbar,
  ListTableShell,
  FiltrosBar,
  FiltroCampo,
  ChipFiltro,
  KpiCard,
  KpiCardsGrid,
  EmptyState,
  PageErrorState,
  InlineErrorBanner,
} from '@/components/page-components';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  buildEntregaHaystack,
  modalidadBadgeClass,
  modalidadIcon,
  modalidadIconBgClass,
  modalidadLabel,
} from './entregaPresentacion';

type ModalidadFiltro = 'TODOS' | 'DOMICILIO' | 'AGENCIA' | 'AGENCIA_COURIER_ENTREGA';

type ExportMode = 'pdf' | 'print' | 'xlsx';
type ExportingState = { id: number; mode: ExportMode } | null;

function formatFecha(fecha?: string | null): string {
  if (!fecha) return '-';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Peso del cliente como "18.40 lbs · 8.35 kg" (o null si no hay peso). */
function pesoInline(d: MiDespacho): string | null {
  const w = normalizeWeight(d.pesoLbsTotal, d.pesoKgTotal);
  if (!w || w.lbs <= 0) return null;
  return formatWeightInline(w.lbs, w.kg);
}

function paquetesLabel(total: number): string {
  return `${total} paquete${total === 1 ? '' : 's'}`;
}

export function MisEntregasPage() {
  const navigate = useNavigate();
  const { data: despachos = [], isLoading, isFetching, error, refetch } = useMisDespachos();
  const confirmar = useConfirmarEntrega();
  const puedeConfirmar = useAuthStore((s) => s.hasPermission('MIS_ENTREGAS_CONFIRM'));
  const puedeExportar = useAuthStore(
    (s) =>
      s.hasPermission('MIS_ENTREGAS_EXPORT') ||
      s.hasPermission('ACCESO_ENLACE_MIS_ENTREGAS_EXPORT'),
  );
  const [exportingId, setExportingId] = useState<ExportingState>(null);

  const [search, setSearchRaw] = useState('');
  const [estadoFiltro, setEstadoFiltroRaw] = useState<'TODAS' | 'PENDIENTES' | 'CONFIRMADOS'>('TODAS');
  const [tipoFiltro, setTipoFiltroRaw] = useState<ModalidadFiltro>('TODOS');
  const [page, setPage] = useState(0);
  const [size, setSizeRaw] = useState(25);

  const setSearch = (v: string) => { setSearchRaw(v); setPage(0); };
  const setEstadoFiltro = (v: 'TODAS' | 'PENDIENTES' | 'CONFIRMADOS') => { setEstadoFiltroRaw(v); setPage(0); };
  const setTipoFiltro = (v: ModalidadFiltro) => { setTipoFiltroRaw(v); setPage(0); };
  const setSize = (v: number) => { setSizeRaw(v); setPage(0); };

  const limpiarFiltros = () => {
    setEstadoFiltroRaw('TODAS');
    setTipoFiltroRaw('TODOS');
    setPage(0);
  };

  const stats = useMemo(() => {
    const pendientes = despachos.filter((d) => !d.entregaConfirmada).length;
    const listas = despachos.filter((d) => d.confirmable && !d.entregaConfirmada).length;
    const recibidas = despachos.filter((d) => d.entregaConfirmada).length;
    return { pendientes, listas, recibidas };
  }, [despachos]);

  const countPendientes = useMemo(() => despachos.filter(d => !d.entregaConfirmada).length, [despachos]);
  const countConfirmados = useMemo(() => despachos.filter(d => d.entregaConfirmada).length, [despachos]);

  // El filtro "Modalidad" solo aporta si hay variedad de modalidades.
  const tiposPresentes = useMemo(() => {
    const set = new Set<string>();
    for (const d of despachos) if (d.tipoEntrega) set.add(d.tipoEntrega);
    return set;
  }, [despachos]);

  const onConfirmar = async (id: number) => {
    try {
      await confirmar.mutateAsync(id);
      toast.success('¡Gracias! Confirmaste la entrega de tu envío.');
    } catch (e) {
      toast.error(getApiErrorMessage(e) ?? 'No se pudo confirmar la entrega');
    }
  };

  const handleExportar = async (id: number, mode: ExportMode) => {
    if (exportingId) return;
    setExportingId({ id, mode });
    try {
      const detalle = await obtenerMiDespacho(id);
      if (mode === 'xlsx') {
        const { downloadMiDespachoXlsx } = await import('@/lib/xlsx/miDespachoXlsx');
        await downloadMiDespachoXlsx(detalle);
      } else {
        const [{ buildMiDespachoPdf }, { runJsPdfAction }] = await Promise.all([
          import('@/lib/pdf/builders/miDespachoPdf'),
          import('@/lib/pdf/actions'),
        ]);
        const doc = buildMiDespachoPdf(detalle);
        runJsPdfAction(doc, {
          mode: mode === 'pdf' ? 'download' : 'print',
          filename: `mis-entregas-${detalle.numeroGuia ?? detalle.despachoId}.pdf`,
        });
      }
    } catch {
      toast.error('No se pudo exportar la entrega');
    } finally {
      setExportingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return despachos.filter((d) => {
      if (estadoFiltro === 'PENDIENTES' && d.entregaConfirmada) return false;
      if (estadoFiltro === 'CONFIRMADOS' && !d.entregaConfirmada) return false;
      if (tipoFiltro !== 'TODOS' && d.tipoEntrega !== tipoFiltro) return false;

      if (!q) return true;
      return buildEntregaHaystack(d).includes(q);
    });
  }, [despachos, search, estadoFiltro, tipoFiltro]);

  const paquetesFiltrados = useMemo(
    () => filtered.reduce((total, d) => total + d.totalPiezas, 0),
    [filtered],
  );
  const hayFiltrosActivos = estadoFiltro !== 'TODAS' || tipoFiltro !== 'TODOS';
  const filtrosActivosCount = (estadoFiltro !== 'TODAS' ? 1 : 0) + (tipoFiltro !== 'TODOS' ? 1 : 0);

  const pagedFiltered = useMemo(
    () => filtered.slice(page * size, page * size + size),
    [filtered, page, size],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / Math.max(1, size)));
  useEffect(() => {
    if (page > 0 && page >= totalPages) setPage(totalPages - 1);
  }, [page, totalPages]);

  if (error && !despachos.length) {
    return (
      <PageErrorState
        message="No se pudieron cargar tus entregas"
        hint="Verifica tu conexión o intenta de nuevo."
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );
  }

  const verDetalle = (id: number) =>
    navigate({ to: '/mis-entregas/$id', params: { id: String(id) } });

  return (
    <div className="page-stack">
      <ListToolbar
        title="Mis entregas"
        description="Consulta tus entregas y confirma la entrega cuando recibas tus paquetes."
        searchPlaceholder="Buscar por guía, destino o tipo de entrega..."
        value={search}
        onSearchChange={setSearch}
      />

      {error && (
        <InlineErrorBanner
          message="No se pudieron actualizar tus entregas"
          hint="Mostrando los resultados anteriores. Reintentando en segundo plano."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      )}

      {!isLoading && despachos.length > 0 && (
        <KpiCardsGrid>
          <KpiCard
            icon={<Truck className="h-5 w-5" />}
            label="Entregas"
            value={despachos.length}
            tone="primary"
            hint="Entregas asociadas a tus paquetes"
          />
          <KpiCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Listas para confirmar"
            value={stats.listas}
            tone={stats.listas > 0 ? 'info' : 'neutral'}
            hint="Listas para confirmar al recibirlas"
          />
          <KpiCard
            icon={<PackageCheck className="h-5 w-5" />}
            label="Recibidas"
            value={stats.recibidas}
            tone={stats.recibidas > 0 ? 'success' : 'neutral'}
            hint={`${stats.pendientes} pendiente${stats.pendientes === 1 ? '' : 's'}`}
          />
        </KpiCardsGrid>
      )}

      {!isLoading && despachos.length > 0 && (
        <FiltrosBar
          hayFiltrosActivos={hayFiltrosActivos}
          onLimpiar={limpiarFiltros}
          filtrosActivosCount={filtrosActivosCount}
          resumen={`${filtered.length} entrega${filtered.length === 1 ? '' : 's'}${
            filtered.length !== despachos.length ? ` de ${despachos.length}` : ''
          } · ${paquetesFiltrados} paquete${paquetesFiltrados === 1 ? '' : 's'}`}
          chips={
            <>
              <ChipFiltro
                label="Todas"
                active={estadoFiltro === 'TODAS'}
                onClick={() => setEstadoFiltro('TODAS')}
                count={despachos.length}
              />
              <ChipFiltro
                label="Pendientes"
                active={estadoFiltro === 'PENDIENTES'}
                onClick={() => setEstadoFiltro('PENDIENTES')}
                count={countPendientes}
                tone="primary"
              />
              <ChipFiltro
                label="Recibidas"
                active={estadoFiltro === 'CONFIRMADOS'}
                onClick={() => setEstadoFiltro('CONFIRMADOS')}
                count={countConfirmados}
                tone="success"
              />
            </>
          }
          filtros={
            tiposPresentes.size > 1 ? (
              <FiltroCampo label="Modalidad">
                <Select
                  value={tipoFiltro}
                  onValueChange={(v) => setTipoFiltro(v as ModalidadFiltro)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todas</SelectItem>
                    {tiposPresentes.has('DOMICILIO') && (
                      <SelectItem value="DOMICILIO">{modalidadLabel('DOMICILIO')}</SelectItem>
                    )}
                    {tiposPresentes.has('AGENCIA') && (
                      <SelectItem value="AGENCIA">{modalidadLabel('AGENCIA')}</SelectItem>
                    )}
                    {tiposPresentes.has('AGENCIA_COURIER_ENTREGA') && (
                      <SelectItem value="AGENCIA_COURIER_ENTREGA">
                        {modalidadLabel('AGENCIA_COURIER_ENTREGA')}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FiltroCampo>
            ) : null
          }
        />
      )}

      {isLoading ? (
        <ListTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entrega</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Modalidad</TableHead>
                <TableHead className="text-right">Paquetes</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[150px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRowsSkeleton columns={6} rows={5} />
            </TableBody>
          </Table>
        </ListTableShell>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title={search || hayFiltrosActivos ? 'No se encontraron resultados' : 'No tienes entregas en camino'}
          description={
            search || hayFiltrosActivos
              ? 'Prueba cambiando los filtros o el término de búsqueda.'
              : 'Cuando tengas un envío en camino aparecerá aquí para que consultes, imprimas o confirmes su entrega.'
          }
        />
      ) : (
        <>
          {/*
           * En móvil renderizamos tarjetas (mejor jerarquía y sin scroll
           * horizontal a 320 px); en md+ usamos la tabla. Las acciones son
           * idénticas en ambos modos.
           */}
          <div className="flex flex-col gap-3 md:hidden">
            {pagedFiltered.map((d) => (
              <EntregaCard
                key={d.despachoId}
                despacho={d}
                puedeConfirmar={puedeConfirmar}
                puedeExportar={puedeExportar}
                exportingId={exportingId}
                confirmando={confirmar.isPending && confirmar.variables === d.despachoId}
                onVerDetalle={() => verDetalle(d.despachoId)}
                onConfirmar={() => onConfirmar(d.despachoId)}
                onExportar={(mode) => handleExportar(d.despachoId, mode)}
              />
            ))}
          </div>

          <ListTableShell className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entrega</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead className="text-right">Paquetes</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[150px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedFiltered.map((d) => {
                  const Icon = modalidadIcon(d.tipoEntrega);
                  const peso = pesoInline(d);
                  return (
                    <TableRow
                      key={d.despachoId}
                      className="cursor-pointer transition-colors hover:bg-muted/40"
                      onClick={() => verDetalle(d.despachoId)}
                    >
                      <TableCell className="align-top">
                        <div className="flex min-w-0 items-start gap-2">
                          <span className={cn(
                            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                            modalidadIconBgClass(d.tipoEntrega),
                          )}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            {d.numeroGuia ? (
                              <MonoTrunc
                                value={d.numeroGuia}
                                className="text-sm font-medium text-foreground"
                              />
                            ) : (
                              <p className="font-mono text-sm font-medium text-foreground">
                                Entrega #{d.despachoId}
                              </p>
                            )}
                            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <CalendarClock className="h-3 w-3" />
                              {formatFecha(d.fecha)}
                              <span className="text-muted-foreground/60">· Entrega #{d.despachoId}</span>
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate" title={d.destinoNombre ?? undefined}>
                            {d.destinoNombre ?? '—'}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline" className={cn(modalidadBadgeClass(d.tipoEntrega), 'font-normal')}>
                          {modalidadLabel(d.tipoEntrega)}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <div className="tabular-nums text-sm font-medium text-foreground">
                          {paquetesLabel(d.totalPiezas)}
                        </div>
                        {peso ? (
                          <div className="mt-0.5 inline-flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                            <Scale className="h-3 w-3" />
                            {peso}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top">
                        <EstadoEntregaBadge despacho={d} />
                      </TableCell>
                      <TableCell className="align-top" onClick={(e) => e.stopPropagation()}>
                        <EntregaActions
                          despacho={d}
                          puedeConfirmar={puedeConfirmar}
                          puedeExportar={puedeExportar}
                          exportingId={exportingId}
                          confirmando={confirmar.isPending && confirmar.variables === d.despachoId}
                          onVerDetalle={() => verDetalle(d.despachoId)}
                          onConfirmar={() => onConfirmar(d.despachoId)}
                          onExportar={(mode) => handleExportar(d.despachoId, mode)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ListTableShell>

          {filtered.length > 0 && (
            <TablePagination
              page={page}
              size={size}
              totalElements={filtered.length}
              totalPages={totalPages}
              onPageChange={setPage}
              onSizeChange={setSize}
            />
          )}
        </>
      )}
    </div>
  );
}

function EstadoEntregaBadge({ despacho }: { despacho: MiDespacho }) {
  if (despacho.entregaConfirmada) {
    return (
      <StatusBadge tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
        Recibida
      </StatusBadge>
    );
  }
  if (despacho.confirmable) {
    return <StatusBadge tone="info">Lista para confirmar</StatusBadge>;
  }
  return <StatusBadge tone="neutral">En proceso</StatusBadge>;
}

interface AccionesProps {
  despacho: MiDespacho;
  puedeConfirmar: boolean;
  puedeExportar: boolean;
  exportingId: ExportingState;
  confirmando: boolean;
  onVerDetalle: () => void;
  onConfirmar: () => void;
  onExportar: (mode: ExportMode) => void;
}

/** Acciones de fila: ver detalle + confirmar visibles; exportaciones en menú. */
function EntregaActions({
  despacho,
  puedeConfirmar,
  puedeExportar,
  exportingId,
  confirmando,
  onVerDetalle,
  onConfirmar,
  onExportar,
}: AccionesProps) {
  const exportingThis = exportingId?.id === despacho.despachoId ? exportingId.mode : null;
  const busy = exportingId !== null || confirmando;
  const puedeConfirmarAhora = puedeConfirmar && !despacho.entregaConfirmada;

  const exportItems: RowActionEntry[] = puedeExportar
    ? [
        {
          label: 'Imprimir',
          icon: Printer,
          onSelect: () => onExportar('print'),
          disabled: busy,
          loading: exportingThis === 'print',
        },
        {
          label: 'Exportar PDF',
          icon: FileDown,
          onSelect: () => onExportar('pdf'),
          disabled: busy,
          loading: exportingThis === 'pdf',
        },
        {
          label: 'Exportar Excel',
          icon: FileSpreadsheet,
          onSelect: () => onExportar('xlsx'),
          disabled: busy,
          loading: exportingThis === 'xlsx',
        },
      ]
    : [];

  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="icon" title="Ver detalle" aria-label="Ver detalle" onClick={onVerDetalle}>
        <Eye className="h-4 w-4" />
      </Button>
      {puedeConfirmarAhora ? (
        <Button size="sm" className="gap-1.5" disabled={!despacho.confirmable || busy} onClick={onConfirmar}>
          {confirmando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Ya lo recibí
        </Button>
      ) : null}
      {exportItems.length > 0 ? (
        <RowActionsMenu items={exportItems} ariaLabel="Más acciones de la entrega" />
      ) : null}
    </div>
  );
}

/** Tarjeta de entrega para móvil: guía, modalidad, destino, paquetes, peso, fecha, estado y acciones. */
function EntregaCard({
  despacho,
  puedeConfirmar,
  puedeExportar,
  exportingId,
  confirmando,
  onVerDetalle,
  onConfirmar,
  onExportar,
}: AccionesProps) {
  const Icon = modalidadIcon(despacho.tipoEntrega);
  const peso = pesoInline(despacho);
  const etiqueta = `Entrega ${despacho.numeroGuia ?? `#${despacho.despachoId}`}`;
  return (
    <SurfaceCard
      className="ui-interactive cursor-pointer p-3"
      onClick={onVerDetalle}
      role="button"
      tabIndex={0}
      aria-label={etiqueta}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onVerDetalle();
        }
      }}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className={cn(
            'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
            modalidadIconBgClass(despacho.tipoEntrega),
          )}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            {despacho.numeroGuia ? (
              <MonoTrunc value={despacho.numeroGuia} className="text-sm font-semibold text-foreground" />
            ) : (
              <p className="font-mono text-sm font-semibold text-foreground">Entrega #{despacho.despachoId}</p>
            )}
            <p className="mt-0.5 text-[11px] text-muted-foreground">Entrega #{despacho.despachoId}</p>
          </div>
        </div>
        <EstadoEntregaBadge despacho={despacho} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={cn(modalidadBadgeClass(despacho.tipoEntrega), 'font-normal')}>
          {modalidadLabel(despacho.tipoEntrega)}
        </Badge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div className="col-span-2 flex min-w-0 items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-foreground" title={despacho.destinoNombre ?? undefined}>
            {despacho.destinoNombre ?? '—'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <PackageCheck className="h-3.5 w-3.5 shrink-0" />
          <span className="text-foreground">{paquetesLabel(despacho.totalPiezas)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Scale className="h-3.5 w-3.5 shrink-0" />
          <span>{peso ?? '—'}</span>
        </div>
        <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
          <span>{formatFecha(despacho.fecha)}</span>
        </div>
      </dl>

      <div className="mt-3 flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
        <EntregaActions
          despacho={despacho}
          puedeConfirmar={puedeConfirmar}
          puedeExportar={puedeExportar}
          exportingId={exportingId}
          confirmando={confirmando}
          onVerDetalle={onVerDetalle}
          onConfirmar={onConfirmar}
          onExportar={onExportar}
        />
      </div>
    </SurfaceCard>
  );
}
