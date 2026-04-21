import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Boxes,
  Check,
  DollarSign,
  Loader2,
  Lock,
  Plus,
  Save,
  Search,
  Sparkles,
  Unlock,
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
import {
  useActualizarConsolidadoLinea,
  useAgregarConsolidadoLinea,
  useConsolidadosDisponibles,
} from '@/hooks/useLiquidacion';
import type {
  EnvioConsolidadoDisponible,
  LiquidacionConsolidadoLinea,
} from '@/types/liquidacion';
import { formatMoney } from './moneyFormat';

const schema = z
  .object({
    envioConsolidadoId: z.number().int().nonnegative().optional(),
    envioConsolidadoCodigo: z.string().max(100).optional().or(z.literal('')),
    costoProveedor: z.number().min(0, 'Debe ser ≥ 0'),
    ingresoCliente: z.number().min(0, 'Debe ser ≥ 0'),
    notas: z.string().max(2000).optional().or(z.literal('')),
  })
  .refine(
    (v) =>
      (v.envioConsolidadoId != null && v.envioConsolidadoId > 0) ||
      (v.envioConsolidadoCodigo?.trim().length ?? 0) > 0,
    {
      message: 'Selecciona un consolidado o ingresa un código nuevo',
      path: ['envioConsolidadoId'],
    },
  );

type FormValues = z.infer<typeof schema>;

function normalizeDecimal(value: string, maxDecimals = 2): string {
  const s = sanitizeNumericDecimal(value);
  if (!s.includes('.')) return s;
  const [int, dec = ''] = s.split('.');
  const limited = dec.slice(0, maxDecimals);
  return limited.length > 0 ? `${int}.${limited}` : `${int}.`;
}

interface MoneyInputProps {
  id: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  ariaInvalid?: boolean;
}

function MoneyInput({ id, value, onChange, disabled, ariaInvalid }: MoneyInputProps) {
  const [str, setStr] = useState(value != null ? String(value) : '0');
  useEffect(() => {
    setStr(value != null ? String(value) : '0');
  }, [value]);
  return (
    <div className="relative">
      <DollarSign className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={str}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        onKeyDown={(e) => onKeyDownNumericDecimal(e, str)}
        onChange={(e) => {
          const s = normalizeDecimal(e.target.value, 2);
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
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">
        USD
      </span>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liquidacionId: number;
  /** Línea a editar; si null → modo crear. */
  linea?: LiquidacionConsolidadoLinea | null;
}

export function AgregarConsolidadoDialog({
  open,
  onOpenChange,
  liquidacionId,
  linea,
}: Props) {
  const isEdit = linea != null;
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 250);
  const { data: disponibles, isLoading: loadingDisp } = useConsolidadosDisponibles(
    debouncedSearch || undefined,
    0,
    30,
  );
  const agregarMutation = useAgregarConsolidadoLinea(liquidacionId);
  const actualizarMutation = useActualizarConsolidadoLinea(liquidacionId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      envioConsolidadoId: linea?.envioConsolidadoId ?? 0,
      envioConsolidadoCodigo: '',
      costoProveedor: linea?.costoProveedor ?? 0,
      ingresoCliente: linea?.ingresoCliente ?? 0,
      notas: linea?.notas ?? '',
    },
  });

  useEffect(() => {
    if (!open) return;
    setSearchInput('');
    form.reset({
      envioConsolidadoId: linea?.envioConsolidadoId ?? 0,
      envioConsolidadoCodigo: '',
      costoProveedor: linea?.costoProveedor ?? 0,
      ingresoCliente: linea?.ingresoCliente ?? 0,
      notas: linea?.notas ?? '',
    });
  }, [open, linea, form]);

  const watched = form.watch();
  const margenPreview = roundToDecimals(
    (watched.ingresoCliente ?? 0) - (watched.costoProveedor ?? 0),
    2,
  );
  const opciones: EnvioConsolidadoDisponible[] = disponibles?.content ?? [];
  const selectedId = watched.envioConsolidadoId ?? 0;
  const nuevoCodigo = (watched.envioConsolidadoCodigo ?? '').trim();
  const searchTrim = searchInput.trim();

  // Detecta si el operario tipeo un codigo que NO aparece en la lista
  // (ni siquiera por coincidencia parcial exacta) → habilita "crear nuevo".
  const matchExacto = useMemo(
    () =>
      opciones.find(
        (o) => o.codigo.toLowerCase() === searchTrim.toLowerCase(),
      ) ?? null,
    [opciones, searchTrim],
  );
  const puedeCrearNuevo =
    !isEdit &&
    searchTrim.length > 0 &&
    !loadingDisp &&
    matchExacto == null;

  function elegirExistente(c: EnvioConsolidadoDisponible) {
    form.setValue('envioConsolidadoId', c.id, { shouldValidate: true });
    form.setValue('envioConsolidadoCodigo', '', { shouldValidate: true });
  }

  function elegirNuevo(codigo: string) {
    form.setValue('envioConsolidadoId', 0, { shouldValidate: true });
    form.setValue('envioConsolidadoCodigo', codigo, { shouldValidate: true });
  }

  async function onSubmit(values: FormValues) {
    try {
      const codigoLimpio = (values.envioConsolidadoCodigo ?? '').trim();
      const usaId = (values.envioConsolidadoId ?? 0) > 0;
      const body = {
        ...(usaId
          ? { envioConsolidadoId: values.envioConsolidadoId }
          : { envioConsolidadoCodigo: codigoLimpio }),
        costoProveedor: roundToDecimals(clampNonNegative(values.costoProveedor), 2),
        ingresoCliente: roundToDecimals(clampNonNegative(values.ingresoCliente), 2),
        notas: values.notas?.trim() ? values.notas.trim() : undefined,
      };
      if (isEdit && linea) {
        await actualizarMutation.mutateAsync({ lineaId: linea.id, body });
        toast.success('Línea actualizada');
      } else {
        await agregarMutation.mutateAsync(body);
        toast.success(
          usaId ? 'Consolidado agregado' : `Consolidado ${codigoLimpio} creado y agregado`,
        );
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'Error al guardar la línea');
    }
  }

  const isPending = agregarMutation.isPending || actualizarMutation.isPending;
  const submitDisabled =
    isPending ||
    (!isEdit && selectedId === 0 && nuevoCodigo === '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar consolidado' : 'Agregar consolidado'}
          </DialogTitle>
          <DialogDescription>
            Selecciona un envío consolidado disponible o ingresa una guía nueva. Si la
            guía no existe en el sistema se creará automáticamente sin paquetes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="busqueda" className="text-xs">
                Consolidado <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="busqueda"
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSearchInput(v);
                    // si el operario edita el texto, limpia la seleccion previa
                    if (selectedId !== 0) {
                      form.setValue('envioConsolidadoId', 0, { shouldValidate: true });
                    }
                    if (nuevoCodigo) {
                      form.setValue('envioConsolidadoCodigo', '', { shouldValidate: true });
                    }
                  }}
                  placeholder="Buscar por código (ECA...) o tipear una guía nueva"
                  className="pl-9 pr-8"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      form.setValue('envioConsolidadoId', 0, { shouldValidate: true });
                      form.setValue('envioConsolidadoCodigo', '', { shouldValidate: true });
                    }}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <Controller
                control={form.control}
                name="envioConsolidadoId"
                render={({ fieldState }) => (
                  <>
                    <div className="h-56 overflow-y-auto overflow-x-hidden rounded-md border border-[var(--color-border)]">
                      {puedeCrearNuevo && (
                        <button
                          type="button"
                          onClick={() => elegirNuevo(searchTrim)}
                          className={cn(
                            'flex w-full items-center justify-between gap-3 border-b border-[var(--color-border)] px-3 py-2 text-left text-sm transition-colors',
                            nuevoCodigo.toLowerCase() === searchTrim.toLowerCase()
                              ? 'bg-[var(--color-primary)]/10'
                              : 'hover:bg-[var(--color-muted)]/40',
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <Plus
                              className={cn(
                                'h-4 w-4 shrink-0',
                                nuevoCodigo.toLowerCase() === searchTrim.toLowerCase()
                                  ? 'text-[var(--color-primary)]'
                                  : 'text-muted-foreground',
                              )}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-foreground">
                                Crear nuevo consolidado{' '}
                                <span className="font-mono">«{searchTrim}»</span>
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                Se creará vacío (sin paquetes) y quedará asociado a esta
                                liquidación.
                              </p>
                            </div>
                          </div>
                          <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--color-warning)]" />
                        </button>
                      )}
                      {loadingDisp && (
                        <div className="flex h-full items-center justify-center gap-2 p-3 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Buscando…
                        </div>
                      )}
                      {!loadingDisp && opciones.length === 0 && !puedeCrearNuevo && (
                        <div className="flex h-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
                          {searchTrim
                            ? 'Sin coincidencias. Escribe una guía para crearla nueva.'
                            : 'No hay consolidados disponibles para liquidar.'}
                        </div>
                      )}
                      {!loadingDisp &&
                        opciones.map((c) => {
                          const sel = c.id === selectedId;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => elegirExistente(c)}
                              className={cn(
                                'flex w-full items-center justify-between gap-3 border-b border-[var(--color-border)] px-3 py-2 text-left text-sm last:border-b-0 transition-colors',
                                sel
                                  ? 'bg-[var(--color-primary)]/10'
                                  : 'hover:bg-[var(--color-muted)]/40',
                              )}
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <Boxes
                                  className={cn(
                                    'h-4 w-4 shrink-0',
                                    sel
                                      ? 'text-[var(--color-primary)]'
                                      : 'text-muted-foreground',
                                  )}
                                />
                                <div className="min-w-0">
                                  <p className="truncate font-mono text-xs font-semibold text-foreground">
                                    {c.codigo}
                                  </p>
                                  <p className="truncate text-[11px] text-muted-foreground">
                                    {c.totalPaquetes ?? 0} paquetes ·{' '}
                                    {Number(c.pesoTotalLbs ?? 0).toFixed(2)} lbs
                                  </p>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px]',
                                    c.cerrado
                                      ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]'
                                      : 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
                                  )}
                                >
                                  {c.cerrado ? (
                                    <Lock className="h-2.5 w-2.5" />
                                  ) : (
                                    <Unlock className="h-2.5 w-2.5" />
                                  )}
                                  {c.cerrado ? 'Cerrado' : 'Abierto'}
                                </span>
                                {sel && <Check className="h-4 w-4 text-[var(--color-primary)]" />}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                    {nuevoCodigo && (
                      <p className="text-[11px] text-[var(--color-warning)]">
                        Se creará un nuevo consolidado con la guía «{nuevoCodigo}» al
                        guardar.
                      </p>
                    )}
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
              <span className="text-xs text-muted-foreground">Consolidado</span>
              <p className="mt-0.5 font-mono font-semibold">
                {linea?.envioConsolidadoCodigo}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="costoProveedor" className="text-xs">
                Costo al proveedor (USA → EC)
              </Label>
              <Controller
                control={form.control}
                name="costoProveedor"
                render={({ field, fieldState }) => (
                  <>
                    <MoneyInput
                      id="costoProveedor"
                      value={field.value ?? 0}
                      onChange={field.onChange}
                      ariaInvalid={!!fieldState.error}
                    />
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ingresoCliente" className="text-xs">
                Ingreso del cliente
              </Label>
              <Controller
                control={form.control}
                name="ingresoCliente"
                render={({ field, fieldState }) => (
                  <>
                    <MoneyInput
                      id="ingresoCliente"
                      value={field.value ?? 0}
                      onChange={field.onChange}
                      ariaInvalid={!!fieldState.error}
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

          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Margen línea (ingreso − costo)</span>
            </div>
            <p
              className={cn(
                'mt-1 text-right font-mono text-xl font-bold',
                margenPreview < 0
                  ? 'text-[var(--color-warning)]'
                  : 'text-[var(--color-success)]',
              )}
            >
              {formatMoney(margenPreview)}
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
            <Button type="submit" disabled={submitDisabled}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />{' '}
                  {isEdit ? 'Guardar cambios' : 'Agregar consolidado'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
