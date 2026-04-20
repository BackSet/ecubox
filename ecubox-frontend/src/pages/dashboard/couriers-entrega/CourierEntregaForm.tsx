import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  CalendarClock,
  Clock,
  DollarSign,
  ExternalLink,
  Hash,
  Info,
  Link2,
  Loader2,
  Mail,
  Sparkles,
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
import { LabeledField as FormField } from '@/components/LabeledField';
import { Badge } from '@/components/ui/badge';
import {
  useCourierEntregaAdmin,
  useCreateCourierEntrega,
  useUpdateCourierEntrega,
} from '@/hooks/useCouriersEntregaAdmin';
import type { CourierEntregaRequest } from '@/types/despacho';
import { emailOpcionalSchema } from '@/lib/validation';
import {
  onKeyDownNumeric,
  onKeyDownNumericDecimal,
  sanitizeNumeric,
  sanitizeNumericDecimal,
} from '@/lib/inputFilters';
import { cn } from '@/lib/utils';

const tarifaSchema = z
  .union([z.number(), z.nan()])
  .transform((n) => (Number.isNaN(n) ? 0 : n))
  .pipe(z.number().min(0, 'La tarifa debe ser mayor o igual a 0').max(99999, 'Tarifa fuera de rango'));

const formSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .min(3, 'Mínimo 3 caracteres')
    .max(120, 'Máximo 120 caracteres'),
  codigo: z
    .string()
    .min(1, 'El código es obligatorio')
    .min(2, 'Mínimo 2 caracteres')
    .max(40, 'Máximo 40 caracteres')
    .regex(/^[A-Z0-9_-]+$/i, 'Solo letras, números, guion y guion bajo'),
  email: emailOpcionalSchema,
  horarioReparto: z.string().max(255, 'Máximo 255 caracteres').optional(),
  paginaTracking: z
    .string()
    .optional()
    .refine(
      (v) => !v || v.trim() === '' || /^https?:\/\/.+/i.test(v.trim()),
      { message: 'La página de tracking debe iniciar con http:// o https://' },
    ),
  diasMaxRetiroDomicilio: z
    .union([z.number().int().min(0, 'Debe ser mayor o igual a 0').max(365, 'Máximo 365 días'), z.nan()])
    .transform((n) => (Number.isNaN(n) ? undefined : n))
    .optional(),
  tarifaEnvio: tarifaSchema,
});

type FormValues = z.infer<typeof formSchema>;

interface CourierEntregaFormProps {
  id?: number;
  onClose: () => void;
  onSuccess: () => void;
}

const HORARIOS_PRESET: Array<{ label: string; value: string }> = [
  { label: 'L-V 8:00–17:00', value: 'Lunes a Viernes 8:00 - 17:00' },
  { label: 'L-V 9:00–18:00', value: 'Lunes a Viernes 9:00 - 18:00' },
  { label: 'L-S 8:00–14:00', value: 'Lunes a Sábado 8:00 - 14:00' },
  { label: '24/7', value: 'Reparto 24 horas, todos los días' },
];

const RETIRO_PRESETS = [1, 2, 3, 5, 7];

function fmtMoneda(n: number | undefined | null): string {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return '$0,00';
  return `$${x.toLocaleString('es-EC', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function slugCodigo(nombre: string): string {
  const base = (nombre || '').trim().toLowerCase();
  if (!base) return '';
  const norm = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!norm) return '';
  return norm.slice(0, 40).toUpperCase();
}

export function CourierEntregaForm({ id, onClose, onSuccess }: CourierEntregaFormProps) {
  const isEdit = id != null;
  const { data: courierEntrega } = useCourierEntregaAdmin(id);
  const createMutation = useCreateCourierEntrega();
  const updateMutation = useUpdateCourierEntrega();
  const [tarifaEnvioInput, setTarifaEnvioInput] = useState('0');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: {
      nombre: '',
      codigo: '',
      email: '',
      horarioReparto: '',
      paginaTracking: '',
      diasMaxRetiroDomicilio: undefined,
      tarifaEnvio: 0,
    },
  });

  useEffect(() => {
    if (isEdit && courierEntrega) {
      form.reset({
        nombre: courierEntrega.nombre,
        codigo: courierEntrega.codigo,
        email: courierEntrega.email ?? '',
        horarioReparto: courierEntrega.horarioReparto ?? '',
        paginaTracking: courierEntrega.paginaTracking ?? '',
        diasMaxRetiroDomicilio: courierEntrega.diasMaxRetiroDomicilio ?? undefined,
        tarifaEnvio: courierEntrega.tarifaEnvio ?? 0,
      });
      setTarifaEnvioInput(String(courierEntrega.tarifaEnvio ?? 0));
    } else if (!isEdit) {
      setTarifaEnvioInput('0');
    }
  }, [isEdit, courierEntrega, form]);

  const watchedNombre = form.watch('nombre');
  const watchedCodigo = form.watch('codigo');
  const watchedEmail = form.watch('email');
  const watchedHorario = form.watch('horarioReparto');
  const watchedTracking = form.watch('paginaTracking');
  const watchedDiasMax = form.watch('diasMaxRetiroDomicilio');
  const watchedTarifa = form.watch('tarifaEnvio');

  const puedeSugerirCodigo = (watchedNombre?.trim()?.length ?? 0) >= 3;

  const trackingValido = useMemo(() => {
    const v = (watchedTracking ?? '').trim();
    if (!v) return null;
    return /^https?:\/\/.+/i.test(v);
  }, [watchedTracking]);

  const previewVisible = Boolean(
    watchedNombre?.trim() ||
      watchedCodigo?.trim() ||
      watchedEmail?.trim() ||
      watchedHorario?.trim() ||
      watchedTracking?.trim(),
  );

  function handleSugerirCodigo() {
    if (!puedeSugerirCodigo) {
      toast.error('Escribe al menos el nombre para sugerir un código.');
      return;
    }
    const sugerido = slugCodigo(watchedNombre || '');
    if (!sugerido) {
      toast.error('No se pudo generar un código a partir del nombre.');
      return;
    }
    form.setValue('codigo', sugerido, { shouldValidate: true, shouldDirty: true });
    toast.success('Código sugerido');
  }

  async function onSubmit(values: FormValues) {
    const body: CourierEntregaRequest = {
      nombre: values.nombre.trim(),
      codigo: values.codigo.trim(),
      email: values.email?.trim() || undefined,
      horarioReparto: values.horarioReparto?.trim() || undefined,
      paginaTracking: values.paginaTracking?.trim() || undefined,
      diasMaxRetiroDomicilio: values.diasMaxRetiroDomicilio,
      tarifaEnvio: Number(values.tarifaEnvio),
    };
    try {
      if (isEdit && id != null) {
        await updateMutation.mutateAsync({ id, body });
        toast.success('Courier de entrega actualizado');
      } else {
        await createMutation.mutateAsync(body);
        toast.success('Courier de entrega creado');
      }
      onSuccess();
    } catch {
      // Error ya manejado por toast en el interceptor o en la mutación
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
              <Truck className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle>
                {isEdit ? 'Editar courier de entrega' : 'Nuevo courier de entrega'}
              </DialogTitle>
              <DialogDescription>
                {isEdit
                  ? 'Actualiza los datos del courier de entrega: contacto, operación, tarifa y tracking.'
                  : 'Registra un nuevo courier de entrega para asignarlo a despachos y puntos de entrega.'}
              </DialogDescription>
              {isEdit && courierEntrega?.codigo && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="h-5 rounded font-mono text-[11px] font-normal uppercase"
                  >
                    {courierEntrega.codigo}
                  </Badge>
                  {courierEntrega.tarifaEnvio != null && (
                    <Badge
                      variant="outline"
                      className="h-5 rounded text-[11px] font-normal text-[var(--color-success)]"
                    >
                      Tarifa actual {fmtMoneda(courierEntrega.tarifaEnvio)}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Identificación */}
          <FormSection
            icon={<Truck className="h-4 w-4" />}
            title="Identificación"
            description="Nombre comercial y código único del courier de entrega."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Nombre"
                required
                error={errors.nombre?.message}
                hint="Nombre comercial. Aparecerá en despachos y reportes."
              >
                <Input
                  {...form.register('nombre')}
                  variant="clean"
                  placeholder="Ej: Servientrega"
                  autoComplete="organization"
                  aria-invalid={Boolean(errors.nombre)}
                />
              </FormField>

              <FormField
                label="Código"
                required
                error={errors.codigo?.message}
                hint="Identificador interno único. Solo letras, números, guion y _."
                icon={<Hash className="h-3.5 w-3.5" />}
              >
                <div className="flex gap-2">
                  <Input
                    {...form.register('codigo')}
                    variant="clean"
                    placeholder="Ej: SERVIENTREGA"
                    className="flex-1 font-mono text-sm uppercase"
                    aria-invalid={Boolean(errors.codigo)}
                    onChange={(e) =>
                      form.setValue('codigo', e.target.value.toUpperCase(), {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSugerirCodigo}
                    disabled={!puedeSugerirCodigo}
                    title={
                      !puedeSugerirCodigo
                        ? 'Escribe al menos el nombre para sugerir un código.'
                        : 'Sugerir código a partir del nombre'
                    }
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Sugerir
                  </Button>
                </div>
              </FormField>
            </div>
          </FormSection>

          {/* Contacto */}
          <FormSection
            icon={<Mail className="h-4 w-4" />}
            title="Contacto"
            description="Correo electrónico para coordinación operativa."
          >
            <FormField
              label="Email"
              error={errors.email?.message}
              hint="Opcional. Se usará como contacto principal del courier de entrega."
              icon={<Mail className="h-3.5 w-3.5" />}
            >
              <Input
                type="email"
                {...form.register('email')}
                variant="clean"
                placeholder="contacto@courier.com"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
              />
            </FormField>
          </FormSection>

          {/* Operación */}
          <FormSection
            icon={<Clock className="h-4 w-4" />}
            title="Operación"
            description="Horario de reparto, plazo de retiro a domicilio y tarifa de envío."
          >
            <div className="space-y-4">
              <FormField
                label="Horario de reparto"
                error={errors.horarioReparto?.message}
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
                            form.setValue('horarioReparto', preset.value, {
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
                    {...form.register('horarioReparto')}
                    variant="clean"
                    placeholder="Ej: Lunes a Viernes 08:00 - 17:00"
                    rows={2}
                    className="min-h-[60px] resize-none"
                    maxLength={255}
                    aria-invalid={Boolean(errors.horarioReparto)}
                  />
                </div>
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="Días máx. de retiro a domicilio"
                  error={errors.diasMaxRetiroDomicilio?.message}
                  hint="Tiempo máximo del courier de entrega para entregar a domicilio."
                  icon={<CalendarClock className="h-3.5 w-3.5" />}
                >
                  <div className="space-y-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      variant="clean"
                      placeholder="Ej: 3"
                      value={watchedDiasMax != null ? String(watchedDiasMax) : ''}
                      aria-invalid={Boolean(errors.diasMaxRetiroDomicilio)}
                      onKeyDown={onKeyDownNumeric}
                      onChange={(e) => {
                        const s = sanitizeNumeric(e.target.value);
                        form.setValue(
                          'diasMaxRetiroDomicilio',
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
                              form.setValue('diasMaxRetiroDomicilio', d, {
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
                            {d} día{d === 1 ? '' : 's'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </FormField>

                <FormField
                  label="Tarifa de envío"
                  required
                  error={errors.tarifaEnvio?.message}
                  hint="Costo base por envío con este courier de entrega (USD)."
                  icon={<DollarSign className="h-3.5 w-3.5" />}
                >
                  <Controller
                    control={form.control}
                    name="tarifaEnvio"
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
                          value={tarifaEnvioInput}
                          placeholder="0.00"
                          className="pl-7 text-right font-mono tabular-nums"
                          aria-invalid={Boolean(errors.tarifaEnvio)}
                          onKeyDown={(e) =>
                            onKeyDownNumericDecimal(e, tarifaEnvioInput)
                          }
                          onChange={(e) => {
                            const s = sanitizeNumericDecimal(e.target.value);
                            setTarifaEnvioInput(s);
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

          {/* Tracking */}
          <FormSection
            icon={<Link2 className="h-4 w-4" />}
            title="Tracking"
            description="URL pública para rastrear envíos en el sitio del courier de entrega."
          >
            <FormField
              label="Página de tracking"
              error={errors.paginaTracking?.message}
              hint="Debe iniciar con http:// o https://"
              icon={<Link2 className="h-3.5 w-3.5" />}
            >
              <div className="flex gap-2">
                <Input
                  type="url"
                  {...form.register('paginaTracking')}
                  variant="clean"
                  placeholder="https://tracking.courier.com/guia"
                  className="flex-1"
                  aria-invalid={Boolean(errors.paginaTracking)}
                />
                {trackingValido && (watchedTracking?.trim() ?? '') && (
                  <a
                    href={(watchedTracking ?? '').trim()}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/40 px-3 text-xs text-foreground hover:bg-[var(--color-muted)]/60"
                    title="Abrir página de tracking"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir
                  </a>
                )}
              </div>
            </FormField>
          </FormSection>

          {/* Vista previa */}
          {previewVisible && (
            <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/15 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Info className="h-3 w-3" />
                Vista previa
              </div>
              <PreviewCard
                nombre={watchedNombre}
                codigo={watchedCodigo}
                email={watchedEmail}
                horario={watchedHorario}
                tracking={watchedTracking}
                diasMaxRetiroDomicilio={watchedDiasMax}
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
                'Crear courier de entrega'
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
  nombre?: string;
  codigo?: string;
  email?: string;
  horario?: string;
  tracking?: string;
  diasMaxRetiroDomicilio?: number;
  tarifa?: number;
}

function PreviewCard({
  nombre,
  codigo,
  email,
  horario,
  tracking,
  diasMaxRetiroDomicilio,
  tarifa,
}: PreviewCardProps) {
  const sinNombre = !nombre?.trim();
  const trackingValido = tracking && /^https?:\/\/.+/i.test(tracking.trim());

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Truck className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <p
              className={cn(
                'truncate text-sm font-semibold',
                sinNombre ? 'italic text-muted-foreground' : 'text-foreground',
              )}
            >
              {nombre?.trim() || 'Sin nombre'}
            </p>
            {codigo?.trim() && (
              <Badge
                variant="outline"
                className="h-5 rounded font-mono text-[11px] font-normal uppercase"
              >
                {codigo.trim()}
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

          {email?.trim() && (
            <p className="flex items-center gap-1.5 text-xs text-foreground">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{email.trim()}</span>
            </p>
          )}

          {(horario?.trim() ||
            (diasMaxRetiroDomicilio != null && diasMaxRetiroDomicilio > 0)) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {horario?.trim() && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span className="line-clamp-1">{horario.trim()}</span>
                </span>
              )}
              {diasMaxRetiroDomicilio != null && diasMaxRetiroDomicilio > 0 && (
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  Hasta {diasMaxRetiroDomicilio} día
                  {diasMaxRetiroDomicilio === 1 ? '' : 's'}
                </span>
              )}
            </div>
          )}

          {tracking?.trim() && (
            <div className="flex items-center gap-1.5 text-xs">
              <Link2 className="h-3 w-3 text-muted-foreground" />
              {trackingValido ? (
                <a
                  href={tracking.trim()}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-[var(--color-primary)] hover:underline"
                  title={tracking.trim()}
                >
                  {tracking.trim()}
                </a>
              ) : (
                <span className="truncate text-muted-foreground italic">
                  URL inválida
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
