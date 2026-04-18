import { useMemo, useState } from 'react';
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
  Trash2,
  Truck,
  X,
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const ALL = '__ALL__';

export function AgenciaDistribuidorListPage() {
  const { data: agencias, isLoading, error } = useAgenciasDistribuidorAdmin();
  const { data: distribuidores = [] } = useDistribuidoresAdmin();
  const deleteMutation = useDeleteAgenciaDistribuidor();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [provinciaFilter, setProvinciaFilter] = useState<string>(ALL);
  const [distribuidorFilter, setDistribuidorFilter] = useState<string>(ALL);

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

  const list = useMemo(() => {
    const contains = createContainsMatcher(search);
    return all.filter((a) => {
      if (provinciaFilter !== ALL && (a.provincia ?? '') !== provinciaFilter) {
        return false;
      }
      if (
        distribuidorFilter !== ALL &&
        String(a.distribuidorId) !== distribuidorFilter
      ) {
        return false;
      }
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
  }, [all, search, provinciaFilter, distribuidorFilter]);

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
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        Error al cargar agencias de distribuidor.
      </div>
    );
  }

  const filterActive =
    provinciaFilter !== ALL ||
    distribuidorFilter !== ALL ||
    search.trim().length > 0;

  return (
    <div className="space-y-4">
      <ListToolbar
        title="Agencias de distribuidor"
        searchPlaceholder="Buscar por código, distribuidor, provincia, cantón..."
        onSearchChange={setSearch}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Building2 className="mr-1.5 h-4 w-4" />
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

      {(provincias.length > 0 || distribuidoresEnUso.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {distribuidoresEnUso.length > 0 && (
            <>
              <span className="text-xs text-muted-foreground">Distribuidor:</span>
              <Select
                value={distribuidorFilter}
                onValueChange={setDistribuidorFilter}
              >
                <SelectTrigger
                  variant="clean"
                  size="sm"
                  className="h-8 w-auto min-w-[12rem]"
                >
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos los distribuidores</SelectItem>
                  {distribuidoresEnUso.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          {provincias.length > 0 && (
            <>
              <span className="ml-1 text-xs text-muted-foreground">Provincia:</span>
              <Select value={provinciaFilter} onValueChange={setProvinciaFilter}>
                <SelectTrigger
                  variant="clean"
                  size="sm"
                  className="h-8 w-auto min-w-[10rem]"
                >
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas las provincias</SelectItem>
                  {provincias.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          {filterActive && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                setSearch('');
                setProvinciaFilter(ALL);
                setDistribuidorFilter(ALL);
              }}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Limpiar
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {list.length} agencia{list.length === 1 ? '' : 's'}
            {list.length !== all.length ? ` de ${all.length}` : ''}
          </span>
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={all.length === 0 ? 'No hay agencias de distribuidor' : 'Sin resultados'}
          description={
            all.length === 0
              ? 'Registra agencias que pertenecen a cada distribuidor para usarlas en despachos tipo Agencia de distribuidor.'
              : 'No se encontraron agencias con ese criterio.'
          }
          action={
            all.length === 0 ? (
              <Button onClick={() => setCreateOpen(true)}>Registrar agencia</Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setProvinciaFilter(ALL);
                  setDistribuidorFilter(ALL);
                }}
              >
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
                <TableHead className="text-right">Acciones</TableHead>
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
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Editar agencia"
                        title="Editar agencia"
                        onClick={() => setEditingId(a.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Eliminar agencia"
                        title="Eliminar agencia"
                        className="text-[var(--color-destructive)] hover:text-[var(--color-destructive)]"
                        onClick={() => setDeleteConfirmId(a.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
