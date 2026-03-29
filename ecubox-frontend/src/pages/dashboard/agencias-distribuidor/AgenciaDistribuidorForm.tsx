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
  useAgenciaDistribuidorAdmin,
  useCreateAgenciaDistribuidor,
  useUpdateAgenciaDistribuidor,
} from '@/hooks/useAgenciasDistribuidorAdmin';
import { useDistribuidoresAdmin } from '@/hooks/useDistribuidoresAdmin';
import type { AgenciaDistribuidorRequest } from '@/types/despacho';
import { PROVINCIAS_ECUADOR, getCantonesByProvincia } from '@/data/provincias-cantones-ecuador';
import { onKeyDownNumericDecimal, sanitizeNumericDecimal } from '@/lib/inputFilters';

const formSchema = z.object({
  distribuidorId: z.number().refine((n) => n > 0, 'Seleccione un distribuidor'),
  direccion: z.string().optional(),
  provincia: z.string().optional(),
  canton: z.string().optional(),
  horarioAtencion: z.string().optional(),
  diasMaxRetiro: z
    .union([z.number().int().min(0, 'Los días máximos deben ser mayor o igual a 0'), z.nan()])
    .transform((n) => (Number.isNaN(n) ? undefined : n))
    .optional(),
  tarifa: z
    .union([z.number(), z.nan()])
    .transform((n) => (Number.isNaN(n) ? 0 : n))
    .pipe(z.number().min(0, 'La tarifa debe ser mayor o igual a 0')),
});

type FormValues = z.infer<typeof formSchema>;

interface AgenciaDistribuidorFormProps {
  id?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function AgenciaDistribuidorForm({ id, onClose, onSuccess }: AgenciaDistribuidorFormProps) {
  const isEdit = id != null;
  const { data: agencia } = useAgenciaDistribuidorAdmin(id);
  const { data: distribuidores = [] } = useDistribuidoresAdmin();
  const createMutation = useCreateAgenciaDistribuidor();
  const updateMutation = useUpdateAgenciaDistribuidor();
  const [tarifaInput, setTarifaInput] = useState('0');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
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
      } else {
        await createMutation.mutateAsync(body);
      }
      onSuccess();
    } catch {
      // Error manejado por toast en el interceptor o en la mutación
    }
  }

  const loading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar agencia de distribuidor' : 'Nueva agencia de distribuidor'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              Distribuidor *
            </label>
            <select
              {...form.register('distribuidorId', { valueAsNumber: true })}
              className="input-clean"
              disabled={isEdit}
            >
              <option value={0}>Seleccione distribuidor</option>
              {distribuidores.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre} ({d.codigo})
                </option>
              ))}
            </select>
            {form.formState.errors.distribuidorId && (
              <p className="mt-1 text-sm text-[var(--color-destructive)]">
                {form.formState.errors.distribuidorId.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              Dirección
            </label>
            <input
              {...form.register('direccion')}
              className="input-clean"
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
                className="input-clean"
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
                className="input-clean"
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
              className="input-clean min-h-[60px]"
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
              className="input-clean"
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
              Tarifa *
            </label>
            <input
              type="text"
              inputMode="decimal"
              {...form.register('tarifa')}
              value={tarifaInput}
              onKeyDown={(e) => onKeyDownNumericDecimal(e, tarifaInput)}
              onChange={(e) => {
                const s = sanitizeNumericDecimal(e.target.value);
                setTarifaInput(s);
                const n = s === '' || s === '.' ? NaN : Number(s);
                form.setValue('tarifa', n, { shouldValidate: true, shouldDirty: true });
              }}
              className="input-clean"
              placeholder="0.00"
            />
            {form.formState.errors.tarifa && (
              <p className="mt-1 text-sm text-[var(--color-destructive)]">
                {form.formState.errors.tarifa.message}
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
