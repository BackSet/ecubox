import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MAX_MOTIVO } from '@/lib/schemas';
import { notify } from '@/lib/notify';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { useMarcarGuiaMasterEnRevision } from '@/hooks/useGuiasMaster';
import type { GuiaMaster } from '@/types/guia-master';
import {
  MOTIVOS_REVISION,
  serializarMotivoRevision,
  type MotivoRevisionCodigo,
} from './revisionMotivos';

interface EnviarARevisionDialogProps {
  guia: GuiaMaster;
  onClose: () => void;
  /** Se invoca tras marcar en revisión correctamente (p. ej. para cerrar el diálogo de aprobación que la abrió). */
  onDone?: () => void;
}

/**
 * Diálogo para enviar una guía master a revisión con un motivo estructurado
 * obligatorio y una observación opcional (obligatoria cuando el motivo es
 * "Otro"). Serializa motivo + observación en el campo de texto libre del
 * backend (sin migración).
 */
export function EnviarARevisionDialog({ guia, onClose, onDone }: EnviarARevisionDialogProps) {
  const [codigo, setCodigo] = useState<MotivoRevisionCodigo | ''>('');
  const [observacion, setObservacion] = useState('');
  const [error, setError] = useState<string | undefined>();
  const marcar = useMarcarGuiaMasterEnRevision();

  const opcion = MOTIVOS_REVISION.find((m) => m.codigo === codigo);
  const requiereObs = opcion?.requiereObservacion ?? false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!codigo) {
      setError('Selecciona un motivo de revisión.');
      return;
    }
    if (requiereObs && observacion.trim() === '') {
      setError('El motivo "Otro" requiere una observación.');
      return;
    }
    setError(undefined);
    const motivo = serializarMotivoRevision(codigo, observacion);
    try {
      await marcar.mutateAsync({ id: guia.id, body: { motivo } });
      notify.success(
        'Guía master en revisión',
        `${guia.trackingBase} · El recálculo automático queda pausado hasta salir de revisión.`,
      );
      onDone?.();
      onClose();
    } catch (err: unknown) {
      notify.error('No se pudo enviar a revisión', getApiErrorMessage(err) ?? guia.trackingBase);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !marcar.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar a revisión</DialogTitle>
          <p className="text-sm text-muted-foreground">
            La guía <span className="font-mono">{guia.trackingBase}</span> quedará pausada mientras se
            valida su información. El recálculo automático se detiene hasta salir de revisión.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="motivo-revision" className="mb-1 block">
              Motivo (obligatorio)
            </Label>
            <Select value={codigo} onValueChange={(v) => { setCodigo(v as MotivoRevisionCodigo); setError(undefined); }}>
              <SelectTrigger id="motivo-revision" className="w-full" aria-invalid={!!error && !codigo}>
                <SelectValue placeholder="Selecciona un motivo..." />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_REVISION.map((m) => (
                  <SelectItem key={m.codigo} value={m.codigo}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="observacion-revision" className="mb-1 block">
              Observación {requiereObs ? '(obligatoria)' : '(opcional)'}
            </Label>
            <Textarea
              id="observacion-revision"
              rows={3}
              maxLength={MAX_MOTIVO}
              value={observacion}
              onChange={(e) => { setObservacion(e.target.value); setError(undefined); }}
              placeholder="Detalle de la inconsistencia detectada..."
              aria-invalid={!!error && requiereObs && observacion.trim() === ''}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={marcar.isPending}>
              Volver
            </Button>
            <Button type="submit" disabled={marcar.isPending}>
              {marcar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {marcar.isPending ? 'Enviando...' : 'Enviar a revisión'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
