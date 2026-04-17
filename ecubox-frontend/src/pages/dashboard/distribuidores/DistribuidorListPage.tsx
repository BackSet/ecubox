import { useState, useMemo } from 'react';
import { useDistribuidoresAdmin, useDeleteDistribuidor } from '@/hooks/useDistribuidoresAdmin';
import { DistribuidorForm } from './DistribuidorForm';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { ListTableShell } from '@/components/ListTableShell';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PackageCheck } from 'lucide-react';
import { createContainsMatcher } from '@/lib/search';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api/error-message';

export function DistribuidorListPage() {
  const { data: distribuidores, isLoading, error } = useDistribuidoresAdmin();
  const deleteDistribuidor = useDeleteDistribuidor();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const raw = distribuidores ?? [];
    const contains = createContainsMatcher(search);
    if (!contains) return raw;
    return raw.filter(
      (d) =>
        contains(d.nombre) ||
        contains(d.codigo) ||
        contains(d.email) ||
        contains(d.horarioReparto) ||
        contains(d.paginaTracking)
    );
  }, [distribuidores, search]);

  if (isLoading) {
    return <LoadingState text="Cargando distribuidores..." />;
  }
  if (error) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        Error al cargar distribuidores.
      </div>
    );
  }

  const allDistribuidores = distribuidores ?? [];

  return (
    <div className="space-y-4">
      <ListToolbar
        title="Distribuidores"
        searchPlaceholder="Buscar por nombre, código, email, horario o página..."
        onSearchChange={setSearch}
        actions={
          <Button onClick={() => setCreateOpen(true)}>Nuevo distribuidor</Button>
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title={allDistribuidores.length === 0 ? 'No hay distribuidores' : 'Sin resultados'}
          description={
            allDistribuidores.length === 0
              ? 'Registra un distribuidor para asignarlo a despachos.'
              : 'No se encontraron distribuidores con ese criterio.'
          }
          action={
            allDistribuidores.length === 0 ? (
              <Button onClick={() => setCreateOpen(true)}>Registrar distribuidor</Button>
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
                <TableHead>Email</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Página tracking</TableHead>
                <TableHead>Tarifa envío</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.nombre}</TableCell>
                  <TableCell>{d.codigo ?? '—'}</TableCell>
                  <TableCell>{d.email ?? '—'}</TableCell>
                  <TableCell className="max-w-[260px] truncate" title={d.horarioReparto ?? ''}>
                    {d.horarioReparto ?? '—'}
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate" title={d.paginaTracking ?? ''}>
                    {d.paginaTracking && /^https?:\/\//i.test(d.paginaTracking) ? (
                      <a
                        href={d.paginaTracking}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--color-primary)] hover:underline"
                      >
                        {d.paginaTracking}
                      </a>
                    ) : d.paginaTracking ?? '—'}
                  </TableCell>
                  <TableCell>
                    {d.tarifaEnvio != null
                      ? Number(d.tarifaEnvio).toFixed(2)
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end">
                      <RowActionsMenu
                        items={[
                          { label: 'Editar', onSelect: () => setEditingId(d.id) },
                          {
                            label: 'Eliminar',
                            destructive: true,
                            onSelect: () => setDeleteConfirmId(d.id),
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
        title="Eliminar distribuidor"
        description="¿Estás seguro de que deseas eliminar este distribuidor? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteDistribuidor.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          try {
            await deleteDistribuidor.mutateAsync(deleteConfirmId);
            toast.success('Distribuidor eliminado');
          } catch (error: unknown) {
            toast.error(getApiErrorMessage(error) ?? 'Error al eliminar el distribuidor');
            throw error;
          }
        }}
      />
    </div>
  );
}
