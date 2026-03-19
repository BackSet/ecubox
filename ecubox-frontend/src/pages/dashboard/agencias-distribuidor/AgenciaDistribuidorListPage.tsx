import { useState, useMemo } from 'react';
import {
  useAgenciasDistribuidorAdmin,
  useDeleteAgenciaDistribuidor,
} from '@/hooks/useAgenciasDistribuidorAdmin';
import { AgenciaDistribuidorForm } from './AgenciaDistribuidorForm';
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

export function AgenciaDistribuidorListPage() {
  const { data: agencias, isLoading, error } = useAgenciasDistribuidorAdmin();
  const deleteMutation = useDeleteAgenciaDistribuidor();
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
        contains(a.etiqueta) ||
        contains(a.codigo) ||
        contains(a.distribuidorNombre) ||
        contains(a.provincia) ||
        contains(a.canton)
    );
  }, [agencias, search]);

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

  const all = agencias ?? [];

  return (
    <div className="space-y-4">
      <ListToolbar
        title="Agencias de distribuidor"
        searchPlaceholder="Buscar por código, distribuidor, provincia, cantón..."
        onSearchChange={setSearch}
        actions={
          <Button onClick={() => setCreateOpen(true)}>Nueva agencia de distribuidor</Button>
        }
      />

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
            ) : undefined
          }
        />
      ) : (
        <ListTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Distribuidor</TableHead>
                <TableHead>Provincia</TableHead>
                <TableHead>Cantón</TableHead>
                <TableHead>Tarifa</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.codigo ?? '—'}</TableCell>
                  <TableCell>{a.distribuidorNombre ?? '—'}</TableCell>
                  <TableCell>{a.provincia ?? '—'}</TableCell>
                  <TableCell>{a.canton ?? '—'}</TableCell>
                  <TableCell>
                    {a.tarifa != null ? Number(a.tarifa).toFixed(2) : '—'}
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
        title="Eliminar agencia de distribuidor"
        description="¿Estás seguro de que deseas eliminar esta agencia de distribuidor? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          await deleteMutation.mutateAsync(deleteConfirmId);
        }}
      />
    </div>
  );
}
