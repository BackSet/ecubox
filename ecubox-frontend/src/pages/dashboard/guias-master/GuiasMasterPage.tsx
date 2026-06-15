import { useMemo, useState } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import {
  useDashboardGuiasMaster,
  useGuiasMasterPaginadas,
  useCrearGuiaMaster,
  useActualizarGuiaMaster,
  useEliminarGuiaMaster,
  useCancelarGuiaMaster,
  useSalirGuiaMasterDeRevision,
  useAllGuiasMaster,
  useAplicarAccionBulkGuiasMaster,
} from '@/hooks/useGuiasMaster';
import { MotivoBulkDialog } from '@/components/MotivoBulkDialog';
import {
  ResultadoBulkDialog,
  type ResultadoBulkRechazo,
} from '@/components/ResultadoBulkDialog';
import { AplicarEstadoMasivoDialog, type AplicarEstadoOption } from '@/components/AplicarEstadoMasivoDialog';
import { useSearchPagination } from '@/hooks/useSearchPagination';
import { TablePagination } from '@/components/ui/TablePagination';
import { useConsignatariosOperario } from '@/hooks/useOperarioDespachos';
import { useAuthStore } from '@/stores/authStore';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { getApiErrorMessage } from '@/lib/api/error-message';
import {
  guiaMasterCreateSchema,
  trackingBaseSchema,
  guiaCancelarSchema,
  MAX_MOTIVO,
} from '@/lib/schemas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ListToolbar } from '@/components/ListToolbar';
import { PiezasProgress } from '@/components/PiezasProgress';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { InlineErrorBanner } from '@/components/InlineErrorBanner';
import { KpiCard } from '@/components/KpiCard';
import { KpiCardsGrid } from '@/components/KpiCardsGrid';
import { ChipFiltro, type ChipFiltroTone } from '@/components/ChipFiltro';
import { FiltrosBar } from '@/components/FiltrosBar';
import { MonoTrunc } from '@/components/MonoTrunc';
import { RowActionsMenu, type RowActionEntry } from '@/components/RowActionsMenu';
import { BandejaTabs } from '@/components/BandejaTabs';
import { AprobarGuiaDialog } from './AprobarGuiaDialog';
import { EnviarARevisionDialog } from './EnviarARevisionDialog';
import { PendienteCard, RevisionCard, antiguedad } from './BandejaCards';
import { parsearMotivoRevision } from './revisionMotivos';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { notify } from '@/lib/notify';
import {
  Boxes,
  Building2,
  CalendarDays,
  Eye,
  EyeOff,
  Tag,
  Pencil,
  Trash2,
  UserRound,
  Clock,
  PackageCheck,
  Truck,
  Activity,
  Layers,
  Loader2,
  Ban,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  GUIA_MASTER_ESTADO_ICONS,
  GUIA_MASTER_ESTADO_LABELS_CORTOS,
  GUIA_MASTER_ESTADO_ORDEN,
  GUIA_MASTER_ESTADO_TONES,
  GUIA_MASTER_ESTADOS_TERMINALES,
  GuiaMasterEstadoBadge,
} from './_estado';
import type { EstadoGuiaMaster, GuiaMaster } from '@/types/guia-master';
import type { Consignatario } from '@/types/consignatario';
import type { StatusTone } from '@/components/ui/StatusBadge';
import { ConsignatarioInfo } from '../paquetes/PaqueteCells';

/**
 * Mapea el tono semantico del estado de la guia (StatusTone, 6 colores) al tono
 * compatible con ChipFiltro (5 colores). Como el chip no distingue 'info' de
 * 'primary', ambos se renderizan como primary.
 */
const STATUS_TO_CHIP_TONE: Record<StatusTone, ChipFiltroTone> = {
  primary: 'primary',
  info: 'primary',
  success: 'success',
  warning: 'warning',
  error: 'danger',
  neutral: 'neutral',
};

/** Estados terminales de guía master (no se puede operar sobre ellos). */
const ESTADOS_GUIA_TERMINALES: ReadonlySet<EstadoGuiaMaster> = new Set<EstadoGuiaMaster>([
  'DESPACHO_COMPLETADO',
  'CANCELADA',
]);

/** Vista (bandeja) del módulo de guías master. */
type VistaGuias = 'operativas' | 'pendientes' | 'revision';

/**
 * Estados que componen el "universo operativo" de la guía: todos menos
 * PENDIENTE_VERIFICACION (bandeja de aprobación) y EN_REVISION (bandeja de
 * revisión). La vista operativa envía esta lista explícita al backend para
 * excluir esas guías del listado por defecto.
 */
const ESTADOS_OPERATIVOS: EstadoGuiaMaster[] = GUIA_MASTER_ESTADO_ORDEN.filter(
  (e) => e !== 'PENDIENTE_VERIFICACION' && e !== 'EN_REVISION'
);

/** Estados que el backend debe devolver para una bandeja (filtro por inclusión). */
function estadosDeBandeja(vista: VistaGuias, chips: EstadoGuiaMaster[]): EstadoGuiaMaster[] {
  if (vista === 'pendientes') return ['PENDIENTE_VERIFICACION'];
  if (vista === 'revision') return ['EN_REVISION'];
  return chips.length > 0 ? chips : ESTADOS_OPERATIVOS;
}

/**
 * Defensa adicional: ¿el estado de la guía es compatible con la bandeja activa?
 * Aunque el `placeholderData` ya evita conservar datos entre bandejas, filtramos
 * las filas para NO renderizar nunca un estado que no pertenece a la bandeja.
 */
function estadoEnBandeja(estado: EstadoGuiaMaster, vista: VistaGuias): boolean {
  if (vista === 'pendientes') return estado === 'PENDIENTE_VERIFICACION';
  if (vista === 'revision') return estado === 'EN_REVISION';
  return estado !== 'PENDIENTE_VERIFICACION' && estado !== 'EN_REVISION';
}

/** Acciones de ciclo de vida aplicables en lote a las guías master. */
const ACCIONES_GUIA: readonly AplicarEstadoOption[] = [
  { value: 'APROBAR', label: 'Aprobar guía' },
  { value: 'RECALCULAR', label: 'Recalcular estado' },
  { value: 'MARCAR_REVISION', label: 'Enviar a revisión' },
  { value: 'SALIR_REVISION', label: 'Salir de revisión' },
  { value: 'CANCELAR', label: 'Cancelar guía' },
  { value: 'REABRIR', label: 'Reabrir guía' },
];

/** Acciones masivas relevantes por bandeja (contextuales). */
const ACCIONES_POR_BANDEJA: Record<VistaGuias, ReadonlySet<string>> = {
  operativas: new Set(['RECALCULAR', 'MARCAR_REVISION', 'CANCELAR', 'REABRIR']),
  pendientes: new Set(['APROBAR', 'MARCAR_REVISION', 'CANCELAR']),
  revision: new Set(['APROBAR', 'SALIR_REVISION']),
};

/** Acciones que requieren un motivo obligatorio antes de aplicarse. */
const ACCIONES_CON_MOTIVO: ReadonlySet<string> = new Set(['CANCELAR', 'REABRIR', 'MARCAR_REVISION']);

type AccionConMotivo = 'CANCELAR' | 'REABRIR' | 'MARCAR_REVISION';

/** Texto de ayuda por acción: explica qué guías se listan. */
const AYUDA_ACCION: Record<string, string> = {
  APROBAR: 'Aprueba una guía en verificación o en revisión para reanudar el flujo y calcular su estado.',
  RECALCULAR: 'Recalcula el estado derivado. Se listan guías con al menos una pieza registrada (no terminales ni en revisión).',
  MARCAR_REVISION: 'Pausa el recálculo automático. Se listan guías activas que no están en revisión.',
  SALIR_REVISION: 'Reanuda el flujo normal. Solo se listan guías en revisión.',
  CANCELAR: 'Anula la guía. Solo se listan guías sin piezas despachadas y no terminales.',
  REABRIR: 'Reactiva una guía cerrada o cancelada. Solo se listan guías en estado terminal.',
};

/**
 * Devuelve la razón por la que una guía NO es elegible para la acción, o
 * {@code null} si es elegible. Refleja las precondiciones del backend
 * (GuiaMasterService): el backend revalida al aplicar y devuelve su propio
 * motivo si algo cambió entre la carga y el envío.
 */
function motivoNoElegibleParaAccion(guia: GuiaMaster, accion: string): string | null {
  const estado = guia.estadoGlobal;
  const estadoLabel = GUIA_MASTER_ESTADO_LABELS_CORTOS[estado] ?? estado;
  const terminal = ESTADOS_GUIA_TERMINALES.has(estado);
  const piezasRegistradas = guia.piezasRegistradas ?? 0;
  const piezasDespachadas = guia.piezasDespachadas ?? 0;
  switch (accion) {
    case 'APROBAR':
      if (estado === 'PENDIENTE_VERIFICACION' || estado === 'EN_REVISION') return null;
      return `Solo se aprueban guías pendientes de verificación o en revisión · estado actual: ${estadoLabel}`;
    case 'RECALCULAR':
      if (terminal) return `Está en estado terminal (${estadoLabel}); el recálculo no aplica`;
      if (estado === 'EN_REVISION') return 'Está en revisión; el recálculo automático está pausado';
      if (piezasRegistradas < 1) return 'No tiene piezas registradas que permitan derivar un estado';
      return null;
    case 'MARCAR_REVISION':
      if (estado === 'EN_REVISION') return 'Ya está en revisión';
      if (terminal) return `Está en estado terminal (${estadoLabel}); reábrela primero`;
      return null;
    case 'SALIR_REVISION':
      if (estado === 'EN_REVISION') return null;
      return `No está en revisión · estado actual: ${estadoLabel}`;
    case 'CANCELAR':
      if (terminal) return `Ya está en estado terminal (${estadoLabel})`;
      if (piezasDespachadas > 0)
        return `Tiene ${piezasDespachadas} pieza${piezasDespachadas === 1 ? '' : 's'} despachada${piezasDespachadas === 1 ? '' : 's'}; no se puede cancelar`;
      return null;
    case 'REABRIR':
      if (terminal) return null;
      return `Solo se reabren guías en estado terminal · estado actual: ${estadoLabel}`;
    default:
      return 'Acción desconocida';
  }
}

export function GuiasMasterPage() {
  const navigate = useNavigate();
  const { q, page, size, setQ, setPage, setSize, resetPage } = useSearchPagination({
    initialSize: 25,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingGuia, setEditingGuia] = useState<GuiaMaster | null>(null);
  const [deletingGuia, setDeletingGuia] = useState<GuiaMaster | null>(null);
  const [cancelingGuia, setCancelingGuia] = useState<GuiaMaster | null>(null);
  const [estadosFiltro, setEstadosFiltro] = useState<Set<EstadoGuiaMaster>>(
    () => new Set()
  );
  // Bandeja persistida en la URL (?bandeja=). 'operativas' es el valor por
  // defecto y se mantiene sin parámetro para no ensuciar la URL.
  const bandejaUrl = useRouterState({
    select: (state) => (state.location.search as { bandeja?: string }).bandeja,
  });
  const vista: VistaGuias =
    bandejaUrl === 'pendientes' || bandejaUrl === 'revision' ? bandejaUrl : 'operativas';
  const enPendientes = vista === 'pendientes';
  const enRevision = vista === 'revision';

  // Diálogos de aprobación / envío a revisión (por fila).
  const [aprobandoGuia, setAprobandoGuia] = useState<GuiaMaster | null>(null);
  const [revisandoGuia, setRevisandoGuia] = useState<GuiaMaster | null>(null);

  const hasUpdate = useAuthStore((s) => s.hasPermission('GUIAS_MASTER_UPDATE'));
  const hasDelete = useAuthStore((s) => s.hasPermission('GUIAS_MASTER_DELETE'));
  const hasGuiasCreate = useAuthStore((s) => s.hasPermission('GUIAS_MASTER_CREATE'));
  const eliminar = useEliminarGuiaMaster();

  // Estado del diálogo "Aplicar acción" (masivo)
  const [aplicarEstadoOpen, setAplicarEstadoOpen] = useState(false);
  const [guiasSeleccionadas, setGuiasSeleccionadas] = useState<number[]>([]);
  const [accionSeleccionada, setAccionSeleccionada] = useState('');
  const [motivoBulkOpen, setMotivoBulkOpen] = useState(false);
  const [motivoBulk, setMotivoBulk] = useState('');
  const [accionParaMotivo, setAccionParaMotivo] = useState<AccionConMotivo>('CANCELAR');

  // Para chips y KPIs usamos el dashboard agregado, evitando cargar todas las guias.
  const { data: dashGM } = useDashboardGuiasMaster(5, true);

  const estadosArray = useMemo(
    () => Array.from(estadosFiltro),
    [estadosFiltro]
  );

  // Estados enviados al backend según la bandeja activa.
  const estadosEfectivos = useMemo<EstadoGuiaMaster[]>(
    () => estadosDeBandeja(vista, estadosArray),
    [vista, estadosArray],
  );

  const pageQuery = useGuiasMasterPaginadas({
    bandeja: vista,
    q: q.trim() || undefined,
    estados: estadosEfectivos,
    page,
    size,
  });
  // Defensa: nunca renderizar filas cuyo estado no pertenece a la bandeja
  // activa (p. ej. una guía que avanzó de estado entre cargas).
  const guias = (pageQuery.data?.content ?? []).filter((g) =>
    estadoEnBandeja(g.estadoGlobal, vista),
  );
  const isLoading = pageQuery.isLoading;
  const error = pageQuery.error;
  const totalElements = pageQuery.data?.totalElements ?? 0;
  const totalPages = pageQuery.data?.totalPages ?? 0;

  const conteosPorEstado: Partial<Record<EstadoGuiaMaster, number>> =
    dashGM?.conteosPorEstado ?? {};
  const totalGuias = useMemo(
    () => Object.values(conteosPorEstado).reduce((total, count) => total + count, 0),
    [conteosPorEstado]
  );

  // KPIs operativos: agrupamos los 8 estados en 4 etapas del ciclo de vida
  // para que el operario tenga un resumen accionable de un vistazo.
  const stats = useMemo(() => {
    const c = conteosPorEstado;
    // No incluye PENDIENTE_VERIFICACION: esas guías viven en la pestaña de
    // aprobación, fuera del universo operativo que resumen estos KPIs.
    const enEspera =
      (c.SIN_PAQUETES_REGISTRADOS ?? 0) +
      (c.CON_PAQUETES_REGISTRADOS ?? 0);
    const enRecepcion =
      (c.ENVIO_PARCIAL ?? 0) +
      (c.ENVIO_COMPLETO ?? 0) +
      (c.RECEPCION_PARCIAL ?? 0) +
      (c.RECEPCION_COMPLETA ?? 0);
    // EN_REVISION NO se cuenta aquí: vive en su propia bandeja, no en "En despacho".
    const enDespacho = c.DESPACHO_PARCIAL ?? 0;
    const cerradas =
      (c.DESPACHO_COMPLETADO ?? 0) +
      (c.CANCELADA ?? 0);
    return {
      total: totalGuias,
      enEspera,
      enRecepcion,
      enDespacho,
      cerradas,
    };
  }, [conteosPorEstado, totalGuias]);

  const pendientesCount = conteosPorEstado.PENDIENTE_VERIFICACION ?? 0;
  const revisionCount = conteosPorEstado.EN_REVISION ?? 0;
  const operativasCount = totalGuias - pendientesCount - revisionCount;

  function cambiarVista(next: VistaGuias) {
    if (next === vista) return;
    // Al cambiar de bandeja limpiamos lo que no aplica: chips, selección
    // masiva, acción elegida, diálogo masivo y volvemos a la primera página.
    setEstadosFiltro(new Set());
    setGuiasSeleccionadas([]);
    setAccionSeleccionada('');
    setAplicarEstadoOpen(false);
    resetPage();
    // Persistimos la bandeja en la URL (operativas → sin parámetro).
    navigate({
      to: '/guias-master',
      search: ((previous: Record<string, unknown>) => ({
        ...previous,
        bandeja: next === 'operativas' ? undefined : next,
      })) as never,
      replace: true,
    });
  }

  // Búsqueda y filtros se aplican en servidor (la defensa de bandeja ya filtró
  // estados incompatibles).
  const filtered = guias;
  const pendientesConPiezas = useMemo(
    () => filtered.filter((g) => (g.piezasRegistradas ?? 0) > 0).length,
    [filtered],
  );
  const revisionConInconsistencias = pendientesConPiezas;

  // Hooks y lógica de "Aplicar acción" masiva. Las acciones por fila del
  // listado siguen usando los hooks individuales; el lote va por el endpoint bulk.
  const allGuiasQuery = useAllGuiasMaster(aplicarEstadoOpen);
  const salirRevision = useSalirGuiaMasterDeRevision();
  const aplicarAccionBulk = useAplicarAccionBulkGuiasMaster();
  const [resultadoBulk, setResultadoBulk] = useState<{
    accionLabel: string;
    procesadas: number;
    rechazados: ResultadoBulkRechazo[];
  } | null>(null);

  const aplicarIsPending = aplicarAccionBulk.isPending;

  const cerrarAplicarEstado = () => {
    setAplicarEstadoOpen(false);
    setGuiasSeleccionadas([]);
    setAccionSeleccionada('');
  };

  const handleAplicarAccionGuias = async () => {
    if (!accionSeleccionada) {
      notify.warning('Selecciona una acción a aplicar', 'Elige la acción de ciclo de vida que quieres ejecutar sobre las guías.');
      return;
    }
    if (guiasSeleccionadas.length === 0) {
      notify.warning('Selecciona al menos una guía', 'Marca las guías master a las que se aplicará la acción.');
      return;
    }
    if (ACCIONES_CON_MOTIVO.has(accionSeleccionada)) {
      setAccionParaMotivo(accionSeleccionada as AccionConMotivo);
      setAplicarEstadoOpen(false);
      setMotivoBulkOpen(true);
      return;
    }
    await runBulkAction(accionSeleccionada, guiasSeleccionadas, undefined);
    cerrarAplicarEstado();
  };

  const runBulkAction = async (accion: string, ids: number[], motivo: string | undefined) => {
    const accionLabel = ACCIONES_GUIA.find((a) => a.value === accion)?.label ?? 'Acción';
    try {
      const res = await aplicarAccionBulk.mutateAsync({ accion, guiaIds: ids, motivo });
      if (res.rechazados.length === 0) {
        notify.success(
          `Acción aplicada: ${accionLabel.toLowerCase()}`,
          `${res.procesadas} guía${res.procesadas === 1 ? '' : 's'} master actualizada${res.procesadas === 1 ? '' : 's'}.`,
        );
      } else {
        // Resumen detallado: el backend devuelve cada guía rechazada con su motivo.
        setResultadoBulk({
          accionLabel,
          procesadas: res.procesadas,
          rechazados: res.rechazados.map((r) => ({ codigo: r.trackingBase, motivo: r.motivo })),
        });
      }
    } catch (err: unknown) {
      notify.error('No se pudo aplicar la acción', getApiErrorMessage(err));
      throw err;
    }
  };

  function toggleEstado(estado: EstadoGuiaMaster) {
    setEstadosFiltro((prev) => {
      const next = new Set(prev);
      if (next.has(estado)) next.delete(estado);
      else next.add(estado);
      return next;
    });
    resetPage();
  }

  const irADetalle = (id: number) =>
    navigate({ to: '/guias-master/$id', params: { id: String(id) } });

  const salirDeRevisionGuia = async (g: GuiaMaster) => {
    try {
      await salirRevision.mutateAsync({ id: g.id, body: {} });
      notify.success('Revisión finalizada', `${g.trackingBase} · La guía vuelve al estado derivado de sus piezas.`);
    } catch (err: unknown) {
      notify.error('No se pudo salir de revisión', getApiErrorMessage(err) ?? g.trackingBase);
    }
  };

  /** Menú de acciones por fila (bandeja operativas / genérico). */
  const accionesDeFila = (g: GuiaMaster): RowActionEntry[] => {
    const terminal = GUIA_MASTER_ESTADOS_TERMINALES.has(g.estadoGlobal);
    const aprobable = g.estadoGlobal === 'PENDIENTE_VERIFICACION' || g.estadoGlobal === 'EN_REVISION';
    return [
      { label: 'Ver piezas', icon: Eye, onSelect: () => irADetalle(g.id) },
      { label: 'Editar guía', icon: Pencil, onSelect: () => setEditingGuia(g), hidden: !hasUpdate },
      { label: 'Aprobar guía', icon: Check, onSelect: () => setAprobandoGuia(g), hidden: !hasUpdate || !aprobable },
      {
        label: 'Enviar a revisión',
        icon: Eye,
        onSelect: () => setRevisandoGuia(g),
        hidden: !hasUpdate || terminal || g.estadoGlobal === 'EN_REVISION',
      },
      {
        label: 'Salir de revisión',
        icon: EyeOff,
        onSelect: () => salirDeRevisionGuia(g),
        hidden: !hasUpdate || g.estadoGlobal !== 'EN_REVISION',
      },
      {
        label: 'Cancelar guía',
        icon: Ban,
        onSelect: () => setCancelingGuia(g),
        hidden: !hasUpdate || terminal || (g.piezasDespachadas ?? 0) > 0 || g.estadoGlobal === 'EN_REVISION',
      },
      { type: 'separator' },
      { label: 'Eliminar', icon: Trash2, destructive: true, onSelect: () => setDeletingGuia(g), hidden: !hasDelete },
    ];
  };

  return (
    <div className="page-stack">
      <ListToolbar
        title="Guías master"
        searchPlaceholder="Buscar por número de guía, consignatario (nombre/código) o cliente (usuario/email)..."
        value={q}
        onSearchChange={setQ}
        actions={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {hasGuiasCreate && (
              <Button className="flex-1 sm:flex-none" onClick={() => setCreateOpen(true)}>
                Registrar guía
              </Button>
            )}
            {hasUpdate && (
              <>
                {/* Escritorio: botón visible. Móvil: dentro de "Más acciones". */}
                <Button
                  variant="outline"
                  className="hidden sm:inline-flex"
                  onClick={() => setAplicarEstadoOpen(true)}
                >
                  <Tag className="mr-2 h-4 w-4" />
                  Aplicar acción
                </Button>
                <div className="sm:hidden">
                  <RowActionsMenu
                    ariaLabel="Más acciones"
                    items={[
                      {
                        label: 'Aplicar acción a varias guías',
                        icon: Tag,
                        onSelect: () => setAplicarEstadoOpen(true),
                      },
                    ]}
                  />
                </div>
              </>
            )}
          </div>
        }
      />

      <BandejaTabs<VistaGuias>
        value={vista}
        onValueChange={cambiarVista}
        ariaLabel="Bandejas de guías master"
        description={
          enPendientes
            ? 'Revisa la información del cliente antes de habilitar la guía.'
            : enRevision
              ? 'Guías pausadas temporalmente mientras se valida su información.'
              : undefined
        }
        help={enPendientes ? 'Mientras esté pendiente no admite nuevos paquetes.' : undefined}
        options={[
          { value: 'operativas', label: 'Operativas', count: operativasCount, tone: 'neutral' },
          { value: 'pendientes', label: 'Pendientes', count: pendientesCount, tone: 'warning' },
          { value: 'revision', label: 'En revisión', count: revisionCount, tone: 'info' },
        ]}
      />

      {vista === 'operativas' && totalGuias > 0 && (
        <KpiCardsGrid>
          <KpiCard
            icon={<Clock className="h-5 w-5" />}
            label="En espera"
            value={stats.enEspera}
            tone={stats.enEspera > 0 ? 'warning' : 'neutral'}
            hint="Sin recibir aún"
          />
          <KpiCard
            icon={<PackageCheck className="h-5 w-5" />}
            label="En recepción"
            value={stats.enRecepcion}
            tone={stats.enRecepcion > 0 ? 'primary' : 'neutral'}
            hint="Parciales y completas"
          />
          <KpiCard
            icon={<Truck className="h-5 w-5" />}
            label="En despacho"
            value={stats.enDespacho}
            tone={stats.enDespacho > 0 ? 'primary' : 'neutral'}
            hint="Despachos parciales"
          />
        </KpiCardsGrid>
      )}

      {enPendientes && pendientesCount > 0 && (
        <KpiCardsGrid>
          <KpiCard
            icon={<Clock className="h-5 w-5" />}
            label="Pendientes"
            value={pendientesCount}
            tone="warning"
            hint="A la espera de aprobación"
          />
          <KpiCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Con paquetes registrados"
            value={pendientesConPiezas}
            tone={pendientesConPiezas > 0 ? 'warning' : 'neutral'}
            hint="Inconsistencia en esta página"
          />
        </KpiCardsGrid>
      )}

      {enRevision && revisionCount > 0 && (
        <KpiCardsGrid>
          <KpiCard
            icon={<Eye className="h-5 w-5" />}
            label="En revisión"
            value={revisionCount}
            tone="info"
            hint="Pausadas para validar"
          />
          <KpiCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Con inconsistencias"
            value={revisionConInconsistencias}
            tone={revisionConInconsistencias > 0 ? 'warning' : 'neutral'}
            hint="Con paquetes en esta página"
          />
        </KpiCardsGrid>
      )}

      {vista === 'operativas' && totalGuias > 0 && (
        <FiltrosBar
          hayFiltrosActivos={estadosFiltro.size > 0}
          onLimpiar={() => {
            setEstadosFiltro(new Set());
            resetPage();
          }}
          chips={
            <>
              <ChipFiltro
                label="Todas"
                count={operativasCount}
                active={estadosFiltro.size === 0}
                onClick={() => {
                  setEstadosFiltro(new Set());
                  resetPage();
                }}
              />
              {GUIA_MASTER_ESTADO_ORDEN.map((estado) => {
                // PENDIENTE_VERIFICACION y EN_REVISION viven en sus propias
                // bandejas, no en los filtros operativos.
                if (estado === 'PENDIENTE_VERIFICACION' || estado === 'EN_REVISION') return null;
                const count = conteosPorEstado[estado] ?? 0;
                const active = estadosFiltro.has(estado);
                if (count === 0 && !active) return null;
                const Icon = GUIA_MASTER_ESTADO_ICONS[estado];
                return (
                  <ChipFiltro
                    key={estado}
                    label={GUIA_MASTER_ESTADO_LABELS_CORTOS[estado]}
                    count={count}
                    active={active}
                    tone={STATUS_TO_CHIP_TONE[GUIA_MASTER_ESTADO_TONES[estado]]}
                    icon={<Icon className="h-3.5 w-3.5" />}
                    onClick={() => toggleEstado(estado)}
                  />
                );
              })}
            </>
          }
        />
      )}

      {/*
       * Mostramos el banner de error ENCIMA de la tabla en lugar de reemplazarla.
       * Dentro de la MISMA bandeja conservamos los resultados previos (ver
       * `useGuiasMasterPaginadas`), así el usuario sigue viendo la última lista
       * mientras el reintento está en curso. Solo cuando no hay datos en cache
       * mostramos el alerta grande.
       */}
      {error && filtered.length > 0 && (
        <InlineErrorBanner
          message="No se pudieron actualizar las guías"
          hint="Mostrando los resultados anteriores. Reintentando en segundo plano."
          onRetry={() => pageQuery.refetch()}
          retrying={pageQuery.isFetching}
        />
      )}

      {error && filtered.length === 0 && !isLoading ? (
        <InlineErrorBanner
          message="Error al cargar guías master"
          hint="Verifica tu conexión o intenta de nuevo."
          onRetry={() => pageQuery.refetch()}
          retrying={pageQuery.isFetching}
        />
      ) : !isLoading && filtered.length === 0 ? (
        // Importante: `filtered` viene del endpoint /page que ya aplica `q` y
        // `estados`. Por eso usamos el total agregado + el estado de los filtros
        // para diferenciar:
        //   - "No hay guías registradas": no existe NINGUNA guía en el sistema
        //     y tampoco hay búsqueda/filtros aplicados.
        //   - "Sin resultados": sí hay guías pero la búsqueda/filtro no
        //     encuentra coincidencias.
        enPendientes ? (
          <EmptyState
            icon={Check}
            title={q.trim() !== '' ? 'Sin resultados' : 'No hay guías pendientes de aprobación'}
            description={
              q.trim() !== ''
                ? `No encontramos guías pendientes que coincidan con "${q.trim()}".`
                : 'Las guías registradas por clientes aparecerán aquí para su aprobación.'
            }
            action={
              q.trim() !== '' ? (
                <Button variant="outline" onClick={() => setQ('')}>
                  Limpiar búsqueda
                </Button>
              ) : undefined
            }
          />
        ) : enRevision ? (
          <EmptyState
            icon={Eye}
            title={q.trim() !== '' ? 'Sin resultados' : 'No hay guías en revisión'}
            description={
              q.trim() !== ''
                ? `No encontramos guías en revisión que coincidan con "${q.trim()}".`
                : 'Las guías que envíes a revisión aparecerán aquí para validarlas.'
            }
            action={
              q.trim() !== '' ? (
                <Button variant="outline" onClick={() => setQ('')}>
                  Limpiar búsqueda
                </Button>
              ) : undefined
            }
          />
        ) : (
        (() => {
          const tieneFiltros = q.trim() !== '' || estadosFiltro.size > 0;
          const sinDatos = operativasCount === 0 && !tieneFiltros;
          return (
            <EmptyState
              icon={Boxes}
              title={sinDatos ? 'No hay guías registradas' : 'Sin resultados'}
              description={
                sinDatos
                  ? 'Registra una guía indicando su número y consignatario.'
                  : tieneFiltros && q.trim() !== ''
                    ? `No encontramos guías que coincidan con "${q.trim()}". Prueba con otro número de guía, consignatario o cliente.`
                    : 'No hay guías que coincidan con los filtros aplicados.'
              }
              action={
                sinDatos ? (
                  <Button onClick={() => setCreateOpen(true)}>Registrar guía</Button>
                ) : tieneFiltros ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQ('');
                      setEstadosFiltro(new Set());
                      resetPage();
                    }}
                  >
                    Limpiar búsqueda
                  </Button>
                ) : undefined
              }
            />
          );
        })()
        )
      ) : (
        <>
        <p className="text-xs text-muted-foreground">
          {totalElements} guía{totalElements === 1 ? '' : 's'}
          {pageQuery.isFetching ? ' · cargando...' : ''}
        </p>

        {enPendientes ? (
          <BandejaPendientes
            guias={filtered}
            hasUpdate={hasUpdate}
            onAbrir={irADetalle}
            onAprobar={setAprobandoGuia}
            onEditar={setEditingGuia}
          />
        ) : enRevision ? (
          <BandejaRevision
            guias={filtered}
            hasUpdate={hasUpdate}
            onAbrir={irADetalle}
            onAprobar={setAprobandoGuia}
            onSalirRevision={salirDeRevisionGuia}
          />
        ) : (
          <ListTableShell>
            <Table className="min-w-[760px] text-sm [&_td]:py-2.5">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[14rem]">
                    <span className="inline-flex items-center gap-1.5">
                      <Boxes className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      Guía
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      Estado
                    </span>
                  </TableHead>
                  <TableHead className="min-w-[14rem]">
                    <span className="inline-flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      Piezas
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1.5">
                      <UserRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      Consignatario
                    </span>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      Cliente
                    </span>
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      Creada
                    </span>
                  </TableHead>
                  <TableHead className="w-12 text-right" aria-label="Acciones" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRowsSkeleton
                    columns={7}
                    columnClasses={{
                      4: 'hidden md:table-cell',
                      5: 'hidden xl:table-cell',
                    }}
                  />
                )}
                {filtered.map((g) => {
                  const totalPendiente = g.totalPiezasEsperadas == null;
                  return (
                    <TableRow
                      key={g.id}
                      className={`cursor-pointer transition-colors ${totalPendiente ? 'bg-[color-mix(in_oklab,var(--color-warning)_10%,transparent)] hover:bg-[color-mix(in_oklab,var(--color-warning)_16%,transparent)]' : 'hover:bg-muted/40'}`}
                      onClick={() => irADetalle(g.id)}
                    >
                      <TableCell className="max-w-[14rem] align-top">
                        <MonoTrunc value={g.trackingBase} className="font-medium text-foreground" />
                      </TableCell>
                      <TableCell className="align-top">
                        <GuiaMasterEstadoBadge estado={g.estadoGlobal} />
                      </TableCell>
                      <TableCell className="align-top">
                        <PiezasProgressCell guia={g} />
                      </TableCell>
                      <TableCell className="max-w-[18rem] align-top">
                        <ConsignatarioInfo
                          nombre={g.consignatarioNombre}
                          telefono={g.consignatarioTelefono}
                          direccion={g.consignatarioDireccion}
                          provincia={g.consignatarioProvincia}
                          canton={g.consignatarioCanton}
                          emptyLabel="Sin asignar"
                          emptyItalic
                        />
                      </TableCell>
                      <TableCell className="hidden align-top md:table-cell">
                        <PersonaCell
                          nombre={g.clienteUsuarioNombre}
                          icon={<Building2 className="h-3.5 w-3.5" />}
                          emptyLabel="—"
                        />
                      </TableCell>
                      <TableCell className="hidden align-top text-xs text-muted-foreground xl:table-cell">
                        <FechaCreada createdAt={g.createdAt} />
                      </TableCell>
                      <TableCell className="text-right align-top" onClick={(e) => e.stopPropagation()}>
                        <RowActionsMenu items={accionesDeFila(g)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ListTableShell>
        )}

        <TablePagination
          page={page}
          size={size}
          totalElements={totalElements}
          totalPages={totalPages}
          onPageChange={setPage}
          onSizeChange={setSize}
          loading={pageQuery.isFetching}
        />
        </>
      )}

      {createOpen && (
        <GuiaMasterFormDialog mode="create" onClose={() => setCreateOpen(false)} />
      )}

      {editingGuia && (
        <GuiaMasterFormDialog
          mode="edit"
          guia={editingGuia}
          onClose={() => setEditingGuia(null)}
        />
      )}

      {cancelingGuia && (
        <CancelarGuiaDialog
          guia={cancelingGuia}
          onClose={() => setCancelingGuia(null)}
        />
      )}

      {aprobandoGuia && (
        <AprobarGuiaDialog
          guia={aprobandoGuia}
          onClose={() => setAprobandoGuia(null)}
          onEnviarRevision={(g) => {
            setAprobandoGuia(null);
            setRevisandoGuia(g);
          }}
        />
      )}

      {revisandoGuia && (
        <EnviarARevisionDialog
          guia={revisandoGuia}
          onClose={() => setRevisandoGuia(null)}
        />
      )}

      <ConfirmDialog
        open={deletingGuia != null}
        onOpenChange={(open) => !open && !eliminar.isPending && setDeletingGuia(null)}
        title="¿Eliminar guía?"
        description={
          deletingGuia
            ? `Se eliminará la guía "${deletingGuia.trackingBase}" junto con todos sus paquetes asociados${
                (deletingGuia.piezasRegistradas ?? 0) > 0
                  ? ` (${deletingGuia.piezasRegistradas} pieza${
                      deletingGuia.piezasRegistradas === 1 ? '' : 's'
                    })`
                  : ''
              }. Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        variant="destructive"
        loading={eliminar.isPending}
        onConfirm={async () => {
          if (!deletingGuia) return;
          try {
            const piezas = deletingGuia.piezasRegistradas ?? 0;
            await eliminar.mutateAsync(deletingGuia.id);
            notify.success(
              'Guía master eliminada',
              `${deletingGuia.trackingBase}` +
                (piezas > 0 ? ` · Se eliminaron también sus ${piezas} pieza${piezas === 1 ? '' : 's'}.` : ''),
            );
            setDeletingGuia(null);
          } catch (err: unknown) {
            notify.error('No se pudo eliminar la guía master', getApiErrorMessage(err) ?? deletingGuia.trackingBase);
            throw err;
          }
        }}
      />

      <AplicarEstadoMasivoDialog
        open={aplicarEstadoOpen}
        title="Aplicar acción a guías master"
        description="Aplica una acción de ciclo de vida a las guías master seleccionadas."
        selectionLabel="guías"
        searchPlaceholder="Buscar por tracking base..."
        confirmLabel="Aplicar acción"
        selectPlaceholder="Selecciona una acción..."
        emptyHint="Selecciona una acción para ver las guías elegibles."
        items={(accionSeleccionada ? allGuiasQuery.data ?? [] : []).map((g) => ({
          id: g.id,
          searchText: [g.trackingBase, g.consignatarioNombre, g.clienteUsuarioNombre]
            .filter(Boolean)
            .join(' ') || String(g.id),
          disabledReason: motivoNoElegibleParaAccion(g, accionSeleccionada) ?? undefined,
          content: (
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-mono text-xs font-medium">{g.trackingBase}</span>
                {g.consignatarioNombre && (
                  <span className="truncate text-xs text-muted-foreground">{g.consignatarioNombre}</span>
                )}
                <span className="text-[11px] text-muted-foreground">
                  {g.piezasRegistradas ?? 0}
                  {g.totalPiezasEsperadas != null ? `/${g.totalPiezasEsperadas}` : ''} piezas
                  {' · '}{g.piezasRecibidas ?? 0} recibidas
                  {' · '}{g.piezasDespachadas ?? 0} despachadas
                </span>
              </div>
              <Badge variant="outline" className="shrink-0 text-[11px]">
                {GUIA_MASTER_ESTADO_LABELS_CORTOS[g.estadoGlobal] ?? g.estadoGlobal}
              </Badge>
            </div>
          ),
        }))}
        selectedIds={guiasSeleccionadas}
        onSelectedIdsChange={setGuiasSeleccionadas}
        options={ACCIONES_GUIA.filter((a) => ACCIONES_POR_BANDEJA[vista].has(a.value))}
        selectedOption={accionSeleccionada}
        onSelectedOptionChange={(value) => {
          setAccionSeleccionada(value);
          // La elegibilidad depende de la acción: una selección previa puede
          // quedar inválida, así que se reinicia.
          setGuiasSeleccionadas([]);
        }}
        optionLabel="Acción"
        optionHelp={accionSeleccionada ? AYUDA_ACCION[accionSeleccionada] : undefined}
        loading={aplicarIsPending}
        onConfirm={handleAplicarAccionGuias}
        onOpenChange={(open) => !open && cerrarAplicarEstado()}
      />

      {motivoBulkOpen && (
        <MotivoBulkDialog
          accion={accionParaMotivo}
          count={guiasSeleccionadas.length}
          loading={aplicarIsPending}
          onClose={() => {
            setMotivoBulkOpen(false);
            setMotivoBulk('');
            setAplicarEstadoOpen(true);
          }}
          onConfirm={async (motivo) => {
            await runBulkAction(accionParaMotivo, guiasSeleccionadas, motivo);
            setMotivoBulkOpen(false);
            setMotivoBulk('');
            cerrarAplicarEstado();
          }}
          motivo={motivoBulk}
          onMotivoChange={setMotivoBulk}
        />
      )}

      {resultadoBulk && (
        <ResultadoBulkDialog
          open
          onOpenChange={(open) => !open && setResultadoBulk(null)}
          accionLabel={resultadoBulk.accionLabel}
          unidadSingular="guía master"
          unidadPlural="guías master"
          procesadas={resultadoBulk.procesadas}
          rechazados={resultadoBulk.rechazados}
        />
      )}

    </div>
  );
}

function ClienteConsignatarioCell({ guia }: { guia: GuiaMaster }) {
  return (
    <div className="min-w-0">
      <ConsignatarioInfo
        nombre={guia.consignatarioNombre}
        telefono={guia.consignatarioTelefono}
        direccion={guia.consignatarioDireccion}
        provincia={guia.consignatarioProvincia}
        canton={guia.consignatarioCanton}
        emptyLabel="Sin asignar"
        emptyItalic
      />
      {guia.clienteUsuarioNombre && (
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={guia.clienteUsuarioNombre}>
          <Building2 className="mr-1 inline h-3 w-3" aria-hidden />
          {guia.clienteUsuarioNombre}
        </p>
      )}
    </div>
  );
}

interface BandejaPendientesProps {
  guias: GuiaMaster[];
  hasUpdate: boolean;
  onAbrir: (id: number) => void;
  onAprobar: (guia: GuiaMaster) => void;
  onEditar: (guia: GuiaMaster) => void;
}

/** Bandeja "Pendientes de aprobación": tarjetas en móvil, tabla en escritorio. */
function BandejaPendientes({ guias, hasUpdate, onAbrir, onAprobar, onEditar }: BandejaPendientesProps) {
  return (
    <>
      <div className="flex flex-col gap-3 md:hidden">
        {guias.map((g) => (
          <PendienteCard
            key={g.id}
            guia={g}
            hasUpdate={hasUpdate}
            onAbrir={() => onAbrir(g.id)}
            onAprobar={() => onAprobar(g)}
            onEditar={() => onEditar(g)}
          />
        ))}
      </div>

      <ListTableShell className="hidden md:block">
        <Table className="min-w-[680px] text-sm [&_td]:py-2.5">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[14rem]">Guía</TableHead>
              <TableHead>Cliente / consignatario</TableHead>
              <TableHead className="min-w-[12rem]">Paquetes</TableHead>
              <TableHead className="hidden lg:table-cell">Registrada</TableHead>
              <TableHead>Validación</TableHead>
              <TableHead className="w-12 text-right" aria-label="Acciones" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {guias.map((g) => {
              const registradas = g.piezasRegistradas ?? 0;
              const inconsistente = registradas > 0;
              return (
                <TableRow
                  key={g.id}
                  className={`cursor-pointer transition-colors ${inconsistente ? 'bg-[color-mix(in_oklab,var(--color-warning)_10%,transparent)] hover:bg-[color-mix(in_oklab,var(--color-warning)_16%,transparent)]' : 'hover:bg-muted/40'}`}
                  onClick={() => onAbrir(g.id)}
                >
                  <TableCell className="max-w-[14rem] align-top">
                    <MonoTrunc value={g.trackingBase} className="font-medium text-foreground" />
                  </TableCell>
                  <TableCell className="max-w-[16rem] align-top">
                    <ClienteConsignatarioCell guia={g} />
                  </TableCell>
                  <TableCell className="align-top">
                    <PiezasProgressCell guia={g} />
                  </TableCell>
                  <TableCell className="hidden align-top text-xs text-muted-foreground lg:table-cell">
                    <FechaCreada createdAt={g.createdAt} />
                  </TableCell>
                  <TableCell className="align-top">
                    {inconsistente ? (
                      <div className="flex flex-col gap-0.5 text-[11px]">
                        <Badge
                          variant="outline"
                          className="w-fit gap-1 border-[var(--color-warning)] text-[var(--color-warning)]"
                        >
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                          Requiere revisión
                        </Badge>
                        <span className="text-muted-foreground">
                          {registradas} paquete{registradas === 1 ? '' : 's'} ya registrado{registradas === 1 ? '' : 's'}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Check className="h-3 w-3 text-[var(--color-success)]" aria-hidden />
                        Lista para aprobar
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right align-top" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {hasUpdate && (
                        <Button size="sm" onClick={() => onAprobar(g)}>
                          <Check className="mr-1.5 h-4 w-4" />
                          Aprobar
                        </Button>
                      )}
                      <RowActionsMenu
                        ariaLabel="Más acciones de la guía pendiente"
                        items={[
                          { label: 'Ver piezas', icon: Eye, onSelect: () => onAbrir(g.id) },
                          { label: 'Editar guía', icon: Pencil, onSelect: () => onEditar(g), hidden: !hasUpdate },
                        ]}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ListTableShell>
    </>
  );
}

interface BandejaRevisionProps {
  guias: GuiaMaster[];
  hasUpdate: boolean;
  onAbrir: (id: number) => void;
  onAprobar: (guia: GuiaMaster) => void;
  onSalirRevision: (guia: GuiaMaster) => void;
}

/** Bandeja "En revisión": tarjetas en móvil, tabla en escritorio. */
function BandejaRevision({ guias, hasUpdate, onAbrir, onAprobar, onSalirRevision }: BandejaRevisionProps) {
  return (
    <>
      <div className="flex flex-col gap-3 md:hidden">
        {guias.map((g) => (
          <RevisionCard
            key={g.id}
            guia={g}
            hasUpdate={hasUpdate}
            onAbrir={() => onAbrir(g.id)}
            onAprobar={() => onAprobar(g)}
            onSalirRevision={() => onSalirRevision(g)}
          />
        ))}
      </div>

      <ListTableShell className="hidden md:block">
        <Table className="min-w-[720px] text-sm [&_td]:py-2.5">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[12rem]">Guía</TableHead>
              <TableHead className="min-w-[14rem]">Motivo</TableHead>
              <TableHead>Cliente / consignatario</TableHead>
              <TableHead>En revisión desde</TableHead>
              <TableHead className="min-w-[10rem]">Paquetes</TableHead>
              <TableHead className="w-12 text-right" aria-label="Acciones" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {guias.map((g) => {
              const motivo = parsearMotivoRevision(g.revisionMotivo);
              return (
                <TableRow
                  key={g.id}
                  className="cursor-pointer transition-colors hover:bg-muted/40"
                  onClick={() => onAbrir(g.id)}
                >
                  <TableCell className="max-w-[12rem] align-top">
                    <MonoTrunc value={g.trackingBase} className="font-medium text-foreground" />
                  </TableCell>
                  <TableCell className="max-w-[18rem] align-top">
                    <span className="line-clamp-2 break-words text-xs text-foreground" title={motivo.label}>
                      {motivo.label || 'Sin motivo registrado'}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[16rem] align-top">
                    <ClienteConsignatarioCell guia={g} />
                  </TableCell>
                  <TableCell className="align-top text-xs text-muted-foreground">
                    <span title={g.revisionEn ?? undefined}>{antiguedad(g.revisionEn)}</span>
                    {g.revisionPorUsuarioNombre && (
                      <p className="text-[11px] opacity-80">por {g.revisionPorUsuarioNombre}</p>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <PiezasProgressCell guia={g} />
                  </TableCell>
                  <TableCell className="text-right align-top" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label="Revisar" title="Revisar" onClick={() => onAbrir(g.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <RowActionsMenu
                        ariaLabel="Más acciones de la guía en revisión"
                        items={[
                          { label: 'Aprobar', icon: Check, onSelect: () => onAprobar(g), hidden: !hasUpdate },
                          { label: 'Salir de revisión', icon: EyeOff, onSelect: () => onSalirRevision(g), hidden: !hasUpdate },
                        ]}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ListTableShell>
    </>
  );
}

function PersonaCell({
  nombre,
  icon,
  emptyLabel = '—',
  emptyItalic = false,
}: {
  nombre?: string | null;
  icon?: React.ReactNode;
  emptyLabel?: string;
  emptyItalic?: boolean;
}) {
  if (!nombre) {
    return (
      <span className={`text-xs text-muted-foreground ${emptyItalic ? 'italic' : ''}`}>
        {emptyLabel}
      </span>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-sm">
      {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      <span className="truncate" title={nombre}>
        {nombre}
      </span>
    </div>
  );
}

function PiezasProgressCell({ guia: g }: { guia: GuiaMaster }) {
  return (
    <PiezasProgress
      total={g.totalPiezasEsperadas}
      registradas={g.piezasRegistradas ?? 0}
      recibidas={g.piezasRecibidas ?? 0}
      despachadas={g.piezasDespachadas ?? 0}
      size="sm"
    />
  );
}

function FechaCreada({ createdAt }: { createdAt?: string }) {
  if (!createdAt) return <>—</>;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return <>—</>;
  const absolute = date.toLocaleString();
  const short = date.toLocaleDateString();
  const rel = relativeTime(date);
  return (
    <div className="flex flex-col leading-tight" title={absolute}>
      <span>{short}</span>
      {rel && <span className="text-[11px] opacity-70">{rel}</span>}
    </div>
  );
}

function relativeTime(date: Date): string | null {
  const diffMs = date.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  if (abs < 60) return rtf.format(diffSec, 'second');
  const min = Math.round(diffSec / 60);
  if (Math.abs(min) < 60) return rtf.format(min, 'minute');
  const hr = Math.round(min / 60);
  if (Math.abs(hr) < 24) return rtf.format(hr, 'hour');
  const day = Math.round(hr / 24);
  if (Math.abs(day) < 30) return rtf.format(day, 'day');
  const month = Math.round(day / 30);
  if (Math.abs(month) < 12) return rtf.format(month, 'month');
  const year = Math.round(month / 12);
  return rtf.format(year, 'year');
}

type GuiaMasterFormDialogProps =
  | { mode: 'create'; onClose: () => void; guia?: never }
  | { mode: 'edit'; guia: GuiaMaster; onClose: () => void };

function GuiaMasterFormDialog(props: GuiaMasterFormDialogProps) {
  const { mode, onClose } = props;
  const isEdit = mode === 'edit';
  const editing = isEdit ? props.guia : null;

  const [trackingBase, setTrackingBase] = useState(editing?.trackingBase ?? '');
  const [consignatarioId, setConsignatarioId] = useState<number | undefined>(
    editing?.consignatarioId ?? undefined
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const crear = useCrearGuiaMaster();
  const actualizar = useActualizarGuiaMaster();
  const saving = isEdit ? actualizar.isPending : crear.isPending;
  const { data: consignatarios = [], isLoading: loadingConsignatarios } =
    useConsignatariosOperario();

  function handleConsignatarioChange(value: string | number | undefined) {
    const id = typeof value === 'string' ? Number(value) : value;
    setConsignatarioId(id);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.consignatarioId;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (isEdit && editing) {
      const tb = trackingBase.trim();
      const tbParsed = trackingBaseSchema.safeParse(tb);
      if (!tbParsed.success) {
        errs.trackingBase = tbParsed.error.issues[0]?.message ?? 'Número de guía inválido';
      }
      const consignatarioParsed = guiaMasterCreateSchema
        .pick({ consignatarioId: true })
        .safeParse({ consignatarioId });
      if (!consignatarioParsed.success) {
        errs.consignatarioId =
          consignatarioParsed.error.issues[0]?.message ?? 'Selecciona un consignatario';
      }
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        notify.error('Revisa los datos de la guía', Object.values(errs)[0]);
        return;
      }
      setFieldErrors({});
    } else {
      const baseParsed = guiaMasterCreateSchema.safeParse({
        trackingBase: trackingBase.trim(),
        consignatarioId,
      });
      if (!baseParsed.success) {
        for (const issue of baseParsed.error.issues) {
          const key = String(issue.path[0] ?? '_form');
          if (!errs[key]) errs[key] = issue.message;
        }
      }
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        notify.error('Revisa los datos de la guía', Object.values(errs)[0]);
        return;
      }
      setFieldErrors({});
    }

    try {
      if (isEdit && editing) {
        const tb = trackingBase.trim();
        const body = {
          trackingBase: tb,
          consignatarioId: consignatarioId!,
        };
        await actualizar.mutateAsync({ id: editing.id, body });
        notify.success('Guía master actualizada', `${tb} · Cambios guardados.`);
      } else {
        await crear.mutateAsync({
          trackingBase: trackingBase.trim(),
          consignatarioId: consignatarioId!,
        });
        notify.success('Guía master registrada', `${trackingBase.trim()} · Lista para recibir piezas.`);
      }
      onClose();
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      const titulo = isEdit ? 'No se pudo actualizar la guía master' : 'No se pudo registrar la guía master';
      notify.error(titulo, res?.data?.message ?? (res?.status === 409 ? 'Ya existe otra guía con ese número.' : undefined));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar guía' : 'Registrar guía'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="trackingBase" className="mb-1 block">
              Número de guía *
            </Label>
            <Input
              id="trackingBase"
              value={trackingBase}
              onChange={(e) => {
                setTrackingBase(e.target.value);
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.trackingBase;
                  return next;
                });
              }}
              placeholder="Ej: 1Z52159R0379385035"
              autoFocus
              className={isEdit ? 'font-mono' : undefined}
              aria-invalid={!!fieldErrors.trackingBase}
            />
            {fieldErrors.trackingBase && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.trackingBase}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {isEdit
                ? 'Si lo cambias, se actualizarán los números de las piezas asociadas.'
                : 'El número que aparece en la guía del courier (UPS, FedEx, etc.).'}
            </p>
          </div>

          <div>
            <Label
              htmlFor="guia-consignatario"
              className="mb-1 flex items-center gap-1 text-xs"
            >
              <UserRound className="h-3.5 w-3.5" />
              Consignatario *
            </Label>
            <SearchableCombobox<Consignatario>
              id="guia-consignatario"
              value={consignatarioId}
              onChange={handleConsignatarioChange}
              options={consignatarios}
              getKey={(d) => d.id}
              getLabel={(d) => d.nombre}
              getSearchText={(d) =>
                [
                  d.nombre,
                  d.codigo ?? '',
                  d.canton ?? '',
                  d.provincia ?? '',
                  d.telefono ?? '',
                  d.clienteUsuarioNombre ?? '',
                ].join(' ')
              }
              placeholder={
                loadingConsignatarios
                  ? 'Cargando consignatarios...'
                  : 'Selecciona un consignatario'
              }
              searchPlaceholder="Buscar por nombre, código, cantón..."
              emptyMessage="Sin consignatarios"
              disabled={loadingConsignatarios || consignatarios.length === 0}
              clearable={false}
              renderOption={(d) => (
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{d.nombre}</span>
                    {d.codigo && (
                      <span className="text-xs text-muted-foreground">· {d.codigo}</span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[d.canton, d.provincia].filter(Boolean).join(', ') ||
                      d.clienteUsuarioNombre ||
                      ''}
                  </div>
                </div>
              )}
              renderSelected={(d) => (
                <span className="flex items-center gap-2">
                  <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{d.nombre}</span>
                  {d.codigo && (
                    <span className="text-xs text-muted-foreground">· {d.codigo}</span>
                  )}
                </span>
              )}
            />
            {!loadingConsignatarios && consignatarios.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Aún no hay consignatarios registrados. Crea uno desde "Consignatarios".
              </p>
            )}
            {fieldErrors.consignatarioId && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.consignatarioId}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? 'Guardando...'
                : isEdit
                  ? 'Guardar cambios'
                  : 'Registrar guía'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CancelarGuiaDialogProps {
  guia: GuiaMaster;
  onClose: () => void;
}

function CancelarGuiaDialog({ guia, onClose }: CancelarGuiaDialogProps) {
  const [motivo, setMotivo] = useState('');
  const [motivoError, setMotivoError] = useState<string | undefined>();
  const cancelar = useCancelarGuiaMaster();

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    const parsed = guiaCancelarSchema.safeParse({ motivo });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Debes indicar un motivo';
      setMotivoError(msg);
      notify.warning(msg);
      return;
    }
    setMotivoError(undefined);
    try {
      await cancelar.mutateAsync({ id: guia.id, body: { motivo: parsed.data.motivo } });
      notify.success('Guía master cancelada', `${guia.trackingBase} · Quedó en estado terminal; puedes reabrirla si fue un error.`);
      onClose();
    } catch (err: unknown) {
      notify.error('No se pudo cancelar la guía master', getApiErrorMessage(err) ?? guia.trackingBase);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !cancelar.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar guía master</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Anula la guía "{guia.trackingBase}" antes de despachar piezas. Solo aplica si aún no se ha despachado ninguna pieza. Quedará registrada en el historial.
          </p>
        </DialogHeader>
        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <Label htmlFor="motivo-cancelar" className="mb-1 block">
              Motivo (obligatorio)
            </Label>
            <Textarea
              id="motivo-cancelar"
              rows={3}
              maxLength={MAX_MOTIVO}
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                setMotivoError(undefined);
              }}
              placeholder="Ej: cliente solicitó anulación / error de registro"
              aria-invalid={!!motivoError}
            />
            {motivoError && <p className="mt-1 text-xs text-destructive">{motivoError}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={cancelar.isPending}
            >
              Volver
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={cancelar.isPending}
            >
              {cancelar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {cancelar.isPending ? 'Cancelando...' : 'Cancelar guía'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
