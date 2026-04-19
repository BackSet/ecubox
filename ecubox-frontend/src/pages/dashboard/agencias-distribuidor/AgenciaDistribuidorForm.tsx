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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAgenciaDistribuidorAdmin,
  useCreateAgenciaDistribuidor,
  useUpdateAgenciaDistribuidor,
} from '@/hooks/useAgenciasDistribuidorAdmin';
import { useDistribuidoresAdmin } from '@/hooks/useDistribuidoresAdmin';
import type { AgenciaDistribuidorRequest } from '@/types/despacho';
import {
  PROVINCIAS_ECUADOR,
  getCantonesByProvincia,
} from '@/data/provincias-cantones-ecuador';
import {
  onKeyDownNumeric,
  onKeyDownNumericDecimal,
  sanitizeNumeric,
  sanitizeNumericDecimal,
} from '@/lib/inputFilters';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  distribuidorId: z.number().refine((n) => n > 0, 'Seleccione un distribuidor'),
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

interface AgenciaDistribuidorFormProps {
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

export function AgenciaDistribuidorForm({
  id,
  onClose,
  onSuccess,
}: AgenciaDistribuidorFormProps) {
  const isEdit = id != null;
  const { data: agencia } = useAgenciaDistribuidorAdmin(id);
  const { data: distribuidores = [] } = useDistribuidoresAdmin();
  const createMutation = useCreateAgenciaDistribuidor();
  const updateMutation = useUpdateAgenciaDistribuidor();
  const [tarifaInput, setTarifaInput] = useState('0');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: {
      distribuidorId: 0,
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
        distribuidorId: agencia.distribuidorId,
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

  const watchedDistribuidorId = form.watch('distribuidorId');
  const watchedProvincia = form.watch('provincia');
  const watchedCanton = form.watch('canton');
  const watchedDireccion = form.watch('direccion');
  const watchedHorario = form.watch('horarioAtencion');
  const watchedDiasMax = form.watch('diasMaxRetiro');
  const watchedTarifa = form.watch('tarifa');

  const distribuidorSel = useMemo(
    () => distribuidores.find((d) => d.id === watchedDistribuidorId) ?? null,
    [distribuidores, watchedDistribuidorId],
  );

  const cantones = useMemo(
    () => getCantonesByProvincia(watchedProvincia ?? ''),
    [watchedProvincia],
  );

  const cantonValido = useMemo(() => {
    if (!watchedCanton) return true;
    return cantones.includes(watchedCanton);
  }, [cantones, watchedCanton]);

  const previewVisible = Boolean(
    distribuidorSel ||
      watchedProvincia ||
      watchedCanton ||
      watchedDireccion?.trim() ||
      watchedHorario?.trim(),
  );

  async function onSubmit(values: FormValues) {
    const body: AgenciaDistribuidorRequest = {
      distribuidorId: values.distribuidorId,
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
        toast.success('Agencia de distribuidor actualizada');
      } else {
        await createMutation.mutateAsync(body);
        toast.success('Agencia de distribuidor creada');
      }
      onSuccess();
    } catch {
      // Error manejado por toast en el interceptor o en la mutación
    }
  }

  const loading = createMutation.isPending || updateMutation.isPending;
  const errors = form.formState.errors;

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
                  ? 'Editar agencia de distribuidor'
                  : 'Nueva agencia de distribuidor'}
              </DialogTitle>
              <DialogDescription>
                {isEdit
                  ? 'Actualiza la ubicación, horarios y tarifa de esta agencia perteneciente a un distribuidor.'
                  : 'Registra una agencia que pertenece a un distribuidor para usarla en despachos tipo "Agencia de distribuidor".'}
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
                despachos ya creados con esta agencia conservan los datos como estaban
                en ese momento, para preservar la trazabilidad del envío.
              </span>
            </div>
          )}

          {/* Sección: Distribuidor */}
          <FormSection
            icon={<Truck className="h-4 w-4" />}
            title="Distribuidor"
            description="Empresa propietaria de esta agencia. No se puede cambiar después de crearla."
          >
            <FormField
              label="Distribuidor"
              required
              error={errors.distribuidorId?.message}
              hint={
                isEdit
                  ? 'El distribuidor de una agencia ya creada no puede modificarse.'
                  : 'Selecciona el distribuidor al que pertenecerá esta agencia.'
              }
            >
              <Select
                value={watchedDistribuidorId > 0 ? String(watchedDistribuidorId) : undefined}
                onValueChange={(value) =>
                  form.setValue('distribuidorId', Number(value), {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                disabled={isEdit}
              >
                <SelectTrigger
                  variant="clean"
                  aria-invalid={Boolean(errors.distribuidorId)}
                >
                  <SelectValue placeholder="Seleccione distribuidor" />
                </SelectTrigger>
                <SelectContent>
                  {distribuidores.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.nombre}
                      {d.codigo ? ` · ${d.codigo}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {distribuidorSel && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-3 text-xs">
                <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-foreground">
                      {distribuidorSel.nombre}
                    </span>
                    {distribuidorSel.codigo && (
                      <Badge
                        variant="outline"
                        className="h-4 rounded font-mono text-[10px] font-normal uppercase"
                      >
                        {distribuidorSel.codigo}
                      </Badge>
                    )}
                  </div>
                  {distribuidorSel.tarifaEnvio != null && (
                    <p className="text-muted-foreground">
                      Tarifa de envío base:{' '}
                      <span className="font-mono text-[var(--color-success)]">
                        {fmtMoneda(distribuidorSel.tarifaEnvio)}
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
            description="Provincia, cantón y dirección física de la agencia."
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Provincia" error={errors.provincia?.message}>
                  <Select
                    value={watchedProvincia || undefined}
                    onValueChange={(value) => {
                      form.setValue('provincia', value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                      form.setValue('canton', '', {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }}
                  >
                    <SelectTrigger
                      variant="clean"
                      aria-invalid={Boolean(errors.provincia)}
                    >
                      <SelectValue placeholder="Seleccione provincia" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVINCIAS_ECUADOR.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField
                  label="Cantón"
                  error={errors.canton?.message}
                  hint={
                    !watchedProvincia
                      ? 'Selecciona una provincia primero.'
                      : undefined
                  }
                >
                  <Select
                    value={watchedCanton || undefined}
                    onValueChange={(value) =>
                      form.setValue('canton', value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    disabled={!watchedProvincia}
                  >
                    <SelectTrigger
                      variant="clean"
                      aria-invalid={Boolean(errors.canton)}
                    >
                      <SelectValue placeholder="Seleccione cantón" />
                    </SelectTrigger>
                    <SelectContent>
                      {cantones.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                      {watchedCanton && !cantonValido && (
                        <SelectItem value={watchedCanton}>
                          {watchedCanton} (personalizado)
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

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
                  hint="Costo base por entrega en esta agencia (USD)."
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
                distribuidor={distribuidorSel?.nombre}
                distribuidorCodigo={distribuidorSel?.codigo}
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
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : isEdit ? (
                'Guardar cambios'
              ) : (
                'Crear agencia'
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
  distribuidor?: string;
  distribuidorCodigo?: string;
  codigo?: string;
  direccion?: string;
  provincia?: string;
  canton?: string;
  horario?: string;
  diasMaxRetiro?: number;
  tarifa?: number;
}

function PreviewCard({
  distribuidor,
  distribuidorCodigo,
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
                distribuidor ? 'text-foreground' : 'italic text-muted-foreground',
              )}
            >
              {distribuidor ?? 'Sin distribuidor'}
            </p>
            {distribuidorCodigo && (
              <Badge
                variant="outline"
                className="h-5 rounded font-mono text-[11px] font-normal uppercase"
              >
                {distribuidorCodigo}
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
