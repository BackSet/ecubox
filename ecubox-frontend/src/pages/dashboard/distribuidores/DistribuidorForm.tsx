import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  useDistribuidorAdmin,
  useCreateDistribuidor,
  useUpdateDistribuidor,
} from '@/hooks/useDistribuidoresAdmin';
import type { DistribuidorRequest } from '@/types/despacho';
import { emailOpcionalSchema } from '@/lib/validation';
import { onKeyDownNumericDecimal, sanitizeNumericDecimal } from '@/lib/inputFilters';

const tarifaSchema = z
  .union([z.number(), z.nan()])
  .transform((n) => (Number.isNaN(n) ? 0 : n))
  .pipe(z.number().min(0, 'La tarifa debe ser mayor o igual a 0'));

const formSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  codigo: z.string().min(1, 'El código es obligatorio'),
  email: emailOpcionalSchema,
  horarioReparto: z.string().optional(),
  paginaTracking: z
    .string()
    .optional()
    .refine(
      (v) => !v || v.trim() === '' || /^https?:\/\/.+/i.test(v.trim()),
      { message: 'La página de tracking debe iniciar con http:// o https://' }
    ),
  diasMaxRetiroDomicilio: z
    .union([z.number().int().min(0, 'Los días máximos deben ser mayor o igual a 0'), z.nan()])
    .transform((n) => (Number.isNaN(n) ? undefined : n))
    .optional(),
  tarifaEnvio: tarifaSchema,
});

type FormValues = z.infer<typeof formSchema>;

interface DistribuidorFormProps {
  id?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function DistribuidorForm({ id, onClose, onSuccess }: DistribuidorFormProps) {
  const isEdit = id != null;
  const { data: distribuidor } = useDistribuidorAdmin(id);
  const createMutation = useCreateDistribuidor();
  const updateMutation = useUpdateDistribuidor();
  const [tarifaEnvioInput, setTarifaEnvioInput] = useState('0');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
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
    if (isEdit && distribuidor) {
      form.reset({
        nombre: distribuidor.nombre,
        codigo: distribuidor.codigo,
        email: distribuidor.email ?? '',
        horarioReparto: distribuidor.horarioReparto ?? '',
        paginaTracking: distribuidor.paginaTracking ?? '',
        diasMaxRetiroDomicilio: distribuidor.diasMaxRetiroDomicilio ?? undefined,
        tarifaEnvio: distribuidor.tarifaEnvio ?? 0,
      });
      setTarifaEnvioInput(String(distribuidor.tarifaEnvio ?? 0));
    } else if (!isEdit) {
      setTarifaEnvioInput('0');
    }
  }, [isEdit, distribuidor, form]);

  async function onSubmit(values: FormValues) {
    const body: DistribuidorRequest = {
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
      } else {
        await createMutation.mutateAsync(body);
      }
      onSuccess();
    } catch {
      // Error ya manejado por toast en el interceptor o en la mutación
    }
  }

  const loading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar distribuidor' : 'Nuevo distribuidor'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              Nombre *
            </label>
            <input
              {...form.register('nombre')}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder="Nombre del distribuidor"
            />
            {form.formState.errors.nombre && (
              <p className="mt-1 text-sm text-[var(--color-destructive)]">
                {form.formState.errors.nombre.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              Código *
            </label>
            <input
              {...form.register('codigo')}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder="Código único"
            />
            {form.formState.errors.codigo && (
              <p className="mt-1 text-sm text-[var(--color-destructive)]">
                {form.formState.errors.codigo.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              Email
            </label>
            <input
              type="email"
              {...form.register('email')}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              Horario
            </label>
            <textarea
              {...form.register('horarioReparto')}
              rows={3}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder="Ej: Lunes a Viernes 08:00 - 17:00"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              Página de tracking
            </label>
            <input
              type="url"
              {...form.register('paginaTracking')}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder="https://tracking.distribuidor.com/guia"
            />
            {form.formState.errors.paginaTracking && (
              <p className="mt-1 text-sm text-[var(--color-destructive)]">
                {form.formState.errors.paginaTracking.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              Días máx. retiro (domicilio)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              {...form.register('diasMaxRetiroDomicilio', {
                setValueAs: (v) => (v === '' ? NaN : Number(v)),
              })}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder="Ej: 3"
            />
            {form.formState.errors.diasMaxRetiroDomicilio && (
              <p className="mt-1 text-sm text-[var(--color-destructive)]">
                {form.formState.errors.diasMaxRetiroDomicilio.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              Tarifa de envío *
            </label>
            <input
              type="text"
              inputMode="decimal"
              {...form.register('tarifaEnvio')}
              value={tarifaEnvioInput}
              onKeyDown={(e) => onKeyDownNumericDecimal(e, tarifaEnvioInput)}
              onChange={(e) => {
                const s = sanitizeNumericDecimal(e.target.value);
                setTarifaEnvioInput(s);
                const n = s === '' || s === '.' ? NaN : Number(s);
                form.setValue('tarifaEnvio', n, { shouldValidate: true, shouldDirty: true });
              }}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder="0.00"
            />
            {form.formState.errors.tarifaEnvio && (
              <p className="mt-1 text-sm text-[var(--color-destructive)]">
                {form.formState.errors.tarifaEnvio.message}
              </p>
            )}
          </div>
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
