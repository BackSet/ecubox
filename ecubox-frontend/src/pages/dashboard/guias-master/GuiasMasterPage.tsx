import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  useGuiasMaster,
  useGuiasMasterPaginadas,
  useCrearGuiaMaster,
  useActualizarGuiaMaster,
  useEliminarGuiaMaster,
} from '@/hooks/useGuiasMaster';
import { useSearchPagination } from '@/hooks/useSearchPagination';
import { TablePagination } from '@/components/ui/TablePagination';
import { useConsignatariosOperario } from '@/hooks/useOperarioDespachos';
import { useAuthStore } from '@/stores/authStore';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { InlineErrorBanner } from '@/components/InlineErrorBanner';
import { KpiCard } from '@/components/KpiCard';
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
  Pencil,
  Trash2,
  UserRound,
  Clock,
  PackageCheck,
  Truck,
  Activity,
  Layers,
} from 'lucide-react';
import {
  GUIA_MASTER_ESTADO_ICONS,
  GUIA_MASTER_ESTADO_LABELS_CORTOS,
  GUIA_MASTER_ESTADO_ORDEN,
  GUIA_MASTER_ESTADO_TONES,
  GuiaMasterEstadoBadge,
} from './_estado';
import type { EstadoGuiaMaster, GuiaMaster } from '@/types/guia-master';
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

export function GuiasMasterPage() {
  const navigate = useNavigate();
  const { q, page, size, setQ, setPage, setSize, resetPage } = useSearchPagination({
    initialSize: 25,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingGuia, setEditingGuia] = useState<GuiaMaster | null>(null);
  const [deletingGuia, setDeletingGuia] = useState<GuiaMaster | null>(null);
  const [estadosFiltro, setEstadosFiltro] = useState<Set<EstadoGuiaMaster>>(
    () => new Set()
  );

  const hasUpdate = useAuthStore((s) => s.hasPermission('GUIAS_MASTER_UPDATE'));
  const hasDelete = useAuthStore((s) => s.hasPermission('GUIAS_MASTER_DELETE'));
  const eliminar = useEliminarGuiaMaster();

  // Para los chips de filtro y los KPIs siempre necesitamos el conteo total.
  const { data: guiasTodas = [] } = useGuiasMaster();

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

  const conteosPorEstado = useMemo(() => {
    const conteos = {} as Record<EstadoGuiaMaster, number>;
    for (const g of guiasTodas) {
      conteos[g.estadoGlobal] = (conteos[g.estadoGlobal] ?? 0) + 1;
    }
    return conteos;
  }, [guiasTodas]);

  // KPIs operativos: agrupamos los 8 estados en 4 etapas del ciclo de vida
  // para que el operario tenga un resumen accionable de un vistazo.
  const stats = useMemo(() => {
    const c = conteosPorEstado;
    const enEspera = (c.SIN_PIEZAS_REGISTRADAS ?? 0) + (c.EN_ESPERA_RECEPCION ?? 0);
    const enRecepcion =
      (c.RECEPCION_PARCIAL ?? 0) + (c.RECEPCION_COMPLETA ?? 0);
    const enDespacho = (c.DESPACHO_PARCIAL ?? 0) + (c.EN_REVISION ?? 0);
    const cerradas =
      (c.DESPACHO_COMPLETADO ?? 0) +
      (c.DESPACHO_INCOMPLETO ?? 0) +
      (c.CANCELADA ?? 0);
    return {
      total: guiasTodas.length,
      enEspera,
      enRecepcion,
      enDespacho,
      cerradas,
    };
  }, [conteosPorEstado, guiasTodas.length]);

  // Búsqueda y filtros se aplican en servidor; usamos el resultado tal cual.
  const filtered = guias;

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
          <Button onClick={() => setCreateOpen(true)}>Registrar guía</Button>
        }
      />

      {guiasTodas.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon={<Boxes className="h-5 w-5" />}
            label="Total guías"
            value={stats.total}
            tone="primary"
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
        </div>
      )}

      {guiasTodas.length > 0 && (
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
                count={guiasTodas.length}
                active={estadosFiltro.size === 0}
                onClick={() => {
                  setEstadosFiltro(new Set());
                  resetPage();
                }}
              />
              {GUIA_MASTER_ESTADO_ORDEN.map((estado) => {
                const count = conteosPorEstado[estado] ?? 0;
                const active = estadosFiltro.has(estado);
                if (count === 0 && !active) return null;
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
        // `estados`. Por eso usamos `guiasTodas` + el estado de los filtros
        // para diferenciar:
        //   - "No hay guías registradas": no existe NINGUNA guía en el sistema
        //     y tampoco hay búsqueda/filtros aplicados.
        //   - "Sin resultados": sí hay guías pero la búsqueda/filtro no
        //     encuentra coincidencias.
        (() => {
          const tieneFiltros = q.trim() !== '' || estadosFiltro.size > 0;
          const sinDatos = guiasTodas.length === 0 && !tieneFiltros;
          return (
            <EmptyState
              icon={Boxes}
              title={sinDatos ? 'No hay guías registradas' : 'Sin resultados'}
              description={
                sinDatos
                  ? 'Registra una guía indicando su número, consignatario y total de piezas esperadas (opcional).'
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
  const total = g.totalPiezasEsperadas;
  const registradas = g.piezasRegistradas ?? 0;
  const recibidas = g.piezasRecibidas ?? 0;
  const despachadas = g.piezasDespachadas ?? 0;

  if (total == null) {
    return (
      <div className="space-y-1">
        <Badge variant="outline" className="text-[var(--color-warning)] border-[var(--color-warning)]/30">
          Total pendiente
        </Badge>
        <p className="text-[11px] text-muted-foreground">
          {registradas} registrada{registradas === 1 ? '' : 's'}
          {recibidas > 0 ? ` · ${recibidas} recibida${recibidas === 1 ? '' : 's'}` : ''}
          {despachadas > 0 ? ` · ${despachadas} despachada${despachadas === 1 ? '' : 's'}` : ''}
        </p>
      </div>
    );
  }

  const safeTotal = Math.max(total, 1);
  const pctRegistradas = Math.min(100, (registradas / safeTotal) * 100);
  const pctRecibidas = Math.min(100, (recibidas / safeTotal) * 100);
  const pctDespachadas = Math.min(100, (despachadas / safeTotal) * 100);

  return (
    <div className="min-w-[12rem] space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-foreground">
          {registradas} / {total}
        </span>
        <span className="text-muted-foreground">piezas</span>
      </div>
      {/*
       * Usamos bg-muted (no la variable directa) para que el track del progreso
       * tenga mas contraste sobre la fila y respete el modo oscuro/claro.
       */}
      <div
        className="relative h-2 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`Progreso: ${registradas} registradas, ${recibidas} recibidas, ${despachadas} despachadas de ${total}`}
      >
        <div
          className="absolute inset-y-0 left-0 bg-[var(--color-info)]/70"
          style={{ width: `${pctRegistradas}%` }}
          title={`Registradas: ${registradas}/${total}`}
        />
        <div
          className="absolute inset-y-0 left-0 bg-[var(--color-warning)]/85"
          style={{ width: `${pctRecibidas}%` }}
          title={`Recibidas: ${recibidas}/${total}`}
        />
        <div
          className="absolute inset-y-0 left-0 bg-[var(--color-success)]/90"
          style={{ width: `${pctDespachadas}%` }}
          title={`Despachadas: ${despachadas}/${total}`}
        />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        <Dot
          color="bg-[var(--color-info)]"
          label={`Registradas ${registradas}`}
          title="Piezas creadas en el sistema (no necesariamente recibidas)"
        />
        <Dot
          color="bg-[var(--color-warning)]"
          label={`Recibidas ${recibidas}`}
          title="Piezas marcadas como recibidas en bodega"
        />
        <Dot
          color="bg-[var(--color-success)]"
          label={`Despachadas ${despachadas}`}
          title="Piezas despachadas al destino final"
        />
      </div>
    </div>
  );
}

function Dot({
  color,
  label,
  title,
}: {
  color: string;
  label: string;
  title?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1" title={title}>
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} aria-hidden />
      {label}
    </span>
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
  const [clienteId, setClienteId] = useState<number | undefined>(
    editing?.clienteUsuarioId ?? undefined,
  );
  const [consignatarioId, setConsignatarioId] = useState<number | undefined>(
    editing?.consignatarioId ?? undefined,
  );
  const crear = useCrearGuiaMaster();
  const actualizar = useActualizarGuiaMaster();
  const saving = isEdit ? actualizar.isPending : crear.isPending;
  const { data: consignatarios = [], isLoading: loadingDest } = useConsignatariosOperario();

  const clientes = useMemo(() => {
    const map = new Map<number, { id: number; nombre: string }>();
    for (const d of consignatarios) {
      if (d.clienteUsuarioId != null && d.clienteUsuarioNombre && !map.has(d.clienteUsuarioId)) {
        map.set(d.clienteUsuarioId, {
          id: d.clienteUsuarioId,
          nombre: d.clienteUsuarioNombre,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
    );
  }, [consignatarios]);

  const consignatariosFiltrados = useMemo(() => {
    if (clienteId == null) return consignatarios;
    return consignatarios.filter((d) => d.clienteUsuarioId === clienteId);
  }, [consignatarios, clienteId]);

  function handleClienteChange(value: string | number | undefined) {
    const cid = typeof value === 'string' ? Number(value) : value;
    setClienteId(cid);
    if (consignatarioId != null) {
      const dest = consignatarios.find((d) => d.id === consignatarioId);
      if (!dest || (cid != null && dest.clienteUsuarioId !== cid)) {
        setConsignatarioId(undefined);
      }
    }
  }

  function handleConsignatarioChange(value: string | number | undefined) {
    const did = typeof value === 'string' ? Number(value) : value;
    setConsignatarioId(did);
    if (did != null) {
      const dest = consignatarios.find((d) => d.id === did);
      if (dest && dest.clienteUsuarioId != null) {
        setClienteId(dest.clienteUsuarioId);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingBase.trim()) {
      toast.error('Indica el número de guía');
      return;
    }
    if (consignatarioId == null) {
      toast.error('Selecciona un consignatario');
      return;
    }
    try {
      if (isEdit && editing) {
        const tb = trackingBase.trim();
        const body: { consignatarioId: number; trackingBase?: string } = {
          consignatarioId: consignatarioId,
        };
        if (tb && tb !== editing.trackingBase) {
          body.trackingBase = tb;
        }
        await actualizar.mutateAsync({ id: editing.id, body });
        toast.success('Guía actualizada');
      } else {
        await crear.mutateAsync({
          trackingBase: trackingBase.trim(),
          consignatarioId: consignatarioId,
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

  const sinClientes = !loadingDest && clientes.length === 0;

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
              onChange={(e) => setTrackingBase(e.target.value)}
              placeholder="Ej: 1Z52159R0379385035"
              autoFocus
              className={isEdit ? 'font-mono' : undefined}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {isEdit
                ? 'Si lo cambias, se actualizarán los números de las piezas asociadas.'
                : 'El número que aparece en la guía del courier (UPS, FedEx, etc.).'}
            </p>
          </div>

          <div>
            <Label
              htmlFor="cliente-crear"
              className="mb-1 flex items-center gap-1 text-xs"
            >
              <Building2 className="h-3.5 w-3.5" />
              Cliente
            </Label>
            <SearchableCombobox<{ id: number; nombre: string }>
              id="cliente-crear"
              value={clienteId}
              onChange={handleClienteChange}
              options={clientes}
              getKey={(c) => c.id}
              getLabel={(c) => c.nombre}
              placeholder={
                loadingDest
                  ? 'Cargando...'
                  : sinClientes
                    ? 'Sin clientes disponibles'
                    : 'Todos los clientes'
              }
              searchPlaceholder="Buscar cliente..."
              emptyMessage="Sin clientes"
              disabled={loadingDest || sinClientes}
              renderOption={(c) => (
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{c.nombre}</span>
                </div>
              )}
              renderSelected={(c) => (
                <span className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.nombre}</span>
                </span>
              )}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Filtra los consignatarios. Limpia para ver todos.
            </p>
          </div>

          <div>
            <Label
              htmlFor="consignatario-crear"
              className="mb-1 flex items-center gap-1 text-xs"
            >
              <UserRound className="h-3.5 w-3.5" />
              Consignatario *
            </Label>
            <SearchableCombobox
              id="consignatario-crear"
              value={consignatarioId}
              onChange={handleConsignatarioChange}
              options={consignatariosFiltrados}
              getKey={(d) => d.id}
              getLabel={(d) => d.nombre}
              getSearchText={(d) =>
                [
                  d.nombre,
                  d.codigo ?? '',
                  d.canton ?? '',
                  d.provincia ?? '',
                  d.telefono ?? '',
                ].join(' ')
              }
              placeholder={
                loadingDest
                  ? 'Cargando consignatarios...'
                  : 'Selecciona un consignatario'
              }
              searchPlaceholder="Buscar por nombre, código, cantón..."
              emptyMessage="Sin coincidencias"
              disabled={loadingDest || consignatariosFiltrados.length === 0}
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
            {!loadingDest && consignatarios.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Aún no hay consignatarios registrados. Crea uno desde "Consignatarios".
              </p>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">
              El total de piezas y demás metadatos podrán definirse después al registrar paquetes.
            </p>
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

