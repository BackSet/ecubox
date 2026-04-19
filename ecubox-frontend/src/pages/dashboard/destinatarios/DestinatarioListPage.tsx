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
import { useDestinatarios, useDeleteDestinatario } from '@/hooks/useDestinatarios';
import {
  useDestinatariosOperario,
  useDeleteDestinatarioOperario,
} from '@/hooks/useOperarioDespachos';
import { useAuthStore } from '@/stores/authStore';
import { DestinatarioForm } from './DestinatarioForm';
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
import { getApiErrorMessage } from '@/lib/api/error-message';
import type { DestinatarioFinal } from '@/types/destinatario';

export function DestinatarioListPage() {
  const hasDestinatariosOperario = useAuthStore((s) =>
    s.hasPermission('DESTINATARIOS_OPERARIO'),
  );
  const hasDestinatariosCreate = useAuthStore((s) => s.hasPermission('DESTINATARIOS_CREATE'));
  const hasDestinatariosUpdate = useAuthStore((s) => s.hasPermission('DESTINATARIOS_UPDATE'));
  const hasDestinatariosDelete = useAuthStore((s) => s.hasPermission('DESTINATARIOS_DELETE'));
  const [search, setSearchRaw] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSizeRaw] = useState(25);
  const setSearch = (v: string) => { setSearchRaw(v); setPage(0); };
  const setSize = (v: number) => { setSizeRaw(v); setPage(0); };
  const { data: misData, isLoading: misLoading, error: misError } = useDestinatarios(
    !hasDestinatariosOperario,
  );
  const { data: opData, isLoading: opLoading, error: opError } = useDestinatariosOperario(
    search.trim() || undefined,
    hasDestinatariosOperario,
  );
  const destinatarios = hasDestinatariosOperario ? opData : misData;
  const isLoading = hasDestinatariosOperario ? opLoading : misLoading;
  const error = hasDestinatariosOperario ? opError : misError;
  const deleteDestinatario = useDeleteDestinatario();
  const deleteDestinatarioOperario = useDeleteDestinatarioOperario();
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
    for (const d of destinatarios ?? []) {
      const p = d.provincia?.trim();
      if (p) set.add(p);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' }),
    );
  }, [destinatarios]);

  const clientes = useMemo(() => {
    const set = new Set<string>();
    for (const d of destinatarios ?? []) {
      const n = d.clienteUsuarioNombre?.trim();
      if (n) set.add(n);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' }),
    );
  }, [destinatarios]);

  // baseList aplica todos los filtros menos el chip activo (para conteos).
  // Cuando el rol es operario, la busqueda viaja al backend, por lo que aqui
  // ignoramos `search` (los datos ya llegan filtrados); para el rol cliente,
  // aplicamos la busqueda local como antes.
  const baseList = useMemo(() => {
    const raw = destinatarios ?? [];
    const q = hasDestinatariosOperario ? '' : search.trim().toLowerCase();
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
    destinatarios,
    search,
    hasDestinatariosOperario,
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
    const all = destinatarios ?? [];
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
  }, [destinatarios]);

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

  if (isLoading) {
    return <LoadingState text="Cargando destinatarios..." />;
  }
  if (error) {
    return (
      <div className="ui-alert ui-alert-error">
        Error al cargar destinatarios.
      </div>
    );
  }

  const allDestinatarios = destinatarios ?? [];
  const showClienteColumn = hasDestinatariosOperario;
  const canEdit = hasDestinatariosOperario || hasDestinatariosUpdate;

  return (
    <div className="page-stack">
      <ListToolbar
        title={hasDestinatariosOperario ? 'Destinatarios' : 'Mis destinatarios'}
        searchPlaceholder="Buscar por nombre, código, teléfono, dirección..."
        onSearchChange={setSearch}
        actions={
          hasDestinatariosCreate ? (
            <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo destinatario
            </Button>
          ) : undefined
        }
      />

      {allDestinatarios.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon={<UserRound className="h-5 w-5" />}
            label="Destinatarios"
            value={stats.total}
            tone="primary"
          />
          {hasDestinatariosOperario && (
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
          {hasDestinatariosOperario && (
            <KpiCard
              icon={<Users className="h-5 w-5" />}
              label="Clientes únicos"
              value={stats.clientes}
              tone="neutral"
            />
          )}
        </div>
      )}

      {allDestinatarios.length > 0 && (
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
              {hasDestinatariosOperario && (
                <ChipFiltro
                  label="Con cliente"
                  count={chipCounts.conCliente}
                  active={chipActivo === 'con_cliente'}
                  tone="success"
                  onClick={() => setChipActivo('con_cliente')}
                  hideWhenZero
                />
              )}
              {hasDestinatariosOperario && (
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
                {hasDestinatariosOperario && clientes.length > 0 && (
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
      )}

      {list.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {list.length} destinatario{list.length === 1 ? '' : 's'}
          {list.length !== allDestinatarios.length
            ? ` de ${allDestinatarios.length}`
            : ''}
        </p>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={allDestinatarios.length === 0 ? 'No hay destinatarios' : 'Sin resultados'}
          description={
            allDestinatarios.length === 0
              ? 'Registra un destinatario para poder enviar paquetes a esa dirección.'
              : tieneFiltros
                ? 'No hay destinatarios que coincidan con los filtros aplicados.'
                : 'No se encontraron destinatarios con ese criterio.'
          }
          action={
            allDestinatarios.length === 0 && hasDestinatariosCreate ? (
              <Button onClick={() => setCreateOpen(true)}>Registrar destinatario</Button>
            ) : tieneFiltros ? (
              <Button variant="outline" onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ListTableShell>
          <Table className={showClienteColumn ? 'min-w-[900px]' : 'min-w-[720px]'}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18rem]">Destinatario</TableHead>
                {showClienteColumn && <TableHead>Cliente</TableHead>}
                <TableHead className="min-w-[16rem]">Ubicación</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="w-12 text-right" aria-label="Acciones" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedList.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="max-w-[18rem] align-top">
                    <NombreCodigoCell destinatario={d} />
                  </TableCell>
                  {showClienteColumn && (
                    <TableCell className="align-top">
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
                  <TableCell className="align-top">
                    <ContactoCell telefono={d.telefono} />
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <RowActionsMenu
                      items={[
                        {
                          label: 'Editar destinatario',
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
                          hidden: !hasDestinatariosDelete,
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
        <DestinatarioForm
          onClose={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
        />
      )}
      {editingId != null && (
        <DestinatarioForm
          id={editingId}
          useOperarioApi={hasDestinatariosOperario}
          onClose={() => setEditingId(null)}
          onSuccess={() => setEditingId(null)}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="¿Eliminar destinatario?"
        description="Esta acción no se puede deshacer. Se eliminará el destinatario junto con todos sus paquetes asociados."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteDestinatario.isPending || deleteDestinatarioOperario.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          try {
            if (hasDestinatariosOperario) {
              await deleteDestinatarioOperario.mutateAsync(deleteConfirmId);
            } else {
              await deleteDestinatario.mutateAsync(deleteConfirmId);
            }
            toast.success('Destinatario eliminado');
          } catch (error: unknown) {
            toast.error(getApiErrorMessage(error) ?? 'Error al eliminar el destinatario');
            throw error;
          }
        }}
      />
    </div>
  );
}

function NombreCodigoCell({ destinatario }: { destinatario: DestinatarioFinal }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)] text-muted-foreground">
        <UserRound className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-medium text-foreground"
          title={destinatario.nombre}
        >
          {destinatario.nombre}
        </p>
        {destinatario.codigo ? (
          <CodigoCopyBadge codigo={destinatario.codigo} />
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
