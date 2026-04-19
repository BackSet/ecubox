import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Building2,
  CalendarClock,
  Check,
  Clock,
  Copy,
  DollarSign,
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
  useDistribuidoresAdmin,
  useDeleteDistribuidor,
} from '@/hooks/useDistribuidoresAdmin';
import { useAgenciasDistribuidorAdmin } from '@/hooks/useAgenciasDistribuidorAdmin';
import { DistribuidorForm } from './DistribuidorForm';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ListTableShell } from '@/components/ListTableShell';
import { KpiCard } from '@/components/KpiCard';
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
import { createContainsMatcher } from '@/lib/search';
import { getApiErrorMessage } from '@/lib/api/error-message';
import type { Distribuidor } from '@/types/despacho';

function fmtMoneda(n: number | undefined | null): string {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return '$0,00';
  return `$${x.toLocaleString('es-EC', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function DistribuidorListPage() {
  const { data: distribuidores, isLoading, error } = useDistribuidoresAdmin();
  const { data: agenciasDist = [] } = useAgenciasDistribuidorAdmin();
  const deleteDistribuidor = useDeleteDistribuidor();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [chipActivo, setChipActivo] = useState<
    'todos' | 'con_tracking' | 'sin_tracking' | 'sin_tarifa' | 'sin_agencias'
  >('todos');

  const all = useMemo(() => distribuidores ?? [], [distribuidores]);

  const agenciasPorDistribuidor = useMemo(() => {
    const map = new Map<number, number>();
    for (const a of agenciasDist) {
      if (a.distribuidorId) {
        map.set(a.distribuidorId, (map.get(a.distribuidorId) ?? 0) + 1);
      }
    }
    return map;
  }, [agenciasDist]);

  const baseList = useMemo(() => {
    const contains = createContainsMatcher(search);
    if (!contains) return all;
    return all.filter(
      (d) =>
        contains(d.nombre) ||
        contains(d.codigo) ||
        contains(d.email) ||
        contains(d.horarioReparto) ||
        contains(d.paginaTracking),
    );
  }, [all, search]);

  const tieneTrackingValido = useCallback(
    (d: Distribuidor) =>
      !!(d.paginaTracking && /^https?:\/\//i.test(d.paginaTracking)),
    [],
  );

  const chipCounts = useMemo(() => {
    let conTracking = 0;
    let sinTracking = 0;
    let sinTarifa = 0;
    let sinAgencias = 0;
    for (const d of baseList) {
      if (tieneTrackingValido(d)) conTracking += 1;
      else sinTracking += 1;
      const t = Number(d.tarifaEnvio ?? 0);
      if (!Number.isFinite(t) || t <= 0) sinTarifa += 1;
      const ag = agenciasPorDistribuidor.get(d.id) ?? 0;
      if (ag === 0) sinAgencias += 1;
    }
    return { todos: baseList.length, conTracking, sinTracking, sinTarifa, sinAgencias };
  }, [baseList, agenciasPorDistribuidor, tieneTrackingValido]);

  const list = useMemo(() => {
    if (chipActivo === 'todos') return baseList;
    return baseList.filter((d) => {
      if (chipActivo === 'con_tracking') return tieneTrackingValido(d);
      if (chipActivo === 'sin_tracking') return !tieneTrackingValido(d);
      if (chipActivo === 'sin_tarifa') {
        const t = Number(d.tarifaEnvio ?? 0);
        return !Number.isFinite(t) || t <= 0;
      }
      if (chipActivo === 'sin_agencias')
        return (agenciasPorDistribuidor.get(d.id) ?? 0) === 0;
      return true;
    });
  }, [baseList, chipActivo, agenciasPorDistribuidor, tieneTrackingValido]);

  const tieneFiltros = chipActivo !== 'todos';
  const limpiarFiltros = useCallback(() => setChipActivo('todos'), []);

  const stats = useMemo(() => {
    const total = all.length;
    const conTracking = all.filter(
      (d) => d.paginaTracking && /^https?:\/\//i.test(d.paginaTracking),
    ).length;
    const tarifas = all
      .map((d) => Number(d.tarifaEnvio ?? 0))
      .filter((n) => Number.isFinite(n) && n > 0);
    const promedio =
      tarifas.length > 0
        ? tarifas.reduce((acc, n) => acc + n, 0) / tarifas.length
        : 0;
    const totalAgencias = agenciasDist.length;
    return { total, conTracking, promedio, totalAgencias };
  }, [all, agenciasDist]);

  if (isLoading) {
    return <LoadingState text="Cargando distribuidores..." />;
  }
  if (error) {
    return <div className="ui-alert ui-alert-error">Error al cargar distribuidores.</div>;
  }

  return (
    <div className="page-stack">
      <ListToolbar
        title="Distribuidores"
        searchPlaceholder="Buscar por nombre, código, email, horario o página..."
        onSearchChange={setSearch}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo distribuidor
          </Button>
        }
      />

      {all.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon={<Truck className="h-4 w-4" />}
            label="Distribuidores"
            value={stats.total}
            tone="primary"
            hint={
              stats.total === 1 ? '1 registrado' : `${stats.total} registrados`
            }
          />
          <KpiCard
            icon={<Building2 className="h-4 w-4" />}
            label="Agencias asociadas"
            value={stats.totalAgencias}
            tone="neutral"
            hint="Suma de agencias de todos los distribuidores"
          />
          <KpiCard
            icon={<Link2 className="h-4 w-4" />}
            label="Con tracking"
            value={stats.conTracking}
            tone="neutral"
            hint={`${stats.total - stats.conTracking} sin URL configurada`}
          />
          <KpiCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Tarifa promedio"
            value={fmtMoneda(stats.promedio)}
            tone="success"
            hint="Solo distribuidores con tarifa > 0"
          />
        </div>
      )}

      {all.length > 0 && (
        <FiltrosBar
          hayFiltrosActivos={tieneFiltros}
          onLimpiar={limpiarFiltros}
          chips={
            <>
              <ChipFiltro
                label="Todos"
                count={chipCounts.todos}
                active={chipActivo === 'todos'}
                onClick={() => setChipActivo('todos')}
              />
              <ChipFiltro
                label="Con tracking"
                count={chipCounts.conTracking}
                active={chipActivo === 'con_tracking'}
                tone="success"
                onClick={() => setChipActivo('con_tracking')}
                hideWhenZero
              />
              <ChipFiltro
                label="Sin tracking"
                count={chipCounts.sinTracking}
                active={chipActivo === 'sin_tracking'}
                tone="warning"
                onClick={() => setChipActivo('sin_tracking')}
                hideWhenZero
              />
              <ChipFiltro
                label="Sin tarifa"
                count={chipCounts.sinTarifa}
                active={chipActivo === 'sin_tarifa'}
                tone="neutral"
                onClick={() => setChipActivo('sin_tarifa')}
                hideWhenZero
              />
              <ChipFiltro
                label="Sin agencias"
                count={chipCounts.sinAgencias}
                active={chipActivo === 'sin_agencias'}
                tone="warning"
                onClick={() => setChipActivo('sin_agencias')}
                hideWhenZero
              />
            </>
          }
        />
      )}

      {list.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {list.length} distribuidor{list.length === 1 ? '' : 'es'}
          {list.length !== all.length ? ` de ${all.length}` : ''}
        </p>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={all.length === 0 ? 'No hay distribuidores' : 'Sin resultados'}
          description={
            all.length === 0
              ? 'Registra un distribuidor para asignarlo a despachos y agencias.'
              : tieneFiltros
                ? 'No hay distribuidores que coincidan con los filtros aplicados.'
                : 'No se encontraron distribuidores con ese criterio.'
          }
          action={
            all.length === 0 ? (
              <Button onClick={() => setCreateOpen(true)}>
                Registrar distribuidor
              </Button>
            ) : tieneFiltros ? (
              <Button variant="outline" onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setSearch('')}>
                Limpiar búsqueda
              </Button>
            )
          }
        />
      ) : (
        <ListTableShell>
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[20rem]">Distribuidor</TableHead>
                <TableHead className="min-w-[14rem]">Operación</TableHead>
                <TableHead className="text-right">Tarifa</TableHead>
                <TableHead className="min-w-[14rem]">Contacto</TableHead>
                <TableHead className="min-w-[16rem]">Tracking</TableHead>
                <TableHead className="w-12 text-right" aria-label="Acciones" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="max-w-[20rem] align-top">
                    <DistribuidorCell
                      distribuidor={d}
                      agenciasCount={agenciasPorDistribuidor.get(d.id) ?? 0}
                    />
                  </TableCell>
                  <TableCell className="max-w-[16rem] align-top">
                    <OperacionCell
                      horario={d.horarioReparto}
                      diasMaxRetiroDomicilio={d.diasMaxRetiroDomicilio}
                    />
                  </TableCell>
                  <TableCell className="align-top text-right">
                    <TarifaCell tarifa={d.tarifaEnvio} />
                  </TableCell>
                  <TableCell className="align-top">
                    <ContactoCell email={d.email} />
                  </TableCell>
                  <TableCell className="max-w-[18rem] align-top">
                    <TrackingCell url={d.paginaTracking} />
                  </TableCell>
                  <TableCell className="align-top text-right">
                    <RowActionsMenu
                      items={[
                        {
                          label: 'Editar distribuidor',
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

      {createOpen && (
        <DistribuidorForm
          onClose={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
        />
      )}
      {editingId != null && (
        <DistribuidorForm
          id={editingId}
          onClose={() => setEditingId(null)}
          onSuccess={() => setEditingId(null)}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="¿Eliminar distribuidor?"
        description="Esta acción no se puede deshacer. El distribuidor ya no estará disponible para nuevos despachos ni agencias."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteDistribuidor.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          try {
            await deleteDistribuidor.mutateAsync(deleteConfirmId);
            toast.success('Distribuidor eliminado');
          } catch (err: unknown) {
            toast.error(
              getApiErrorMessage(err) ?? 'Error al eliminar el distribuidor',
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

function DistribuidorCell({
  distribuidor,
  agenciasCount,
}: {
  distribuidor: Distribuidor;
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
          title={distribuidor.nombre}
        >
          {distribuidor.nombre}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          {distribuidor.codigo ? (
            <CodigoCopyBadge codigo={distribuidor.codigo} />
          ) : (
            <span className="text-[11px] italic text-muted-foreground">
              Sin código
            </span>
          )}
          {agenciasCount > 0 && (
            <Badge
              variant="outline"
              className="h-5 rounded text-[11px] font-normal"
              title={`${agenciasCount} agencia(s) asociada(s)`}
            >
              <Building2 className="mr-1 h-3 w-3" />
              {agenciasCount} agencia{agenciasCount === 1 ? '' : 's'}
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

function TarifaCell({ tarifa }: { tarifa?: number | null }) {
  const n =
    tarifa != null && Number.isFinite(Number(tarifa)) ? Number(tarifa) : null;
  if (n == null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  if (n === 0) {
    return (
      <Badge
        variant="outline"
        className="rounded font-mono text-[11px] font-normal text-muted-foreground"
      >
        Sin costo
      </Badge>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm tabular-nums text-[var(--color-success)]">
      {fmtMoneda(n)}
    </span>
  );
}
