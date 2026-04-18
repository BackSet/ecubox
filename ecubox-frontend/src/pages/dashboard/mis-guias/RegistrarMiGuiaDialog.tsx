import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { useDestinatarios } from '@/hooks/useDestinatarios';
import { useRegistrarMiGuia } from '@/hooks/useMisGuias';

export function RegistrarMiGuiaDialog({ onClose }: { onClose: () => void }) {
  const [trackingBase, setTrackingBase] = useState('');
  const [destinatarioId, setDestinatarioId] = useState<number | undefined>();
  const registrar = useRegistrarMiGuia();
  const { data: destinatarios = [], isLoading: loadingDest } = useDestinatarios();

  function handleDestinatarioChange(value: string | number | undefined) {
    const did = typeof value === 'string' ? Number(value) : value;
    setDestinatarioId(did);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingBase.trim()) {
      toast.error('Indica el número de guía');
      return;
    }
    if (destinatarioId == null) {
      toast.error('Selecciona un destinatario');
      return;
    }
    try {
      await registrar.mutateAsync({
        trackingBase: trackingBase.trim(),
        destinatarioFinalId: destinatarioId,
      });
      toast.success('Guía registrada');
      onClose();
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } })
        ?.response;
      if (res?.status === 409) {
        toast.error(
          'Ya existe una guía registrada con ese número. Si crees que es un error, contacta al operario.',
        );
      } else {
        toast.error(res?.data?.message ?? 'No se pudo registrar la guía');
      }
    }
  }

  const sinDestinatarios = !loadingDest && destinatarios.length === 0;

  return (
    <Dialog open onOpenChange={(open) => !open && !registrar.isPending && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar guía</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="trackingBase" className="mb-1 block">
              Número de guía *
            </Label>
            <Input
              id="trackingBase"
              value={trackingBase}
              onChange={(e) => setTrackingBase(e.target.value)}
              placeholder="Ej: 1Z52159R0379385035"
              autoFocus
            />
            <p className="mt-1 text-xs text-muted-foreground">
              El número que aparece en la guía del courier (UPS, FedEx, etc.).
            </p>
          </div>

          <div>
            <Label
              htmlFor="mi-destinatario-crear"
              className="mb-1 flex items-center gap-1 text-xs"
            >
              <UserRound className="h-3.5 w-3.5" />
              Destinatario *
            </Label>
            <SearchableCombobox
              id="mi-destinatario-crear"
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
            <p className="mt-1 text-[11px] text-muted-foreground">
              El total de piezas y demás detalles los completará el operario al recibir el
              paquete.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={registrar.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={registrar.isPending}>
              {registrar.isPending ? 'Registrando...' : 'Registrar guía'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
