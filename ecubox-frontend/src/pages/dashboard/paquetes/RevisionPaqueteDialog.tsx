import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  useHistorialRevisionPaquete,
  useIniciarRevisionPaquete,
  useResolverRevisionPaquete,
} from '@/hooks/usePaquetes';
import { getApiErrorMessage } from '@/lib/api/error-message';
import type { MotivoRevisionPaquete, Paquete } from '@/types/paquete';

export type RevisionDialogMode = 'iniciar' | 'resolver' | 'historial';

const MOTIVOS: { value: MotivoRevisionPaquete; label: string }[] = [
  { value: 'DATOS_INCONSISTENTES', label: 'Datos inconsistentes' },
  { value: 'PESO_O_DIMENSIONES', label: 'Peso o dimensiones' },
  { value: 'CONSIGNATARIO_INCORRECTO', label: 'Consignatario incorrecto' },
  { value: 'GUIA_INCORRECTA', label: 'Guía incorrecta' },
  { value: 'CONTENIDO_RESTRINGIDO', label: 'Contenido restringido' },
  { value: 'OTRO', label: 'Otro' },
];

export function motivoRevisionLabel(motivo?: MotivoRevisionPaquete) {
  return MOTIVOS.find((item) => item.value === motivo)?.label ?? motivo ?? '—';
}

function fecha(value?: string) {
  return value
    ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '—';
}

export function RevisionPaqueteDialog({
  paquete,
  mode,
  onClose,
}: {
  paquete: Paquete;
  mode: RevisionDialogMode;
  onClose: () => void;
}) {
  const [motivo, setMotivo] = useState<MotivoRevisionPaquete>('DATOS_INCONSISTENTES');
  const [observacion, setObservacion] = useState('');
  const iniciar = useIniciarRevisionPaquete();
  const resolver = useResolverRevisionPaquete();
  const historial = useHistorialRevisionPaquete(paquete.id, mode === 'historial');
  const pending = iniciar.isPending || resolver.isPending;

  const submit = async () => {
    try {
      if (mode === 'iniciar') {
        if (motivo === 'OTRO' && !observacion.trim()) {
          toast.error('La observación es obligatoria para el motivo Otro');
          return;
        }
        await iniciar.mutateAsync({
          paqueteId: paquete.id,
          body: { motivo, observacion: observacion.trim() || undefined },
        });
        toast.success('Revisión iniciada');
      } else {
        await resolver.mutateAsync({
          paqueteId: paquete.id,
          body: { observacion: observacion.trim() || undefined },
        });
        toast.success('Revisión resuelta; el paquete vuelve a estar operativo');
      }
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error) ?? 'No se pudo actualizar la revisión');
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'iniciar'
              ? 'Iniciar revisión'
              : mode === 'resolver'
                ? 'Resolver revisión'
                : 'Historial de revisión'}
          </DialogTitle>
          <DialogDescription>
            Paquete {paquete.numeroGuia}. La revisión no modifica su estado logístico.
          </DialogDescription>
        </DialogHeader>

        {mode === 'historial' ? (
          <div className="space-y-3">
            {historial.isLoading && <p className="text-sm text-muted-foreground">Cargando historial...</p>}
            {historial.error && <p className="text-sm text-destructive">No se pudo cargar el historial.</p>}
            {historial.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">Este paquete no tiene revisiones registradas.</p>
            )}
            {historial.data?.map((revision) => (
              <div key={revision.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <strong>{motivoRevisionLabel(revision.motivo)}</strong>
                  <span className="text-xs text-muted-foreground">
                    {revision.estado === 'EN_REVISION' ? 'En revisión' : 'Resuelta'}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  Iniciada {fecha(revision.fechaInicio)} por {revision.iniciadoPorUsername ?? 'usuario'}
                </p>
                {revision.observacionInicio && <p className="mt-2">{revision.observacionInicio}</p>}
                {revision.fechaResolucion && (
                  <p className="mt-2 text-muted-foreground">
                    Resuelta {fecha(revision.fechaResolucion)} por {revision.resueltoPorUsername ?? 'usuario'}
                  </p>
                )}
                {revision.observacionResolucion && <p className="mt-1">{revision.observacionResolucion}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {mode === 'iniciar' && (
              <label className="grid gap-1.5 text-sm font-medium">
                Motivo
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value as MotivoRevisionPaquete)}
                >
                  {MOTIVOS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="grid gap-1.5 text-sm font-medium">
              Observación {mode === 'iniciar' && motivo !== 'OTRO' ? '(opcional)' : ''}
              <Textarea
                value={observacion}
                onChange={(event) => setObservacion(event.target.value)}
                placeholder={mode === 'resolver' ? 'Detalle de la resolución (opcional)' : 'Describe el hallazgo'}
              />
            </label>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          {mode !== 'historial' && (
            <Button onClick={submit} disabled={pending}>
              {pending ? 'Guardando...' : mode === 'iniciar' ? 'Iniciar revisión' : 'Resolver revisión'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
