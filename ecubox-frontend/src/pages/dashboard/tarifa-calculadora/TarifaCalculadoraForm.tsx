import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { AlertCircle, DollarSign, Loader2, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FormSkeleton } from '@/components/skeletons/FormSkeleton';
import {
  useTarifaCalculadora,
  useUpdateTarifaCalculadora,
} from '@/hooks/useTarifaCalculadora';
import { onKeyDownNumericDecimal, sanitizeNumericDecimal } from '@/lib/inputFilters';
import { clampNonNegative, roundToDecimals } from '@/lib/utils/decimal';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api/error-message';

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
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'Error al guardar la tarifa');
    }
  }

  function handleReset() {
    if (tarifa == null) return;
    form.reset({ tarifaPorLibra: tarifa.tarifaPorLibra ?? 0 });
    setTarifaInput(String(tarifa.tarifaPorLibra ?? 0));
  }

  if (isLoading) {
    return (
      <div aria-busy="true" aria-live="polite">
        <FormSkeleton fields={1} withFooter footerButtons={2} />
        <span className="sr-only">Cargando...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="ui-alert ui-alert-error">
        Error al cargar la tarifa.
      </div>
    );
  }

  const currentValue = form.watch('tarifaPorLibra') ?? 0;
  const originalValue = tarifa?.tarifaPorLibra ?? 0;
  const isDirty = Number(currentValue) !== Number(originalValue);
  const error_ = form.formState.errors.tarifaPorLibra;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1.5">
        <Label
          htmlFor="tarifaPorLibra"
          className="flex items-center gap-1.5 text-xs text-foreground"
        >
          <span>Tarifa por libra (USD)</span>
          <span className="text-[var(--color-destructive)]">*</span>
        </Label>
        <Controller
          control={form.control}
          name="tarifaPorLibra"
          render={({ field }) => (
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 inline-flex -translate-y-1/2 items-center gap-1 text-sm font-semibold text-muted-foreground">
                <DollarSign className="h-4 w-4" />
              </span>
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
                aria-invalid={Boolean(error_)}
                className={cn(
                  'block h-12 w-full rounded-md border bg-[var(--color-background)] pr-16 pl-9 text-right font-mono text-lg font-semibold text-foreground transition-colors',
                  'border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]',
                  error_ && 'border-[var(--color-destructive)] focus:ring-[var(--color-destructive)]/30',
                )}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                / lb
              </span>
            </div>
          )}
        />
        {error_ ? (
          <p className="flex items-center gap-1 text-xs text-[var(--color-destructive)]">
            <AlertCircle className="h-3 w-3" />
            {error_.message}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Puedes usar punto o coma. Máximo 4 decimales.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={updateMutation.isPending || !isDirty}>
          {updateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando…
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar tarifa
            </>
          )}
        </Button>
        {isDirty && (
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={updateMutation.isPending}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Descartar
          </Button>
        )}
      </div>
    </form>
  );
}
