import { useState, useMemo } from 'react';
import { useRoles } from '@/hooks/useRoles';
import { useAuthStore } from '@/stores/authStore';
import { RolEditPermisos } from './RolEditPermisos';
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield } from 'lucide-react';

export function RolList() {
  const { data: roles, isLoading, error } = useRoles();
  const hasWrite = useAuthStore((s) => s.hasPermission('ROLES_WRITE'));
  const [editingRolId, setEditingRolId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const raw = roles ?? [];
    if (!search.trim()) return raw;
    const q = search.trim().toLowerCase();
    return raw.filter((r) => r.nombre?.toLowerCase().includes(q));
  }, [roles, search]);

  if (isLoading) {
    return <LoadingState text="Cargando roles..." />;
  }
  if (error) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        Error al cargar roles.
      </div>
    );
  }

  const allRoles = roles ?? [];

  return (
    <div className="space-y-4">
      <ListToolbar
        title="Roles"
        searchPlaceholder="Buscar por nombre..."
        onSearchChange={setSearch}
      />

      {list.length === 0 ? (
        <EmptyState
          icon={Shield}
          title={allRoles.length === 0 ? 'No hay roles' : 'Sin resultados'}
          description={
            allRoles.length === 0
              ? 'Los roles se gestionan desde el backend.'
              : 'No se encontraron roles con ese criterio.'
          }
        />
      ) : (
        <ListTableShell>
          <Table className="min-w-[680px]">
            <TableHeader>
              <TableRow>
                <TableHead>Rol</TableHead>
                <TableHead>Permisos</TableHead>
                {hasWrite && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nombre}</TableCell>
                  <TableCell>
                    {r.permisos?.length
                      ? r.permisos.map((p) => p.codigo).join(', ')
                      : '—'}
                  </TableCell>
                  {hasWrite && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        <RowActionsMenu
                          items={[
                            { label: 'Editar permisos', onSelect: () => setEditingRolId(r.id) },
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

      {editingRolId != null && (
        <RolEditPermisos
          rolId={editingRolId}
          onClose={() => setEditingRolId(null)}
          onSuccess={() => setEditingRolId(null)}
        />
      )}
    </div>
  );
}
