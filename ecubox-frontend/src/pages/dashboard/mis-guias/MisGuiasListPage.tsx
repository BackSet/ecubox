import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Boxes,
  Clock,
  Eye,
  PackageCheck,
  Pencil,
  Plus,
  Trash2,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ListTableShell } from '@/components/ListTableShell';
import { ListToolbar } from '@/components/ListToolbar';
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
import { useEliminarMiGuia, useMisGuias } from '@/hooks/useMisGuias';
import { DestinatarioInfo } from '@/pages/dashboard/paquetes/PaqueteCells';
import type { StatusTone } from '@/components/ui/StatusBadge';
import type { EstadoGuiaMaster, GuiaMaster } from '@/types/guia-master';
import { EditarMiGuiaDialog } from './EditarMiGuiaDialog';
import {
  MI_GUIA_ESTADO_ICONS,
  MI_GUIA_ESTADO_LABELS_CORTOS,
  MI_GUIA_ESTADO_ORDEN,
  MI_GUIA_ESTADO_TONES,
  MiGuiaEstadoBadge,
} from './_estado-cliente';
import { RegistrarMiGuiaDialog } from './RegistrarMiGuiaDialog';

type FiltroEstado = EstadoGuiaMaster | 'TODAS';

/**
 * Mapea el tono semantico (StatusTone, 6 colores) al tono compatible con
 * ChipFiltro (5 colores). 'info' se renderiza como primary porque el chip no
 * lo distingue.
 */
const STATUS_TO_CHIP_TONE: Record<StatusTone, ChipFiltroTone> = {
  primary: 'primary',
  info: 'primary',
  success: 'success',
  warning: 'warning',
  error: 'danger',
  neutral: 'neutral',
};

/** Solo se permite editar/eliminar mientras la guía esté en este estado. */
const ESTADO_EDITABLE = 'EN_ESPERA_RECEPCION' as const;
const TOOLTIP_NO_EDITABLE =
  'Ya no es posible editar esta guía porque sus piezas están en proceso. Si necesitas un cambio, contáctanos.';

export function MisGuiasListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado>('TODAS');
  const [registrarOpen, setRegistrarOpen] = useState(false);
  const [editingGuia, setEditingGuia] = useState<GuiaMaster | null>(null);
  const [deletingGuia, setDeletingGuia] = useState<GuiaMaster | null>(null);
  const { data: guias = [], isLoading, error } = useMisGuias();
  const eliminar = useEliminarMiGuia();

  const conteosPorEstado = useMemo(() => {
    const conteos: Record<EstadoGuiaMaster, number> = {
      EN_ESPERA_RECEPCION: 0,
      RECEPCION_PARCIAL: 0,
      RECEPCION_COMPLETA: 0,
      DESPACHO_PARCIAL: 0,
      DESPACHO_COMPLETADO: 0,
      DESPACHO_INCOMPLETO: 0,
      CANCELADA: 0,
      EN_REVISION: 0,
    };
    for (const g of guias) {
      if (conteos[g.estadoGlobal] != null) conteos[g.estadoGlobal] += 1;
    }
    return conteos;
  }, [guias]);

  // KPIs orientados al cliente: agrupamos los 8 estados internos en 4 etapas
  // que tienen sentido para quien envia paquetes desde EE.UU.
  const stats = useMemo(() => {
    const c = conteosPorEstado;
    const enEspera = c.EN_ESPERA_RECEPCION ?? 0;
    const enBodega = (c.RECEPCION_PARCIAL ?? 0) + (c.RECEPCION_COMPLETA ?? 0);
    const enCamino = c.DESPACHO_PARCIAL ?? 0;
    const entregadas =
      (c.DESPACHO_COMPLETADO ?? 0) + (c.DESPACHO_INCOMPLETO ?? 0);
    return {
      total: guias.length,
      enEspera,
      enBodega,
      enCamino,
      entregadas,
    };
  }, [conteosPorEstado, guias.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return guias.filter((g) => {
      if (estadoFiltro !== 'TODAS' && g.estadoGlobal !== estadoFiltro) return false;
      if (!q) return true;
      return (
        g.trackingBase.toLowerCase().includes(q) ||
        (g.destinatarioNombre ?? '').toLowerCase().includes(q)
      );
    });
  }, [guias, search, estadoFiltro]);

  return (
    <div className="page-stack">
      <ListToolbar
        title="Mis guías"
        searchPlaceholder="Buscar por número de guía o destinatario..."
        onSearchChange={setSearch}
        actions={
          <Button className="w-full sm:w-auto" onClick={() => setRegistrarOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar guía
          </Button>
        }
      />

      {!isLoading && !error && guias.length > 0 && (
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
            hint="Aún sin llegar a bodega"
          />
          <KpiCard
            icon={<PackageCheck className="h-5 w-5" />}
            label="En bodega EE.UU."
            value={stats.enBodega}
            tone={stats.enBodega > 0 ? 'primary' : 'neutral'}
            hint="Listas para despacho"
          />
          <KpiCard
            icon={<Truck className="h-5 w-5" />}
            label="En camino / Entregadas"
            value={stats.enCamino + stats.entregadas}
            tone={stats.entregadas > 0 ? 'success' : 'neutral'}
            hint={
              stats.entregadas > 0
                ? `${stats.entregadas} entregadas`
                : `${stats.enCamino} en camino`
            }
          />
        </div>
      )}

      {!isLoading && !error && guias.length > 0 && (
        <FiltrosBar
          hayFiltrosActivos={estadoFiltro !== 'TODAS'}
          onLimpiar={() => setEstadoFiltro('TODAS')}
          chips={
            <>
              <ChipFiltro
                label="Todas"
                count={guias.length}
                active={estadoFiltro === 'TODAS'}
                onClick={() => setEstadoFiltro('TODAS')}
              />
              {MI_GUIA_ESTADO_ORDEN.map((estado) => {
                const count = conteosPorEstado[estado] ?? 0;
                const active = estadoFiltro === estado;
                if (count === 0 && !active) return null;
                const Icon = MI_GUIA_ESTADO_ICONS[estado];
                return (
                  <ChipFiltro
                    key={estado}
                    label={MI_GUIA_ESTADO_LABELS_CORTOS[estado]}
                    count={count}
                    active={active}
                    tone={STATUS_TO_CHIP_TONE[MI_GUIA_ESTADO_TONES[estado]]}
                    icon={<Icon className="h-3.5 w-3.5" />}
                    onClick={() => setEstadoFiltro(estado)}
                  />
                );
              })}
            </>
          }
        />
      )}

      {isLoading ? (
        <LoadingState text="Cargando tus guías..." />
      ) : error ? (
        <div className="ui-alert ui-alert-error">
          No se pudieron cargar tus guías.
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={
            guias.length === 0
              ? 'Aún no has registrado guías'
              : estadoFiltro !== 'TODAS'
                ? 'No hay guías en este estado'
                : 'Sin resultados'
          }
          description={
            guias.length === 0
              ? 'Registra el número de guía que envías desde EE.UU. y asígnale un destinatario para hacer seguimiento.'
              : estadoFiltro !== 'TODAS'
                ? 'Cambia el filtro para ver tus otras guías.'
                : 'Prueba con otro término de búsqueda.'
          }
          action={
            guias.length === 0 ? (
              <Button onClick={() => setRegistrarOpen(true)}>Registrar guía</Button>
            ) : estadoFiltro !== 'TODAS' ? (
              <Button variant="outline" onClick={() => setEstadoFiltro('TODAS')}>
                Ver todas
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ListTableShell>
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[14rem]">Guía</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="min-w-[12rem]">Piezas</TableHead>
                <TableHead className="w-[20rem]">Destinatario</TableHead>
                <TableHead>Registrada</TableHead>
                <TableHead className="w-12 text-right" aria-label="Acciones" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((g) => {
                const totalPendiente = g.totalPiezasEsperadas == null;
                const editable = g.estadoGlobal === ESTADO_EDITABLE;
                return (
                  <TableRow
                    key={g.id}
                    className={`cursor-pointer ${
                      totalPendiente
                        ? 'bg-[color-mix(in_oklab,var(--color-warning)_10%,transparent)] hover:bg-[color-mix(in_oklab,var(--color-warning)_16%,transparent)]'
                        : ''
                    }`}
                    onClick={() =>
                      navigate({
                        to: '/mis-guias/$id',
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
                      <MiGuiaEstadoBadge estado={g.estadoGlobal} />
                    </TableCell>
                    <TableCell className="align-top">
                      <PiezasMiniProgress guia={g} />
                    </TableCell>
                    <TableCell className="max-w-[20rem] align-top">
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
                                to: '/mis-guias/$id',
                                params: { id: String(g.id) },
                              }),
                          },
                          {
                            label: 'Editar guía',
                            icon: Pencil,
                            disabled: !editable,
                            title: editable ? undefined : TOOLTIP_NO_EDITABLE,
                            onSelect: () => editable && setEditingGuia(g),
                          },
                          { type: 'separator' },
                          {
                            label: 'Eliminar guía',
                            icon: Trash2,
                            destructive: true,
                            disabled: !editable,
                            title: editable ? undefined : TOOLTIP_NO_EDITABLE,
                            onSelect: () => editable && setDeletingGuia(g),
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

      {registrarOpen && (
        <RegistrarMiGuiaDialog onClose={() => setRegistrarOpen(false)} />
      )}

      {editingGuia && (
        <EditarMiGuiaDialog
          guia={editingGuia}
          open
          onClose={() => setEditingGuia(null)}
        />
      )}

      <ConfirmDialog
        open={deletingGuia != null}
        onOpenChange={(open) => !open && !eliminar.isPending && setDeletingGuia(null)}
        title="¿Eliminar guía?"
        description={
          deletingGuia
            ? `Se eliminará la guía "${deletingGuia.trackingBase}". Esta acción no se puede deshacer.`
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
            const res = (err as { response?: { data?: { message?: string } } })?.response;
            toast.error(res?.data?.message ?? 'No se pudo eliminar la guía');
            throw err;
          }
        }}
      />
    </div>
  );
}

function PiezasMiniProgress({ guia: g }: { guia: GuiaMaster }) {
  const total = g.totalPiezasEsperadas;
  const registradas = g.piezasRegistradas ?? 0;
  const recibidas = g.piezasRecibidas ?? 0;
  const despachadas = g.piezasDespachadas ?? 0;

  if (total == null) {
    return (
      <div className="space-y-1">
        <Badge
          variant="outline"
          className="border-[var(--color-warning)]/30 text-[var(--color-warning)]"
          title="Aún no sabemos cuántas piezas en total tendrá esta guía. El operario lo confirmará al recibir el primer paquete."
        >
          Total por confirmar
        </Badge>
        <p className="text-[11px] text-muted-foreground">
          {recibidas > 0
            ? `${recibidas} en bodega EE.UU.`
            : 'Sin piezas en bodega aún'}
          {despachadas > 0 ? ` · ${despachadas} en camino a Ecuador` : ''}
        </p>
      </div>
    );
  }

  const safeTotal = Math.max(total, 1);
  const pctRegistradas = Math.min(100, (registradas / safeTotal) * 100);
  const pctRecibidas = Math.min(100, (recibidas / safeTotal) * 100);
  const pctDespachadas = Math.min(100, (despachadas / safeTotal) * 100);

  return (
    <div className="min-w-[10rem] space-y-1.5">
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
          title={`Anunciadas: ${registradas} de ${total}`}
        />
        <div
          className="absolute inset-y-0 left-0 bg-[var(--color-warning)]/80"
          style={{ width: `${pctRecibidas}%` }}
          title={`En bodega EE.UU.: ${recibidas} de ${total}`}
        />
        <div
          className="absolute inset-y-0 left-0 bg-[var(--color-success)]/80"
          style={{ width: `${pctDespachadas}%` }}
          title={`En camino a Ecuador: ${despachadas} de ${total}`}
        />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        <Dot color="bg-[var(--color-info)]" label={`${registradas} anunciadas`} />
        <Dot color="bg-[var(--color-warning)]" label={`${recibidas} en bodega`} />
        <Dot color="bg-[var(--color-success)]" label={`${despachadas} en camino`} />
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
