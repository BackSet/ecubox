import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
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
  useAgencia,
  useCreateAgencia,
  useUpdateAgencia,
} from '@/hooks/useAgencias';
import type { AgenciaRequest } from '@/types/despacho';
import { PROVINCIAS_ECUADOR, getCantonesByProvincia } from '@/data/provincias-cantones-ecuador';
import { onKeyDownNumericDecimal, sanitizeNumericDecimal } from '@/lib/inputFilters';

const formSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  encargado: z.string().optional(),
  codigo: z.string().min(1, 'El código es obligatorio'),
  direccion: z.string().optional(),
  provincia: z.string().optional(),
  canton: z.string().optional(),
  horarioAtencion: z.string().optional(),
  diasMaxRetiro: z
    .union([z.number().int().min(0, 'Los días máximos deben ser mayor o igual a 0'), z.nan()])
    .transform((n) => (Number.isNaN(n) ? undefined : n))
    .optional(),
  tarifaServicio: z
    .union([z.number(), z.nan()])
    .transform((n) => (Number.isNaN(n) ? 0 : n))
    .pipe(z.number().min(0, 'La tarifa debe ser mayor o igual a 0')),
});

type FormValues = z.infer<typeof formSchema>;

interface AgenciaFormProps {
  id?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function AgenciaForm({ id, onClose, onSuccess }: AgenciaFormProps) {
  const isEdit = id != null;
  const { data: agencia } = useAgencia(id);
  const createMutation = useCreateAgencia();
  const updateMutation = useUpdateAgencia();
  const [tarifaServicioInput, setTarifaServicioInput] = useState('0');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: '',
      encargado: '',
      codigo: '',
      direccion: '',
      provincia: '',
      canton: '',
      horarioAtencion: '',
      diasMaxRetiro: undefined,
      tarifaServicio: 0,
    },
  });

  useEffect(() => {
    if (isEdit && agencia) {
      form.reset({
        nombre: agencia.nombre,
        encargado: agencia.encargado ?? '',
        codigo: agencia.codigo,
        direccion: agencia.direccion ?? '',
        provincia: agencia.provincia ?? '',
        canton: agencia.canton ?? '',
        horarioAtencion: agencia.horarioAtencion ?? '',
        diasMaxRetiro: agencia.diasMaxRetiro ?? undefined,
        tarifaServicio: agencia.tarifaServicio ?? 0,
      });
      setTarifaServicioInput(String(agencia.tarifaServicio ?? 0));
    } else if (!isEdit) {
      setTarifaServicioInput('0');
    }
  }, [isEdit, agencia, form]);

  async function onSubmit(values: FormValues) {
    const body: AgenciaRequest = {
      nombre: values.nombre.trim(),
      encargado: values.encargado?.trim() || undefined,
      codigo: values.codigo.trim(),
      direccion: values.direccion?.trim() || undefined,
      provincia: values.provincia?.trim() || undefined,
      canton: values.canton?.trim() || undefined,
      horarioAtencion: values.horarioAtencion?.trim() || undefined,
      diasMaxRetiro: values.diasMaxRetiro,
      tarifaServicio: Number(values.tarifaServicio),
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
          <DialogTitle>{isEdit ? 'Editar agencia' : 'Nueva agencia'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              Nombre *
            </label>
            <input
              {...form.register('nombre')}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder="Nombre de la agencia"
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
              Encargado
            </label>
            <input
              {...form.register('encargado')}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder="Nombre del encargado"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              Dirección
            </label>
            <input
              {...form.register('direccion')}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder="Calle, número, referencias"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                Provincia
              </label>
              <select
                {...form.register('provincia', {
                  onChange: () => form.setValue('canton', ''),
                })}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              >
                <option value="">Seleccione provincia</option>
                {PROVINCIAS_ECUADOR.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                Cantón
              </label>
              <select
                {...form.register('canton')}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
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
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              Horario de atención
            </label>
            <textarea
              {...form.register('horarioAtencion')}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm min-h-[60px]"
              placeholder="Ej: Lunes a Viernes 8:00 - 18:00"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              Días máx. retiro
            </label>
            <input
              type="number"
              min={0}
              step={1}
              {...form.register('diasMaxRetiro', {
                setValueAs: (v) => (v === '' ? NaN : Number(v)),
              })}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder="Ej: 7"
            />
            {form.formState.errors.diasMaxRetiro && (
              <p className="mt-1 text-sm text-[var(--color-destructive)]">
                {form.formState.errors.diasMaxRetiro.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              Tarifa servicio *
            </label>
            <Controller
              control={form.control}
              name="tarifaServicio"
              render={({ field }) => (
                <input
                  type="text"
                  inputMode="decimal"
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={tarifaServicioInput}
                  onKeyDown={(e) => onKeyDownNumericDecimal(e, tarifaServicioInput)}
                  onChange={(e) => {
                    const s = sanitizeNumericDecimal(e.target.value);
                    setTarifaServicioInput(s);
                    const n = s === '' || s === '.' ? NaN : Number(s);
                    field.onChange(n);
                  }}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                  placeholder="0.00"
                />
              )}
            />
            {form.formState.errors.tarifaServicio && (
              <p className="mt-1 text-sm text-[var(--color-destructive)]">
                {form.formState.errors.tarifaServicio.message}
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
