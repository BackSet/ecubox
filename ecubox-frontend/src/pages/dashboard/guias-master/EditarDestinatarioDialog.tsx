import { useEffect, useMemo, useState } from 'react';
import { Building2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
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
import { useActualizarGuiaMaster } from '@/hooks/useGuiasMaster';
import { useDestinatariosOperario } from '@/hooks/useOperarioDespachos';
import type { DestinatarioFinal } from '@/types/destinatario';
import type { GuiaMaster } from '@/types/guia-master';

interface ClienteOption {
  id: number;
  nombre: string;
}

export interface EditarDestinatarioDialogProps {
  guia: GuiaMaster;
  open: boolean;
  onClose: () => void;
}

export function EditarDestinatarioDialog({
  guia,
  open,
  onClose,
}: EditarDestinatarioDialogProps) {
  const actualizar = useActualizarGuiaMaster();
  const { data: destinatarios = [], isLoading: loadingDest } = useDestinatariosOperario(
    undefined,
    open
  );

  const [clienteId, setClienteId] = useState<number | undefined>(
    guia.clienteUsuarioId ?? undefined
  );
  const [destinatarioId, setDestinatarioId] = useState<number | undefined>(
    guia.destinatarioFinalId ?? undefined
  );

  useEffect(() => {
    if (!open) return;
    setClienteId(guia.clienteUsuarioId ?? undefined);
    setDestinatarioId(guia.destinatarioFinalId ?? undefined);
  }, [open, guia.clienteUsuarioId, guia.destinatarioFinalId]);

  const clientes: ClienteOption[] = useMemo(() => {
    const map = new Map<number, ClienteOption>();
    for (const d of destinatarios) {
      if (d.clienteUsuarioId != null && d.clienteUsuarioNombre) {
        if (!map.has(d.clienteUsuarioId)) {
          map.set(d.clienteUsuarioId, {
            id: d.clienteUsuarioId,
            nombre: d.clienteUsuarioNombre,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
    );
  }, [destinatarios]);

  const destinatariosFiltrados: DestinatarioFinal[] = useMemo(() => {
    if (clienteId == null) return destinatarios;
    return destinatarios.filter((d) => d.clienteUsuarioId === clienteId);
  }, [destinatarios, clienteId]);

  function handleClienteChange(value: string | number | undefined) {
    const cid = typeof value === 'string' ? Number(value) : value;
    setClienteId(cid);
    if (destinatarioId != null) {
      const dest = destinatarios.find((d) => d.id === destinatarioId);
      if (!dest || (cid != null && dest.clienteUsuarioId !== cid)) {
        setDestinatarioId(undefined);
      }
    }
  }

  function handleDestinatarioChange(value: string | number | undefined) {
    const did = typeof value === 'string' ? Number(value) : value;
    setDestinatarioId(did);
    if (did != null) {
      const dest = destinatarios.find((d) => d.id === did);
      if (dest && dest.clienteUsuarioId != null) {
        setClienteId(dest.clienteUsuarioId);
      }
    }
  }

  async function handleSave() {
    if (destinatarioId == null) {
      toast.error('Selecciona un destinatario');
      return;
    }
    try {
      await actualizar.mutateAsync({
        id: guia.id,
        body: { destinatarioFinalId: destinatarioId },
      });
      toast.success('Guía actualizada');
      onClose();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(res?.data?.message ?? 'No se pudo actualizar la guía');
    }
  }

  const sinClientes = !loadingDest && clientes.length === 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !actualizar.isPending && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar cliente y destinatario</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-border bg-muted/30 p-2 text-xs">
            <p className="text-muted-foreground">Guía master</p>
            <p className="break-all font-mono font-medium">{guia.trackingBase}</p>
          </div>

          <div>
            <Label
              htmlFor="dest-cliente"
              className="mb-1 flex items-center gap-1 text-xs"
            >
              <Building2 className="h-3.5 w-3.5" />
              Cliente
            </Label>
            <SearchableCombobox<ClienteOption>
              id="dest-cliente"
              value={clienteId}
              onChange={handleClienteChange}
              options={clientes}
              getKey={(c) => c.id}
              getLabel={(c) => c.nombre}
              placeholder={
                loadingDest
                  ? 'Cargando...'
                  : sinClientes
                    ? 'Sin clientes disponibles'
                    : 'Todos los clientes'
              }
              searchPlaceholder="Buscar cliente..."
              emptyMessage="Sin clientes"
              disabled={loadingDest || sinClientes}
              renderOption={(c) => (
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{c.nombre}</span>
                </div>
              )}
              renderSelected={(c) => (
                <span className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.nombre}</span>
                </span>
              )}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Filtra los destinatarios. Limpia para ver todos.
            </p>
          </div>

          <div>
            <Label
              htmlFor="dest-destinatario"
              className="mb-1 flex items-center gap-1 text-xs"
            >
              <UserRound className="h-3.5 w-3.5" />
              Destinatario *
            </Label>
            <SearchableCombobox<DestinatarioFinal>
              id="dest-destinatario"
              value={destinatarioId}
              onChange={handleDestinatarioChange}
              options={destinatariosFiltrados}
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
                  : 'Selecciona un destinatario'
              }
              searchPlaceholder="Buscar por nombre, código, cantón..."
              emptyMessage="Sin coincidencias"
              disabled={loadingDest || destinatariosFiltrados.length === 0}
              clearable={false}
              renderOption={(d) => (
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{d.nombre}</span>
                    {d.codigo && (
                      <span className="text-xs text-muted-foreground">
                        · {d.codigo}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[d.canton, d.provincia].filter(Boolean).join(', ') ||
                      d.clienteUsuarioNombre ||
                      ''}
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
            <p className="mt-1 text-[11px] text-muted-foreground">
              El cliente se asigna automáticamente al elegir el destinatario.
            </p>
          </div>
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
          <Button type="button" onClick={handleSave} disabled={actualizar.isPending}>
            {actualizar.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
