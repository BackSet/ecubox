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
  Plus,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { useAgencias, useDeleteAgencia } from '@/hooks/useAgencias';
import { AgenciaForm } from './AgenciaForm';
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
import type { Agencia } from '@/types/despacho';

function fmtMoneda(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(Number(n))) return '$0,00';
  return `$${Number(n).toLocaleString('es-EC', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const ALL_PROVINCIAS = '__ALL__';

export function AgenciaListPage() {
  const { data: agencias, isLoading, error } = useAgencias();
  const deleteAgencia = useDeleteAgencia();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [provinciaFilter, setProvinciaFilter] = useState<string>(ALL_PROVINCIAS);

  const allAgencias = useMemo(() => agencias ?? [], [agencias]);

  const provincias = useMemo(() => {
    const set = new Set<string>();
    for (const a of allAgencias) {
      const p = a.provincia?.trim();
      if (p) set.add(p);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allAgencias]);

  const list = useMemo(() => {
    const contains = createContainsMatcher(search);
    return allAgencias.filter((a) => {
      if (provinciaFilter !== ALL_PROVINCIAS && (a.provincia ?? '') !== provinciaFilter) {
        return false;
      }
      if (!contains) return true;
      return (
        contains(a.nombre) ||
        contains(a.codigo) ||
        contains(a.encargado) ||
        contains(a.direccion) ||
        contains(a.provincia) ||
        contains(a.canton)
      );
    });
  }, [allAgencias, search, provinciaFilter]);

  const stats = useMemo(() => {
    const total = allAgencias.length;
    const provs = provincias.length;
    const tarifas = allAgencias
      .map((a) => Number(a.tarifaServicio ?? 0))
      .filter((n) => Number.isFinite(n));
    const conTarifa = tarifas.filter((n) => n > 0);
    const promedio =
      conTarifa.length > 0
        ? conTarifa.reduce((acc, n) => acc + n, 0) / conTarifa.length
        : 0;
    const maxima = conTarifa.length > 0 ? Math.max(...conTarifa) : 0;
    return { total, provs, promedio, maxima };
  }, [allAgencias, provincias]);

  if (isLoading) {
    return <LoadingState text="Cargando agencias..." />;
  }
  if (error) {
    return (
      <div className="ui-alert ui-alert-error">
        Error al cargar agencias.
      </div>
    );
  }

  const filterActive = provinciaFilter !== ALL_PROVINCIAS || search.trim().length > 0;

  return (
    <div className="page-stack">
      <ListToolbar
        title="Agencias"
        searchPlaceholder="Buscar por nombre, código, encargado, provincia..."
        onSearchChange={setSearch}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva agencia
          </Button>
        }
      />

      {allAgencias.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon={<Building2 className="h-4 w-4" />}
            label="Agencias"
            value={stats.total}
            tone="primary"
            hint={stats.total === 1 ? '1 registrada' : `${stats.total} registradas`}
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
          <KpiCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Tarifa máxima"
            value={fmtMoneda(stats.maxima)}
            tone="warning"
          />
        </div>
      )}

      {provincias.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtrar por provincia:</span>
          <Select value={provinciaFilter} onValueChange={setProvinciaFilter}>
            <SelectTrigger
              variant="clean"
              size="sm"
              className="h-8 w-auto min-w-[12rem]"
            >
              <SelectValue placeholder="Todas las provincias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PROVINCIAS}>Todas las provincias</SelectItem>
              {provincias.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filterActive && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                setSearch('');
                setProvinciaFilter(ALL_PROVINCIAS);
              }}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Limpiar
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {list.length} agencia{list.length === 1 ? '' : 's'}
            {list.length !== allAgencias.length ? ` de ${allAgencias.length}` : ''}
          </span>
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={allAgencias.length === 0 ? 'No hay agencias' : 'Sin resultados'}
          description={
            allAgencias.length === 0
              ? 'Registra una agencia para usarla como punto de retiro en despachos.'
              : 'No se encontraron agencias con ese criterio.'
          }
          action={
            allAgencias.length === 0 ? (
              <Button onClick={() => setCreateOpen(true)}>Registrar agencia</Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setProvinciaFilter(ALL_PROVINCIAS);
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
                <TableHead className="min-w-[12rem]">Encargado</TableHead>
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
                    <EncargadoCell encargado={a.encargado} />
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
                    <TarifaCell tarifa={a.tarifaServicio} />
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
        <AgenciaForm
          onClose={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
        />
      )}
      {editingId != null && (
        <AgenciaForm
          id={editingId}
          onClose={() => setEditingId(null)}
          onSuccess={() => setEditingId(null)}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="¿Eliminar agencia?"
        description="Esta acción no se puede deshacer. La agencia ya no estará disponible como punto de retiro en nuevos despachos."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteAgencia.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          try {
            await deleteAgencia.mutateAsync(deleteConfirmId);
            toast.success('Agencia eliminada');
          } catch (err: unknown) {
            toast.error(getApiErrorMessage(err) ?? 'Error al eliminar la agencia');
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

function AgenciaCell({ agencia }: { agencia: Agencia }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Building2 className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-medium text-foreground"
          title={agencia.nombre}
        >
          {agencia.nombre}
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

function EncargadoCell({ encargado }: { encargado?: string | null }) {
  const e = encargado?.trim();
  if (!e) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-sm">
      <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate" title={e}>
        {e}
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
  const dias = diasMaxRetiro != null && Number(diasMaxRetiro) >= 0 ? Number(diasMaxRetiro) : null;
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
  const n = tarifa != null && Number.isFinite(Number(tarifa)) ? Number(tarifa) : null;
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
