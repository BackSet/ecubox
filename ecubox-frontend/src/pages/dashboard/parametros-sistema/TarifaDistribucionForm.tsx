import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { AlertCircle, DollarSign, Loader2, RotateCcw, Save, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FormSkeleton } from '@/components/skeletons/FormSkeleton';
import {
  useActualizarConfigTarifaDistribucion,
  useConfigTarifaDistribucion,
} from '@/hooks/useConfigTarifaDistribucion';
import { onKeyDownNumericDecimal, sanitizeNumericDecimal } from '@/lib/inputFilters';
import { clampNonNegative, roundToDecimals } from '@/lib/utils/decimal';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api/error-message';

const formSchema = z.object({
  kgIncluidos: z.number().min(0, 'Debe ser mayor o igual a 0'),
  precioFijo: z.number().min(0, 'Debe ser mayor o igual a 0'),
  precioKgAdicional: z.number().min(0, 'Debe ser mayor o igual a 0'),
});

type FormValues = z.infer<typeof formSchema>;

function normalizeDecimalInput(value: string): string {
  const normalized = sanitizeNumericDecimal(value);
  if (!normalized.includes('.')) return normalized;
  const [integerPart, decimalPart = ''] = normalized.split('.');
  const decimalLimited = decimalPart.slice(0, 4);
  if (decimalLimited.length > 0) return `${integerPart}.${decimalLimited}`;
  return normalized.endsWith('.') ? `${integerPart}.` : integerPart;
}

interface NumericFieldProps {
  id: string;
  label: string;
  prefix?: 'money' | 'weight';
  suffix?: string;
  value: number;
  onChange: (n: number) => void;
  error?: string;
}

function NumericField({ id, label, prefix, suffix, value, onChange, error }: NumericFieldProps) {
  const stringValue = Number.isFinite(value) ? String(value) : '';
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5 text-xs text-foreground">
        <span>{label}</span>
        <span className="text-[var(--color-destructive)]">*</span>
      </Label>
      <div className="relative">
        {prefix === 'money' && (
          <span className="pointer-events-none absolute top-1/2 left-3 inline-flex -translate-y-1/2 items-center text-sm font-semibold text-muted-foreground">
            <DollarSign className="h-4 w-4" />
          </span>
        )}
        {prefix === 'weight' && (
          <span className="pointer-events-none absolute top-1/2 left-3 inline-flex -translate-y-1/2 items-center text-sm font-semibold text-muted-foreground">
            <Scale className="h-4 w-4" />
          </span>
        )}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={stringValue}
          onKeyDown={(e) => onKeyDownNumericDecimal(e, stringValue)}
          onChange={(e) => {
            const s = normalizeDecimalInput(e.target.value);
            const n = s === '' || s === '.' ? 0 : Number(s);
            onChange(Number.isFinite(n) ? n : 0);
          }}
          aria-invalid={Boolean(error)}
          className={cn(
            'block h-12 w-full rounded-md border bg-[var(--color-background)] pr-16 pl-9 text-right font-mono text-lg font-semibold text-foreground transition-colors',
            'border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]',
            error && 'border-[var(--color-destructive)] focus:ring-[var(--color-destructive)]/30',
          )}
        />
        {suffix && (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-[var(--color-destructive)]">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

export function TarifaDistribucionForm() {
  const { data: tarifa, isLoading, error } = useConfigTarifaDistribucion();
  const updateMutation = useActualizarConfigTarifaDistribucion();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { kgIncluidos: 0, precioFijo: 0, precioKgAdicional: 0 },
  });

  useEffect(() => {
    if (tarifa != null) {
      form.reset({
        kgIncluidos: tarifa.kgIncluidos ?? 0,
        precioFijo: tarifa.precioFijo ?? 0,
        precioKgAdicional: tarifa.precioKgAdicional ?? 0,
      });
    }
  }, [tarifa, form]);

  async function onSubmit(values: FormValues) {
    try {
      await updateMutation.mutateAsync({
        kgIncluidos: roundToDecimals(clampNonNegative(values.kgIncluidos), 4),
        precioFijo: roundToDecimals(clampNonNegative(values.precioFijo), 4),
        precioKgAdicional: roundToDecimals(clampNonNegative(values.precioKgAdicional), 4),
      });
      toast.success('Tarifa de distribución guardada');
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'Error al guardar la tarifa');
    }
  }

  function handleReset() {
    if (tarifa == null) return;
    form.reset({
      kgIncluidos: tarifa.kgIncluidos ?? 0,
      precioFijo: tarifa.precioFijo ?? 0,
      precioKgAdicional: tarifa.precioKgAdicional ?? 0,
    });
  }

  if (isLoading) {
    return (
      <div aria-busy="true" aria-live="polite">
        <FormSkeleton fields={3} withFooter footerButtons={2} />
        <span className="sr-only">Cargando…</span>
      </div>
    );
  }
  if (error) {
    return <div className="ui-alert ui-alert-error">Error al cargar la tarifa de distribución.</div>;
  }

  const errors = form.formState.errors;
  const isDirty = form.formState.isDirty;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Controller
          control={form.control}
          name="kgIncluidos"
          render={({ field }) => (
            <NumericField
              id="kgIncluidos"
              label="Kg incluidos en precio fijo"
              prefix="weight"
              suffix="kg"
              value={field.value}
              onChange={field.onChange}
              error={errors.kgIncluidos?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="precioFijo"
          render={({ field }) => (
            <NumericField
              id="precioFijo"
              label="Precio fijo (incluye los kg base)"
              prefix="money"
              suffix="USD"
              value={field.value}
              onChange={field.onChange}
              error={errors.precioFijo?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="precioKgAdicional"
          render={({ field }) => (
            <NumericField
              id="precioKgAdicional"
              label="Precio por kg adicional"
              prefix="money"
              suffix="USD/kg"
              value={field.value}
              onChange={field.onChange}
              error={errors.precioKgAdicional?.message}
            />
          )}
        />
      </div>

      <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/50 px-3 py-2 text-xs text-muted-foreground">
        Estos valores se precargan en el formulario de cada línea de distribución del módulo de
        liquidación. Si un operario los modifica al guardar una línea, los nuevos valores se
        promueven automáticamente a estos parámetros del sistema para próximos cálculos.
      </p>

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
