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
import { useConsignatarios } from '@/hooks/useConsignatarios';
import { useRegistrarMiGuia } from '@/hooks/useMisGuias';

export function RegistrarMiGuiaDialog({ onClose }: { onClose: () => void }) {
  const [trackingBase, setTrackingBase] = useState('');
  const [consignatarioId, setConsignatarioId] = useState<number | undefined>();
  const registrar = useRegistrarMiGuia();
  const { data: consignatarios = [], isLoading: loadingDest } = useConsignatarios();

  function handleConsignatarioChange(value: string | number | undefined) {
    const did = typeof value === 'string' ? Number(value) : value;
    setConsignatarioId(did);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingBase.trim()) {
      notify.warning('Indica el número de guía');
      return;
    }
    if (consignatarioId == null) {
      notify.warning('Selecciona un consignatario');
      return;
    }
    try {
      await notify.run(
        registrar.mutateAsync({
          trackingBase: trackingBase.trim(),
          consignatarioId: consignatarioId,
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

  const sinConsignatarios = !loadingDest && consignatarios.length === 0;

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
              htmlFor="mi-consignatario-crear"
              className="mb-1 flex items-center gap-1 text-xs"
            >
              <UserRound className="h-3.5 w-3.5" />
              Consignatario *
            </Label>
            <SearchableCombobox
              id="mi-consignatario-crear"
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
