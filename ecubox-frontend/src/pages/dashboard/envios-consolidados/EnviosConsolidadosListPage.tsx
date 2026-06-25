import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Ban,
  Boxes,
  CircleDollarSign,
  Eye,
  Lock,
  Package as PackageIcon,
  PlaneLanding,
  Plus,
  Tag,
  Trash2,
  Truck,
  Unlock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CrearEnvioConGuiasDialog } from './CrearEnvioConGuiasDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { PesoCell, PESO_TABLE_CELL_CLASS, PESO_TABLE_HEAD_CLASS } from '@/components/PesoCell';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { InlineErrorBanner } from '@/components/InlineErrorBanner';
import { KpiCard } from '@/components/KpiCard';
import { KpiCardsGrid } from '@/components/KpiCardsGrid';
import { ChipFiltro, type ChipFiltroTone } from '@/components/ChipFiltro';
import type { StatusTone } from '@/components/ui/StatusBadge';
import { useSearch } from '@tanstack/react-router';
import { Switch } from '@/components/ui/switch';
import { SurfaceCard } from '@/components/ui/surface-card';
import { ResumenEstadosPaquetes } from './ResumenEstadosPaquetes';
import { FiltrosBar, FiltroCampo } from '@/components/FiltrosBar';
import { MonoTrunc } from '@/components/MonoTrunc';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { TablePagination } from '@/components/ui/TablePagination';
import { cn } from '@/lib/utils';
import {
  useEnviarDesdeUsaEnvioConsolidado,
  useCerrarConsolidadoEnvioConsolidado,
  useArribarEcuadorEnvioConsolidado,
  useCancelarEnvioConsolidado,
  useEliminarEnvioConsolidado,
  useEnviosConsolidados,
  useEnvioConsolidadoResumen,
  useReabrirEnvioConsolidado,
  useTodosEnviosConsolidados,
} from '@/hooks/useEnviosConsolidados';
import { useSearchPagination } from '@/hooks/useSearchPagination';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { EstadoFiltro, EstadoPagoFiltro } from '@/lib/api/envios-consolidados.service';
import type { EstadoPagoConsolidado } from '@/types/envio-consolidado';
import { useAuthStore } from '@/stores/authStore';
import {
  EnvioConsolidadoBadge,
  ENVIO_CONSOLIDADO_ESTADO_UI,
  getEnvioConsolidadoLeyendaItems,
  resolveEstadoOperativoConsolidado,
} from './EnvioConsolidadoBadge';
import { EstadosLeyendaDialog } from '@/components/estados/EstadosLeyendaDialog';
import type { EstadoEnvioConsolidadoOperativo } from '@/types/envio-consolidado';
import { AplicarEstadoConsolidadosMenuDialog } from './AplicarEstadoConsolidadosMenuDialog';

export function EnviosConsolidadosListPage() {
  const navigate = useNavigate();
  const { q, page, size, setQ, setPage, setSize, resetPage } = useSearchPagination({
    initialSize: 20,
  });
  const { atencion = false, mixtos = false } = useSearch({ strict: false }) as {
    atencion?: boolean;
    mixtos?: boolean;
  };
  const [estadoFilter, setEstadoFilter] = useState<EstadoFiltro>('TODOS');
  const [estadoPagoFilter, setEstadoPagoFilter] = useState<EstadoPagoFiltro>('TODOS');
  const [createOpen, setCreateOpen] = useState(false);
  const [aplicarEstadoOpen, setAplicarEstadoOpen] = useState(false);
  const [consolidadosSeleccionados, setConsolidadosSeleccionados] = useState<number[]>([]);
  const [confirmCerrar, setConfirmCerrar] = useState<{ id: number; codigo: string } | null>(null);
  const [confirmEnviarUsa, setConfirmEnviarUsa] = useState<{ id: number; codigo: string } | null>(null);
  const [confirmArribarEcuador, setConfirmArribarEcuador] = useState<{ id: number; codigo: string } | null>(null);
  const [confirmReabrir, setConfirmReabrir] = useState<{ id: number; codigo: string } | null>(null);
  const [confirmCancelar, setConfirmCancelar] = useState<{ id: number; codigo: string } | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState<{
    id: number;
    codigo: string;
    totalPaquetes: number;
  } | null>(null);

  const cerrarMutation = useCerrarConsolidadoEnvioConsolidado();
  const enviarUsaMutation = useEnviarDesdeUsaEnvioConsolidado();
  const arribarEcuadorMutation = useArribarEcuadorEnvioConsolidado();
  const reabrirMutation = useReabrirEnvioConsolidado();
  const cancelarMutation = useCancelarEnvioConsolidado();
  const eliminarMutation = useEliminarEnvioConsolidado();

  const hasEnviosUpdate = useAuthStore((s) =>
    s.hasPermission('ENVIOS_CONSOLIDADOS_UPDATE'),
  );
  const hasEnviosDelete = useAuthStore((s) =>
    s.hasPermission('ENVIOS_CONSOLIDADOS_DELETE'),
  );
  const hasEnviosCreate = useAuthStore((s) =>
    s.hasPermission('ENVIOS_CONSOLIDADOS_CREATE'),
  );

  const { data, isLoading, isFetching, error, refetch } = useEnviosConsolidados({
    estado: estadoFilter,
    estadoPago: estadoPagoFilter,
    q: q.trim() || undefined,
    requiereAtencion: atencion || undefined,
    estadosMixtos: mixtos || undefined,
    page,
    size,
  });

  const setAtencion = (val: boolean) => {
    navigate({
      to: '/envios-consolidados',
      search: (prev) => ({
        ...prev,
        atencion: val ? true : undefined,
      }),
    });
    resetPage();
  };

  const setMixtos = (val: boolean) => {
    navigate({
      to: '/envios-consolidados',
      search: (prev) => ({
        ...prev,
        mixtos: val ? true : undefined,
      }),
    });
    resetPage();
  };

  async function handleCerrar() {
    if (!confirmCerrar) return;
    try {
      await cerrarMutation.mutateAsync(confirmCerrar.id);
      toast.success(`Envío ${confirmCerrar.codigo} cerrado para registro`);
      setConfirmCerrar(null);
    } catch (err: unknown) {
      const r = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(r?.data?.message ?? 'No se pudo cerrar el envío');
    }
  }

  async function handleEnviarUsa() {
    if (!confirmEnviarUsa) return;
    try {
      await enviarUsaMutation.mutateAsync(confirmEnviarUsa.id);
      toast.success(`Envío ${confirmEnviarUsa.codigo} enviado desde USA`);
      setConfirmEnviarUsa(null);
    } catch (err: unknown) {
      const r = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(r?.data?.message ?? 'No se pudo enviar desde USA');
    }
  }

  async function handleArribarEcuador() {
    if (!confirmArribarEcuador) return;
    try {
      await arribarEcuadorMutation.mutateAsync(confirmArribarEcuador.id);
      toast.success(`Envío ${confirmArribarEcuador.codigo} registrado como arribado a Ecuador`);
      setConfirmArribarEcuador(null);
    } catch (err: unknown) {
      const r = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(r?.data?.message ?? 'No se pudo registrar el arribo');
    }
  }

  async function handleReabrir() {
    if (!confirmReabrir) return;
    try {
      await reabrirMutation.mutateAsync(confirmReabrir.id);
      toast.success(`Envío ${confirmReabrir.codigo} reabierto`);
      setConfirmReabrir(null);
    } catch (err: unknown) {
      const r = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(r?.data?.message ?? 'No se pudo reabrir el envío');
    }
  }

  async function handleCancelar() {
    if (!confirmCancelar) return;
    try {
      await cancelarMutation.mutateAsync(confirmCancelar.id);
      toast.success(`Envío ${confirmCancelar.codigo} cancelado`);
      setConfirmCancelar(null);
    } catch (err: unknown) {
      const r = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(r?.data?.message ?? 'No se pudo cancelar el envío');
    }
  }

  async function handleEliminar(eliminarPaquetes: boolean) {
    if (!confirmEliminar) return;
    try {
      await eliminarMutation.mutateAsync({
        id: confirmEliminar.id,
        eliminarPaquetes,
      });
      const totales = confirmEliminar.totalPaquetes;
      if (eliminarPaquetes && totales > 0) {
        toast.success(
          `Envío ${confirmEliminar.codigo} y ${totales} paquete${totales === 1 ? '' : 's'} eliminados`,
        );
      } else if (totales > 0) {
        toast.success(
          `Envío ${confirmEliminar.codigo} eliminado · ${totales} paquete${totales === 1 ? '' : 's'} desasociado${totales === 1 ? '' : 's'}`,
        );
      } else {
        toast.success(`Envío ${confirmEliminar.codigo} eliminado`);
      }
      setConfirmEliminar(null);
    } catch (err: unknown) {
      const r = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(r?.data?.message ?? 'No se pudo eliminar el envío');
    }
  }

  // Resumen liviano server-side: conteo por estado operativo (KPIs/chips) y por
  // estado de pago. Evita descargar el dataset completo en cada visita al listado.
  const { data: resumen } = useEnvioConsolidadoResumen();

  // Carga diferida del conjunto disponible para la selección masiva.
  const {
    data: todosLosConsolidados = [],
    isLoading: todosLosConsolidadosLoading,
    isError: todosLosConsolidadosError,
  } = useTodosEnviosConsolidados(aplicarEstadoOpen);
  const stats = useMemo(() => {
    const porOperativo: Record<EstadoEnvioConsolidadoOperativo, number> = {
      VACIO: 0,
      EN_PREPARACION: 0,
      CERRADO: 0,
      ENVIADO_DESDE_USA: 0,
      ARRIBADO_ECUADOR: 0,
      RECIBIDO_EN_BODEGA: 0,
      LIQUIDADO: 0,
      CANCELADO: 0,
    };
    return {
      total: resumen?.total ?? 0,
      porOperativo: resumen?.porOperativo ?? porOperativo,
      pagados: resumen?.pagados ?? 0,
      noPagados: resumen?.noPagados ?? 0,
    };
  }, [resumen]);

  function chipToneFromStatus(tone: StatusTone): ChipFiltroTone {
    if (tone === 'info' || tone === 'primary') return 'primary';
    if (tone === 'error') return 'danger';
    if (tone === 'warning') return 'warning';
    if (tone === 'success') return 'success';
    return 'neutral';
  }

  const OPERATIVO_FILTROS: {
    key: EstadoFiltro;
    estado: EstadoEnvioConsolidadoOperativo;
  }[] = [
    { key: 'VACIO', estado: 'VACIO' },
    { key: 'EN_PREPARACION', estado: 'EN_PREPARACION' },
    { key: 'CERRADO', estado: 'CERRADO' },
    { key: 'ENVIADO_DESDE_USA', estado: 'ENVIADO_DESDE_USA' },
    { key: 'ARRIBADO_ECUADOR', estado: 'ARRIBADO_ECUADOR' },
    { key: 'RECIBIDO_EN_BODEGA', estado: 'RECIBIDO_EN_BODEGA' },
    { key: 'LIQUIDADO', estado: 'LIQUIDADO' },
    { key: 'CANCELADO', estado: 'CANCELADO' },
  ];

  const items = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;
  const search = q;

  function abrirAplicarEstado(id?: number) {
    setConsolidadosSeleccionados(id != null ? [id] : []);
    setAplicarEstadoOpen(true);
  }

  return (
    <div className="page-stack">
      <ListToolbar
        title="Envíos consolidados"
        searchPlaceholder="Buscar por código..."
        value={q}
        onSearchChange={setQ}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <EstadosLeyendaDialog
              title="¿Qué significa cada estado?"
              description="Estados operativos por los que pasa un envío consolidado, en orden del flujo."
              items={getEnvioConsolidadoLeyendaItems()}
              triggerLabel="Ver qué significa cada estado del envío consolidado"
            />
            {hasEnviosUpdate && (
              <Button variant="outline" onClick={() => abrirAplicarEstado()}>
                <Tag className="mr-2 h-4 w-4" />
                Aplicar estado
              </Button>
            )}
            {hasEnviosCreate && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo envío
              </Button>
            )}
          </div>
        }
      />

      <KpiCardsGrid>
        {(['EN_PREPARACION', 'ENVIADO_DESDE_USA', 'RECIBIDO_EN_BODEGA'] as const).map((estado) => {
          const ui = ENVIO_CONSOLIDADO_ESTADO_UI[estado];
          const Icon = ui.icon;
          const kpiTone =
            ui.tone === 'error'
              ? 'danger'
              : ui.tone === 'info'
                ? 'info'
                : ui.tone;
          return (
            <KpiCard
              key={estado}
              icon={<Icon className="h-5 w-5" />}
              label={ui.label}
              value={stats.porOperativo[estado]}
              tone={kpiTone}
            />
          );
        })}
      </KpiCardsGrid>

      <FiltrosBar
        hayFiltrosActivos={
          estadoFilter !== 'TODOS' ||
          estadoPagoFilter !== 'TODOS' ||
          atencion ||
          mixtos
        }
        onLimpiar={() => {
          setEstadoFilter('TODOS');
          setEstadoPagoFilter('TODOS');
          navigate({
            to: '/envios-consolidados',
            search: {},
          });
          resetPage();
        }}
        chips={
          <>
            <ChipFiltro
              label="Todos"
              count={stats.total}
              active={estadoFilter === 'TODOS'}
              onClick={() => {
                setEstadoFilter('TODOS');
                resetPage();
              }}
            />
            {OPERATIVO_FILTROS.map(({ key, estado }) => (
              <ChipFiltro
                key={key}
                label={ENVIO_CONSOLIDADO_ESTADO_UI[estado].label}
                count={stats.porOperativo[estado]}
                active={estadoFilter === key}
                tone={chipToneFromStatus(ENVIO_CONSOLIDADO_ESTADO_UI[estado].tone)}
                onClick={() => {
                  setEstadoFilter(key);
                  resetPage();
                }}
              />
            ))}
            <span className="mx-1 hidden h-5 w-px bg-[var(--color-border)] md:inline-block" />
            <ChipFiltro
              label="No pagados"
              count={stats.noPagados}
              active={estadoPagoFilter === 'NO_PAGADO'}
              tone="warning"
              onClick={() => {
                setEstadoPagoFilter(estadoPagoFilter === 'NO_PAGADO' ? 'TODOS' : 'NO_PAGADO');
                resetPage();
              }}
            />
            <ChipFiltro
              label="Pagados"
              count={stats.pagados}
              active={estadoPagoFilter === 'PAGADO'}
              tone="success"
              onClick={() => {
                setEstadoPagoFilter(estadoPagoFilter === 'PAGADO' ? 'TODOS' : 'PAGADO');
                resetPage();
              }}
            />
          </>
        }
        filtros={
          <>
            <FiltroCampo label="Requiere atención" hint="Solo piezas en flujo alterno o sin estado">
              <div className="flex h-9 items-center">
                <Switch
                  checked={atencion}
                  onCheckedChange={setAtencion}
                  id="filtro-atencion"
                />
              </div>
            </FiltroCampo>
            <FiltroCampo label="Estados mixtos" hint="Consolidados con piezas en más de un estado">
              <div className="flex h-9 items-center">
                <Switch
                  checked={mixtos}
                  onCheckedChange={setMixtos}
                  id="filtro-mixtos"
                />
              </div>
            </FiltroCampo>
          </>
        }
      />

      {error && items.length > 0 && (
        <InlineErrorBanner
          message="No se pudieron actualizar los envíos"
          hint="Mostrando los resultados anteriores. Reintentando en segundo plano."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      )}

      {error && items.length === 0 && !isLoading ? (
        <InlineErrorBanner
          message="Error al cargar envíos consolidados"
          hint="Verifica tu conexión o intenta de nuevo."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : !isLoading && items.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={
            search
              ? 'Sin resultados'
              : estadoFilter === 'TODOS'
                ? 'Sin envíos'
                : `No hay envíos ${ENVIO_CONSOLIDADO_ESTADO_UI[estadoFilter as EstadoEnvioConsolidadoOperativo]?.label.toLowerCase() ?? 'con este filtro'}`
          }
          description={
            search
              ? `No se encontraron envíos con "${search}".`
              : 'Crea un nuevo envío consolidado y agrupa las piezas listas para despachar.'
          }
          action={
            !search ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo envío
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="flex flex-col gap-3 md:hidden">
            {isLoading && (
              <>
                <SurfaceCard className="p-4 animate-pulse">
                  <div className="h-4 w-2/3 bg-muted rounded mb-2" />
                  <div className="h-5 w-24 bg-muted rounded" />
                </SurfaceCard>
                <SurfaceCard className="p-4 animate-pulse">
                  <div className="h-4 w-2/3 bg-muted rounded mb-2" />
                  <div className="h-5 w-24 bg-muted rounded" />
                </SurfaceCard>
              </>
            )}
            {!isLoading && items.map((e) => {
              const op = resolveEstadoOperativoConsolidado(e);
              return (
                <SurfaceCard
                  key={e.id}
                  onClick={() =>
                    navigate({
                      to: '/envios-consolidados/$id',
                      params: { id: String(e.id) },
                    })
                  }
                  className="cursor-pointer p-4 hover:border-[var(--color-primary)]/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <MonoTrunc
                        value={e.codigo}
                        className="font-mono text-sm font-semibold text-foreground"
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <EnvioConsolidadoBadge
                          cerrado={e.cerrado}
                          estadoOperativo={op}
                        />
                        <PagoBadge estado={e.estadoPago} />
                      </div>
                    </div>
                    <div onClick={(ev) => ev.stopPropagation()}>
                      <RowActionsMenu
                        items={[
                          {
                            label: 'Ver detalle',
                            icon: Eye,
                            onSelect: () =>
                              navigate({
                                to: '/envios-consolidados/$id',
                                params: { id: String(e.id) },
                              }),
                          },
                          { type: 'separator' },
                          {
                            label: 'Aplicar estado',
                            icon: Tag,
                            hidden: !hasEnviosUpdate || op === 'CANCELADO' || op === 'LIQUIDADO',
                            onSelect: () => abrirAplicarEstado(e.id),
                          },
                          {
                            label: 'Cerrar envío',
                            icon: Lock,
                            hidden: !hasEnviosUpdate || op !== 'EN_PREPARACION',
                            disabled: cerrarMutation.isPending,
                            onSelect: () =>
                              setConfirmCerrar({ id: e.id, codigo: e.codigo }),
                          },
                          {
                            label: 'Enviar desde USA',
                            icon: Truck,
                            hidden: !hasEnviosUpdate || op !== 'CERRADO',
                            disabled: enviarUsaMutation.isPending,
                            onSelect: () =>
                              setConfirmEnviarUsa({ id: e.id, codigo: e.codigo }),
                          },
                          {
                            label: 'Arribar a Ecuador',
                            icon: PlaneLanding,
                            hidden: !hasEnviosUpdate || op !== 'ENVIADO_DESDE_USA',
                            disabled: arribarEcuadorMutation.isPending,
                            onSelect: () =>
                              setConfirmArribarEcuador({ id: e.id, codigo: e.codigo }),
                          },
                          {
                            label: 'Reabrir envío',
                            icon: Unlock,
                            hidden: !hasEnviosUpdate || (op !== 'CERRADO' && op !== 'ENVIADO_DESDE_USA'),
                            disabled: reabrirMutation.isPending,
                            onSelect: () =>
                              setConfirmReabrir({ id: e.id, codigo: e.codigo }),
                          },
                          {
                            label: 'Cancelar consolidado',
                            icon: Ban,
                            hidden: !hasEnviosUpdate || (op !== 'VACIO' && op !== 'EN_PREPARACION'),
                            disabled: cancelarMutation.isPending,
                            onSelect: () =>
                              setConfirmCancelar({ id: e.id, codigo: e.codigo }),
                          },
                          { type: 'separator', hidden: !hasEnviosDelete },
                          {
                            label: 'Eliminar envío',
                            icon: Trash2,
                            destructive: true,
                            hidden: !hasEnviosDelete,
                            disabled: (op !== 'VACIO' && op !== 'EN_PREPARACION') || eliminarMutation.isPending,
                            onSelect: () =>
                              setConfirmEliminar({
                                id: e.id,
                                codigo: e.codigo,
                                totalPaquetes: e.totalPaquetes ?? 0,
                              }),
                          },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Paquetes
                      </p>
                      <div className="mt-1" onClick={(ev) => ev.stopPropagation()}>
                        <ResumenEstadosPaquetes
                          consolidadoId={e.id}
                          resumen={e.resumenEstadosPaquetes}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Peso total
                      </p>
                      <div className="mt-1">
                        <PesoCell
                          pesoLbs={
                            e.pesoTotalLbs != null && e.pesoTotalLbs > 0
                              ? e.pesoTotalLbs
                              : null
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">Creado: <FechaCell value={e.createdAt} /></span>
                    {(e.fechaCierre || e.fechaCerrado) && (
                      <span className="flex items-center gap-1">
                        {e.fechaCerrado ? 'Salida USA: ' : 'Cerrado: '}
                        <FechaCell value={e.fechaCerrado || e.fechaCierre} />
                      </span>
                    )}
                  </div>
                </SurfaceCard>
              );
            })}
          </div>

          {/* Desktop Table Layout */}
          <ListTableShell className="hidden md:block">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead className="text-left min-w-[160px]">Paquetes</TableHead>
                  <TableHead className={PESO_TABLE_HEAD_CLASS}>Peso</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="hidden lg:table-cell">Cerrado</TableHead>
                  <TableHead className="hidden lg:table-cell">Salida USA</TableHead>
                  <TableHead className="w-12 text-right" aria-label="Acciones" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRowsSkeleton
                    columns={9}
                    columnClasses={{ 6: 'hidden lg:table-cell', 7: 'hidden lg:table-cell' }}
                  />
                )}
                {!isLoading && items.map((e) => {
                  const op = resolveEstadoOperativoConsolidado(e);
                  return (
                    <TableRow
                      key={e.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate({
                          to: '/envios-consolidados/$id',
                          params: { id: String(e.id) },
                        })
                      }
                    >
                      <TableCell>
                        <MonoTrunc
                          value={e.codigo}
                          className="font-medium text-foreground"
                        />
                      </TableCell>
                      <TableCell>
                        <EnvioConsolidadoBadge
                          cerrado={e.cerrado}
                          estadoOperativo={op}
                        />
                      </TableCell>
                      <TableCell>
                        <PagoBadge estado={e.estadoPago} />
                      </TableCell>
                      <TableCell className="text-left py-2.5" onClick={(ev) => ev.stopPropagation()}>
                        <ResumenEstadosPaquetes
                          consolidadoId={e.id}
                          resumen={e.resumenEstadosPaquetes}
                        />
                      </TableCell>
                      <TableCell className={PESO_TABLE_CELL_CLASS}>
                        <PesoCell
                          pesoLbs={
                            e.pesoTotalLbs != null && e.pesoTotalLbs > 0
                              ? e.pesoTotalLbs
                              : null
                          }
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <FechaCell value={e.createdAt} />
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        <FechaCell value={e.fechaCierre} mutedIfEmpty />
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        <FechaCell value={e.fechaCerrado} mutedIfEmpty />
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        <RowActionsMenu
                          items={[
                            {
                              label: 'Ver detalle',
                              icon: Eye,
                              onSelect: () =>
                                navigate({
                                  to: '/envios-consolidados/$id',
                                  params: { id: String(e.id) },
                                }),
                            },
                            { type: 'separator' },
                            {
                              label: 'Aplicar estado',
                              icon: Tag,
                              hidden: !hasEnviosUpdate || op === 'CANCELADO' || op === 'LIQUIDADO',
                              onSelect: () => abrirAplicarEstado(e.id),
                            },
                            {
                              label: 'Cerrar envío',
                              icon: Lock,
                              hidden: !hasEnviosUpdate || op !== 'EN_PREPARACION',
                              disabled: cerrarMutation.isPending,
                              onSelect: () =>
                                setConfirmCerrar({ id: e.id, codigo: e.codigo }),
                            },
                            {
                              label: 'Enviar desde USA',
                              icon: Truck,
                              hidden: !hasEnviosUpdate || op !== 'CERRADO',
                              disabled: enviarUsaMutation.isPending,
                              onSelect: () =>
                                setConfirmEnviarUsa({ id: e.id, codigo: e.codigo }),
                            },
                            {
                              label: 'Arribar a Ecuador',
                              icon: PlaneLanding,
                              hidden: !hasEnviosUpdate || op !== 'ENVIADO_DESDE_USA',
                              disabled: arribarEcuadorMutation.isPending,
                              onSelect: () =>
                                setConfirmArribarEcuador({ id: e.id, codigo: e.codigo }),
                            },
                            {
                              label: 'Reabrir envío',
                              icon: Unlock,
                              hidden: !hasEnviosUpdate || (op !== 'CERRADO' && op !== 'ENVIADO_DESDE_USA'),
                              disabled: reabrirMutation.isPending,
                              onSelect: () =>
                                setConfirmReabrir({ id: e.id, codigo: e.codigo }),
                            },
                            {
                              label: 'Cancelar consolidado',
                              icon: Ban,
                              hidden: !hasEnviosUpdate || (op !== 'VACIO' && op !== 'EN_PREPARACION'),
                              disabled: cancelarMutation.isPending,
                              onSelect: () =>
                                setConfirmCancelar({ id: e.id, codigo: e.codigo }),
                            },
                            { type: 'separator', hidden: !hasEnviosDelete },
                            {
                              label: 'Eliminar envío',
                              icon: Trash2,
                              destructive: true,
                              hidden: !hasEnviosDelete,
                              disabled: (op !== 'VACIO' && op !== 'EN_PREPARACION') || eliminarMutation.isPending,
                              onSelect: () =>
                                setConfirmEliminar({
                                  id: e.id,
                                  codigo: e.codigo,
                                  totalPaquetes: e.totalPaquetes ?? 0,
                                }),
                            },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
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

      {createOpen && <CrearEnvioConGuiasDialog onClose={() => setCreateOpen(false)} />}

      <AplicarEstadoConsolidadosMenuDialog
        open={aplicarEstadoOpen}
        consolidados={todosLosConsolidados}
        seleccionInicial={consolidadosSeleccionados}
        consolidadosLoading={todosLosConsolidadosLoading}
        consolidadosError={todosLosConsolidadosError}
        onOpenChange={(open) => {
          setAplicarEstadoOpen(open);
          if (!open) setConsolidadosSeleccionados([]);
        }}
      />

      <ConfirmDialog
        open={confirmCerrar !== null}
        onOpenChange={(o) => !o && setConfirmCerrar(null)}
        title="Cerrar envío consolidado"
        description={
          confirmCerrar
            ? `Al cerrar el envío "${confirmCerrar.codigo}" se detendrá el registro de nuevos paquetes y se aplicará el estado de "Cerrado" al consolidado.`
            : ''
        }
        confirmLabel="Cerrar envío"
        loading={cerrarMutation.isPending}
        onConfirm={handleCerrar}
      />

      <ConfirmDialog
        open={confirmEnviarUsa !== null}
        onOpenChange={(o) => !o && setConfirmEnviarUsa(null)}
        title="Enviar consolidado desde USA"
        description={
          confirmEnviarUsa
            ? `Al marcar "${confirmEnviarUsa.codigo}" como enviado desde USA se aplicará el estado de salida a sus piezas y el consolidado quedará registrado como enviado desde origen.`
            : ''
        }
        confirmLabel="Enviar desde USA"
        loading={enviarUsaMutation.isPending}
        onConfirm={handleEnviarUsa}
      />

      <ConfirmDialog
        open={confirmArribarEcuador !== null}
        onOpenChange={(o) => !o && setConfirmArribarEcuador(null)}
        title="Registrar arribo a Ecuador"
        description={
          confirmArribarEcuador
            ? `Al marcar "${confirmArribarEcuador.codigo}" como arribado a Ecuador se registrará su llegada a aduana destino.`
            : ''
        }
        confirmLabel="Arribar a Ecuador"
        loading={arribarEcuadorMutation.isPending}
        onConfirm={handleArribarEcuador}
      />

      <ConfirmDialog
        open={confirmReabrir !== null}
        onOpenChange={(o) => !o && setConfirmReabrir(null)}
        title="Reabrir envío consolidado"
        description={
          confirmReabrir
            ? `El envío "${confirmReabrir.codigo}" volverá al estado "En preparación" y admitirá agregar y remover paquetes.`
            : ''
        }
        confirmLabel="Reabrir"
        loading={reabrirMutation.isPending}
        onConfirm={handleReabrir}
      />

      <ConfirmDialog
        open={confirmCancelar !== null}
        onOpenChange={(o) => !o && setConfirmCancelar(null)}
        title="Cancelar envío consolidado"
        description={
          confirmCancelar
            ? `Al cancelar el envío "${confirmCancelar.codigo}" quedará anulado permanentemente.`
            : ''
        }
        confirmLabel="Cancelar"
        loading={cancelarMutation.isPending}
        onConfirm={handleCancelar}
      />

      <EliminarEnvioDialog
        target={confirmEliminar}
        loading={eliminarMutation.isPending}
        onClose={() => setConfirmEliminar(null)}
        onConfirm={handleEliminar}
      />
    </div>
  );
}

interface EliminarEnvioDialogProps {
  target: { id: number; codigo: string; totalPaquetes: number } | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (eliminarPaquetes: boolean) => void;
}

function EliminarEnvioDialog({ target, loading, onClose, onConfirm }: EliminarEnvioDialogProps) {
  if (!target) return null;
  const tienePaquetes = target.totalPaquetes > 0;
  const plural = target.totalPaquetes === 1 ? '' : 's';

  return (
    <Dialog open onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]">
              <Trash2 className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle>Eliminar envío consolidado</DialogTitle>
              <DialogDescription className="mt-1">
                Vas a eliminar el envío{' '}
                <span className="font-mono font-medium text-foreground">{target.codigo}</span>.
                Esta acción no se puede deshacer.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {tienePaquetes ? (
          <div className="space-y-3">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-3 text-sm text-foreground">
              <p className="inline-flex items-center gap-1.5">
                <PackageIcon className="h-4 w-4 text-muted-foreground" />
                <span>
                  Tiene{' '}
                  <span className="font-semibold">
                    {target.totalPaquetes} paquete{plural}
                  </span>{' '}
                  asociado{plural}.
                </span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Elige qué hacer con esos paquetes antes de eliminar el envío.
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => onConfirm(false)}
                className={cn(
                  'group flex w-full items-start gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-left transition-colors hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-muted)]/30 disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-muted)] text-[var(--color-primary)]">
                  <Unlock className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    Conservar paquetes
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Los {target.totalPaquetes} paquete{plural} se desasocian del envío y siguen
                    existiendo en el sistema. Podrás asignarlos a otro envío después.
                  </span>
                </span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => onConfirm(true)}
                className={cn(
                  'group flex w-full items-start gap-3 rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 p-3 text-left transition-colors hover:border-[var(--color-destructive)]/50 hover:bg-[var(--color-destructive)]/10 disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]">
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[var(--color-destructive)]">
                    Eliminar también los paquetes
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Borra los {target.totalPaquetes} paquete{plural} junto con el envío,
                    incluyendo su historial de tracking. Acción irreversible.
                  </span>
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-3 text-sm text-muted-foreground">
            El envío no tiene paquetes asociados. Se eliminará directamente.
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          {!tienePaquetes && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => onConfirm(false)}
              disabled={loading}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              {loading ? 'Eliminando...' : 'Eliminar envío'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PagoBadge({ estado }: { estado?: EstadoPagoConsolidado }) {
  const isPagado = estado === 'PAGADO';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
        isPagado
          ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]'
          : 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
      )}
    >
      <CircleDollarSign className="h-3 w-3" />
      {isPagado ? 'Pagado' : 'No pagado'}
    </span>
  );
}


function FechaCell({
  value,
  mutedIfEmpty = false,
}: {
  value?: string | null;
  mutedIfEmpty?: boolean;
}) {
  if (!value) {
    return (
      <span className={cn('text-xs', mutedIfEmpty ? 'text-muted-foreground/60' : 'text-muted-foreground')}>
        —
      </span>
    );
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <span className="text-xs text-muted-foreground">—</span>;
  const absolute = date.toLocaleString();
  const short = date.toLocaleDateString();
  const rel = relativeTime(date);
  return (
    <div className="flex flex-col leading-tight" title={absolute}>
      <span>{short}</span>
      {rel && <span className="text-[11px] opacity-70">{rel}</span>}
    </div>
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
