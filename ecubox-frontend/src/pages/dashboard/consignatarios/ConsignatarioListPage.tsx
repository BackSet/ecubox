import { useCallback, useEffect, useMemo, useState } from 'react';
import { TablePagination } from '@/components/ui/TablePagination';
import { toast } from 'sonner';
import {
  Building2,
  Check,
  Copy,
  Map,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import { useConsignatarios, useDeleteConsignatario } from '@/hooks/useConsignatarios';
import {
  useConsignatariosOperario,
  useDeleteConsignatarioOperario,
} from '@/hooks/useOperarioDespachos';
import { useAuthStore } from '@/stores/authStore';
import { ConsignatarioForm } from './ConsignatarioForm';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { KpiCardsGridSkeleton } from '@/components/skeletons/KpiCardSkeleton';
import { FiltrosBarSkeleton } from '@/components/skeletons/FiltrosBarSkeleton';
import { InlineErrorBanner } from '@/components/InlineErrorBanner';
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
import { getApiErrorMessage } from '@/lib/api/error-message';
import type { Consignatario } from '@/types/consignatario';

export function ConsignatarioListPage() {
  const hasConsignatariosOperario = useAuthStore((s) =>
    s.hasPermission('CONSIGNATARIOS_OPERARIO'),
  );
  const hasConsignatariosCreate = useAuthStore((s) => s.hasPermission('CONSIGNATARIOS_CREATE'));
  const hasConsignatariosUpdate = useAuthStore((s) => s.hasPermission('CONSIGNATARIOS_UPDATE'));
  const hasConsignatariosDelete = useAuthStore((s) => s.hasPermission('CONSIGNATARIOS_DELETE'));
  const [search, setSearchRaw] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSizeRaw] = useState(25);
  const setSearch = (v: string) => { setSearchRaw(v); setPage(0); };
  const setSize = (v: number) => { setSizeRaw(v); setPage(0); };
  const {
    data: misData,
    isLoading: misLoading,
    isFetching: misFetching,
    error: misError,
    refetch: refetchMis,
  } = useConsignatarios(!hasConsignatariosOperario);
  const {
    data: opData,
    isLoading: opLoading,
    isFetching: opFetching,
    error: opError,
    refetch: refetchOp,
  } = useConsignatariosOperario(
    search.trim() || undefined,
    hasConsignatariosOperario,
  );
  const consignatarios = hasConsignatariosOperario ? opData : misData;
  const isLoading = hasConsignatariosOperario ? opLoading : misLoading;
  const isFetching = hasConsignatariosOperario ? opFetching : misFetching;
  const error = hasConsignatariosOperario ? opError : misError;
  const refetch = hasConsignatariosOperario ? refetchOp : refetchMis;
  const deleteConsignatario = useDeleteConsignatario();
  const deleteConsignatarioOperario = useDeleteConsignatarioOperario();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  // Chip activo de filtro rapido
  const [chipActivo, setChipActivoRaw] = useState<
    'todos' | 'con_cliente' | 'sin_cliente' | 'sin_telefono' | 'sin_codigo'
  >('todos');
  const [provinciaFiltro, setProvinciaFiltroRaw] = useState<string | undefined>(
    undefined,
  );
  const [clienteFiltro, setClienteFiltroRaw] = useState<string | undefined>(undefined);
  const setChipActivo = (v: typeof chipActivo) => { setChipActivoRaw(v); setPage(0); };
  const setProvinciaFiltro = (v: string | undefined) => { setProvinciaFiltroRaw(v); setPage(0); };
  const setClienteFiltro = (v: string | undefined) => { setClienteFiltroRaw(v); setPage(0); };

  // Provincias y clientes presentes para poblar combos.
  const provincias = useMemo(() => {
    const set = new Set<string>();
    for (const d of consignatarios ?? []) {
      const p = d.provincia?.trim();
      if (p) set.add(p);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' }),
    );
  }, [consignatarios]);

  const clientes = useMemo(() => {
    const set = new Set<string>();
    for (const d of consignatarios ?? []) {
      const n = d.clienteUsuarioNombre?.trim();
      if (n) set.add(n);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' }),
    );
  }, [consignatarios]);

  // baseList aplica todos los filtros menos el chip activo (para conteos).
  // Cuando el rol es operario, la busqueda viaja al backend, por lo que aqui
  // ignoramos `search` (los datos ya llegan filtrados); para el rol cliente,
  // aplicamos la busqueda local como antes.
  const baseList = useMemo(() => {
    const raw = consignatarios ?? [];
    const q = hasConsignatariosOperario ? '' : search.trim().toLowerCase();
    return raw.filter((d) => {
      if (provinciaFiltro && (d.provincia ?? '') !== provinciaFiltro) return false;
      if (clienteFiltro && (d.clienteUsuarioNombre ?? '') !== clienteFiltro)
        return false;
      if (!q) return true;
      return (
        d.nombre?.toLowerCase().includes(q) ||
        (d.codigo?.toLowerCase().includes(q) ?? false) ||
        (d.telefono?.toLowerCase().includes(q) ?? false) ||
        (d.direccion?.toLowerCase().includes(q) ?? false) ||
        (d.provincia?.toLowerCase().includes(q) ?? false) ||
        (d.canton?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [
    consignatarios,
    search,
    hasConsignatariosOperario,
    provinciaFiltro,
    clienteFiltro,
  ]);

  const chipCounts = useMemo(() => {
    let conCliente = 0;
    let sinCliente = 0;
    let sinTelefono = 0;
    let sinCodigo = 0;
    for (const d of baseList) {
      if (d.clienteUsuarioId != null) conCliente += 1;
      else sinCliente += 1;
      if (!d.telefono?.trim()) sinTelefono += 1;
      if (!d.codigo?.trim()) sinCodigo += 1;
    }
    return {
      todos: baseList.length,
      conCliente,
      sinCliente,
      sinTelefono,
      sinCodigo,
    };
  }, [baseList]);

  const list = useMemo(() => {
    if (chipActivo === 'todos') return baseList;
    return baseList.filter((d) => {
      if (chipActivo === 'con_cliente') return d.clienteUsuarioId != null;
      if (chipActivo === 'sin_cliente') return d.clienteUsuarioId == null;
      if (chipActivo === 'sin_telefono') return !d.telefono?.trim();
      if (chipActivo === 'sin_codigo') return !d.codigo?.trim();
      return true;
    });
  }, [baseList, chipActivo]);

  // KPIs sobre el universo total cargado.
  const stats = useMemo(() => {
    const all = consignatarios ?? [];
    let conCliente = 0;
    const provinciasSet = new Set<string>();
    const clientesSet = new Set<number>();
    for (const d of all) {
      if (d.clienteUsuarioId != null) {
        conCliente += 1;
        clientesSet.add(d.clienteUsuarioId);
      }
      const p = d.provincia?.trim();
      if (p) provinciasSet.add(p);
    }
    return {
      total: all.length,
      conCliente,
      provincias: provinciasSet.size,
      clientes: clientesSet.size,
    };
  }, [consignatarios]);

  const tieneFiltros =
    !!provinciaFiltro || !!clienteFiltro || chipActivo !== 'todos';

  const limpiarFiltros = useCallback(() => {
    setProvinciaFiltroRaw(undefined);
    setClienteFiltroRaw(undefined);
    setChipActivoRaw('todos');
    setPage(0);
  }, []);

  const pagedList = useMemo(
    () => list.slice(page * size, page * size + size),
    [list, page, size],
  );
  const totalPages = Math.max(1, Math.ceil(list.length / Math.max(1, size)));
  useEffect(() => {
    if (page > 0 && page >= totalPages) setPage(totalPages - 1);
  }, [page, totalPages]);

  if (error && !consignatarios) {
    return (
      <InlineErrorBanner
        message="Error al cargar consignatarios"
        hint="Verifica tu conexión o intenta de nuevo."
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );
  }

  const allConsignatarios = consignatarios ?? [];
  const showClienteColumn = hasConsignatariosOperario;
  const canEdit = hasConsignatariosOperario || hasConsignatariosUpdate;

  return (
    <div className="page-stack">
      {error && (
        <InlineErrorBanner
          message="No se pudieron actualizar los consignatarios"
          hint="Mostrando los resultados anteriores. Reintentando en segundo plano."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      )}

      <ListToolbar
        title={hasConsignatariosOperario ? 'Consignatarios' : 'Mis consignatarios'}
        searchPlaceholder="Buscar por nombre, código, teléfono o ubicación..."
        onSearchChange={setSearch}
        actions={
          hasConsignatariosCreate ? (
            <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo consignatario
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <KpiCardsGridSkeleton count={hasConsignatariosOperario ? 4 : 2} />
      ) : (
        allConsignatarios.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon={<UserRound className="h-5 w-5" />}
            label="Consignatarios"
            value={stats.total}
            tone="primary"
          />
          {hasConsignatariosOperario && (
            <KpiCard
              icon={<Building2 className="h-5 w-5" />}
              label="Con cliente"
              value={stats.conCliente}
              tone={stats.conCliente > 0 ? 'success' : 'neutral'}
            />
          )}
          <KpiCard
            icon={<Map className="h-5 w-5" />}
            label="Provincias"
            value={stats.provincias}
            tone="neutral"
          />
          {hasConsignatariosOperario && (
            <KpiCard
              icon={<Users className="h-5 w-5" />}
              label="Clientes únicos"
              value={stats.clientes}
              tone="neutral"
            />
          )}
        </div>
        )
      )}

      {isLoading ? (
        <FiltrosBarSkeleton chips={hasConsignatariosOperario ? 5 : 3} filters={hasConsignatariosOperario ? 2 : 1} />
      ) : (
        allConsignatarios.length > 0 && (
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
              {hasConsignatariosOperario && (
                <ChipFiltro
                  label="Con cliente"
                  count={chipCounts.conCliente}
                  active={chipActivo === 'con_cliente'}
                  tone="success"
                  onClick={() => setChipActivo('con_cliente')}
                  hideWhenZero
                />
              )}
              {hasConsignatariosOperario && (
                <ChipFiltro
                  label="Sin cliente"
                  count={chipCounts.sinCliente}
                  active={chipActivo === 'sin_cliente'}
                  tone="neutral"
                  onClick={() => setChipActivo('sin_cliente')}
                  hideWhenZero
                />
              )}
              <ChipFiltro
                label="Sin teléfono"
                count={chipCounts.sinTelefono}
                active={chipActivo === 'sin_telefono'}
                tone="warning"
                onClick={() => setChipActivo('sin_telefono')}
                hideWhenZero
              />
              <ChipFiltro
                label="Sin código"
                count={chipCounts.sinCodigo}
                active={chipActivo === 'sin_codigo'}
                tone="warning"
                onClick={() => setChipActivo('sin_codigo')}
                hideWhenZero
              />
            </>
          }
          filtros={
            (provincias.length > 0 || clientes.length > 0) && (
              <>
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
                {hasConsignatariosOperario && clientes.length > 0 && (
                  <FiltroCampo label="Cliente" width="w-[16rem]">
                    <SearchableCombobox<string>
                      value={clienteFiltro}
                      onChange={(v) =>
                        setClienteFiltro(
                          v === undefined ? undefined : String(v),
                        )
                      }
                      options={clientes}
                      getKey={(c) => c}
                      getLabel={(c) => c}
                      placeholder="Todos"
                      searchPlaceholder="Buscar cliente..."
                      emptyMessage="Sin clientes"
                      className="h-9 w-full"
                    />
                  </FiltroCampo>
                )}
              </>
            )
          }
        />
        )
      )}

      {list.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {list.length} consignatario{list.length === 1 ? '' : 's'}
          {list.length !== allConsignatarios.length
            ? ` de ${allConsignatarios.length}`
            : ''}
        </p>
      )}

      {isLoading ? (
        <ListTableShell>
          <Table className={hasConsignatariosOperario ? 'min-w-[760px]' : 'min-w-[640px]'}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18rem]">Consignatario</TableHead>
                {hasConsignatariosOperario && (
                  <TableHead className="hidden md:table-cell">Cliente</TableHead>
                )}
                <TableHead className="min-w-[16rem]">Ubicación</TableHead>
                <TableHead className="hidden md:table-cell">Contacto</TableHead>
                <TableHead className="w-12 text-right" aria-label="Acciones" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRowsSkeleton
                columns={hasConsignatariosOperario ? 5 : 4}
                columnClasses={
                  hasConsignatariosOperario
                    ? { 1: 'hidden md:table-cell', 3: 'hidden md:table-cell' }
                    : { 2: 'hidden md:table-cell' }
                }
              />
            </TableBody>
          </Table>
        </ListTableShell>
      ) : list.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={allConsignatarios.length === 0 ? 'No hay consignatarios' : 'Sin resultados'}
          description={
            allConsignatarios.length === 0
              ? 'Registra un consignatario para poder enviar paquetes a esa dirección.'
              : tieneFiltros
                ? 'No hay consignatarios que coincidan con los filtros aplicados.'
                : 'No se encontraron consignatarios con ese criterio.'
          }
          action={
            allConsignatarios.length === 0 && hasConsignatariosCreate ? (
              <Button onClick={() => setCreateOpen(true)}>Registrar consignatario</Button>
            ) : tieneFiltros ? (
              <Button variant="outline" onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ListTableShell>
          <Table className={showClienteColumn ? 'min-w-[760px]' : 'min-w-[640px]'}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18rem]">Consignatario</TableHead>
                {showClienteColumn && (
                  <TableHead className="hidden md:table-cell">Cliente</TableHead>
                )}
                <TableHead className="min-w-[16rem]">Ubicación</TableHead>
                <TableHead className="hidden md:table-cell">Contacto</TableHead>
                <TableHead className="w-12 text-right" aria-label="Acciones" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedList.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="max-w-[18rem] align-top">
                    <NombreCodigoCell consignatario={d} />
                    {d.telefono && (
                      <div className="mt-1 md:hidden">
                        <ContactoCell telefono={d.telefono} />
                      </div>
                    )}
                  </TableCell>
                  {showClienteColumn && (
                    <TableCell className="hidden align-top md:table-cell">
                      <ClienteCell nombre={d.clienteUsuarioNombre} />
                    </TableCell>
                  )}
                  <TableCell className="max-w-[20rem] align-top">
                    <UbicacionCell
                      direccion={d.direccion}
                      provincia={d.provincia}
                      canton={d.canton}
                    />
                  </TableCell>
                  <TableCell className="hidden align-top md:table-cell">
                    <ContactoCell telefono={d.telefono} />
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <RowActionsMenu
                      items={[
                        {
                          label: 'Editar consignatario',
                          icon: Pencil,
                          onSelect: () => setEditingId(d.id),
                          hidden: !canEdit,
                        },
                        { type: 'separator' },
                        {
                          label: 'Eliminar',
                          icon: Trash2,
                          destructive: true,
                          onSelect: () => setDeleteConfirmId(d.id),
                          hidden: !hasConsignatariosDelete,
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

      {!isLoading && !error && list.length > 0 && (
        <TablePagination
          page={page}
          size={size}
          totalElements={list.length}
          totalPages={totalPages}
          onPageChange={setPage}
          onSizeChange={setSize}
        />
      )}

      {createOpen && (
        <ConsignatarioForm
          onClose={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
        />
      )}
      {editingId != null && (
        <ConsignatarioForm
          id={editingId}
          useOperarioApi={hasConsignatariosOperario}
          onClose={() => setEditingId(null)}
          onSuccess={() => setEditingId(null)}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="¿Eliminar consignatario?"
        description="Esta acción no se puede deshacer. Se eliminará el consignatario junto con todos sus paquetes asociados."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteConsignatario.isPending || deleteConsignatarioOperario.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          try {
            if (hasConsignatariosOperario) {
              await deleteConsignatarioOperario.mutateAsync(deleteConfirmId);
            } else {
              await deleteConsignatario.mutateAsync(deleteConfirmId);
            }
            toast.success('Consignatario eliminado');
          } catch (error: unknown) {
            toast.error(getApiErrorMessage(error) ?? 'Error al eliminar el consignatario');
            throw error;
          }
        }}
      />
    </div>
  );
}

function NombreCodigoCell({ consignatario }: { consignatario: Consignatario }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)] text-muted-foreground">
        <UserRound className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-medium text-foreground"
          title={consignatario.nombre}
        >
          {consignatario.nombre}
        </p>
        {consignatario.codigo ? (
          <CodigoCopyBadge codigo={consignatario.codigo} />
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
        className="h-5 rounded font-mono text-[11px] font-normal"
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

function ContactoCell({ telefono }: { telefono?: string | null }) {
  const t = telefono?.trim();
  if (!t) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <a
      href={`tel:${t}`}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary hover:underline"
      title={`Llamar a ${t}`}
    >
      <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{t}</span>
    </a>
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
          <p
            className="line-clamp-2 text-sm break-words text-foreground"
            title={d}
          >
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

function ClienteCell({ nombre }: { nombre?: string | null }) {
  if (!nombre) {
    return <span className="text-xs italic text-muted-foreground">—</span>;
  }
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-sm">
      <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate" title={nombre}>
        {nombre}
      </span>
    </div>
  );
}
