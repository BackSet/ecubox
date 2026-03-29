import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDestinatario, useCreateDestinatario, useUpdateDestinatario } from '@/hooks/useDestinatarios';
import { useDestinatarioOperario, useUpdateDestinatarioOperario } from '@/hooks/useOperarioDespachos';
import { sugerirCodigo } from '@/lib/api/destinatarios.service';
import { useAuthStore } from '@/stores/authStore';
import type { DestinatarioFinalRequest } from '@/types/destinatario';
import { PROVINCIAS_ECUADOR, getCantonesByProvincia } from '@/data/provincias-cantones-ecuador';
import { telefonoSchema } from '@/lib/validation';
import { onKeyDownNumeric, sanitizeNumeric } from '@/lib/inputFilters';
import { Loader2 } from 'lucide-react';

const inputClass = 'input-clean';

const formSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  telefono: telefonoSchema,
  direccion: z.string().min(1, 'La dirección es obligatoria'),
  provincia: z.string().min(1, 'La provincia es obligatoria'),
  canton: z.string().min(1, 'El cantón es obligatorio'),
  codigo: z
    .string()
    .optional()
    .refine((v) => !v || v.trim().length === 0 || v.trim().length >= 5, 'El código debe tener al menos 5 caracteres'),
});

type FormValues = z.infer<typeof formSchema>;

interface DestinatarioFormProps {
  id?: number;
  /** Si true, usa API de operario (lista completa) para cargar y actualizar */
  useOperarioApi?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DestinatarioForm({ id, useOperarioApi = false, onClose, onSuccess }: DestinatarioFormProps) {
  const isEdit = id != null;
  const [generatingCodigo, setGeneratingCodigo] = useState(false);
  const hasDestinatariosOperarioPerm = useAuthStore((s) => s.hasPermission('DESTINATARIOS_OPERARIO'));
  const useOpApi = Boolean(useOperarioApi && isEdit && id != null);
  const { data: destinatarioMis } = useDestinatario(id, !useOpApi);
  const { data: destinatarioOp } = useDestinatarioOperario(useOpApi ? id : undefined);
  const destinatario = useOpApi ? destinatarioOp : destinatarioMis;
  const createMutation = useCreateDestinatario();
  const updateMutation = useUpdateDestinatario();
  const updateOperarioMutation = useUpdateDestinatarioOperario();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
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
    if (isEdit && destinatario) {
      form.reset({
        nombre: destinatario.nombre,
        telefono: destinatario.telefono ?? '',
        direccion: destinatario.direccion ?? '',
        provincia: destinatario.provincia ?? '',
        canton: destinatario.canton ?? '',
        codigo: destinatario.codigo ?? '',
      });
    }
  }, [isEdit, destinatario, form]);

  async function handleGenerarCodigo() {
    setGeneratingCodigo(true);
    try {
      const nombre = form.getValues('nombre')?.trim() || '';
      const canton = form.getValues('canton')?.trim() || '';
      const data = await sugerirCodigo({
        nombre: nombre || undefined,
        canton: canton || undefined,
        excludeId: isEdit ? id : undefined,
      });
      form.setValue('codigo', data.codigo);
    } catch {
      toast.error('No se pudo generar el código');
    } finally {
      setGeneratingCodigo(false);
    }
  }

  async function onSubmit(values: FormValues) {
    const body: DestinatarioFinalRequest = {
      nombre: values.nombre.trim(),
      telefono: values.telefono.trim(),
      direccion: values.direccion.trim(),
      provincia: values.provincia.trim(),
      canton: values.canton.trim(),
    };
    if (isEdit && hasDestinatariosOperarioPerm && values.codigo?.trim()) {
      body.codigo = values.codigo.trim();
    }
    try {
      if (isEdit && id != null) {
        if (useOpApi) {
          await updateOperarioMutation.mutateAsync({ id, body });
        } else {
          await updateMutation.mutateAsync({ id, body });
        }
        toast.success('Destinatario actualizado');
      } else {
        await createMutation.mutateAsync(body);
        toast.success('Destinatario creado');
      }
      onSuccess();
    } catch {
      // Error ya manejado por toast en el interceptor o en la mutación
    }
  }

  const loading =
    createMutation.isPending || updateMutation.isPending || updateOperarioMutation.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar destinatario' : 'Nuevo destinatario'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifica los datos del destinatario.'
              : 'Completa los datos para registrar un nuevo destinatario.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <section className="space-y-4">
            <h3 className="text-sm font-medium text-[var(--color-foreground)]">Datos de contacto</h3>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                Nombre *
              </label>
              <input
                {...form.register('nombre')}
                className={inputClass}
                placeholder="Nombre del destinatario"
              />
              {form.formState.errors.nombre && (
                <p className="mt-1 text-sm text-[var(--color-destructive)]">
                  {form.formState.errors.nombre.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                Teléfono *
              </label>
              <input
                {...form.register('telefono')}
                value={form.watch('telefono') ?? ''}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                className={inputClass}
                placeholder="Teléfono"
                onKeyDown={onKeyDownNumeric}
                onChange={(e) => form.setValue('telefono', sanitizeNumeric(e.target.value), { shouldValidate: true })}
              />
              {form.formState.errors.telefono && (
                <p className="mt-1 text-sm text-[var(--color-destructive)]">
                  {form.formState.errors.telefono.message}
                </p>
              )}
            </div>
          </section>
          <section className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                Dirección *
              </label>
              <input
                {...form.register('direccion')}
                className={inputClass}
                placeholder="Calle principal, secundaria, referencias"
              />
              {form.formState.errors.direccion && (
                <p className="mt-1 text-sm text-[var(--color-destructive)]">
                  {form.formState.errors.direccion.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                  Provincia *
                </label>
                <select
                  {...form.register('provincia', {
                    onChange: () => form.setValue('canton', ''),
                  })}
                  className={inputClass}
                >
                  <option value="">Seleccione provincia</option>
                  {PROVINCIAS_ECUADOR.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                {form.formState.errors.provincia && (
                  <p className="mt-1 text-sm text-[var(--color-destructive)]">
                    {form.formState.errors.provincia.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                  Cantón *
                </label>
                <select
                  {...form.register('canton')}
                  className={inputClass}
                  disabled={!form.watch('provincia')}
                >
                  <option value="">Seleccione cantón</option>
                  {(() => {
                    const provincia = form.watch('provincia') ?? '';
                    const cantones = getCantonesByProvincia(provincia);
                    const valorActual = form.watch('canton')?.trim();
                    const incluyeValorActual =
                      valorActual && !cantones.some((c) => c === valorActual);
                    return (
                      <>
                        {cantones.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        {incluyeValorActual && (
                          <option value={valorActual}>{valorActual}</option>
                        )}
                      </>
                    );
                  })()}
                </select>
                {form.formState.errors.canton && (
                  <p className="mt-1 text-sm text-[var(--color-destructive)]">
                    {form.formState.errors.canton.message}
                  </p>
                )}
              </div>
            </div>
          </section>
          {!isEdit && (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              El código se generará automáticamente (formato ECU-...).
            </p>
          )}
          {isEdit && (
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              Código interno {hasDestinatariosOperarioPerm ? '' : '(solo lectura)'}
            </label>
            {hasDestinatariosOperarioPerm ? (
            <div className="flex gap-2">
              <input
                {...form.register('codigo')}
                className={inputClass + ' flex-1'}
                placeholder="ECU-... (mín. 5 caracteres)"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleGenerarCodigo}
                disabled={generatingCodigo}
              >
                {generatingCodigo ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  'Generar código'
                )}
              </Button>
            </div>
            ) : (
              <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-2 text-sm text-[var(--color-foreground)]">
                {destinatario?.codigo ?? '—'}
              </p>
            )}
            {form.formState.errors.codigo && (
              <p className="mt-1 text-sm text-[var(--color-destructive)]">
                {form.formState.errors.codigo.message}
              </p>
            )}
            {hasDestinatariosOperarioPerm && (
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                Solo operario y administrador pueden editar el código. Formato ECU- descriptivo único.
              </p>
            )}
          </div>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
