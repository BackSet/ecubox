import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { usePaquetes, useDeletePaquete } from '@/hooks/usePaquetes';
import { useAuthStore } from '@/stores/authStore';
import { PaqueteForm } from './PaqueteForm';
import { AsignarGuiaEnvioPage } from '@/pages/dashboard/asignar-guia-envio/AsignarGuiaEnvioPage';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { ListTableShell } from '@/components/ListTableShell';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Link2 } from 'lucide-react';
import type { Paquete } from '@/types/paquete';

export function PaqueteListPage() {
  const hasPaquetesCreate = useAuthStore((s) => s.hasPermission('PAQUETES_CREATE'));
  const hasPaquetesUpdate = useAuthStore((s) => s.hasPermission('PAQUETES_UPDATE'));
  const hasPaquetesDelete = useAuthStore((s) => s.hasPermission('PAQUETES_DELETE'));
  const hasPesoWrite = useAuthStore((s) => s.hasPermission('PAQUETES_PESO_WRITE'));
  const canAccessAsignarGuia = useAuthStore((s) => s.hasRole('ADMIN') || s.hasRole('OPERARIO'));
  const { data: paquetes, isLoading, error } = usePaquetes();
  const deletePaquete = useDeletePaquete();
  const [createOpen, setCreateOpen] = useState(false);
  const [asignarGuiaOpen, setAsignarGuiaOpen] = useState(false);
  const [editingPaquete, setEditingPaquete] = useState<Paquete | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const raw = paquetes ?? [];
    if (!search.trim()) return raw;
    const q = search.trim().toLowerCase();
    return raw.filter(
      (p) =>
        p.numeroGuia?.toLowerCase().includes(q) ||
        (hasPesoWrite && (p.numeroGuiaEnvio?.toLowerCase().includes(q) ?? false)) ||
        (p.ref?.toLowerCase().includes(q) ?? false) ||
        (p.destinatarioNombre?.toLowerCase().includes(q) ?? false) ||
        (p.contenido?.toLowerCase().includes(q) ?? false)
    );
  }, [paquetes, search, hasPesoWrite]);

  if (isLoading) {
    return <LoadingState text="Cargando paquetes..." />;
  }
  if (error) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        Error al cargar paquetes.
      </div>
    );
  }

  const allPaquetes = paquetes ?? [];

  return (
    <div className="space-y-4">
      <ListToolbar
        title="Mis Paquetes"
        searchPlaceholder={
          hasPesoWrite
            ? 'Buscar por guía, guía de envío, destinatario, contenido...'
            : 'Buscar por guía, destinatario, contenido...'
        }
        onSearchChange={setSearch}
        actions={
          <div className="flex items-center gap-2">
            {canAccessAsignarGuia && (
              <Button type="button" variant="outline" className="gap-2" onClick={() => setAsignarGuiaOpen(true)}>
                <Link2 className="h-4 w-4" />
                Asignar guía de envío
              </Button>
            )}
            {hasPaquetesCreate && (
              <Button onClick={() => setCreateOpen(true)}>Registrar paquete</Button>
            )}
          </div>
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon={Package}
          title={allPaquetes.length === 0 ? 'No hay paquetes' : 'Sin resultados'}
          description={
            allPaquetes.length === 0
              ? 'Registra un paquete con su número de guía y destinatario para hacer seguimiento.'
              : 'No se encontraron paquetes con ese criterio.'
          }
          action={
            allPaquetes.length === 0 && hasPaquetesCreate ? (
              <Button onClick={() => setCreateOpen(true)}>Registrar paquete</Button>
            ) : undefined
          }
        />
      ) : (
        <ListTableShell>
            <Table className="min-w-[860px] text-left">
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Número de guía</TableHead>
                  {hasPesoWrite && <TableHead>Guía de envío</TableHead>}
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Contenido</TableHead>
                  <TableHead>Peso</TableHead>
                  {(hasPaquetesUpdate || hasPaquetesDelete) && <TableHead className="w-24 text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.ref ?? '—'}</TableCell>
                    <TableCell className="font-medium">
                      <a
                        href={`/tracking?numeroGuia=${encodeURIComponent(p.numeroGuia)}`}
                        className="text-primary hover:underline"
                      >
                        {p.numeroGuia}
                      </a>
                    </TableCell>
                    {hasPesoWrite && <TableCell>{p.numeroGuiaEnvio ?? '—'}</TableCell>}
                    <TableCell>{p.destinatarioNombre ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {p.estadoRastreoNombre ?? p.estadoRastreoCodigo ?? '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.contenido ?? '—'}</TableCell>
                    <TableCell>
                      {p.pesoLbs != null || p.pesoKg != null
                        ? [p.pesoLbs != null ? `${p.pesoLbs} lbs` : null, p.pesoKg != null ? `${p.pesoKg} kg` : null]
                            .filter(Boolean)
                            .join(' / ')
                        : '—'}
                    </TableCell>
                    {(hasPaquetesUpdate || hasPaquetesDelete) && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          <RowActionsMenu
                            items={[
                              ...(hasPaquetesUpdate ? [{ label: 'Editar', onSelect: () => setEditingPaquete(p) }] : []),
                              ...(hasPaquetesDelete
                                ? [{ label: 'Eliminar', onSelect: () => setDeleteConfirmId(p.id), destructive: true }]
                                : []),
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
        <PaqueteForm
          onClose={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
        />
      )}

      {editingPaquete != null && (
        <PaqueteForm
          paquete={editingPaquete}
          onClose={() => setEditingPaquete(null)}
          onSuccess={() => setEditingPaquete(null)}
        />
      )}

      <Dialog open={asignarGuiaOpen} onOpenChange={setAsignarGuiaOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle>Asignar guía de envío</DialogTitle>
          </DialogHeader>
          <AsignarGuiaEnvioPage />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Eliminar paquete"
        description="¿Estás seguro de que deseas eliminar este paquete? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deletePaquete.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          try {
            await deletePaquete.mutateAsync(deleteConfirmId);
            toast.success('Paquete eliminado correctamente');
          } catch {
            toast.error('Error al eliminar el paquete');
            throw new Error('Delete failed');
          }
        }}
      />
    </div>
  );
}
