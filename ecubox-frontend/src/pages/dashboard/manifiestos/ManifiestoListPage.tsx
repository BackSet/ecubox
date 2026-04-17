import { useState, useMemo } from 'react';
import { useManifiestos, useDeleteManifiesto } from '@/hooks/useManifiestos';
import { ManifiestoForm } from './ManifiestoForm';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { ListTableShell } from '@/components/ListTableShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api/error-message';

export function ManifiestoListPage() {
  const { data: manifiestos, isLoading, error } = useManifiestos();
  const deleteManifiesto = useDeleteManifiesto();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const raw = manifiestos ?? [];
    if (!search.trim()) return raw;
    const q = search.trim().toLowerCase();
    return raw.filter(
      (m) =>
        m.codigo?.toLowerCase().includes(q) ||
        (m.filtroDistribuidorNombre?.toLowerCase().includes(q) ?? false) ||
        (m.filtroAgenciaNombre?.toLowerCase().includes(q) ?? false)
    );
  }, [manifiestos, search]);

  if (isLoading) {
    return <LoadingState text="Cargando manifiestos..." />;
  }
  if (error) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        Error al cargar manifiestos.
      </div>
    );
  }

  const allManifiestos = manifiestos ?? [];

  return (
    <div className="space-y-4">
      <ListToolbar
        title="Manifiestos"
        searchPlaceholder="Buscar por código, distribuidor, agencia..."
        onSearchChange={setSearch}
        actions={
          <Button onClick={() => setCreateOpen(true)}>Nuevo manifiesto</Button>
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={allManifiestos.length === 0 ? 'No hay manifiestos' : 'Sin resultados'}
          description={
            allManifiestos.length === 0
              ? 'Crea un manifiesto para liquidar despachos por periodo, distribuidor o agencia.'
              : 'No se encontraron manifiestos con ese criterio.'
          }
          action={
            allManifiestos.length === 0 ? (
              <Button onClick={() => setCreateOpen(true)}>Crear manifiesto</Button>
            ) : undefined
          }
        />
      ) : (
        <ListTableShell>
          <Table className="min-w-[900px] text-left">
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Filtro</TableHead>
                <TableHead className="text-right">Despachos</TableHead>
                <TableHead className="text-right">Total a pagar</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.codigo ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.fechaInicio && m.fechaFin
                      ? `${m.fechaInicio} – ${m.fechaFin}`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.filtroTipo === 'POR_PERIODO'
                      ? 'Por período'
                      : m.filtroTipo === 'POR_DISTRIBUIDOR'
                        ? m.filtroDistribuidorNombre ?? '—'
                        : m.filtroAgenciaNombre ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">{m.cantidadDespachos ?? 0}</TableCell>
                  <TableCell className="text-right font-medium">
                    {m.totalPagar != null
                      ? `$${Number(m.totalPagar).toFixed(2)}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{m.estado ?? 'PENDIENTE'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end">
                      <RowActionsMenu
                        items={[
                          { label: 'Ver detalle', onSelect: () => { window.location.href = `/manifiestos/${m.id}`; } },
                          { label: 'Editar', onSelect: () => setEditingId(m.id) },
                          {
                            label: 'Eliminar',
                            destructive: true,
                            onSelect: () => setDeleteConfirmId(m.id),
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
        <ManifiestoForm
          onClose={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
        />
      )}
      {editingId != null && (
        <ManifiestoForm
          id={editingId}
          onClose={() => setEditingId(null)}
          onSuccess={() => setEditingId(null)}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Eliminar manifiesto"
        description="¿Eliminar este manifiesto? Los despachos quedarán sin asignar. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteManifiesto.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          try {
            await deleteManifiesto.mutateAsync(deleteConfirmId);
            toast.success('Manifiesto eliminado');
          } catch (error: unknown) {
            toast.error(getApiErrorMessage(error) ?? 'Error al eliminar el manifiesto');
            throw error;
          }
        }}
      />
    </div>
  );
}
