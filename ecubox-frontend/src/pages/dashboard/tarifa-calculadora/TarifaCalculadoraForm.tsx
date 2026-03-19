import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTarifaCalculadora, useUpdateTarifaCalculadora } from '@/hooks/useTarifaCalculadora';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/LoadingState';
import { toast } from 'sonner';
import { onKeyDownNumericDecimal, sanitizeNumericDecimal } from '@/lib/inputFilters';

const formSchema = z.object({
  tarifaPorLibra: z
    .union([z.number(), z.nan()])
    .transform((n) => (Number.isNaN(n) ? 0 : n))
    .pipe(z.number().min(0, 'La tarifa debe ser mayor o igual a 0')),
});

type FormValues = z.infer<typeof formSchema>;

export function TarifaCalculadoraForm() {
  const { data: tarifa, isLoading, error } = useTarifaCalculadora();
  const updateMutation = useUpdateTarifaCalculadora();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { tarifaPorLibra: 0 },
  });

  useEffect(() => {
    if (tarifa != null) {
      form.reset({
        tarifaPorLibra: tarifa.tarifaPorLibra ?? 0,
      });
    }
  }, [tarifa, form]);

  async function onSubmit(values: FormValues) {
    try {
      await updateMutation.mutateAsync({
        tarifaPorLibra: Number(values.tarifaPorLibra),
      });
      toast.success('Tarifa guardada correctamente');
    } catch {
      toast.error('Error al guardar la tarifa');
    }
  }

  if (isLoading) {
    return <LoadingState text="Cargando..." />;
  }
  if (error) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        Error al cargar la tarifa.
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-4">
      <div>
        <label
          htmlFor="tarifaPorLibra"
          className="block text-sm font-medium text-[var(--color-foreground)] mb-1"
        >
          Tarifa por libra (USD)
        </label>
        <input
          id="tarifaPorLibra"
          type="text"
          inputMode="decimal"
          {...form.register('tarifaPorLibra')}
          value={(() => {
            const v = form.watch('tarifaPorLibra');
            return v === undefined || v === null || Number.isNaN(v) ? '' : String(v);
          })()}
          onKeyDown={(e) => onKeyDownNumericDecimal(e, String(form.watch('tarifaPorLibra') ?? ''))}
          onChange={(e) => {
            const s = sanitizeNumericDecimal(e.target.value);
            form.setValue('tarifaPorLibra', s === '' ? NaN : Number(s), { shouldValidate: true });
          }}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
        />
        {form.formState.errors.tarifaPorLibra && (
          <p className="mt-1 text-sm text-[var(--color-destructive)]">
            {form.formState.errors.tarifaPorLibra.message}
          </p>
        )}
      </div>
      <Button type="submit" disabled={updateMutation.isPending}>
        {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
      </Button>
    </form>
  );
}
