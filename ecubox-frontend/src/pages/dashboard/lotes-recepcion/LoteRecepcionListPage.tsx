import { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useLotesRecepcion, useDeleteLoteRecepcion } from '@/hooks/useLotesRecepcion';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { ListTableShell } from '@/components/ListTableShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PackageCheck, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api/error-message';

function formatFecha(s: string | undefined): string {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return s;
  }
}

export function LoteRecepcionListPage() {
  const { data: lotes, isLoading, error } = useLotesRecepcion();
  const deleteLote = useDeleteLoteRecepcion();
  const [search, setSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const list = useMemo(() => {
    const raw = lotes ?? [];
    if (!search.trim()) return raw;
    const q = search.trim().toLowerCase();
    return raw.filter(
      (l) =>
        l.observaciones?.toLowerCase().includes(q) ||
        l.operarioNombre?.toLowerCase().includes(q) ||
        l.numeroGuiasEnvio?.some((g) => g.toLowerCase().includes(q))
    );
  }, [lotes, search]);

  if (isLoading) {
    return <LoadingState text="Cargando lotes de recepción..." />;
  }
  if (error) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        Error al cargar lotes de recepción.
      </div>
    );
  }

  const allLotes = lotes ?? [];

  return (
    <div className="space-y-6">
      <ListToolbar
        title="Lotes de recepción"
        searchPlaceholder="Buscar por observaciones, operario, guía..."
        onSearchChange={setSearch}
        actions={
          <Link to="/lotes-recepcion/nuevo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Registrar nuevo lote
            </Button>
          </Link>
        }
      />

      {allLotes.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="No hay lotes de recepción"
          description="Registre un lote desde el botón «Registrar nuevo lote». Solo se incluirán las guías que tengan paquetes en el sistema."
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="Sin resultados"
          description="No hay lotes que coincidan con la búsqueda."
        />
      ) : (
        <ListTableShell>
          <Table className="min-w-[860px] text-left">
            <TableHeader>
              <TableRow>
                <TableHead>Fecha recepción</TableHead>
                <TableHead>Observaciones</TableHead>
                <TableHead>Operario</TableHead>
                <TableHead className="text-right">Guías</TableHead>
                <TableHead className="text-right">Paquetes</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{formatFecha(l.fechaRecepcion)}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground" title={l.observaciones ?? ''}>
                    {l.observaciones ? (l.observaciones.length > 50 ? l.observaciones.slice(0, 50) + '…' : l.observaciones) : '—'}
                  </TableCell>
                  <TableCell>{l.operarioNombre ?? '—'}</TableCell>
                  <TableCell className="text-right">{l.numeroGuiasEnvio?.length ?? 0}</TableCell>
                  <TableCell className="text-right">{l.totalPaquetes ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end">
                      <RowActionsMenu
                        items={[
                          { label: 'Ver detalle', onSelect: () => { window.location.href = `/lotes-recepcion/${l.id}`; } },
                          {
                            label: 'Eliminar lote',
                            destructive: true,
                            onSelect: () => setDeleteConfirmId(l.id),
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

      <ConfirmDialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Eliminar lote de recepción"
        description="Se eliminará el lote y se revertirá el estado de los paquetes del lote cuando aplique."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteLote.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          try {
            const result = await deleteLote.mutateAsync(deleteConfirmId);
            const reverted = result.paquetesRevertidos ?? 0;
            toast.success(
              reverted > 0
                ? `Lote eliminado. ${reverted} paquete(s) volvieron al estado anterior.`
                : 'Lote eliminado correctamente'
            );
          } catch (error: unknown) {
            toast.error(getApiErrorMessage(error) ?? 'Error al eliminar el lote');
            throw error;
          }
        }}
      />
    </div>
  );
}
