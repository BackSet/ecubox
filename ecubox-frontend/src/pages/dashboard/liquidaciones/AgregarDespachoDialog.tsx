import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Check,
  DollarSign,
  Loader2,
  Save,
  Scale,
  Search,
  Truck,
  X,
} from 'lucide-react';
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
import { onKeyDownNumericDecimal, sanitizeNumericDecimal } from '@/lib/inputFilters';
import { roundToDecimals, clampNonNegative } from '@/lib/utils/decimal';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useConfigTarifaDistribucion } from '@/hooks/useConfigTarifaDistribucion';
import {
  useActualizarDespachoLinea,
  useAgregarDespachoLinea,
  useDespachosDisponibles,
} from '@/hooks/useLiquidacion';
import type {
  ConfigTarifaDistribucion,
  DespachoDisponible,
  LiquidacionDespachoLinea,
} from '@/types/liquidacion';
import { formatMoney, formatNumber } from './moneyFormat';

const schema = z.object({
  despachoId: z.number().int().positive('Selecciona un despacho'),
  pesoKg: z.number().min(0, 'Debe ser ≥ 0'),
  kgIncluidos: z.number().min(0, 'Debe ser ≥ 0'),
  precioFijo: z.number().min(0, 'Debe ser ≥ 0'),
  precioKgAdicional: z.number().min(0, 'Debe ser ≥ 0'),
  notas: z.string().max(2000).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

function normalizeDecimal(value: string, maxDecimals = 4): string {
  const s = sanitizeNumericDecimal(value);
  if (!s.includes('.')) return s;
  const [int, dec = ''] = s.split('.');
  const limited = dec.slice(0, maxDecimals);
  return limited.length > 0 ? `${int}.${limited}` : `${int}.`;
}

function calcularCosto(
  values: Pick<FormValues, 'pesoKg' | 'kgIncluidos' | 'precioFijo' | 'precioKgAdicional'>,
): number {
  const peso = clampNonNegative(values.pesoKg ?? 0);
  const kgInc = clampNonNegative(values.kgIncluidos ?? 0);
  const fijo = clampNonNegative(values.precioFijo ?? 0);
  const adic = clampNonNegative(values.precioKgAdicional ?? 0);
  if (peso <= kgInc) return roundToDecimals(fijo, 2);
  return roundToDecimals(fijo + (peso - kgInc) * adic, 2);
}

interface NumInputProps {
  id: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: 'money' | 'weight';
  suffix?: string;
  disabled?: boolean;
  maxDecimals?: number;
  ariaInvalid?: boolean;
}

function NumInput({
  id,
  value,
  onChange,
  prefix,
  suffix,
  disabled,
  maxDecimals = 2,
  ariaInvalid,
}: NumInputProps) {
  const [str, setStr] = useState(value != null ? String(value) : '0');
  useEffect(() => {
    setStr(value != null ? String(value) : '0');
  }, [value]);
  return (
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
        disabled={disabled}
        aria-invalid={ariaInvalid}
        onKeyDown={(e) => onKeyDownNumericDecimal(e, str)}
        onChange={(e) => {
          const s = normalizeDecimal(e.target.value, maxDecimals);
          setStr(s);
          const n = s === '' || s === '.' ? 0 : Number(s);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className={cn(
          'block h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] pr-12 pl-9 text-right font-mono text-sm font-semibold',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] disabled:opacity-60',
          ariaInvalid && 'border-destructive focus:ring-destructive/30',
        )}
      />
      {suffix && (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liquidacionId: number;
  /** Tarifa por defecto del documento (snapshot al crearlo). */
  tarifaDefault?: ConfigTarifaDistribucion;
  /** Línea a editar; si null → modo crear. */
  linea?: LiquidacionDespachoLinea | null;
}

export function AgregarDespachoDialog({
  open,
  onOpenChange,
  liquidacionId,
  tarifaDefault,
  linea,
}: Props) {
  const isEdit = linea != null;
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 250);
  const {
    data: disponibles,
    isLoading: loadingDisp,
  } = useDespachosDisponibles(debouncedSearch || undefined, 0, 30);
  const { data: tarifaActual } = useConfigTarifaDistribucion();
  const agregarMutation = useAgregarDespachoLinea(liquidacionId);
  const actualizarMutation = useActualizarDespachoLinea(liquidacionId);

  const tarifaBase: ConfigTarifaDistribucion | undefined = tarifaDefault ?? tarifaActual;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      despachoId: linea?.despachoId ?? 0,
      pesoKg: linea?.pesoKg ?? 0,
      kgIncluidos: linea?.kgIncluidos ?? tarifaBase?.kgIncluidos ?? 2,
      precioFijo: linea?.precioFijo ?? tarifaBase?.precioFijo ?? 2.75,
      precioKgAdicional: linea?.precioKgAdicional ?? tarifaBase?.precioKgAdicional ?? 0.5,
      notas: linea?.notas ?? '',
    },
  });

  useEffect(() => {
    if (!open) return;
    setSearchInput('');
    form.reset({
      despachoId: linea?.despachoId ?? 0,
      pesoKg: linea?.pesoKg ?? 0,
      kgIncluidos: linea?.kgIncluidos ?? tarifaBase?.kgIncluidos ?? 2,
      precioFijo: linea?.precioFijo ?? tarifaBase?.precioFijo ?? 2.75,
      precioKgAdicional:
        linea?.precioKgAdicional ?? tarifaBase?.precioKgAdicional ?? 0.5,
      notas: linea?.notas ?? '',
    });
  }, [open, linea, tarifaBase, form]);

  const watched = form.watch();
  const costoPreview = calcularCosto(watched);
  const opciones: DespachoDisponible[] = disponibles?.content ?? [];

  function aplicarPesoSugerido() {
    const sel = opciones.find((c) => c.id === watched.despachoId);
    if (sel?.pesoSugeridoKg != null) {
      form.setValue('pesoKg', roundToDecimals(sel.pesoSugeridoKg, 2), { shouldDirty: true });
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      const body = {
        despachoId: values.despachoId,
        pesoKg: roundToDecimals(clampNonNegative(values.pesoKg), 2),
        kgIncluidos: roundToDecimals(clampNonNegative(values.kgIncluidos), 4),
        precioFijo: roundToDecimals(clampNonNegative(values.precioFijo), 4),
        precioKgAdicional: roundToDecimals(
          clampNonNegative(values.precioKgAdicional),
          4,
        ),
        notas: values.notas?.trim() ? values.notas.trim() : undefined,
      };
      if (isEdit && linea) {
        await actualizarMutation.mutateAsync({ lineaId: linea.id, body });
        toast.success('Línea actualizada');
      } else {
        await agregarMutation.mutateAsync(body);
        toast.success('Despacho agregado');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'Error al guardar la línea');
    }
  }

  const isPending = agregarMutation.isPending || actualizarMutation.isPending;

  const tarifaCambiada =
    tarifaActual != null &&
    (Number(watched.kgIncluidos) !== Number(tarifaActual.kgIncluidos) ||
      Number(watched.precioFijo) !== Number(tarifaActual.precioFijo) ||
      Number(watched.precioKgAdicional) !== Number(tarifaActual.precioKgAdicional));

  const selectedId = watched.despachoId ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar despacho' : 'Agregar despacho'}</DialogTitle>
          <DialogDescription>
            Selecciona un despacho disponible y configura los kg base, precio fijo y costo
            por kg adicional. El sistema calculará el costo automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="busqDesp" className="text-xs">
                Despacho <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="busqDesp"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar por número de guía"
                  className="pl-9 pr-8"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <Controller
                control={form.control}
                name="despachoId"
                render={({ field, fieldState }) => (
                  <>
                    <div className="h-56 overflow-y-auto overflow-x-hidden rounded-md border border-[var(--color-border)]">
                      {loadingDisp && (
                        <div className="flex h-full items-center justify-center gap-2 p-3 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Buscando…
                        </div>
                      )}
                      {!loadingDisp && opciones.length === 0 && (
                        <div className="flex h-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
                          No hay despachos disponibles para liquidar.
                        </div>
                      )}
                      {!loadingDisp &&
                        opciones.map((d) => {
                          const sel = d.id === field.value;
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => {
                                field.onChange(d.id);
                                if (
                                  d.pesoSugeridoKg != null &&
                                  (form.getValues('pesoKg') ?? 0) === 0
                                ) {
                                  form.setValue(
                                    'pesoKg',
                                    roundToDecimals(d.pesoSugeridoKg, 2),
                                    { shouldDirty: true },
                                  );
                                }
                              }}
                              className={cn(
                                'flex w-full items-center justify-between gap-3 border-b border-[var(--color-border)] px-3 py-2 text-left text-sm last:border-b-0 transition-colors',
                                sel
                                  ? 'bg-[var(--color-primary)]/10'
                                  : 'hover:bg-[var(--color-muted)]/40',
                              )}
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <Truck
                                  className={cn(
                                    'h-4 w-4 shrink-0',
                                    sel
                                      ? 'text-[var(--color-primary)]'
                                      : 'text-muted-foreground',
                                  )}
                                />
                                <div className="min-w-0">
                                  <p className="truncate font-mono text-xs font-semibold text-foreground">
                                    {d.numeroGuia}
                                  </p>
                                  <p className="truncate text-[11px] text-muted-foreground">
                                    {d.courierEntregaNombre ?? '—'} ·{' '}
                                    {Number(d.pesoSugeridoLbs ?? 0).toFixed(2)} lbs (
                                    {Number(d.pesoSugeridoKg ?? 0).toFixed(2)} kg)
                                  </p>
                                </div>
                              </div>
                              {sel && (
                                <Check className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                              )}
                            </button>
                          );
                        })}
                    </div>
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>
          )}

          {isEdit && (
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-3 text-sm">
              <span className="text-xs text-muted-foreground">Despacho</span>
              <p className="mt-0.5 font-mono font-semibold">{linea?.despachoNumeroGuia}</p>
              {linea?.despachoCourierEntregaNombre && (
                <p className="text-[11px] text-muted-foreground">
                  {linea.despachoCourierEntregaNombre}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pesoKg" className="text-xs">
                Peso (kg)
              </Label>
              <Controller
                control={form.control}
                name="pesoKg"
                render={({ field }) => (
                  <NumInput
                    id="pesoKg"
                    value={field.value ?? 0}
                    onChange={field.onChange}
                    prefix="weight"
                    suffix="kg"
                  />
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={aplicarPesoSugerido}
                disabled={!selectedId}
              >
                Usar peso sugerido
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kgIncluidos" className="text-xs">
                Kg incluidos en precio fijo
              </Label>
              <Controller
                control={form.control}
                name="kgIncluidos"
                render={({ field }) => (
                  <NumInput
                    id="kgIncluidos"
                    value={field.value ?? 0}
                    onChange={field.onChange}
                    prefix="weight"
                    suffix="kg"
                    maxDecimals={4}
                  />
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="precioFijo" className="text-xs">
                Precio fijo
              </Label>
              <Controller
                control={form.control}
                name="precioFijo"
                render={({ field }) => (
                  <NumInput
                    id="precioFijo"
                    value={field.value ?? 0}
                    onChange={field.onChange}
                    prefix="money"
                    suffix="USD"
                    maxDecimals={4}
                  />
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="precioKgAdicional" className="text-xs">
                Precio por kg adicional
              </Label>
              <Controller
                control={form.control}
                name="precioKgAdicional"
                render={({ field }) => (
                  <NumInput
                    id="precioKgAdicional"
                    value={field.value ?? 0}
                    onChange={field.onChange}
                    prefix="money"
                    suffix="USD/kg"
                    maxDecimals={4}
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notas" className="text-xs">
              Notas (opcional)
            </Label>
            <Controller
              control={form.control}
              name="notas"
              render={({ field }) => (
                <Textarea
                  id="notas"
                  rows={2}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Observaciones para esta línea"
                />
              )}
            />
          </div>

          {tarifaCambiada && (
            <div className="rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-3 py-2 text-xs">
              Has modificado la tarifa por defecto. Al guardar, los nuevos valores se
              promoverán automáticamente a los parámetros del sistema y se usarán en próximas
              líneas.
            </div>
          )}

          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {formatNumber(watched.pesoKg, 2)} kg → {formatMoney(watched.precioFijo)} base +
                máx(0, peso − {formatNumber(watched.kgIncluidos, 2)}) ×{' '}
                {formatMoney(watched.precioKgAdicional)}
              </span>
            </div>
            <p className="mt-1 text-right font-mono text-xl font-bold text-[var(--color-primary)]">
              {formatMoney(costoPreview)}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || (!isEdit && selectedId === 0)}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />{' '}
                  {isEdit ? 'Guardar cambios' : 'Agregar despacho'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
