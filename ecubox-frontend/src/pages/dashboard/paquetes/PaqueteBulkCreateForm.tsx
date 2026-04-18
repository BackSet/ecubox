import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, type UseFormSetValue } from 'react-hook-form';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Loader2,
  UserRound,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGuiasMaster, GUIAS_MASTER_QUERY_KEY } from '@/hooks/useGuiasMaster';
import { createPaquete } from '@/lib/api/paquetes.service';
import { actualizarGuiaMaster } from '@/lib/api/guias-master.service';
import { onKeyDownNumericDecimal, sanitizeNumericDecimal } from '@/lib/inputFilters';
import { lbsToKg, kgToLbs } from '@/lib/utils/weight';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import type { PaqueteCreateRequest } from '@/types/paquete';
import { GuiaMasterCombobox } from './GuiaMasterCombobox';

const optionalNumber = z
  .union([z.number(), z.nan()])
  .optional()
  .transform((v) => (typeof v === 'number' && Number.isNaN(v) ? undefined : v));

const itemSchema = z.object({
  contenido: z.string().min(1, 'El contenido es obligatorio'),
  pesoLbs: optionalNumber,
  pesoKg: optionalNumber,
  piezaNumero: optionalNumber,
});

const MAX_PAQUETES = 50;

const schema = z.object({
  guiaMasterId: z
    .union([z.number(), z.nan()])
    .optional()
    .transform((v) => (typeof v === 'number' && Number.isNaN(v) ? undefined : v))
    .refine((n): n is number => n != null && n > 0, { message: 'Selecciona una guía' }),
  cantidad: z
    .number({ error: 'Ingresa la cantidad' })
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 paquete')
    .max(MAX_PAQUETES, `Máximo ${MAX_PAQUETES} paquetes a la vez`),
  paquetes: z.array(itemSchema).min(1),
});

type FormValues = z.input<typeof schema>;

function emptyItem() {
  return {
    contenido: '',
    pesoLbs: undefined,
    pesoKg: undefined,
    piezaNumero: undefined,
  };
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function PaqueteBulkCreateForm({ onClose, onSuccess }: Props) {
  const hasPesoWrite = useAuthStore((s) => s.hasPermission('PAQUETES_PESO_WRITE'));
  const qc = useQueryClient();
  const { data: guiasMaster = [] } = useGuiasMaster();

  const [progreso, setProgreso] = useState<{ enviando: boolean; actual: number; total: number }>({
    enviando: false,
    actual: 0,
    total: 0,
  });
  const [activeIndex, setActiveIndex] = useState(0);

  const guiasSeleccionables = useMemo(
    () =>
      guiasMaster.filter((gm) => {
        if (gm.destinatarioFinalId == null) return false;
        const total = gm.totalPiezasEsperadas;
        const registradas = gm.piezasRegistradas ?? 0;
        // Si el total ya está definido y todas las piezas están registradas,
        // la guía no admite más paquetes.
        if (total != null && total > 0 && registradas >= total) return false;
        return true;
      }),
    [guiasMaster]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      guiaMasterId: undefined,
      cantidad: 1,
      paquetes: [emptyItem()],
    },
  });
  const { control, handleSubmit, watch, setValue, register, formState, trigger } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'paquetes' });

  const guiaMasterId = watch('guiaMasterId');
  const cantidad = watch('cantidad');

  const guiaSeleccionada = useMemo(
    () => guiasMaster.find((gm) => gm.id === guiaMasterId) ?? null,
    [guiasMaster, guiaMasterId]
  );
  const destinatarioId = guiaSeleccionada?.destinatarioFinalId ?? null;
  const destinatarioNombre = guiaSeleccionada?.destinatarioNombre ?? null;
  const piezasRegistradas = guiaSeleccionada?.piezasRegistradas ?? 0;
  const totalEsperadas = guiaSeleccionada?.totalPiezasEsperadas ?? null;
  const cupoRestante =
    totalEsperadas != null ? Math.max(0, totalEsperadas - piezasRegistradas) : null;

  // Sincronizar el array de paquetes con la cantidad solicitada (sin cap por cupo).
  useEffect(() => {
    const target = Math.max(
      1,
      Math.min(typeof cantidad === 'number' && !Number.isNaN(cantidad) ? cantidad : 1, MAX_PAQUETES)
    );
    if (fields.length < target) {
      for (let i = fields.length; i < target; i++) append(emptyItem());
    } else if (fields.length > target) {
      for (let i = fields.length - 1; i >= target; i--) remove(i);
    }
  }, [cantidad, fields.length, append, remove]);

  // Mantener el índice activo dentro del rango.
  useEffect(() => {
    if (activeIndex > fields.length - 1) {
      setActiveIndex(Math.max(0, fields.length - 1));
    }
  }, [fields.length, activeIndex]);

  const excedeCupo = cupoRestante != null && fields.length > cupoRestante;

  async function handleNext() {
    const ok = await trigger(`paquetes.${activeIndex}.contenido` as const);
    if (!ok) return;
    if (activeIndex < fields.length - 1) setActiveIndex(activeIndex + 1);
  }

  function handlePrev() {
    if (activeIndex > 0) setActiveIndex(activeIndex - 1);
  }

  function handleAddOne() {
    append(emptyItem());
    setValue('cantidad', fields.length + 1, { shouldValidate: true });
    setActiveIndex(fields.length); // saltar al recién creado
  }

  function handleRemoveCurrent() {
    if (fields.length <= 1) return;
    const idx = activeIndex;
    remove(idx);
    setValue('cantidad', fields.length - 1, { shouldValidate: true });
    setActiveIndex(Math.max(0, idx - 1));
  }

  async function onSubmit(values: FormValues) {
    if (destinatarioId == null) {
      toast.error('La guía seleccionada no tiene destinatario asignado');
      return;
    }
    const guiaId = values.guiaMasterId as number;
    const total = values.paquetes.length;
    setProgreso({ enviando: true, actual: 0, total });

    // Si la guía no tiene total esperado definido, establecerlo a la cantidad solicitada
    // (la primera vez). Si ya tiene total, no se sobreescribe.
    if (totalEsperadas == null) {
      try {
        await actualizarGuiaMaster(guiaId, { totalPiezasEsperadas: total });
      } catch {
        toast.error('No se pudo actualizar el total de piezas esperadas de la guía');
        setProgreso({ enviando: false, actual: 0, total: 0 });
        return;
      }
    }

    let creados = 0;
    let errorMsg: string | null = null;
    let errorIndex: number | null = null;

    for (let i = 0; i < values.paquetes.length; i++) {
      const item = values.paquetes[i];
      const body: PaqueteCreateRequest = {
        destinatarioFinalId: destinatarioId,
        guiaMasterId: guiaId,
        contenido: item.contenido?.trim() || undefined,
      };
      if (hasPesoWrite) {
        if (typeof item.pesoLbs === 'number' && !Number.isNaN(item.pesoLbs)) body.pesoLbs = item.pesoLbs;
        if (typeof item.pesoKg === 'number' && !Number.isNaN(item.pesoKg)) body.pesoKg = item.pesoKg;
        if (typeof item.piezaNumero === 'number' && !Number.isNaN(item.piezaNumero)) {
          body.piezaNumero = item.piezaNumero;
        }
      }
      try {
        await createPaquete(body);
        creados++;
        setProgreso((p) => ({ ...p, actual: creados }));
      } catch (err: unknown) {
        const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
        errorMsg = res?.data?.message?.trim() || `Error al registrar el paquete ${i + 1}`;
        errorIndex = i;
        break;
      }
    }

    qc.invalidateQueries({ queryKey: ['paquetes'] });
    qc.invalidateQueries({ queryKey: GUIAS_MASTER_QUERY_KEY });
    setProgreso({ enviando: false, actual: 0, total: 0 });

    if (errorMsg) {
      toast.error(`Se registraron ${creados} de ${total}. ${errorMsg}`);
      if (creados > 0 && errorIndex != null) {
        const restantes = values.paquetes.slice(errorIndex);
        setValue('paquetes', restantes);
        setValue('cantidad', restantes.length);
        setActiveIndex(0);
      }
    } else {
      toast.success(creados === 1 ? 'Paquete registrado' : `${creados} paquetes registrados`);
      onSuccess();
    }
  }

  const enviando = progreso.enviando;
  const sinGuiasDisponibles = guiasSeleccionables.length === 0;
  const canPrev = activeIndex > 0 && !enviando;
  const canNext = activeIndex < fields.length - 1 && !enviando;

  return (
    <Dialog open onOpenChange={(open) => !open && !enviando && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar paquetes</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="guia-master-combobox"
                className="mb-1 block text-sm font-medium text-[var(--color-foreground)]"
              >
                Guía *
              </label>
              <GuiaMasterCombobox
                id="guia-master-combobox"
                value={typeof guiaMasterId === 'number' ? guiaMasterId : undefined}
                onChange={(id) =>
                  setValue('guiaMasterId', id, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                options={guiasSeleccionables}
                disabled={sinGuiasDisponibles || enviando}
                emptyMessage="No se encontraron guías con ese criterio"
              />
              {formState.errors.guiaMasterId && (
                <p className="mt-1 text-sm text-[var(--color-destructive)]">
                  {formState.errors.guiaMasterId.message as string}
                </p>
              )}
              {sinGuiasDisponibles && (
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  No hay guías con destinatario asignado. Crea o asigna un destinatario en la guía
                  antes de registrar paquetes.
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                Cantidad *
              </label>
              <Input
                type="number"
                min={1}
                max={MAX_PAQUETES}
                {...register('cantidad', { valueAsNumber: true })}
                variant="clean"
                className="input-clean"
                disabled={!guiaMasterId || enviando}
              />
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                {cupoRestante != null
                  ? `Cupo declarado en la guía: ${cupoRestante}`
                  : `Hasta ${MAX_PAQUETES} por lote`}
              </p>
              {formState.errors.cantidad && (
                <p className="mt-1 text-sm text-[var(--color-destructive)]">
                  {formState.errors.cantidad.message as string}
                </p>
              )}
            </div>
          </div>

          {destinatarioNombre && (
            <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-2 text-sm">
              <UserRound className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
              <div className="min-w-0">
                <p className="text-xs text-[var(--color-muted-foreground)]">Destinatario</p>
                <p className="truncate font-medium text-[var(--color-foreground)]">
                  {destinatarioNombre}
                </p>
              </div>
            </div>
          )}

          {excedeCupo && (
            <div className="flex items-start gap-2 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-3 py-2 text-xs text-[var(--color-warning)] dark:border-[var(--color-warning)]/30 dark:bg-[var(--color-warning)]/10 dark:text-[var(--color-warning)]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Vas a registrar {fields.length} paquetes pero la guía declara solo {cupoRestante} cupo
                restante. Se permitirá, pero verifica que el total esperado de la guía sea correcto.
              </span>
            </div>
          )}

          {guiaMasterId != null && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                  Paquete {activeIndex + 1} de {fields.length}
                </h3>
                <div className="flex items-center gap-2">
                  {fields.length > 1 && !enviando && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveCurrent}
                      className="h-8 px-2 text-[var(--color-destructive)] hover:text-[var(--color-destructive)]"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Quitar
                    </Button>
                  )}
                  {fields.length < MAX_PAQUETES && !enviando && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddOne}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Añadir uno más
                    </Button>
                  )}
                </div>
              </div>

              <div className="relative min-h-[280px]">
                {fields.map((field, index) => (
                  <div key={field.id} className={cn(index === activeIndex ? 'block' : 'hidden')}>
                    <BulkPaqueteItem
                      index={index}
                      setValue={setValue}
                      register={register}
                      hasPesoWrite={hasPesoWrite}
                      errors={formState.errors.paquetes?.[index]}
                      disabled={enviando}
                    />
                  </div>
                ))}
              </div>

              <CarouselNav
                count={fields.length}
                activeIndex={activeIndex}
                onJump={(i) => setActiveIndex(i)}
                onPrev={handlePrev}
                onNext={handleNext}
                canPrev={canPrev}
                canNext={canNext}
              />
            </div>
          )}

          {enviando && (
            <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Registrando paquete {progreso.actual + (progreso.actual < progreso.total ? 1 : 0)} de{' '}
              {progreso.total}…
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={enviando}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={enviando || sinGuiasDisponibles || guiaMasterId == null}
            >
              {enviando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando…
                </>
              ) : fields.length === 1 ? (
                'Registrar paquete'
              ) : (
                `Registrar ${fields.length} paquetes`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CarouselNavProps {
  count: number;
  activeIndex: number;
  onJump: (i: number) => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}

function CarouselNav({
  count,
  activeIndex,
  onJump,
  onPrev,
  onNext,
  canPrev,
  canNext,
}: CarouselNavProps) {
  return (
    <div className="space-y-2 pt-1">
      <div
        className="flex flex-wrap items-center justify-center gap-1.5"
        role="tablist"
        aria-label="Paquetes"
      >
        {Array.from({ length: count }).map((_, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Ir al paquete ${i + 1}`}
              onClick={() => onJump(i)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                isActive
                  ? 'w-8 bg-[var(--color-primary)]'
                  : 'w-5 bg-[var(--color-muted-foreground)]/30 hover:bg-[var(--color-muted-foreground)]/60'
              )}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onPrev}
          disabled={!canPrev}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Anterior
        </Button>
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {activeIndex + 1} / {count}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onNext}
          disabled={!canNext}
        >
          Siguiente
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface BulkPaqueteItemProps {
  index: number;
  setValue: UseFormSetValue<FormValues>;
  register: ReturnType<typeof useForm<FormValues>>['register'];
  hasPesoWrite: boolean;
  errors?: {
    contenido?: { message?: string };
    pesoLbs?: { message?: string };
    pesoKg?: { message?: string };
    piezaNumero?: { message?: string };
  };
  disabled?: boolean;
}

function BulkPaqueteItem({
  index,
  setValue,
  register,
  hasPesoWrite,
  errors,
  disabled,
}: BulkPaqueteItemProps) {
  const [pesoLbsInput, setPesoLbsInput] = useState('');
  const [pesoKgInput, setPesoKgInput] = useState('');

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3 space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
          Contenido *
        </label>
        <Input
          {...register(`paquetes.${index}.contenido` as const)}
          variant="clean"
          className="input-clean"
          placeholder="Descripción del contenido"
          disabled={disabled}
        />
        {errors?.contenido?.message && (
          <p className="mt-1 text-sm text-[var(--color-destructive)]">{errors.contenido.message}</p>
        )}
      </div>

      {hasPesoWrite && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                Peso lbs
              </label>
              <Input
                type="text"
                inputMode="decimal"
                value={pesoLbsInput}
                onKeyDown={(e) => onKeyDownNumericDecimal(e, pesoLbsInput)}
                onChange={(e) => {
                  const s = sanitizeNumericDecimal(e.target.value);
                  setPesoLbsInput(s);
                  const n = s === '' || s === '.' ? undefined : Number(s);
                  setValue(`paquetes.${index}.pesoLbs`, n, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                  if (typeof n === 'number' && !Number.isNaN(n) && n >= 0) {
                    const kg = lbsToKg(n);
                    setValue(`paquetes.${index}.pesoKg`, kg, { shouldDirty: true });
                    setPesoKgInput(String(kg));
                  } else {
                    setValue(`paquetes.${index}.pesoKg`, undefined, { shouldDirty: true });
                    setPesoKgInput('');
                  }
                }}
                variant="clean"
                className="input-clean"
                placeholder="0"
                disabled={disabled}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                Peso kg
              </label>
              <Input
                type="text"
                inputMode="decimal"
                value={pesoKgInput}
                onKeyDown={(e) => onKeyDownNumericDecimal(e, pesoKgInput)}
                onChange={(e) => {
                  const s = sanitizeNumericDecimal(e.target.value);
                  setPesoKgInput(s);
                  const n = s === '' || s === '.' ? undefined : Number(s);
                  setValue(`paquetes.${index}.pesoKg`, n, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                  if (typeof n === 'number' && !Number.isNaN(n) && n >= 0) {
                    const lbs = kgToLbs(n);
                    setValue(`paquetes.${index}.pesoLbs`, lbs, { shouldDirty: true });
                    setPesoLbsInput(String(lbs));
                  } else {
                    setValue(`paquetes.${index}.pesoLbs`, undefined, { shouldDirty: true });
                    setPesoLbsInput('');
                  }
                }}
                variant="clean"
                className="input-clean"
                placeholder="0"
                disabled={disabled}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              Pieza N° (opcional)
            </label>
            <Input
              type="number"
              min={1}
              {...register(`paquetes.${index}.piezaNumero` as const, { valueAsNumber: true })}
              variant="clean"
              className="input-clean"
              placeholder="Auto"
              disabled={disabled}
            />
          </div>
        </>
      )}
    </div>
  );
}
