import { useEffect, useMemo, useRef, useState } from 'react';
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
  RotateCcw,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGuiasMaster, useGuiaMaster, GUIAS_MASTER_QUERY_KEY } from '@/hooks/useGuiasMaster';
import { listarPiezasDeGuiaMaster } from '@/lib/api/guias-master.service';
import {
  createPaquete,
  updatePaquete,
  deletePaquete,
} from '@/lib/api/paquetes.service';
import { actualizarGuiaMaster } from '@/lib/api/guias-master.service';
import { onKeyDownNumericDecimal, sanitizeNumericDecimal } from '@/lib/inputFilters';
import { lbsToKg, kgToLbs } from '@/lib/utils/weight';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import type { Paquete, PaqueteCreateRequest, PaqueteUpdateRequest } from '@/types/paquete';
import { GuiaMasterCombobox } from './GuiaMasterCombobox';

const optionalNumber = z
  .union([z.number(), z.nan()])
  .optional()
  .transform((v) => (typeof v === 'number' && Number.isNaN(v) ? undefined : v));

const itemSchema = z.object({
  // id presente => paquete existente (modo edit). Sin id => nuevo paquete.
  id: z.number().optional(),
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
type PaqueteItemValues = FormValues['paquetes'][number];

function emptyItem(): PaqueteItemValues {
  return {
    id: undefined,
    contenido: '',
    pesoLbs: undefined,
    pesoKg: undefined,
    piezaNumero: undefined,
  };
}

function paqueteToItem(p: Paquete): PaqueteItemValues {
  return {
    id: p.id,
    contenido: p.contenido ?? '',
    pesoLbs: p.pesoLbs != null ? Number(p.pesoLbs) : undefined,
    pesoKg: p.pesoKg != null ? Number(p.pesoKg) : undefined,
    piezaNumero: p.piezaNumero != null ? Number(p.piezaNumero) : undefined,
  };
}

interface OriginalSnapshot {
  contenido: string;
  pesoLbs: number | undefined;
  pesoKg: number | undefined;
  piezaNumero: number | undefined;
}

function snapshotOf(item: PaqueteItemValues): OriginalSnapshot {
  return {
    contenido: (item.contenido ?? '').trim(),
    pesoLbs:
      typeof item.pesoLbs === 'number' && !Number.isNaN(item.pesoLbs)
        ? item.pesoLbs
        : undefined,
    pesoKg:
      typeof item.pesoKg === 'number' && !Number.isNaN(item.pesoKg)
        ? item.pesoKg
        : undefined,
    piezaNumero:
      typeof item.piezaNumero === 'number' && !Number.isNaN(item.piezaNumero)
        ? item.piezaNumero
        : undefined,
  };
}

function snapshotsEqual(a: OriginalSnapshot, b: OriginalSnapshot): boolean {
  return (
    a.contenido === b.contenido &&
    a.pesoLbs === b.pesoLbs &&
    a.pesoKg === b.pesoKg &&
    a.piezaNumero === b.piezaNumero
  );
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  /**
   * Si se pasa un id de guía master, el formulario entra en modo "editar
   * paquetes de la guía": precarga los paquetes existentes para que el
   * operario pueda modificarlos, eliminarlos o añadir piezas faltantes,
   * y al guardar solo aplica los cambios detectados (creates/updates/deletes
   * + ajuste del total esperado de la guía si se cambió la cantidad).
   */
  editGuiaMasterId?: number;
}

export function PaqueteBulkCreateForm({
  onClose,
  onSuccess,
  editGuiaMasterId,
}: Props) {
  const isEditMode = editGuiaMasterId != null;
  const hasPesoWrite = useAuthStore((s) => s.hasPermission('PAQUETES_PESO_WRITE'));
  const hasPaquetesUpdate = useAuthStore((s) => s.hasPermission('PAQUETES_UPDATE'));
  const hasPaquetesDelete = useAuthStore((s) => s.hasPermission('PAQUETES_DELETE'));
  const qc = useQueryClient();
  const { data: guiasMaster = [] } = useGuiasMaster();
  // En modo edición forzamos refetch del detalle para tener los contadores
  // actuales aunque la lista global esté cacheada.
  const { data: guiaEdit } = useGuiaMaster(isEditMode ? editGuiaMasterId : null);

  const [progreso, setProgreso] = useState<{
    enviando: boolean;
    actual: number;
    total: number;
    fase: 'crear' | 'actualizar' | 'eliminar' | null;
  }>({
    enviando: false,
    actual: 0,
    total: 0,
    fase: null,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [cargandoExistentes, setCargandoExistentes] = useState(isEditMode);
  // Snapshot inicial por id, para detectar cambios en items existentes.
  const originalsRef = useRef<Map<number, OriginalSnapshot>>(new Map());
  // Ids de paquetes existentes que el operario marcó para borrar.
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  // Cantidad inicial de piezas en modo edit (para detectar cambio de total).
  const initialCantidadRef = useRef<number | null>(null);
  const initialTotalEsperadasRef = useRef<number | null>(null);

  const guiasSeleccionables = useMemo(
    () =>
      guiasMaster.filter((gm) => {
        if (gm.destinatarioFinalId == null) return false;
        if (isEditMode) return true; // en edición no filtramos
        const total = gm.totalPiezasEsperadas;
        const registradas = gm.piezasRegistradas ?? 0;
        if (total != null && total > 0 && registradas >= total) return false;
        return true;
      }),
    [guiasMaster, isEditMode],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      guiaMasterId: editGuiaMasterId,
      cantidad: 1,
      paquetes: [emptyItem()],
    },
  });
  const { control, handleSubmit, watch, setValue, register, formState, trigger, reset, getValues } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'paquetes' });

  const guiaMasterId = watch('guiaMasterId');
  const cantidad = watch('cantidad');

  const guiaSeleccionada = useMemo(() => {
    if (guiaEdit && guiaEdit.id === guiaMasterId) return guiaEdit;
    return guiasMaster.find((gm) => gm.id === guiaMasterId) ?? null;
  }, [guiasMaster, guiaEdit, guiaMasterId]);
  const destinatarioId = guiaSeleccionada?.destinatarioFinalId ?? null;
  const destinatarioNombre = guiaSeleccionada?.destinatarioNombre ?? null;
  const piezasRegistradas = guiaSeleccionada?.piezasRegistradas ?? 0;
  const totalEsperadas = guiaSeleccionada?.totalPiezasEsperadas ?? null;
  const cupoRestante =
    totalEsperadas != null ? Math.max(0, totalEsperadas - piezasRegistradas) : null;

  // ----- Modo edición: precargar las piezas existentes una vez -----
  useEffect(() => {
    if (!isEditMode || editGuiaMasterId == null) return;
    let cancelado = false;
    setCargandoExistentes(true);
    listarPiezasDeGuiaMaster(editGuiaMasterId)
      .then((piezas) => {
        if (cancelado) return;
        const sorted = [...piezas].sort((a, b) => {
          const pa = a.piezaNumero ?? Number.MAX_SAFE_INTEGER;
          const pb = b.piezaNumero ?? Number.MAX_SAFE_INTEGER;
          if (pa !== pb) return pa - pb;
          return a.id - b.id;
        });
        const items = sorted.length > 0 ? sorted.map(paqueteToItem) : [emptyItem()];
        const snap = new Map<number, OriginalSnapshot>();
        for (const it of items) {
          if (it.id != null) snap.set(it.id, snapshotOf(it));
        }
        originalsRef.current = snap;
        initialCantidadRef.current = sorted.length;
        reset({
          guiaMasterId: editGuiaMasterId,
          cantidad: items.length,
          paquetes: items,
        });
        setActiveIndex(0);
        setRemovedIds([]);
      })
      .catch(() => {
        toast.error('No se pudieron cargar las piezas de la guía');
      })
      .finally(() => {
        if (!cancelado) setCargandoExistentes(false);
      });
    return () => {
      cancelado = true;
    };
  }, [isEditMode, editGuiaMasterId, reset]);

  // Guarda el total esperado inicial para diff.
  useEffect(() => {
    if (isEditMode && guiaSeleccionada && initialTotalEsperadasRef.current == null) {
      initialTotalEsperadasRef.current = guiaSeleccionada.totalPiezasEsperadas ?? null;
    }
  }, [isEditMode, guiaSeleccionada]);

  // ----- Sincronizar el array con la cantidad en modo CREATE -----
  // En modo edit la cantidad la maneja directamente el array (botones +/-),
  // así que no autocompletamos con vacíos al cambiar el input.
  useEffect(() => {
    if (isEditMode) return;
    const target = Math.max(
      1,
      Math.min(
        typeof cantidad === 'number' && !Number.isNaN(cantidad) ? cantidad : 1,
        MAX_PAQUETES,
      ),
    );
    if (fields.length < target) {
      for (let i = fields.length; i < target; i++) append(emptyItem());
    } else if (fields.length > target) {
      for (let i = fields.length - 1; i >= target; i--) remove(i);
    }
  }, [cantidad, fields.length, append, remove, isEditMode]);

  useEffect(() => {
    if (activeIndex > fields.length - 1) {
      setActiveIndex(Math.max(0, fields.length - 1));
    }
  }, [fields.length, activeIndex]);

  const excedeCupo =
    !isEditMode && cupoRestante != null && fields.length > cupoRestante;

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
    setActiveIndex(fields.length);
  }

  function handleRemoveCurrent() {
    if (fields.length <= 1) return;
    const idx = activeIndex;
    const current = fields[idx] as PaqueteItemValues & { id?: number };
    const currentValues = getValues(`paquetes.${idx}` as const);
    const id = currentValues?.id ?? current?.id;
    if (id != null) {
      setRemovedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
    remove(idx);
    setValue('cantidad', fields.length - 1, { shouldValidate: true });
    setActiveIndex(Math.max(0, idx - 1));
  }

  // ----- Diff en modo edit -----
  const watchedItems = watch('paquetes');
  const diff = useMemo(() => {
    if (!isEditMode) {
      return { creates: 0, updates: 0, deletes: 0, totalChanged: false };
    }
    let creates = 0;
    let updates = 0;
    for (const item of watchedItems ?? []) {
      if (item.id == null) {
        creates += 1;
        continue;
      }
      const orig = originalsRef.current.get(item.id);
      if (!orig) continue;
      if (!snapshotsEqual(orig, snapshotOf(item))) updates += 1;
    }
    const newCantidad = (watchedItems?.length ?? 0);
    const baseTotal = initialTotalEsperadasRef.current;
    const totalChanged = baseTotal == null ? newCantidad > 0 : baseTotal !== newCantidad;
    return { creates, updates, deletes: removedIds.length, totalChanged };
  }, [isEditMode, watchedItems, removedIds]);

  const sinCambios =
    isEditMode &&
    diff.creates === 0 &&
    diff.updates === 0 &&
    diff.deletes === 0 &&
    !diff.totalChanged;

  async function onSubmitCreate(values: FormValues) {
    if (destinatarioId == null) {
      toast.error('La guía seleccionada no tiene destinatario asignado');
      return;
    }
    const guiaId = values.guiaMasterId as number;
    const total = values.paquetes.length;
    setProgreso({ enviando: true, actual: 0, total, fase: 'crear' });

    if (totalEsperadas == null) {
      try {
        await actualizarGuiaMaster(guiaId, { totalPiezasEsperadas: total });
      } catch {
        toast.error('No se pudo actualizar el total de piezas esperadas de la guía');
        setProgreso({ enviando: false, actual: 0, total: 0, fase: null });
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
    setProgreso({ enviando: false, actual: 0, total: 0, fase: null });

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

  async function onSubmitEdit(values: FormValues) {
    if (destinatarioId == null) {
      toast.error('La guía no tiene destinatario asignado');
      return;
    }
    const guiaId = values.guiaMasterId as number;

    const itemsACrear: { item: PaqueteItemValues; index: number }[] = [];
    const itemsAActualizar: { item: PaqueteItemValues; orig: OriginalSnapshot }[] = [];
    for (let i = 0; i < values.paquetes.length; i++) {
      const item = values.paquetes[i];
      if (item.id == null) {
        itemsACrear.push({ item, index: i });
      } else {
        const orig = originalsRef.current.get(item.id);
        if (orig && !snapshotsEqual(orig, snapshotOf(item))) {
          itemsAActualizar.push({ item, orig });
        }
      }
    }

    const idsAEliminar = [...removedIds];
    const totalChanged =
      initialTotalEsperadasRef.current == null
        ? values.paquetes.length > 0
        : initialTotalEsperadasRef.current !== values.paquetes.length;

    if (
      itemsACrear.length === 0 &&
      itemsAActualizar.length === 0 &&
      idsAEliminar.length === 0 &&
      !totalChanged
    ) {
      toast.info('No hay cambios que guardar');
      return;
    }

    if (idsAEliminar.length > 0 && !hasPaquetesDelete) {
      toast.error('No tienes permisos para eliminar paquetes');
      return;
    }
    if (itemsAActualizar.length > 0 && !hasPaquetesUpdate) {
      toast.error('No tienes permisos para editar paquetes');
      return;
    }

    const totalOps =
      itemsACrear.length +
      itemsAActualizar.length +
      idsAEliminar.length +
      (totalChanged ? 1 : 0);

    setProgreso({
      enviando: true,
      actual: 0,
      total: totalOps,
      fase: idsAEliminar.length > 0 ? 'eliminar' : itemsAActualizar.length > 0 ? 'actualizar' : 'crear',
    });

    let realizados = 0;
    const bump = (fase: 'crear' | 'actualizar' | 'eliminar') => {
      realizados += 1;
      setProgreso((p) => ({ ...p, actual: realizados, fase }));
    };

    try {
      // 1. Eliminar primero (para liberar piezaNumero si aplica)
      for (const id of idsAEliminar) {
        await deletePaquete(id);
        bump('eliminar');
      }

      // 2. Actualizar existentes
      for (const { item } of itemsAActualizar) {
        const body: PaqueteUpdateRequest = {
          destinatarioFinalId: destinatarioId,
          contenido: item.contenido?.trim() || undefined,
          guiaMasterId: guiaId,
        };
        if (hasPesoWrite) {
          if (typeof item.pesoLbs === 'number' && !Number.isNaN(item.pesoLbs)) body.pesoLbs = item.pesoLbs;
          if (typeof item.pesoKg === 'number' && !Number.isNaN(item.pesoKg)) body.pesoKg = item.pesoKg;
          if (typeof item.piezaNumero === 'number' && !Number.isNaN(item.piezaNumero)) {
            body.piezaNumero = item.piezaNumero;
          }
        }
        await updatePaquete(item.id as number, body);
        bump('actualizar');
      }

      // 3. Ajustar el total esperado de la guía si cambió
      if (totalChanged) {
        await actualizarGuiaMaster(guiaId, {
          totalPiezasEsperadas: values.paquetes.length === 0 ? null : values.paquetes.length,
        });
        bump('actualizar');
      }

      // 4. Crear nuevos al final (toman piezaNumero libre)
      for (const { item } of itemsACrear) {
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
        await createPaquete(body);
        bump('crear');
      }

      qc.invalidateQueries({ queryKey: ['paquetes'] });
      qc.invalidateQueries({ queryKey: ['operario', 'paquetes'] });
      qc.invalidateQueries({ queryKey: GUIAS_MASTER_QUERY_KEY });

      const partes: string[] = [];
      if (itemsACrear.length > 0) partes.push(`${itemsACrear.length} creado${itemsACrear.length === 1 ? '' : 's'}`);
      if (itemsAActualizar.length > 0) partes.push(`${itemsAActualizar.length} actualizado${itemsAActualizar.length === 1 ? '' : 's'}`);
      if (idsAEliminar.length > 0) partes.push(`${idsAEliminar.length} eliminado${idsAEliminar.length === 1 ? '' : 's'}`);
      toast.success(partes.length > 0 ? `Cambios guardados: ${partes.join(', ')}.` : 'Guía actualizada.');
      onSuccess();
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      const message = res?.data?.message?.trim() || 'Error al guardar los cambios';
      toast.error(`${message} (${realizados} de ${totalOps} operaciones aplicadas)`);
      qc.invalidateQueries({ queryKey: ['paquetes'] });
      qc.invalidateQueries({ queryKey: GUIAS_MASTER_QUERY_KEY });
    } finally {
      setProgreso({ enviando: false, actual: 0, total: 0, fase: null });
    }
  }

  function onSubmit(values: FormValues) {
    return isEditMode ? onSubmitEdit(values) : onSubmitCreate(values);
  }

  const enviando = progreso.enviando;
  const sinGuiasDisponibles = !isEditMode && guiasSeleccionables.length === 0;
  const canPrev = activeIndex > 0 && !enviando;
  const canNext = activeIndex < fields.length - 1 && !enviando;

  const titulo = isEditMode ? 'Editar paquetes de la guía' : 'Registrar paquetes';
  const submitLabel = (() => {
    if (enviando) {
      const fase = progreso.fase;
      if (fase === 'crear') return 'Creando paquete…';
      if (fase === 'actualizar') return 'Actualizando…';
      if (fase === 'eliminar') return 'Eliminando…';
      return 'Guardando…';
    }
    if (isEditMode) {
      if (sinCambios) return 'Sin cambios';
      const ops = diff.creates + diff.updates + diff.deletes + (diff.totalChanged ? 1 : 0);
      return `Guardar cambios${ops > 0 ? ` (${ops})` : ''}`;
    }
    return fields.length === 1 ? 'Registrar paquete' : `Registrar ${fields.length} paquetes`;
  })();

  return (
    <Dialog open onOpenChange={(open) => !open && !enviando && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {isEditMode && (
            <DialogDescription>
              Modifica las piezas existentes, agrega nuevas o quita las que ya no
              correspondan. Solo se aplicarán los cambios detectados.
            </DialogDescription>
          )}
        </DialogHeader>

        {isEditMode && cargandoExistentes ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando paquetes de la guía…
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {!isEditMode && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
            )}

            {isEditMode && guiaSeleccionada && (
              <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Guía master
                    </p>
                    <p className="mt-0.5 break-all font-mono text-sm font-medium text-foreground">
                      {guiaSeleccionada.trackingBase}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="tabular-nums text-muted-foreground">
                      Inicial: <span className="font-medium text-foreground">{initialCantidadRef.current ?? 0}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      Total esperado:{' '}
                      <span className="font-medium text-foreground">
                        {initialTotalEsperadasRef.current ?? '—'}
                      </span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      Ahora:{' '}
                      <span
                        className={cn(
                          'font-semibold',
                          fields.length !== (initialCantidadRef.current ?? 0)
                            ? 'text-[var(--color-primary)]'
                            : 'text-foreground',
                        )}
                      >
                        {fields.length}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}

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

            {isEditMode && removedIds.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 px-3 py-2 text-xs text-foreground">
                <Trash2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-destructive)]" />
                <span className="flex-1">
                  Se eliminará{removedIds.length === 1 ? '' : 'n'}{' '}
                  <span className="font-semibold">{removedIds.length}</span>{' '}
                  paquete{removedIds.length === 1 ? '' : 's'} existente
                  {removedIds.length === 1 ? '' : 's'} al guardar.
                </span>
                <button
                  type="button"
                  onClick={() => setRemovedIds([])}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline"
                >
                  <RotateCcw className="h-3 w-3" />
                  Deshacer
                </button>
              </div>
            )}

            {guiaMasterId != null && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
                    <span className="shrink-0">
                      Paquete {activeIndex + 1} de {fields.length}
                    </span>
                    {(() => {
                      const cur = fields[activeIndex] as (PaqueteItemValues & { id?: number }) | undefined;
                      const id = cur?.id ?? watchedItems?.[activeIndex]?.id;
                      if (id != null) {
                        return (
                          <span className="inline-flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/40 px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                            existente
                          </span>
                        );
                      }
                      if (isEditMode) {
                        return (
                          <span className="inline-flex items-center rounded-md border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-1.5 py-0.5 text-[10px] font-normal text-[var(--color-primary)]">
                            nuevo
                          </span>
                        );
                      }
                      return null;
                    })()}
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

                <div className="relative">
                  {fields.map((field, index) => (
                    <div key={field.id} className={cn(index === activeIndex ? 'block' : 'hidden')}>
                      <BulkPaqueteItem
                        index={index}
                        setValue={setValue}
                        register={register}
                        hasPesoWrite={hasPesoWrite}
                        errors={formState.errors.paquetes?.[index]}
                        disabled={enviando}
                        initialPesoLbs={watchedItems?.[index]?.pesoLbs}
                        initialPesoKg={watchedItems?.[index]?.pesoKg}
                      />
                    </div>
                  ))}
                </div>

                {fields.length > 1 && (
                  <CarouselNav
                    count={fields.length}
                    activeIndex={activeIndex}
                    onJump={(i) => setActiveIndex(i)}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    canPrev={canPrev}
                    canNext={canNext}
                  />
                )}
              </div>
            )}

            {enviando && (
              <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {progreso.fase === 'crear' && 'Creando paquete'}
                {progreso.fase === 'actualizar' && 'Actualizando paquete'}
                {progreso.fase === 'eliminar' && 'Eliminando paquete'}
                {progreso.fase == null && 'Procesando'}{' '}
                {progreso.actual + (progreso.actual < progreso.total ? 1 : 0)} de{' '}
                {progreso.total}…
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onClose} disabled={enviando}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  enviando ||
                  sinGuiasDisponibles ||
                  guiaMasterId == null ||
                  (isEditMode && sinCambios)
                }
              >
                {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        )}
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
                  : 'w-5 bg-[var(--color-muted-foreground)]/30 hover:bg-[var(--color-muted-foreground)]/60',
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
  };
  disabled?: boolean;
  /** Permite hidratar los inputs locales con datos preexistentes (modo edit). */
  initialPesoLbs?: number;
  initialPesoKg?: number;
}

function BulkPaqueteItem({
  index,
  setValue,
  register,
  hasPesoWrite,
  errors,
  disabled,
  initialPesoLbs,
  initialPesoKg,
}: BulkPaqueteItemProps) {
  const [pesoLbsInput, setPesoLbsInput] = useState(
    initialPesoLbs != null ? String(initialPesoLbs) : '',
  );
  const [pesoKgInput, setPesoKgInput] = useState(
    initialPesoKg != null ? String(initialPesoKg) : '',
  );

  // Si se hidrata después (modo edit con carga async), sincronizamos.
  useEffect(() => {
    if (initialPesoLbs != null && pesoLbsInput === '') {
      setPesoLbsInput(String(initialPesoLbs));
    }
    if (initialPesoKg != null && pesoKgInput === '') {
      setPesoKgInput(String(initialPesoKg));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPesoLbs, initialPesoKg]);

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

        </>
      )}
    </div>
  );
}
