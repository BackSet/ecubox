import { useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, type UseFormSetValue } from 'react-hook-form';
import type { z } from 'zod';
import {
  paqueteBulkSchema,
  MAX_PAQUETES_BULK,
  validatePaqueteBulkAgainstTotal,
} from '@/lib/schemas/paquete';
import { useQueryClient } from '@tanstack/react-query';
import { notify } from '@/lib/notify';
import {
  Loader2,
  UserRound,
  Plus,
  Trash2,
  Copy,
  AlertTriangle,
  RotateCcw,
  PackageCheck,
  ClipboardPaste,
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
import { PesoInputPair } from '@/components/PesoInput';
import { sanitizeNumericDecimal } from '@/lib/inputFilters';
import { lbsToKg, kgToLbs } from '@/lib/utils/weight';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import type { Paquete, PaqueteCreateRequest, PaqueteUpdateRequest } from '@/types/paquete';
import type { GuiaMaster } from '@/types/guia-master';
import { QuickPresetChips } from '@/components/QuickPresetChips';
import { CANTIDAD_PRESETS } from '@/lib/constants/operational-presets';
import { GuiaMasterCombobox } from './GuiaMasterCombobox';

type FormValues = z.input<typeof paqueteBulkSchema>;
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

/**
 * Determina si una guía master puede recibir registro de piezas nuevas desde
 * este formulario. Reglas:
 *  - debe tener consignatario asignado;
 *  - no puede estar PENDIENTE_VERIFICACION ni EN_REVISION (el backend lo bloquea
 *    en validarYAsignarPieza; aquí evitamos ofrecerla en el selector);
 *  - en creación, además, no debe tener el cupo de piezas ya completo.
 * En edición no filtramos por cupo (se pueden ajustar piezas existentes).
 */
export function guiaAdmiteRegistroDePiezas(
  gm: Pick<
    GuiaMaster,
    'consignatarioId' | 'estadoGlobal' | 'totalPiezasEsperadas' | 'piezasRegistradas'
  >,
  opts: { isEditMode: boolean },
): boolean {
  if (gm.consignatarioId == null) return false;
  if (gm.estadoGlobal === 'PENDIENTE_VERIFICACION' || gm.estadoGlobal === 'EN_REVISION') {
    return false;
  }
  if (opts.isEditMode) return true;
  const total = gm.totalPiezasEsperadas;
  const registradas = gm.piezasRegistradas ?? 0;
  if (total != null && total > 0 && registradas >= total) return false;
  return true;
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
  const guiaMasterIdActual = editGuiaMasterId ?? undefined;
  const { data: guiaDetalle } = useGuiaMaster(
    isEditMode ? guiaMasterIdActual : undefined,
  );

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
  const [cargandoExistentes, setCargandoExistentes] = useState(isEditMode);
  // Snapshot inicial por id, para detectar cambios en items existentes.
  const originalsRef = useRef<Map<number, OriginalSnapshot>>(new Map());
  // Ids de paquetes existentes que el operario marcó para borrar.
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  // Cantidad inicial de piezas en modo edit (para detectar cambio de total).
  const initialCantidadRef = useRef<number | null>(null);
  const initialTotalEsperadasRef = useRef<number | null>(null);
  const autoSizedGuiaIdRef = useRef<number | null>(null);
  const [pesoParaTodosLbsInput, setPesoParaTodosLbsInput] = useState('');
  const [pesoParaTodosKgInput, setPesoParaTodosKgInput] = useState('');
  const [pesoParaTodosError, setPesoParaTodosError] = useState<string | null>(null);
  // Confirmación ligera antes de reemplazar pesos ya ingresados al aplicar a todos.
  const [confirmReemplazoPeso, setConfirmReemplazoPeso] = useState(false);
  // Se incrementa tras cada acción masiva de peso para que cada fila vuelva a
  // leer su peso del store del formulario (setValue(undefined) no siempre
  // notifica a watch, así que no podemos depender solo del prop derivado).
  const [pesoNonce, setPesoNonce] = useState(0);

  const guiasSeleccionables = useMemo(
    () => guiasMaster.filter((gm) => guiaAdmiteRegistroDePiezas(gm, { isEditMode })),
    [guiasMaster, isEditMode],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(paqueteBulkSchema),
    mode: 'onTouched',
    defaultValues: {
      guiaMasterId: editGuiaMasterId,
      cantidad: 1,
      paquetes: [emptyItem()],
    },
  });
  const { control, handleSubmit, watch, setValue, register, formState, reset, getValues } = form;
  const { fields, append, insert, remove, replace } = useFieldArray({ control, name: 'paquetes' });

  const guiaMasterId = watch('guiaMasterId');
  const cantidad = watch('cantidad');
  const { data: guiaSeleccionadaDetalle } = useGuiaMaster(
    !isEditMode && typeof guiaMasterId === 'number' ? guiaMasterId : null,
  );

  const guiaSeleccionada = useMemo(() => {
    if (guiaDetalle && guiaDetalle.id === guiaMasterId) return guiaDetalle;
    if (guiaSeleccionadaDetalle && guiaSeleccionadaDetalle.id === guiaMasterId) {
      return guiaSeleccionadaDetalle;
    }
    return guiasMaster.find((gm) => gm.id === guiaMasterId) ?? null;
  }, [guiasMaster, guiaDetalle, guiaSeleccionadaDetalle, guiaMasterId]);
  const consignatarioId = guiaSeleccionada?.consignatarioId ?? null;
  const consignatarioNombre = guiaSeleccionada?.consignatarioNombre ?? null;
  const piezasRegistradas = guiaSeleccionada?.piezasRegistradas ?? 0;
  const totalEsperadas = guiaSeleccionada?.totalPiezasEsperadas ?? null;
  const cupoRestante =
    totalEsperadas != null ? Math.max(0, totalEsperadas - piezasRegistradas) : null;

  // Una guía pendiente de aprobación o en revisión no admite operaciones nuevas
  // (agregar piezas). El backend lo bloquea en validarYAsignarPieza; aquí
  // impedimos agregar filas en modo edición y avisamos al operario. En creación
  // estas guías ni siquiera aparecen en el selector.
  const estadoGuiaActual = (isEditMode ? guiaDetalle : guiaSeleccionada)?.estadoGlobal;
  const bloqueaPiezasNuevas =
    estadoGuiaActual === 'PENDIENTE_VERIFICACION' || estadoGuiaActual === 'EN_REVISION';
  const cantidadPresetOptions = useMemo(() => {
    const max =
      cupoRestante != null
        ? Math.min(cupoRestante, MAX_PAQUETES_BULK)
        : MAX_PAQUETES_BULK;
    return CANTIDAD_PRESETS.filter((n) => n <= max).map((n) => ({
      label: String(n),
      value: n,
    }));
  }, [cupoRestante]);

  const bulkSchemaWithTotal = useMemo(
    () =>
      paqueteBulkSchema.superRefine((data, ctx) => {
        if (totalEsperadas == null || totalEsperadas <= 0) return;
        const piezas = data.paquetes
          .map((p) => p.piezaNumero)
          .filter((n): n is number => n != null && !Number.isNaN(n));
        const msg = validatePaqueteBulkAgainstTotal(piezas, totalEsperadas);
        if (msg) {
          ctx.addIssue({ code: 'custom', message: msg, path: ['paquetes'] });
        }
      }),
    [totalEsperadas, cupoRestante, isEditMode],
  );

  function applyBulkSchemaErrors(values: FormValues): boolean {
    const parsed = bulkSchemaWithTotal.safeParse(values);
    if (parsed.success) return true;
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === 'cantidad' || field === 'paquetes') {
        form.setError(field, { type: 'manual', message: issue.message });
      }
    }
    return false;
  }

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
        setRemovedIds([]);
      })
      .catch(() => {
        notify.error('No se pudieron cargar las piezas de la guía');
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

  // Al seleccionar una guía en creación, generamos automáticamente las filas
  // según las piezas pendientes declaradas en la guía. Luego el usuario puede
  // añadir o quitar filas manualmente.
  useEffect(() => {
    if (isEditMode || guiaSeleccionada == null) return;
    if (autoSizedGuiaIdRef.current === guiaSeleccionada.id) return;
    const total = guiaSeleccionada.totalPiezasEsperadas;
    const registradas = guiaSeleccionada.piezasRegistradas ?? 0;
    const pendientes =
      total != null && total > 0 ? Math.max(1, total - registradas) : 1;
    const target = Math.max(1, Math.min(pendientes, MAX_PAQUETES_BULK));
    autoSizedGuiaIdRef.current = guiaSeleccionada.id;
    replace(Array.from({ length: target }, () => emptyItem()));
    setValue('cantidad', target, { shouldDirty: true, shouldValidate: false });
    // Foco inmediato en la primera fila para empezar a capturar sin clics.
    requestAnimationFrame(() => focusContenido(0));
  }, [isEditMode, guiaSeleccionada, replace, setValue]);

  // ----- Sincronizar el array con la cantidad en modo CREATE -----
  // En modo edit la cantidad la maneja directamente el array (botones +/-),
  // así que no autocompletamos con vacíos al cambiar el input.
  useEffect(() => {
    if (isEditMode) return;
    const target = Math.max(
      1,
      Math.min(
        typeof cantidad === 'number' && !Number.isNaN(cantidad) ? cantidad : 1,
        MAX_PAQUETES_BULK,
      ),
    );
    if (fields.length < target) {
      for (let i = fields.length; i < target; i++) append(emptyItem());
    } else if (fields.length > target) {
      for (let i = fields.length - 1; i >= target; i--) remove(i);
    }
  }, [cantidad, fields.length, append, remove, isEditMode]);

  const excedeCupo =
    !isEditMode && cupoRestante != null && fields.length > cupoRestante;

  function handleAddOne() {
    if (fields.length >= MAX_PAQUETES_BULK) return;
    if (bloqueaPiezasNuevas) {
      notify.warning(
        'No se pueden agregar piezas',
        'La guía está pendiente de aprobación o en revisión; apruébala o sácala de revisión antes de registrar piezas.',
      );
      return;
    }
    append(emptyItem());
    setValue('cantidad', fields.length + 1, { shouldValidate: true });
    // Enfocar la nueva fila tras el render.
    requestAnimationFrame(() => focusContenido(fields.length));
  }

  /** Quita la fila en `idx`; si es un paquete existente lo marca para borrar. */
  function handleRemove(idx: number) {
    if (fields.length <= 1) return;
    const current = fields[idx] as PaqueteItemValues & { id?: number };
    const currentValues = getValues(`paquetes.${idx}` as const);
    const id = currentValues?.id ?? current?.id;
    if (id != null) {
      setRemovedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
    remove(idx);
    setValue('cantidad', fields.length - 1, { shouldValidate: true });
  }

  /** Duplica la fila `idx` (contenido y peso) insertándola justo debajo. */
  function handleDuplicate(idx: number) {
    if (fields.length >= MAX_PAQUETES_BULK) {
      notify.warning(`Máximo ${MAX_PAQUETES_BULK} paquetes por lote`);
      return;
    }
    if (bloqueaPiezasNuevas) {
      notify.warning(
        'No se pueden agregar piezas',
        'La guía está pendiente de aprobación o en revisión; apruébala o sácala de revisión antes de registrar piezas.',
      );
      return;
    }
    const src = getValues(`paquetes.${idx}` as const);
    insert(idx + 1, {
      id: undefined,
      contenido: src?.contenido ?? '',
      pesoLbs: src?.pesoLbs,
      pesoKg: src?.pesoKg,
      piezaNumero: undefined,
    });
    setValue('cantidad', fields.length + 1, { shouldValidate: true });
    requestAnimationFrame(() => focusContenido(idx + 1));
  }

  /** Enfoca el input de contenido de una fila (navegación con teclado). */
  function focusContenido(idx: number) {
    const el = document.getElementById(`bulk-contenido-${idx}`) as HTMLInputElement | null;
    el?.focus();
    el?.select();
  }

  /** Enter en una fila: salta a la siguiente; en la última, agrega una nueva. */
  function handleContenidoEnter(idx: number) {
    if (idx < fields.length - 1) {
      focusContenido(idx + 1);
    } else if (fields.length < MAX_PAQUETES_BULK) {
      handleAddOne();
    }
  }

  /**
   * Pega una lista de contenidos (uno por línea) creando una fila por línea.
   * Si se indica `startIndex`, la primera línea va en esa fila y el resto se
   * inserta debajo; si no, todas se agregan al final. Acelera el registro de
   * varios paquetes pegando, p. ej., una columna de una hoja de cálculo.
   */
  function pegarLista(text: string, startIndex?: number) {
    if (bloqueaPiezasNuevas) {
      notify.warning(
        'No se pueden agregar piezas',
        'La guía está pendiente de aprobación o en revisión; apruébala o sácala de revisión antes de registrar piezas.',
      );
      return;
    }
    const lineas = text
      .split(/[\r\n\t,;]+/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lineas.length === 0) return;
    const nuevo = (contenido: string): PaqueteItemValues => ({
      id: undefined,
      contenido,
      pesoLbs: undefined,
      pesoKg: undefined,
      piezaNumero: undefined,
    });
    const cupo = MAX_PAQUETES_BULK - fields.length; // filas extra permitidas

    if (startIndex != null) {
      setValue(`paquetes.${startIndex}.contenido`, lineas[0], {
        shouldDirty: true,
        shouldValidate: true,
      });
      const resto = lineas.slice(1, 1 + Math.max(0, cupo));
      if (resto.length > 0) insert(startIndex + 1, resto.map(nuevo));
      setValue('cantidad', fields.length + resto.length, { shouldValidate: true });
      avisarPegado(lineas.length, 1 + resto.length);
    } else {
      const aAgregar = lineas.slice(0, Math.max(0, cupo));
      if (aAgregar.length > 0) append(aAgregar.map(nuevo));
      setValue('cantidad', fields.length + aAgregar.length, { shouldValidate: true });
      avisarPegado(lineas.length, aAgregar.length);
    }
  }

  function avisarPegado(detectadas: number, aplicadas: number) {
    if (aplicadas < detectadas) {
      notify.warning(
        `Se agregaron ${aplicadas} de ${detectadas} (límite de ${MAX_PAQUETES_BULK} paquetes por lote)`,
      );
    } else {
      notify.success(`${aplicadas} paquete${aplicadas === 1 ? '' : 's'} desde la lista`);
    }
  }

  /** Lee el portapapeles y pega la lista en la primera fila vacía (o al final). */
  async function pegarDesdePortapapeles() {
    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch {
      notify.error('No se pudo leer el portapapeles. Pega dentro de una fila de contenido.');
      return;
    }
    if (!text.trim()) {
      notify.warning('El portapapeles está vacío');
      return;
    }
    const items = getValues('paquetes') ?? [];
    const vacia = items.findIndex((p) => !(p.contenido ?? '').trim());
    pegarLista(text, vacia >= 0 ? vacia : undefined);
  }

  // Estado vivo de las filas, usado por el peso para todos, el diff y el resumen.
  const watchedItems = watch('paquetes');

  const round2 = (n: number) => Math.round(n * 100) / 100;

  /**
   * Valor de "peso para todos" listo para aplicar, derivado del input en lbs
   * (el de kg se mantiene espejado). Devuelve `null` si está vacío o no es
   * mayor que 0. NO muta las filas: solo se usa al pulsar un botón de aplicar.
   */
  const pesoParaTodosValor = useMemo<{ lbs: number; kg: number } | null>(() => {
    const s = pesoParaTodosLbsInput;
    if (s === '' || s === '.') return null;
    const n = Number(s);
    if (!Number.isFinite(n) || n <= 0) return null;
    const lbs = round2(n);
    return { lbs, kg: lbsToKg(lbs) };
  }, [pesoParaTodosLbsInput]);

  // Se recalcula en cada render (barato) leyendo el store real con getValues,
  // porque watch no siempre emite tras un setValue masivo de peso.
  const algunPaqueteConPeso = (getValues('paquetes') ?? []).some(
    (it) =>
      (typeof it.pesoLbs === 'number' && it.pesoLbs > 0) ||
      (typeof it.pesoKg === 'number' && it.pesoKg > 0),
  );

  /** Escribe el peso en una fila concreta (ambas unidades). */
  function setPesoFila(i: number, lbs: number, kg: number) {
    setValue(`paquetes.${i}.pesoLbs`, lbs, { shouldDirty: true, shouldValidate: true });
    setValue(`paquetes.${i}.pesoKg`, kg, { shouldDirty: true });
  }

  /**
   * Aplica el "peso para todos" a las filas del lote. `scope` decide el alcance:
   *  - `'todos'`: reemplaza el peso de todas las filas;
   *  - `'sin-peso'`: solo rellena las filas que aún no tienen peso.
   * No aplica nada si el valor no es válido (> 0).
   */
  function aplicarPesoParaTodos(scope: 'todos' | 'sin-peso') {
    if (!pesoParaTodosValor || fields.length === 0) {
      setPesoParaTodosError('Ingresa un peso mayor a 0 para aplicarlo');
      return;
    }
    const { lbs, kg } = pesoParaTodosValor;
    let aplicados = 0;
    for (let i = 0; i < fields.length; i++) {
      if (scope === 'sin-peso') {
        const cur = getValues(`paquetes.${i}` as const);
        const tienePeso =
          (typeof cur?.pesoLbs === 'number' && cur.pesoLbs > 0) ||
          (typeof cur?.pesoKg === 'number' && cur.pesoKg > 0);
        if (tienePeso) continue;
      }
      setPesoFila(i, lbs, kg);
      aplicados += 1;
    }
    setConfirmReemplazoPeso(false);
    setPesoNonce((n) => n + 1);
    if (aplicados === 0) {
      notify.info('Todos los paquetes ya tenían peso');
    } else {
      notify.success(
        `Peso aplicado a ${aplicados} paquete${aplicados === 1 ? '' : 's'}`,
      );
    }
  }

  /** Punto de entrada de "Aplicar a todos": confirma si hay pesos a reemplazar. */
  function solicitarAplicarATodos() {
    if (!pesoParaTodosValor) {
      setPesoParaTodosError('Ingresa un peso mayor a 0 para aplicarlo');
      return;
    }
    // Lectura autoritativa del store: watch puede no haber emitido tras editar
    // el peso de una fila (PesoInputPair no está registrado en RHF).
    const hayPeso = (getValues('paquetes') ?? []).some(
      (it) =>
        (typeof it.pesoLbs === 'number' && it.pesoLbs > 0) ||
        (typeof it.pesoKg === 'number' && it.pesoKg > 0),
    );
    if (hayPeso) {
      setConfirmReemplazoPeso(true);
      return;
    }
    aplicarPesoParaTodos('todos');
  }

  /** Vacía el peso de todas las filas (sin tocar contenido). */
  function limpiarPesos() {
    for (let i = 0; i < fields.length; i++) {
      setValue(`paquetes.${i}.pesoLbs`, undefined, { shouldDirty: true, shouldValidate: true });
      setValue(`paquetes.${i}.pesoKg`, undefined, { shouldDirty: true, shouldValidate: true });
    }
    setConfirmReemplazoPeso(false);
    setPesoNonce((n) => n + 1);
    notify.success('Pesos limpiados');
  }

  // Los handlers del campo "peso para todos" solo actualizan el texto y espejan
  // la otra unidad; NO aplican el peso a las filas mientras se escribe (eso
  // ocurre solo al pulsar un botón de aplicar), evitando cambios accidentales.
  function handlePesoParaTodosLbsChange(raw: string) {
    const s = sanitizeNumericDecimal(raw);
    setPesoParaTodosLbsInput(s);
    setConfirmReemplazoPeso(false);
    if (s === '' || s === '.') {
      setPesoParaTodosKgInput('');
      setPesoParaTodosError(null);
      return;
    }
    const n = Number(s);
    if (Number.isFinite(n) && n > 0) {
      setPesoParaTodosKgInput(String(lbsToKg(n)));
      setPesoParaTodosError(null);
    } else {
      setPesoParaTodosKgInput('');
      setPesoParaTodosError('El peso debe ser mayor a 0');
    }
  }

  function handlePesoParaTodosKgChange(raw: string) {
    const s = sanitizeNumericDecimal(raw);
    setPesoParaTodosKgInput(s);
    setConfirmReemplazoPeso(false);
    if (s === '' || s === '.') {
      setPesoParaTodosLbsInput('');
      setPesoParaTodosError(null);
      return;
    }
    const n = Number(s);
    if (Number.isFinite(n) && n > 0) {
      setPesoParaTodosLbsInput(String(kgToLbs(n)));
      setPesoParaTodosError(null);
    } else {
      setPesoParaTodosLbsInput('');
      setPesoParaTodosError('El peso debe ser mayor a 0');
    }
  }

  // ----- Diff en modo edit -----
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
    if (!applyBulkSchemaErrors(values)) return;
    if (consignatarioId == null) {
      notify.warning('La guía seleccionada no tiene consignatario asignado');
      return;
    }
    const guiaId = values.guiaMasterId as number;
    const total = values.paquetes.length;
    setProgreso({ enviando: true, actual: 0, total, fase: 'crear' });
    const toastId = notify.loading(
      total === 1 ? 'Registrando paquete...' : `Registrando ${total} paquetes...`,
    );

    const totalRequerido = piezasRegistradas + total;
    if (totalEsperadas == null || totalRequerido > totalEsperadas) {
      try {
        await actualizarGuiaMaster(guiaId, { totalPiezasEsperadas: totalRequerido });
      } catch {
        notify.error('No se pudo actualizar el total de piezas esperadas de la guía', {
          id: toastId,
        });
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
        consignatarioId: consignatarioId,
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
      notify.error(`Se registraron ${creados} de ${total}. ${errorMsg}`, { id: toastId });
      if (creados > 0 && errorIndex != null) {
        const restantes = values.paquetes.slice(errorIndex);
        setValue('paquetes', restantes);
        setValue('cantidad', restantes.length);
      }
    } else {
      notify.success(
        creados === 1 ? 'Paquete registrado' : `${creados} paquetes registrados`,
        { id: toastId },
      );
      onSuccess();
    }
  }

  async function onSubmitEdit(values: FormValues) {
    if (!applyBulkSchemaErrors(values)) return;
    if (consignatarioId == null) {
      notify.warning('La guía no tiene consignatario asignado');
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
      notify.info('No hay cambios que guardar');
      return;
    }

    if (idsAEliminar.length > 0 && !hasPaquetesDelete) {
      notify.error('No tienes permisos para eliminar paquetes');
      return;
    }
    if (itemsAActualizar.length > 0 && !hasPaquetesUpdate) {
      notify.error('No tienes permisos para editar paquetes');
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
    const toastId = notify.loading(`Guardando cambios (${totalOps} operaciones)...`);

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
          consignatarioId: consignatarioId,
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
          consignatarioId: consignatarioId,
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
      notify.success(
        partes.length > 0 ? `Cambios guardados: ${partes.join(', ')}` : 'Guía actualizada',
        { id: toastId },
      );
      onSuccess();
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      const message = res?.data?.message?.trim() || 'No se pudieron guardar los cambios';
      notify.error(`${message} (${realizados} de ${totalOps} operaciones aplicadas)`, {
        id: toastId,
      });
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

  // ----- Resumen del lote (para revisar antes de guardar) -----
  const resumen = useMemo(() => {
    const items = watchedItems ?? [];
    let sumaLbs = 0;
    let sumaKg = 0;
    let conPeso = 0;
    let incompletos = 0;
    for (const it of items) {
      const lbs = typeof it.pesoLbs === 'number' && !Number.isNaN(it.pesoLbs) ? it.pesoLbs : 0;
      const kg = typeof it.pesoKg === 'number' && !Number.isNaN(it.pesoKg) ? it.pesoKg : 0;
      sumaLbs += lbs;
      sumaKg += kg;
      if (lbs > 0 || kg > 0) conPeso += 1;
      if (!(it.contenido ?? '').trim()) incompletos += 1;
    }
    const total = items.length;
    return {
      total,
      incompletos,
      conPeso,
      sinPeso: total - conPeso,
      sumaLbs: Math.round(sumaLbs * 100) / 100,
      sumaKg: Math.round(sumaKg * 100) / 100,
    };
  }, [watchedItems]);

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
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-[var(--color-border)] px-6 pb-4 pt-6">
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Modifica las piezas existentes, agrega nuevas o quita las que ya no correspondan. Solo se aplicarán los cambios detectados.'
              : 'Selecciona la guía, configura el lote y registra sus paquetes. El peso es opcional y puede completarse después en Pesaje.'}
          </DialogDescription>
        </DialogHeader>

        {isEditMode && cargandoExistentes ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando paquetes de la guía…
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
            onKeyDown={(e) => {
              // Ctrl/Cmd+Enter envía el formulario desde cualquier campo.
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !enviando) {
                e.preventDefault();
                handleSubmit(onSubmit)();
              }
            }}
          >
            {/* Body scrolleable: el footer queda fijo fuera de este contenedor */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
              {/* 1. Guía */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Guía</h3>
                {!isEditMode && (
                  <div>
                    <label
                      htmlFor="guia-master-combobox"
                      className="mb-1 block text-sm font-medium text-[var(--color-foreground)]"
                    >
                      Guía master *
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
                        No hay guías con consignatario asignado. Crea o asigna un consignatario en la guía
                        antes de registrar paquetes.
                      </p>
                    )}
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
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
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

                {consignatarioNombre && (
                  <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-2 text-sm">
                    <UserRound className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[var(--color-muted-foreground)]">Consignatario</p>
                      <p className="truncate font-medium text-[var(--color-foreground)]">
                        {consignatarioNombre}
                      </p>
                    </div>
                    {cupoRestante != null && (
                      <span className="shrink-0 rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                        Cupo restante: <span className="font-medium text-foreground">{cupoRestante}</span>
                      </span>
                    )}
                  </div>
                )}

                {guiaMasterId != null && bloqueaPiezasNuevas && (
                  <p className="rounded-md border border-[var(--color-warning)] bg-[color-mix(in_oklab,var(--color-warning)_10%,transparent)] px-3 py-2 text-xs text-foreground">
                    La guía está {estadoGuiaActual === 'EN_REVISION' ? 'en revisión' : 'pendiente de aprobación'};
                    no se pueden registrar piezas nuevas. Apruébala o sácala de revisión desde el
                    módulo Guías master para habilitar el registro.
                  </p>
                )}

                {excedeCupo && (
                  <div className="flex items-start gap-2 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-3 py-2 text-xs text-[var(--color-warning)]">
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
              </section>

              {/* 2. Configuración del lote */}
              {guiaMasterId != null && (
                <section className="space-y-3 border-t border-[var(--color-border)] pt-4">
                  <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                    Configuración del lote
                  </h3>

                  {!isEditMode && (
                    <div className="max-w-xs">
                      <label
                        htmlFor="cantidad-input"
                        className="mb-1 block text-sm font-medium text-[var(--color-foreground)]"
                      >
                        Cantidad de paquetes *
                      </label>
                      <Input
                        id="cantidad-input"
                        type="number"
                        min={1}
                        max={MAX_PAQUETES_BULK}
                        {...register('cantidad', { valueAsNumber: true })}
                        variant="clean"
                        className="input-clean"
                        disabled={!guiaMasterId || enviando}
                      />
                      {cantidadPresetOptions.length > 0 && (
                        <QuickPresetChips
                          className="mt-1.5"
                          options={cantidadPresetOptions}
                          value={typeof cantidad === 'number' && !Number.isNaN(cantidad) ? cantidad : undefined}
                          onSelect={(v) =>
                            setValue('cantidad', v, { shouldValidate: true, shouldDirty: true })
                          }
                        />
                      )}
                      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                        {fields.length} fila{fields.length === 1 ? '' : 's'} en este lote
                        {cupoRestante != null
                          ? ` · pendientes declaradas: ${cupoRestante}`
                          : ` · hasta ${MAX_PAQUETES_BULK}`}
                      </p>
                      {formState.errors.cantidad && (
                        <p className="mt-1 text-sm text-[var(--color-destructive)]">
                          {formState.errors.cantidad.message as string}
                        </p>
                      )}
                    </div>
                  )}

                  {hasPesoWrite && (
                    <div className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-3">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <label className="text-sm font-medium text-[var(--color-foreground)]">
                          Peso para todos los paquetes
                        </label>
                        <span className="text-xs font-medium text-muted-foreground">Opcional</span>
                      </div>
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
                        <PesoInputPair
                          lbs={pesoParaTodosLbsInput}
                          kg={pesoParaTodosKgInput}
                          onLbsChange={handlePesoParaTodosLbsChange}
                          onKgChange={handlePesoParaTodosKgChange}
                          lbsAriaLabel="Peso para todos los paquetes en libras"
                          kgAriaLabel="Peso para todos los paquetes en kilogramos"
                          disabled={enviando || fields.length === 0}
                          invalid={pesoParaTodosError != null}
                          size="md"
                          className="shrink-0 lg:w-auto"
                        />
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={solicitarAplicarATodos}
                            disabled={enviando || fields.length === 0 || pesoParaTodosValor == null}
                          >
                            Aplicar a todos
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => aplicarPesoParaTodos('sin-peso')}
                            disabled={enviando || fields.length === 0 || pesoParaTodosValor == null}
                            aria-label="Aplicar solo a paquetes sin peso"
                            title="Aplicar solo a paquetes sin peso"
                          >
                            Solo a sin peso
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={limpiarPesos}
                            disabled={enviando || !algunPaqueteConPeso}
                          >
                            Limpiar pesos
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        Si lo completas, se aplicará este peso a los paquetes del lote. Puedes dejarlo
                        vacío y registrar el peso después en Pesaje.
                      </p>
                      {pesoParaTodosError && (
                        <p className="text-sm text-[var(--color-destructive)]">{pesoParaTodosError}</p>
                      )}
                      {confirmReemplazoPeso && (
                        <div className="flex flex-col gap-2 rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-3 py-2 text-xs text-foreground sm:flex-row sm:items-center sm:justify-between">
                          <span className="inline-flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[var(--color-warning)]" />
                            Esto reemplazará pesos ya ingresados.
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => aplicarPesoParaTodos('todos')}
                            >
                              Reemplazar todos
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmReemplazoPeso(false)}
                            >
                              Cancelar
                            </Button>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {!bloqueaPiezasNuevas && fields.length < MAX_PAQUETES_BULK && !enviando && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={pegarDesdePortapapeles}
                      title="Pegar una lista de contenidos (uno por línea)"
                    >
                      <ClipboardPaste className="mr-1 h-3.5 w-3.5" />
                      Pegar lista
                    </Button>
                  )}
                </section>
              )}

              {/* 3. Paquetes del lote */}
              {guiaMasterId != null && (
                <section className="space-y-2 border-t border-[var(--color-border)] pt-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                      Paquetes del lote
                      <span className="ml-1.5 font-normal text-muted-foreground">
                        ({fields.length})
                      </span>
                    </h3>
                    {fields.length < MAX_PAQUETES_BULK && !enviando && !bloqueaPiezasNuevas && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleAddOne}
                        className="self-start sm:self-auto"
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Añadir fila
                      </Button>
                    )}
                  </div>

                  {!bloqueaPiezasNuevas && (
                    <p className="text-xs text-muted-foreground">
                      <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">Enter</kbd>{' '}
                      pasa a la siguiente · pega una lista para crear varias filas ·{' '}
                      <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">Ctrl/⌘+Enter</kbd>{' '}
                      guarda · la numeración de piezas se asigna automáticamente.
                    </p>
                  )}

                  {/* Planilla: scrolleable internamente si hay muchas filas */}
                  <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                    <div className="hidden bg-[var(--color-muted)]/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[2rem_minmax(0,1fr)_auto_4.5rem] sm:items-center sm:gap-3">
                      <span className="text-center">#</span>
                      <span>Contenido</span>
                      <span className={hasPesoWrite ? '' : 'sr-only'}>{hasPesoWrite ? 'Peso (lb / kg)' : 'Peso'}</span>
                      <span className="text-right">Acciones</span>
                    </div>
                    <div className="max-h-[42vh] divide-y divide-[var(--color-border)] overflow-y-auto">
                      {fields.map((field, index) => (
                        <BulkPaqueteRow
                          key={field.id}
                          index={index}
                          total={fields.length}
                          setValue={setValue}
                          register={register}
                          hasPesoWrite={hasPesoWrite}
                          errors={formState.errors.paquetes?.[index]}
                          disabled={enviando}
                          defaultContenido={field.contenido ?? ''}
                          esExistente={(watchedItems?.[index]?.id ?? null) != null}
                          isEditMode={isEditMode}
                          pesoLbs={watchedItems?.[index]?.pesoLbs}
                          pesoKg={watchedItems?.[index]?.pesoKg}
                          pesoNonce={pesoNonce}
                          getRowPeso={() => getValues(`paquetes.${index}` as const)}
                          onEnter={() => handleContenidoEnter(index)}
                          onPasteList={(text) => pegarLista(text, index)}
                          onDuplicate={() => handleDuplicate(index)}
                          onRemove={() => handleRemove(index)}
                        />
                      ))}
                    </div>
                  </div>

                  {typeof formState.errors.paquetes?.message === 'string' && (
                    <p className="text-sm text-[var(--color-destructive)]">
                      {formState.errors.paquetes.message}
                    </p>
                  )}
                </section>
              )}

              {/* 4. Resumen */}
              {guiaMasterId != null && (
                <section className="border-t border-[var(--color-border)] pt-4">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3 py-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <PackageCheck className="h-4 w-4 text-muted-foreground" />
                      {resumen.total} paquete{resumen.total === 1 ? '' : 's'}
                    </span>
                    {hasPesoWrite && (
                      <span className="tabular-nums text-muted-foreground">
                        <span className="font-medium text-[var(--color-success)]">{resumen.conPeso}</span>{' '}
                        con peso ·{' '}
                        <span className="font-medium text-foreground">{resumen.sinPeso}</span>{' '}
                        con peso pendiente
                      </span>
                    )}
                    {hasPesoWrite && (resumen.sumaLbs > 0 || resumen.sumaKg > 0) && (
                      <span className="tabular-nums text-muted-foreground">
                        Peso total:{' '}
                        <span className="font-medium text-foreground">
                          {resumen.sumaLbs} lb · {resumen.sumaKg} kg
                        </span>
                      </span>
                    )}
                    {resumen.incompletos > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-[var(--color-warning)]">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {resumen.incompletos} sin contenido
                      </span>
                    ) : (
                      <span className="text-[var(--color-success)]">Todos con contenido</span>
                    )}
                  </div>
                </section>
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
            </div>

            {/* Footer fijo */}
            <DialogFooter className="border-t border-[var(--color-border)] bg-[var(--color-background)] px-6 py-3">
              <Button type="button" variant="secondary" onClick={onClose} disabled={enviando}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  enviando ||
                  sinGuiasDisponibles ||
                  guiaMasterId == null ||
                  consignatarioId == null ||
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

interface BulkPaqueteRowProps {
  index: number;
  total: number;
  setValue: UseFormSetValue<FormValues>;
  register: ReturnType<typeof useForm<FormValues>>['register'];
  hasPesoWrite: boolean;
  errors?: {
    contenido?: { message?: string };
    pesoLbs?: { message?: string };
    pesoKg?: { message?: string };
  };
  disabled?: boolean;
  defaultContenido: string;
  esExistente: boolean;
  isEditMode: boolean;
  pesoLbs?: number;
  pesoKg?: number;
  /** Cambia tras cada acción masiva de peso para forzar la resync de la fila. */
  pesoNonce: number;
  /** Lee el peso actual de la fila desde el store del formulario. */
  getRowPeso: () => { pesoLbs?: number; pesoKg?: number } | undefined;
  onEnter: () => void;
  onPasteList: (text: string) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

/** Una fila de la planilla de registro de paquetes. */
function BulkPaqueteRow({
  index,
  total,
  setValue,
  register,
  hasPesoWrite,
  errors,
  disabled,
  defaultContenido,
  esExistente,
  isEditMode,
  pesoLbs,
  pesoKg,
  pesoNonce,
  getRowPeso,
  onEnter,
  onPasteList,
  onDuplicate,
  onRemove,
}: BulkPaqueteRowProps) {
  const [pesoLbsInput, setPesoLbsInput] = useState(pesoLbs != null ? String(pesoLbs) : '');
  const [pesoKgInput, setPesoKgInput] = useState(pesoKg != null ? String(pesoKg) : '');

  // Tras una acción masiva de peso (aplicar/limpiar), relee el peso desde el
  // store del formulario. No dependemos del prop derivado de watch porque
  // setValue(undefined) no siempre lo emite; getValues sí refleja el valor real.
  useEffect(() => {
    if (pesoNonce === 0) return;
    const cur = getRowPeso();
    setPesoLbsInput(cur?.pesoLbs != null ? String(cur.pesoLbs) : '');
    setPesoKgInput(cur?.pesoKg != null ? String(cur.pesoKg) : '');
    // Solo reaccionamos al nonce; getRowPeso se recrea en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pesoNonce]);

  const contenidoError = errors?.contenido?.message;
  const pesoError = errors?.pesoLbs?.message ?? errors?.pesoKg?.message;

  /**
   * Actualiza el peso de la fila desde una unidad, espejando la otra. Un valor
   * mayor que 0 convierte y refleja; un 0 (peso inválido) se conserva en ambas
   * para que el schema lo marque; vacío limpia ambas.
   */
  function cambiarPeso(unit: 'lbs' | 'kg', raw: string) {
    const s = sanitizeNumericDecimal(raw);
    const n = s === '' || s === '.' ? undefined : Number(s);
    const valido = typeof n === 'number' && Number.isFinite(n) && n > 0;
    const srcField = unit === 'lbs' ? 'pesoLbs' : 'pesoKg';
    const dstField = unit === 'lbs' ? 'pesoKg' : 'pesoLbs';
    const setSrcInput = unit === 'lbs' ? setPesoLbsInput : setPesoKgInput;
    const setDstInput = unit === 'lbs' ? setPesoKgInput : setPesoLbsInput;
    const convertir = unit === 'lbs' ? lbsToKg : kgToLbs;
    setSrcInput(s);
    setValue(`paquetes.${index}.${srcField}` as const, n, { shouldValidate: true, shouldDirty: true });
    if (valido) {
      const dst = convertir(n);
      setValue(`paquetes.${index}.${dstField}` as const, dst, { shouldDirty: true, shouldValidate: true });
      setDstInput(String(dst));
    } else {
      // n es 0 (inválido) o undefined (vacío): reflejamos el mismo valor para
      // que ambas unidades queden coherentes y el error se muestre una vez.
      setValue(`paquetes.${index}.${dstField}` as const, n, { shouldDirty: true, shouldValidate: true });
      setDstInput(s === '' || s === '.' ? '' : s);
    }
  }

  return (
    <div className="px-3 py-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2rem_minmax(0,1fr)_auto_4.5rem] sm:items-center sm:gap-3">
        <div className="flex items-center gap-1.5 sm:justify-center">
          <span className="text-sm tabular-nums text-muted-foreground">{index + 1}</span>
          {esExistente ? (
            <span
              title="Paquete existente"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-muted-foreground)]/50"
            />
          ) : isEditMode ? (
            <span
              title="Paquete nuevo"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
            />
          ) : null}
        </div>

        <div className="min-w-0">
          <Input
            id={`bulk-contenido-${index}`}
            {...register(`paquetes.${index}.contenido` as const)}
            defaultValue={defaultContenido}
            variant="clean"
            className={cn(
              'input-clean',
              contenidoError && 'border-[var(--color-destructive)] focus-visible:ring-[var(--color-destructive)]/30',
            )}
            placeholder="Descripción del contenido"
            aria-invalid={contenidoError ? true : undefined}
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onEnter();
              }
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text');
              // Reparte en filas si el texto pegado trae varios valores.
              if (text && /[\r\n\t,;]/.test(text)) {
                e.preventDefault();
                onPasteList(text);
              }
            }}
          />
        </div>

        {hasPesoWrite ? (
          <PesoInputPair
            lbs={pesoLbsInput}
            kg={pesoKgInput}
            disabled={disabled}
            size="sm"
            invalid={pesoError != null}
            onLbsChange={(raw) => cambiarPeso('lbs', raw)}
            onKgChange={(raw) => cambiarPeso('kg', raw)}
          />
        ) : (
          <span className="hidden sm:block" />
        )}

        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onDuplicate}
            disabled={disabled}
            aria-label={`Duplicar paquete ${index + 1}`}
            title="Duplicar"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[var(--color-destructive)] hover:text-[var(--color-destructive)]"
            onClick={onRemove}
            disabled={disabled || total <= 1}
            aria-label={`Quitar paquete ${index + 1}`}
            title={total <= 1 ? 'Debe haber al menos un paquete' : 'Quitar'}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {(contenidoError || pesoError) && (
        <p className="mt-1 text-xs text-[var(--color-destructive)] sm:pl-[2.75rem]">
          {[contenidoError, pesoError].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  );
}
