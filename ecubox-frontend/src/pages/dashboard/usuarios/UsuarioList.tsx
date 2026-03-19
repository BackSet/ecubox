import { useState, useMemo } from 'react';
import { useUsuarios, useDeleteUsuario } from '@/hooks/useUsuarios';
import { useAuthStore } from '@/stores/authStore';
import { UsuarioForm } from './UsuarioForm';
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users } from 'lucide-react';

export function UsuarioList() {
  const { data: usuarios, isLoading, error } = useUsuarios();
  const deleteUsuario = useDeleteUsuario();
  const hasWrite = useAuthStore((s) => s.hasPermission('USUARIOS_WRITE'));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const raw = usuarios ?? [];
    if (!search.trim()) return raw;
    const q = search.trim().toLowerCase();
    return raw.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        (u.email?.toLowerCase().includes(q) ?? false)
    );
  }, [usuarios, search]);

  if (isLoading) {
    return <LoadingState text="Cargando usuarios..." />;
  }
  if (error) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        Error al cargar usuarios.
      </div>
    );
  }

  const allUsuarios = usuarios ?? [];

  return (
    <div className="space-y-4">
      <ListToolbar
        title="Usuarios"
        searchPlaceholder="Buscar por usuario o email..."
        onSearchChange={setSearch}
        actions={
          hasWrite ? (
            <Button onClick={() => setCreateOpen(true)}>Nuevo usuario</Button>
          ) : undefined
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon={Users}
          title={allUsuarios.length === 0 ? 'No hay usuarios' : 'Sin resultados'}
          description={
            allUsuarios.length === 0
              ? 'Crea el primer usuario para comenzar.'
              : 'No se encontraron usuarios con ese criterio.'
          }
          action={
            hasWrite && allUsuarios.length === 0 ? (
              <Button onClick={() => setCreateOpen(true)}>Nuevo usuario</Button>
            ) : undefined
          }
        />
      ) : (
        <ListTableShell>
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Roles</TableHead>
                {hasWrite && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell>{u.email ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge variant={u.enabled ? 'active' : 'inactive'}>
                      {u.enabled ? 'Activo' : 'Inactivo'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>{u.roles?.join(', ') ?? '—'}</TableCell>
                  {hasWrite && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        <RowActionsMenu
                          items={[
                            { label: 'Editar', onSelect: () => setEditingId(u.id) },
                            {
                              label: 'Eliminar',
                              destructive: true,
                              onSelect: () => setDeleteConfirmId(u.id),
                            },
                          ]}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ListTableShell>
      )}

      {createOpen && (
        <UsuarioForm
          onClose={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
        />
      )}
      {editingId != null && (
        <UsuarioForm
          id={editingId}
          onClose={() => setEditingId(null)}
          onSuccess={() => setEditingId(null)}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Eliminar usuario"
        description="¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteUsuario.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          await deleteUsuario.mutateAsync(deleteConfirmId);
        }}
      />
    </div>
  );
}
