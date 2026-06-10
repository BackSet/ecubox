import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  useDashboardGuiasMaster,
  useGuiasMasterPaginadas,
  useCrearGuiaMaster,
  useActualizarGuiaMaster,
  useEliminarGuiaMaster,
  useCancelarGuiaMaster,
  useMarcarGuiaMasterEnRevision,
  useSalirGuiaMasterDeRevision,
  useRecalcularGuiaMaster,
  useReabrirGuiaMaster,
  useAllGuiasMaster,
  useAprobarGuiaMaster,
} from '@/hooks/useGuiasMaster';
import { AplicarEstadoMasivoDialog, type AplicarEstadoOption } from '@/components/AplicarEstadoMasivoDialog';
import { useSearchPagination } from '@/hooks/useSearchPagination';
import { TablePagination } from '@/components/ui/TablePagination';
import { useConsignatariosOperario } from '@/hooks/useOperarioDespachos';
import { useAuthStore } from '@/stores/authStore';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { getApiErrorMessage } from '@/lib/api/error-message';
import {
  guiaMasterCreateSchema,
  trackingBaseSchema,
  guiaCancelarSchema,
  MAX_MOTIVO,
} from '@/lib/schemas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ListToolbar } from '@/components/ListToolbar';
import { PiezasProgress } from '@/components/PiezasProgress';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { InlineErrorBanner } from '@/components/InlineErrorBanner';
import { KpiCard } from '@/components/KpiCard';
import { KpiCardsGrid } from '@/components/KpiCardsGrid';
import { ChipFiltro, type ChipFiltroTone } from '@/components/ChipFiltro';
import { FiltrosBar } from '@/components/FiltrosBar';
import { MonoTrunc } from '@/components/MonoTrunc';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Boxes,
  Building2,
  CalendarDays,
  Eye,
  EyeOff,
  Tag,
  Pencil,
  Trash2,
  UserRound,
  Clock,
  PackageCheck,
  Truck,
  Activity,
  Layers,
  Loader2,
  Ban,
  Check,
} from 'lucide-react';
import {
  GUIA_MASTER_ESTADO_ICONS,
  GUIA_MASTER_ESTADO_LABELS_CORTOS,
  GUIA_MASTER_ESTADO_ORDEN,
  GUIA_MASTER_ESTADO_TONES,
  GUIA_MASTER_ESTADOS_TERMINALES,
  GuiaMasterEstadoBadge,
} from './_estado';
import type { EstadoGuiaMaster, GuiaMaster } from '@/types/guia-master';
import type { Consignatario } from '@/types/consignatario';
import type { StatusTone } from '@/components/ui/StatusBadge';
import { ConsignatarioInfo } from '../paquetes/PaqueteCells';

/**
 * Mapea el tono semantico del estado de la guia (StatusTone, 6 colores) al tono
 * compatible con ChipFiltro (5 colores). Como el chip no distingue 'info' de
 * 'primary', ambos se renderizan como primary.
 */
const STATUS_TO_CHIP_TONE: Record<StatusTone, ChipFiltroTone> = {
  primary: 'primary',
  info: 'primary',
  success: 'success',
  warning: 'warning',
  error: 'danger',
  neutral: 'neutral',
};

/** Estados terminales de guía master (no se puede operar sobre ellos). */
const ESTADOS_GUIA_TERMINALES: ReadonlySet<EstadoGuiaMaster> = new Set<EstadoGuiaMaster>([
  'DESPACHO_COMPLETADO',
  'CANCELADA',
]);

/** Acciones de ciclo de vida aplicables en lote a las guías master. */
const ACCIONES_GUIA: readonly AplicarEstadoOption[] = [
  { value: 'APROBAR', label: 'Aprobar guía' },
  { value: 'RECALCULAR', label: 'Recalcular estado' },
  { value: 'MARCAR_REVISION', label: 'Marcar en revisión' },
  { value: 'SALIR_REVISION', label: 'Salir de revisión' },
  { value: 'CANCELAR', label: 'Cancelar guía' },
  { value: 'REABRIR', label: 'Reabrir guía' },
];

/** Acciones que requieren un motivo obligatorio antes de aplicarse. */
const ACCIONES_CON_MOTIVO: ReadonlySet<string> = new Set(['CANCELAR', 'REABRIR']);

/** Texto de ayuda por acción: explica qué guías se listan. */
const AYUDA_ACCION: Record<string, string> = {
  APROBAR: 'Aprueba una guía en verificación o en revisión para reanudar el flujo y calcular su estado.',
  RECALCULAR: 'Recalcula el estado derivado. Se listan guías con al menos una pieza registrada (no terminales ni en revisión).',
  MARCAR_REVISION: 'Pausa el recálculo automático. Se listan guías activas que no están en revisión.',
  SALIR_REVISION: 'Reanuda el flujo normal. Solo se listan guías en revisión.',
  CANCELAR: 'Anula la guía. Solo se listan guías sin piezas despachadas y no terminales.',
  REABRIR: 'Reactiva una guía cerrada o cancelada. Solo se listan guías en estado terminal.',
};

/**
 * Indica si una acción de ciclo de vida es aplicable a una guía, reflejando las precondiciones
 * del backend (GuiaMasterService). Una guía ya despachada/terminal no es elegible para cambios
 * de estado (salvo reabrir), y recalcular exige al menos una pieza registrada.
 */
function guiaElegibleParaAccion(guia: GuiaMaster, accion: string): boolean {
  const estado = guia.estadoGlobal;
  const terminal = ESTADOS_GUIA_TERMINALES.has(estado);
  const piezasRegistradas = guia.piezasRegistradas ?? 0;
  const piezasDespachadas = guia.piezasDespachadas ?? 0;
  switch (accion) {
    case 'APROBAR':
      return estado === 'PENDIENTE_VERIFICACION' || estado === 'EN_REVISION';
    case 'RECALCULAR':
      return !terminal && estado !== 'EN_REVISION' && piezasRegistradas >= 1;
    case 'MARCAR_REVISION':
      return !terminal && estado !== 'EN_REVISION';
    case 'SALIR_REVISION':
      return estado === 'EN_REVISION';
    case 'CANCELAR':
      // No se cancela una guía terminal ni una con piezas ya despachadas.
      return !terminal && piezasDespachadas === 0;
    case 'REABRIR':
      return terminal;
    default:
      return false;
  }
}

export function GuiasMasterPage() {
  const navigate = useNavigate();
  const { q, page, size, setQ, setPage, setSize, resetPage } = useSearchPagination({
    initialSize: 25,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingGuia, setEditingGuia] = useState<GuiaMaster | null>(null);
  const [deletingGuia, setDeletingGuia] = useState<GuiaMaster | null>(null);
  const [cancelingGuia, setCancelingGuia] = useState<GuiaMaster | null>(null);
  const [estadosFiltro, setEstadosFiltro] = useState<Set<EstadoGuiaMaster>>(
    () => new Set()
  );

  const hasUpdate = useAuthStore((s) => s.hasPermission('GUIAS_MASTER_UPDATE'));
  const hasDelete = useAuthStore((s) => s.hasPermission('GUIAS_MASTER_DELETE'));
  const hasGuiasCreate = useAuthStore((s) => s.hasPermission('GUIAS_MASTER_CREATE'));
  const eliminar = useEliminarGuiaMaster();

  // Estado del diálogo "Aplicar estado"
  const [aplicarEstadoOpen, setAplicarEstadoOpen] = useState(false);
  const [guiasSeleccionadas, setGuiasSeleccionadas] = useState<number[]>([]);
  const [accionSeleccionada, setAccionSeleccionada] = useState('');
  const [motivoBulkOpen, setMotivoBulkOpen] = useState(false);
  const [motivoBulk, setMotivoBulk] = useState('');
  const [accionParaMotivo, setAccionParaMotivo] = useState<'CANCELAR' | 'REABRIR'>('CANCELAR');

  // Para chips y KPIs usamos el dashboard agregado, evitando cargar todas las guias.
  const { data: dashGM } = useDashboardGuiasMaster(5, true);

  const estadosArray = useMemo(
    () => Array.from(estadosFiltro),
    [estadosFiltro]
  );

  const pageQuery = useGuiasMasterPaginadas({
    q: q.trim() || undefined,
    estados: estadosArray.length > 0 ? estadosArray : undefined,
    page,
    size,
  });
  const guias = pageQuery.data?.content ?? [];
  const isLoading = pageQuery.isLoading;
  const error = pageQuery.error;
  const totalElements = pageQuery.data?.totalElements ?? 0;
  const totalPages = pageQuery.data?.totalPages ?? 0;

  const conteosPorEstado: Partial<Record<EstadoGuiaMaster, number>> =
    dashGM?.conteosPorEstado ?? {};
  const totalGuias = useMemo(
    () => Object.values(conteosPorEstado).reduce((total, count) => total + count, 0),
    [conteosPorEstado]
  );

  // KPIs operativos: agrupamos los 8 estados en 4 etapas del ciclo de vida
  // para que el operario tenga un resumen accionable de un vistazo.
  const stats = useMemo(() => {
    const c = conteosPorEstado;
    const enEspera =
      (c.SIN_PAQUETES_REGISTRADOS ?? 0) +
      (c.CON_PAQUETES_REGISTRADOS ?? 0) +
      (c.PENDIENTE_VERIFICACION ?? 0);
    const enRecepcion =
      (c.ENVIO_PARCIAL ?? 0) +
      (c.ENVIO_COMPLETO ?? 0) +
      (c.RECEPCION_PARCIAL ?? 0) +
      (c.RECEPCION_COMPLETA ?? 0);
    const enDespacho = (c.DESPACHO_PARCIAL ?? 0) + (c.EN_REVISION ?? 0);
    const cerradas =
      (c.DESPACHO_COMPLETADO ?? 0) +
      (c.CANCELADA ?? 0);
    return {
      total: totalGuias,
      enEspera,
      enRecepcion,
      enDespacho,
      cerradas,
    };
  }, [conteosPorEstado, totalGuias]);

  // Búsqueda y filtros se aplican en servidor; usamos el resultado tal cual.
  const filtered = guias;

  // Hooks y lógica de "Aplicar estado" masivo
  const allGuiasQuery = useAllGuiasMaster(aplicarEstadoOpen);
  const marcarRevision = useMarcarGuiaMasterEnRevision();
  const salirRevision = useSalirGuiaMasterDeRevision();
  const recalcular = useRecalcularGuiaMaster();
  const cancelarBulk = useCancelarGuiaMaster();
  const reabrirBulk = useReabrirGuiaMaster();
  const aprobarBulk = useAprobarGuiaMaster();

  const aplicarIsPending =
    marcarRevision.isPending || salirRevision.isPending || recalcular.isPending ||
    cancelarBulk.isPending || reabrirBulk.isPending || aprobarBulk.isPending;

  const cerrarAplicarEstado = () => {
    setAplicarEstadoOpen(false);
    setGuiasSeleccionadas([]);
    setAccionSeleccionada('');
  };

  const handleAplicarAccionGuias = async () => {
    if (!accionSeleccionada) {
      toast.warning('Selecciona una acción a aplicar');
      return;
    }
    if (guiasSeleccionadas.length === 0) {
      toast.warning('Selecciona al menos una guía');
      return;
    }
    if (ACCIONES_CON_MOTIVO.has(accionSeleccionada)) {
      setAccionParaMotivo(accionSeleccionada as 'CANCELAR' | 'REABRIR');
      setAplicarEstadoOpen(false);
      setMotivoBulkOpen(true);
      return;
    }
    await runBulkAction(accionSeleccionada, guiasSeleccionadas, undefined);
    cerrarAplicarEstado();
  };

  const runBulkAction = async (accion: string, ids: number[], motivo: string | undefined) => {
    const results = await Promise.allSettled(
      ids.map((id) => {
        if (accion === 'APROBAR') return aprobarBulk.mutateAsync(id);
        if (accion === 'RECALCULAR') return recalcular.mutateAsync(id);
        if (accion === 'MARCAR_REVISION') return marcarRevision.mutateAsync({ id, body: { motivo: motivo ?? '' } });
        if (accion === 'SALIR_REVISION') return salirRevision.mutateAsync({ id, body: { motivo: motivo ?? '' } });
        if (accion === 'CANCELAR') return cancelarBulk.mutateAsync({ id, body: { motivo: motivo ?? '' } });
        if (accion === 'REABRIR') return reabrirBulk.mutateAsync({ id, body: { motivo: motivo ?? '' } });
        return Promise.reject(new Error('Acción desconocida'));
      }),
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const fail = results.filter((r) => r.status === 'rejected').length;
    if (fail === 0) {
      toast.success(`Acción aplicada a ${ok} guía(s)`);
    } else {
      toast.warning(`${ok} aplicada(s) · ${fail} omitida(s) (ver condiciones)`);
    }
  };

  function toggleEstado(estado: EstadoGuiaMaster) {
    setEstadosFiltro((prev) => {
      const next = new Set(prev);
      if (next.has(estado)) next.delete(estado);
      else next.add(estado);
      return next;
    });
    resetPage();
  }

  return (
    <div className="page-stack">
      <ListToolbar
        title="Guías master"
        searchPlaceholder="Buscar por número de guía, consignatario (nombre/código) o cliente (usuario/email)..."
        value={q}
        onSearchChange={setQ}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {hasUpdate && (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setAplicarEstadoOpen(true)}
              >
                <Tag className="mr-2 h-4 w-4" />
                Aplicar acción
              </Button>
            )}
            {hasGuiasCreate && (
              <Button onClick={() => setCreateOpen(true)}>Registrar guía</Button>
            )}
          </div>
        }
      />

      {totalGuias > 0 && (
        <KpiCardsGrid>
          <KpiCard
            icon={<Boxes className="h-5 w-5" />}
            label="Total guías"
            value={stats.total}
            tone="primary"
            hint={
              stats.cerradas > 0
                ? `${stats.cerradas} cerradas o canceladas`
                : 'Todas en curso'
            }
          />
          <KpiCard
            icon={<Clock className="h-5 w-5" />}
            label="En espera"
            value={stats.enEspera}
            tone={stats.enEspera > 0 ? 'warning' : 'neutral'}
            hint="Sin recibir aún"
          />
          <KpiCard
            icon={<PackageCheck className="h-5 w-5" />}
            label="En recepción"
            value={stats.enRecepcion}
            tone={stats.enRecepcion > 0 ? 'primary' : 'neutral'}
            hint="Parciales y completas"
          />
          <KpiCard
            icon={<Truck className="h-5 w-5" />}
            label="En despacho"
            value={stats.enDespacho}
            tone={stats.enDespacho > 0 ? 'primary' : 'neutral'}
            hint="Parciales o en revisión"
          />
        </KpiCardsGrid>
      )}

      {totalGuias > 0 && (
        <FiltrosBar
          hayFiltrosActivos={estadosFiltro.size > 0}
          onLimpiar={() => {
            setEstadosFiltro(new Set());
            resetPage();
          }}
          chips={
            <>
              <ChipFiltro
                label="Todas"
                count={totalGuias}
                active={estadosFiltro.size === 0}
                onClick={() => {
                  setEstadosFiltro(new Set());
                  resetPage();
                }}
              />
              {GUIA_MASTER_ESTADO_ORDEN.map((estado) => {
                const count = conteosPorEstado[estado] ?? 0;
                const active = estadosFiltro.has(estado);
                if (count === 0 && !active && estado !== 'PENDIENTE_VERIFICACION') return null;
                const Icon = GUIA_MASTER_ESTADO_ICONS[estado];
                return (
                  <ChipFiltro
                    key={estado}
                    label={GUIA_MASTER_ESTADO_LABELS_CORTOS[estado]}
                    count={count}
                    active={active}
                    tone={STATUS_TO_CHIP_TONE[GUIA_MASTER_ESTADO_TONES[estado]]}
                    icon={<Icon className="h-3.5 w-3.5" />}
                    onClick={() => toggleEstado(estado)}
                  />
                );
              })}
            </>
          }
        />
      )}

      {/*
       * Mostramos el banner de error ENCIMA de la tabla en lugar de reemplazarla.
       * Si TanStack Query mantiene los resultados previos (keepPreviousData),
       * el usuario puede seguir viendo y operando con la última lista mientras
       * el reintento está en curso. Sólo cuando no hay datos en cache mostramos
       * el alerta grande.
       */}
      {error && filtered.length > 0 && (
        <InlineErrorBanner
          message="No se pudieron actualizar las guías"
          hint="Mostrando los resultados anteriores. Reintentando en segundo plano."
          onRetry={() => pageQuery.refetch()}
          retrying={pageQuery.isFetching}
        />
      )}

      {error && filtered.length === 0 && !isLoading ? (
        <InlineErrorBanner
          message="Error al cargar guías master"
          hint="Verifica tu conexión o intenta de nuevo."
          onRetry={() => pageQuery.refetch()}
          retrying={pageQuery.isFetching}
        />
      ) : !isLoading && filtered.length === 0 ? (
        // Importante: `filtered` viene del endpoint /page que ya aplica `q` y
        // `estados`. Por eso usamos el total agregado + el estado de los filtros
        // para diferenciar:
        //   - "No hay guías registradas": no existe NINGUNA guía en el sistema
        //     y tampoco hay búsqueda/filtros aplicados.
        //   - "Sin resultados": sí hay guías pero la búsqueda/filtro no
        //     encuentra coincidencias.
        (() => {
          const tieneFiltros = q.trim() !== '' || estadosFiltro.size > 0;
          const sinDatos = totalGuias === 0 && !tieneFiltros;
          return (
            <EmptyState
              icon={Boxes}
              title={sinDatos ? 'No hay guías registradas' : 'Sin resultados'}
              description={
                sinDatos
                  ? 'Registra una guía indicando su número y consignatario.'
                  : tieneFiltros && q.trim() !== ''
                    ? `No encontramos guías que coincidan con "${q.trim()}". Prueba con otro número de guía, consignatario o cliente.`
                    : 'No hay guías que coincidan con los filtros aplicados.'
              }
              action={
                sinDatos ? (
                  <Button onClick={() => setCreateOpen(true)}>Registrar guía</Button>
                ) : tieneFiltros ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQ('');
                      setEstadosFiltro(new Set());
                      resetPage();
                    }}
                  >
                    Limpiar búsqueda
                  </Button>
                ) : undefined
              }
            />
          );
        })()
      ) : (
        <>
        <p className="text-xs text-muted-foreground">
          {totalElements} guía{totalElements === 1 ? '' : 's'}
          {pageQuery.isFetching ? ' · cargando...' : ''}
        </p>
        <ListTableShell>
          <Table className="min-w-[760px] text-sm [&_td]:py-2.5">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[14rem]">
                  <span className="inline-flex items-center gap-1.5">
                    <Boxes className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    Guía
                  </span>
                </TableHead>
                <TableHead>
                  <span className="inline-flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    Estado
                  </span>
                </TableHead>
                <TableHead className="min-w-[14rem]">
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    Piezas
                  </span>
                </TableHead>
                <TableHead>
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    Consignatario
                  </span>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    Cliente
                  </span>
                </TableHead>
                <TableHead className="hidden xl:table-cell">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    Creada
                  </span>
                </TableHead>
                <TableHead className="w-12 text-right" aria-label="Acciones" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRowsSkeleton
                  columns={7}
                  columnClasses={{
                    4: 'hidden md:table-cell',
                    5: 'hidden xl:table-cell',
                  }}
                />
              )}
              {filtered.map((g) => {
                const totalPendiente = g.totalPiezasEsperadas == null;
                return (
                  <TableRow
                    key={g.id}
                    className={`cursor-pointer transition-colors ${totalPendiente ? 'bg-[color-mix(in_oklab,var(--color-warning)_10%,transparent)] hover:bg-[color-mix(in_oklab,var(--color-warning)_16%,transparent)]' : 'hover:bg-muted/40'}`}
                    onClick={() =>
                      navigate({
                        to: '/guias-master/$id',
                        params: { id: String(g.id) },
                      })
                    }
                  >
                    <TableCell className="max-w-[14rem] align-top">
                      <MonoTrunc
                        value={g.trackingBase}
                        className="font-medium text-foreground"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <GuiaMasterEstadoBadge estado={g.estadoGlobal} />
                    </TableCell>
                    <TableCell className="align-top">
                      <PiezasProgressCell guia={g} />
                    </TableCell>
                    <TableCell className="max-w-[18rem] align-top">
                      <ConsignatarioInfo
                        nombre={g.consignatarioNombre}
                        telefono={g.consignatarioTelefono}
                        direccion={g.consignatarioDireccion}
                        provincia={g.consignatarioProvincia}
                        canton={g.consignatarioCanton}
                        emptyLabel="Sin asignar"
                        emptyItalic
                      />
                    </TableCell>
                    <TableCell className="hidden align-top md:table-cell">
                      <PersonaCell
                        nombre={g.clienteUsuarioNombre}
                        icon={<Building2 className="h-3.5 w-3.5" />}
                        emptyLabel="—"
                      />
                    </TableCell>
                    <TableCell className="hidden align-top text-xs text-muted-foreground xl:table-cell">
                      <FechaCreada createdAt={g.createdAt} />
                    </TableCell>
                    <TableCell
                      className="text-right align-top"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowActionsMenu
                        items={[
                          {
                            label: 'Ver piezas',
                            icon: Eye,
                            onSelect: () =>
                              navigate({
                                to: '/guias-master/$id',
                                params: { id: String(g.id) },
                              }),
                          },
                          {
                            label: 'Editar guía',
                            icon: Pencil,
                            onSelect: () => setEditingGuia(g),
                            hidden: !hasUpdate,
                          },
                          {
                            label: 'Aprobar guía',
                            icon: Check,
                            onSelect: async () => {
                              try {
                                await aprobarBulk.mutateAsync(g.id);
                                toast.success('Guía master aprobada');
                              } catch (err: unknown) {
                                toast.error(getApiErrorMessage(err) ?? 'No se pudo aprobar la guía');
                              }
                            },
                            hidden:
                              !hasUpdate ||
                              !(g.estadoGlobal === 'PENDIENTE_VERIFICACION' || g.estadoGlobal === 'EN_REVISION'),
                          },
                          {
                            label: 'Mandar a revisión',
                            icon: Eye,
                            onSelect: async () => {
                              try {
                                await marcarRevision.mutateAsync({ id: g.id, body: {} });
                                toast.success('Guía marcada en revisión');
                              } catch (err: unknown) {
                                toast.error(getApiErrorMessage(err) ?? 'No se pudo marcar en revisión');
                              }
                            },
                            hidden:
                              !hasUpdate ||
                              !(
                                !GUIA_MASTER_ESTADOS_TERMINALES.has(g.estadoGlobal) &&
                                g.estadoGlobal !== 'EN_REVISION'
                              ),
                          },
                          {
                            label: 'Salir de revisión',
                            icon: EyeOff,
                            onSelect: async () => {
                              try {
                                await salirRevision.mutateAsync({ id: g.id, body: {} });
                                toast.success('Revisión finalizada');
                              } catch (err: unknown) {
                                toast.error(getApiErrorMessage(err) ?? 'No se pudo salir de revisión');
                              }
                            },
                            hidden: !hasUpdate || g.estadoGlobal !== 'EN_REVISION',
                          },
                          {
                            label: 'Cancelar guía',
                            icon: Ban,
                            onSelect: () => setCancelingGuia(g),
                            hidden:
                              !hasUpdate ||
                              !(
                                !GUIA_MASTER_ESTADOS_TERMINALES.has(g.estadoGlobal) &&
                                (g.piezasDespachadas ?? 0) === 0 &&
                                g.estadoGlobal !== 'EN_REVISION'
                              ),
                          },
                          { type: 'separator' },
                          {
                            label: 'Eliminar',
                            icon: Trash2,
                            destructive: true,
                            onSelect: () => setDeletingGuia(g),
                            hidden: !hasDelete,
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
          loading={pageQuery.isFetching}
        />
        </>
      )}

      {createOpen && (
        <GuiaMasterFormDialog mode="create" onClose={() => setCreateOpen(false)} />
      )}

      {editingGuia && (
        <GuiaMasterFormDialog
          mode="edit"
          guia={editingGuia}
          onClose={() => setEditingGuia(null)}
        />
      )}

      {cancelingGuia && (
        <CancelarGuiaDialog
          guia={cancelingGuia}
          onClose={() => setCancelingGuia(null)}
        />
      )}

      <ConfirmDialog
        open={deletingGuia != null}
        onOpenChange={(open) => !open && !eliminar.isPending && setDeletingGuia(null)}
        title="¿Eliminar guía?"
        description={
          deletingGuia
            ? `Se eliminará la guía "${deletingGuia.trackingBase}" junto con todos sus paquetes asociados${
                (deletingGuia.piezasRegistradas ?? 0) > 0
                  ? ` (${deletingGuia.piezasRegistradas} pieza${
                      deletingGuia.piezasRegistradas === 1 ? '' : 's'
                    })`
                  : ''
              }. Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        variant="destructive"
        loading={eliminar.isPending}
        onConfirm={async () => {
          if (!deletingGuia) return;
          try {
            await eliminar.mutateAsync(deletingGuia.id);
            toast.success('Guía eliminada');
            setDeletingGuia(null);
          } catch (err: unknown) {
            toast.error(getApiErrorMessage(err) ?? 'No se pudo eliminar la guía');
            throw err;
          }
        }}
      />

      <AplicarEstadoMasivoDialog
        open={aplicarEstadoOpen}
        title="Aplicar acción a guías master"
        description="Aplica una acción de ciclo de vida a las guías master seleccionadas."
        selectionLabel="guías"
        searchPlaceholder="Buscar por tracking base..."
        hideModoSelector={true}
        mode="seleccion"
        onModeChange={() => {}}
        dateFrom=""
        dateTo=""
        onDateFromChange={() => {}}
        onDateToChange={() => {}}
        items={(accionSeleccionada ? allGuiasQuery.data ?? [] : [])
          .filter((g) => guiaElegibleParaAccion(g, accionSeleccionada))
          .map((g) => ({
          id: g.id,
          searchText: [g.trackingBase, g.consignatarioNombre, g.clienteUsuarioNombre]
            .filter(Boolean)
            .join(' ') || String(g.id),
          content: (
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-mono text-xs font-medium">{g.trackingBase}</span>
                {g.consignatarioNombre && (
                  <span className="truncate text-xs text-muted-foreground">{g.consignatarioNombre}</span>
                )}
                <span className="text-[11px] text-muted-foreground">
                  {g.piezasRegistradas ?? 0}
                  {g.totalPiezasEsperadas != null ? `/${g.totalPiezasEsperadas}` : ''} piezas
                  {' · '}{g.piezasRecibidas ?? 0} recibidas
                  {' · '}{g.piezasDespachadas ?? 0} despachadas
                </span>
              </div>
              <Badge variant="outline" className="shrink-0 text-[11px]">
                {GUIA_MASTER_ESTADO_LABELS_CORTOS[g.estadoGlobal] ?? g.estadoGlobal}
              </Badge>
            </div>
          ),
        }))}
        selectedIds={guiasSeleccionadas}
        onSelectedIdsChange={setGuiasSeleccionadas}
        options={[...ACCIONES_GUIA]}
        selectedOption={accionSeleccionada}
        onSelectedOptionChange={setAccionSeleccionada}
        optionLabel="Acción"
        optionHelp={accionSeleccionada ? AYUDA_ACCION[accionSeleccionada] : undefined}
        periodHelp={null}
        loading={aplicarIsPending}
        onConfirm={handleAplicarAccionGuias}
        onOpenChange={(open) => !open && cerrarAplicarEstado()}
      />

      {motivoBulkOpen && (
        <MotivoBulkDialog
          accion={accionParaMotivo}
          count={guiasSeleccionadas.length}
          loading={accionParaMotivo === 'CANCELAR' ? cancelarBulk.isPending : reabrirBulk.isPending}
          onClose={() => {
            setMotivoBulkOpen(false);
            setMotivoBulk('');
            setAplicarEstadoOpen(true);
          }}
          onConfirm={async (motivo) => {
            await runBulkAction(accionParaMotivo, guiasSeleccionadas, motivo);
            setMotivoBulkOpen(false);
            setMotivoBulk('');
            cerrarAplicarEstado();
          }}
          motivo={motivoBulk}
          onMotivoChange={setMotivoBulk}
        />
      )}

    </div>
  );
}

function PersonaCell({
  nombre,
  icon,
  emptyLabel = '—',
  emptyItalic = false,
}: {
  nombre?: string | null;
  icon?: React.ReactNode;
  emptyLabel?: string;
  emptyItalic?: boolean;
}) {
  if (!nombre) {
    return (
      <span className={`text-xs text-muted-foreground ${emptyItalic ? 'italic' : ''}`}>
        {emptyLabel}
      </span>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-sm">
      {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      <span className="truncate" title={nombre}>
        {nombre}
      </span>
    </div>
  );
}

function PiezasProgressCell({ guia: g }: { guia: GuiaMaster }) {
  return (
    <PiezasProgress
      total={g.totalPiezasEsperadas}
      registradas={g.piezasRegistradas ?? 0}
      recibidas={g.piezasRecibidas ?? 0}
      despachadas={g.piezasDespachadas ?? 0}
      size="sm"
    />
  );
}

function FechaCreada({ createdAt }: { createdAt?: string }) {
  if (!createdAt) return <>—</>;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return <>—</>;
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

type GuiaMasterFormDialogProps =
  | { mode: 'create'; onClose: () => void; guia?: never }
  | { mode: 'edit'; guia: GuiaMaster; onClose: () => void };

function GuiaMasterFormDialog(props: GuiaMasterFormDialogProps) {
  const { mode, onClose } = props;
  const isEdit = mode === 'edit';
  const editing = isEdit ? props.guia : null;

  const [trackingBase, setTrackingBase] = useState(editing?.trackingBase ?? '');
  const [consignatarioId, setConsignatarioId] = useState<number | undefined>(
    editing?.consignatarioId ?? undefined
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const crear = useCrearGuiaMaster();
  const actualizar = useActualizarGuiaMaster();
  const saving = isEdit ? actualizar.isPending : crear.isPending;
  const { data: consignatarios = [], isLoading: loadingConsignatarios } =
    useConsignatariosOperario();

  function handleConsignatarioChange(value: string | number | undefined) {
    const id = typeof value === 'string' ? Number(value) : value;
    setConsignatarioId(id);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.consignatarioId;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (isEdit && editing) {
      const tb = trackingBase.trim();
      const tbParsed = trackingBaseSchema.safeParse(tb);
      if (!tbParsed.success) {
        errs.trackingBase = tbParsed.error.issues[0]?.message ?? 'Número de guía inválido';
      }
      const consignatarioParsed = guiaMasterCreateSchema
        .pick({ consignatarioId: true })
        .safeParse({ consignatarioId });
      if (!consignatarioParsed.success) {
        errs.consignatarioId =
          consignatarioParsed.error.issues[0]?.message ?? 'Selecciona un consignatario';
      }
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        toast.error(Object.values(errs)[0]);
        return;
      }
      setFieldErrors({});
    } else {
      const baseParsed = guiaMasterCreateSchema.safeParse({
        trackingBase: trackingBase.trim(),
        consignatarioId,
      });
      if (!baseParsed.success) {
        for (const issue of baseParsed.error.issues) {
          const key = String(issue.path[0] ?? '_form');
          if (!errs[key]) errs[key] = issue.message;
        }
      }
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        toast.error(Object.values(errs)[0]);
        return;
      }
      setFieldErrors({});
    }

    try {
      if (isEdit && editing) {
        const tb = trackingBase.trim();
        const body = {
          trackingBase: tb,
          consignatarioId: consignatarioId!,
        };
        await actualizar.mutateAsync({ id: editing.id, body });
        toast.success('Guía actualizada');
      } else {
        await crear.mutateAsync({
          trackingBase: trackingBase.trim(),
          consignatarioId: consignatarioId!,
        });
        toast.success('Guía registrada');
      }
      onClose();
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      if (res?.status === 409) {
        toast.error(res?.data?.message ?? 'Ya existe otra guía con ese número');
      } else {
        toast.error(
          res?.data?.message ??
            (isEdit ? 'Error al actualizar la guía' : 'Error al registrar la guía'),
        );
      }
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar guía' : 'Registrar guía'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="trackingBase" className="mb-1 block">
              Número de guía *
            </Label>
            <Input
              id="trackingBase"
              value={trackingBase}
              onChange={(e) => {
                setTrackingBase(e.target.value);
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.trackingBase;
                  return next;
                });
              }}
              placeholder="Ej: 1Z52159R0379385035"
              autoFocus
              className={isEdit ? 'font-mono' : undefined}
              aria-invalid={!!fieldErrors.trackingBase}
            />
            {fieldErrors.trackingBase && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.trackingBase}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {isEdit
                ? 'Si lo cambias, se actualizarán los números de las piezas asociadas.'
                : 'El número que aparece en la guía del courier (UPS, FedEx, etc.).'}
            </p>
          </div>

          <div>
            <Label
              htmlFor="guia-consignatario"
              className="mb-1 flex items-center gap-1 text-xs"
            >
              <UserRound className="h-3.5 w-3.5" />
              Consignatario *
            </Label>
            <SearchableCombobox<Consignatario>
              id="guia-consignatario"
              value={consignatarioId}
              onChange={handleConsignatarioChange}
              options={consignatarios}
              getKey={(d) => d.id}
              getLabel={(d) => d.nombre}
              getSearchText={(d) =>
                [
                  d.nombre,
                  d.codigo ?? '',
                  d.canton ?? '',
                  d.provincia ?? '',
                  d.telefono ?? '',
                  d.clienteUsuarioNombre ?? '',
                ].join(' ')
              }
              placeholder={
                loadingConsignatarios
                  ? 'Cargando consignatarios...'
                  : 'Selecciona un consignatario'
              }
              searchPlaceholder="Buscar por nombre, código, cantón..."
              emptyMessage="Sin consignatarios"
              disabled={loadingConsignatarios || consignatarios.length === 0}
              clearable={false}
              renderOption={(d) => (
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{d.nombre}</span>
                    {d.codigo && (
                      <span className="text-xs text-muted-foreground">· {d.codigo}</span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[d.canton, d.provincia].filter(Boolean).join(', ') ||
                      d.clienteUsuarioNombre ||
                      ''}
                  </div>
                </div>
              )}
              renderSelected={(d) => (
                <span className="flex items-center gap-2">
                  <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{d.nombre}</span>
                  {d.codigo && (
                    <span className="text-xs text-muted-foreground">· {d.codigo}</span>
                  )}
                </span>
              )}
            />
            {!loadingConsignatarios && consignatarios.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Aún no hay consignatarios registrados. Crea uno desde "Consignatarios".
              </p>
            )}
            {fieldErrors.consignatarioId && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.consignatarioId}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? 'Guardando...'
                : isEdit
                  ? 'Guardar cambios'
                  : 'Registrar guía'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CancelarGuiaDialogProps {
  guia: GuiaMaster;
  onClose: () => void;
}

function CancelarGuiaDialog({ guia, onClose }: CancelarGuiaDialogProps) {
  const [motivo, setMotivo] = useState('');
  const [motivoError, setMotivoError] = useState<string | undefined>();
  const cancelar = useCancelarGuiaMaster();

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    const parsed = guiaCancelarSchema.safeParse({ motivo });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Debes indicar un motivo';
      setMotivoError(msg);
      toast.warning(msg);
      return;
    }
    setMotivoError(undefined);
    try {
      await cancelar.mutateAsync({ id: guia.id, body: { motivo: parsed.data.motivo } });
      toast.success('Guía cancelada');
      onClose();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err) ?? 'No se pudo cancelar la guía');
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !cancelar.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar guía master</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Anula la guía "{guia.trackingBase}" antes de despachar piezas. Solo aplica si aún no se ha despachado ninguna pieza. Quedará registrada en el historial.
          </p>
        </DialogHeader>
        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <Label htmlFor="motivo-cancelar" className="mb-1 block">
              Motivo (obligatorio)
            </Label>
            <Textarea
              id="motivo-cancelar"
              rows={3}
              maxLength={MAX_MOTIVO}
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                setMotivoError(undefined);
              }}
              placeholder="Ej: cliente solicitó anulación / error de registro"
              aria-invalid={!!motivoError}
            />
            {motivoError && <p className="mt-1 text-xs text-destructive">{motivoError}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={cancelar.isPending}
            >
              Volver
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={cancelar.isPending}
            >
              {cancelar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {cancelar.isPending ? 'Cancelando...' : 'Cancelar guía'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface MotivoBulkDialogProps {
  accion: 'CANCELAR' | 'REABRIR';
  count: number;
  motivo: string;
  loading: boolean;
  onMotivoChange: (v: string) => void;
  onClose: () => void;
  onConfirm: (motivo: string) => Promise<void>;
}

const MOTIVO_BULK_UI = {
  CANCELAR: {
    title: 'Cancelar',
    nota: 'Solo se cancelarán las guías sin piezas despachadas y no terminales.',
    placeholder: 'Ej: cliente solicitó anulación / error de registro',
    submitVariant: 'destructive' as const,
    pendingLabel: 'Cancelando...',
  },
  REABRIR: {
    title: 'Reabrir',
    nota: 'Solo se reabrirán guías en estado terminal (cerradas o canceladas); su estado se recalculará.',
    placeholder: 'Ej: reactivación por nueva pieza / reapertura solicitada',
    submitVariant: 'default' as const,
    pendingLabel: 'Reabriendo...',
  },
};

function MotivoBulkDialog({ accion, count, motivo, loading, onMotivoChange, onClose, onConfirm }: MotivoBulkDialogProps) {
  const [motivoError, setMotivoError] = useState<string | undefined>();
  const ui = MOTIVO_BULK_UI[accion];
  const plural = count === 1 ? '' : 's';

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    const parsed = guiaCancelarSchema.safeParse({ motivo });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Debes indicar un motivo';
      setMotivoError(msg);
      toast.warning(msg);
      return;
    }
    setMotivoError(undefined);
    await onConfirm(parsed.data.motivo);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{ui.title} {count} guía{plural} master</DialogTitle>
          <p className="text-sm text-muted-foreground">{ui.nota}</p>
        </DialogHeader>
        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <Label htmlFor="motivo-bulk" className="mb-1 block">
              Motivo (obligatorio)
            </Label>
            <Textarea
              id="motivo-bulk"
              rows={3}
              maxLength={MAX_MOTIVO}
              value={motivo}
              onChange={(e) => {
                onMotivoChange(e.target.value);
                setMotivoError(undefined);
              }}
              placeholder={ui.placeholder}
              aria-invalid={!!motivoError}
            />
            {motivoError && <p className="mt-1 text-xs text-destructive">{motivoError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Volver
            </Button>
            <Button type="submit" variant={ui.submitVariant} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? ui.pendingLabel : `${ui.title} ${count} guía${plural}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
