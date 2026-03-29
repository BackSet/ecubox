import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  useDistribuidores,
  useAgenciasOperario,
  useAgenciasDistribuidor,
  useCreateAgenciaDistribuidorOperario,
  useDestinatariosOperario,
  useSacasOperario,
  useCreateDespacho,
  useUpdateDespacho,
  useCreateSaca,
  useActualizarTamanioSaca,
  usePaquetesSinSaca,
  useAsignarPaqueteSaca,
  useAsignarPaquetesASaca,
} from '@/hooks/useOperarioDespachos';
import { toast } from 'sonner';
import { kgToLbs, lbsToKg } from '@/lib/utils/weight';
import type { DestinatarioFinal } from '@/types/destinatario';
import type { Despacho, TipoEntrega, TamanioSaca } from '@/types/despacho';
import { SelectionCard } from '@/components/ui/selection-card';
import { ArrowLeft, Plus, Trash2, Package, Truck, ArrowRight, Check, ClipboardList, Building2, Users, MapPin, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { PROVINCIAS_ECUADOR, getCantonesByProvincia } from '@/data/provincias-cantones-ecuador';
import { onKeyDownNumericDecimal, sanitizeNumericDecimal } from '@/lib/inputFilters';
import { AgregarPaquetesSacaDialog } from './AgregarPaquetesSacaDialog';
import { useAuthStore } from '@/stores/authStore';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const sacaNuevaSchema = z.object({
  numeroOrden: z.string().optional(),
  pesoLbs: z.union([z.number(), z.nan()]).optional(),
  pesoKg: z.union([z.number(), z.nan()]).optional(),
  tamanio: z.enum(['INDIVIDUAL', 'PEQUENO', 'MEDIANO', 'GRANDE']).optional(),
  paqueteIds: z.array(z.number()).optional(),
});

const UX_MESSAGES = {
  refineDestino: 'Completa el destino según el tipo de entrega: destinatario (domicilio) o agencia.',
  domicilioRegla: 'En despachos a domicilio, todos los paquetes deben ser del mismo destinatario.',
  agenciaRegla: 'En despachos a agencia, todos los paquetes deben coincidir en provincia y cantón.',
  agenciaDistribuidorRegla: 'En despachos a agencia de distribuidor, todos los paquetes deben tener el mismo destinatario.',
  seleccionarDestinatario: 'Selecciona un destinatario para continuar.',
  seleccionarAgencia: 'Selecciona una agencia para continuar.',
  seleccionarAgenciaDistribuidor: 'Selecciona una agencia del distribuidor para continuar.',
  validarPaquetes: 'No pudimos validar algunos paquetes seleccionados. Revisa la lista e inténtalo de nuevo.',
  detectarDestinatario: 'No se pudo identificar el destinatario desde los paquetes agregados.',
  minSacas: 'Debes tener al menos una saca para continuar.',
} as const;

const formSchema = z
  .object({
    fechaHora: z.string().min(1, 'Fecha y hora obligatoria'),
    numeroGuia: z.string().min(1, 'El número de guía es obligatorio'),
    distribuidorId: z.number().refine((n) => n > 0, 'Selecciona un distribuidor'),
    tipoEntrega: z.enum(['DOMICILIO', 'AGENCIA', 'AGENCIA_DISTRIBUIDOR']),
    destinatarioFinalId: z.number().optional(),
    agenciaId: z.number().optional(),
    agenciaDistribuidorId: z.number().optional(),
    observaciones: z.string().optional(),
    codigoPrecinto: z.string().optional(),
    sacaIds: z.array(z.number()).optional(),
    sacasNuevas: z.array(sacaNuevaSchema),
  })
  .refine(
    (data) => {
      if (data.tipoEntrega === 'DOMICILIO') return data.destinatarioFinalId != null && data.destinatarioFinalId > 0;
      if (data.tipoEntrega === 'AGENCIA') return data.agenciaId != null && data.agenciaId > 0;
      if (data.tipoEntrega === 'AGENCIA_DISTRIBUIDOR') return data.agenciaDistribuidorId != null && data.agenciaDistribuidorId > 0;
      return true;
    },
    { message: UX_MESSAGES.refineDestino, path: ['destinatarioFinalId'] }
  );

export type FormValues = z.infer<typeof formSchema>;

function hasPeso(p: { pesoKg?: number | null; pesoLbs?: number | null }): boolean {
  return (
    (p.pesoKg != null && !Number.isNaN(p.pesoKg) && p.pesoKg > 0) ||
    (p.pesoLbs != null && !Number.isNaN(p.pesoLbs) && p.pesoLbs > 0)
  );
}

const INDIVIDUAL_KG_MAX = 8;

const TAMANIO_OPTIONS: { value: TamanioSaca; label: string; sublabel: string }[] = [
  { value: 'INDIVIDUAL', label: 'Paquete individual', sublabel: `máx ${INDIVIDUAL_KG_MAX} kg · ${Math.round(kgToLbs(INDIVIDUAL_KG_MAX))} lbs` },
  { value: 'PEQUENO', label: 'Saca pequeña', sublabel: `máx 30 kg · ${Math.round(kgToLbs(30))} lbs` },
  { value: 'MEDIANO', label: 'Saca mediana', sublabel: `máx 40 kg · ${Math.round(kgToLbs(40))} lbs` },
  { value: 'GRANDE', label: 'Saca grande', sublabel: `máx 50 kg · ${Math.round(kgToLbs(50))} lbs` },
];

const TAMANIO_LABELS: Record<TamanioSaca, string> = {
  INDIVIDUAL: 'Paquete individual',
  PEQUENO: 'Saca pequeña',
  MEDIANO: 'Saca mediana',
  GRANDE: 'Saca grande',
};

const TAMANIO_LIMITS = {
  individualKgMin: 0.1,
  individualKgMax: INDIVIDUAL_KG_MAX,
  pequenoKg: 30,
  medianoKg: 40,
  grandeKg: 50,
} as const;

const TAMANIO_LIMITS_LBS = {
  individualLbsMin: 0.1,
  individualLbsMax: kgToLbs(INDIVIDUAL_KG_MAX),
  pequenoLbs: kgToLbs(30),
  medianoLbs: kgToLbs(40),
  grandeLbs: kgToLbs(50),
};

function agenciaDistribuidorEtiqueta(a: { etiqueta?: string; provincia?: string; canton?: string; codigo?: string }): string {
  if (a.etiqueta?.trim()) return a.etiqueta.trim();
  const parts = [a.provincia, a.canton].filter(Boolean);
  return (parts.length ? parts.join(', ') + ' ' : '') + (a.codigo ? `(${a.codigo})` : '—');
}

function sugerirTamanioPorPeso(total: { kg: number; lbs: number }): TamanioSaca | undefined {
  const hasKg = total.kg > 0;
  const hasLbs = total.lbs > 0;
  if (!hasKg && !hasLbs) return undefined;
  const kgCanon = hasKg ? total.kg : lbsToKg(total.lbs);
  const lbsCanon = hasKg ? kgToLbs(total.kg) : total.lbs;
  const enRangoIndividual =
    (kgCanon >= TAMANIO_LIMITS.individualKgMin && kgCanon <= TAMANIO_LIMITS.individualKgMax) ||
    (lbsCanon >= TAMANIO_LIMITS_LBS.individualLbsMin && lbsCanon <= TAMANIO_LIMITS_LBS.individualLbsMax);
  if (enRangoIndividual) return 'INDIVIDUAL';
  if (kgCanon <= TAMANIO_LIMITS.pequenoKg || lbsCanon <= TAMANIO_LIMITS_LBS.pequenoLbs) return 'PEQUENO';
  if (kgCanon <= TAMANIO_LIMITS.medianoKg || lbsCanon <= TAMANIO_LIMITS_LBS.medianoLbs) return 'MEDIANO';
  return 'GRANDE';
}

function getDefaultFechaHora(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatFechaHoraForInput(iso?: string | null): string {
  if (!iso) return getDefaultFechaHora();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return getDefaultFechaHora();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface DespachoStepperFormProps {
  mode: 'create' | 'edit';
  despacho?: Despacho | null;
  title: string;
  subtitle: string;
  submitLabel: string;
  submitLoadingLabel: string;
}

const STEPS = [
  { step: 1 as const, label: 'Datos del lote', helper: 'Configura el contexto operativo' },
  { step: 2 as const, label: 'Sacas', helper: 'Arma la carga y valida pesos' },
  { step: 3 as const, label: 'Datos del envío', helper: 'Define destino y guía' },
];

export function DespachoStepperForm({
  mode,
  despacho,
  title,
  subtitle,
  submitLabel,
  submitLoadingLabel,
}: DespachoStepperFormProps) {
  const navigate = useNavigate();
  const username = useAuthStore((s) => s.username);
  const { data: distribuidores = [] } = useDistribuidores();
  const { data: agencias = [] } = useAgenciasOperario();
  const { data: destinatarios = [] } = useDestinatariosOperario();
  const { data: sacasSinDespacho = [] } = useSacasOperario(true);
  const { data: sacasOperario = [] } = useSacasOperario(false);
  const { data: paquetesSinSaca = [] } = usePaquetesSinSaca();
  const paquetesConPeso = paquetesSinSaca.filter(hasPeso);
  const paquetesSinPeso = paquetesSinSaca.filter((p) => !hasPeso(p));
  const createDespachoMutation = useCreateDespacho();
  const updateDespachoMutation = useUpdateDespacho();
  const createSacaMutation = useCreateSaca();
  const actualizarTamanioSacaMutation = useActualizarTamanioSaca();
  const asignarPaqueteMutation = useAsignarPaqueteSaca();
  const asignarPaquetesASacaMutation = useAsignarPaquetesASaca();

  const [pasoActual, setPasoActual] = useState<1 | 2 | 3>(1);
  const [agregarPaquetesDialog, setAgregarPaquetesDialog] = useState<{
    open: boolean;
    modo: 'agregarASaca' | 'crearYDistribuir';
    tipo: 'existente' | 'nueva';
    sacaId?: number;
    sacaNuevaIndex?: number;
    label: string;
  }>({ open: false, modo: 'agregarASaca', tipo: 'nueva', label: '' });
  const [crearAgenciaDistribuidorModalOpen, setCrearAgenciaDistribuidorModalOpen] = useState(false);
  const [tamanioEditandoPorSaca, setTamanioEditandoPorSaca] = useState<Record<number, TamanioSaca | undefined>>({});
  const [confirmQuitarSaca, setConfirmQuitarSaca] = useState<{ open: boolean; sacaId: number | null; label: string }>({
    open: false,
    sacaId: null,
    label: '',
  });
  const [confirmQuitarPaquete, setConfirmQuitarPaquete] = useState<{
    open: boolean;
    paqueteId: number | null;
    sacaLabel: string;
    guia: string;
  }>({
    open: false,
    paqueteId: null,
    sacaLabel: '',
    guia: '',
  });
  const [modalCrearAgencia, setModalCrearAgencia] = useState({
    provincia: '',
    canton: '',
    direccion: '',
    horarioAtencion: '',
    diasMaxRetiro: '',
    tarifa: 0,
  });
  const sectionSacasRef = useRef<HTMLDivElement>(null);
  const prevDistribuidorIdRef = useRef<number | null>(null);

  const isEdit = mode === 'edit' && despacho != null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fechaHora: getDefaultFechaHora(),
      numeroGuia: '',
      distribuidorId: 0,
      tipoEntrega: 'DOMICILIO' as TipoEntrega,
      destinatarioFinalId: undefined,
      agenciaId: undefined,
      agenciaDistribuidorId: undefined,
      observaciones: '',
      codigoPrecinto: '',
      sacaIds: [],
      sacasNuevas: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'sacasNuevas',
  });

  const distribuidorIdForm = form.watch('distribuidorId');
  const tipoEntregaWatch = form.watch('tipoEntrega');
  const { data: agenciasDistribuidor = [] } = useAgenciasDistribuidor(
    tipoEntregaWatch === 'AGENCIA_DISTRIBUIDOR' && distribuidorIdForm != null && distribuidorIdForm > 0 ? distribuidorIdForm : null
  );
  const createAgenciaDistribuidorOperarioMutation = useCreateAgenciaDistribuidorOperario(
    tipoEntregaWatch === 'AGENCIA_DISTRIBUIDOR' && distribuidorIdForm != null && distribuidorIdForm > 0 ? distribuidorIdForm : null
  );

  useEffect(() => {
    if (!isEdit || !despacho) return;
    form.reset({
      fechaHora: formatFechaHoraForInput(despacho.fechaHora),
      numeroGuia: despacho.numeroGuia ?? '',
      distribuidorId: despacho.distribuidorId ?? 0,
      tipoEntrega: (despacho.tipoEntrega ?? 'DOMICILIO') as TipoEntrega,
      destinatarioFinalId: despacho.destinatarioFinalId ?? undefined,
      agenciaId: despacho.agenciaId ?? undefined,
      agenciaDistribuidorId: despacho.agenciaDistribuidorId ?? undefined,
      observaciones: despacho.observaciones ?? '',
      codigoPrecinto: despacho.codigoPrecinto ?? '',
      sacaIds: despacho.sacaIds ?? [],
      sacasNuevas: [],
    });
  }, [despacho, isEdit, form]);

  const tipoEntrega = form.watch('tipoEntrega');
  const agenciaIdForm = form.watch('agenciaId');
  const agenciaDistribuidorIdForm = form.watch('agenciaDistribuidorId');
  const selectedAgencia = agencias.find((a) => a.id === agenciaIdForm);
  const selectedAgenciaDistribuidor = agenciasDistribuidor.find((a) => a.id === agenciaDistribuidorIdForm);
  useEffect(() => {
    if (tipoEntrega === 'AGENCIA') {
      form.setValue('destinatarioFinalId', undefined);
      form.setValue('agenciaDistribuidorId', undefined);
    } else if (tipoEntrega === 'AGENCIA_DISTRIBUIDOR') {
      form.setValue('destinatarioFinalId', undefined);
      form.setValue('agenciaId', undefined);
    } else {
      form.setValue('agenciaId', undefined);
      form.setValue('agenciaDistribuidorId', undefined);
    }
  }, [tipoEntrega, form]);

  useEffect(() => {
    const currentDistribuidorId = distribuidorIdForm != null ? Number(distribuidorIdForm) : 0;
    const prevDistribuidorId = prevDistribuidorIdRef.current;

    if (
      tipoEntrega === 'AGENCIA_DISTRIBUIDOR' &&
      prevDistribuidorId != null &&
      prevDistribuidorId !== currentDistribuidorId
    ) {
      form.setValue('agenciaDistribuidorId', undefined);
    }

    prevDistribuidorIdRef.current = currentDistribuidorId;
  }, [tipoEntrega, distribuidorIdForm, form]);

  useEffect(() => {
    if (tipoEntrega !== 'AGENCIA_DISTRIBUIDOR') return;
    if (agenciaDistribuidorIdForm == null || agenciaDistribuidorIdForm <= 0) return;
    if (agenciasDistribuidor.length === 0) return;
    const stillValid = agenciasDistribuidor.some((ag) => ag.id === agenciaDistribuidorIdForm);
    if (!stillValid) {
      form.setValue('agenciaDistribuidorId', undefined);
    }
  }, [tipoEntrega, agenciasDistribuidor, agenciaDistribuidorIdForm, form]);

  const loading =
    createDespachoMutation.isPending ||
    updateDespachoMutation.isPending ||
    createSacaMutation.isPending ||
    actualizarTamanioSacaMutation.isPending ||
    asignarPaqueteMutation.isPending ||
    asignarPaquetesASacaMutation.isPending;
  const sacasNuevas = form.watch('sacasNuevas') ?? [];
  const sacaIds = form.watch('sacaIds') ?? [];
  const idsEnSacasNuevas = sacasNuevas.flatMap((s) => s.paqueteIds ?? []);

  const sacasEnDespacho = sacaIds
    .map((id) => despacho?.sacas?.find((s) => s.id === id) ?? sacasOperario.find((s) => s.id === id))
    .filter(Boolean) as NonNullable<Despacho['sacas']>;

  const provinciaCantonRef = ((): { provincia: string; canton: string } | null => {
    if (tipoEntrega !== 'AGENCIA') return null;
    const norm = (s: string | undefined | null) => (s ?? '').trim().toLowerCase();
    const firstIdFromNuevas = idsEnSacasNuevas[0];
    if (firstIdFromNuevas != null) {
      const p = paquetesSinSaca.find((x) => x.id === firstIdFromNuevas);
      if (p && (p.destinatarioProvincia != null || p.destinatarioCanton != null))
        return { provincia: norm(p.destinatarioProvincia), canton: norm(p.destinatarioCanton) };
    }
    const firstSaca = sacasEnDespacho[0];
    const firstPaquete = firstSaca?.paquetes?.[0];
    if (firstPaquete && ('destinatarioProvincia' in firstPaquete || 'destinatarioCanton' in firstPaquete)) {
      const prov = norm((firstPaquete as { destinatarioProvincia?: string }).destinatarioProvincia);
      const cant = norm((firstPaquete as { destinatarioCanton?: string }).destinatarioCanton);
      if (prov || cant) return { provincia: prov, canton: cant };
    }
    return null;
  })();

  const autoDetectedDestId = ((): number | null => {
    if (tipoEntrega !== 'DOMICILIO' && tipoEntrega !== 'AGENCIA_DISTRIBUIDOR') return null;
    const firstIdFromNuevas = idsEnSacasNuevas[0];
    if (firstIdFromNuevas != null) {
      const p = paquetesSinSaca.find((x) => x.id === firstIdFromNuevas);
      if (p) return p.destinatarioFinalId;
    }
    const firstSaca = sacasEnDespacho[0];
    const fp = firstSaca?.paquetes?.[0];
    if (fp && 'destinatarioFinalId' in fp && fp.destinatarioFinalId != null) return fp.destinatarioFinalId;
    return null;
  })();

  const autoDetectedDest = autoDetectedDestId != null
    ? destinatarios.find((d) => d.id === autoDetectedDestId)
      ?? (() => {
        const p = paquetesSinSaca.find((x) => x.destinatarioFinalId === autoDetectedDestId);
        return p ? { id: autoDetectedDestId, nombre: p.destinatarioNombre ?? '—', provincia: p.destinatarioProvincia, canton: p.destinatarioCanton } as DestinatarioFinal : undefined;
      })()
    : undefined;

  const paquetesDisponiblesParaDespacho: typeof paquetesConPeso = (() => {
    if (tipoEntrega === 'DOMICILIO' || tipoEntrega === 'AGENCIA_DISTRIBUIDOR') {
      if (autoDetectedDestId == null) return paquetesConPeso;
      return paquetesConPeso.filter((p) => p.destinatarioFinalId === autoDetectedDestId);
    }
    if (tipoEntrega === 'AGENCIA') {
      if (provinciaCantonRef == null) return paquetesConPeso;
      const norm = (s: string | undefined | null) => (s ?? '').trim().toLowerCase();
      return paquetesConPeso.filter(
        (p) =>
          norm(p.destinatarioProvincia) === provinciaCantonRef.provincia &&
          norm(p.destinatarioCanton) === provinciaCantonRef.canton
      );
    }
    return paquetesConPeso;
  })();

  const disponiblesParaAgregar = sacasSinDespacho.filter((s) => {
    if (sacaIds.includes(s.id)) return false;
    if (tipoEntrega === 'DOMICILIO' || tipoEntrega === 'AGENCIA_DISTRIBUIDOR') {
      if (autoDetectedDestId == null) return true;
      const paqs = s.paquetes ?? [];
      return paqs.length > 0 && paqs.every((p) => (p as { destinatarioFinalId?: number }).destinatarioFinalId === autoDetectedDestId);
    }
    if (tipoEntrega === 'AGENCIA') {
      if (provinciaCantonRef == null) return true;
      const norm = (s: string | undefined | null) => (s ?? '').trim().toLowerCase();
      const paqs = s.paquetes ?? [];
      return (
        paqs.length > 0 &&
        paqs.every(
          (p) =>
            norm((p as { destinatarioProvincia?: string }).destinatarioProvincia) === provinciaCantonRef.provincia &&
            norm((p as { destinatarioCanton?: string }).destinatarioCanton) === provinciaCantonRef.canton
        )
      );
    }
    return true;
  });

  useEffect(() => {
    if (tipoEntrega !== 'AGENCIA' || provinciaCantonRef == null) return;
    const norm = (s: string | undefined | null) => (s ?? '').trim().toLowerCase();
    const sugeridas = agencias.filter(
      (a) =>
        norm(a.provincia) === provinciaCantonRef.provincia &&
        norm(a.canton) === provinciaCantonRef.canton
    );
    if (sugeridas.length > 0) {
      const currentId = form.getValues('agenciaId');
      if (currentId == null || currentId <= 0) {
        form.setValue('agenciaId', sugeridas[0].id);
      }
    }
  }, [tipoEntrega, provinciaCantonRef?.provincia, provinciaCantonRef?.canton, agencias, form]);

  useEffect(() => {
    if (autoDetectedDestId != null && autoDetectedDestId > 0) {
      form.setValue('destinatarioFinalId', autoDetectedDestId);
    }
  }, [autoDetectedDestId, form]);

  function quitarSacaDelDespacho(sacaId: number) {
    form.setValue(
      'sacaIds',
      sacaIds.filter((id) => id !== sacaId)
    );
  }

  async function quitarPaqueteDeSacaExistente(paqueteId: number) {
    await asignarPaqueteMutation.mutateAsync({ paqueteId, sacaId: null });
  }

  async function actualizarTamanioSacaExistente(sacaId: number, tamanio: TamanioSaca) {
    const prev = tamanioEditandoPorSaca[sacaId];
    setTamanioEditandoPorSaca((old) => ({ ...old, [sacaId]: tamanio }));
    try {
      await actualizarTamanioSacaMutation.mutateAsync({ sacaId, tamanio });
      toast.success('Tamaño de saca actualizado');
    } catch {
      setTamanioEditandoPorSaca((old) => ({ ...old, [sacaId]: prev }));
      toast.error('No se pudo actualizar el tamaño de la saca');
    }
  }

  function agregarSacaAlDespacho(sacaId: number) {
    form.setValue('sacaIds', [...sacaIds, sacaId]);
  }

  function openCrearAgenciaDistribuidorModal() {
    const provincia = autoDetectedDest?.provincia?.trim() ?? '';
    const canton = autoDetectedDest?.canton?.trim() ?? '';
    let prefillProvincia = provincia;
    let prefillCanton = canton;
    if (!prefillProvincia && !prefillCanton) {
      const firstSaca = sacasEnDespacho[0];
      const firstPaqueteFromSaca = firstSaca?.paquetes?.[0] as { destinatarioProvincia?: string; destinatarioCanton?: string } | undefined;
      if (firstPaqueteFromSaca) {
        prefillProvincia = firstPaqueteFromSaca.destinatarioProvincia?.trim() ?? '';
        prefillCanton = firstPaqueteFromSaca.destinatarioCanton?.trim() ?? '';
      }
      if (!prefillProvincia && !prefillCanton) {
        const firstIdNueva = sacasNuevas.find((s) => (s.paqueteIds?.length ?? 0) > 0)?.paqueteIds?.[0];
        const p = firstIdNueva != null ? paquetesSinSaca.find((x) => x.id === firstIdNueva) : undefined;
        if (p) {
          prefillProvincia = p.destinatarioProvincia?.trim() ?? '';
          prefillCanton = p.destinatarioCanton?.trim() ?? '';
        }
      }
    }
    setModalCrearAgencia({
      provincia: prefillProvincia,
      canton: prefillCanton,
      direccion: '',
      horarioAtencion: '',
      diasMaxRetiro: '',
      tarifa: 0,
    });
    setCrearAgenciaDistribuidorModalOpen(true);
  }

  async function submitCrearAgenciaDistribuidor() {
    const distribuidorId = form.getValues('distribuidorId');
    if (distribuidorId == null || distribuidorId <= 0) {
      toast.error('Seleccione un distribuidor primero.');
      return;
    }
    try {
      const created = await createAgenciaDistribuidorOperarioMutation.mutateAsync({
        provincia: modalCrearAgencia.provincia?.trim() || undefined,
        canton: modalCrearAgencia.canton?.trim() || undefined,
        direccion: modalCrearAgencia.direccion?.trim() || undefined,
        horarioAtencion: modalCrearAgencia.horarioAtencion?.trim() || undefined,
        diasMaxRetiro: modalCrearAgencia.diasMaxRetiro === '' ? undefined : Number(modalCrearAgencia.diasMaxRetiro),
        tarifa: Number(modalCrearAgencia.tarifa),
      });
      form.setValue('agenciaDistribuidorId', created.id);
      setCrearAgenciaDistribuidorModalOpen(false);
      toast.success('Agencia de distribuidor creada. Selecciona la agencia en la lista si no se eligió automáticamente.');
    } catch {
      toast.error('Error al crear la agencia de distribuidor.');
    }
  }

  function agregarPaqueteASacaNueva(index: number, paqueteId: number) {
    const current = form.getValues(`sacasNuevas.${index}.paqueteIds`) ?? [];
    if (current.includes(paqueteId)) return;
    const paquete = paquetesSinSaca.find((x) => x.id === paqueteId);
    if (!paquete) return;
    if (tipoEntrega === 'DOMICILIO') {
      const refDestId =
        autoDetectedDestId ??
        (() => {
          const firstId = idsEnSacasNuevas[0];
          return firstId != null ? paquetesSinSaca.find((x) => x.id === firstId)?.destinatarioFinalId ?? null : null;
        })();
      if (refDestId != null && paquete.destinatarioFinalId !== refDestId) {
        toast.error(UX_MESSAGES.domicilioRegla);
        return;
      }
    }
    if (tipoEntrega === 'AGENCIA') {
      const norm = (s: string | undefined | null) => (s ?? '').trim().toLowerCase();
      const ref = provinciaCantonRef;
      if (
        ref != null &&
        (norm(paquete.destinatarioProvincia) !== ref.provincia || norm(paquete.destinatarioCanton) !== ref.canton)
      ) {
        toast.error(UX_MESSAGES.agenciaRegla);
        return;
      }
    }
    form.setValue(`sacasNuevas.${index}.paqueteIds`, [...current, paqueteId]);
  }

  function quitarPaqueteDeSacaNueva(index: number, paqueteId: number) {
    const current = form.getValues(`sacasNuevas.${index}.paqueteIds`) ?? [];
    form.setValue(
      `sacasNuevas.${index}.paqueteIds`,
      current.filter((id) => id !== paqueteId)
    );
  }

  function moverPaqueteEntreSacasNuevas(origenIndex: number, destinoIndex: number, paqueteId: number) {
    if (origenIndex === destinoIndex) return;
    const currentOrigen = form.getValues(`sacasNuevas.${origenIndex}.paqueteIds`) ?? [];
    const currentDestino = form.getValues(`sacasNuevas.${destinoIndex}.paqueteIds`) ?? [];
    if (!currentDestino.includes(paqueteId)) {
      form.setValue(`sacasNuevas.${origenIndex}.paqueteIds`, currentOrigen.filter((id) => id !== paqueteId));
      form.setValue(`sacasNuevas.${destinoIndex}.paqueteIds`, [...currentDestino, paqueteId]);
    }
  }

  function handleCrearYDistribuir(
    paqueteIds: number[],
    distribucion: number[],
    tamanio: TamanioSaca | undefined
  ) {
    if (distribucion.length === 0 || paqueteIds.length === 0) return;
    const paquetesSeleccionados = paqueteIds
      .map((id) => paquetesSinSaca.find((x) => x.id === id))
      .filter((p): p is NonNullable<typeof p> => p != null);
    if (paquetesSeleccionados.length !== paqueteIds.length) {
      toast.error(UX_MESSAGES.validarPaquetes);
      return;
    }
    if (tipoEntrega === 'DOMICILIO') {
      const refDestId = autoDetectedDestId ?? paquetesSeleccionados[0]?.destinatarioFinalId ?? null;
      if (refDestId == null) {
        toast.error(UX_MESSAGES.detectarDestinatario);
        return;
      }
      const hayIncompatibles = paquetesSeleccionados.some((p) => p.destinatarioFinalId !== refDestId);
      if (hayIncompatibles) {
        toast.error(UX_MESSAGES.domicilioRegla);
        return;
      }
    }
    if (tipoEntrega === 'AGENCIA') {
      const norm = (s: string | undefined | null) => (s ?? '').trim().toLowerCase();
      const ref = provinciaCantonRef ?? {
        provincia: norm(paquetesSeleccionados[0]?.destinatarioProvincia),
        canton: norm(paquetesSeleccionados[0]?.destinatarioCanton),
      };
      const hayIncompatibles = paquetesSeleccionados.some(
        (p) => norm(p.destinatarioProvincia) !== ref.provincia || norm(p.destinatarioCanton) !== ref.canton
      );
      if (hayIncompatibles) {
        toast.error(UX_MESSAGES.agenciaRegla);
        return;
      }
    }
    let offset = 0;
    const baseId = Date.now().toString(36).toUpperCase();
    for (let i = 0; i < distribucion.length; i++) {
      const slice = paqueteIds.slice(offset, offset + distribucion[i]);
      append({
        numeroOrden: `SAC-${baseId}-${String(i + 1).padStart(2, '0')}`,
        pesoLbs: undefined,
        pesoKg: undefined,
        tamanio: tamanio ?? undefined,
        paqueteIds: slice,
      });
      offset += distribucion[i];
    }
    setAgregarPaquetesDialog((prev) => ({ ...prev, open: false }));
  }

  function pesoTotalFromPaquetes(paqueteIds: number[]): { kg: number; lbs: number } {
    let kg = 0;
    let lbs = 0;
    for (const id of paqueteIds) {
      const p = paquetesSinSaca.find((x) => x.id === id);
      if (p?.pesoKg != null) kg += p.pesoKg;
      if (p?.pesoLbs != null) lbs += p.pesoLbs;
    }
    return { kg, lbs };
  }

  const sacasNuevasWatch = form.watch('sacasNuevas');
  useEffect(() => {
    if (!Array.isArray(sacasNuevasWatch)) return;
    sacasNuevasWatch.forEach((saca, index) => {
      const paqueteIds = saca?.paqueteIds ?? [];
      const total = pesoTotalFromPaquetes(paqueteIds);
      const sugerido = sugerirTamanioPorPeso(total);
      if (sugerido != null) {
        form.setValue(`sacasNuevas.${index}.tamanio`, sugerido);
      }
    });
  }, [sacasNuevasWatch, form, paquetesSinSaca]);

  async function handleAgregarPaqueteASaca(sacaId: number, paqueteId: number) {
    try {
      await asignarPaqueteMutation.mutateAsync({ paqueteId, sacaId });
      toast.success('Paquete agregado a la saca');
    } catch {
      toast.error('Error al agregar paquete');
    }
  }

  async function onSubmit(values: FormValues) {
    const destinatarioFinalId =
      values.tipoEntrega === 'DOMICILIO' &&
      values.destinatarioFinalId != null &&
      !Number.isNaN(values.destinatarioFinalId) &&
      values.destinatarioFinalId > 0
        ? values.destinatarioFinalId
        : undefined;
    const agenciaId =
      values.tipoEntrega === 'AGENCIA' &&
      values.agenciaId != null &&
      !Number.isNaN(values.agenciaId) &&
      values.agenciaId > 0
        ? values.agenciaId
        : undefined;
    const agenciaDistribuidorId =
      values.tipoEntrega === 'AGENCIA_DISTRIBUIDOR' &&
      values.agenciaDistribuidorId != null &&
      !Number.isNaN(values.agenciaDistribuidorId) &&
      values.agenciaDistribuidorId > 0
        ? values.agenciaDistribuidorId
        : undefined;
    if (values.tipoEntrega === 'DOMICILIO' && !destinatarioFinalId) {
      toast.error(UX_MESSAGES.seleccionarDestinatario);
      return;
    }
    if (values.tipoEntrega === 'AGENCIA' && !agenciaId) {
      toast.error(UX_MESSAGES.seleccionarAgencia);
      return;
    }
    if (values.tipoEntrega === 'AGENCIA_DISTRIBUIDOR' && !agenciaDistribuidorId) {
      toast.error(UX_MESSAGES.seleccionarAgenciaDistribuidor);
      return;
    }

    const sacasNuevasValidas = (values.sacasNuevas ?? []).filter((s) => s.numeroOrden?.trim());
    const idsExistentes = values.sacaIds ?? [];
    const totalSacas = idsExistentes.length + sacasNuevasValidas.length;

    if (isEdit) {
      if (totalSacas < 1) {
        toast.error(UX_MESSAGES.minSacas);
        return;
      }
    } else {
      if (sacasNuevasValidas.length === 0) {
        toast.error(UX_MESSAGES.minSacas);
        return;
      }
    }

    const paquetesNuevos = sacasNuevasValidas
      .flatMap((s) => s.paqueteIds ?? [])
      .map((id) => paquetesSinSaca.find((x) => x.id === id))
      .filter(Boolean) as Array<{
      destinatarioFinalId?: number;
      destinatarioProvincia?: string;
      destinatarioCanton?: string;
    }>;
    const paquetesExistentes = sacasEnDespacho.flatMap((s) => s.paquetes ?? []);
    const paquetesDespacho = [...paquetesExistentes, ...paquetesNuevos];

    if (values.tipoEntrega === 'DOMICILIO' && destinatarioFinalId != null) {
      const todosMismoDestinatario = paquetesDespacho.every((p) => p.destinatarioFinalId === destinatarioFinalId);
      if (!todosMismoDestinatario) {
        toast.error(UX_MESSAGES.domicilioRegla);
        return;
      }
    }

    if (values.tipoEntrega === 'AGENCIA_DISTRIBUIDOR' && paquetesDespacho.length > 0) {
      const refDest = paquetesDespacho[0].destinatarioFinalId;
      const todosMismoDestinatario = paquetesDespacho.every((p) => p.destinatarioFinalId === refDest);
      if (!todosMismoDestinatario) {
        toast.error(UX_MESSAGES.agenciaDistribuidorRegla);
        return;
      }
    }

    if (values.tipoEntrega === 'AGENCIA') {
      const norm = (s: string | undefined | null) => (s ?? '').trim().toLowerCase();
      let refProv: string | null = null;
      let refCanton: string | null = null;
      for (const p of paquetesDespacho) {
        const prov = norm(p.destinatarioProvincia);
        const cant = norm(p.destinatarioCanton);
        if (refProv == null) {
          refProv = prov;
          refCanton = cant;
        } else if (refProv !== prov || refCanton !== cant) {
          toast.error(UX_MESSAGES.agenciaRegla);
          return;
        }
      }
    }

    const idsNuevas: number[] = [];

    try {
      // #region agent log
      fetch('http://127.0.0.1:7342/ingest/b3b8a322-1eab-430b-a551-f672b4c099d0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'02d67f'},body:JSON.stringify({sessionId:'02d67f',location:'DespachoStepperForm.tsx:onSubmit',message:'sacasNuevasValidas numeroOrden list',data:{numeroOrdens:sacasNuevasValidas.map(s=>(s.numeroOrden??'').trim()),count:sacasNuevasValidas.length},hypothesisId:'H2',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      for (const saca of sacasNuevasValidas) {
        const paqueteIdsSaca = saca.paqueteIds ?? [];
        const total = pesoTotalFromPaquetes(paqueteIdsSaca);
        const pesoLbs = total.lbs > 0 ? total.lbs : undefined;
        const pesoKg = total.kg > 0 ? total.kg : undefined;
        let numeroOrden = (saca.numeroOrden ?? '').trim();
        if (!numeroOrden || /^SAC-\d{3}$/.test(numeroOrden)) {
          const idx = sacasNuevasValidas.indexOf(saca) + 1;
          numeroOrden = `SAC-${Date.now().toString(36).toUpperCase()}-${String(idx).padStart(2, '0')}`;
        }
        const created = await createSacaMutation.mutateAsync({
          numeroOrden,
          pesoLbs,
          pesoKg: pesoKg ?? (pesoLbs != null ? lbsToKg(pesoLbs) : undefined),
          tamanio: saca.tamanio,
        });
        idsNuevas.push(created.id);
        if (paqueteIdsSaca.length > 0) {
          await asignarPaquetesASacaMutation.mutateAsync({
            sacaId: created.id,
            paqueteIds: paqueteIdsSaca,
          });
        }
      }

      const finalSacaIds = [...idsExistentes, ...idsNuevas];

      if (isEdit && despacho) {
        await updateDespachoMutation.mutateAsync({
          id: despacho.id,
          body: {
            numeroGuia: values.numeroGuia.trim(),
            distribuidorId: values.distribuidorId,
            tipoEntrega: values.tipoEntrega,
            destinatarioFinalId: values.tipoEntrega === 'DOMICILIO' ? destinatarioFinalId : undefined,
            agenciaId: values.tipoEntrega === 'AGENCIA' ? agenciaId : undefined,
            agenciaDistribuidorId: values.tipoEntrega === 'AGENCIA_DISTRIBUIDOR' ? agenciaDistribuidorId : undefined,
            observaciones: values.observaciones?.trim() || undefined,
            codigoPrecinto: values.codigoPrecinto?.trim() || undefined,
            fechaHora: (() => {
              const v = values.fechaHora;
              if (!v) return undefined;
              return v.length === 16 ? `${v}:00` : v;
            })(),
            sacaIds: finalSacaIds.length > 0 ? finalSacaIds : undefined,
          },
        });
        toast.success('Despacho actualizado');
      } else {
        await createDespachoMutation.mutateAsync({
          numeroGuia: values.numeroGuia.trim(),
          distribuidorId: values.distribuidorId,
          tipoEntrega: values.tipoEntrega,
          destinatarioFinalId: values.tipoEntrega === 'DOMICILIO' ? destinatarioFinalId : undefined,
          agenciaId: values.tipoEntrega === 'AGENCIA' ? agenciaId : undefined,
          agenciaDistribuidorId: values.tipoEntrega === 'AGENCIA_DISTRIBUIDOR' ? agenciaDistribuidorId : undefined,
          observaciones: values.observaciones?.trim() || undefined,
          codigoPrecinto: values.codigoPrecinto?.trim() || undefined,
          fechaHora: (() => {
            const v = values.fechaHora;
            if (!v) return undefined;
            return v.length === 16 ? `${v}:00` : v;
          })(),
          sacaIds: finalSacaIds.length > 0 ? finalSacaIds : undefined,
        });
        toast.success('Despacho creado');
      }
      navigate({ to: '/despachos' });
    } catch (err: unknown) {
      void err;
      toast.error(isEdit ? 'Error al actualizar el despacho' : 'Error al crear el despacho');
    }
  }

  const totalSacasDisplay = sacaIds.length + (sacasNuevas.filter((s) => s.numeroOrden?.trim()).length || 0);
  const sacasParaPaquetes = sacaIds
    .map((id) =>
      isEdit && despacho?.sacas
        ? despacho.sacas.find((x) => x.id === id) ?? sacasOperario.find((s) => s.id === id)
        : sacasSinDespacho.find((s) => s.id === id)
    )
    .filter(Boolean) as { paquetes?: { id: number }[]; pesoTotalKg?: number; pesoTotalLbs?: number }[];
  const totalPaquetesDisplay =
    sacasParaPaquetes.reduce((acc, s) => acc + (s.paquetes?.length ?? 0), 0) +
    (sacasNuevas.reduce((acc, s) => acc + (s.paqueteIds?.length ?? 0), 0) || 0);

  const pesoTotalDespacho = (() => {
    let kg = sacasNuevas.reduce((acc, s) => acc + pesoTotalFromPaquetes(s.paqueteIds ?? []).kg, 0);
    let lbs = sacasNuevas.reduce((acc, s) => acc + pesoTotalFromPaquetes(s.paqueteIds ?? []).lbs, 0);
    sacasParaPaquetes.forEach((s) => {
      if (s.pesoTotalKg != null) kg += s.pesoTotalKg;
      if (s.pesoTotalLbs != null) lbs += s.pesoTotalLbs;
    });
    return { kg, lbs };
  })();

  const paquetesYaAgregadosIdsParaDialog = (() => {
    const ids = new Set<number>(idsEnSacasNuevas);
    if (agregarPaquetesDialog.tipo === 'existente' && agregarPaquetesDialog.sacaId != null) {
      const sacaTarget = sacasSinDespacho.find((s) => s.id === agregarPaquetesDialog.sacaId);
      sacaTarget?.paquetes?.forEach((p) => ids.add(p.id));
    }
    return Array.from(ids);
  })();

  const hasDistribuidorSeleccionado = distribuidorIdForm != null && Number(distribuidorIdForm) > 0;

  async function avanzarAPaso2() {
    const ok = await form.trigger(['fechaHora', 'tipoEntrega']);
    if (!ok) {
      toast.error('Completa los datos del lote para continuar.');
      return;
    }
    setPasoActual(2);
  }

  function avanzarAPaso3() {
    if (totalSacasDisplay < 1) {
      toast.error(UX_MESSAGES.minSacas);
      return;
    }
    setPasoActual(3);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/despachos"
          aria-label="Volver a despachos"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-[var(--color-secondary)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-foreground)]">{title}</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">{subtitle}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {STEPS.map(({ step, label, helper }, i) => (
          <div key={step} className="flex items-center">
            <button
              type="button"
              onClick={() => {
                if (step === pasoActual) return;
                if (step === 2) {
                  void avanzarAPaso2();
                  return;
                }
                if (step === 3) {
                  avanzarAPaso3();
                  return;
                }
                setPasoActual(1);
              }}
              className={`w-full rounded-xl border p-3 text-left transition-colors ${
                step === pasoActual
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : step < pasoActual
                    ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10'
                    : 'border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-muted)]/40'
              }`}
              aria-current={step === pasoActual ? 'step' : undefined}
            >
              <div className="flex items-center gap-3">
              <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  step === pasoActual
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                    : step < pasoActual
                      ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                      : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
                }`}
              >
                {step < pasoActual ? <Check className="h-4 w-4" /> : step}
              </div>
                <div className="space-y-0.5">
                  <p
                    className={`text-sm font-semibold ${
                      step === pasoActual
                        ? 'text-[var(--color-foreground)]'
                        : step < pasoActual
                          ? 'text-[var(--color-primary)]'
                          : 'text-[var(--color-foreground)]'
                    }`}
                  >
                    {label}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">{helper}</p>
                </div>
              </div>
            </button>
            {i < 2 && (
              <div
                className={`mx-1 hidden h-1 w-8 rounded-full sm:mx-2 sm:block sm:w-12 ${
                  step < pasoActual ? 'bg-[var(--color-primary)]/20' : 'bg-[var(--color-muted)]'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      {pasoActual >= 2 && (
        <div className="rounded-md border border-[var(--color-border)]/50 bg-[var(--color-muted)]/30 px-3 py-2 text-center text-sm text-[var(--color-muted-foreground)]">
          <span className="font-medium text-[var(--color-foreground)]">{totalSacasDisplay} sacas</span>
          <span> · </span>
          <span className="font-medium text-[var(--color-foreground)]">{totalPaquetesDisplay} paquetes</span>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {pasoActual === 1 && (
          <>
            <div className="grid gap-6">
              <section className="surface-card p-6 space-y-6">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Datos generales
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Configura los detalles iniciales del despacho.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Operario responsable
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={username ?? '—'}
                      className="input-clean bg-muted/50 text-muted-foreground cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Fecha y hora
                    </label>
                    <input
                      type="datetime-local"
                      {...form.register('fechaHora')}
                      className="input-clean"
                    />
                    {form.formState.errors.fechaHora && (
                      <p className="text-sm text-destructive">{form.formState.errors.fechaHora.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Observaciones (opcional)
                  </label>
                  <textarea
                    {...form.register('observaciones')}
                    rows={3}
                    className="input-clean min-h-[80px] resize-none"
                    placeholder="Escribe cualquier detalle relevante sobre este lote..."
                  />
                </div>
              </section>

              <section className="surface-card p-6 space-y-6">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Truck className="h-5 w-5 text-primary" />
                    Tipo de entrega
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Selecciona cómo se distribuirán los paquetes de este despacho.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <SelectionCard
                    title="Domicilio"
                    description="Entrega directa al destinatario final. Todos los paquetes para un mismo cliente."
                    icon={<Users className="h-5 w-5" />}
                    selected={form.watch('tipoEntrega') === 'DOMICILIO'}
                    onClick={() => form.setValue('tipoEntrega', 'DOMICILIO')}
                  />
                  <SelectionCard
                    title="Agencia"
                    description="Entrega en agencia propia. Paquetes para la misma zona (provincia/cantón)."
                    icon={<MapPin className="h-5 w-5" />}
                    selected={form.watch('tipoEntrega') === 'AGENCIA'}
                    onClick={() => form.setValue('tipoEntrega', 'AGENCIA')}
                  />
                  <SelectionCard
                    title="Agencia Distribuidor"
                    description="Entrega en agencia de tercero. El distribuidor gestiona el reparto final."
                    icon={<Store className="h-5 w-5" />}
                    selected={form.watch('tipoEntrega') === 'AGENCIA_DISTRIBUIDOR'}
                    onClick={() => form.setValue('tipoEntrega', 'AGENCIA_DISTRIBUIDOR')}
                  />
                </div>
              </section>
            </div>

            <div className="flex justify-end pt-6">
              <Button type="button" size="lg" onClick={() => void avanzarAPaso2()}>
                Siguiente paso <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {pasoActual === 2 && (
          <>
            <section ref={sectionSacasRef} className="surface-card space-y-6 p-5">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
                  <Package className="h-4 w-4" />
                  Sacas en este despacho
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Ingresa paquetes (lista o individual) y define la distribución para crear sacas. El peso se calcula automáticamente y el tamaño se configura en cada saca.
                </p>
              </div>
              {(tipoEntrega === 'DOMICILIO' || tipoEntrega === 'AGENCIA_DISTRIBUIDOR') && autoDetectedDestId != null && autoDetectedDest && (
                <div className="ui-alert ui-alert-success">
                  <p className="font-medium">
                    Destinatario detectado: <strong>{autoDetectedDest.nombre}</strong>
                    {(autoDetectedDest.provincia || autoDetectedDest.canton) && (
                      <span className="font-normal"> — {[autoDetectedDest.provincia, autoDetectedDest.canton].filter(Boolean).join(', ')}</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs opacity-80">Solo puedes agregar paquetes del destinatario detectado.</p>
                </div>
              )}
              {(tipoEntrega === 'DOMICILIO' || tipoEntrega === 'AGENCIA_DISTRIBUIDOR') && autoDetectedDestId == null && (
                <div className="ui-alert ui-alert-info">
                  Agrega un primer paquete para fijar automáticamente el destinatario del despacho.
                </div>
              )}
              {tipoEntrega === 'AGENCIA' && provinciaCantonRef != null && (
                <div className="ui-alert ui-alert-success">
                  <p className="font-medium">
                    Ubicación del envío: <strong>{provinciaCantonRef.provincia}, {provinciaCantonRef.canton}</strong>
                  </p>
                  <p className="mt-1 text-xs opacity-80">Solo puedes agregar paquetes de la misma provincia y cantón.</p>
                </div>
              )}
              {tipoEntrega === 'AGENCIA' && provinciaCantonRef == null && (
                <div className="ui-alert ui-alert-info">
                  Agrega un primer paquete para fijar automáticamente provincia y cantón del despacho.
                </div>
              )}
              {paquetesDisponiblesParaDespacho.length === 0 && (autoDetectedDestId != null || provinciaCantonRef != null) && (
                <p className="text-sm text-[var(--color-muted-foreground)]">No hay más paquetes disponibles que cumplan la restricción actual del despacho.</p>
              )}

              {sacasEnDespacho.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-[var(--color-foreground)]">Sacas ya en el despacho</h3>
                  <ul className="space-y-3">
                    {sacasEnDespacho.map((s) => (
                      <li
                        key={s.id}
                        className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <Badge variant="outline" className="bg-[var(--color-background)] font-semibold">
                              {s.numeroOrden}
                            </Badge>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-[var(--color-muted-foreground)]">Tamaño</span>
                              <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Tamaño de ${s.numeroOrden}`}>
                                {TAMANIO_OPTIONS.map((o) => {
                                  const current = tamanioEditandoPorSaca[s.id] ?? s.tamanio;
                                  const isSelected = current === o.value;
                                  return (
                                    <button
                                      key={o.value}
                                      type="button"
                                      onClick={() => void actualizarTamanioSacaExistente(s.id, o.value)}
                                      disabled={actualizarTamanioSacaMutation.isPending}
                                      className={`flex flex-col items-start rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors ${
                                        isSelected
                                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-medium'
                                          : 'border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]/50'
                                      }`}
                                    >
                                      <span>{o.label}</span>
                                      <span className={isSelected ? 'text-[var(--color-primary)]/80' : 'text-[var(--color-muted-foreground)]'}>
                                        {o.sublabel}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[var(--color-muted-foreground)]">
                              {(s.paquetes?.length ?? 0)} paquete(s)
                            </span>
                            {paquetesDisponiblesParaDespacho.length > 0 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={() =>
                                  setAgregarPaquetesDialog({
                                    open: true,
                                    modo: 'agregarASaca',
                                    tipo: 'existente',
                                    sacaId: s.id,
                                    label: s.numeroOrden,
                                  })
                                }
                              >
                                <Plus className="mr-1 h-3 w-3" />
                                Agregar paquetes
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-[var(--color-destructive)]"
                              aria-label={`Quitar saca ${s.numeroOrden}`}
                              onClick={() =>
                                setConfirmQuitarSaca({
                                  open: true,
                                  sacaId: s.id,
                                  label: s.numeroOrden,
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {s.paquetes && s.paquetes.length > 0 ? (
                          <div className="mt-3 overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-background)]">
                            <table className="compact-table min-w-[980px]">
                              <thead>
                                <tr>
                                  <th>Guía</th>
                                  <th>Destinatario</th>
                                  <th>Teléfono</th>
                                  <th>Provincia / Cantón</th>
                                  <th className="text-right">Peso</th>
                                  <th className="text-right">Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {s.paquetes.map((p) => (
                                  <tr key={p.id}>
                                    <td className="font-medium">{p.numeroGuia ?? `#${p.id}`}</td>
                                    <td>{p.destinatarioNombre ?? '—'}</td>
                                    <td>{p.destinatarioTelefono ?? '—'}</td>
                                    <td>{[p.destinatarioProvincia, p.destinatarioCanton].filter(Boolean).join(' / ') || '—'}</td>
                                    <td className="text-right">
                                      {[p.pesoKg != null ? `${p.pesoKg} kg` : null, p.pesoLbs != null ? `${p.pesoLbs} lbs` : null]
                                        .filter(Boolean)
                                        .join(' / ') || '—'}
                                    </td>
                                    <td className="text-right">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-[var(--color-destructive)]"
                                        onClick={() =>
                                          setConfirmQuitarPaquete({
                                            open: true,
                                            paqueteId: p.id,
                                            sacaLabel: s.numeroOrden,
                                            guia: p.numeroGuia ?? `#${p.id}`,
                                          })
                                        }
                                      >
                                        Quitar paquete
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="mt-3 rounded-md border border-dashed border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
                            Esta saca no tiene paquetes asociados.
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {disponiblesParaAgregar.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-[var(--color-foreground)]">Sacas disponibles para agregar</h3>
                  <ul className="space-y-2">
                    {disponiblesParaAgregar.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                      >
                        <span>{s.numeroOrden}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Agregar saca ${s.numeroOrden}`}
                          onClick={() => agregarSacaAlDespacho(s.id)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {fields.length === 0 && sacasEnDespacho.length === 0 ? (
                <div className="space-y-5">
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/10 p-6">
                    <h3 className="text-sm font-medium text-[var(--color-foreground)]">Ingresar paquetes y crear sacas</h3>
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      Escanea o ingresa paquetes (lista o individual) y define la distribución (ej. 1,2,4) para crear varias sacas. El tamaño se configura en cada saca después.
                    </p>
                    <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
                      Aún no hay sacas. Use el botón para ingresar paquetes y crear sacas, o agregue sacas disponibles.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() =>
                        setAgregarPaquetesDialog({
                          open: true,
                          modo: 'crearYDistribuir',
                          tipo: 'nueva',
                          label: 'Crear sacas',
                        })
                      }
                    >
                      <Package className="mr-2 h-4 w-4" />
                      Ingresar paquetes y crear sacas
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/10 p-4">
                    <h3 className="text-sm font-medium text-[var(--color-foreground)]">Ingresar paquetes y crear sacas</h3>
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      Escanea o ingresa paquetes (lista o individual) y luego define la distribución (ej. 1,2,4) para crear más sacas. El tamaño se configura en cada saca.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() =>
                        setAgregarPaquetesDialog({
                          open: true,
                          modo: 'crearYDistribuir',
                          tipo: 'nueva',
                          label: 'Crear sacas',
                        })
                      }
                    >
                      <Package className="mr-2 h-4 w-4" />
                      Ingresar paquetes y crear sacas
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {fields.map((field, index) => {
                      const paqueteIds = form.watch(`sacasNuevas.${index}.paqueteIds`) ?? [];
                      const total = pesoTotalFromPaquetes(paqueteIds);
                      const disponiblesNueva = paquetesDisponiblesParaDespacho.filter((p) => !idsEnSacasNuevas.includes(p.id));
                      return (
                        <div
                          key={field.id}
                          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden shadow-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-muted)]/30 p-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <Badge variant="outline" className="bg-[var(--color-background)] font-semibold">
                                Saca nueva {index + 1}
                              </Badge>
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-[var(--color-muted-foreground)]">Tamaño</span>
                                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tamaño de saca">
                                  {TAMANIO_OPTIONS.map((o) => {
                                    const isSelected = form.watch(`sacasNuevas.${index}.tamanio`) === o.value;
                                    return (
                                      <button
                                        key={o.value}
                                        type="button"
                                        onClick={() => form.setValue(`sacasNuevas.${index}.tamanio`, o.value)}
                                        className={`flex flex-col items-start rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors ${
                                          isSelected
                                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-medium'
                                            : 'border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]/50'
                                        }`}
                                      >
                                        <span>{o.label}</span>
                                        <span className={isSelected ? 'text-[var(--color-primary)]/80' : 'text-[var(--color-muted-foreground)]'}>
                                          {o.sublabel}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              {(total.kg > 0 || total.lbs > 0) && (
                                <span className="text-xs text-[var(--color-muted-foreground)]">
                                  Peso: {total.kg > 0 ? `${total.kg} kg` : ''}{total.kg > 0 && total.lbs > 0 ? ' / ' : ''}{total.lbs > 0 ? `${total.lbs} lbs` : ''}
                                </span>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              aria-label="Quitar saca"
                              className="h-8 w-8 text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="p-4 space-y-4">
                            {paqueteIds.length > 0 && (
                              <>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                                  <span>{paqueteIds.length} paquete{paqueteIds.length !== 1 ? 's' : ''}</span>
                                  <span>·</span>
                                  <span>
                                    Peso total:{' '}
                                    {total.kg > 0 || total.lbs > 0
                                      ? [total.kg > 0 ? `${total.kg} kg` : null, total.lbs > 0 ? `${total.lbs} lbs` : null].filter(Boolean).join(' / ')
                                      : '—'}
                                  </span>
                                </div>
                                <ul className="space-y-1.5">
                                  {paqueteIds.map((id) => {
                                    const p = paquetesSinSaca.find((x) => x.id === id);
                                    return (
                                      <li
                                        key={id}
                                        className="flex flex-col gap-0.5 rounded-md bg-[var(--color-muted)]/30 px-3 py-2 text-sm"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-medium">
                                            {p ? p.numeroGuia : `#${id}`}
                                            {p?.numeroGuiaEnvio && (
                                              <span className="ml-1.5 text-xs font-normal text-[var(--color-muted-foreground)]">
                                                (envío: {p.numeroGuiaEnvio})
                                              </span>
                                            )}
                                            {p && (p.pesoKg != null || p.pesoLbs != null) &&
                                              ` — ${[p.pesoKg != null ? `${p.pesoKg} kg` : null, p.pesoLbs != null ? `${p.pesoLbs} lbs` : null].filter(Boolean).join(' / ')}`}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            {fields.length > 1 && (
                                              <select
                                                className="h-7 rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 text-xs"
                                                value=""
                                                onChange={(e) => {
                                                  const dest = Number(e.target.value);
                                                  if (!Number.isNaN(dest) && dest !== index) moverPaqueteEntreSacasNuevas(index, dest, id);
                                                  e.target.value = '';
                                                }}
                                                aria-label="Mover a otra saca"
                                              >
                                                <option value="">Mover a...</option>
                                                {fields.map((_, i) =>
                                                  i === index ? null : (
                                                    <option key={i} value={i}>
                                                      Saca nueva {i + 1}
                                                    </option>
                                                  )
                                                )}
                                              </select>
                                            )}
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 text-[var(--color-destructive)]"
                                              onClick={() => quitarPaqueteDeSacaNueva(index, id)}
                                            >
                                              Quitar
                                            </Button>
                                          </div>
                                        </div>
                                        {p && (p.destinatarioNombre ?? p.destinatarioDireccion ?? p.destinatarioProvincia ?? p.destinatarioCanton) && (
                                          <div className="text-xs text-[var(--color-muted-foreground)]">
                                            {p.destinatarioNombre && <span>{p.destinatarioNombre}</span>}
                                            {p.destinatarioDireccion && (
                                              <span className={p.destinatarioNombre ? ' block truncate' : ''} title={p.destinatarioDireccion}>
                                                {p.destinatarioDireccion}
                                              </span>
                                            )}
                                            {(p.destinatarioProvincia ?? p.destinatarioCanton) && (
                                              <span className="block">
                                                {[p.destinatarioProvincia, p.destinatarioCanton].filter(Boolean).join(', ')}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              </>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-medium text-[var(--color-muted-foreground)]">O agregar por búsqueda</p>
                              {disponiblesNueva.length > 0 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() =>
                                    setAgregarPaquetesDialog({
                                      open: true,
                                      modo: 'agregarASaca',
                                      tipo: 'nueva',
                                      sacaNuevaIndex: index,
                                      label: form.watch(`sacasNuevas.${index}.numeroOrden`) || `Saca nueva ${index + 1}`,
                                    })
                                  }
                                >
                                  <Plus className="mr-1 h-3 w-3" />
                                  Agregar paquetes
                                </Button>
                              )}
                              {disponiblesNueva.length === 0 && (
                                <span className="text-xs text-[var(--color-muted-foreground)]">No hay más paquetes disponibles</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
            <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setPasoActual(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
              </Button>
              <Button type="button" onClick={avanzarAPaso3}>
                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {pasoActual === 3 && (
          <>
            <section className="surface-card space-y-6 p-5">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
                  <Truck className="h-4 w-4" />
                  Datos del envío
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Revisa el resumen del despacho y completa la información requerida.
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-5 py-4 space-y-4">
                <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Resumen del despacho</h3>
                <div className="grid gap-3 text-sm">
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span><strong className="text-[var(--color-foreground)]">Tipo:</strong> {tipoEntrega === 'DOMICILIO' ? 'Domicilio' : tipoEntrega === 'AGENCIA_DISTRIBUIDOR' ? 'Agencia de distribuidor' : 'Agencia'}</span>
                    <span><strong className="text-[var(--color-foreground)]">Peso total:</strong> {pesoTotalDespacho.kg > 0 || pesoTotalDespacho.lbs > 0 ? [pesoTotalDespacho.kg > 0 ? `${pesoTotalDespacho.kg} kg` : null, pesoTotalDespacho.lbs > 0 ? `${pesoTotalDespacho.lbs} lbs` : null].filter(Boolean).join(' / ') : '—'}</span>
                    <span><strong className="text-[var(--color-foreground)]">Total paquetes:</strong> {totalPaquetesDisplay}</span>
                    <span><strong className="text-[var(--color-foreground)]">Sacas:</strong> {totalSacasDisplay}</span>
                  </div>
                  {totalSacasDisplay > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[var(--color-muted-foreground)] mb-1.5">Sacas del lote y tamaño</p>
                      <ul className="list-disc list-inside space-y-0.5 text-[var(--color-foreground)]">
                        {sacasEnDespacho.map((s) => (
                          <li key={s.id}>
                            {s.numeroOrden} — {s.tamanio ? TAMANIO_LABELS[s.tamanio] : '—'}
                          </li>
                        ))}
                        {sacasNuevas.filter((s) => s.numeroOrden?.trim()).map((s, idx) => (
                          <li key={`nueva-${idx}`}>
                            {(s.numeroOrden ?? '').trim() || `Saca nueva ${idx + 1}`} — {s.tamanio ? TAMANIO_LABELS[s.tamanio] : '—'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {tipoEntrega === 'DOMICILIO' && autoDetectedDest && (
                    <div>
                      <p className="text-xs font-medium text-[var(--color-muted-foreground)] mb-1.5">Destinatario final</p>
                      <div className="text-[var(--color-foreground)] rounded-md bg-[var(--color-background)]/60 p-3 space-y-0.5">
                        <p className="font-medium">{autoDetectedDest.nombre}</p>
                        {autoDetectedDest.direccion && <p className="text-xs">{autoDetectedDest.direccion}</p>}
                        {(autoDetectedDest.provincia || autoDetectedDest.canton) && (
                          <p className="text-xs">{[autoDetectedDest.provincia, autoDetectedDest.canton].filter(Boolean).join(', ')}</p>
                        )}
                        {autoDetectedDest.telefono && <p className="text-xs">{autoDetectedDest.telefono}</p>}
                        {autoDetectedDest.codigo && <p className="text-xs">Código: {autoDetectedDest.codigo}</p>}
                      </div>
                    </div>
                  )}
                  {(tipoEntrega === 'DOMICILIO' || tipoEntrega === 'AGENCIA_DISTRIBUIDOR') && !autoDetectedDest && (
                    <p className="text-xs text-[var(--color-warning)]">No se ha detectado destinatario. Agrega paquetes en el paso anterior.</p>
                  )}
                  {tipoEntrega === 'AGENCIA_DISTRIBUIDOR' && selectedAgenciaDistribuidor && (
                    <div>
                      <p className="text-xs font-medium text-[var(--color-muted-foreground)] mb-1.5">Agencia del distribuidor</p>
                      <div className="text-[var(--color-foreground)] rounded-md bg-[var(--color-background)]/60 p-3 space-y-0.5">
                        <p className="font-medium">{agenciaDistribuidorEtiqueta(selectedAgenciaDistribuidor)}</p>
                        {(selectedAgenciaDistribuidor.provincia || selectedAgenciaDistribuidor.canton) && (
                          <p className="text-xs">{[selectedAgenciaDistribuidor.provincia, selectedAgenciaDistribuidor.canton].filter(Boolean).join(', ')}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {tipoEntrega === 'AGENCIA' && selectedAgencia && (
                    <div>
                      <p className="text-xs font-medium text-[var(--color-muted-foreground)] mb-1.5">Agencia</p>
                      <div className="text-[var(--color-foreground)] rounded-md bg-[var(--color-background)]/60 p-3 space-y-0.5">
                        <p className="font-medium">{selectedAgencia.nombre}</p>
                        <p className="text-xs">Código: {selectedAgencia.codigo}</p>
                        {selectedAgencia.direccion && <p className="text-xs">{selectedAgencia.direccion}</p>}
                        {(selectedAgencia.provincia || selectedAgencia.canton) && (
                          <p className="text-xs">{[selectedAgencia.provincia, selectedAgencia.canton].filter(Boolean).join(', ')}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-4 space-y-4">
                <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Datos logísticos</h3>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">Distribuidor</label>
                  <select
                    {...form.register('distribuidorId', { valueAsNumber: true })}
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                  >
                    <option value={0}>Seleccione distribuidor</option>
                    {distribuidores.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre} ({d.codigo})
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.distribuidorId && (
                    <p className="mt-1 text-sm text-[var(--color-destructive)]">{form.formState.errors.distribuidorId.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">Número de guía</label>
                  <input
                    {...form.register('numeroGuia')}
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                    placeholder="Guía del distribuidor"
                  />
                  {form.formState.errors.numeroGuia && (
                    <p className="mt-1 text-sm text-[var(--color-destructive)]">{form.formState.errors.numeroGuia.message}</p>
                  )}
                </div>
              </div>
              {tipoEntrega === 'AGENCIA' && (
                <div>
                  {provinciaCantonRef != null && (() => {
                    const norm = (s: string | undefined | null) => (s ?? '').trim().toLowerCase();
                    const sugeridas = agencias.filter(
                      (a) =>
                        norm(a.provincia) === provinciaCantonRef.provincia &&
                        norm(a.canton) === provinciaCantonRef.canton
                    );
                    return sugeridas.length > 0 ? (
                      <p className="mb-2 text-xs text-[var(--color-muted-foreground)]">
                        Agencia sugerida (por provincia/cantón del envío): {sugeridas[0].nombre} ({sugeridas[0].codigo})
                      </p>
                    ) : null;
                  })()}
                  <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">Agencia</label>
                  <select
                    {...form.register('agenciaId', { valueAsNumber: true, setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)) })}
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                  >
                    <option value="">Seleccione agencia</option>
                    {agencias.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre} ({a.codigo})
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.agenciaId && (
                    <p className="mt-1 text-sm text-[var(--color-destructive)]">{form.formState.errors.agenciaId.message}</p>
                  )}
                </div>
              )}
              {tipoEntrega === 'AGENCIA_DISTRIBUIDOR' && (
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-[var(--color-foreground)]">Agencia del distribuidor</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={openCrearAgenciaDistribuidorModal}
                      disabled={!hasDistribuidorSeleccionado}
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      Crear nueva agencia de distribuidor
                    </Button>
                  </div>
                  <select
                    {...form.register('agenciaDistribuidorId', { valueAsNumber: true, setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)) })}
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={!hasDistribuidorSeleccionado}
                  >
                    <option value="">Seleccione agencia del distribuidor</option>
                    {agenciasDistribuidor.map((a) => (
                      <option key={a.id} value={a.id}>
                        {agenciaDistribuidorEtiqueta(a)}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.agenciaDistribuidorId && (
                    <p className="mt-1 text-sm text-[var(--color-destructive)]">{form.formState.errors.agenciaDistribuidorId.message}</p>
                  )}
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">Código de precinto (opcional)</label>
                <input
                  {...form.register('codigoPrecinto')}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                  placeholder="Código de precinto"
                />
              </div>
            </section>
            <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setPasoActual(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
              </Button>
              <div className="flex gap-2">
                <Link
                  to="/despachos"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-secondary)]"
                >
                  Cancelar
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading ? submitLoadingLabel : submitLabel}
                </Button>
              </div>
            </div>
          </>
        )}
      </form>

      <ConfirmDialog
        open={confirmQuitarSaca.open}
        onOpenChange={(open) => !open && setConfirmQuitarSaca({ open: false, sacaId: null, label: '' })}
        title="Quitar saca del despacho"
        description={`Se quitará la saca ${confirmQuitarSaca.label || 'seleccionada'} del despacho. Los paquetes de esa saca no se eliminarán.`}
        confirmLabel="Quitar saca"
        variant="destructive"
        loading={loading}
        onConfirm={async () => {
          if (confirmQuitarSaca.sacaId == null) return;
          quitarSacaDelDespacho(confirmQuitarSaca.sacaId);
          setConfirmQuitarSaca({ open: false, sacaId: null, label: '' });
          toast.success('Saca quitada del despacho. Recuerda guardar cambios.');
        }}
      />

      <ConfirmDialog
        open={confirmQuitarPaquete.open}
        onOpenChange={(open) =>
          !open &&
          setConfirmQuitarPaquete({
            open: false,
            paqueteId: null,
            sacaLabel: '',
            guia: '',
          })
        }
        title="Quitar paquete de la saca"
        description={`Se quitará el paquete ${confirmQuitarPaquete.guia || ''} de la saca ${confirmQuitarPaquete.sacaLabel || ''} y quedará disponible sin saca.`}
        confirmLabel="Quitar paquete"
        variant="destructive"
        loading={loading}
        onConfirm={async () => {
          if (confirmQuitarPaquete.paqueteId == null) return;
          try {
            await quitarPaqueteDeSacaExistente(confirmQuitarPaquete.paqueteId);
            toast.success('Paquete desasignado de la saca');
            setConfirmQuitarPaquete({
              open: false,
              paqueteId: null,
              sacaLabel: '',
              guia: '',
            });
          } catch {
            toast.error('Error al quitar el paquete de la saca');
            throw new Error('Detach package failed');
          }
        }}
      />

      <AgregarPaquetesSacaDialog
        open={agregarPaquetesDialog.open}
        onOpenChange={(open) => setAgregarPaquetesDialog((prev) => ({ ...prev, open }))}
        modo={agregarPaquetesDialog.modo}
        sacaTipo={agregarPaquetesDialog.tipo}
        sacaId={agregarPaquetesDialog.sacaId}
        sacaNuevaIndex={agregarPaquetesDialog.sacaNuevaIndex}
        sacaLabel={agregarPaquetesDialog.label}
        paquetesDisponibles={
          agregarPaquetesDialog.tipo === 'existente' && agregarPaquetesDialog.sacaId != null
            ? paquetesDisponiblesParaDespacho.filter(
                (p) =>
                  !sacasSinDespacho
                    .find((s) => s.id === agregarPaquetesDialog.sacaId)
                    ?.paquetes?.some((sp) => sp.id === p.id)
              )
            : paquetesDisponiblesParaDespacho.filter((p) => !idsEnSacasNuevas.includes(p.id))
        }
        paquetesSinPeso={paquetesSinPeso}
        paquetesUniverso={paquetesSinSaca}
        tipoEntrega={tipoEntrega}
        referenciaDestinatarioId={autoDetectedDestId ?? undefined}
        referenciaProvincia={provinciaCantonRef?.provincia}
        referenciaCanton={provinciaCantonRef?.canton}
        paquetesYaAgregadosIds={paquetesYaAgregadosIdsParaDialog}
        onAgregarExistente={
          agregarPaquetesDialog.sacaId != null
            ? (sacaId, paqueteId) => handleAgregarPaqueteASaca(sacaId, paqueteId)
            : undefined
        }
        onAgregarNueva={
          agregarPaquetesDialog.sacaNuevaIndex != null
            ? (index, paqueteId) => agregarPaqueteASacaNueva(index, paqueteId)
            : undefined
        }
        onCrearYDistribuir={
          agregarPaquetesDialog.modo === 'crearYDistribuir'
            ? (paqueteIds: number[], distribucion: number[], tamanio: TamanioSaca | undefined) =>
                handleCrearYDistribuir(paqueteIds, distribucion, tamanio)
            : undefined
        }
        loading={loading}
      />

      <Dialog open={crearAgenciaDistribuidorModalOpen} onOpenChange={setCrearAgenciaDistribuidorModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear nueva agencia de distribuidor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">Provincia</label>
                <select
                  value={modalCrearAgencia.provincia}
                  onChange={(e) => setModalCrearAgencia((prev) => ({ ...prev, provincia: e.target.value, canton: '' }))}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                >
                  <option value="">Seleccione provincia</option>
                  {PROVINCIAS_ECUADOR.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">Cantón</label>
                <select
                  value={modalCrearAgencia.canton}
                  onChange={(e) => setModalCrearAgencia((prev) => ({ ...prev, canton: e.target.value }))}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                  disabled={!modalCrearAgencia.provincia}
                >
                  <option value="">Seleccione cantón</option>
                  {getCantonesByProvincia(modalCrearAgencia.provincia).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">Dirección</label>
              <input
                value={modalCrearAgencia.direccion}
                onChange={(e) => setModalCrearAgencia((prev) => ({ ...prev, direccion: e.target.value }))}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                placeholder="Calle, número, referencias"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">Horario de atención</label>
              <textarea
                value={modalCrearAgencia.horarioAtencion}
                onChange={(e) => setModalCrearAgencia((prev) => ({ ...prev, horarioAtencion: e.target.value }))}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm min-h-[60px]"
                placeholder="Ej: Lunes a Viernes 8:00 - 18:00"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">Días máx. retiro</label>
              <input
                type="text"
                inputMode="numeric"
                value={modalCrearAgencia.diasMaxRetiro}
                onChange={(e) =>
                  setModalCrearAgencia((prev) => ({ ...prev, diasMaxRetiro: e.target.value.replace(/\D/g, '') }))
                }
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                placeholder="Ej: 7"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">Tarifa *</label>
              <input
                type="text"
                inputMode="decimal"
                value={modalCrearAgencia.tarifa === 0 ? '' : String(modalCrearAgencia.tarifa)}
                onKeyDown={(e) => onKeyDownNumericDecimal(e, String(modalCrearAgencia.tarifa))}
                onChange={(e) => {
                  const s = sanitizeNumericDecimal(e.target.value);
                  setModalCrearAgencia((prev) => ({ ...prev, tarifa: s === '' ? 0 : Number(s) }));
                }}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setCrearAgenciaDistribuidorModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={createAgenciaDistribuidorOperarioMutation.isPending || Number(modalCrearAgencia.tarifa) < 0}
              onClick={submitCrearAgenciaDistribuidor}
            >
              {createAgenciaDistribuidorOperarioMutation.isPending ? 'Creando...' : 'Crear agencia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
