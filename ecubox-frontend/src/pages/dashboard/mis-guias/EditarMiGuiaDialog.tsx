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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { useConsignatarios } from '@/hooks/useConsignatarios';
import { useActualizarMiGuia } from '@/hooks/useMisGuias';
import { miGuiaSchema } from '@/lib/schemas';
import type { GuiaMaster } from '@/types/guia-master';

interface Props {
  guia: GuiaMaster;
  open: boolean;
  onClose: () => void;
}

/**
 * Dialog para que el cliente final edite el número de guía y/o el consignatario
 * de una de sus propias guías. Solo es invocable desde la lista cuando la guía
 * está en estado inicial; el backend valida el estado de todas formas.
 */
export function EditarMiGuiaDialog({ guia, open, onClose }: Props) {
  const [trackingBase, setTrackingBase] = useState(guia.trackingBase);
  const [consignatarioId, setConsignatarioId] = useState<number | undefined>(
    guia.consignatarioId ?? undefined,
  );
  const { data: consignatarios = [], isLoading: loadingDest } = useConsignatarios();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const actualizar = useActualizarMiGuia();

  useEffect(() => {
    if (open) {
      setTrackingBase(guia.trackingBase);
      setConsignatarioId(guia.consignatarioId ?? undefined);
    }
  }, [open, guia.trackingBase, guia.consignatarioId]);

  function handleConsignatarioChange(value: string | number | undefined) {
    const did = typeof value === 'string' ? Number(value) : value;
    setConsignatarioId(did);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.consignatarioId;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = miGuiaSchema.safeParse({
      trackingBase: trackingBase.trim(),
      consignatarioId,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '_form');
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      toast.error(Object.values(errs)[0] ?? 'Revisa los datos');
      return;
    }
    setFieldErrors({});
    const tbTrim = parsed.data.trackingBase;

    const tbCambio = tbTrim.toLowerCase() !== guia.trackingBase.toLowerCase();
    const destCambio = parsed.data.consignatarioId !== guia.consignatarioId;
    if (!tbCambio && !destCambio) {
      onClose();
      return;
    }

    try {
      await actualizar.mutateAsync({
        id: guia.id,
        body: {
          ...(tbCambio ? { trackingBase: tbTrim } : {}),
          consignatarioId: parsed.data.consignatarioId,
        },
      });
      toast.success('Guía actualizada');
      onClose();
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } })
        ?.response;
      if (res?.status === 409) {
        toast.error(res?.data?.message ?? 'Conflicto al actualizar la guía');
      } else {
        toast.error(res?.data?.message ?? 'No se pudo actualizar la guía');
      }
    }
  }

  const sinConsignatarios = !loadingDest && consignatarios.length === 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !actualizar.isPending && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar guía</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="mi-guia-tracking" className="mb-1 block">
              Número de guía *
            </Label>
            <Input
              id="mi-guia-tracking"
              value={trackingBase}
              onChange={(e) => {
                setTrackingBase(e.target.value);
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.trackingBase;
                  return next;
                });
              }}
              placeholder="Ej: 1Z52159R0379385035"
              autoFocus
              aria-invalid={!!fieldErrors.trackingBase}
            />
            {fieldErrors.trackingBase && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.trackingBase}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              El número que aparece en la guía del courier (UPS, FedEx, etc.).
            </p>
          </div>

          <div>
            <Label
              htmlFor="mi-guia-edit-consignatario"
              className="mb-1 flex items-center gap-1 text-xs"
            >
              <UserRound className="h-3.5 w-3.5" />
              Destinatario *
            </Label>
            <SearchableCombobox
              id="mi-guia-edit-consignatario"
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
                  ? 'Cargando destinatarios...'
                  : sinConsignatarios
                    ? 'Sin destinatarios'
                    : 'Selecciona un destinatario'
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
            {fieldErrors.consignatarioId && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.consignatarioId}</p>
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
