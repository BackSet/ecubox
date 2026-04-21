import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Building2,
  CalendarClock,
  Clock,
  DollarSign,
  Hash,
  Info,
  Loader2,
  MapPin,
  PencilLine,
  Truck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LabeledField as FormField } from '@/components/LabeledField';
import { ProvinciaCantonSelectors } from '@/components/ProvinciaCantonSelectors';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAgenciaCourierEntregaAdmin,
  useCreateAgenciaCourierEntrega,
  useUpdateAgenciaCourierEntrega,
} from '@/hooks/usePuntosEntregaAdmin';
import { useCouriersEntregaAdmin } from '@/hooks/useCouriersEntregaAdmin';
import type { AgenciaCourierEntregaRequest } from '@/types/despacho';
import {
  onKeyDownNumeric,
  onKeyDownNumericDecimal,
  sanitizeNumeric,
  sanitizeNumericDecimal,
} from '@/lib/inputFilters';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  courierEntregaId: z.number().refine((n) => n > 0, 'Seleccione un courier de entrega'),
  direccion: z.string().max(255, 'Máximo 255 caracteres').optional(),
  provincia: z.string().optional(),
  canton: z.string().optional(),
  horarioAtencion: z.string().max(255, 'Máximo 255 caracteres').optional(),
  diasMaxRetiro: z
    .union([z.number().int().min(0, 'Debe ser mayor o igual a 0').max(365, 'Máximo 365 días'), z.nan()])
    .transform((n) => (Number.isNaN(n) ? undefined : n))
    .optional(),
  tarifa: z
    .union([z.number(), z.nan()])
    .transform((n) => (Number.isNaN(n) ? 0 : n))
    .pipe(z.number().min(0, 'La tarifa debe ser mayor o igual a 0').max(99999, 'Tarifa fuera de rango')),
});

type FormValues = z.infer<typeof formSchema>;

interface AgenciaCourierEntregaFormProps {
  id?: number;
  onClose: () => void;
  onSuccess: () => void;
}

const HORARIOS_PRESET: Array<{ label: string; value: string }> = [
  { label: 'L-V 8:00–18:00', value: 'Lunes a Viernes 8:00 - 18:00' },
  { label: 'L-S 9:00–19:00', value: 'Lunes a Sábado 9:00 - 19:00' },
  { label: 'L-V 8:00–17:00, S 9:00–13:00', value: 'Lunes a Viernes 8:00 - 17:00, Sábado 9:00 - 13:00' },
  { label: '24/7', value: 'Atención 24 horas, todos los días' },
];

const RETIRO_PRESETS = [3, 5, 7, 15, 30];

function fmtMoneda(n: number | undefined | null): string {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return '$0,00';
  return `$${x.toLocaleString('es-EC', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function PuntoEntregaForm({
  id,
  onClose,
  onSuccess,
}: AgenciaCourierEntregaFormProps) {
  const isEdit = id != null;
  const { data: agencia } = useAgenciaCourierEntregaAdmin(id);
  const { data: couriersEntrega = [] } = useCouriersEntregaAdmin();
  const createMutation = useCreateAgenciaCourierEntrega();
  const updateMutation = useUpdateAgenciaCourierEntrega();
  const [tarifaInput, setTarifaInput] = useState('0');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: {
      courierEntregaId: 0,
      direccion: '',
      provincia: '',
      canton: '',
      horarioAtencion: '',
      diasMaxRetiro: undefined,
      tarifa: 0,
    },
  });

  useEffect(() => {
    if (isEdit && agencia) {
      form.reset({
        courierEntregaId: agencia.courierEntregaId,
        direccion: agencia.direccion ?? '',
        provincia: agencia.provincia ?? '',
        canton: agencia.canton ?? '',
        horarioAtencion: agencia.horarioAtencion ?? '',
        diasMaxRetiro: agencia.diasMaxRetiro ?? undefined,
        tarifa: agencia.tarifa ?? 0,
      });
      setTarifaInput(String(agencia.tarifa ?? 0));
    } else if (!isEdit) {
      setTarifaInput('0');
    }
  }, [isEdit, agencia, form]);

  const watchedCourierEntregaId = form.watch('courierEntregaId');
  const watchedProvincia = form.watch('provincia');
  const watchedCanton = form.watch('canton');
  const watchedDireccion = form.watch('direccion');
  const watchedHorario = form.watch('horarioAtencion');
  const watchedDiasMax = form.watch('diasMaxRetiro');
  const watchedTarifa = form.watch('tarifa');

  const courierEntregaSel = useMemo(
    () => couriersEntrega.find((d) => d.id === watchedCourierEntregaId) ?? null,
    [couriersEntrega, watchedCourierEntregaId],
  );

  const previewVisible = Boolean(
    courierEntregaSel ||
      watchedProvincia ||
      watchedCanton ||
      watchedDireccion?.trim() ||
      watchedHorario?.trim(),
  );

  async function onSubmit(values: FormValues) {
    const body: AgenciaCourierEntregaRequest = {
      courierEntregaId: values.courierEntregaId,
      direccion: values.direccion?.trim() || undefined,
      provincia: values.provincia?.trim() || undefined,
      canton: values.canton?.trim() || undefined,
      horarioAtencion: values.horarioAtencion?.trim() || undefined,
      diasMaxRetiro: values.diasMaxRetiro,
      tarifa: Number(values.tarifa),
    };
    try {
      if (isEdit && id != null) {
        await updateMutation.mutateAsync({ id, body });
        toast.success('Punto de entrega actualizado');
      } else {
        await createMutation.mutateAsync(body);
        toast.success('Punto de entrega creado');
      }
      onSuccess();
    } catch {
      // Error manejado por toast en el interceptor o en la mutación
    }
  }

  const loading = createMutation.isPending || updateMutation.isPending;
  const errors = form.formState.errors;
  const isDirty = form.formState.isDirty;
  const submitDisabled = loading || (isEdit && !isDirty);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[720px]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              {isEdit ? (
                <PencilLine className="h-4 w-4" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle>
                {isEdit
                  ? 'Editar punto de entrega'
                  : 'Nuevo punto de entrega'}
              </DialogTitle>
              <DialogDescription>
                {isEdit
                  ? 'Actualiza la ubicación, horarios y tarifa de este punto de entrega perteneciente a un courier.'
                  : 'Registra un punto de entrega que pertenece a un courier para usarlo en despachos tipo "Punto de entrega".'}
              </DialogDescription>
              {isEdit && agencia?.codigo && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="h-5 rounded font-mono text-[11px] font-normal uppercase"
                  >
                    {agencia.codigo}
                  </Badge>
                  {agencia.tarifa != null && (
                    <Badge
                      variant="outline"
                      className="h-5 rounded text-[11px] font-normal text-[var(--color-success)]"
                    >
                      Tarifa actual {fmtMoneda(agencia.tarifa)}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {isEdit && (
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-[12px] leading-snug text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
              <span>
                Los cambios solo aplican a despachos <strong>nuevos</strong>. Los
                despachos ya creados con este punto de entrega conservan los datos como estaban
                en ese momento, para preservar la trazabilidad del envío.
              </span>
            </div>
          )}

          {/* Sección: Courier de entrega */}
          <FormSection
            icon={<Truck className="h-4 w-4" />}
            title="Courier de entrega"
            description="Empresa propietaria de este punto de entrega. No se puede cambiar después de crearlo."
          >
            <FormField
              label="Courier de entrega"
              required
              error={errors.courierEntregaId?.message}
              hint={
                isEdit
                  ? 'El courier de un punto de entrega ya creado no puede modificarse.'
                  : 'Selecciona el courier de entrega al que pertenecerá este punto.'
              }
            >
              <Select
                value={watchedCourierEntregaId > 0 ? String(watchedCourierEntregaId) : undefined}
                onValueChange={(value) =>
                  form.setValue('courierEntregaId', Number(value), {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                disabled={isEdit}
              >
                <SelectTrigger
                  variant="clean"
                  aria-invalid={Boolean(errors.courierEntregaId)}
                >
                  <SelectValue placeholder="Seleccione courier de entrega" />
                </SelectTrigger>
                <SelectContent>
                  {couriersEntrega.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.nombre}
                      {d.codigo ? ` · ${d.codigo}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {courierEntregaSel && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-3 text-xs">
                <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-foreground">
                      {courierEntregaSel.nombre}
                    </span>
                    {courierEntregaSel.codigo && (
                      <Badge
                        variant="outline"
                        className="h-4 rounded font-mono text-[10px] font-normal uppercase"
                      >
                        {courierEntregaSel.codigo}
                      </Badge>
                    )}
                  </div>
                  {courierEntregaSel.tarifaEnvio != null && (
                    <p className="text-muted-foreground">
                      Tarifa de envío base:{' '}
                      <span className="font-mono text-[var(--color-success)]">
                        {fmtMoneda(courierEntregaSel.tarifaEnvio)}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {isEdit && agencia?.codigo && (
              <div className="mt-3">
                <Label className="flex items-center gap-1.5 text-xs text-foreground">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  Código generado
                </Label>
                <div className="mt-1 flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-2 text-sm">
                  <span className="font-mono text-sm uppercase">{agencia.codigo}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    Asignado por el sistema
                  </span>
                </div>
              </div>
            )}
          </FormSection>

          {/* Sección: Ubicación */}
          <FormSection
            icon={<MapPin className="h-4 w-4" />}
            title="Ubicación"
            description="Provincia, cantón y dirección física del punto de entrega."
          >
            <div className="space-y-4">
              <ProvinciaCantonSelectors
                provincia={watchedProvincia ?? ''}
                canton={watchedCanton ?? ''}
                errorProvincia={errors.provincia?.message}
                errorCanton={errors.canton?.message}
                onProvinciaChange={(value, cantonReset) => {
                  form.setValue('provincia', value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                  form.setValue('canton', cantonReset, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
                onCantonChange={(value) =>
                  form.setValue('canton', value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />

              <FormField
                label="Dirección"
                error={errors.direccion?.message}
                hint="Calle principal, número y referencias visibles."
              >
                <Textarea
                  {...form.register('direccion')}
                  variant="clean"
                  placeholder="Ej: Av. de los Shyris N35-12 y Suecia, frente al CC El Jardín."
                  rows={3}
                  className="min-h-[84px] resize-none"
                  autoComplete="street-address"
                  maxLength={255}
                  aria-invalid={Boolean(errors.direccion)}
                />
                <div className="mt-1 flex items-center justify-end text-[11px] text-muted-foreground">
                  <span>{(watchedDireccion ?? '').length}/255</span>
                </div>
              </FormField>
            </div>
          </FormSection>

          {/* Sección: Operación */}
          <FormSection
            icon={<Clock className="h-4 w-4" />}
            title="Operación"
            description="Horario de atención, tiempo máximo de retiro y tarifa por entrega."
          >
            <div className="space-y-4">
              <FormField
                label="Horario de atención"
                error={errors.horarioAtencion?.message}
                hint="Texto libre. Usa los atajos para rellenar formatos comunes."
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {HORARIOS_PRESET.map((preset) => {
                      const active =
                        (watchedHorario ?? '').trim() === preset.value;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            form.setValue('horarioAtencion', preset.value, {
                              shouldValidate: true,
                              shouldDirty: true,
                            })
                          }
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                            active
                              ? 'border-primary/50 bg-primary/10 text-primary'
                              : 'border-[var(--color-border)] bg-[var(--color-muted)]/30 text-muted-foreground hover:bg-[var(--color-muted)]/60',
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                  <Textarea
                    {...form.register('horarioAtencion')}
                    variant="clean"
                    placeholder="Ej: Lunes a Viernes 8:00 - 18:00"
                    rows={2}
                    className="min-h-[60px] resize-none"
                    maxLength={255}
                    aria-invalid={Boolean(errors.horarioAtencion)}
                  />
                </div>
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="Días máx. de retiro"
                  error={errors.diasMaxRetiro?.message}
                  hint="Tras este plazo el paquete se considera vencido."
                  icon={<CalendarClock className="h-3.5 w-3.5" />}
                >
                  <div className="space-y-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      variant="clean"
                      placeholder="Ej: 7"
                      value={watchedDiasMax != null ? String(watchedDiasMax) : ''}
                      aria-invalid={Boolean(errors.diasMaxRetiro)}
                      onKeyDown={onKeyDownNumeric}
                      onChange={(e) => {
                        const s = sanitizeNumeric(e.target.value);
                        form.setValue(
                          'diasMaxRetiro',
                          s === '' ? (undefined as unknown as number) : Number(s),
                          { shouldValidate: true, shouldDirty: true },
                        );
                      }}
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {RETIRO_PRESETS.map((d) => {
                        const active = watchedDiasMax === d;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() =>
                              form.setValue('diasMaxRetiro', d, {
                                shouldValidate: true,
                                shouldDirty: true,
                              })
                            }
                            className={cn(
                              'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                              active
                                ? 'border-primary/50 bg-primary/10 text-primary'
                                : 'border-[var(--color-border)] bg-[var(--color-muted)]/30 text-muted-foreground hover:bg-[var(--color-muted)]/60',
                            )}
                          >
                            {d} días
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </FormField>

                <FormField
                  label="Tarifa"
                  required
                  error={errors.tarifa?.message}
                  hint="Costo base por entrega en este punto (USD)."
                  icon={<DollarSign className="h-3.5 w-3.5" />}
                >
                  <Controller
                    control={form.control}
                    name="tarifa"
                    render={({ field }) => (
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          variant="clean"
                          value={tarifaInput}
                          placeholder="0.00"
                          className="pl-7 text-right font-mono tabular-nums"
                          aria-invalid={Boolean(errors.tarifa)}
                          onKeyDown={(e) =>
                            onKeyDownNumericDecimal(e, tarifaInput)
                          }
                          onChange={(e) => {
                            const s = sanitizeNumericDecimal(e.target.value);
                            setTarifaInput(s);
                            const n = s === '' || s === '.' ? NaN : Number(s);
                            field.onChange(n);
                          }}
                        />
                      </div>
                    )}
                  />
                </FormField>
              </div>
            </div>
          </FormSection>

          {/* Vista previa */}
          {previewVisible && (
            <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/15 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Info className="h-3 w-3" />
                Vista previa
              </div>
              <PreviewCard
                courierEntrega={courierEntregaSel?.nombre}
                courierEntregaCodigo={courierEntregaSel?.codigo}
                codigo={agencia?.codigo}
                direccion={watchedDireccion}
                provincia={watchedProvincia}
                canton={watchedCanton}
                horario={watchedHorario}
                diasMaxRetiro={watchedDiasMax}
                tarifa={watchedTarifa}
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitDisabled}
              title={
                isEdit && !isDirty ? 'No hay cambios para guardar' : undefined
              }
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : isEdit ? (
                'Guardar cambios'
              ) : (
                'Crear punto de entrega'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Componentes auxiliares
// ============================================================================

interface FormSectionProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}

function FormSection({ icon, title, description, children }: FormSectionProps) {
  return (
    <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <header className="mb-3 flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-[11px] text-muted-foreground">{description}</p>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}


interface PreviewCardProps {
  courierEntrega?: string;
  courierEntregaCodigo?: string;
  codigo?: string;
  direccion?: string;
  provincia?: string;
  canton?: string;
  horario?: string;
  diasMaxRetiro?: number;
  tarifa?: number;
}

function PreviewCard({
  courierEntrega,
  courierEntregaCodigo,
  codigo,
  direccion,
  provincia,
  canton,
  horario,
  diasMaxRetiro,
  tarifa,
}: PreviewCardProps) {
  const ubicacion = [canton?.trim(), provincia?.trim()]
    .filter((v): v is string => Boolean(v))
    .join(', ');

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Building2 className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <p
              className={cn(
                'truncate text-sm font-semibold',
                courierEntrega ? 'text-foreground' : 'italic text-muted-foreground',
              )}
            >
              {courierEntrega ?? 'Sin courier de entrega'}
            </p>
            {courierEntregaCodigo && (
              <Badge
                variant="outline"
                className="h-5 rounded font-mono text-[11px] font-normal uppercase"
              >
                {courierEntregaCodigo}
              </Badge>
            )}
            {codigo && (
              <Badge
                variant="outline"
                className="h-5 rounded font-mono text-[11px] font-normal uppercase"
              >
                {codigo}
              </Badge>
            )}
            {Number.isFinite(tarifa) && (tarifa as number) > 0 && (
              <Badge
                variant="outline"
                className="h-5 rounded text-[11px] font-normal text-[var(--color-success)]"
              >
                {fmtMoneda(tarifa as number)}
              </Badge>
            )}
          </div>

          {(direccion?.trim() || ubicacion) && (
            <div className="flex items-start gap-1.5 text-xs">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                {direccion?.trim() && (
                  <p className="line-clamp-2 text-foreground">
                    {direccion.trim()}
                  </p>
                )}
                {ubicacion && (
                  <p className="text-muted-foreground">{ubicacion}</p>
                )}
              </div>
            </div>
          )}

          {(horario?.trim() || (diasMaxRetiro != null && diasMaxRetiro > 0)) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {horario?.trim() && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span className="line-clamp-1">{horario.trim()}</span>
                </span>
              )}
              {diasMaxRetiro != null && diasMaxRetiro > 0 && (
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  Retiro hasta {diasMaxRetiro} día{diasMaxRetiro === 1 ? '' : 's'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
