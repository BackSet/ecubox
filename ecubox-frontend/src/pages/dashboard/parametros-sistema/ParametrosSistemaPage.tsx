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
import { z } from 'zod';
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
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api/error-message';
import type { EstadoRastreo, EstadoRastreoRequest } from '@/types/estado-rastreo';

// ============================================================================
// Tipos y constantes
// ============================================================================

type OpcionActiva =
  | 'mensaje-whatsapp-despacho'
  | 'mensaje-agencia-eeuu'
  | 'tarifa-calculadora'
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

const estadoRastreoFormSchema = z.object({
  codigo: z.string().trim().min(1, 'Código obligatorio'),
  nombre: z.string().trim().min(1, 'Nombre obligatorio'),
});

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
  const { hasPermission, hasRole } = useAuthStore();

  const canSeeTarifaCalculadora =
    hasPermission('TARIFA_CALCULADORA_READ') || hasRole('ADMIN') || hasRole('OPERARIO');

  const canSeeEstadosRastreo =
    hasPermission('ESTADOS_RASTREO_READ') || hasRole('ADMIN') || hasRole('OPERARIO');

  const tabs: TabMeta[] = useMemo(
    () => [
      {
        key: 'mensaje-whatsapp-despacho',
        label: 'Mensaje WhatsApp despacho',
        shortLabel: 'WhatsApp',
        description: 'Plantilla del mensaje que se envía al cliente al despachar.',
        icon: MessageCircle,
        visible: true,
      },
      {
        key: 'mensaje-agencia-eeuu',
        label: 'Agencia en Estados Unidos',
        shortLabel: 'Agencia USA',
        description: 'Dirección, horarios e instrucciones que ven los clientes.',
        icon: MapPin,
        visible: true,
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
        description: 'Asignación de estados a hitos operativos del paquete.',
        icon: PlugZap,
        visible: canSeeEstadosRastreo,
      },
    ],
    [canSeeEstadosRastreo, canSeeTarifaCalculadora],
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
    useMensajeWhatsAppDespacho();
  const updateWhatsMutation = useUpdateMensajeWhatsAppDespacho();
  const [plantillaLocal, setPlantillaLocal] = useState('');
  useEffect(() => {
    if (dataWhats != null) setPlantillaLocal(dataWhats.plantilla ?? '');
  }, [dataWhats]);

  const { data: dataAgencia, isLoading: loadingAgencia, error: errorAgencia } =
    useMensajeAgenciaEeuu();
  const updateAgenciaMutation = useUpdateMensajeAgenciaEeuu();
  const [mensajeAgenciaLocal, setMensajeAgenciaLocal] = useState('');
  useEffect(() => {
    if (dataAgencia != null) setMensajeAgenciaLocal(dataAgencia.mensaje ?? '');
  }, [dataAgencia]);

  const plantillaOriginal = dataWhats?.plantilla ?? '';
  const mensajeAgenciaOriginal = dataAgencia?.mensaje ?? '';
  const whatsappDirty = plantillaLocal !== plantillaOriginal;
  const agenciaDirty = mensajeAgenciaLocal !== mensajeAgenciaOriginal;

  const isCurrentDirty =
    (opcionActiva === 'mensaje-whatsapp-despacho' && whatsappDirty) ||
    (opcionActiva === 'mensaje-agencia-eeuu' && agenciaDirty);

  const [opcionPendiente, setOpcionPendiente] = useState<PendingParametrosNav | null>(null);
  const [confirmarSalida, setConfirmarSalida] = useState(false);

  const handleGuardarWhatsapp = async () => {
    try {
      await updateWhatsMutation.mutateAsync({ plantilla: plantillaLocal });
      toast.success('Mensaje de despacho guardado');
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'Error al guardar el mensaje');
      throw err;
    }
  };

  const handleGuardarAgencia = async () => {
    try {
      await updateAgenciaMutation.mutateAsync({ mensaje: mensajeAgenciaLocal });
      toast.success('Mensaje de agencia USA guardado');
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
    'tarifa-calculadora': false,
    'estados-rastreo': false,
    'estados-rastreo-por-punto': false,
  };

  return (
    <div className="page-stack">
      <header className="border-b border-[var(--color-border)] pb-4">
        <div className="flex items-start gap-2.5">
          <Settings className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-muted-foreground)]" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[18px] font-semibold leading-tight tracking-tight text-[var(--color-foreground)]">
              Parámetros del sistema
            </h1>
            <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-[var(--color-muted-foreground)]">
              Configura mensajes automáticos, tarifas públicas y estados de rastreo. Los cambios
              aplican a todo el sistema.
            </p>
          </div>
        </div>
      </header>

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
                    : null
              }
              saving={
                opcionActiva === 'mensaje-whatsapp-despacho'
                  ? updateWhatsMutation.isPending
                  : opcionActiva === 'mensaje-agencia-eeuu'
                    ? updateAgenciaMutation.isPending
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
              onSave={handleGuardarAgencia}
            />
          )}

          {opcionActiva === 'tarifa-calculadora' && <TarifaCalculadoraPanel />}

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
            if (opcionPendiente && opcionPendiente !== 'menu') {
              setOpcionActiva(opcionPendiente);
            }
            setOpcionPendiente(null);
            setConfirmarSalida(false);
          } catch {
            // mantenemos el modal abierto si falla guardar
          }
        }}
        loading={updateWhatsMutation.isPending || updateAgenciaMutation.isPending}
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
            placeholder="Hola {{destinatarioNombre}}, tu envío {{numeroGuia}} está en camino..."
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
            <Button onClick={onSave} disabled={saving || !dirty}>
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
  onSave,
}: AgenciaEeuuPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (loading) {
    return (
      <div aria-busy="true" aria-live="polite" className="space-y-4">
        <SurfaceCardSkeleton bodyLines={2} />
        <FormSkeleton fields={2} withTextarea withFooter />
        <span className="sr-only">Cargando mensaje de agencia USA...</span>
      </div>
    );
  }
  if (error)
    return (
      <div className="ui-alert ui-alert-error">
        Error al cargar el mensaje de agencia USA.
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
            placeholder={'Agencia USA:\n\nDirección completa…\n\nHorarios e indicaciones…'}
          />

          <FormatHelp />

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button onClick={onSave} disabled={saving || !dirty}>
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
                  <p className="text-sm font-semibold text-foreground">Agencia en EE.UU.</p>
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
                <span className="text-muted-foreground">5 lb</span>
                <span className="font-mono font-semibold">$12.50</span>
              </li>
              <li className="flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1">
                <span className="text-muted-foreground">10 lb</span>
                <span className="font-mono font-semibold">$25.00</span>
              </li>
              <li className="flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1">
                <span className="text-muted-foreground">25 lb</span>
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

  const { hasPermission, hasRole } = useAuthStore();
  const canWrite =
    hasPermission('ESTADOS_RASTREO_CREATE') ||
    hasPermission('ESTADOS_RASTREO_UPDATE') ||
    hasRole('ADMIN') ||
    hasRole('OPERARIO');

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

interface PuntoConfig {
  key: 'registro' | 'lote' | 'consolidado' | 'despacho' | 'transito' | 'inicio-cuenta' | 'fin';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  required: boolean;
  tone: 'primary' | 'success' | 'warning' | 'neutral';
}

const PUNTOS_FLUJO: PuntoConfig[] = [
  {
    key: 'registro',
    label: 'Al registrar paquete',
    description: 'Estado inicial cuando el cliente o el operario registra el paquete.',
    icon: Package,
    required: true,
    tone: 'primary',
  },
  {
    key: 'lote',
    label: 'En lote de recepción',
    description: 'Estado al ingresar el paquete a un lote de recepción.',
    icon: Boxes,
    required: true,
    tone: 'primary',
  },
  {
    key: 'consolidado',
    label: 'Al asociar guía de consolidado',
    description:
      'Estado aplicado al paquete cuando se vincula con la guía master del consolidado (paquetes hijos).',
    icon: Link2,
    required: false,
    tone: 'primary',
  },
  {
    key: 'despacho',
    label: 'En despacho',
    description: 'Estado cuando el paquete forma parte de un despacho.',
    icon: Truck,
    required: true,
    tone: 'success',
  },
  {
    key: 'transito',
    label: 'En tránsito',
    description: 'Estado cuando el despacho ya está en ruta hacia el destino.',
    icon: MapPin,
    required: true,
    tone: 'success',
  },
  {
    key: 'inicio-cuenta',
    label: 'Inicio de cuenta regresiva',
    description:
      'Ancla el inicio del contador en la primera vez que el paquete llegó a este estado. Si se deja vacío, la cuenta se reinicia con cada cambio de estado.',
    icon: Hourglass,
    required: false,
    tone: 'warning',
  },
  {
    key: 'fin',
    label: 'Fin de cuenta regresiva',
    description: 'Cuando el paquete llega aquí, se oculta la cuenta regresiva en el tracking.',
    icon: CheckCircle2,
    required: false,
    tone: 'warning',
  },
];

function EstadosRastreoPorPuntoView() {
  const { data: config, isLoading, error } = useEstadosRastreoPorPunto();
  const { data: estados = [] } = useEstadosRastreoActivos();
  const updateMutation = useUpdateEstadosRastreoPorPunto();

  const [registroId, setRegistroId] = useState<number | ''>('');
  const [enLoteId, setEnLoteId] = useState<number | ''>('');
  const [asociarGuiaMasterId, setAsociarGuiaMasterId] = useState<number | ''>('');
  const [enDespachoId, setEnDespachoId] = useState<number | ''>('');
  const [enTransitoId, setEnTransitoId] = useState<number | ''>('');
  const [inicioCuentaRegresivaId, setInicioCuentaRegresivaId] = useState<number | ''>('');
  const [finCuentaRegresivaId, setFinCuentaRegresivaId] = useState<number | ''>('');

  useEffect(() => {
    if (config) {
      setRegistroId(config.estadoRastreoRegistroPaqueteId ?? '');
      setEnLoteId(config.estadoRastreoEnLoteRecepcionId ?? '');
      setAsociarGuiaMasterId(config.estadoRastreoAsociarGuiaMasterId ?? '');
      setEnDespachoId(config.estadoRastreoEnDespachoId ?? '');
      setEnTransitoId(config.estadoRastreoEnTransitoId ?? '');
      setInicioCuentaRegresivaId(config.estadoRastreoInicioCuentaRegresivaId ?? '');
      setFinCuentaRegresivaId(config.estadoRastreoFinCuentaRegresivaId ?? '');
    }
  }, [config]);

  const isDirty =
    config != null &&
    (registroId !== (config.estadoRastreoRegistroPaqueteId ?? '') ||
      enLoteId !== (config.estadoRastreoEnLoteRecepcionId ?? '') ||
      asociarGuiaMasterId !== (config.estadoRastreoAsociarGuiaMasterId ?? '') ||
      enDespachoId !== (config.estadoRastreoEnDespachoId ?? '') ||
      enTransitoId !== (config.estadoRastreoEnTransitoId ?? '') ||
      inicioCuentaRegresivaId !== (config.estadoRastreoInicioCuentaRegresivaId ?? '') ||
      finCuentaRegresivaId !== (config.estadoRastreoFinCuentaRegresivaId ?? ''));

  const allRequiredSelected =
    registroId !== '' && enLoteId !== '' && enDespachoId !== '' && enTransitoId !== '';

  const handleGuardar = async () => {
    if (!allRequiredSelected) {
      toast.error('Seleccione los cuatro estados obligatorios');
      return;
    }
    if (
      inicioCuentaRegresivaId !== '' &&
      finCuentaRegresivaId !== '' &&
      inicioCuentaRegresivaId === finCuentaRegresivaId
    ) {
      toast.error('El estado de inicio y fin de la cuenta regresiva deben ser distintos');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        estadoRastreoRegistroPaqueteId: Number(registroId),
        estadoRastreoEnLoteRecepcionId: Number(enLoteId),
        estadoRastreoAsociarGuiaMasterId:
          asociarGuiaMasterId === '' ? null : Number(asociarGuiaMasterId),
        estadoRastreoEnDespachoId: Number(enDespachoId),
        estadoRastreoEnTransitoId: Number(enTransitoId),
        estadoRastreoInicioCuentaRegresivaId:
          inicioCuentaRegresivaId === '' ? null : Number(inicioCuentaRegresivaId),
        estadoRastreoFinCuentaRegresivaId:
          finCuentaRegresivaId === '' ? null : Number(finCuentaRegresivaId),
      });
      toast.success('Configuración guardada');
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'Error al guardar');
    }
  };

  const handleReset = () => {
    if (!config) return;
    setRegistroId(config.estadoRastreoRegistroPaqueteId ?? '');
    setEnLoteId(config.estadoRastreoEnLoteRecepcionId ?? '');
    setAsociarGuiaMasterId(config.estadoRastreoAsociarGuiaMasterId ?? '');
    setEnDespachoId(config.estadoRastreoEnDespachoId ?? '');
    setEnTransitoId(config.estadoRastreoEnTransitoId ?? '');
    setInicioCuentaRegresivaId(config.estadoRastreoInicioCuentaRegresivaId ?? '');
    setFinCuentaRegresivaId(config.estadoRastreoFinCuentaRegresivaId ?? '');
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

  const valuesByKey: Record<PuntoConfig['key'], number | ''> = {
    registro: registroId,
    lote: enLoteId,
    consolidado: asociarGuiaMasterId,
    despacho: enDespachoId,
    transito: enTransitoId,
    'inicio-cuenta': inicioCuentaRegresivaId,
    fin: finCuentaRegresivaId,
  };
  const settersByKey: Record<PuntoConfig['key'], (v: number | '') => void> = {
    registro: setRegistroId,
    lote: setEnLoteId,
    consolidado: setAsociarGuiaMasterId,
    despacho: setEnDespachoId,
    transito: setEnTransitoId,
    'inicio-cuenta': setInicioCuentaRegresivaId,
    fin: setFinCuentaRegresivaId,
  };

  const estadoById = new Map(estados.map((e) => [e.id, e]));

  return (
    <div className="page-stack">
      {/* Estado de la configuración */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatPill
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Configurados"
          value={
            (Object.keys(valuesByKey) as PuntoConfig['key'][]).filter(
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
      <div className="grid gap-3 lg:grid-cols-2">
        {PUNTOS_FLUJO.map((punto) => (
          <PuntoCard
            key={punto.key}
            punto={punto}
            value={valuesByKey[punto.key]}
            onChange={settersByKey[punto.key]}
            estados={estados}
            estadoSeleccionado={
              valuesByKey[punto.key] !== '' ? estadoById.get(Number(valuesByKey[punto.key])) : undefined
            }
          />
        ))}
      </div>

      {/* Vista del flujo */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <header className="mb-4 flex items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            <Eye className="h-4 w-4 text-muted-foreground" />
            Vista del flujo configurado
          </h3>
          <span className="text-[11px] text-muted-foreground">
            {(Object.keys(valuesByKey) as PuntoConfig['key'][]).filter(
              (k) => valuesByKey[k] !== '',
            ).length}
            {' / '}
            {PUNTOS_FLUJO.length} pasos
          </span>
        </header>
        <ol className="relative">
          {PUNTOS_FLUJO.map((punto, idx) => {
            const Icon = punto.icon;
            const value = valuesByKey[punto.key];
            const estadoSel = value !== '' ? estadoById.get(Number(value)) : null;
            const isLast = idx === PUNTOS_FLUJO.length - 1;
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
                    {estadoSel ? (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {estadoSel.nombre}
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
  value: number | '';
  onChange: (v: number | '') => void;
  estados: EstadoRastreo[];
  estadoSeleccionado?: EstadoRastreo;
}

function PuntoCard({ punto, value, onChange, estados, estadoSeleccionado }: PuntoCardProps) {
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
            {punto.required ? (
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
          <p className="mt-0.5 text-[11px] text-muted-foreground">{punto.description}</p>
        </div>
      </header>

      <Select
        value={value === '' ? (punto.required ? '' : 'none') : String(value)}
        onValueChange={(v) => {
          if (v === 'none') onChange('');
          else onChange(Number(v));
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
          {estados.map((e) => (
            <SelectItem key={e.id} value={String(e.id)}>
              <span className="inline-flex items-center gap-1.5">
                {e.tipoFlujo === 'ALTERNO' ? (
                  <AlertTriangle className="h-3 w-3 text-[var(--color-warning)]" />
                ) : (
                  <Truck className="h-3 w-3 text-[var(--color-primary)]" />
                )}
                <span className="font-medium">{e.nombre}</span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  ({e.codigo})
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {estadoSeleccionado && (
        <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/15 p-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className="h-5 rounded font-mono text-[10px] font-normal"
            >
              {estadoSeleccionado.codigo}
            </Badge>
            {estadoSeleccionado.tipoFlujo === 'ALTERNO' ? (
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
            {!(estadoSeleccionado.publicoTracking ?? true) && (
              <Badge
                variant="outline"
                className="h-5 rounded border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-1.5 text-[10px] font-medium text-[var(--color-warning)]"
              >
                <EyeOff className="mr-1 h-2.5 w-2.5" />
                Oculto
              </Badge>
            )}
          </div>
          {estadoSeleccionado.leyenda && (
            <p className="mt-1 line-clamp-2 text-[11px] italic text-muted-foreground">
              "{estadoSeleccionado.leyenda}"
            </p>
          )}
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
