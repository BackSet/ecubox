import { useEffect, useRef, useCallback, useState, type ReactNode } from 'react';
import {
  Settings,
  MessageCircle,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Calculator,
  MapPin,
  ListOrdered,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldHint } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingState } from '@/components/LoadingState';
import { toast } from 'sonner';
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
  VARIABLES_DESPACHO_GROUPS,
  formatVariable,
  plantillaToPreviewText,
  type VariableDespachoKey,
} from './VARIABLES_DESPACHO';
import { parseWhatsAppPreviewToReact } from './whatsappFormatPreview';
import { TarifaCalculadoraForm } from '@/pages/dashboard/tarifa-calculadora/TarifaCalculadoraForm';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import type { EstadoRastreo, EstadoRastreoRequest } from '@/types/estado-rastreo';
import { z } from 'zod';

type OpcionActiva =
  | 'mensaje-whatsapp-despacho'
  | 'mensaje-agencia-eeuu'
  | 'tarifa-calculadora'
  | 'estados-rastreo'
  | 'estados-rastreo-por-punto';

type PendingParametrosNav = OpcionActiva | 'menu';

const estadoRastreoFormSchema = z.object({
  codigo: z.string().trim().min(1, 'Código obligatorio'),
  nombre: z.string().trim().min(1, 'Nombre obligatorio'),
});

/** Secuencia de posiciones de tracking que aplicará el backend al guardar (cada base y sus alternos justo después). */
function buildEffectiveTrackingOrder(
  baseOrderIds: number[],
  estadoPorId: Map<number, EstadoRastreo>,
  alternoAfterById: Record<number, number>,
  alternosSorted: EstadoRastreo[]
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

function ParametrosHeader({
  icon,
  title,
  description,
  onBack,
  status,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onBack?: () => void;
  status?: { label: string; variant?: 'secondary' | 'outline' };
}) {
  return (
    <div className="flex items-center gap-3">
      {onBack ? (
        <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      ) : null}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
          {icon}
          {title}
          {status ? <Badge variant={status.variant ?? 'secondary'}>{status.label}</Badge> : null}
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">{description}</p>
      </div>
    </div>
  );
}

export function ParametrosSistemaPage() {
  const [vistaLista, setVistaLista] = useState(true);
  const [opcionActiva, setOpcionActiva] = useState<OpcionActiva>('mensaje-whatsapp-despacho');
  const [plantillaLocal, setPlantillaLocal] = useState('');
  const [mensajeAgenciaLocal, setMensajeAgenciaLocal] = useState('');
  const [opcionPendiente, setOpcionPendiente] = useState<PendingParametrosNav | null>(null);
  const [confirmarSalidaParametros, setConfirmarSalidaParametros] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { hasPermission, hasRole } = useAuthStore();

  const canSeeTarifaCalculadora =
    hasPermission('TARIFA_CALCULADORA_READ') || hasRole('ADMIN') || hasRole('OPERARIO');

  const canSeeEstadosRastreo =
    hasPermission('ESTADOS_RASTREO_READ') || hasRole('ADMIN') || hasRole('OPERARIO');

  const { data, isLoading, error } = useMensajeWhatsAppDespacho();
  const updateMutation = useUpdateMensajeWhatsAppDespacho();
  const {
    data: dataAgencia,
    isLoading: isLoadingAgencia,
    error: errorAgencia,
  } = useMensajeAgenciaEeuu();
  const updateAgenciaMutation = useUpdateMensajeAgenciaEeuu();

  useEffect(() => {
    if (data != null) {
      setPlantillaLocal(data.plantilla ?? '');
    }
  }, [data]);

  useEffect(() => {
    if (dataAgencia != null) {
      setMensajeAgenciaLocal(dataAgencia.mensaje ?? '');
    }
  }, [dataAgencia]);

  const insertVariableAtCursor = useCallback((variableKey: VariableDespachoKey) => {
    const text = formatVariable(variableKey);
    const ta = textareaRef.current;
    if (ta) {
      const hasFocus = document.activeElement === ta;
      const start = hasFocus ? ta.selectionStart : plantillaLocal.length;
      const end = hasFocus ? ta.selectionEnd : plantillaLocal.length;
      const before = plantillaLocal.slice(0, start);
      const after = plantillaLocal.slice(end);
      const next = before + text + after;
      setPlantillaLocal(next);
      requestAnimationFrame(() => {
        ta.focus();
        const newPos = start + text.length;
        ta.setSelectionRange(newPos, newPos);
      });
    } else {
      setPlantillaLocal((prev) => prev + text);
    }
  }, [plantillaLocal]);

  const handleGuardarWhatsapp = async () => {
    try {
      await updateMutation.mutateAsync({ plantilla: plantillaLocal });
      toast.success('Mensaje de despacho guardado');
    } catch {
      toast.error('Error al guardar el mensaje');
    }
  };

  const handleGuardarAgencia = async () => {
    try {
      await updateAgenciaMutation.mutateAsync({ mensaje: mensajeAgenciaLocal });
      toast.success('Mensaje de agencia USA guardado');
    } catch {
      toast.error('Error al guardar el mensaje');
    }
  };

  const plantillaOriginal = data?.plantilla ?? '';
  const plantillaPreviewPlain = plantillaToPreviewText(plantillaLocal);
  const mensajeAgenciaOriginal = dataAgencia?.mensaje ?? '';
  const whatsappDirty = opcionActiva === 'mensaje-whatsapp-despacho' && plantillaLocal !== plantillaOriginal;
  const agenciaDirty = opcionActiva === 'mensaje-agencia-eeuu' && mensajeAgenciaLocal !== mensajeAgenciaOriginal;
  const parametrosDirty = whatsappDirty || agenciaDirty;
  const tabs = [
    {
      key: 'mensaje-whatsapp-despacho',
      label: 'WhatsApp',
      description: 'Plantilla despacho WhatsApp',
      icon: <MessageCircle className="h-4 w-4" />,
      visible: true,
    },
    {
      key: 'mensaje-agencia-eeuu',
      label: 'Agencia USA',
      description: 'Dirección USA y horarios',
      icon: <MapPin className="h-4 w-4" />,
      visible: true,
    },
    {
      key: 'tarifa-calculadora',
      label: 'Tarifa',
      description: 'Tarifa calculadora pública',
      icon: <Calculator className="h-4 w-4" />,
      visible: canSeeTarifaCalculadora,
    },
    {
      key: 'estados-rastreo',
      label: 'Estados',
      description: 'Catálogo tracking',
      icon: <ListOrdered className="h-4 w-4" />,
      visible: canSeeEstadosRastreo,
    },
    {
      key: 'estados-rastreo-por-punto',
      label: 'Estados por punto',
      description: 'Hitos operativos',
      icon: <MapPin className="h-4 w-4" />,
      visible: canSeeEstadosRastreo,
    },
  ] satisfies Array<{
    key: OpcionActiva;
    label: string;
    description: string;
    icon: ReactNode;
    visible: boolean;
  }>;
  const visibleTabs = tabs.filter((tab) => tab.visible);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.key === opcionActiva) && visibleTabs[0]) {
      setOpcionActiva(visibleTabs[0].key);
    }
  }, [visibleTabs, opcionActiva]);

  const abrirModulo = (next: OpcionActiva) => {
    if (next === opcionActiva) {
      setVistaLista(false);
      return;
    }
    if (parametrosDirty) {
      setOpcionPendiente(next);
      setConfirmarSalidaParametros(true);
      return;
    }
    setOpcionActiva(next);
    setVistaLista(false);
  };

  const requestVolverLista = () => {
    if (parametrosDirty) {
      setOpcionPendiente('menu');
      setConfirmarSalidaParametros(true);
      return;
    }
    setVistaLista(true);
  };

  const tabActivaMeta = visibleTabs.find((t) => t.key === opcionActiva);

  return (
    <div className="space-y-6">
      {vistaLista ? (
        <>
          <header
            className={cn(
              'relative overflow-hidden rounded-2xl border border-[var(--color-border)]',
              'bg-gradient-to-br from-[var(--color-card)] via-[var(--color-card)] to-[var(--color-primary)]/[0.07]',
              'px-6 py-8 sm:px-8'
            )}
          >
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[var(--color-primary)]/[0.09] blur-3xl"
              aria-hidden
            />
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <div
                className={cn(
                  'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-primary)]/20',
                  'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                )}
              >
                <Settings className="h-7 w-7" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                  Configuración global
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-3xl">
                  Parámetros del sistema
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-muted-foreground)] sm:text-[15px]">
                  Elige un módulo para editar mensajes, tarifas o estados de rastreo. Los cambios aplican a todo el
                  sistema.
                </p>
              </div>
            </div>
          </header>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-foreground)]">Módulos disponibles</h2>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleTabs.map((tab) => (
                <li key={tab.key}>
                  <button
                    type="button"
                    onClick={() => abrirModulo(tab.key)}
                    className={cn(
                      'group flex w-full flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-left shadow-sm transition',
                      'hover:border-[var(--color-primary)]/35 hover:bg-[var(--color-muted)]/20 hover:shadow-md',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--color-primary)]',
                          'border border-[var(--color-border)] bg-[var(--color-background)]',
                          'group-hover:border-[var(--color-primary)]/25 group-hover:bg-[var(--color-primary)]/5',
                          '[&_svg]:h-5 [&_svg]:w-5'
                        )}
                      >
                        {tab.icon}
                      </div>
                      <ChevronRight
                        className="h-5 w-5 shrink-0 text-[var(--color-muted-foreground)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)]"
                        aria-hidden
                      />
                    </div>
                    <p className="mt-3 text-base font-semibold text-[var(--color-foreground)]">{tab.label}</p>
                    <p className="mt-1 text-sm leading-snug text-[var(--color-muted-foreground)]">{tab.description}</p>
                    <span className="mt-3 text-xs font-medium text-[var(--color-primary)] opacity-90 group-hover:opacity-100">
                      Configurar
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}

      {!vistaLista ? (
        <>
          <div className="flex flex-wrap items-center gap-2 gap-y-1">
            <Button
              type="button"
              variant="ghost"
              className="gap-2 pl-0 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              onClick={requestVolverLista}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al listado
            </Button>
            {tabActivaMeta ? (
              <span className="text-sm text-[var(--color-muted-foreground)]">
                <span className="font-medium text-[var(--color-foreground)]">{tabActivaMeta.label}</span>
                {' · '}
                {tabActivaMeta.description}
              </span>
            ) : null}
          </div>

          <section className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6">
        {opcionActiva === 'mensaje-whatsapp-despacho' && (
          <>
            {isLoading ? (
              <LoadingState text="Cargando configuración de WhatsApp..." />
            ) : error ? (
              <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
                Error al cargar la configuración de WhatsApp.
              </div>
            ) : (
              <>
                <ParametrosHeader
                  icon={<MessageCircle className="h-7 w-7" />}
                  title="Mensaje de despacho WhatsApp"
                  description="Edita la plantilla que se envía al cliente al despachar."
                  status={{
                    label: updateMutation.isPending
                      ? 'Guardando...'
                      : whatsappDirty
                        ? 'Cambios pendientes'
                        : 'Sin cambios',
                    variant: whatsappDirty ? 'outline' : 'secondary',
                  }}
                />
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <Field>
                      <Label htmlFor="plantilla">Plantilla del mensaje</Label>
                      <Textarea
                        ref={textareaRef}
                        id="plantilla"
                        value={plantillaLocal}
                        onChange={(e) => setPlantillaLocal(e.target.value)}
                        className="min-h-[200px]"
                        rows={8}
                        placeholder="Ej: Hola {{destinatarioNombre}}, tu envío {{numeroGuia}} está en camino..."
                      />
                      <FieldHint>Usa variables para personalizar el mensaje por despacho.</FieldHint>
                    </Field>
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-[var(--color-foreground)]">Variables rápidas</p>
                      <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-3">
                        {VARIABLES_DESPACHO_GROUPS.map((group) => (
                          <div key={group.category} className="space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                              {group.category}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {group.items.map(({ key, label }) => (
                                <Button
                                  key={key}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => insertVariableAtCursor(key)}
                                  title={`Insertar ${formatVariable(key)}`}
                                  className="h-7 rounded-full px-2.5 text-xs"
                                >
                                  {label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={handleGuardarWhatsapp} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                      </Button>
                      {whatsappDirty ? (
                        <Button type="button" variant="outline" onClick={() => setPlantillaLocal(plantillaOriginal)}>
                          Descartar
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[var(--color-foreground)]">
                      Vista previa (WhatsApp)
                    </p>
                    <FieldHint className="text-[11px] leading-snug">
                      Formato: <code className="rounded bg-[var(--color-muted)]/50 px-1">*negrita*</code>,{' '}
                      <code className="rounded bg-[var(--color-muted)]/50 px-1">_cursiva_</code>,{' '}
                      <code className="rounded bg-[var(--color-muted)]/50 px-1">~tachado~</code>,{' '}
                      <code className="rounded bg-[var(--color-muted)]/50 px-1">`código`</code>, bloques{' '}
                      <code className="rounded bg-[var(--color-muted)]/50 px-1">```varias líneas```</code>.
                    </FieldHint>
                    <div className="rounded-2xl bg-[var(--color-muted)]/30 p-4">
                      <div
                        className={cn(
                          'max-w-[90%] rounded-lg rounded-tl-none border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 shadow-sm'
                        )}
                      >
                        <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[var(--color-foreground)]">
                          {plantillaPreviewPlain.trim()
                            ? parseWhatsAppPreviewToReact(plantillaPreviewPlain)
                            : 'El mensaje se mostrará aquí con variables reemplazadas.'}
                        </div>
                        <p className="mt-1 text-right text-[11px] text-[var(--color-muted-foreground)]">Ahora</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {opcionActiva === 'mensaje-agencia-eeuu' && (
          <>
            {isLoadingAgencia ? (
              <LoadingState text="Cargando mensaje de agencia USA..." />
            ) : errorAgencia ? (
              <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
                Error al cargar el mensaje de agencia USA.
              </div>
            ) : (
              <>
                <ParametrosHeader
                  icon={<MapPin className="h-7 w-7" />}
                  title="Agencia en Estados Unidos"
                  description="Texto que ven los clientes en su panel y al registrar un paquete (dirección, horarios e instrucciones)."
                  status={{
                    label: updateAgenciaMutation.isPending
                      ? 'Guardando...'
                      : agenciaDirty
                        ? 'Cambios pendientes'
                        : 'Sin cambios',
                    variant: agenciaDirty ? 'outline' : 'secondary',
                  }}
                />
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4 min-w-0">
                    <Field>
                      <Label htmlFor="mensaje-agencia-eeuu">Mensaje</Label>
                      <Textarea
                        id="mensaje-agencia-eeuu"
                        value={mensajeAgenciaLocal}
                        onChange={(e) => setMensajeAgenciaLocal(e.target.value)}
                        className="min-h-[220px] font-sans"
                        rows={12}
                        placeholder={'Agencia de EEUU:\n\nDirección completa…\n\nHorarios e indicaciones…'}
                      />
                      <FieldHint>
                        Varias líneas. Puedes usar formato estilo WhatsApp: negrita, cursiva, tachado, código (ver
                        vista previa).
                      </FieldHint>
                    </Field>
                    <div className="flex items-center gap-2">
                      <Button onClick={handleGuardarAgencia} disabled={updateAgenciaMutation.isPending}>
                        {updateAgenciaMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                      </Button>
                      {agenciaDirty ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setMensajeAgenciaLocal(mensajeAgenciaOriginal)}
                        >
                          Descartar
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-foreground)]">Vista previa</p>
                    <FieldHint className="text-[11px] leading-snug">
                      Formato: <code className="rounded bg-[var(--color-muted)]/50 px-1">*negrita*</code>,{' '}
                      <code className="rounded bg-[var(--color-muted)]/50 px-1">_cursiva_</code>,{' '}
                      <code className="rounded bg-[var(--color-muted)]/50 px-1">~tachado~</code>,{' '}
                      <code className="rounded bg-[var(--color-muted)]/50 px-1">`código`</code>, bloques{' '}
                      <code className="rounded bg-[var(--color-muted)]/50 px-1">```varias líneas```</code>.
                    </FieldHint>
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-muted)]/25 p-4">
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 shadow-sm">
                        <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[var(--color-foreground)]">
                          {mensajeAgenciaLocal.trim()
                            ? parseWhatsAppPreviewToReact(mensajeAgenciaLocal)
                            : 'El texto se mostrará aquí como lo verá el cliente.'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {opcionActiva === 'tarifa-calculadora' && (
          <div className="space-y-5">
            <ParametrosHeader
              icon={<Calculator className="h-7 w-7" />}
              title="Tarifa calculadora"
              description="Define la tarifa por libra usada en la calculadora pública."
            />
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
              <TarifaCalculadoraForm />
            </div>
          </div>
        )}

        {opcionActiva === 'estados-rastreo' && <EstadosRastreoView />}

        {opcionActiva === 'estados-rastreo-por-punto' && <EstadosRastreoPorPuntoView />}
      </section>
        </>
      ) : null}

      <ConfirmDialog
        open={confirmarSalidaParametros}
        onOpenChange={(open) => !open && setConfirmarSalidaParametros(false)}
        title="Cambios sin guardar"
        description="Tienes cambios sin guardar en este módulo. ¿Deseas guardar antes de volver al listado o abrir otro módulo?"
        confirmLabel="Guardar y continuar"
        cancelLabel="Cancelar"
        onConfirm={async () => {
          try {
            if (opcionActiva === 'mensaje-whatsapp-despacho' && whatsappDirty) {
              await handleGuardarWhatsapp();
            }
            if (opcionActiva === 'mensaje-agencia-eeuu' && agenciaDirty) {
              await handleGuardarAgencia();
            }
            if (opcionPendiente === 'menu') {
              setVistaLista(true);
            } else if (opcionPendiente) {
              setOpcionActiva(opcionPendiente);
              setVistaLista(false);
            }
            setOpcionPendiente(null);
            setConfirmarSalidaParametros(false);
          } catch {
            throw new Error('Save before leave failed');
          }
        }}
        loading={updateMutation.isPending || updateAgenciaMutation.isPending}
      />
    </div>
  );
}

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
    Partial<
      Record<
        | 'codigo'
        | 'nombre',
        string
      >
    >
  >({});
  const leyendaTextareaRef = useRef<HTMLTextAreaElement>(null);
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
      .sort((a, b) => (a.ordenTracking ?? a.orden) - (b.ordenTracking ?? b.orden) || a.id - b.id);
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
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Error al crear');
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
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Error al actualizar');
    }
  };

  const handleDesactivar = async (id: number) => {
    try {
      await desactivarMutation.mutateAsync(id);
      toast.success('Estado desactivado');
    } catch (err) {
      toast.error('Error al desactivar');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Estado eliminado');
      setDeleteId(null);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'No se puede eliminar');
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

  const handleGuardarOrdenTracking = async () => {
    try {
      const alternosPayload = estadosAlternosOrdenados
        .filter((estado) => alternoAfterById[estado.id] != null)
        .map((estado) => ({
          estadoId: estado.id,
          afterEstadoId: alternoAfterById[estado.id],
        }));
      await reorderMutation.mutateAsync({ estadoIds: baseOrderIds, alternosAfter: alternosPayload });
      toast.success('Orden de tracking guardado');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'No se pudo guardar el orden de tracking');
    }
  };


  if (isLoading) return <LoadingState text="Cargando estados..." />;
  if (error)
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
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
    .sort((a, b) => (a.ordenTracking ?? a.orden) - (b.ordenTracking ?? b.orden) || a.id - b.id);
  const ordenBaseOriginal = estadosActivos
    .filter((e) => e.tipoFlujo !== 'ALTERNO')
    .sort((a, b) => (a.ordenTracking ?? a.orden) - (b.ordenTracking ?? b.orden) || a.id - b.id)
    .map((e) => e.id);
  const alternoAfterOriginal = Object.fromEntries(
    estadosAlternosOrdenados
      .filter((e) => e.afterEstadoId != null)
      .map((e) => [e.id, e.afterEstadoId as number])
  );
  const alternoDirty =
    Object.keys(alternoAfterOriginal).length !== Object.keys(alternoAfterById).length ||
    Object.entries(alternoAfterOriginal).some(([k, v]) => alternoAfterById[Number(k)] !== v);
  const trackingOrderDirty = !sameOrder(baseOrderIds, ordenBaseOriginal) || alternoDirty;
  const isDirty = creating || editing != null || trackingOrderDirty;
  const ordenEfectivoTracking = buildEffectiveTrackingOrder(
    baseOrderIds,
    estadoPorId,
    alternoAfterById,
    estadosAlternosOrdenados
  );
  return (
    <div className="space-y-6">
      <ParametrosHeader
        icon={<ListOrdered className="h-7 w-7" />}
        title="Estados de rastreo"
        description="Catálogo de estados por los que puede pasar un paquete. Define flujo normal o alterno, bloqueo y visibilidad en tracking; el orden público se arma con la sección de abajo (numeración base y «después de» para alternos)."
        status={{ label: isDirty ? 'Cambios pendientes' : 'Sin cambios', variant: isDirty ? 'outline' : 'secondary' }}
      />

      {canWrite && (
        <div className="flex gap-2">
          <Button onClick={() => setCreating(true)}>Nuevo estado</Button>
        </div>
      )}

      <section className="space-y-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Orden para tracking público</h3>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Flujo normal: numeración 1…n. Estados alternos: eligen un estado base «después del cual» aparecerán en la línea de tiempo (sin número propio en la tabla).
            </p>
          </div>
          <Button
            type="button"
            onClick={handleGuardarOrdenTracking}
            disabled={!canWrite || !trackingOrderDirty || reorderMutation.isPending}
          >
            {reorderMutation.isPending ? 'Guardando orden...' : 'Guardar orden tracking'}
          </Button>
        </div>

        <div className="space-y-2 rounded-lg border border-[var(--color-border)]/70 bg-[var(--color-background)]/40 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Flujo normal
          </h4>
          <div className="space-y-2">
            {estadosBaseOrdenados.map((estado, index) => (
              <div
                key={estado.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)]/80 px-3 py-2"
              >
                <div className="text-sm">
                  <span className="font-semibold text-[var(--color-foreground)]">{index + 1}.</span>{' '}
                  <span className="text-[var(--color-foreground)]">{estado.nombre}</span>{' '}
                  <span className="font-mono text-xs text-[var(--color-muted-foreground)]">({estado.codigo})</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => moveBaseOrder(estado.id, -1)}
                    disabled={!canWrite || index === 0}
                    aria-label={`Subir ${estado.nombre}`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => moveBaseOrder(estado.id, 1)}
                    disabled={!canWrite || index === estadosBaseOrdenados.length - 1}
                    aria-label={`Bajar ${estado.nombre}`}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {estadosAlternosOrdenados.length > 0 && (
          <div className="space-y-2 rounded-lg border border-[var(--color-border)]/70 bg-[var(--color-background)]/40 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Estados alternos
            </h4>
            {estadosAlternosOrdenados.map((estado) => (
              <div
                key={estado.id}
                className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)]/80 px-3 py-2 md:flex-row md:items-center md:justify-between"
              >
                <div className="text-sm">
                  <span className="text-[var(--color-foreground)]">{estado.nombre}</span>{' '}
                  <span className="font-mono text-xs text-[var(--color-muted-foreground)]">({estado.codigo})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-muted-foreground)]">Colocar después de</span>
                  <Select
                    value={alternoAfterById[estado.id] != null ? String(alternoAfterById[estado.id]) : ''}
                    onValueChange={(value) =>
                      setAlternoAfterById((prev) => ({ ...prev, [estado.id]: Number(value) }))
                    }
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Seleccionar estado base" />
                    </SelectTrigger>
                    <SelectContent>
                      {estadosBaseOrdenados.map((base, idx) => (
                        <SelectItem key={base.id} value={String(base.id)}>
                          {idx + 1}. {base.nombre} ({base.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}

        {ordenEfectivoTracking.length > 0 && (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/5 px-3 py-2">
            <p className="text-xs font-medium text-[var(--color-foreground)]">Orden efectivo en tracking (vista previa)</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
              {ordenEfectivoTracking.map((e, i) => (
                <span key={e.id}>
                  {i > 0 ? ' → ' : ''}
                  <span className="text-[var(--color-foreground)]">{i + 1}. {e.nombre}</span>
                  {e.tipoFlujo === 'ALTERNO' ? (
                    <span className="text-[var(--color-muted-foreground)]"> (alterno)</span>
                  ) : null}
                </span>
              ))}
            </p>
          </div>
        )}
      </section>

      <div className="surface-card overflow-x-auto p-0">
        <table className="compact-table min-w-[720px]">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Orden tracking</th>
              <th>Flujo</th>
              <th>Activo</th>
              {canWrite && <th className="text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {estados.map((e) => (
              <tr key={e.id}>
                <td className="font-mono">{e.codigo}</td>
                <td>{e.nombre}</td>
                <td>
                  {e.activo
                    ? e.tipoFlujo === 'ALTERNO'
                      ? '—'
                      : baseOrderIds.indexOf(e.id) + 1 || e.ordenTracking
                    : '—'}
                </td>
                <td>
                  <Badge variant={e.tipoFlujo === 'ALTERNO' ? 'destructive' : 'secondary'} className="font-normal">
                    {e.tipoFlujo === 'ALTERNO' ? 'Alterno' : 'Normal'}
                  </Badge>
                </td>
                <td>{e.activo ? 'Sí' : 'No'}</td>
                {canWrite && (
                  <td className="text-right">
                    <div className="flex items-center justify-end">
                      <RowActionsMenu
                        items={[
                          {
                            label: 'Editar',
                            onSelect: () => {
                              setEditing(e);
                              setForm({
                                codigo: e.codigo,
                                nombre: e.nombre,
                                ordenTracking: e.ordenTracking,
                                afterEstadoId: e.afterEstadoId ?? null,
                                activo: e.activo,
                                leyenda: e.leyenda ?? '',
                                tipoFlujo: e.tipoFlujo === 'ALTERNO' ? 'ALTERNO' : 'NORMAL',
                                publicoTracking: e.publicoTracking ?? true,
                              });
                            },
                          },
                          ...(e.activo ? [{ label: 'Desactivar', onSelect: () => setDesactivarId(e.id) }] : []),
                          { label: 'Eliminar', destructive: true, onSelect: () => setDeleteId(e.id) },
                        ]}
                      />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={creating || editing != null}
        onOpenChange={(open) => {
          if (open) return;
          setCreating(false);
          setEditing(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{creating ? 'Nuevo estado de rastreo' : 'Editar estado de rastreo'}</DialogTitle>
            <DialogDescription>
              Configura datos básicos, mensaje de seguimiento y reglas de retiro.
            </DialogDescription>
          </DialogHeader>

          <section className="space-y-4 rounded-xl border border-[var(--color-border)]/70 p-4">
            <h4 className="text-sm font-semibold text-[var(--color-foreground)]">Datos del estado</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <Label htmlFor="estado-codigo">Código</Label>
                <Input
                  id="estado-codigo"
                  type="text"
                  value={form.codigo}
                  onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                  placeholder="REGISTRADO"
                />
                {formErrors.codigo ? <FieldHint className="text-[var(--color-destructive)]">{formErrors.codigo}</FieldHint> : null}
              </Field>
              <Field>
                <Label htmlFor="estado-nombre">Nombre</Label>
                <Input
                  id="estado-nombre"
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Registrado"
                />
                {formErrors.nombre ? <FieldHint className="text-[var(--color-destructive)]">{formErrors.nombre}</FieldHint> : null}
              </Field>
            </div>
            <Field>
                    <FieldHint>El orden del tracking público se gestiona en la sección «Orden para tracking público».</FieldHint>
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <Label htmlFor="estado-tipo-flujo">Tipo de flujo</Label>
                <Select
                  value={form.tipoFlujo ?? 'NORMAL'}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, tipoFlujo: value as 'NORMAL' | 'ALTERNO' }))
                  }
                >
                  <SelectTrigger id="estado-tipo-flujo">
                    <SelectValue placeholder="Seleccionar flujo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="ALTERNO">Alterno</SelectItem>
                  </SelectContent>
                </Select>
                <FieldHint>
                  Normal: ruta principal del envío. Alterno: incidencia o desvío; el paquete se marca en flujo alterno y puede mostrarse una nota al cambiar de estado.
                </FieldHint>
              </Field>
              <Field className="rounded-lg border border-[var(--color-border)] p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="estado-publico-tracking">Visible en tracking</Label>
                    <FieldHint>Si está activo, el cliente verá este estado.</FieldHint>
                  </div>
                  <Switch
                    id="estado-publico-tracking"
                    checked={form.publicoTracking ?? true}
                    onCheckedChange={(checked) => setForm((f) => ({ ...f, publicoTracking: Boolean(checked) }))}
                  />
                </div>
              </Field>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-[var(--color-border)]/70 p-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-[var(--color-foreground)]">Mensajería y leyenda</h4>
              <FieldHint>
                Activa mensajes por tipo de envío solo cuando necesitas instrucciones distintas para cada caso.
              </FieldHint>
            </div>

            <Field className="space-y-3">
              <Label htmlFor="leyenda-general">Nota del estado</Label>
              <Textarea
                id="leyenda-general"
                ref={leyendaTextareaRef}
                value={form.leyenda ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, leyenda: e.target.value || undefined }))}
                className="min-h-[84px]"
                placeholder="Ej: Paquete retenido temporalmente por revisión documental."
                rows={3}
              />
              <FieldHint>
                Esta nota se muestra como texto simple del estado. No se usan variables dinámicas.
              </FieldHint>
            </Field>
          </section>

          <section className="space-y-2 rounded-xl border border-[var(--color-border)]/70 p-4">
            <h4 className="text-sm font-semibold text-[var(--color-foreground)]">Cuenta regresiva de retiro</h4>
            <FieldHint>
              La cuenta regresiva de retiro se configura en Agencia, Agencia distribuidor y Distribuidor. Aquí solo se definen el mensaje y el comportamiento del estado.
            </FieldHint>
          </section>

          <DialogFooter>
            <Button
              onClick={creating ? handleSaveCreate : handleSaveEdit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? creating
                  ? 'Creando...'
                  : 'Guardando...'
                : creating
                  ? 'Crear'
                  : 'Guardar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              Cancelar
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
          if (deleteId != null) {
            return handleDelete(deleteId);
          }
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
          if (desactivarId != null) {
            return handleDesactivar(desactivarId);
          }
        }}
        variant="destructive"
        loading={desactivarMutation.isPending}
      />
    </div>
  );
}

function EstadosRastreoPorPuntoView() {
  const { data: config, isLoading, error } = useEstadosRastreoPorPunto();
  const { data: estados = [] } = useEstadosRastreoActivos();
  const updateMutation = useUpdateEstadosRastreoPorPunto();
  const [registroId, setRegistroId] = useState<number | ''>('');
  const [enLoteId, setEnLoteId] = useState<number | ''>('');
  const [enDespachoId, setEnDespachoId] = useState<number | ''>('');
  const [enTransitoId, setEnTransitoId] = useState<number | ''>('');

  useEffect(() => {
    if (config) {
      setRegistroId(config.estadoRastreoRegistroPaqueteId ?? '');
      setEnLoteId(config.estadoRastreoEnLoteRecepcionId ?? '');
      setEnDespachoId(config.estadoRastreoEnDespachoId ?? '');
      setEnTransitoId(config.estadoRastreoEnTransitoId ?? '');
    }
  }, [config]);

  const isDirty =
    config != null &&
    (registroId !== (config.estadoRastreoRegistroPaqueteId ?? '') ||
      enLoteId !== (config.estadoRastreoEnLoteRecepcionId ?? '') ||
      enDespachoId !== (config.estadoRastreoEnDespachoId ?? '') ||
      enTransitoId !== (config.estadoRastreoEnTransitoId ?? ''));

  const handleGuardar = async () => {
    if (
      registroId === '' ||
      enLoteId === '' ||
      enDespachoId === '' ||
      enTransitoId === ''
    ) {
      toast.error('Seleccione los cuatro estados');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        estadoRastreoRegistroPaqueteId: Number(registroId),
        estadoRastreoEnLoteRecepcionId: Number(enLoteId),
        estadoRastreoEnDespachoId: Number(enDespachoId),
        estadoRastreoEnTransitoId: Number(enTransitoId),
      });
      toast.success('Configuración guardada');
    } catch {
      toast.error('Error al guardar');
    }
  };

  if (isLoading) return <LoadingState text="Cargando configuración..." />;
  if (error)
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        Error al cargar la configuración.
      </div>
    );

  return (
    <div className="space-y-6">
      <ParametrosHeader
        icon={<MapPin className="h-7 w-7" />}
        title="Estados de rastreo por punto"
        description="Elija qué estado se asigna al registrar paquete, al incluir en lote de recepción, cuando está en despacho y en tránsito."
        status={{ label: isDirty ? 'Cambios pendientes' : 'Sin cambios', variant: isDirty ? 'outline' : 'secondary' }}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Field className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
          <Label className="mb-1 block">Estado al registrar paquete</Label>
          <Select
            value={registroId === '' ? '' : String(registroId)}
            onValueChange={(v) => setRegistroId(v === '' ? '' : Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione" />
            </SelectTrigger>
            <SelectContent>
              {estados.map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>
                  {e.nombre} ({e.codigo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldHint>Estado inicial cuando el paquete se registra.</FieldHint>
        </Field>
        <Field className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
          <Label className="mb-1 block">Estado al registrar en lote de recepción</Label>
          <Select
            value={enLoteId === '' ? '' : String(enLoteId)}
            onValueChange={(v) => setEnLoteId(v === '' ? '' : Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione" />
            </SelectTrigger>
            <SelectContent>
              {estados.map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>
                  {e.nombre} ({e.codigo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldHint>Se aplica al ingresar una guía desde lote de recepción.</FieldHint>
        </Field>
        <Field className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
          <Label className="mb-1 block">Estado cuando está en despacho</Label>
          <Select
            value={enDespachoId === '' ? '' : String(enDespachoId)}
            onValueChange={(v) => setEnDespachoId(v === '' ? '' : Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione" />
            </SelectTrigger>
            <SelectContent>
              {estados.map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>
                  {e.nombre} ({e.codigo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldHint>Se usa al asociar paquetes a despacho.</FieldHint>
        </Field>
        <Field className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
          <Label className="mb-1 block">Estado en tránsito</Label>
          <Select
            value={enTransitoId === '' ? '' : String(enTransitoId)}
            onValueChange={(v) => setEnTransitoId(v === '' ? '' : Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione" />
            </SelectTrigger>
            <SelectContent>
              {estados.map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>
                  {e.nombre} ({e.codigo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldHint>También se usa en aplicar estado por periodo.</FieldHint>
        </Field>
      </div>
      <div className="flex items-center justify-end">
        <Button
          onClick={handleGuardar}
          disabled={
            updateMutation.isPending ||
            registroId === '' ||
            enLoteId === '' ||
            enDespachoId === '' ||
            enTransitoId === ''
          }
        >
          {updateMutation.isPending ? 'Guardando...' : 'Guardar configuración'}
        </Button>
      </div>
    </div>
  );
}
