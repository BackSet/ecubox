import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { useDestinatarios } from '@/hooks/useDestinatarios';
import { useActualizarMiGuiaDestinatario } from '@/hooks/useMisGuias';
import type { GuiaMaster } from '@/types/guia-master';

interface Props {
  guia: GuiaMaster;
  open: boolean;
  onClose: () => void;
}

/**
 * Dialog para que el cliente final reasigne el destinatario de una de sus
 * propias guías. Solo lista los destinatarios que pertenecen al cliente.
 */
export function EditarMiGuiaDestinatarioDialog({ guia, open, onClose }: Props) {
  const [destinatarioId, setDestinatarioId] = useState<number | undefined>();
  const { data: destinatarios = [], isLoading: loadingDest } = useDestinatarios();
  const actualizar = useActualizarMiGuiaDestinatario();

  useEffect(() => {
    if (open) {
      setDestinatarioId(guia.destinatarioFinalId ?? undefined);
    }
  }, [open, guia.destinatarioFinalId]);

  function handleDestinatarioChange(value: string | number | undefined) {
    const did = typeof value === 'string' ? Number(value) : value;
    setDestinatarioId(did);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (destinatarioId == null) {
      toast.error('Selecciona un destinatario');
      return;
    }
    if (destinatarioId === guia.destinatarioFinalId) {
      onClose();
      return;
    }
    try {
      await actualizar.mutateAsync({
        id: guia.id,
        destinatarioFinalId: destinatarioId,
      });
      toast.success('Destinatario actualizado');
      onClose();
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } })
        ?.response;
      toast.error(res?.data?.message ?? 'No se pudo actualizar el destinatario');
    }
  }

  const sinDestinatarios = !loadingDest && destinatarios.length === 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !actualizar.isPending && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar destinatario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border border-border bg-[var(--color-muted)]/40 px-3 py-2 text-xs">
            <p className="text-muted-foreground">Guía</p>
            <p className="break-all font-mono text-sm font-medium text-foreground">
              {guia.trackingBase}
            </p>
          </div>

          <div>
            <Label
              htmlFor="mi-guia-destinatario"
              className="mb-1 flex items-center gap-1 text-xs"
            >
              <UserRound className="h-3.5 w-3.5" />
              Destinatario *
            </Label>
            <SearchableCombobox
              id="mi-guia-destinatario"
              value={destinatarioId}
              onChange={handleDestinatarioChange}
              options={destinatarios}
              getKey={(d) => d.id}
              getLabel={(d) => d.nombre}
              getSearchText={(d) =>
                [
                  d.nombre,
                  d.codigo ?? '',
                  d.canton ?? '',
                  d.provincia ?? '',
                  d.telefono ?? '',
                ].join(' ')
              }
              placeholder={
                loadingDest
                  ? 'Cargando destinatarios...'
                  : sinDestinatarios
                    ? 'Sin destinatarios'
                    : 'Selecciona un destinatario'
              }
              searchPlaceholder="Buscar por nombre, código, cantón..."
              emptyMessage="Sin coincidencias"
              disabled={loadingDest || sinDestinatarios}
              clearable={false}
              renderOption={(d) => (
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{d.nombre}</span>
                    {d.codigo && (
                      <span className="text-xs text-muted-foreground">· {d.codigo}</span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[d.canton, d.provincia].filter(Boolean).join(', ') || ''}
                  </div>
                </div>
              )}
              renderSelected={(d) => (
                <span className="flex items-center gap-2">
                  <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{d.nombre}</span>
                  {d.codigo && (
                    <span className="text-xs text-muted-foreground">· {d.codigo}</span>
                  )}
                </span>
              )}
            />
            {sinDestinatarios && (
              <p className="mt-1 text-xs text-muted-foreground">
                Aún no tienes destinatarios. Crea uno desde "Destinatarios".
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={actualizar.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={actualizar.isPending || sinDestinatarios}>
              {actualizar.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
