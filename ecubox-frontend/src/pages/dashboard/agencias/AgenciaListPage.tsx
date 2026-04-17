import { useState, useMemo } from 'react';
import { useAgencias, useDeleteAgencia } from '@/hooks/useAgencias';
import { AgenciaForm } from './AgenciaForm';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { ListTableShell } from '@/components/ListTableShell';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2 } from 'lucide-react';
import { createContainsMatcher } from '@/lib/search';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api/error-message';

export function AgenciaListPage() {
  const { data: agencias, isLoading, error } = useAgencias();
  const deleteAgencia = useDeleteAgencia();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const raw = agencias ?? [];
    const contains = createContainsMatcher(search);
    if (!contains) return raw;
    return raw.filter(
      (a) =>
        contains(a.nombre) ||
        contains(a.codigo) ||
        contains(a.encargado) ||
        contains(a.direccion) ||
        contains(a.provincia) ||
        contains(a.canton)
    );
  }, [agencias, search]);

  if (isLoading) {
    return <LoadingState text="Cargando agencias..." />;
  }
  if (error) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        Error al cargar agencias.
      </div>
    );
  }

  const allAgencias = agencias ?? [];

  return (
    <div className="space-y-4">
      <ListToolbar
        title="Agencias"
        searchPlaceholder="Buscar por nombre, código, encargado, provincia..."
        onSearchChange={setSearch}
        actions={
          <Button onClick={() => setCreateOpen(true)}>Nueva agencia</Button>
        }
      />

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
            ) : undefined
          }
        />
      ) : (
        <ListTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Encargado</TableHead>
                <TableHead>Provincia / Cantón</TableHead>
                <TableHead>Tarifa servicio</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.nombre}</TableCell>
                  <TableCell>{a.codigo ?? '—'}</TableCell>
                  <TableCell>{a.encargado ?? '—'}</TableCell>
                  <TableCell>
                    {[a.provincia, a.canton].filter(Boolean).join(' / ') || '—'}
                  </TableCell>
                  <TableCell>
                    {a.tarifaServicio != null
                      ? Number(a.tarifaServicio).toFixed(2)
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end">
                      <RowActionsMenu
                        items={[
                          { label: 'Editar', onSelect: () => setEditingId(a.id) },
                          {
                            label: 'Eliminar',
                            destructive: true,
                            onSelect: () => setDeleteConfirmId(a.id),
                          },
                        ]}
                      />
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
        title="Eliminar agencia"
        description="¿Estás seguro de que deseas eliminar esta agencia? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteAgencia.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          try {
            await deleteAgencia.mutateAsync(deleteConfirmId);
            toast.success('Agencia eliminada');
          } catch (error: unknown) {
            toast.error(getApiErrorMessage(error) ?? 'Error al eliminar la agencia');
            throw error;
          }
        }}
      />
    </div>
  );
}
