import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { usePaquetes, useDeletePaquete } from '@/hooks/usePaquetes';
import { useAuthStore } from '@/stores/authStore';
import { PaqueteForm } from './PaqueteForm';
import { PaqueteBulkCreateForm } from './PaqueteBulkCreateForm';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ListTableShell } from '@/components/ListTableShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Paquete } from '@/types/paquete';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { GuiaMasterPiezaCell, DestinatarioCell } from './PaqueteCells';

export function PaqueteListPage() {
  const hasPaquetesCreate = useAuthStore((s) => s.hasPermission('PAQUETES_CREATE'));
  const hasPaquetesUpdate = useAuthStore((s) => s.hasPermission('PAQUETES_UPDATE'));
  const hasPaquetesDelete = useAuthStore((s) => s.hasPermission('PAQUETES_DELETE'));
  const hasPesoWrite = useAuthStore((s) => s.hasPermission('PAQUETES_PESO_WRITE'));
  const { data: paquetes, isLoading, error } = usePaquetes();
  const deletePaquete = useDeletePaquete();
  const [createOpen, setCreateOpen] = useState(false);
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
        (hasPesoWrite && (p.guiaMasterTrackingBase?.toLowerCase().includes(q) ?? false)) ||
        (hasPesoWrite && (p.envioConsolidadoCodigo?.toLowerCase().includes(q) ?? false)) ||
        (p.ref?.toLowerCase().includes(q) ?? false) ||
        (p.destinatarioNombre?.toLowerCase().includes(q) ?? false) ||
        (p.contenido?.toLowerCase().includes(q) ?? false)
    );
  }, [paquetes, search, hasPesoWrite]);

  if (isLoading) {
    return <LoadingState text="Cargando paquetes..." />;
  }
  if (error) {
    return <div className="ui-alert ui-alert-error">Error al cargar paquetes.</div>;
  }

  const allPaquetes = paquetes ?? [];

  return (
    <div className="page-stack">
      <ListToolbar
        title="Gestión de paquetes"
        searchPlaceholder="Buscar por guía master, pieza, envío, destinatario o contenido..."
        onSearchChange={setSearch}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {hasPaquetesCreate && (
              <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar paquete
              </Button>
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
            <Table className="table-mobile-cards min-w-[860px] text-left">
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Guía master / Pieza</TableHead>
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
                    <TableCell data-label="Ref" className="font-mono text-xs text-muted-foreground">{p.ref ?? '—'}</TableCell>
                    <TableCell data-label="Guía master / Pieza" className="max-w-[14rem] align-top">
                      <GuiaMasterPiezaCell paquete={p} />
                    </TableCell>
                    {hasPesoWrite && (
                      <TableCell data-label="Guía de envío" className="font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <span>{p.envioConsolidadoCodigo ?? '—'}</span>
                          {p.envioConsolidadoCodigo && (
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {p.envioConsolidadoCerrado ? 'Cerrado' : 'Abierto'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell data-label="Destinatario" className="align-top">
                      <DestinatarioCell paquete={p} />
                    </TableCell>
                    <TableCell data-label="Estado">
                      <StatusBadge tone="neutral">
                        {p.estadoRastreoNombre ?? p.estadoRastreoCodigo ?? '—'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell data-label="Contenido" className="text-muted-foreground">{p.contenido ?? '—'}</TableCell>
                    <TableCell data-label="Peso">
                      {p.pesoLbs != null || p.pesoKg != null
                        ? [p.pesoLbs != null ? `${p.pesoLbs} lbs` : null, p.pesoKg != null ? `${p.pesoKg} kg` : null]
                            .filter(Boolean)
                            .join(' / ')
                        : '—'}
                    </TableCell>
                    {(hasPaquetesUpdate || hasPaquetesDelete) && (
                      <TableCell data-label="Acciones" className="text-right md:text-right">
                        <div className="flex items-center justify-end gap-1">
                          {hasPaquetesUpdate && (
                            <button
                              type="button"
                              onClick={() => setEditingPaquete(p)}
                              aria-label="Editar paquete"
                              title="Editar paquete"
                              className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-[var(--color-muted)] hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {hasPaquetesDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(p.id)}
                              aria-label="Eliminar paquete"
                              title="Eliminar paquete"
                              className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-[var(--color-destructive)]/10 hover:text-[var(--color-destructive)] hover:border-[var(--color-destructive)]/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
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
        <PaqueteBulkCreateForm
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
          } catch (error: unknown) {
            toast.error(getApiErrorMessage(error) ?? 'Error al eliminar el paquete');
            throw error;
          }
        }}
      />
    </div>
  );
}
