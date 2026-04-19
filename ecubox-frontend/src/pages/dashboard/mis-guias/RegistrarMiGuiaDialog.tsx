import { useState } from 'react';
import { Loader2, UserRound } from 'lucide-react';
import { notify } from '@/lib/notify';
import { getApiStatus } from '@/lib/api/error-message';
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
      notify.warning('Indica el número de guía');
      return;
    }
    if (destinatarioId == null) {
      notify.warning('Selecciona un destinatario');
      return;
    }
    try {
      await notify.run(
        registrar.mutateAsync({
          trackingBase: trackingBase.trim(),
          destinatarioFinalId: destinatarioId,
        }),
        {
          loading: 'Registrando guía...',
          success: 'Guía registrada',
          error: (err) =>
            getApiStatus(err) === 409
              ? 'Ya existe una guía con ese número. Si crees que es un error, contacta al operario.'
              : 'No se pudo registrar la guía',
        },
      );
      onClose();
    } catch {
      // Error ya notificado por notify.run.
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
              {registrar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {registrar.isPending ? 'Registrando...' : 'Registrar guía'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
