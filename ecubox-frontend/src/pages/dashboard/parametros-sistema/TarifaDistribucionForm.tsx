import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
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
import { tarifaDistribucionFormSchema } from '@/lib/schemas/maestros';

type FormValues = z.infer<typeof tarifaDistribucionFormSchema>;

function normalizeDecimalInput(value: string, maxDecimals = 4): string {
  const normalized = sanitizeNumericDecimal(value);
  if (!normalized.includes('.')) return normalized;
  const [integerPart, decimalPart = ''] = normalized.split('.');
  const decimalLimited = decimalPart.slice(0, maxDecimals);
  if (decimalLimited.length > 0) return `${integerPart}.${decimalLimited}`;
  return normalized.endsWith('.') ? `${integerPart}.` : integerPart;
}

function suffixPadding(suffix: string): string {
  if (suffix.length >= 6) return 'pr-[4.25rem]';
  if (suffix.length >= 4) return 'pr-14';
  return 'pr-11';
}

interface NumericFieldProps {
  id: string;
  label: string;
  prefix?: 'money' | 'weight';
  suffix: string;
  value: number;
  onChange: (n: number) => void;
  error?: string;
}

function NumericField({ id, label, prefix, suffix, value, onChange, error }: NumericFieldProps) {
  const [str, setStr] = useState(Number.isFinite(value) ? String(value) : '0');

  useEffect(() => {
    setStr(Number.isFinite(value) ? String(value) : '0');
  }, [value]);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
        <span className="text-[var(--color-destructive)]"> *</span>
      </Label>
      <div className="relative">
        {prefix === 'money' && (
          <DollarSign className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        {prefix === 'weight' && (
          <Scale className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={str}
          onKeyDown={(e) => onKeyDownNumericDecimal(e, str)}
          onChange={(e) => {
            const s = normalizeDecimalInput(e.target.value);
            setStr(s);
            const n = s === '' || s === '.' ? 0 : Number(s);
            onChange(Number.isFinite(n) ? n : 0);
          }}
          aria-invalid={Boolean(error)}
          className={cn(
            'block h-10 w-full min-w-0 rounded-md border bg-[var(--color-background)] pl-9 text-right font-mono text-sm tabular-nums text-foreground',
            'border-[var(--color-border)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]',
            suffixPadding(suffix),
            error && 'border-[var(--color-destructive)] focus:ring-[var(--color-destructive)]/30',
          )}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] font-medium text-muted-foreground">
          {suffix}
        </span>
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-[var(--color-destructive)]">
          <AlertCircle className="h-3 w-3 shrink-0" />
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
    resolver: zodResolver(tarifaDistribucionFormSchema),
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
      <div className="grid max-w-sm grid-cols-1 gap-4">
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
              label="Precio fijo (incluye kg base)"
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
