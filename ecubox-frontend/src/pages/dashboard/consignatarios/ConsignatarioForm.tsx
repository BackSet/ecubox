import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Building2,
  Check,
  Copy,
  Hash,
  Info,
  Loader2,
  Lock,
  MapPin,
  Phone,
  RefreshCw,
  Sparkles,
  UserPlus,
  UserRound,
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
import { ProvinciaCantonSelectors } from '@/components/ProvinciaCantonSelectors';
import { Badge } from '@/components/ui/badge';
import {
  useConsignatario,
  useCreateConsignatario,
  useUpdateConsignatario,
} from '@/hooks/useConsignatarios';
import {
  useConsignatarioOperario,
  useUpdateConsignatarioOperario,
} from '@/hooks/useOperarioDespachos';
import { sugerirCodigo } from '@/lib/api/consignatarios.service';
import { useAuthStore } from '@/stores/authStore';
import type { ConsignatarioRequest } from '@/types/consignatario';
import { telefonoSchema } from '@/lib/validation';
import { onKeyDownNumeric, sanitizeNumeric } from '@/lib/inputFilters';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .min(3, 'Mínimo 3 caracteres')
    .max(120, 'Máximo 120 caracteres'),
  telefono: telefonoSchema,
  direccion: z
    .string()
    .min(1, 'La dirección es obligatoria')
    .min(5, 'Mínimo 5 caracteres')
    .max(255, 'Máximo 255 caracteres'),
  provincia: z.string().min(1, 'La provincia es obligatoria'),
  canton: z.string().min(1, 'El cantón es obligatorio'),
  codigo: z
    .string()
    .optional()
    .refine(
      (v) => !v || v.trim().length === 0 || v.trim().length >= 5,
      'El código debe tener al menos 5 caracteres',
    ),
});

type FormValues = z.infer<typeof formSchema>;

interface ConsignatarioFormProps {
  id?: number;
  /** Si true, usa API de operario (lista completa) para cargar y actualizar */
  useOperarioApi?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ConsignatarioForm({
  id,
  useOperarioApi = false,
  onClose,
  onSuccess,
}: ConsignatarioFormProps) {
  const isEdit = id != null;
  const [generatingCodigo, setGeneratingCodigo] = useState(false);
  const [codigoCopied, setCodigoCopied] = useState(false);
  const hasConsignatariosOperarioPerm = useAuthStore((s) =>
    s.hasPermission('CONSIGNATARIOS_OPERARIO'),
  );
  const useOpApi = Boolean(useOperarioApi && isEdit && id != null);
  const { data: consignatarioMis } = useConsignatario(id, !useOpApi);
  const { data: consignatarioOp } = useConsignatarioOperario(useOpApi ? id : undefined);
  const consignatario = useOpApi ? consignatarioOp : consignatarioMis;
  const createMutation = useCreateConsignatario();
  const updateMutation = useUpdateConsignatario();
  const updateOperarioMutation = useUpdateConsignatarioOperario();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: {
      nombre: '',
      telefono: '',
      direccion: '',
      provincia: '',
      canton: '',
      codigo: '',
    },
  });

  useEffect(() => {
    if (isEdit && consignatario) {
      form.reset({
        nombre: consignatario.nombre,
        telefono: consignatario.telefono ?? '',
        direccion: consignatario.direccion ?? '',
        provincia: consignatario.provincia ?? '',
        canton: consignatario.canton ?? '',
        codigo: consignatario.codigo ?? '',
      });
    }
  }, [isEdit, consignatario, form]);

  const watchedNombre = form.watch('nombre');
  const watchedTelefono = form.watch('telefono');
  const watchedDireccion = form.watch('direccion');
  const watchedProvincia = form.watch('provincia');
  const watchedCanton = form.watch('canton');
  const watchedCodigo = form.watch('codigo');

  const puedeGenerarCodigo = Boolean(
    (watchedNombre?.trim()?.length ?? 0) >= 3 && (watchedCanton?.trim()?.length ?? 0) > 0,
  );

  const previewVisible = Boolean(
    watchedNombre?.trim() ||
      watchedTelefono?.trim() ||
      watchedDireccion?.trim() ||
      watchedProvincia ||
      watchedCanton,
  );

  async function handleGenerarCodigo() {
    if (!puedeGenerarCodigo) {
      toast.error('Completa nombre y cantón para sugerir un código.');
      return;
    }
    setGeneratingCodigo(true);
    try {
      const nombre = form.getValues('nombre')?.trim() || '';
      const canton = form.getValues('canton')?.trim() || '';
      const data = await sugerirCodigo({
        nombre: nombre || undefined,
        canton: canton || undefined,
        excludeId: isEdit ? id : undefined,
      });
      form.setValue('codigo', data.codigo, { shouldValidate: true, shouldDirty: true });
      toast.success('Código generado');
    } catch {
      toast.error('No se pudo generar el código');
    } finally {
      setGeneratingCodigo(false);
    }
  }

  async function handleCopiarCodigo() {
    const codigo = form.getValues('codigo')?.trim();
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      setCodigoCopied(true);
      setTimeout(() => setCodigoCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar el código');
    }
  }

  async function onSubmit(values: FormValues) {
    const body: ConsignatarioRequest = {
      nombre: values.nombre.trim(),
      telefono: values.telefono.trim(),
      direccion: values.direccion.trim(),
      provincia: values.provincia.trim(),
      canton: values.canton.trim(),
    };
    if (isEdit && hasConsignatariosOperarioPerm && values.codigo?.trim()) {
      body.codigo = values.codigo.trim();
    }
    try {
      if (isEdit && id != null) {
        if (useOpApi) {
          await updateOperarioMutation.mutateAsync({ id, body });
        } else {
          await updateMutation.mutateAsync({ id, body });
        }
        toast.success('Consignatario actualizado');
      } else {
        await createMutation.mutateAsync(body);
        toast.success('Consignatario creado');
      }
      onSuccess();
    } catch {
      // Error ya manejado por toast en el interceptor o en la mutación
    }
  }

  const loading =
    createMutation.isPending ||
    updateMutation.isPending ||
    updateOperarioMutation.isPending;

  const errors = form.formState.errors;
  const isDirty = form.formState.isDirty;
  // En modo edición no se permite guardar si no hay cambios respecto al baseline
  // que se estableció con form.reset() al cargar los datos del consignatario.
  const submitDisabled = loading || (isEdit && !isDirty);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[680px]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              {isEdit ? (
                <UserRound className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle>
                {isEdit ? 'Editar consignatario' : 'Nuevo consignatario'}
              </DialogTitle>
              <DialogDescription>
                {isEdit
                  ? 'Actualiza los datos de contacto y la ubicación del consignatario.'
                  : 'Registra un consignatario para enviar paquetes a su dirección. El código se genera automáticamente.'}
              </DialogDescription>
              {isEdit && consignatario?.codigo && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="h-5 rounded font-mono text-[11px] font-normal"
                  >
                    {consignatario.codigo}
                  </Badge>
                  {consignatario.clienteUsuarioNombre && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {consignatario.clienteUsuarioNombre}
                    </span>
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
                Los cambios solo aplican a guías y despachos <strong>nuevos</strong>. Las
                guías que ya despacharon piezas y los despachos ya creados conservan los
                datos del consignatario tal como estaban en ese momento, para preservar la
                trazabilidad del envío.
              </span>
            </div>
          )}

          {/* Sección: Datos personales */}
          <FormSection
            icon={<UserRound className="h-4 w-4" />}
            title="Datos personales"
            description="Nombre completo y teléfono de contacto del consignatario."
          >
            <div className="space-y-4">
              <FormField
                label="Nombre completo"
                required
                error={errors.nombre?.message}
                hint="Tal como aparecerá en guías y comprobantes."
              >
                <Input
                  {...form.register('nombre')}
                  variant="clean"
                  placeholder="Ej: María Pérez González"
                  autoComplete="name"
                  aria-invalid={Boolean(errors.nombre)}
                />
              </FormField>

              <FormField
                label="Teléfono"
                required
                error={errors.telefono?.message}
                hint="Solo dígitos, sin espacios ni guiones (7 a 15 dígitos)."
                icon={<Phone className="h-3.5 w-3.5" />}
              >
                <Input
                  {...form.register('telefono')}
                  value={watchedTelefono ?? ''}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  variant="clean"
                  placeholder="0991234567"
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.telefono)}
                  onKeyDown={onKeyDownNumeric}
                  onChange={(e) =>
                    form.setValue('telefono', sanitizeNumeric(e.target.value), {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                />
              </FormField>
            </div>
          </FormSection>

          {/* Sección: Ubicación */}
          <FormSection
            icon={<MapPin className="h-4 w-4" />}
            title="Ubicación"
            description="Provincia, cantón y dirección detallada para la entrega."
          >
            <div className="space-y-4">
              <ProvinciaCantonSelectors
                required
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
                label="Dirección detallada"
                required
                error={errors.direccion?.message}
                hint="Incluye calle principal, secundaria, número y referencias visibles."
              >
                <Textarea
                  {...form.register('direccion')}
                  variant="clean"
                  placeholder="Ej: Av. Amazonas N24-03 y Roca, Edificio Quito Tower, oficina 502. Ref: frente al parque."
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

          {/* Sección: Código interno */}
          {!isEdit ? (
            <div className="flex items-start gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3 py-2 text-xs text-muted-foreground">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <p>
                El código interno se generará automáticamente con el formato{' '}
                <span className="font-mono text-foreground">ECU-…</span> al guardar.
              </p>
            </div>
          ) : (
            <FormSection
              icon={<Hash className="h-4 w-4" />}
              title="Código interno"
              description={
                hasConsignatariosOperarioPerm
                  ? 'Identificador único usado en guías y reportes. Puedes regenerarlo.'
                  : 'Identificador único de este consignatario.'
              }
            >
              {hasConsignatariosOperarioPerm ? (
                <FormField
                  label="Código"
                  error={errors.codigo?.message}
                  hint="Formato sugerido: ECU- seguido de un identificador legible."
                >
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        {...form.register('codigo')}
                        variant="clean"
                        placeholder="ECU-..."
                        className="pr-9 font-mono text-sm"
                        aria-invalid={Boolean(errors.codigo)}
                      />
                      {watchedCodigo?.trim() && (
                        <button
                          type="button"
                          onClick={handleCopiarCodigo}
                          className="absolute top-1/2 right-2 inline-flex -translate-y-1/2 items-center justify-center rounded p-1 text-muted-foreground transition-colors hover:bg-[var(--color-muted)] hover:text-foreground"
                          title={codigoCopied ? '¡Copiado!' : 'Copiar código'}
                          aria-label={codigoCopied ? 'Código copiado' : 'Copiar código'}
                        >
                          {codigoCopied ? (
                            <Check className="h-3.5 w-3.5 text-[var(--color-success)]" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleGenerarCodigo}
                      disabled={generatingCodigo || !puedeGenerarCodigo}
                      title={
                        !puedeGenerarCodigo
                          ? 'Completa nombre y cantón para generar un código.'
                          : 'Sugerir un nuevo código'
                      }
                    >
                      {generatingCodigo ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Sugerir
                        </>
                      )}
                    </Button>
                  </div>
                </FormField>
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-2 text-sm">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono text-sm text-foreground">
                    {consignatario?.codigo ?? '—'}
                  </span>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    Solo lectura
                  </span>
                </div>
              )}
            </FormSection>
          )}

          {/* Vista previa */}
          {previewVisible && (
            <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/15 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Info className="h-3 w-3" />
                Vista previa
              </div>
              <PreviewCard
                nombre={watchedNombre}
                codigo={watchedCodigo || consignatario?.codigo}
                telefono={watchedTelefono}
                direccion={watchedDireccion}
                provincia={watchedProvincia}
                canton={watchedCanton}
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
                'Crear consignatario'
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
  telefono?: string;
  direccion?: string;
  provincia?: string;
  canton?: string;
}

function PreviewCard({
  nombre,
  codigo,
  telefono,
  direccion,
  provincia,
  canton,
}: PreviewCardProps) {
  const ubicacion = [canton?.trim(), provincia?.trim()]
    .filter((v): v is string => Boolean(v))
    .join(', ');
  const nombreMostrar = nombre?.trim() || 'Sin nombre';
  const sinNombre = !nombre?.trim();

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)] text-muted-foreground">
          <UserRound className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p
              className={cn(
                'truncate text-sm font-medium',
                sinNombre ? 'italic text-muted-foreground' : 'text-foreground',
              )}
            >
              {nombreMostrar}
            </p>
            {codigo?.trim() && (
              <Badge
                variant="outline"
                className="h-5 rounded font-mono text-[11px] font-normal"
              >
                {codigo.trim()}
              </Badge>
            )}
          </div>
          {telefono?.trim() && (
            <p className="flex items-center gap-1.5 text-xs text-foreground">
              <Phone className="h-3 w-3 text-muted-foreground" />
              {telefono.trim()}
            </p>
          )}
          {(direccion?.trim() || ubicacion) && (
            <div className="flex items-start gap-1.5 text-xs">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                {direccion?.trim() && (
                  <p className="line-clamp-2 text-foreground">{direccion.trim()}</p>
                )}
                {ubicacion && (
                  <p className="text-muted-foreground">{ubicacion}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
