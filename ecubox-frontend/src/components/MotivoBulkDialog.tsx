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
import { notify } from '@/lib/notify';
import { guiaCancelarSchema, MAX_MOTIVO } from '@/lib/schemas';

interface MotivoBulkDialogProps {
  accion: 'CANCELAR' | 'REABRIR' | 'MARCAR_REVISION';
  count: number;
  motivo: string;
  loading: boolean;
  onMotivoChange: (v: string) => void;
  onClose: () => void;
  onConfirm: (motivo: string) => Promise<void>;
}

const MOTIVO_BULK_UI = {
  CANCELAR: {
    title: 'Cancelar',
    nota: 'Solo se cancelarán las guías sin piezas despachadas y no terminales.',
    placeholder: 'Ej: cliente solicitó anulación / error de registro',
    submitVariant: 'destructive' as const,
    pendingLabel: 'Cancelando...',
  },
  REABRIR: {
    title: 'Reabrir',
    nota: 'Solo se reabrirán guías en estado terminal (cerradas o canceladas); su estado se recalculará.',
    placeholder: 'Ej: reactivación por nueva pieza / reapertura solicitada',
    submitVariant: 'default' as const,
    pendingLabel: 'Reabriendo...',
  },
  MARCAR_REVISION: {
    title: 'Enviar a revisión',
    nota: 'Solo se enviarán a revisión guías activas (no terminales) que no estén ya en revisión. El recálculo automático queda pausado.',
    placeholder: 'Ej: datos inconsistentes / total de paquetes incorrecto',
    submitVariant: 'default' as const,
    pendingLabel: 'Enviando...',
  },
};

/**
 * Diálogo de motivo obligatorio para acciones masivas que lo requieren
 * (cancelar/reabrir guías master). Extraído de GuiasMasterPage para poder
 * reutilizarse en otros flujos masivos.
 */
export function MotivoBulkDialog({
  accion,
  count,
  motivo,
  loading,
  onMotivoChange,
  onClose,
  onConfirm,
}: MotivoBulkDialogProps) {
  const [motivoError, setMotivoError] = useState<string | undefined>();
  const ui = MOTIVO_BULK_UI[accion];
  const plural = count === 1 ? '' : 's';

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    const parsed = guiaCancelarSchema.safeParse({ motivo });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Debes indicar un motivo';
      setMotivoError(msg);
      notify.warning(msg);
      return;
    }
    setMotivoError(undefined);
    await onConfirm(parsed.data.motivo);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{ui.title} {count} guía{plural} master</DialogTitle>
          <p className="text-sm text-muted-foreground">{ui.nota}</p>
        </DialogHeader>
        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <Label htmlFor="motivo-bulk" className="mb-1 block">
              Motivo (obligatorio)
            </Label>
            <Textarea
              id="motivo-bulk"
              rows={3}
              maxLength={MAX_MOTIVO}
              value={motivo}
              onChange={(e) => {
                onMotivoChange(e.target.value);
                setMotivoError(undefined);
              }}
              placeholder={ui.placeholder}
              aria-invalid={!!motivoError}
            />
            {motivoError && <p className="mt-1 text-xs text-destructive">{motivoError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Volver
            </Button>
            <Button type="submit" variant={ui.submitVariant} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? ui.pendingLabel : `${ui.title} ${count} guía${plural}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
