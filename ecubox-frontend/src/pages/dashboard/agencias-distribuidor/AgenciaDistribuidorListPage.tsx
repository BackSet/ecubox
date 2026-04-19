import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Building2,
  CalendarClock,
  Check,
  Clock,
  Copy,
  DollarSign,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Truck,
} from 'lucide-react';
import {
  useAgenciasDistribuidorAdmin,
  useDeleteAgenciaDistribuidor,
} from '@/hooks/useAgenciasDistribuidorAdmin';
import { useDistribuidoresAdmin } from '@/hooks/useDistribuidoresAdmin';
import { AgenciaDistribuidorForm } from './AgenciaDistribuidorForm';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ListTableShell } from '@/components/ListTableShell';
import { KpiCard } from '@/components/KpiCard';
import { ChipFiltro } from '@/components/ChipFiltro';
import { FiltrosBar, FiltroCampo } from '@/components/FiltrosBar';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
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
import type { AgenciaDistribuidor } from '@/types/despacho';

function fmtMoneda(n: number | undefined | null): string {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return '$0,00';
  return `$${x.toLocaleString('es-EC', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function AgenciaDistribuidorListPage() {
  const { data: agencias, isLoading, error } = useAgenciasDistribuidorAdmin();
  const { data: distribuidores = [] } = useDistribuidoresAdmin();
  const deleteMutation = useDeleteAgenciaDistribuidor();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [provinciaFiltro, setProvinciaFiltro] = useState<string | undefined>(
    undefined,
  );
  const [distribuidorFiltro, setDistribuidorFiltro] = useState<number | undefined>(
    undefined,
  );
  const [chipActivo, setChipActivo] = useState<
    'todos' | 'sin_tarifa' | 'con_tarifa' | 'sin_horario' | 'sin_distribuidor'
  >('todos');

  const all = useMemo(() => agencias ?? [], [agencias]);

  const provincias = useMemo(() => {
    const set = new Set<string>();
    for (const a of all) {
      const p = a.provincia?.trim();
      if (p) set.add(p);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [all]);

  const distribuidoresEnUso = useMemo(() => {
    const map = new Map<number, string>();
    for (const a of all) {
      if (a.distribuidorId && !map.has(a.distribuidorId)) {
        map.set(a.distribuidorId, a.distribuidorNombre ?? `#${a.distribuidorId}`);
      }
    }
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [all]);

  const baseList = useMemo(() => {
    const contains = createContainsMatcher(search);
    return all.filter((a) => {
      if (provinciaFiltro && (a.provincia ?? '') !== provinciaFiltro) return false;
      if (distribuidorFiltro != null && a.distribuidorId !== distribuidorFiltro)
        return false;
      if (!contains) return true;
      return (
        contains(a.etiqueta) ||
        contains(a.codigo) ||
        contains(a.distribuidorNombre) ||
        contains(a.provincia) ||
        contains(a.canton) ||
        contains(a.direccion)
      );
    });
  }, [all, search, provinciaFiltro, distribuidorFiltro]);

  const chipCounts = useMemo(() => {
    let conTarifa = 0;
    let sinTarifa = 0;
    let sinHorario = 0;
    let sinDistribuidor = 0;
    for (const a of baseList) {
      const t = Number(a.tarifa ?? 0);
      if (Number.isFinite(t) && t > 0) conTarifa += 1;
      else sinTarifa += 1;
      if (!a.horarioAtencion?.trim()) sinHorario += 1;
      if (!a.distribuidorId) sinDistribuidor += 1;
    }
    return {
      todos: baseList.length,
      conTarifa,
      sinTarifa,
      sinHorario,
      sinDistribuidor,
    };
  }, [baseList]);

  const list = useMemo(() => {
    if (chipActivo === 'todos') return baseList;
    return baseList.filter((a) => {
      const t = Number(a.tarifa ?? 0);
      if (chipActivo === 'con_tarifa') return Number.isFinite(t) && t > 0;
      if (chipActivo === 'sin_tarifa') return !Number.isFinite(t) || t <= 0;
      if (chipActivo === 'sin_horario') return !a.horarioAtencion?.trim();
      if (chipActivo === 'sin_distribuidor') return !a.distribuidorId;
      return true;
    });
  }, [baseList, chipActivo]);

  const tieneFiltros =
    !!provinciaFiltro ||
    distribuidorFiltro != null ||
    chipActivo !== 'todos' ||
    search.trim().length > 0;
  const limpiarFiltros = useCallback(() => {
    setProvinciaFiltro(undefined);
    setDistribuidorFiltro(undefined);
    setChipActivo('todos');
    setSearch('');
  }, []);

  const stats = useMemo(() => {
    const total = all.length;
    const distribs = distribuidoresEnUso.length;
    const provs = provincias.length;
    const tarifas = all
      .map((a) => Number(a.tarifa ?? 0))
      .filter((n) => Number.isFinite(n) && n > 0);
    const promedio =
      tarifas.length > 0
        ? tarifas.reduce((acc, n) => acc + n, 0) / tarifas.length
        : 0;
    return { total, distribs, provs, promedio };
  }, [all, distribuidoresEnUso, provincias]);

  if (isLoading) {
    return <LoadingState text="Cargando agencias de distribuidor..." />;
  }
  if (error) {
    return (
      <div className="ui-alert ui-alert-error">
        Error al cargar agencias de distribuidor.
      </div>
    );
  }

  return (
    <div className="page-stack">
      <ListToolbar
        title="Agencias de distribuidor"
        searchPlaceholder="Buscar por código, distribuidor, provincia, cantón..."
        onSearchChange={setSearch}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva agencia de distribuidor
          </Button>
        }
      />

      {all.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon={<Building2 className="h-4 w-4" />}
            label="Agencias"
            value={stats.total}
            tone="primary"
            hint={
              stats.total === 1 ? '1 registrada' : `${stats.total} registradas`
            }
          />
          <KpiCard
            icon={<Truck className="h-4 w-4" />}
            label="Distribuidores con agencia"
            value={stats.distribs}
            tone="neutral"
            hint={`de ${distribuidores.length} en total`}
          />
          <KpiCard
            icon={<MapPin className="h-4 w-4" />}
            label="Provincias cubiertas"
            value={stats.provs}
            tone="neutral"
            hint={stats.provs === 0 ? 'Sin provincia asignada' : undefined}
          />
          <KpiCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Tarifa promedio"
            value={fmtMoneda(stats.promedio)}
            tone="success"
            hint="Solo agencias con tarifa > 0"
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
                label="Todas"
                count={chipCounts.todos}
                active={chipActivo === 'todos'}
                onClick={() => setChipActivo('todos')}
              />
              <ChipFiltro
                label="Con tarifa"
                count={chipCounts.conTarifa}
                active={chipActivo === 'con_tarifa'}
                tone="success"
                onClick={() => setChipActivo('con_tarifa')}
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
                label="Sin horario"
                count={chipCounts.sinHorario}
                active={chipActivo === 'sin_horario'}
                tone="warning"
                onClick={() => setChipActivo('sin_horario')}
                hideWhenZero
              />
              <ChipFiltro
                label="Sin distribuidor"
                count={chipCounts.sinDistribuidor}
                active={chipActivo === 'sin_distribuidor'}
                tone="danger"
                onClick={() => setChipActivo('sin_distribuidor')}
                hideWhenZero
              />
            </>
          }
          filtros={
            (distribuidoresEnUso.length > 0 || provincias.length > 0) && (
              <>
                {distribuidoresEnUso.length > 0 && (
                  <FiltroCampo label="Distribuidor" width="w-[16rem]">
                    <SearchableCombobox<{ id: number; nombre: string }>
                      value={distribuidorFiltro}
                      onChange={(v) =>
                        setDistribuidorFiltro(v == null ? undefined : Number(v))
                      }
                      options={distribuidoresEnUso}
                      getKey={(d) => d.id}
                      getLabel={(d) => d.nombre}
                      placeholder="Todos"
                      searchPlaceholder="Buscar distribuidor..."
                      emptyMessage="Sin distribuidores"
                      className="h-9 w-full"
                    />
                  </FiltroCampo>
                )}
                {provincias.length > 0 && (
                  <FiltroCampo label="Provincia" width="w-[14rem]">
                    <SearchableCombobox<string>
                      value={provinciaFiltro}
                      onChange={(v) =>
                        setProvinciaFiltro(
                          v === undefined ? undefined : String(v),
                        )
                      }
                      options={provincias}
                      getKey={(p) => p}
                      getLabel={(p) => p}
                      placeholder="Todas"
                      searchPlaceholder="Buscar provincia..."
                      emptyMessage="Sin provincias"
                      className="h-9 w-full"
                    />
                  </FiltroCampo>
                )}
              </>
            )
          }
        />
      )}

      {list.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {list.length} agencia{list.length === 1 ? '' : 's'}
          {list.length !== all.length ? ` de ${all.length}` : ''}
        </p>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={all.length === 0 ? 'No hay agencias de distribuidor' : 'Sin resultados'}
          description={
            all.length === 0
              ? 'Registra agencias que pertenecen a cada distribuidor para usarlas en despachos tipo Agencia de distribuidor.'
              : tieneFiltros
                ? 'No hay agencias que coincidan con los filtros aplicados.'
                : 'No se encontraron agencias con ese criterio.'
          }
          action={
            all.length === 0 ? (
              <Button onClick={() => setCreateOpen(true)}>Registrar agencia</Button>
            ) : (
              <Button variant="outline" onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            )
          }
        />
      ) : (
        <ListTableShell>
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[20rem]">Agencia</TableHead>
                <TableHead className="min-w-[14rem]">Distribuidor</TableHead>
                <TableHead className="min-w-[18rem]">Ubicación</TableHead>
                <TableHead className="min-w-[14rem]">Operación</TableHead>
                <TableHead className="text-right">Tarifa</TableHead>
                <TableHead className="w-12 text-right" aria-label="Acciones" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="max-w-[20rem] align-top">
                    <AgenciaCell agencia={a} />
                  </TableCell>
                  <TableCell className="align-top">
                    <DistribuidorCell nombre={a.distribuidorNombre} />
                  </TableCell>
                  <TableCell className="max-w-[20rem] align-top">
                    <UbicacionCell
                      direccion={a.direccion}
                      provincia={a.provincia}
                      canton={a.canton}
                    />
                  </TableCell>
                  <TableCell className="max-w-[16rem] align-top">
                    <OperacionCell
                      horario={a.horarioAtencion}
                      diasMaxRetiro={a.diasMaxRetiro}
                    />
                  </TableCell>
                  <TableCell className="align-top text-right">
                    <TarifaCell tarifa={a.tarifa} />
                  </TableCell>
                  <TableCell className="align-top text-right">
                    <RowActionsMenu
                      items={[
                        {
                          label: 'Editar agencia',
                          icon: Pencil,
                          onSelect: () => setEditingId(a.id),
                        },
                        { type: 'separator' },
                        {
                          label: 'Eliminar',
                          icon: Trash2,
                          destructive: true,
                          onSelect: () => setDeleteConfirmId(a.id),
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
        <AgenciaDistribuidorForm
          onClose={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
        />
      )}
      {editingId != null && (
        <AgenciaDistribuidorForm
          id={editingId}
          onClose={() => setEditingId(null)}
          onSuccess={() => setEditingId(null)}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="¿Eliminar agencia de distribuidor?"
        description="Esta acción no se puede deshacer. La agencia ya no podrá usarse en nuevos despachos."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          try {
            await deleteMutation.mutateAsync(deleteConfirmId);
            toast.success('Agencia de distribuidor eliminada');
          } catch (err: unknown) {
            toast.error(
              getApiErrorMessage(err) ?? 'Error al eliminar la agencia',
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

function AgenciaCell({ agencia }: { agencia: AgenciaDistribuidor }) {
  const titulo = agencia.etiqueta?.trim() || agencia.codigo || `Agencia #${agencia.id}`;
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Building2 className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-medium text-foreground"
          title={titulo}
        >
          {titulo}
        </p>
        {agencia.codigo ? (
          <CodigoCopyBadge codigo={agencia.codigo} />
        ) : (
          <span className="text-[11px] italic text-muted-foreground">Sin código</span>
        )}
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
    <span className="mt-0.5 inline-flex items-center gap-1">
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

function DistribuidorCell({ nombre }: { nombre?: string | null }) {
  const n = nombre?.trim();
  if (!n) {
    return <span className="text-xs italic text-muted-foreground">—</span>;
  }
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-sm">
      <Truck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate" title={n}>
        {n}
      </span>
    </div>
  );
}

function UbicacionCell({
  direccion,
  provincia,
  canton,
}: {
  direccion?: string | null;
  provincia?: string | null;
  canton?: string | null;
}) {
  const d = direccion?.trim();
  const ubicacion = [canton, provincia]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v))
    .join(', ');

  if (!d && !ubicacion) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 space-y-0.5">
        {d && (
          <p className="line-clamp-2 text-sm break-words text-foreground" title={d}>
            {d}
          </p>
        )}
        {ubicacion && (
          <p className="text-xs text-muted-foreground" title={ubicacion}>
            {ubicacion}
          </p>
        )}
      </div>
    </div>
  );
}

function OperacionCell({
  horario,
  diasMaxRetiro,
}: {
  horario?: string | null;
  diasMaxRetiro?: number | null;
}) {
  const h = horario?.trim();
  const dias =
    diasMaxRetiro != null && Number(diasMaxRetiro) >= 0
      ? Number(diasMaxRetiro)
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
            Retiro hasta {dias} día{dias === 1 ? '' : 's'}
          </span>
        </div>
      )}
    </div>
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
