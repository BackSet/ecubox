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
import { useConsignatarios } from '@/hooks/useConsignatarios';
import { useActualizarMiGuiaConsignatario } from '@/hooks/useMisGuias';
import type { GuiaMaster } from '@/types/guia-master';

interface Props {
  guia: GuiaMaster;
  open: boolean;
  onClose: () => void;
}

/**
 * Dialog para que el cliente final reasigne el consignatario de una de sus
 * propias guías. Solo lista los consignatarios que pertenecen al cliente.
 */
export function EditarMiGuiaConsignatarioDialog({ guia, open, onClose }: Props) {
  const [consignatarioId, setConsignatarioId] = useState<number | undefined>();
  const { data: consignatarios = [], isLoading: loadingDest } = useConsignatarios();
  const actualizar = useActualizarMiGuiaConsignatario();

  useEffect(() => {
    if (open) {
      setConsignatarioId(guia.consignatarioId ?? undefined);
    }
  }, [open, guia.consignatarioId]);

  function handleConsignatarioChange(value: string | number | undefined) {
    const did = typeof value === 'string' ? Number(value) : value;
    setConsignatarioId(did);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (consignatarioId == null) {
      toast.error('Selecciona un consignatario');
      return;
    }
    if (consignatarioId === guia.consignatarioId) {
      onClose();
      return;
    }
    try {
      await actualizar.mutateAsync({
        id: guia.id,
        consignatarioId: consignatarioId,
      });
      toast.success('Consignatario actualizado');
      onClose();
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } })
        ?.response;
      toast.error(res?.data?.message ?? 'No se pudo actualizar el consignatario');
    }
  }

  const sinConsignatarios = !loadingDest && consignatarios.length === 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !actualizar.isPending && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar consignatario</DialogTitle>
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
              htmlFor="mi-guia-consignatario"
              className="mb-1 flex items-center gap-1 text-xs"
            >
              <UserRound className="h-3.5 w-3.5" />
              Consignatario *
            </Label>
            <SearchableCombobox
              id="mi-guia-consignatario"
              value={consignatarioId}
              onChange={handleConsignatarioChange}
              options={consignatarios}
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
                  ? 'Cargando consignatarios...'
                  : sinConsignatarios
                    ? 'Sin consignatarios'
                    : 'Selecciona un consignatario'
              }
              searchPlaceholder="Buscar por nombre, código, cantón..."
              emptyMessage="Sin coincidencias"
              disabled={loadingDest || sinConsignatarios}
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
            {sinConsignatarios && (
              <p className="mt-1 text-xs text-muted-foreground">
                Aún no tienes consignatarios. Crea uno desde "Mis consignatarios".
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
            <Button type="submit" disabled={actualizar.isPending || sinConsignatarios}>
              {actualizar.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
