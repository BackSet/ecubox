import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  useManifiesto,
  useCreateManifiesto,
  useUpdateManifiesto,
} from '@/hooks/useManifiestos';
import type { ManifiestoRequest } from '@/types/manifiesto';

const formSchema = z
  .object({
    fechaInicio: z.string().min(1, 'La fecha de inicio es obligatoria'),
    fechaFin: z.string().min(1, 'La fecha de fin es obligatoria'),
  })
  .refine((data) => new Date(data.fechaFin) >= new Date(data.fechaInicio), {
    message: 'La fecha de fin debe ser mayor o igual a la fecha de inicio',
    path: ['fechaFin'],
  });

type FormValues = z.infer<typeof formSchema>;

interface ManifiestoFormProps {
  id?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManifiestoForm({ id, onClose, onSuccess }: ManifiestoFormProps) {
  const isEdit = id != null;
  const { data: manifiesto } = useManifiesto(id);
  const createMutation = useCreateManifiesto();
  const updateMutation = useUpdateManifiesto();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fechaInicio: '',
      fechaFin: '',
    },
  });

  useEffect(() => {
    if (isEdit && manifiesto) {
      form.reset({
        fechaInicio: manifiesto.fechaInicio,
        fechaFin: manifiesto.fechaFin,
      });
    }
  }, [isEdit, manifiesto, form]);

  async function onSubmit(values: FormValues) {
    const body: ManifiestoRequest = {
      fechaInicio: values.fechaInicio,
      fechaFin: values.fechaFin,
      filtroTipo: 'POR_PERIODO',
    };
    try {
      if (isEdit && id != null) {
        await updateMutation.mutateAsync({ id, body });
      } else {
        await createMutation.mutateAsync(body);
      }
      onSuccess();
    } catch {
      // Error manejado por toast
    }
  }

  const loading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar manifiesto' : 'Nuevo manifiesto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {isEdit && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                Código
              </label>
              <input
                readOnly
                value={manifiesto?.codigo ?? ''}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/50 px-3 py-2 text-sm text-[var(--color-muted-foreground)]"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                Fecha inicio *
              </label>
              <input
                type="date"
                {...form.register('fechaInicio')}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              />
              {form.formState.errors.fechaInicio && (
                <p className="mt-1 text-sm text-[var(--color-destructive)]">
                  {form.formState.errors.fechaInicio.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                Fecha fin *
              </label>
              <input
                type="date"
                {...form.register('fechaFin')}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              />
              {form.formState.errors.fechaFin && (
                <p className="mt-1 text-sm text-[var(--color-destructive)]">
                  {form.formState.errors.fechaFin.message}
                </p>
              )}
            </div>
          </div>
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
            El manifiesto se crea únicamente por período y autoasigna los despachos de ese rango al guardar. Los filtros por distribuidor/agencia se aplican al momento de descargar el PDF.
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
