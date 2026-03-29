import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTarifaCalculadora, useUpdateTarifaCalculadora } from '@/hooks/useTarifaCalculadora';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/LoadingState';
import { toast } from 'sonner';
import { onKeyDownNumericDecimal, sanitizeNumericDecimal } from '@/lib/inputFilters';
import { clampNonNegative, roundToDecimals } from '@/lib/utils/decimal';

const formSchema = z.object({
  tarifaPorLibra: z
    .union([z.number(), z.nan()])
    .transform((n) => (Number.isNaN(n) ? 0 : n))
    .pipe(z.number().min(0, 'La tarifa debe ser mayor o igual a 0')),
});

type FormValues = z.infer<typeof formSchema>;

function normalizeTarifaInput(value: string): string {
  const normalized = sanitizeNumericDecimal(value);
  if (!normalized.includes('.')) return normalized;
  const hasTrailingDecimal = normalized.endsWith('.');
  const [integerPart, decimalPart = ''] = normalized.split('.');
  const decimalLimited = decimalPart.slice(0, 4);
  if (decimalLimited.length > 0) return `${integerPart}.${decimalLimited}`;
  return hasTrailingDecimal ? `${integerPart}.` : integerPart;
}

export function TarifaCalculadoraForm() {
  const { data: tarifa, isLoading, error } = useTarifaCalculadora();
  const updateMutation = useUpdateTarifaCalculadora();
  const [tarifaInput, setTarifaInput] = useState('0');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { tarifaPorLibra: 0 },
  });

  useEffect(() => {
    if (tarifa != null) {
      form.reset({
        tarifaPorLibra: tarifa.tarifaPorLibra ?? 0,
      });
      setTarifaInput(String(tarifa.tarifaPorLibra ?? 0));
    }
  }, [tarifa, form]);

  async function onSubmit(values: FormValues) {
    try {
      const tarifaNormalizada = roundToDecimals(clampNonNegative(values.tarifaPorLibra), 4);
      await updateMutation.mutateAsync({
        tarifaPorLibra: tarifaNormalizada,
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
        <Controller
          control={form.control}
          name="tarifaPorLibra"
          render={({ field }) => (
            <input
              id="tarifaPorLibra"
              type="text"
              inputMode="decimal"
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={tarifaInput}
              onKeyDown={(e) => onKeyDownNumericDecimal(e, tarifaInput)}
              onChange={(e) => {
                const s = normalizeTarifaInput(e.target.value);
                setTarifaInput(s);
                const n = s === '' || s === '.' ? NaN : Number(s);
                field.onChange(n);
              }}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            />
          )}
        />
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          Puedes usar punto o coma. Máximo 4 decimales.
        </p>
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
