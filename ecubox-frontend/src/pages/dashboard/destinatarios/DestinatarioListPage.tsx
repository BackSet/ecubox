import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useDestinatarios, useDeleteDestinatario } from '@/hooks/useDestinatarios';
import { useDestinatariosOperario, useDeleteDestinatarioOperario } from '@/hooks/useOperarioDespachos';
import { useAuthStore } from '@/stores/authStore';
import { DestinatarioForm } from './DestinatarioForm';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { ListTableShell } from '@/components/ListTableShell';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api/error-message';

export function DestinatarioListPage() {
  const hasDestinatariosOperario = useAuthStore((s) => s.hasPermission('DESTINATARIOS_OPERARIO'));
  const hasDestinatariosCreate = useAuthStore((s) => s.hasPermission('DESTINATARIOS_CREATE'));
  const hasDestinatariosUpdate = useAuthStore((s) => s.hasPermission('DESTINATARIOS_UPDATE'));
  const hasDestinatariosDelete = useAuthStore((s) => s.hasPermission('DESTINATARIOS_DELETE'));
  const [search, setSearch] = useState('');
  const { data: misData, isLoading: misLoading, error: misError } = useDestinatarios(!hasDestinatariosOperario);
  const { data: opData, isLoading: opLoading, error: opError } = useDestinatariosOperario(
    search.trim() || undefined,
    hasDestinatariosOperario
  );
  const destinatarios = hasDestinatariosOperario ? opData : misData;
  const isLoading = hasDestinatariosOperario ? opLoading : misLoading;
  const error = hasDestinatariosOperario ? opError : misError;
  const deleteDestinatario = useDeleteDestinatario();
  const deleteDestinatarioOperario = useDeleteDestinatarioOperario();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const list = useMemo(() => {
    const raw = destinatarios ?? [];
    if (hasDestinatariosOperario) return raw; // búsqueda ya aplicada en API
    if (!search.trim()) return raw;
    const q = search.trim().toLowerCase();
    return raw.filter(
      (d) =>
        d.nombre?.toLowerCase().includes(q) ||
        (d.telefono?.toLowerCase().includes(q) ?? false) ||
        (d.direccion?.toLowerCase().includes(q) ?? false) ||
        (d.provincia?.toLowerCase().includes(q) ?? false) ||
        (d.canton?.toLowerCase().includes(q) ?? false)
    );
  }, [destinatarios, search, hasDestinatariosOperario]);

  if (isLoading) {
    return <LoadingState text="Cargando destinatarios..." />;
  }
  if (error) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        Error al cargar destinatarios.
      </div>
    );
  }

  const allDestinatarios = destinatarios ?? [];

  return (
    <div className="space-y-4">
      <ListToolbar
        title={hasDestinatariosOperario ? 'Destinatarios' : 'Mis Destinatarios'}
        searchPlaceholder="Buscar por nombre, teléfono, dirección..."
        onSearchChange={setSearch}
        actions={
          hasDestinatariosCreate ? (
            <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>Nuevo destinatario</Button>
          ) : undefined
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={allDestinatarios.length === 0 ? 'No hay destinatarios' : 'Sin resultados'}
          description={
            allDestinatarios.length === 0
              ? 'Registra un destinatario para poder enviar paquetes a esa dirección.'
              : 'No se encontraron destinatarios con ese criterio.'
          }
          action={
            allDestinatarios.length === 0 && hasDestinatariosCreate ? (
              <Button onClick={() => setCreateOpen(true)}>Registrar destinatario</Button>
            ) : undefined
          }
        />
      ) : (
        <ListTableShell>
          <Table className="table-mobile-cards min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Provincia / Cantón</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((d) => (
                <TableRow key={d.id}>
                  <TableCell data-label="Código" className="font-mono text-sm">{d.codigo ?? '—'}</TableCell>
                  <TableCell data-label="Nombre" className="font-medium">{d.nombre}</TableCell>
                  <TableCell data-label="Teléfono">{d.telefono ?? '—'}</TableCell>
                  <TableCell data-label="Dirección" className="max-w-[200px] truncate" title={d.direccion ?? ''}>
                    {d.direccion ?? '—'}
                  </TableCell>
                  <TableCell data-label="Provincia / Cantón">
                    {[d.provincia, d.canton].filter(Boolean).join(' / ') || '—'}
                  </TableCell>
                  <TableCell data-label="Acciones" className="text-right md:text-right">
                    <div className="flex items-center justify-end md:justify-end">
                      <RowActionsMenu
                        items={[
                          ...((hasDestinatariosOperario || hasDestinatariosUpdate)
                            ? [{ label: 'Editar', onSelect: () => setEditingId(d.id) }]
                            : []),
                          ...(hasDestinatariosDelete
                            ? [{ label: 'Eliminar', onSelect: () => setDeleteConfirmId(d.id), destructive: true }]
                            : []),
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
