import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCrearLiquidacion } from '@/hooks/useLiquidacion';
import { getApiErrorMessage } from '@/lib/api/error-message';
import type { Liquidacion } from '@/types/liquidacion';

const schema = z
  .object({
    fechaDocumento: z.string().min(1, 'Selecciona la fecha del documento'),
    periodoDesde: z.string().optional().or(z.literal('')),
    periodoHasta: z.string().optional().or(z.literal('')),
    notas: z.string().max(2000, 'Máximo 2000 caracteres').optional().or(z.literal('')),
  })
  .refine(
    (v) => {
      if (!v.periodoDesde || !v.periodoHasta) return true;
      return v.periodoDesde <= v.periodoHasta;
    },
    {
      message: 'El período "desde" no puede ser posterior a "hasta"',
      path: ['periodoHasta'],
    },
  );

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (liq: Liquidacion) => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NuevaLiquidacionDialog({ open, onOpenChange, onCreated }: Props) {
  const crearMutation = useCrearLiquidacion();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fechaDocumento: todayISO(),
      periodoDesde: '',
      periodoHasta: '',
      notas: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        fechaDocumento: todayISO(),
        periodoDesde: '',
        periodoHasta: '',
        notas: '',
      });
    }
  }, [open, form]);

  async function onSubmit(values: FormValues) {
    try {
      const liq = await crearMutation.mutateAsync({
        fechaDocumento: values.fechaDocumento,
        periodoDesde: values.periodoDesde || undefined,
        periodoHasta: values.periodoHasta || undefined,
        notas: values.notas?.trim() ? values.notas.trim() : undefined,
      });
      toast.success(`Liquidación ${liq.codigo} creada`);
      onOpenChange(false);
      onCreated?.(liq);
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'Error al crear la liquidación');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva liquidación</DialogTitle>
          <DialogDescription>
            Crea un documento de liquidación periódico vacío. Después podrás agregar
            consolidados (Sección A) y despachos (Sección B).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fechaDocumento" className="text-xs">
              Fecha del documento <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={form.control}
              name="fechaDocumento"
              render={({ field, fieldState }) => (
                <>
                  <Input
                    id="fechaDocumento"
                    type="date"
                    value={field.value}
                    onChange={field.onChange}
                    aria-invalid={!!fieldState.error}
                  />
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="periodoDesde" className="text-xs">
                Período desde
              </Label>
              <Controller
                control={form.control}
                name="periodoDesde"
                render={({ field }) => (
                  <Input
                    id="periodoDesde"
                    type="date"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="periodoHasta" className="text-xs">
                Período hasta
              </Label>
              <Controller
                control={form.control}
                name="periodoHasta"
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      id="periodoHasta"
                      type="date"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      aria-invalid={!!fieldState.error}
                    />
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notas" className="text-xs">
              Notas
            </Label>
            <Controller
              control={form.control}
              name="notas"
              render={({ field }) => (
                <Textarea
                  id="notas"
                  placeholder="Observaciones internas (opcional)"
                  rows={3}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={crearMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={crearMutation.isPending}>
              {crearMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando…
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" /> Crear liquidación
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
