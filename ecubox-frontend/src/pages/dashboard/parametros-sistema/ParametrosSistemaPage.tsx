import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bold,
  Boxes,
  Calculator,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleDashed,
  Code2,
  DollarSign,
  Eye,
  EyeOff,
  Hash,
  Hourglass,
  Info,
  Italic,
  Layers,
  Link2,
  Share2,
  ListOrdered,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  PencilLine,
  PlugZap,
  Plus,
  Power,
  PowerOff,
  Quote,
  RotateCcw,
  Save,
  Search,
  Settings,
  Sparkles,
  Strikethrough,
  Trash2,
  Truck,
  Type,
  Variable,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LabeledField as FormField } from '@/components/LabeledField';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormSkeleton } from '@/components/skeletons/FormSkeleton';
import { ListItemsSkeleton } from '@/components/skeletons/ListItemsSkeleton';
import { SurfaceCardSkeleton } from '@/components/skeletons/SurfaceCardSkeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { KpiCard } from '@/components/KpiCard';
import { EmptyState } from '@/components/EmptyState';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import {
  useMensajeAgenciaEeuu,
  useUpdateMensajeAgenciaEeuu,
} from '@/hooks/useMensajeAgenciaEeuu';
import {
  useMensajeWhatsAppDespacho,
  useUpdateMensajeWhatsAppDespacho,
} from '@/hooks/useMensajeWhatsAppDespacho';
import {
  useEstadosRastreo,
  useEstadosRastreoActivos,
  useEstadosRastreoPorPunto,
  useUpdateEstadosRastreoPorPunto,
  useCreateEstadoRastreo,
  useUpdateEstadoRastreoEntity,
  useDesactivarEstadoRastreo,
  useDeleteEstadoRastreo,
  useReorderTrackingEstadosRastreo,
} from '@/hooks/useEstadosRastreo';
import {
  VARIABLES_DESPACHO,
  VARIABLES_DESPACHO_GROUPS,
  formatVariable,
  plantillaToPreviewText,
  type VariableDespachoKey,
} from './VARIABLES_DESPACHO';
import { parseWhatsAppPreviewToReact } from './whatsappFormatPreview';
import { TarifaCalculadoraForm } from '@/pages/dashboard/tarifa-calculadora/TarifaCalculadoraForm';
import { TarifaDistribucionForm } from '@/pages/dashboard/parametros-sistema/TarifaDistribucionForm';
import { CanalesComunicacionPanel } from '@/pages/dashboard/parametros-sistema/CanalesComunicacionPanel';
import { TemaTemporadaPanel } from '@/pages/dashboard/parametros-sistema/TemaTemporadaPanel';
import {
  GUIA_MASTER_ESTADO_LABELS,
  GUIA_MASTER_ESTADO_ORDEN,
} from '@/pages/dashboard/guias-master/_estado';
import {
  useCanalesComunicacion,
  useUpdateCanalesComunicacion,
} from '@/hooks/useCanalesComunicacion';
import {
  canalesToComparable,
  emptyCanalesComunicacion,
  normalizeCanalesFromApi,
} from '@/types/canales-comunicacion';
import { canalesComunicacionSchema } from '@/lib/schemas/canales-comunicacion';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { estadoRastreoFormSchema, mensajePlantillaSchema } from '@/lib/schemas/maestros';
import type {
  EstadoRastreo,
  EstadoRastreoRequest,
  EstadosRastreoPorPunto,
} from '@/types/estado-rastreo';
import type { EstadoGuiaMaster } from '@/types/guia-master';
import type { EstadoEnvioConsolidadoOperativo } from '@/types/envio-consolidado';

// ============================================================================
// Tipos y constantes
// ============================================================================

type OpcionActiva =
  | 'mensaje-whatsapp-despacho'
  | 'mensaje-agencia-eeuu'
  | 'canales-comunicacion'
  | 'tema-temporada'
  | 'tarifa-calculadora'
  | 'tarifa-distribucion'
  | 'estados-rastreo'
  | 'estados-rastreo-por-punto';

type PendingParametrosNav = OpcionActiva | 'menu';

interface TabMeta {
  key: OpcionActiva;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  visible: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

const VARIABLE_KEYS = new Set<string>(VARIABLES_DESPACHO.map((v) => v.key));

function extractVariablesFromTemplate(template: string): {
  used: string[];
  unknown: string[];
} {
  const matches = template.match(/\{\{\s*[\w.-]+\s*\}\}/g) ?? [];
  const usedSet = new Set<string>();
  const unknownSet = new Set<string>();
  for (const m of matches) {
    const key = m.replace(/[{}\s]/g, '');
    if (VARIABLE_KEYS.has(key)) {
      usedSet.add(key);
    } else {
      unknownSet.add(key);
    }
  }
  return { used: Array.from(usedSet), unknown: Array.from(unknownSet) };
}

function buildEffectiveTrackingOrder(
  baseOrderIds: number[],
  estadoPorId: Map<number, EstadoRastreo>,
  alternoAfterById: Record<number, number>,
  alternosSorted: EstadoRastreo[],
): EstadoRastreo[] {
  const alternosTrasBase = new Map<number, EstadoRastreo[]>();
  for (const baseId of baseOrderIds) {
    alternosTrasBase.set(baseId, []);
  }
  for (const alt of alternosSorted) {
    const after = alternoAfterById[alt.id];
    if (after != null) {
      alternosTrasBase.get(after)?.push(alt);
    }
  }
  const result: EstadoRastreo[] = [];
  for (const baseId of baseOrderIds) {
    const base = estadoPorId.get(baseId);
    if (base) result.push(base);
    result.push(...(alternosTrasBase.get(baseId) ?? []));
  }
  return result;
}

function wrapSelection(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  setter: (next: string) => void,
  prefix: string,
  suffix: string = prefix,
  placeholder: string = 'texto',
) {
  const ta = ref.current;
  if (!ta) {
    setter(value + prefix + placeholder + suffix);
    return;
  }
  const start = ta.selectionStart ?? value.length;
  const end = ta.selectionEnd ?? value.length;
  const selected = value.slice(start, end);
  const insertion = selected.length > 0 ? selected : placeholder;
  const next = value.slice(0, start) + prefix + insertion + suffix + value.slice(end);
  setter(next);
  requestAnimationFrame(() => {
    ta.focus();
    const cursorStart = start + prefix.length;
    const cursorEnd = cursorStart + insertion.length;
    ta.setSelectionRange(cursorStart, cursorEnd);
  });
}

function insertAtCursor(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  setter: (next: string) => void,
  text: string,
) {
  const ta = ref.current;
  if (!ta) {
    setter(value + text);
    return;
  }
  const hasFocus = document.activeElement === ta;
  const start = hasFocus ? (ta.selectionStart ?? value.length) : value.length;
  const end = hasFocus ? (ta.selectionEnd ?? value.length) : value.length;
  const next = value.slice(0, start) + text + value.slice(end);
  setter(next);
  requestAnimationFrame(() => {
    ta.focus();
    const newPos = start + text.length;
    ta.setSelectionRange(newPos, newPos);
  });
}

// ============================================================================
// Página principal
// ============================================================================

export function ParametrosSistemaPage() {
  const { hasPermission } = useAuthStore();

  const canSeeWhatsapp = hasPermission('MENSAJE_WHATSAPP_DESPACHO_READ');
  const canWriteWhatsapp = hasPermission('MENSAJE_WHATSAPP_DESPACHO_WRITE');
  const canSeeAgencia = hasPermission('MENSAJE_AGENCIA_EEUU_READ');
  const canWriteAgencia = hasPermission('MENSAJE_AGENCIA_EEUU_WRITE');
  const canSeeCanales = hasPermission('CANALES_COMUNICACION_READ');
  const canWriteCanales = hasPermission('CANALES_COMUNICACION_WRITE');
  const canSeeTarifaCalculadora = hasPermission('TARIFA_CALCULADORA_READ');
  const canSeeTarifaDistribucion = hasPermission('CONFIG_TARIFA_DISTRIBUCION_READ');
  const canSeeEstadosRastreo = hasPermission('ESTADOS_RASTREO_READ');
  const canSeeTemaTemporada = hasPermission('TEMA_TEMPORADA_READ');

  const tabs: TabMeta[] = useMemo(
    () => [
      {
        key: 'mensaje-whatsapp-despacho',
        label: 'Mensaje WhatsApp despacho',
        shortLabel: 'WhatsApp',
        description: 'Plantilla del mensaje que se envía al cliente al despachar.',
        icon: MessageCircle,
        visible: canSeeWhatsapp,
      },
      {
        key: 'mensaje-agencia-eeuu',
        label: 'Casillero',
        shortLabel: 'Casillero',
        description: 'Dirección, horarios e instrucciones que ven los clientes.',
        icon: MapPin,
        visible: canSeeAgencia,
      },
      {
        key: 'canales-comunicacion',
        label: 'Redes y contacto',
        shortLabel: 'Contacto',
        description: 'Correo, teléfono y redes sociales visibles en el sitio público.',
        icon: Share2,
        visible: canSeeCanales,
      },
      {
        key: 'tema-temporada',
        label: 'Tema de temporada',
        shortLabel: 'Temporada',
        description: 'Tematiza el sitio público según días festivos (Día de la Madre, Navidad…).',
        icon: Sparkles,
        visible: canSeeTemaTemporada,
      },
      {
        key: 'tarifa-calculadora',
        label: 'Tarifa de calculadora',
        shortLabel: 'Tarifa',
        description: 'Tarifa por libra usada en la calculadora pública.',
        icon: Calculator,
        visible: canSeeTarifaCalculadora,
      },
      {
        key: 'tarifa-distribucion',
        label: 'Tarifa de distribución',
        shortLabel: 'Distribución',
        description: 'Tarifa por defecto del courier de entrega usada en la liquidación.',
        icon: Truck,
        visible: canSeeTarifaDistribucion,
      },
      {
        key: 'estados-rastreo',
        label: 'Estados de rastreo',
        shortLabel: 'Estados',
        description: 'Catálogo de estados, flujo y orden público del tracking.',
        icon: ListOrdered,
        visible: canSeeEstadosRastreo,
      },
      {
        key: 'estados-rastreo-por-punto',
        label: 'Estados por punto del flujo',
        shortLabel: 'Por punto',
        description: 'Asignación de estados a acciones operativas del flujo.',
        icon: PlugZap,
        visible: canSeeEstadosRastreo,
      },
    ],
    [
      canSeeAgencia,
      canSeeCanales,
      canSeeEstadosRastreo,
      canSeeTarifaCalculadora,
      canSeeTarifaDistribucion,
      canSeeTemaTemporada,
      canSeeWhatsapp,
    ],
  );

  const visibleTabs = useMemo(() => tabs.filter((t) => t.visible), [tabs]);

  const [opcionActiva, setOpcionActiva] = useState<OpcionActiva>(
    visibleTabs[0]?.key ?? 'mensaje-whatsapp-despacho',
  );

  useEffect(() => {
    if (!visibleTabs.some((t) => t.key === opcionActiva) && visibleTabs[0]) {
      setOpcionActiva(visibleTabs[0].key);
    }
  }, [visibleTabs, opcionActiva]);

  // Estado lifted para los editores con dirty state
  const { data: dataWhats, isLoading: loadingWhats, error: errorWhats } =
    useMensajeWhatsAppDespacho({ enabled: canSeeWhatsapp });
  const updateWhatsMutation = useUpdateMensajeWhatsAppDespacho();
  const [plantillaLocal, setPlantillaLocal] = useState('');
  useEffect(() => {
    if (dataWhats != null) setPlantillaLocal(dataWhats.plantilla ?? '');
  }, [dataWhats]);

  const { data: dataAgencia, isLoading: loadingAgencia, error: errorAgencia } =
    useMensajeAgenciaEeuu({ enabled: canSeeAgencia });
  const updateAgenciaMutation = useUpdateMensajeAgenciaEeuu();
  const [mensajeAgenciaLocal, setMensajeAgenciaLocal] = useState('');
  useEffect(() => {
    if (dataAgencia != null) setMensajeAgenciaLocal(dataAgencia.mensaje ?? '');
  }, [dataAgencia]);

  const plantillaOriginal = dataWhats?.plantilla ?? '';
  const mensajeAgenciaOriginal = dataAgencia?.mensaje ?? '';
  const whatsappDirty = plantillaLocal !== plantillaOriginal;
  const agenciaDirty = mensajeAgenciaLocal !== mensajeAgenciaOriginal;

  const { data: dataCanales, isLoading: loadingCanales, error: errorCanales } =
    useCanalesComunicacion({ enabled: canSeeCanales });
  const updateCanalesMutation = useUpdateCanalesComunicacion();
  const [canalesLocal, setCanalesLocal] = useState(emptyCanalesComunicacion);
  useEffect(() => {
    if (dataCanales != null) setCanalesLocal(normalizeCanalesFromApi(dataCanales));
  }, [dataCanales]);

  const canalesOriginal = useMemo(
    () => (dataCanales != null ? normalizeCanalesFromApi(dataCanales) : emptyCanalesComunicacion()),
    [dataCanales],
  );
  const canalesDirty = canalesToComparable(canalesLocal) !== canalesToComparable(canalesOriginal);

  const isCurrentDirty =
    (opcionActiva === 'mensaje-whatsapp-despacho' && whatsappDirty) ||
    (opcionActiva === 'mensaje-agencia-eeuu' && agenciaDirty) ||
    (opcionActiva === 'canales-comunicacion' && canalesDirty);

  const [opcionPendiente, setOpcionPendiente] = useState<PendingParametrosNav | null>(null);
  const [confirmarSalida, setConfirmarSalida] = useState(false);

  const handleGuardarWhatsapp = async () => {
    const parsed = mensajePlantillaSchema.safeParse(plantillaLocal);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Plantilla no válida');
      throw new Error('validation');
    }
    try {
      await updateWhatsMutation.mutateAsync({ plantilla: parsed.data });
      toast.success('Mensaje de despacho guardado');
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'Error al guardar el mensaje');
      throw err;
    }
  };

  const handleGuardarCanales = async () => {
    const parsed = canalesComunicacionSchema.safeParse(canalesLocal);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const path = first?.path?.join('.') ?? '';
      toast.error(path ? `${path}: ${first?.message}` : (first?.message ?? 'Datos no válidos'));
      throw new Error('validation');
    }
    try {
      await updateCanalesMutation.mutateAsync(parsed.data);
      toast.success('Canales de comunicación guardados');
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'Error al guardar');
      throw err;
    }
  };

  const handleGuardarAgencia = async () => {
    const parsed = mensajePlantillaSchema.safeParse(mensajeAgenciaLocal);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Mensaje no válido');
      throw new Error('validation');
    }
    try {
      await updateAgenciaMutation.mutateAsync({ mensaje: parsed.data });
      toast.success('Mensaje del casillero guardado');
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'Error al guardar el mensaje');
      throw err;
    }
  };

  function trySwitchTab(next: OpcionActiva) {
    if (next === opcionActiva) return;
    if (isCurrentDirty) {
      setOpcionPendiente(next);
      setConfirmarSalida(true);
      return;
    }
    setOpcionActiva(next);
  }

  const tabActivaMeta = visibleTabs.find((t) => t.key === opcionActiva);
  const dirtyByKey: Record<OpcionActiva, boolean> = {
    'mensaje-whatsapp-despacho': whatsappDirty,
    'mensaje-agencia-eeuu': agenciaDirty,
    'canales-comunicacion': canalesDirty,
    'tema-temporada': false,
    'tarifa-calculadora': false,
    'tarifa-distribucion': false,
    'estados-rastreo': false,
    'estados-rastreo-por-punto': false,
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Parámetros del sistema"
        description="Configura mensajes automáticos, tarifas públicas y estados de rastreo. Los cambios aplican a todo el sistema."
        icon={<Settings className="h-5 w-5" strokeWidth={1.75} />}
      />

      {/* Tabs móviles (segmented horizontal scroll) */}
      <div className="lg:hidden">
        <div className="flex gap-1.5 overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-1.5">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.key === opcionActiva;
            const dirty = dirtyByKey[tab.key];
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => trySwitchTab(tab.key)}
                className={cn(
                  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors',
                  active
                    ? 'bg-[var(--color-muted)] text-[var(--color-foreground)]'
                    : 'text-muted-foreground hover:bg-[var(--color-muted)]/40 hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.shortLabel}
                {dirty && (
                  <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-warning)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Sidebar tabs (desktop) */}
        <aside className="hidden lg:block">
          <nav className="sticky top-4 space-y-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-2">
            <p className="px-2 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Módulos
            </p>
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const active = tab.key === opcionActiva;
              const dirty = dirtyByKey[tab.key];
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => trySwitchTab(tab.key)}
                  className={cn(
                    'group flex w-full items-start gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-left transition-colors',
                    active
                      ? 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5'
                      : 'hover:bg-[var(--color-muted)]/40',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
                      active
                        ? 'bg-[var(--color-muted)] text-[var(--color-primary)]'
                        : 'bg-[var(--color-muted)]/40 text-muted-foreground group-hover:bg-[var(--color-muted)] group-hover:text-foreground',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={cn(
                          'truncate text-sm font-medium',
                          active ? 'text-foreground' : 'text-foreground/90',
                        )}
                      >
                        {tab.shortLabel}
                      </p>
                      {dirty && (
                        <span
                          title="Hay cambios sin guardar"
                          className="inline-flex h-4 items-center gap-0.5 rounded border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-1 text-[9px] font-medium text-[var(--color-warning)]"
                        >
                          <Circle className="h-2 w-2 fill-[var(--color-warning)] text-[var(--color-warning)]" />
                          Pend.
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                      {tab.description}
                    </p>
                  </div>
                  <ChevronRight
                    className={cn(
                      'mt-1 h-3.5 w-3.5 shrink-0 transition-transform',
                      active
                        ? 'translate-x-0.5 text-[var(--color-primary)]'
                        : 'text-muted-foreground/50 group-hover:translate-x-0.5',
                    )}
                  />
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Contenido del módulo */}
        <main className="min-w-0 space-y-4">
          {tabActivaMeta && (
            <PanelHeader
              icon={<tabActivaMeta.icon className="h-5 w-5" />}
              title={tabActivaMeta.label}
              description={tabActivaMeta.description}
              status={
                opcionActiva === 'mensaje-whatsapp-despacho'
                  ? whatsappDirty
                    ? 'pending'
                    : 'saved'
                  : opcionActiva === 'mensaje-agencia-eeuu'
                    ? agenciaDirty
                      ? 'pending'
                      : 'saved'
                    : opcionActiva === 'canales-comunicacion'
                      ? canalesDirty
                        ? 'pending'
                        : 'saved'
                      : null
              }
              saving={
                opcionActiva === 'mensaje-whatsapp-despacho'
                  ? updateWhatsMutation.isPending
                  : opcionActiva === 'mensaje-agencia-eeuu'
                    ? updateAgenciaMutation.isPending
                    : opcionActiva === 'canales-comunicacion'
                      ? updateCanalesMutation.isPending
                      : false
              }
            />
          )}

          {opcionActiva === 'mensaje-whatsapp-despacho' && (
            <WhatsAppDespachoPanel
              loading={loadingWhats}
              error={errorWhats}
              plantillaLocal={plantillaLocal}
              setPlantillaLocal={setPlantillaLocal}
              plantillaOriginal={plantillaOriginal}
              dirty={whatsappDirty}
              saving={updateWhatsMutation.isPending}
              canWrite={canWriteWhatsapp}
              onSave={handleGuardarWhatsapp}
            />
          )}

          {opcionActiva === 'mensaje-agencia-eeuu' && (
            <AgenciaEeuuPanel
              loading={loadingAgencia}
              error={errorAgencia}
              mensajeLocal={mensajeAgenciaLocal}
              setMensajeLocal={setMensajeAgenciaLocal}
              mensajeOriginal={mensajeAgenciaOriginal}
              dirty={agenciaDirty}
              saving={updateAgenciaMutation.isPending}
              canWrite={canWriteAgencia}
              onSave={handleGuardarAgencia}
            />
          )}

          {opcionActiva === 'canales-comunicacion' && (
            <CanalesComunicacionPanel
              loading={loadingCanales}
              error={errorCanales}
              canalesLocal={canalesLocal}
              setCanalesLocal={setCanalesLocal}
              dirty={canalesDirty}
              saving={updateCanalesMutation.isPending}
              canWrite={canWriteCanales}
              onSave={handleGuardarCanales}
            />
          )}

          {opcionActiva === 'tema-temporada' && <TemaTemporadaPanel />}

          {opcionActiva === 'tarifa-calculadora' && <TarifaCalculadoraPanel />}

          {opcionActiva === 'tarifa-distribucion' && <TarifaDistribucionPanel />}

          {opcionActiva === 'estados-rastreo' && <EstadosRastreoView />}

          {opcionActiva === 'estados-rastreo-por-punto' && <EstadosRastreoPorPuntoView />}
        </main>
      </div>

      <ConfirmDialog
        open={confirmarSalida}
        onOpenChange={(open) => !open && setConfirmarSalida(false)}
        title="Cambios sin guardar"
        description="Tienes cambios sin guardar en este módulo. ¿Deseas guardar antes de cambiar?"
        confirmLabel="Guardar y continuar"
        cancelLabel="Descartar y continuar"
        onConfirm={async () => {
          try {
            if (opcionActiva === 'mensaje-whatsapp-despacho' && whatsappDirty) {
              await handleGuardarWhatsapp();
            }
            if (opcionActiva === 'mensaje-agencia-eeuu' && agenciaDirty) {
              await handleGuardarAgencia();
            }
            if (opcionActiva === 'canales-comunicacion' && canalesDirty) {
              await handleGuardarCanales();
            }
            if (opcionPendiente && opcionPendiente !== 'menu') {
              setOpcionActiva(opcionPendiente);
            }
            setOpcionPendiente(null);
            setConfirmarSalida(false);
          } catch {
            // mantenemos el modal abierto si falla guardar
          }
        }}
        loading={
          updateWhatsMutation.isPending ||
          updateAgenciaMutation.isPending ||
          updateCanalesMutation.isPending
        }
      />
    </div>
  );
}

// ============================================================================
// PanelHeader
// ============================================================================

interface PanelHeaderProps {
  icon: ReactNode;
  title: string;
  description: string;
  status?: 'saved' | 'pending' | null;
  saving?: boolean;
}

function PanelHeader({ icon, title, description, status, saving }: PanelHeaderProps) {
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {status && (
        <span
          className={cn(
            'inline-flex items-center gap-1 self-center rounded-md border px-2 py-1 text-[11px] font-medium',
            saving
              ? 'border-[var(--color-primary)]/30 bg-[var(--color-muted)] text-[var(--color-primary)]'
              : status === 'pending'
                ? 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                : 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]',
          )}
        >
          {saving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Guardando…
            </>
          ) : status === 'pending' ? (
            <>
              <CircleDashed className="h-3 w-3" />
              Cambios pendientes
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3" />
              Sin cambios
            </>
          )}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Panel WhatsApp Despacho
// ============================================================================

interface WhatsAppDespachoPanelProps {
  loading: boolean;
  error: Error | null;
  plantillaLocal: string;
  setPlantillaLocal: (next: string) => void;
  plantillaOriginal: string;
  dirty: boolean;
  saving: boolean;
  canWrite: boolean;
  onSave: () => Promise<void>;
}

function WhatsAppDespachoPanel({
  loading,
  error,
  plantillaLocal,
  setPlantillaLocal,
  plantillaOriginal,
  dirty,
  saving,
  canWrite,
  onSave,
}: WhatsAppDespachoPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [searchVar, setSearchVar] = useState('');

  if (loading) {
    return (
      <div aria-busy="true" aria-live="polite" className="space-y-4">
        <SurfaceCardSkeleton bodyLines={2} />
        <FormSkeleton fields={3} withTextarea withFooter />
        <span className="sr-only">Cargando configuración de WhatsApp...</span>
      </div>
    );
  }
  if (error)
    return (
      <div className="ui-alert ui-alert-error">
        Error al cargar la configuración de WhatsApp.
      </div>
    );

  const stats = {
    chars: plantillaLocal.length,
    lines: plantillaLocal ? plantillaLocal.split('\n').length : 0,
    words: plantillaLocal ? plantillaLocal.trim().split(/\s+/).filter(Boolean).length : 0,
  };
  const { used, unknown } = extractVariablesFromTemplate(plantillaLocal);

  const filteredGroups = VARIABLES_DESPACHO_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => {
      if (!searchVar.trim()) return true;
      const q = searchVar.trim().toLowerCase();
      return it.label.toLowerCase().includes(q) || it.key.toLowerCase().includes(q);
    }),
  })).filter((g) => g.items.length > 0);

  const previewText = plantillaToPreviewText(plantillaLocal);

  return (
    <div className="page-stack">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatPill icon={<Type className="h-3.5 w-3.5" />} label="Caracteres" value={stats.chars} />
        <StatPill
          icon={<Hash className="h-3.5 w-3.5" />}
          label="Líneas"
          value={stats.lines}
        />
        <StatPill
          icon={<Variable className="h-3.5 w-3.5" />}
          label="Variables usadas"
          value={used.length}
          tone="success"
        />
        <StatPill
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="Variables inválidas"
          value={unknown.length}
          tone={unknown.length > 0 ? 'danger' : 'neutral'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Editor */}
        <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="plantilla" className="text-xs font-semibold text-foreground">
              Plantilla del mensaje
            </Label>
            <FormatToolbar
              onAction={(action) => {
                switch (action) {
                  case 'bold':
                    return wrapSelection(textareaRef, plantillaLocal, setPlantillaLocal, '*');
                  case 'italic':
                    return wrapSelection(textareaRef, plantillaLocal, setPlantillaLocal, '_');
                  case 'strike':
                    return wrapSelection(textareaRef, plantillaLocal, setPlantillaLocal, '~');
                  case 'code':
                    return wrapSelection(textareaRef, plantillaLocal, setPlantillaLocal, '`');
                  case 'block':
                    return wrapSelection(
                      textareaRef,
                      plantillaLocal,
                      setPlantillaLocal,
                      '```\n',
                      '\n```',
                      'bloque de código',
                    );
                }
              }}
            />
          </div>

          <Textarea
            ref={textareaRef}
            id="plantilla"
            value={plantillaLocal}
            onChange={(e) => setPlantillaLocal(e.target.value)}
            className="min-h-[220px] font-mono text-sm leading-relaxed"
            rows={9}
            placeholder="Hola {{consignatarioNombre}}, tu envío {{numeroGuia}} ({{fechaDespacho}}) va a {{destinoNombre}}. Sacas: {{cantidadSacas}}, peso {{pesoTotalKg}} kg."
          />

          {unknown.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 px-3 py-2 text-xs text-[var(--color-destructive)]">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {unknown.length === 1
                    ? 'Hay 1 variable que no existe en el catálogo:'
                    : `Hay ${unknown.length} variables que no existen en el catálogo:`}
                </p>
                <p className="mt-0.5 break-all font-mono">
                  {unknown.map((u) => `{{${u}}}`).join(' · ')}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Variable className="h-3.5 w-3.5 text-muted-foreground" />
                Variables disponibles
              </p>
              <div className="relative">
                <Search className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchVar}
                  onChange={(e) => setSearchVar(e.target.value)}
                  placeholder="Buscar..."
                  className="h-7 w-[160px] pl-7 text-xs"
                />
              </div>
            </div>
            <div className="space-y-3 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/15 p-2.5">
              {filteredGroups.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  No hay variables que coincidan con "{searchVar}"
                </p>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.category} className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.category}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {group.items.map(({ key, label }) => {
                        const isUsed = used.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              insertAtCursor(
                                textareaRef,
                                plantillaLocal,
                                setPlantillaLocal,
                                formatVariable(key as VariableDespachoKey),
                              )
                            }
                            title={`Insertar ${formatVariable(key as VariableDespachoKey)}`}
                            className={cn(
                              'inline-flex h-7 items-center gap-1 rounded-full border px-2 text-[11px] font-medium transition-colors',
                              isUsed
                                ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)]/15'
                                : 'border-[var(--color-border)] bg-[var(--color-card)] text-foreground hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-muted)]/40',
                            )}
                          >
                            {isUsed ? (
                              <Check className="h-2.5 w-2.5" />
                            ) : (
                              <Plus className="h-2.5 w-2.5" />
                            )}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <FormatHelp />

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button onClick={onSave} disabled={!canWrite || saving || !dirty}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar cambios
                </>
              )}
            </Button>
            {dirty && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setPlantillaLocal(plantillaOriginal)}
                disabled={saving}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Descartar
              </Button>
            )}
          </div>
        </div>

        {/* Vista previa */}
        <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex items-center justify-between">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
              Vista previa (WhatsApp)
            </p>
            <Badge variant="outline" className="h-5 rounded text-[10px] font-normal">
              Variables sustituidas
            </Badge>
          </div>
          <WhatsAppPreview text={previewText} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Panel Agencia USA
// ============================================================================

interface AgenciaEeuuPanelProps {
  loading: boolean;
  error: Error | null;
  mensajeLocal: string;
  setMensajeLocal: (next: string) => void;
  mensajeOriginal: string;
  dirty: boolean;
  saving: boolean;
  canWrite: boolean;
  onSave: () => Promise<void>;
}

function AgenciaEeuuPanel({
  loading,
  error,
  mensajeLocal,
  setMensajeLocal,
  mensajeOriginal,
  dirty,
  saving,
  canWrite,
  onSave,
}: AgenciaEeuuPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (loading) {
    return (
      <div aria-busy="true" aria-live="polite" className="space-y-4">
        <SurfaceCardSkeleton bodyLines={2} />
        <FormSkeleton fields={2} withTextarea withFooter />
        <span className="sr-only">Cargando mensaje del casillero...</span>
      </div>
    );
  }
  if (error)
    return (
      <div className="ui-alert ui-alert-error">
        Error al cargar el mensaje del casillero.
      </div>
    );

  const stats = {
    chars: mensajeLocal.length,
    lines: mensajeLocal ? mensajeLocal.split('\n').length : 0,
    words: mensajeLocal ? mensajeLocal.trim().split(/\s+/).filter(Boolean).length : 0,
  };

  return (
    <div className="page-stack">
      <div className="grid grid-cols-3 gap-2">
        <StatPill icon={<Type className="h-3.5 w-3.5" />} label="Caracteres" value={stats.chars} />
        <StatPill icon={<Hash className="h-3.5 w-3.5" />} label="Líneas" value={stats.lines} />
        <StatPill
          icon={<Quote className="h-3.5 w-3.5" />}
          label="Palabras"
          value={stats.words}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Editor */}
        <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="mensaje-agencia" className="text-xs font-semibold text-foreground">
              Mensaje
            </Label>
            <FormatToolbar
              onAction={(action) => {
                switch (action) {
                  case 'bold':
                    return wrapSelection(textareaRef, mensajeLocal, setMensajeLocal, '*');
                  case 'italic':
                    return wrapSelection(textareaRef, mensajeLocal, setMensajeLocal, '_');
                  case 'strike':
                    return wrapSelection(textareaRef, mensajeLocal, setMensajeLocal, '~');
                  case 'code':
                    return wrapSelection(textareaRef, mensajeLocal, setMensajeLocal, '`');
                  case 'block':
                    return wrapSelection(
                      textareaRef,
                      mensajeLocal,
                      setMensajeLocal,
                      '```\n',
                      '\n```',
                      'bloque',
                    );
                }
              }}
            />
          </div>

          <Textarea
            ref={textareaRef}
            id="mensaje-agencia"
            value={mensajeLocal}
            onChange={(e) => setMensajeLocal(e.target.value)}
            className="min-h-[260px] font-mono text-sm leading-relaxed"
            rows={12}
            placeholder={'Casillero:\n\nDirección completa…\n\nHorarios e indicaciones…'}
          />

          <FormatHelp />

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button onClick={onSave} disabled={!canWrite || saving || !dirty}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar cambios
                </>
              )}
            </Button>
            {dirty && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setMensajeLocal(mensajeOriginal)}
                disabled={saving}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Descartar
              </Button>
            )}
          </div>
        </div>

        {/* Vista previa: tarjeta del cliente */}
        <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex items-center justify-between">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              Vista previa (cliente)
            </p>
            <Badge variant="outline" className="h-5 rounded text-[10px] font-normal">
              Tal como lo verá
            </Badge>
          </div>
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-4">
            <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
              <header className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-2.5">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-background)] text-[var(--color-muted-foreground)]">
                  <MapPin className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Dirección de envío
                  </p>
                  <p className="text-sm font-semibold text-foreground">Casillero en EE.UU.</p>
                </div>
              </header>
              <div className="px-4 py-3">
                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                  {mensajeLocal.trim()
                    ? parseWhatsAppPreviewToReact(mensajeLocal)
                    : (
                      <span className="italic text-muted-foreground">
                        El texto se mostrará aquí como lo verá el cliente.
                      </span>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Panel Tarifa Calculadora
// ============================================================================

function TarifaCalculadoraPanel() {
  return (
    <div className="page-stack">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-success)]/10 text-[var(--color-success)]">
                <DollarSign className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold text-foreground">Tarifa por libra</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Esta tarifa se usa para mostrar el precio estimado en la calculadora pública del
              sitio.
            </p>
            <TarifaCalculadoraForm />
          </div>
          <aside className="space-y-2 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/15 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              Ejemplos
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Si la tarifa es <span className="font-mono text-foreground">$2.50</span>:
            </p>
            <ul className="space-y-1 text-[11px] text-foreground">
              <li className="flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1">
                <span className="text-muted-foreground">5 lbs</span>
                <span className="font-mono font-semibold">$12.50</span>
              </li>
              <li className="flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1">
                <span className="text-muted-foreground">10 lbs</span>
                <span className="font-mono font-semibold">$25.00</span>
              </li>
              <li className="flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1">
                <span className="text-muted-foreground">25 lbs</span>
                <span className="font-mono font-semibold">$62.50</span>
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Panel Tarifa de distribución
// ============================================================================

function TarifaDistribucionPanel() {
  return (
    <div className="page-stack">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Truck className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold text-foreground">
                Tarifa por defecto del courier de entrega
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Estos valores se precargan automáticamente al agregar líneas de distribución en la
              liquidación de un envío consolidado. El operario puede ajustarlos por línea y, al
              guardar, los nuevos valores reemplazan estos parámetros para próximos cálculos.
            </p>
            <TarifaDistribucionForm />
          </div>
          <aside className="space-y-2 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/15 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              Cómo se calcula
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Si <span className="font-mono text-foreground">kg incluidos = 2</span>,{' '}
              <span className="font-mono text-foreground">precio fijo = $2.75</span> y{' '}
              <span className="font-mono text-foreground">kg adicional = $0.50</span>:
            </p>
            <ul className="space-y-1 text-[11px] text-foreground">
              <li className="flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1">
                <span className="text-muted-foreground">1.5 kg</span>
                <span className="font-mono font-semibold">$2.75</span>
              </li>
              <li className="flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1">
                <span className="text-muted-foreground">2 kg</span>
                <span className="font-mono font-semibold">$2.75</span>
              </li>
              <li className="flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1">
                <span className="text-muted-foreground">5 kg</span>
                <span className="font-mono font-semibold">$4.25</span>
              </li>
            </ul>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Fórmula: precio fijo + máx(0, peso − kg incluidos) × precio por kg adicional.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Panel Estados de rastreo
// ============================================================================

function EstadosRastreoView() {
  const { data: list, isLoading, error } = useEstadosRastreo();
  const createMutation = useCreateEstadoRastreo();
  const updateMutation = useUpdateEstadoRastreoEntity();
  const desactivarMutation = useDesactivarEstadoRastreo();
  const deleteMutation = useDeleteEstadoRastreo();
  const reorderMutation = useReorderTrackingEstadosRastreo();
  const [editing, setEditing] = useState<EstadoRastreo | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<EstadoRastreoRequest>({
    codigo: '',
    nombre: '',
    activo: true,
    leyenda: '',
    tipoFlujo: 'NORMAL',
    publicoTracking: true,
  });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [desactivarId, setDesactivarId] = useState<number | null>(null);
  const [baseOrderIds, setBaseOrderIds] = useState<number[]>([]);
  const [alternoAfterById, setAlternoAfterById] = useState<Record<number, number>>({});
  const [formErrors, setFormErrors] = useState<
    Partial<Record<'codigo' | 'nombre', string>>
  >({});

  const [search, setSearch] = useState('');

  const { hasPermission } = useAuthStore();
  const canWrite =
    hasPermission('ESTADOS_RASTREO_CREATE') ||
    hasPermission('ESTADOS_RASTREO_UPDATE');

  const validateEstadoForm = (payload: EstadoRastreoRequest) => {
    const parsed = estadoRastreoFormSchema.safeParse({
      codigo: payload.codigo.trim(),
      nombre: payload.nombre.trim(),
    });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setFormErrors({
        codigo: fieldErrors.codigo?.[0],
        nombre: fieldErrors.nombre?.[0],
      });
      return false;
    }
    setFormErrors({});
    return true;
  };

  const sameOrder = (a: number[], b: number[]) =>
    a.length === b.length && a.every((value, index) => value === b[index]);

  useEffect(() => {
    const estadosActivos = (list ?? [])
      .filter((e) => e.activo)
      .sort(
        (a, b) => (a.ordenTracking ?? a.orden) - (b.ordenTracking ?? b.orden) || a.id - b.id,
      );
    const estadosBase = estadosActivos.filter((e) => e.tipoFlujo !== 'ALTERNO');
    const estadosAlternos = estadosActivos.filter((e) => e.tipoFlujo === 'ALTERNO');
    const baseIds = estadosBase.map((e) => e.id);
    setBaseOrderIds((prev) => {
      const prevValid = prev.filter((id) => baseIds.includes(id));
      const missing = baseIds.filter((id) => !prevValid.includes(id));
      const next = [...prevValid, ...missing];
      return sameOrder(prev, next) ? prev : next;
    });
    setAlternoAfterById((prev) => {
      const next: Record<number, number> = {};
      for (const alterno of estadosAlternos) {
        const current = prev[alterno.id];
        if (current && baseIds.includes(current)) {
          next[alterno.id] = current;
          continue;
        }
        if (alterno.afterEstadoId && baseIds.includes(alterno.afterEstadoId)) {
          next[alterno.id] = alterno.afterEstadoId;
          continue;
        }
        if (baseIds[0]) {
          next[alterno.id] = baseIds[0];
        }
      }
      const same =
        Object.keys(prev).length === Object.keys(next).length &&
        Object.entries(next).every(([k, v]) => prev[Number(k)] === v);
      return same ? prev : next;
    });
  }, [list]);

  const handleSaveCreate = async () => {
    const payload: EstadoRastreoRequest = {
      ...form,
      codigo: form.codigo.trim().toUpperCase(),
      nombre: form.nombre.trim(),
      leyenda: form.leyenda?.trim() || undefined,
    };
    if (!validateEstadoForm(payload)) return;
    try {
      await createMutation.mutateAsync(payload);
      toast.success('Estado creado');
      setCreating(false);
      setForm({
        codigo: '',
        nombre: '',
        activo: true,
        leyenda: '',
        tipoFlujo: 'NORMAL',
        publicoTracking: true,
      });
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e) ?? 'Error al crear');
    }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const payload: EstadoRastreoRequest = {
      ...form,
      codigo: form.codigo.trim().toUpperCase(),
      nombre: form.nombre.trim(),
      leyenda: form.leyenda?.trim() || undefined,
    };
    if (!validateEstadoForm(payload)) return;
    try {
      await updateMutation.mutateAsync({ id: editing.id, body: payload });
      toast.success('Estado actualizado');
      setEditing(null);
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e) ?? 'Error al actualizar');
    }
  };

  const handleDesactivar = async (id: number) => {
    try {
      await desactivarMutation.mutateAsync(id);
      toast.success('Estado desactivado');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err) ?? 'Error al desactivar');
      throw err;
    }
  };

  const handleActivar = async (estado: EstadoRastreo) => {
    try {
      const payload: EstadoRastreoRequest = {
        codigo: estado.codigo,
        nombre: estado.nombre,
        ordenTracking: estado.ordenTracking,
        afterEstadoId: estado.afterEstadoId ?? null,
        activo: true,
        leyenda: estado.leyenda ?? undefined,
        tipoFlujo: estado.tipoFlujo === 'ALTERNO' ? 'ALTERNO' : 'NORMAL',
        publicoTracking: estado.publicoTracking ?? true,
      };
      await updateMutation.mutateAsync({ id: estado.id, body: payload });
      toast.success('Estado activado');
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e) ?? 'Error al activar');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Estado eliminado');
      setDeleteId(null);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err) ?? 'No se puede eliminar');
      throw err;
    }
  };

  const moveBaseOrder = (id: number, direction: -1 | 1) => {
    setBaseOrderIds((prev) => {
      const idx = prev.indexOf(id);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  if (isLoading) {
    return (
      <div aria-busy="true" aria-live="polite" className="space-y-3">
        <ListItemsSkeleton rows={6} withTrailing />
        <span className="sr-only">Cargando estados...</span>
      </div>
    );
  }
  if (error)
    return (
      <div className="ui-alert ui-alert-error">
        Error al cargar estados de rastreo.
      </div>
    );

  const estados = list ?? [];
  const estadosActivos = estados.filter((e) => e.activo);
  const estadoPorId = new Map(estadosActivos.map((e) => [e.id, e]));
  const estadosBaseOrdenados = baseOrderIds
    .map((id) => estadoPorId.get(id))
    .filter((item): item is EstadoRastreo => Boolean(item));
  const estadosAlternosOrdenados = estadosActivos
    .filter((e) => e.tipoFlujo === 'ALTERNO')
    .sort(
      (a, b) => (a.ordenTracking ?? a.orden) - (b.ordenTracking ?? b.orden) || a.id - b.id,
    );
  const ordenBaseOriginal = estadosActivos
    .filter((e) => e.tipoFlujo !== 'ALTERNO')
    .sort(
      (a, b) => (a.ordenTracking ?? a.orden) - (b.ordenTracking ?? b.orden) || a.id - b.id,
    )
    .map((e) => e.id);
  const alternoAfterOriginal = Object.fromEntries(
    estadosAlternosOrdenados
      .filter((e) => e.afterEstadoId != null)
      .map((e) => [e.id, e.afterEstadoId as number]),
  );
  const alternoDirty =
    Object.keys(alternoAfterOriginal).length !== Object.keys(alternoAfterById).length ||
    Object.entries(alternoAfterOriginal).some(([k, v]) => alternoAfterById[Number(k)] !== v);
  const trackingOrderDirty = !sameOrder(baseOrderIds, ordenBaseOriginal) || alternoDirty;
  const ordenEfectivoTracking = buildEffectiveTrackingOrder(
    baseOrderIds,
    estadoPorId,
    alternoAfterById,
    estadosAlternosOrdenados,
  );

  const handleGuardarOrdenTracking = async () => {
    try {
      const alternosPayload = estadosAlternosOrdenados
        .filter((estado) => alternoAfterById[estado.id] != null)
        .map((estado) => ({
          estadoId: estado.id,
          afterEstadoId: alternoAfterById[estado.id],
        }));
      await reorderMutation.mutateAsync({
        estadoIds: baseOrderIds,
        alternosAfter: alternosPayload,
      });
      toast.success('Orden de tracking guardado');
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e) ?? 'No se pudo guardar el orden de tracking');
    }
  };

  const filteredEstados = estados.filter((e) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (
        !e.codigo.toLowerCase().includes(q) &&
        !e.nombre.toLowerCase().includes(q) &&
        !(e.leyenda ?? '').toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  // KPIs
  const totalEstados = estados.length;
  const totalActivos = estadosActivos.length;
  const totalNormales = estadosActivos.filter((e) => e.tipoFlujo !== 'ALTERNO').length;
  const totalAlternos = estadosActivos.filter((e) => e.tipoFlujo === 'ALTERNO').length;
  const totalSinTracking = estadosActivos.filter((e) => !(e.publicoTracking ?? true)).length;

  const filtersActive = Boolean(search.trim());

  return (
    <div className="page-stack">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <KpiCard
          icon={<ListOrdered className="h-5 w-5" />}
          label="Total estados"
          value={totalEstados}
          tone="primary"
          hint={`${totalActivos} activos`}
        />
        <KpiCard
          icon={<Truck className="h-5 w-5" />}
          label="Flujo normal"
          value={totalNormales}
          tone="success"
          hint="Ruta principal"
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Flujo alterno"
          value={totalAlternos}
          tone="warning"
          hint="Incidencias y desvíos"
        />
        <KpiCard
          icon={<EyeOff className="h-5 w-5" />}
          label="Ocultos en tracking"
          value={totalSinTracking}
          tone={totalSinTracking > 0 ? 'danger' : 'neutral'}
          hint="No los ve el cliente"
        />
      </div>

      {/* Sección de orden de tracking */}
      <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <Layers className="h-4 w-4 text-muted-foreground" />
              Orden para tracking público
            </h3>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              Flujo normal: numeración 1…n. Estados alternos: eligen un estado base «después del
              cual» aparecerán en la línea de tiempo (sin número propio).
            </p>
          </div>
          <Button
            type="button"
            onClick={handleGuardarOrdenTracking}
            disabled={!canWrite || !trackingOrderDirty || reorderMutation.isPending}
          >
            {reorderMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar orden
              </>
            )}
          </Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)]/40 p-3">
            <h4 className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Truck className="h-3 w-3" />
              Flujo normal
            </h4>
            {estadosBaseOrdenados.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">
                No hay estados base activos.
              </p>
            ) : (
              <div className="space-y-1.5">
                {estadosBaseOrdenados.map((estado, index) => (
                  <div
                    key={estado.id}
                    className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1.5"
                  >
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)] text-[10px] font-semibold text-[var(--color-primary)]">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {estado.nombre}
                      </p>
                      <code className="text-[10px] text-muted-foreground">{estado.codigo}</code>
                    </div>
                    {!(estado.publicoTracking ?? true) && (
                      <Badge
                        variant="outline"
                        className="h-5 rounded border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-1.5 text-[10px] font-normal text-[var(--color-warning)]"
                        title="Oculto en el tracking público"
                      >
                        <EyeOff className="mr-1 h-2.5 w-2.5" />
                        Oculto
                      </Badge>
                    )}
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => moveBaseOrder(estado.id, -1)}
                        disabled={!canWrite || index === 0}
                        aria-label={`Subir ${estado.nombre}`}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => moveBaseOrder(estado.id, 1)}
                        disabled={!canWrite || index === estadosBaseOrdenados.length - 1}
                        aria-label={`Bajar ${estado.nombre}`}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)]/40 p-3">
            <h4 className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              Estados alternos
            </h4>
            {estadosAlternosOrdenados.length === 0 ? (
              <p className="py-3 text-center text-xs italic text-muted-foreground">
                No hay estados alternos.
              </p>
            ) : (
              <div className="space-y-1.5">
                {estadosAlternosOrdenados.map((estado) => (
                  <div
                    key={estado.id}
                    className="flex flex-col gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1.5 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {estado.nombre}
                      </p>
                      <code className="text-[10px] text-muted-foreground">{estado.codigo}</code>
                    </div>
                    <Select
                      value={
                        alternoAfterById[estado.id] != null
                          ? String(alternoAfterById[estado.id])
                          : ''
                      }
                      onValueChange={(value) =>
                        setAlternoAfterById((prev) => ({
                          ...prev,
                          [estado.id]: Number(value),
                        }))
                      }
                    >
                      <SelectTrigger className="h-8 w-full sm:w-[220px]">
                        <SelectValue placeholder="Después de…" />
                      </SelectTrigger>
                      <SelectContent>
                        {estadosBaseOrdenados.map((base, idx) => (
                          <SelectItem key={base.id} value={String(base.id)}>
                            {idx + 1}. {base.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {ordenEfectivoTracking.length > 0 && (
          <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/15 p-3">
            <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Eye className="h-3 w-3" />
              Vista previa del orden público
            </p>
            <ol className="flex flex-wrap items-center gap-1.5">
              {ordenEfectivoTracking.map((e, i) => {
                const isAlt = e.tipoFlujo === 'ALTERNO';
                return (
                  <li key={e.id} className="inline-flex items-center gap-1.5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                        isAlt
                          ? 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                          : 'border-[var(--color-primary)]/30 bg-[var(--color-muted)] text-[var(--color-primary)]',
                      )}
                    >
                      <span className="text-[10px] font-mono opacity-70">{i + 1}</span>
                      {e.nombre}
                      {isAlt && <AlertTriangle className="h-2.5 w-2.5" />}
                    </span>
                    {i < ordenEfectivoTracking.length - 1 && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, nombre o leyenda..."
            className="h-9 w-full pl-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute top-1/2 right-2 inline-flex -translate-y-1/2 items-center justify-center rounded p-1 text-muted-foreground hover:bg-[var(--color-muted)] hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        {canWrite && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo estado
          </Button>
        )}
      </div>

      {/* Tabla */}
      {filteredEstados.length === 0 ? (
        <EmptyState
          icon={ListOrdered}
          title={estados.length === 0 ? 'Sin estados' : 'Sin resultados'}
          description={
            estados.length === 0
              ? 'Crea el primer estado de rastreo para configurar el flujo de paquetes.'
              : 'No hay estados que coincidan con la búsqueda.'
          }
          action={
            estados.length === 0 && canWrite ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crear estado
              </Button>
            ) : filtersActive ? (
              <Button variant="outline" onClick={() => setSearch('')}>
                <X className="mr-2 h-4 w-4" />
                Limpiar búsqueda
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/20 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Flujo</th>
                  <th className="px-3 py-2 font-medium">Orden</th>
                  <th className="px-3 py-2 font-medium">Visibilidad</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Leyenda</th>
                  {canWrite && (
                    <th className="w-12 px-3 py-2 text-right font-medium" aria-label="Acciones" />
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredEstados.map((e) => {
                  const isAlt = (e.tipoFlujo ?? 'NORMAL') === 'ALTERNO';
                  const orden = e.activo
                    ? isAlt
                      ? null
                      : (baseOrderIds.indexOf(e.id) + 1 || e.ordenTracking)
                    : null;
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-[var(--color-border)]/60 last:border-b-0 hover:bg-[var(--color-muted)]/10"
                    >
                      <td className="px-3 py-2 align-top">
                        <div className="flex items-start gap-2">
                          <span
                            className={cn(
                              'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                              isAlt
                                ? 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]'
                                : 'bg-[var(--color-muted)] text-[var(--color-primary)]',
                            )}
                          >
                            {isAlt ? (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            ) : (
                              <Truck className="h-3.5 w-3.5" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{e.nombre}</p>
                            <code className="text-[11px] text-muted-foreground">{e.codigo}</code>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <Badge
                          variant="outline"
                          className={cn(
                            'h-5 rounded text-[10px] font-medium',
                            isAlt
                              ? 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                              : 'border-[var(--color-primary)]/30 bg-[var(--color-muted)] text-[var(--color-primary)]',
                          )}
                        >
                          {isAlt ? 'Alterno' : 'Normal'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 align-top">
                        {orden != null ? (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-muted)]/40 px-1.5 text-[11px] font-mono font-medium text-foreground">
                            {orden}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {e.publicoTracking ?? true ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-foreground">
                            <Eye className="h-3 w-3 text-muted-foreground" />
                            Visible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-warning)]">
                            <EyeOff className="h-3 w-3" />
                            Oculto
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {e.activo ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-success)]">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[var(--color-muted-foreground)]/30 bg-[var(--color-muted)]/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            <PowerOff className="h-2.5 w-2.5" />
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="max-w-[260px] px-3 py-2 align-top">
                        {e.leyenda ? (
                          <p
                            className="line-clamp-2 text-xs text-muted-foreground"
                            title={e.leyenda}
                          >
                            {e.leyenda}
                          </p>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">—</span>
                        )}
                      </td>
                      {canWrite && (
                        <td className="px-3 py-2 text-right align-top">
                          <RowActionsMenu
                            items={[
                              {
                                label: 'Editar',
                                icon: Pencil,
                                onSelect: () => {
                                  setEditing(e);
                                  setForm({
                                    codigo: e.codigo,
                                    nombre: e.nombre,
                                    ordenTracking: e.ordenTracking,
                                    afterEstadoId: e.afterEstadoId ?? null,
                                    activo: e.activo,
                                    leyenda: e.leyenda ?? '',
                                    tipoFlujo:
                                      e.tipoFlujo === 'ALTERNO' ? 'ALTERNO' : 'NORMAL',
                                    publicoTracking: e.publicoTracking ?? true,
                                  });
                                },
                              },
                              { type: 'separator' },
                              e.activo
                                ? {
                                    label: 'Desactivar',
                                    icon: PowerOff,
                                    onSelect: () => setDesactivarId(e.id),
                                  }
                                : {
                                    label: 'Activar',
                                    icon: Power,
                                    onSelect: () => handleActivar(e),
                                  },
                              { type: 'separator' },
                              {
                                label: 'Eliminar',
                                icon: Trash2,
                                destructive: true,
                                onSelect: () => setDeleteId(e.id),
                              },
                            ]}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog crear/editar */}
      <Dialog
        open={creating || editing != null}
        onOpenChange={(open) => {
          if (open) return;
          setCreating(false);
          setEditing(null);
          setFormErrors({});
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                {creating ? <Plus className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
              </span>
              <div>
                <DialogTitle>
                  {creating ? 'Nuevo estado de rastreo' : 'Editar estado de rastreo'}
                </DialogTitle>
                <DialogDescription>
                  Configura los datos básicos, mensaje y reglas de visibilidad.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <FormSection
              icon={<Hash className="h-4 w-4" />}
              title="Identificación"
              description="Código interno y nombre legible para el cliente."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Código"
                  required
                  error={formErrors.codigo}
                  hint="Solo mayúsculas, letras, números y guión bajo."
                >
                  <Input
                    id="estado-codigo"
                    type="text"
                    value={form.codigo}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, codigo: e.target.value.toUpperCase() }))
                    }
                    placeholder="REGISTRADO"
                    className="font-mono"
                    aria-invalid={Boolean(formErrors.codigo)}
                  />
                </FormField>
                <FormField
                  label="Nombre"
                  required
                  error={formErrors.nombre}
                  hint="Tal como aparecerá al cliente en el tracking."
                >
                  <Input
                    id="estado-nombre"
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    placeholder="Registrado"
                    aria-invalid={Boolean(formErrors.nombre)}
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection
              icon={<Layers className="h-4 w-4" />}
              title="Flujo y visibilidad"
              description="Define el comportamiento dentro del flujo de tracking público."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Tipo de flujo">
                  <Select
                    value={form.tipoFlujo ?? 'NORMAL'}
                    onValueChange={(value) =>
                      setForm((f) => ({ ...f, tipoFlujo: value as 'NORMAL' | 'ALTERNO' }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NORMAL">
                        <span className="inline-flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                          Normal — ruta principal
                        </span>
                      </SelectItem>
                      <SelectItem value="ALTERNO">
                        <span className="inline-flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-[var(--color-warning)]" />
                          Alterno — incidencia o desvío
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Visibilidad en tracking">
                  <div
                    className={cn(
                      'flex items-center justify-between rounded-md border px-3 py-2 transition-colors',
                      form.publicoTracking ?? true
                        ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5'
                        : 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {form.publicoTracking ?? true ? (
                        <Eye className="h-4 w-4 text-[var(--color-success)]" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-[var(--color-warning)]" />
                      )}
                      <span className="truncate text-xs">
                        {form.publicoTracking ?? true ? 'Visible al cliente' : 'Oculto al cliente'}
                      </span>
                    </div>
                    <Switch
                      id="estado-publico-tracking"
                      checked={form.publicoTracking ?? true}
                      onCheckedChange={(checked) =>
                        setForm((f) => ({ ...f, publicoTracking: Boolean(checked) }))
                      }
                    />
                  </div>
                </FormField>
              </div>
              <p className="mt-2 inline-flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                El orden numérico se gestiona en la sección «Orden para tracking público» de esta
                misma pestaña.
              </p>
            </FormSection>

            <FormSection
              icon={<Quote className="h-4 w-4" />}
              title="Nota del estado (opcional)"
              description="Texto informativo que se muestra junto al estado en el tracking."
            >
              <Textarea
                id="leyenda-general"
                value={form.leyenda ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, leyenda: e.target.value || undefined }))
                }
                className="min-h-[88px]"
                placeholder="Ej: Paquete retenido temporalmente por revisión documental."
                rows={3}
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                No se procesan variables dinámicas, se muestra como texto simple.
              </p>
            </FormSection>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreating(false);
                setEditing(null);
                setFormErrors({});
              }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={creating ? handleSaveCreate : handleSaveEdit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {creating ? 'Creando…' : 'Guardando…'}
                </>
              ) : creating ? (
                'Crear estado'
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId != null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Eliminar estado"
        description="¿Eliminar este estado? Solo es posible si ningún paquete lo usa."
        onConfirm={() => {
          if (deleteId != null) return handleDelete(deleteId);
        }}
        variant="destructive"
        loading={deleteMutation.isPending}
      />
      <ConfirmDialog
        open={desactivarId != null}
        onOpenChange={(open) => !open && setDesactivarId(null)}
        title="Desactivar estado"
        description="Este estado dejará de estar disponible para nuevas operaciones. ¿Deseas continuar?"
        onConfirm={() => {
          if (desactivarId != null) return handleDesactivar(desactivarId);
        }}
        variant="destructive"
        loading={desactivarMutation.isPending}
      />
    </div>
  );
}

// ============================================================================
// Panel Estados de rastreo por punto
// ============================================================================

type PuntoKey =
  | 'registro'
  | 'lote'
  | 'envio-consolidado'
  | 'guia-master'
  | 'despacho'
  | 'enviado-usa'
  | 'arribado-ec'
  | 'transito'
  | 'aviso-confirmacion'
  | 'entrega-cliente'
  | 'gm-sin-piezas'
  | 'gm-espera-recepcion'
  | 'gm-transito-usa-ecuador'
  | 'gm-recepcion-parcial'
  | 'gm-recepcion-completa'
  | 'gm-despacho-parcial'
  | 'gm-despacho-completado'
  | 'gm-despacho-incompleto'
  | 'gm-cancelada'
  | 'gm-en-revision'
  | 'consolidado-creado'
  | 'consolidado-lote'
  | 'consolidado-enviado-usa'
  | 'consolidado-reabierto'
  | 'inicio-cuenta'
  | 'fin';

interface PuntoConfig {
  key: PuntoKey;
  group: 'Paquetes' | 'Guías master' | 'Consolidados' | 'Tracking';
  source: 'rastreo' | 'guia-master' | 'consolidado';
  label: string;
  /** Qué acción del sistema dispara este punto. */
  detonante: string;
  /** En qué pantalla/menú ocurre la acción que lo dispara. */
  donde: string;
  /** Qué hace el sistema cuando se cumple el detonante. */
  efecto: string;
  icon: React.ComponentType<{ className?: string }>;
  required: boolean;
  tone: 'primary' | 'success' | 'warning' | 'neutral';
}

const PUNTOS_FLUJO: PuntoConfig[] = [
  {
    key: 'registro',
    group: 'Paquetes',
    source: 'rastreo',
    label: 'Cuando se registra el paquete',
    detonante: 'El operario completa el registro de un paquete nuevo.',
    donde: 'Paquetes → Registrar paquete.',
    efecto: 'Asigna el estado seleccionado al paquete recién creado.',
    icon: Package,
    required: true,
    tone: 'primary',
  },
  {
    key: 'lote',
    group: 'Paquetes',
    source: 'rastreo',
    label: 'Cuando se agrega a lote',
    detonante: 'El paquete entra al procesar (o ampliar) un lote de recepción.',
    donde: 'Lotes de recepción → crear lote o agregar guías.',
    efecto: 'Marca el paquete como recibido en lote; queda como su estado actual tras la recepción.',
    icon: Boxes,
    required: true,
    tone: 'primary',
  },
  {
    key: 'envio-consolidado',
    group: 'Paquetes',
    source: 'rastreo',
    label: 'Cuando se asocia a un consolidado',
    detonante: 'El paquete se agrega o reasigna a un envío consolidado.',
    donde: 'Consolidados (envíos) → agregar paquetes.',
    efecto: 'Asigna el estado seleccionado al paquete al entrar en el consolidado.',
    icon: Layers,
    required: true,
    tone: 'primary',
  },
  {
    key: 'guia-master',
    group: 'Paquetes',
    source: 'rastreo',
    label: 'Cuando se asocia a guía master',
    detonante: 'El paquete se asocia a una guía master.',
    donde: 'Guías master → asociar paquetes / detalle de la guía.',
    efecto: 'Asigna el estado seleccionado al paquete al quedar consolidado en la guía.',
    icon: Link2,
    required: true,
    tone: 'primary',
  },
  {
    key: 'despacho',
    group: 'Paquetes',
    source: 'rastreo',
    label: 'Cuando se agrega a despacho',
    detonante: 'El paquete se agrega a un despacho (queda dentro de una saca).',
    donde: 'Despachos → crear o editar despacho.',
    efecto: 'Asigna el estado seleccionado al paquete al quedar en despacho.',
    icon: Truck,
    required: true,
    tone: 'success',
  },
  {
    key: 'enviado-usa',
    group: 'Paquetes',
    source: 'rastreo',
    label: 'Cuando sale de origen',
    detonante: 'El consolidado se marca como enviado desde USA.',
    donde: 'Consolidados (envíos) → enviar desde USA.',
    efecto: 'Marca la salida del paquete de la operación de origen.',
    icon: ArrowUp,
    required: true,
    tone: 'success',
  },
  {
    key: 'arribado-ec',
    group: 'Paquetes',
    source: 'rastreo',
    label: 'Cuando llega a destino',
    detonante: 'El paquete se recibe físicamente al procesar un lote de recepción.',
    donde: 'Lotes de recepción → crear lote o agregar guías.',
    efecto: 'Registra la llegada a la operación de destino (justo antes del estado “en lote”).',
    icon: ArrowDown,
    required: true,
    tone: 'success',
  },
  {
    key: 'transito',
    group: 'Paquetes',
    source: 'rastreo',
    label: 'Cuando se aplica avance masivo por despacho',
    detonante: 'El operario lanza un avance masivo sobre paquetes ya despachados.',
    donde: 'Despachos → “Aplicar estado por periodo” o “Aplicar estado a despachos”.',
    efecto: 'Estado por defecto de esa acción masiva; debe ser posterior al estado de despacho.',
    icon: MapPin,
    required: true,
    tone: 'success',
  },
  {
    key: 'aviso-confirmacion',
    group: 'Paquetes',
    source: 'rastreo',
    label: 'Aviso de confirmación al cliente',
    detonante: 'Una pieza entra a este estado (p. ej. “En tránsito a destino”).',
    donde: 'Cualquier flujo que aplique ese estado (despacho, avance masivo, etc.).',
    efecto: 'Envía un push al cliente invitándolo a confirmar la entrega y habilita el botón “Ya lo recibí”.',
    icon: MessageCircle,
    required: false,
    tone: 'warning',
  },
  {
    key: 'entrega-cliente',
    group: 'Paquetes',
    source: 'rastreo',
    label: 'Cuando el cliente confirma la entrega',
    detonante: 'El cliente pulsa “Ya lo recibí” sobre su parte de un despacho.',
    donde: 'Vista de cliente → Mis entregas.',
    efecto: 'Aplica este estado a las piezas del cliente en ese despacho (debe ser posterior al aviso).',
    icon: CheckCircle2,
    required: false,
    tone: 'success',
  },
  {
    key: 'gm-sin-piezas',
    group: 'Guías master',
    source: 'guia-master',
    label: 'Al crear guía sin piezas',
    detonante: 'Se crea una guía master y todavía no tiene paquetes asociados.',
    donde: 'Guías master → crear guía.',
    efecto: 'Aplica este estado a la guía master mientras no tenga piezas.',
    icon: Hash,
    required: true,
    tone: 'neutral',
  },
  {
    key: 'gm-espera-recepcion',
    group: 'Guías master',
    source: 'guia-master',
    label: 'Al registrar primera pieza',
    detonante: 'Se registra al menos un paquete de la guía y ninguno fue recibido en lote.',
    donde: 'Paquetes → Registrar paquete (asociado a la guía).',
    efecto: 'Aplica este estado a la guía master en espera de recepción.',
    icon: Hourglass,
    required: true,
    tone: 'neutral',
  },
  {
    key: 'gm-transito-usa-ecuador',
    group: 'Guías master',
    source: 'guia-master',
    label: 'Al salir de USA',
    detonante: 'El consolidado que contiene piezas de la guía se marca como enviado desde USA.',
    donde: 'Consolidados (envíos) → enviar desde USA.',
    efecto: 'Aplica este estado a la guía master mientras sus piezas viajan hacia Ecuador.',
    icon: ArrowUp,
    required: true,
    tone: 'primary',
  },
  {
    key: 'gm-recepcion-parcial',
    group: 'Guías master',
    source: 'guia-master',
    label: 'Al recibir algunas piezas',
    detonante: 'El lote recibe una parte de los paquetes esperados de la guía.',
    donde: 'Lotes de recepción → procesar lote.',
    efecto: 'Aplica este estado a la guía master con recepción parcial.',
    icon: CircleDashed,
    required: true,
    tone: 'warning',
  },
  {
    key: 'gm-recepcion-completa',
    group: 'Guías master',
    source: 'guia-master',
    label: 'Al recibir todas las piezas',
    detonante: 'El lote recibe todos los paquetes esperados de la guía.',
    donde: 'Lotes de recepción → procesar lote.',
    efecto: 'Aplica este estado a la guía master con recepción completa.',
    icon: Check,
    required: true,
    tone: 'success',
  },
  {
    key: 'gm-despacho-parcial',
    group: 'Guías master',
    source: 'guia-master',
    label: 'Al despachar algunas piezas',
    detonante: 'Se despacha una parte de los paquetes esperados de la guía.',
    donde: 'Despachos → agregar piezas de la guía a un despacho.',
    efecto: 'Aplica este estado a la guía master con despacho parcial.',
    icon: CircleDashed,
    required: true,
    tone: 'warning',
  },
  {
    key: 'gm-despacho-completado',
    group: 'Guías master',
    source: 'guia-master',
    label: 'Al despachar todas las piezas',
    detonante: 'Se despachan todos los paquetes esperados de la guía.',
    donde: 'Despachos → agregar piezas de la guía a un despacho.',
    efecto: 'Aplica este estado a la guía master con despacho completado.',
    icon: CheckCircle2,
    required: true,
    tone: 'success',
  },
  {
    key: 'gm-despacho-incompleto',
    group: 'Guías master',
    source: 'guia-master',
    label: 'Al cerrar con faltantes',
    detonante: 'Se cierra la guía aceptando que faltaron paquetes por recibir o despachar.',
    donde: 'Guías master → cerrar guía con faltantes.',
    efecto: 'Aplica este estado a la guía master con despacho incompleto.',
    icon: AlertCircle,
    required: true,
    tone: 'warning',
  },
  {
    key: 'gm-cancelada',
    group: 'Guías master',
    source: 'guia-master',
    label: 'Al cancelar la guía',
    detonante: 'El operario cancela la guía antes de completar el flujo.',
    donde: 'Guías master → cancelar guía.',
    efecto: 'Aplica este estado a la guía master cancelada.',
    icon: X,
    required: true,
    tone: 'neutral',
  },
  {
    key: 'gm-en-revision',
    group: 'Guías master',
    source: 'guia-master',
    label: 'Al marcar para revisión',
    detonante: 'El operario pausa la guía para validar datos o incidencias.',
    donde: 'Guías master → marcar en revisión.',
    efecto: 'Aplica este estado a la guía master en revisión.',
    icon: Eye,
    required: true,
    tone: 'warning',
  },
  {
    key: 'consolidado-creado',
    group: 'Consolidados',
    source: 'consolidado',
    label: 'Cuando se crea el consolidado',
    detonante: 'El operario crea un nuevo envío consolidado.',
    donde: 'Consolidados (envíos) → crear consolidado.',
    efecto: 'Muestra Vacío al crear el consolidado (En preparación si ya tiene piezas).',
    icon: Layers,
    required: true,
    tone: 'primary',
  },
  {
    key: 'consolidado-enviado-usa',
    group: 'Consolidados',
    source: 'consolidado',
    label: 'Cuando se envía desde USA',
    detonante: 'El operario marca el consolidado como enviado desde USA.',
    donde: 'Consolidados (envíos) → enviar desde USA.',
    efecto: 'Muestra Enviado desde USA al cerrar la salida (fecha de cierre).',
    icon: ArrowUp,
    required: true,
    tone: 'success',
  },
  {
    key: 'consolidado-lote',
    group: 'Consolidados',
    source: 'consolidado',
    label: 'Al recibir en bodega (lote)',
    detonante: 'El consolidado se registra dentro de un lote de recepción en Ecuador.',
    donde: 'Lotes de recepción → procesar o ampliar lote.',
    efecto: 'Muestra Recibido en bodega cuando el código del consolidado entra en un lote.',
    icon: Boxes,
    required: true,
    tone: 'success',
  },
  {
    key: 'consolidado-reabierto',
    group: 'Consolidados',
    source: 'consolidado',
    label: 'Cuando se reabre el consolidado',
    detonante: 'El operario revierte la salida USA para volver a preparar el consolidado.',
    donde: 'Consolidados (envíos) → reabrir consolidado.',
    efecto: 'Muestra En preparación al reabrir un consolidado enviado desde USA.',
    icon: Power,
    required: true,
    tone: 'primary',
  },
  {
    key: 'inicio-cuenta',
    group: 'Tracking',
    source: 'rastreo',
    label: 'Inicio de cuenta regresiva',
    detonante: 'El paquete entra por primera vez al estado seleccionado.',
    donde: 'Rastreo público → bloque “Progreso y plazos”.',
    efecto: 'Ancla el inicio de la cuenta regresiva de retiro desde ese estado.',
    icon: Hourglass,
    required: false,
    tone: 'warning',
  },
  {
    key: 'fin',
    group: 'Tracking',
    source: 'rastreo',
    label: 'Fin de cuenta regresiva',
    detonante: 'El paquete alcanza el estado seleccionado.',
    donde: 'Rastreo público → bloque “Progreso y plazos”.',
    efecto: 'Cierra la cuenta regresiva de retiro en el tracking.',
    icon: CheckCircle2,
    required: false,
    tone: 'warning',
  },
];

type PuntoValue = number | EstadoGuiaMaster | EstadoEnvioConsolidadoOperativo | '';
type PuntoValues = Record<PuntoKey, PuntoValue>;

const PUNTO_FIELD_BY_KEY: Partial<Record<PuntoKey, keyof EstadosRastreoPorPunto>> = {
  registro: 'estadoRastreoRegistroPaqueteId',
  lote: 'estadoRastreoEnLoteRecepcionId',
  'envio-consolidado': 'estadoRastreoAsociarEnvioConsolidadoId',
  'guia-master': 'estadoRastreoAsociarGuiaMasterId',
  despacho: 'estadoRastreoEnDespachoId',
  'enviado-usa': 'estadoRastreoEnviadoDesdeUsaId',
  'arribado-ec': 'estadoRastreoArribadoEcId',
  transito: 'estadoRastreoEnTransitoId',
  'aviso-confirmacion': 'estadoRastreoAvisoConfirmacionEntregaId',
  'entrega-cliente': 'estadoRastreoEntregaConfirmadaClienteId',
  'inicio-cuenta': 'estadoRastreoInicioCuentaRegresivaId',
  fin: 'estadoRastreoFinCuentaRegresivaId',
};

const PUNTO_GROUPS: PuntoConfig['group'][] = ['Paquetes', 'Guías master', 'Consolidados', 'Tracking'];

function emptyPuntoValues(): PuntoValues {
  return Object.fromEntries(PUNTOS_FLUJO.map((p) => [p.key, ''])) as PuntoValues;
}

const RASTREO_DEFAULT_CODIGO_BY_KEY: Partial<Record<PuntoKey, string>> = {
  registro: 'REGISTRADO',
  lote: 'EN_BODEGA',
  'envio-consolidado': 'PLANILLA',
  'guia-master': 'MANIFESTADO',
  despacho: 'TRABAJO',
  'enviado-usa': 'VUELO',
  'arribado-ec': 'LLEGA_A_ADUANA',
  transito: 'EN_TRANSITO',
  'aviso-confirmacion': 'EN_TRANSITO',
  'entrega-cliente': 'ENTREGADO',
  'inicio-cuenta': 'EN_BODEGA',
  fin: 'ENTREGADO',
};

const GUIA_MASTER_DEFAULT_BY_KEY: Partial<Record<PuntoKey, EstadoGuiaMaster>> = {
  'gm-sin-piezas': 'SIN_PIEZAS_REGISTRADAS',
  'gm-espera-recepcion': 'EN_ESPERA_RECEPCION',
  'gm-transito-usa-ecuador': 'EN_TRANSITO_USA_ECUADOR',
  'gm-recepcion-parcial': 'RECEPCION_PARCIAL',
  'gm-recepcion-completa': 'RECEPCION_COMPLETA',
  'gm-despacho-parcial': 'DESPACHO_PARCIAL',
  'gm-despacho-completado': 'DESPACHO_COMPLETADO',
  'gm-despacho-incompleto': 'DESPACHO_INCOMPLETO',
  'gm-cancelada': 'CANCELADA',
  'gm-en-revision': 'EN_REVISION',
};

const CONSOLIDADO_PUNTO_KEYS = [
  'consolidado-creado',
  'consolidado-lote',
  'consolidado-enviado-usa',
  'consolidado-reabierto',
] as const;

type ConsolidadoPuntoKey = (typeof CONSOLIDADO_PUNTO_KEYS)[number];

/** Estado operativo fijo que corresponde a cada detonante de consolidado. */
const CONSOLIDADO_DEFAULT_BY_KEY: Record<
  ConsolidadoPuntoKey,
  EstadoEnvioConsolidadoOperativo
> = {
  'consolidado-creado': 'VACIO',
  'consolidado-lote': 'RECIBIDO_EN_BODEGA',
  'consolidado-enviado-usa': 'ENVIADO_DESDE_USA',
  'consolidado-reabierto': 'EN_PREPARACION',
};

/** Solo el estado válido por detonante (el backend deriva el estado real). */
const CONSOLIDADO_OPTIONS_BY_KEY: Record<
  ConsolidadoPuntoKey,
  EstadoEnvioConsolidadoOperativo[]
> = {
  'consolidado-creado': ['VACIO'],
  'consolidado-lote': ['RECIBIDO_EN_BODEGA'],
  'consolidado-enviado-usa': ['ENVIADO_DESDE_USA'],
  'consolidado-reabierto': ['EN_PREPARACION'],
};

function isConsolidadoPuntoKey(key: PuntoKey): key is ConsolidadoPuntoKey {
  return (CONSOLIDADO_PUNTO_KEYS as readonly PuntoKey[]).includes(key);
}

interface PuntoOption {
  value: string;
  label: string;
  meta?: string;
  variant?: 'normal' | 'alterno' | 'oculto';
}

const CONSOLIDADO_ESTADO_OPTIONS: PuntoOption[] = [
  { value: 'VACIO', label: 'Vacío', meta: 'Sin piezas' },
  { value: 'EN_PREPARACION', label: 'En preparación', meta: 'Admite cambios' },
  { value: 'ENVIADO_DESDE_USA', label: 'Enviado desde USA', meta: 'Salida registrada' },
  { value: 'RECIBIDO_EN_BODEGA', label: 'Recibido en bodega', meta: 'Registrado en lote' },
];

function resolvePuntoValue(
  punto: PuntoConfig,
  config: EstadosRastreoPorPunto,
  estados: EstadoRastreo[],
): PuntoValue {
  if (punto.source === 'guia-master') {
    return GUIA_MASTER_DEFAULT_BY_KEY[punto.key] ?? '';
  }
  if (punto.source === 'consolidado' && isConsolidadoPuntoKey(punto.key)) {
    return CONSOLIDADO_DEFAULT_BY_KEY[punto.key];
  }
  const field = PUNTO_FIELD_BY_KEY[punto.key];
  const raw = field ? ((config[field] as PuntoValue | null | undefined) ?? '') : '';
  if (punto.source === 'rastreo') {
    if (raw !== '' && Number.isFinite(Number(raw))) {
      return raw;
    }
    const codigo = RASTREO_DEFAULT_CODIGO_BY_KEY[punto.key];
    const estado = codigo ? estados.find((e) => e.codigo === codigo) : null;
    return estado ? estado.id : '';
  }
  return raw;
}

function optionsForPunto(punto: PuntoConfig, estados: EstadoRastreo[]): PuntoOption[] {
  if (punto.source === 'guia-master') {
    return GUIA_MASTER_ESTADO_ORDEN.map((estado) => ({
      value: estado,
      label: GUIA_MASTER_ESTADO_LABELS[estado],
      meta: estado,
    }));
  }
  if (punto.source === 'consolidado' && isConsolidadoPuntoKey(punto.key)) {
    const allowed = new Set(CONSOLIDADO_OPTIONS_BY_KEY[punto.key]);
    return CONSOLIDADO_ESTADO_OPTIONS.filter((option) =>
      allowed.has(option.value as EstadoEnvioConsolidadoOperativo),
    );
  }
  return estados.map((e) => ({
    value: String(e.id),
    label: e.nombre,
    meta: e.codigo,
    variant: e.tipoFlujo === 'ALTERNO' ? 'alterno' : !(e.publicoTracking ?? true) ? 'oculto' : 'normal',
  }));
}

function selectedOptionLabel(punto: PuntoConfig, value: PuntoValue, estados: EstadoRastreo[]) {
  if (value === '') return null;
  return optionsForPunto(punto, estados).find((option) => option.value === String(value))?.label ?? String(value);
}

function EstadosRastreoPorPuntoView() {
  const { data: config, isLoading, error } = useEstadosRastreoPorPunto();
  const { data: estados = [] } = useEstadosRastreoActivos();
  const updateMutation = useUpdateEstadosRastreoPorPunto();

  const [valuesByKey, setValuesByKey] = useState<PuntoValues>(() => emptyPuntoValues());

  useEffect(() => {
    if (config) {
      const next = Object.fromEntries(
        PUNTOS_FLUJO.map((p) => [p.key, resolvePuntoValue(p, config, estados)]),
      ) as PuntoValues;
      for (const key of CONSOLIDADO_PUNTO_KEYS) {
        next[key] = CONSOLIDADO_DEFAULT_BY_KEY[key];
      }
      setValuesByKey(next);
    }
  }, [config, estados]);

  const isDirty =
    config != null &&
    PUNTOS_FLUJO.some((p) => {
      if (p.source !== 'rastreo') return false;
      const field = PUNTO_FIELD_BY_KEY[p.key];
      return (
        valuesByKey[p.key] !==
        (field ? ((config[field] as PuntoValue | null | undefined) ?? '') : '')
      );
    });

  const allRequiredSelected = PUNTOS_FLUJO.every(
    (p) => p.source !== 'rastreo' || !p.required || valuesByKey[p.key] !== '',
  );

  const handleGuardar = async () => {
    if (!allRequiredSelected) {
      toast.error('Seleccione todos los estados obligatorios');
      return;
    }
    if (
      valuesByKey['inicio-cuenta'] !== '' &&
      valuesByKey.fin !== '' &&
      valuesByKey['inicio-cuenta'] === valuesByKey.fin
    ) {
      toast.error('El estado de inicio y fin de la cuenta regresiva deben ser distintos');
      return;
    }
    const estadoId = (key: PuntoKey) => (valuesByKey[key] === '' ? null : Number(valuesByKey[key]));
    try {
      await updateMutation.mutateAsync({
        estadoRastreoRegistroPaqueteId: Number(valuesByKey.registro),
        estadoRastreoEnLoteRecepcionId: Number(valuesByKey.lote),
        estadoRastreoAsociarEnvioConsolidadoId: Number(valuesByKey['envio-consolidado']),
        estadoRastreoAsociarGuiaMasterId: Number(valuesByKey['guia-master']),
        estadoRastreoEnDespachoId: Number(valuesByKey.despacho),
        estadoRastreoEnTransitoId: Number(valuesByKey.transito),
        estadoRastreoEnviadoDesdeUsaId: Number(valuesByKey['enviado-usa']),
        estadoRastreoArribadoEcId: Number(valuesByKey['arribado-ec']),
        estadoRastreoInicioCuentaRegresivaId: estadoId('inicio-cuenta'),
        estadoRastreoFinCuentaRegresivaId: estadoId('fin'),
        estadoRastreoAvisoConfirmacionEntregaId: estadoId('aviso-confirmacion'),
        estadoRastreoEntregaConfirmadaClienteId: estadoId('entrega-cliente'),
      });
      toast.success('Configuración guardada');
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'Error al guardar');
    }
  };

  const handleReset = () => {
    if (!config) return;
    setValuesByKey(
      Object.fromEntries(
        PUNTOS_FLUJO.map((p) => [p.key, resolvePuntoValue(p, config, estados)]),
      ) as PuntoValues,
    );
  };

  if (isLoading) {
    return (
      <div aria-busy="true" aria-live="polite" className="space-y-3">
        <SurfaceCardSkeleton bodyLines={3} />
        <ListItemsSkeleton rows={5} withTrailing />
        <span className="sr-only">Cargando configuración...</span>
      </div>
    );
  }
  if (error)
    return (
      <div className="ui-alert ui-alert-error">
        Error al cargar la configuración.
      </div>
    );

  return (
    <div className="page-stack">
      {/* Estado de la configuración */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatPill
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Configurados"
          value={
            (Object.keys(valuesByKey) as PuntoKey[]).filter(
              (k) => valuesByKey[k] !== '',
            ).length
          }
          tone="success"
        />
        <StatPill
          icon={<AlertCircle className="h-3.5 w-3.5" />}
          label="Pendientes"
          value={
            PUNTOS_FLUJO.filter((p) => p.required && valuesByKey[p.key] === '').length
          }
          tone="warning"
        />
        <StatPill
          icon={<Layers className="h-3.5 w-3.5" />}
          label="Estados disponibles"
          value={estados.length}
        />
      </div>

      {/* Cards por punto */}
      <div className="space-y-4">
        {PUNTO_GROUPS.map((group) => {
          const puntos = PUNTOS_FLUJO.filter((p) => p.group === group);
          return (
            <section key={group} className="space-y-2">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
                <h3 className="text-sm font-semibold text-foreground">{group}</h3>
                <span className="text-[11px] text-muted-foreground">
                  {puntos.filter((p) => valuesByKey[p.key] !== '').length} / {puntos.length}
                </span>
              </div>
              {group === 'Consolidados' && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Los estados operativos del consolidado se calculan automáticamente (piezas, salida
                  USA, lote de recepción y pago). Aquí solo se documenta qué etiqueta corresponde a
                  cada hito; <span className="font-medium text-foreground">Liquidado</span> aparece al
                  pagar la liquidación y no se configura en esta pantalla.
                </p>
              )}
              <div className="grid gap-3 lg:grid-cols-2">
                {puntos.map((punto) => (
                  <PuntoCard
                    key={punto.key}
                    punto={punto}
                    value={valuesByKey[punto.key]}
                    onChange={(next) =>
                      setValuesByKey((prev) => ({ ...prev, [punto.key]: next }))
                    }
                    options={optionsForPunto(punto, estados)}
                    readOnly={punto.source !== 'rastreo'}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Vista del flujo */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <header className="mb-4 flex items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            <Eye className="h-4 w-4 text-muted-foreground" />
            Vista del flujo configurado
          </h3>
          <span className="text-[11px] text-muted-foreground">
            {(Object.keys(valuesByKey) as PuntoKey[]).filter(
              (k) => valuesByKey[k] !== '',
            ).length}
            {' / '}
            {PUNTOS_FLUJO.length} pasos
          </span>
        </header>
        <div className="space-y-5">
          {PUNTO_GROUPS.map((grupo) => {
            const puntosGrupo = PUNTOS_FLUJO.filter((p) => p.group === grupo);
            const configuradosGrupo = puntosGrupo.filter(
              (p) => valuesByKey[p.key] !== '',
            ).length;
            return (
              <div key={grupo}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Flujo de {grupo.toLowerCase()}
                  </h4>
                  <span className="text-[10px] text-muted-foreground">
                    {configuradosGrupo} / {puntosGrupo.length}
                  </span>
                </div>
                <ol className="relative">
                  {puntosGrupo.map((punto, idx) => {
                    const Icon = punto.icon;
                    const value = valuesByKey[punto.key];
                    const estadoLabel = selectedOptionLabel(punto, value, estados);
                    const isLast = idx === puntosGrupo.length - 1;
            const configured = value !== '';
            const isMissingRequired = punto.required && !configured;
            return (
              <li key={punto.key} className="relative pl-10 pb-3 last:pb-0">
                {!isLast && (
                  <span
                    aria-hidden
                    className="absolute top-7 left-[14px] h-[calc(100%-1.25rem)] w-px bg-[var(--color-border)]"
                  />
                )}
                <span
                  className={cn(
                    'absolute left-0 top-0 inline-flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold',
                    configured
                      ? 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : isMissingRequired
                        ? 'border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                        : 'border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/30 text-muted-foreground',
                  )}
                >
                  {idx + 1}
                </span>
                <div
                  className={cn(
                    'flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
                    configured
                      ? 'border-[var(--color-border)] bg-[var(--color-card)]'
                      : 'border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/15',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      configured ? 'text-[var(--color-primary)]' : 'text-muted-foreground',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {punto.label}
                    </p>
                    {estadoLabel ? (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {estadoLabel}
                      </p>
                    ) : (
                      <p className="truncate text-[11px] italic text-muted-foreground">
                        {punto.required ? 'Pendiente' : 'No configurado'}
                      </p>
                    )}
                  </div>
                  {isMissingRequired ? (
                    <Badge
                      variant="outline"
                      className="h-5 shrink-0 rounded border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-1.5 text-[10px] font-medium text-[var(--color-warning)]"
                    >
                      Requerido
                    </Badge>
                  ) : !configured ? (
                    <Badge
                      variant="outline"
                      className="h-5 shrink-0 rounded px-1.5 text-[10px] font-medium text-muted-foreground"
                    >
                      Opcional
                    </Badge>
                  ) : null}
                </div>
              </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </div>
      </section>

      {/* Botones */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {isDirty && (
          <Button type="button" variant="outline" onClick={handleReset} disabled={updateMutation.isPending}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Descartar
          </Button>
        )}
        <Button
          onClick={handleGuardar}
          disabled={updateMutation.isPending || !allRequiredSelected || !isDirty}
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando…
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar configuración
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface PuntoCardProps {
  punto: PuntoConfig;
  value: PuntoValue;
  onChange: (v: PuntoValue) => void;
  options: PuntoOption[];
  readOnly: boolean;
}

function PuntoCard({ punto, value, onChange, options, readOnly }: PuntoCardProps) {
  const Icon = punto.icon;
  const toneIcon: Record<PuntoConfig['tone'], string> = {
    primary: 'bg-[var(--color-muted)] text-[var(--color-primary)]',
    success: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
    neutral: 'bg-[var(--color-muted)] text-muted-foreground',
  };
  const isPending = punto.required && value === '';
  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-[var(--color-card)] p-4 transition-colors',
        isPending
          ? 'border-[var(--color-warning)]/40'
          : 'border-[var(--color-border)]',
      )}
    >
      <header className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
            toneIcon[punto.tone],
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-semibold text-foreground">{punto.label}</h4>
            {readOnly ? (
              <Badge
                variant="outline"
                className="h-5 rounded border-primary/20 px-1.5 text-[10px] font-medium text-muted-foreground"
              >
                Definido por el sistema
              </Badge>
            ) : punto.required ? (
              <Badge
                variant="outline"
                className="h-5 rounded border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 px-1.5 text-[10px] font-medium text-[var(--color-destructive)]"
              >
                Requerido
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="h-5 rounded px-1.5 text-[10px] font-medium text-muted-foreground"
              >
                Opcional
              </Badge>
            )}
          </div>
          <dl className="mt-1 space-y-0.5 text-[11px] leading-snug text-muted-foreground">
            <div className="flex gap-1">
              <dt className="shrink-0 font-medium text-foreground/70">Detonante:</dt>
              <dd>{punto.detonante}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="shrink-0 font-medium text-foreground/70">Dónde:</dt>
              <dd>{punto.donde}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="shrink-0 font-medium text-foreground/70">Efecto:</dt>
              <dd>{punto.efecto}</dd>
            </div>
          </dl>
        </div>
      </header>

      {readOnly ? (
        <div className="space-y-2 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/15 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="h-6 rounded border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-2 text-xs font-medium text-[var(--color-success)]"
            >
              {selectedOptionLabel(punto, value, [])}
            </Badge>
            <Badge
              variant="outline"
              className="h-5 rounded px-1.5 font-mono text-[10px] font-normal text-muted-foreground"
            >
              {String(value)}
            </Badge>
            <Badge
              variant="outline"
              className="h-5 rounded border-[var(--color-primary)]/20 px-1.5 text-[10px] font-medium text-muted-foreground"
            >
              Solo lectura
            </Badge>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Estado fijo para este hito. No forma parte de la configuración editable del ambiente.
          </p>
        </div>
      ) : (
        <Select
          value={value === '' ? (punto.required ? '' : 'none') : String(value)}
          onValueChange={(v) => {
            if (v === 'none') onChange('');
            else onChange(punto.source === 'rastreo' ? Number(v) : (v as PuntoValue));
          }}
        >
          <SelectTrigger
            className={cn(
              'h-9',
              isPending && 'border-[var(--color-warning)]/50',
            )}
          >
            <SelectValue placeholder="Seleccionar estado..." />
          </SelectTrigger>
          <SelectContent>
            {!punto.required && (
              <SelectItem value="none">
                <span className="text-muted-foreground">Sin asignar</span>
              </SelectItem>
            )}
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="inline-flex items-center gap-1.5">
                  {option.variant === 'alterno' ? (
                    <AlertTriangle className="h-3 w-3 text-[var(--color-warning)]" />
                  ) : option.variant === 'oculto' ? (
                    <EyeOff className="h-3 w-3 text-[var(--color-warning)]" />
                  ) : (
                    <Truck className="h-3 w-3 text-[var(--color-primary)]" />
                  )}
                  <span className="font-medium">{option.label}</span>
                  {option.meta && (
                    <span className="text-[11px] font-mono text-muted-foreground">
                      ({option.meta})
                    </span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {value !== '' && (
        <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/15 p-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className="h-5 rounded font-mono text-[10px] font-normal"
            >
              {String(value)}
            </Badge>
            {punto.source === 'guia-master' ? (
              <Badge
                variant="outline"
                className="h-5 rounded border-[var(--color-primary)]/30 bg-[var(--color-muted)] px-1.5 text-[10px] font-medium text-[var(--color-primary)]"
              >
                Guía master
              </Badge>
            ) : punto.source === 'consolidado' ? (
              <Badge
                variant="outline"
                className="h-5 rounded border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-1.5 text-[10px] font-medium text-[var(--color-success)]"
              >
                Consolidado
              </Badge>
            ) : options.find((option) => option.value === String(value))?.variant === 'alterno' ? (
              <Badge
                variant="outline"
                className="h-5 rounded border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-1.5 text-[10px] font-medium text-[var(--color-warning)]"
              >
                <AlertTriangle className="mr-1 h-2.5 w-2.5" />
                Alterno
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="h-5 rounded border-[var(--color-primary)]/30 bg-[var(--color-muted)] px-1.5 text-[10px] font-medium text-[var(--color-primary)]"
              >
                <Truck className="mr-1 h-2.5 w-2.5" />
                Normal
              </Badge>
            )}
            {options.find((option) => option.value === String(value))?.variant === 'oculto' && (
              <Badge
                variant="outline"
                className="h-5 rounded border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-1.5 text-[10px] font-medium text-[var(--color-warning)]"
              >
                <EyeOff className="mr-1 h-2.5 w-2.5" />
                Oculto
              </Badge>
            )}
          </div>
        </div>
      )}

      {isPending && (
        <p className="inline-flex items-center gap-1 text-[11px] text-[var(--color-warning)]">
          <AlertCircle className="h-3 w-3" />
          Selecciona un estado para este punto
        </p>
      )}
    </article>
  );
}

// ============================================================================
// Componentes auxiliares
// ============================================================================

interface StatPillProps {
  icon: ReactNode;
  label: string;
  value: number | string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}

function StatPill({ icon, label, value, tone = 'neutral' }: StatPillProps) {
  const toneCls: Record<NonNullable<StatPillProps['tone']>, string> = {
    neutral: 'text-foreground',
    success: 'text-[var(--color-success)]',
    warning: 'text-[var(--color-warning)]',
    danger: 'text-[var(--color-destructive)]',
  };
  return (
    <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className={cn('text-sm font-semibold', toneCls[tone])}>{value}</p>
      </div>
    </div>
  );
}

type FormatAction = 'bold' | 'italic' | 'strike' | 'code' | 'block';

function FormatToolbar({ onAction }: { onAction: (action: FormatAction) => void }) {
  const buttons: Array<{ action: FormatAction; icon: ReactNode; title: string }> = [
    { action: 'bold', icon: <Bold className="h-3.5 w-3.5" />, title: 'Negrita (*)' },
    { action: 'italic', icon: <Italic className="h-3.5 w-3.5" />, title: 'Cursiva (_)' },
    { action: 'strike', icon: <Strikethrough className="h-3.5 w-3.5" />, title: 'Tachado (~)' },
    { action: 'code', icon: <Code2 className="h-3.5 w-3.5" />, title: 'Código (`)' },
    { action: 'block', icon: <Quote className="h-3.5 w-3.5" />, title: 'Bloque (```)' },
  ];
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-0.5">
      {buttons.map((b) => (
        <button
          key={b.action}
          type="button"
          onClick={() => onAction(b.action)}
          title={b.title}
          aria-label={b.title}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-[var(--color-card)] hover:text-foreground"
        >
          {b.icon}
        </button>
      ))}
    </div>
  );
}

function FormatHelp() {
  return (
    <p className="text-[11px] leading-relaxed text-muted-foreground">
      Formato:{' '}
      <code className="rounded bg-[var(--color-muted)]/50 px-1">*negrita*</code>{' '}
      <code className="rounded bg-[var(--color-muted)]/50 px-1">_cursiva_</code>{' '}
      <code className="rounded bg-[var(--color-muted)]/50 px-1">~tachado~</code>{' '}
      <code className="rounded bg-[var(--color-muted)]/50 px-1">`código`</code>{' '}
      <code className="rounded bg-[var(--color-muted)]/50 px-1">```bloque```</code>
    </p>
  );
}

interface FormSectionProps {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
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
          {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}


// ============================================================================
// Vista previa WhatsApp
// ============================================================================

function WhatsAppPreview({ text }: { text: string }) {
  const now = new Date();
  const time = now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
  const empty = !text.trim();
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[#e5ddd5] dark:bg-[#1f2c33]">
      <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2 text-white">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white">
          <Truck className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-tight">ECUBOX</p>
          <p className="text-[10px] leading-tight opacity-80">en línea</p>
        </div>
        <MessageCircle className="h-4 w-4 opacity-80" />
      </div>
      <div
        className="relative px-3 py-4"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 35%, rgba(0,0,0,0.04) 0, transparent 25%), radial-gradient(circle at 75% 65%, rgba(0,0,0,0.04) 0, transparent 25%)',
        }}
      >
        <div className="relative max-w-[88%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-[#111b21] shadow-sm dark:bg-[#202c33] dark:text-[#e9edef]">
          <div className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">
            {empty ? (
              <span className="italic text-[#667781] dark:text-[#8696a0]">
                El mensaje se mostrará aquí con variables reemplazadas.
              </span>
            ) : (
              parseWhatsAppPreviewToReact(text)
            )}
          </div>
          <div className="mt-1 flex items-center justify-end gap-0.5 text-[10px] text-[#667781] dark:text-[#8696a0]">
            {time}
            <Check className="h-3 w-3" />
            <Check className="-ml-2 h-3 w-3 text-[#53bdeb]" />
          </div>
          <span
            aria-hidden
            className="absolute -left-1.5 top-0 h-2 w-2 bg-white dark:bg-[#202c33]"
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}
          />
        </div>
      </div>
    </div>
  );
}
