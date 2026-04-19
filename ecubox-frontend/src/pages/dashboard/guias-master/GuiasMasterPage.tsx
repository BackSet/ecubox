import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  useGuiasMaster,
  useCrearGuiaMaster,
  useActualizarGuiaMaster,
  useEliminarGuiaMaster,
} from '@/hooks/useGuiasMaster';
import { useDestinatariosOperario } from '@/hooks/useOperarioDespachos';
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
import { LoadingState } from '@/components/LoadingState';
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
  Eye,
  Pencil,
  Trash2,
  UserRound,
  Clock,
  PackageCheck,
  Truck,
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
import { DestinatarioInfo } from '../paquetes/PaqueteCells';

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
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingGuia, setEditingGuia] = useState<GuiaMaster | null>(null);
  const [deletingGuia, setDeletingGuia] = useState<GuiaMaster | null>(null);
  const [estadosFiltro, setEstadosFiltro] = useState<Set<EstadoGuiaMaster>>(
    () => new Set()
  );

  const hasUpdate = useAuthStore((s) => s.hasPermission('GUIAS_MASTER_UPDATE'));
  const hasDelete = useAuthStore((s) => s.hasPermission('GUIAS_MASTER_DELETE'));
  const eliminar = useEliminarGuiaMaster();

  // Para los chips de filtro siempre necesitamos el conteo total.
  const { data: guiasTodas = [] } = useGuiasMaster();

  const estadosArray = useMemo(
    () => Array.from(estadosFiltro),
    [estadosFiltro]
  );

  const {
    data: guias = [],
    isLoading,
    error,
  } = useGuiasMaster(undefined, estadosArray.length > 0 ? estadosArray : undefined);

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
    const enEspera = c.EN_ESPERA_RECEPCION ?? 0;
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guias;
    return guias.filter(
      (g) =>
        g.trackingBase.toLowerCase().includes(q) ||
        (g.destinatarioNombre?.toLowerCase().includes(q) ?? false) ||
        (g.clienteUsuarioNombre?.toLowerCase().includes(q) ?? false)
    );
  }, [guias, search]);

  function toggleEstado(estado: EstadoGuiaMaster) {
    setEstadosFiltro((prev) => {
      const next = new Set(prev);
      if (next.has(estado)) next.delete(estado);
      else next.add(estado);
      return next;
    });
  }

  return (
    <div className="page-stack">
      <ListToolbar
        title="Guías"
        searchPlaceholder="Buscar por número de guía, destinatario o cliente..."
        onSearchChange={setSearch}
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
          onLimpiar={() => setEstadosFiltro(new Set())}
          chips={
            <>
              <ChipFiltro
                label="Todas"
                count={guiasTodas.length}
                active={estadosFiltro.size === 0}
                onClick={() => setEstadosFiltro(new Set())}
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

      {isLoading ? (
        <LoadingState text="Cargando guías master..." />
      ) : error ? (
        <div className="ui-alert ui-alert-error">
          Error al cargar guías master.
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={guias.length === 0 ? 'No hay guías registradas' : 'Sin resultados'}
          description={
            guias.length === 0
              ? 'Registra una guía indicando su número, destinatario y total de piezas esperadas (opcional).'
              : 'Prueba con otro número de guía.'
          }
          action={
            guias.length === 0 ? (
              <Button onClick={() => setCreateOpen(true)}>Registrar guía</Button>
            ) : undefined
          }
        />
      ) : (
        <ListTableShell>
          <Table className="min-w-[960px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[14rem]">Guía</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead className="min-w-[14rem]">Piezas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creada</TableHead>
                <TableHead className="w-12 text-right" aria-label="Acciones" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((g) => {
                const totalPendiente = g.totalPiezasEsperadas == null;
                return (
                  <TableRow
                    key={g.id}
                    className={`cursor-pointer ${totalPendiente ? 'bg-[color-mix(in_oklab,var(--color-warning)_10%,transparent)] hover:bg-[color-mix(in_oklab,var(--color-warning)_16%,transparent)]' : ''}`}
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
                      <PersonaCell
                        nombre={g.clienteUsuarioNombre}
                        icon={<Building2 className="h-3.5 w-3.5" />}
                        emptyLabel="—"
                      />
                    </TableCell>
                    <TableCell className="max-w-[18rem] align-top">
                      <DestinatarioInfo
                        nombre={g.destinatarioNombre}
                        telefono={g.destinatarioTelefono}
                        direccion={g.destinatarioDireccion}
                        provincia={g.destinatarioProvincia}
                        canton={g.destinatarioCanton}
                        emptyLabel="Sin asignar"
                        emptyItalic
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <PiezasProgressCell guia={g} />
                    </TableCell>
                    <TableCell className="align-top">
                      <GuiaMasterEstadoBadge estado={g.estadoGlobal} />
                    </TableCell>
                    <TableCell className="align-top text-xs text-muted-foreground">
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
      <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--color-muted)]">
        <div
          className="absolute inset-y-0 left-0 bg-[var(--color-info)]/70"
          style={{ width: `${pctRegistradas}%` }}
          title={`Registradas: ${registradas}/${total}`}
        />
        <div
          className="absolute inset-y-0 left-0 bg-[var(--color-warning)]/80"
          style={{ width: `${pctRecibidas}%` }}
          title={`Recibidas: ${recibidas}/${total}`}
        />
        <div
          className="absolute inset-y-0 left-0 bg-[var(--color-success)]/80"
          style={{ width: `${pctDespachadas}%` }}
          title={`Despachadas: ${despachadas}/${total}`}
        />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        <Dot color="bg-[var(--color-info)]" label={`Reg ${registradas}`} />
        <Dot color="bg-[var(--color-warning)]" label={`Rec ${recibidas}`} />
        <Dot color="bg-[var(--color-success)]" label={`Desp ${despachadas}`} />
      </div>
    </div>
  );
}

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
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
  const [destinatarioId, setDestinatarioId] = useState<number | undefined>(
    editing?.destinatarioFinalId ?? undefined,
  );
  const crear = useCrearGuiaMaster();
  const actualizar = useActualizarGuiaMaster();
  const saving = isEdit ? actualizar.isPending : crear.isPending;
  const { data: destinatarios = [], isLoading: loadingDest } = useDestinatariosOperario();

  const clientes = useMemo(() => {
    const map = new Map<number, { id: number; nombre: string }>();
    for (const d of destinatarios) {
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
  }, [destinatarios]);

  const destinatariosFiltrados = useMemo(() => {
    if (clienteId == null) return destinatarios;
    return destinatarios.filter((d) => d.clienteUsuarioId === clienteId);
  }, [destinatarios, clienteId]);

  function handleClienteChange(value: string | number | undefined) {
    const cid = typeof value === 'string' ? Number(value) : value;
    setClienteId(cid);
    if (destinatarioId != null) {
      const dest = destinatarios.find((d) => d.id === destinatarioId);
      if (!dest || (cid != null && dest.clienteUsuarioId !== cid)) {
        setDestinatarioId(undefined);
      }
    }
  }

  function handleDestinatarioChange(value: string | number | undefined) {
    const did = typeof value === 'string' ? Number(value) : value;
    setDestinatarioId(did);
    if (did != null) {
      const dest = destinatarios.find((d) => d.id === did);
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
    if (destinatarioId == null) {
      toast.error('Selecciona un destinatario');
      return;
    }
    try {
      if (isEdit && editing) {
        const tb = trackingBase.trim();
        const body: { destinatarioFinalId: number; trackingBase?: string } = {
          destinatarioFinalId: destinatarioId,
        };
        if (tb && tb !== editing.trackingBase) {
          body.trackingBase = tb;
        }
        await actualizar.mutateAsync({ id: editing.id, body });
        toast.success('Guía actualizada');
      } else {
        await crear.mutateAsync({
          trackingBase: trackingBase.trim(),
          destinatarioFinalId: destinatarioId,
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
              Filtra los destinatarios. Limpia para ver todos.
            </p>
          </div>

          <div>
            <Label
              htmlFor="destinatario-crear"
              className="mb-1 flex items-center gap-1 text-xs"
            >
              <UserRound className="h-3.5 w-3.5" />
              Destinatario *
            </Label>
            <SearchableCombobox
              id="destinatario-crear"
              value={destinatarioId}
              onChange={handleDestinatarioChange}
              options={destinatariosFiltrados}
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
                  ? 'Cargando destinatarios...'
                  : 'Selecciona un destinatario'
              }
              searchPlaceholder="Buscar por nombre, código, cantón..."
              emptyMessage="Sin coincidencias"
              disabled={loadingDest || destinatariosFiltrados.length === 0}
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
            {!loadingDest && destinatarios.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Aún no hay destinatarios registrados. Crea uno desde "Destinatarios".
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

