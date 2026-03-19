import { useEffect, useRef, useCallback, useState, type ReactNode } from 'react';
import { Settings, MessageCircle, ArrowLeft, ArrowDown, ArrowUp, Calculator, MapPin, ListOrdered } from 'lucide-react';
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
  useTransicionesEstadoRastreo,
  useReplaceTransicionesEstadoRastreo,
} from '@/hooks/useEstadosRastreo';
import {
  VARIABLES_DESPACHO,
  formatVariable,
  plantillaToPreviewText,
  type VariableDespachoKey,
} from './VARIABLES_DESPACHO';
import { TarifaCalculadoraForm } from '@/pages/dashboard/tarifa-calculadora/TarifaCalculadoraForm';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import type { EstadoRastreo, EstadoRastreoRequest, EstadoRastreoTransicionUpsertItem } from '@/types/estado-rastreo';
import { z } from 'zod';

type OpcionActiva =
  | 'mensaje-whatsapp-despacho'
  | 'tarifa-calculadora'
  | 'estados-rastreo'
  | 'estados-rastreo-por-punto';

const estadoRastreoFormSchema = z.object({
  codigo: z.string().trim().min(1, 'Código obligatorio'),
  nombre: z.string().trim().min(1, 'Nombre obligatorio'),
});

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
  const [opcionActiva, setOpcionActiva] = useState<OpcionActiva>('mensaje-whatsapp-despacho');
  const [plantillaLocal, setPlantillaLocal] = useState('');
  const [opcionPendiente, setOpcionPendiente] = useState<OpcionActiva | null>(null);
  const [confirmarSalidaWhatsapp, setConfirmarSalidaWhatsapp] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { hasPermission, hasRole } = useAuthStore();

  const canSeeTarifaCalculadora =
    hasPermission('TARIFA_CALCULADORA_READ') || hasRole('ADMIN') || hasRole('OPERARIO');

  const canSeeEstadosRastreo =
    hasPermission('ESTADOS_RASTREO_READ') || hasRole('ADMIN') || hasRole('OPERARIO');

  const { data, isLoading, error } = useMensajeWhatsAppDespacho();
  const updateMutation = useUpdateMensajeWhatsAppDespacho();

  useEffect(() => {
    if (data != null) {
      setPlantillaLocal(data.plantilla ?? '');
    }
  }, [data]);

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

  const handleGuardar = async () => {
    try {
      await updateMutation.mutateAsync({ plantilla: plantillaLocal });
      toast.success('Mensaje de despacho guardado');
    } catch {
      toast.error('Error al guardar el mensaje');
    }
  };

  const plantillaOriginal = data?.plantilla ?? '';
  const whatsappDirty = opcionActiva === 'mensaje-whatsapp-despacho' && plantillaLocal !== plantillaOriginal;
  const tabs = [
    {
      key: 'mensaje-whatsapp-despacho',
      label: 'WhatsApp',
      description: 'Plantilla del mensaje de despacho',
      icon: <MessageCircle className="h-4 w-4" />,
      visible: true,
    },
    {
      key: 'tarifa-calculadora',
      label: 'Tarifa',
      description: 'Tarifa pública de calculadora',
      icon: <Calculator className="h-4 w-4" />,
      visible: canSeeTarifaCalculadora,
    },
    {
      key: 'estados-rastreo',
      label: 'Estados',
      description: 'Catálogo y orden de tracking',
      icon: <ListOrdered className="h-4 w-4" />,
      visible: canSeeEstadosRastreo,
    },
    {
      key: 'estados-rastreo-por-punto',
      label: 'Estados por punto',
      description: 'Asignación por hitos operativos',
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

  const requestNavigate = (next: OpcionActiva) => {
    if (next === opcionActiva) return;
    if (whatsappDirty) {
      setOpcionPendiente(next);
      setConfirmarSalidaWhatsapp(true);
      return;
    }
    setOpcionActiva(next);
  };

  return (
    <div className="space-y-6">
      <ParametrosHeader
        icon={<Settings className="h-7 w-7" />}
        title="Parámetros del sistema"
        description="Configura todos los módulos del sistema desde un único espacio de trabajo."
      />

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-2">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {visibleTabs.map((tab) => {
            const active = opcionActiva === tab.key;
            return (
              <Button
                key={tab.key}
                type="button"
                variant="ghost"
                onClick={() => requestNavigate(tab.key)}
                className={cn(
                  'h-auto rounded-xl border px-3 py-3 text-left transition items-start justify-start',
                  active
                    ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10'
                    : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-secondary)]/50'
                )}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
                  {tab.icon}
                  {tab.label}
                </div>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{tab.description}</p>
              </Button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
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
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-[var(--color-foreground)]">Variables rápidas</p>
                      <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-3">
                        {VARIABLES_DESPACHO.map(({ key, label }) => (
                          <Button
                            key={key}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => insertVariableAtCursor(key)}
                            title={`Insertar ${formatVariable(key)}`}
                            className={cn(
                              'h-7 rounded-full px-2.5 text-xs'
                            )}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={handleGuardar} disabled={updateMutation.isPending}>
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
                    <div className="rounded-2xl bg-[var(--color-muted)]/30 p-4">
                      <div
                        className={cn(
                          'max-w-[90%] rounded-lg rounded-tl-none border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 shadow-sm'
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[var(--color-foreground)]">
                          {plantillaToPreviewText(plantillaLocal) ||
                            'El mensaje se mostrará aquí con variables reemplazadas.'}
                        </p>
                        <p className="mt-1 text-right text-[11px] text-[var(--color-muted-foreground)]">Ahora</p>
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

      <ConfirmDialog
        open={confirmarSalidaWhatsapp}
        onOpenChange={(open) => !open && setConfirmarSalidaWhatsapp(false)}
        title="Cambios sin guardar"
        description="Tienes cambios sin guardar en la plantilla WhatsApp. ¿Deseas guardar antes de cambiar de módulo?"
        confirmLabel="Guardar y cambiar"
        cancelLabel="Cancelar"
        onConfirm={async () => {
          try {
            await handleGuardar();
            if (opcionPendiente) {
              setOpcionActiva(opcionPendiente);
            }
            setOpcionPendiente(null);
            setConfirmarSalidaWhatsapp(false);
          } catch {
            throw new Error('Save before leave failed');
          }
        }}
        loading={updateMutation.isPending}
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
    bloqueante: false,
    publicoTracking: true,
  });
  const [origenTransiciones, setOrigenTransiciones] = useState<EstadoRastreo | null>(null);
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
        bloqueante: false,
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
  return (
    <div className="space-y-6">
      <ParametrosHeader
        icon={<ListOrdered className="h-7 w-7" />}
        title="Estados de rastreo"
        description="Catálogo de estados por los que puede pasar un paquete. Crea y edita estados; en cada uno configura las transiciones (a qué estados se puede pasar) y si es de flujo normal o alterno."
        status={{ label: isDirty ? 'Cambios pendientes' : 'Sin cambios', variant: isDirty ? 'outline' : 'secondary' }}
      />

      {canWrite && (
        <div className="flex gap-2">
          <Button onClick={() => setCreating(true)}>Nuevo estado</Button>
        </div>
      )}

      <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Orden global para tracking público</h3>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Se numera solo el flujo base. Los alternos se colocan por regla “después de”.
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
        {estadosAlternosOrdenados.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Estados alternos (sin numeración)
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
      </section>

      <div className="surface-card overflow-x-auto p-0">
        <table className="compact-table min-w-[860px]">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Orden tracking</th>
              <th>Flujo</th>
              <th>Bloqueante</th>
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
                  <Badge variant={e.tipoFlujo === 'ALTERNO' ? 'destructive' : e.tipoFlujo === 'MIXTO' ? 'outline' : 'secondary'} className="font-normal">
                    {e.tipoFlujo === 'ALTERNO' ? 'Alterno' : e.tipoFlujo === 'MIXTO' ? 'Mixto' : 'Normal'}
                  </Badge>
                </td>
                <td>{e.bloqueante ? 'Sí' : 'No'}</td>
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
                                tipoFlujo: e.tipoFlujo ?? 'NORMAL',
                                bloqueante: e.bloqueante ?? false,
                                publicoTracking: e.publicoTracking ?? true,
                              });
                            },
                          },
                          {
                            label: 'Transiciones',
                            onSelect: () => setOrigenTransiciones(e),
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
              <FieldHint>El orden del tracking público se gestiona en la sección “Orden global para tracking público”.</FieldHint>
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field>
                <Label htmlFor="estado-tipo-flujo">Tipo de flujo</Label>
                <Select
                  value={form.tipoFlujo ?? 'NORMAL'}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, tipoFlujo: value as 'NORMAL' | 'ALTERNO' | 'MIXTO' }))
                  }
                >
                  <SelectTrigger id="estado-tipo-flujo">
                    <SelectValue placeholder="Seleccionar flujo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="ALTERNO">Alterno</SelectItem>
                    <SelectItem value="MIXTO">Mixto</SelectItem>
                  </SelectContent>
                </Select>
                <FieldHint>
                  Normal: ruta habitual (registrado → en lote → despacho → tránsito → entregado). Alterno: incidencia o desvío (ej. retenido en aduana); el paquete queda en flujo alterno hasta resolución. Mixto: puede usarse en ruta normal o en incidencias.
                </FieldHint>
              </Field>
              <Field className="rounded-lg border border-[var(--color-border)] p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="estado-bloqueante">Estado bloqueante</Label>
                    <FieldHint>El paquete quedará bloqueado hasta que se libere la incidencia o se cambie a un estado marcado como resolución.</FieldHint>
                  </div>
                  <Switch
                    id="estado-bloqueante"
                    checked={form.bloqueante ?? false}
                    onCheckedChange={(checked) => setForm((f) => ({ ...f, bloqueante: Boolean(checked) }))}
                  />
                </div>
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

      <TransicionesEstadoDialog
        open={origenTransiciones != null}
        onOpenChange={(open) => {
          if (!open) setOrigenTransiciones(null);
        }}
        origen={origenTransiciones}
        estados={estados}
      />

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

function TransicionesEstadoDialog({
  open,
  onOpenChange,
  origen,
  estados,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  origen: EstadoRastreo | null;
  estados: EstadoRastreo[];
}) {
  const origenId = origen?.id;
  const { data: existentes = [], isLoading } = useTransicionesEstadoRastreo(origenId);
  const replaceMutation = useReplaceTransicionesEstadoRastreo();
  const [items, setItems] = useState<Record<number, { activo: boolean; requiereResolucion: boolean }>>({});

  function sameItems(
    a: Record<number, { activo: boolean; requiereResolucion: boolean }>,
    b: Record<number, { activo: boolean; requiereResolucion: boolean }>
  ) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      const aItem = a[Number(key)];
      const bItem = b[Number(key)];
      if (!bItem) return false;
      if (aItem.activo !== bItem.activo || aItem.requiereResolucion !== bItem.requiereResolucion) {
        return false;
      }
    }
    return true;
  }

  useEffect(() => {
    if (!open || !origen) return;
    const base: Record<number, { activo: boolean; requiereResolucion: boolean }> = {};
    for (const estado of estados) {
      if (estado.id === origen.id) continue;
      base[estado.id] = { activo: false, requiereResolucion: false };
    }
    for (const t of existentes) {
      base[t.estadoDestinoId] = {
        activo: t.activo,
        requiereResolucion: t.requiereResolucion,
      };
    }
    setItems((prev) => {
      const shouldUpdate = !sameItems(prev, base);
      return shouldUpdate ? base : prev;
    });
  }, [open, origen, estados, existentes]);

  const handleSave = async () => {
    if (!origen) return;
    const payload: EstadoRastreoTransicionUpsertItem[] = Object.entries(items).map(([destId, value]) => ({
      estadoDestinoId: Number(destId),
      activo: value.activo,
      requiereResolucion: value.requiereResolucion,
    }));
    try {
      await replaceMutation.mutateAsync({ estadoOrigenId: origen.id, transiciones: payload });
      toast.success('Transiciones guardadas');
      onOpenChange(false);
    } catch {
      toast.error('No se pudieron guardar las transiciones');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transiciones permitidas</DialogTitle>
          <DialogDescription>
            Estado origen: <strong>{origen?.nombre ?? '—'}</strong>. Desde este estado, el operario solo podrá cambiar los paquetes a los estados que marques aquí.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <LoadingState text="Cargando transiciones..." />
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Marca «Se puede cambiar a este estado» para permitir el paso desde el origen. Marca «Cuenta como resolución de incidencia» en los estados a los que se puede salir cuando un paquete está bloqueado (o usar Liberar incidencia).
            </p>
            {estados
              .filter((e) => e.id !== origenId)
              .map((estado) => {
                const current = items[estado.id] ?? { activo: false, requiereResolucion: false };
                return (
                  <div
                    key={estado.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-lg border border-[var(--color-border)] p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--color-foreground)]">
                        {estado.nombre} ({estado.codigo})
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`trans-activa-${estado.id}`}
                          checked={current.activo}
                          onCheckedChange={(checked) =>
                            setItems((prev) => ({
                              ...prev,
                              [estado.id]: {
                                ...current,
                                activo: Boolean(checked),
                                requiereResolucion: Boolean(checked) ? current.requiereResolucion : false,
                              },
                            }))
                          }
                        />
                        <label htmlFor={`trans-activa-${estado.id}`} className="text-xs text-[var(--color-foreground)] cursor-pointer">
                          Se puede cambiar a este estado
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`trans-resolucion-${estado.id}`}
                          checked={current.requiereResolucion}
                          disabled={!current.activo}
                          onCheckedChange={(checked) =>
                            setItems((prev) => ({
                              ...prev,
                              [estado.id]: {
                                ...current,
                                requiereResolucion: Boolean(checked),
                              },
                            }))
                          }
                        />
                        <label htmlFor={`trans-resolucion-${estado.id}`} className="text-xs text-[var(--color-foreground)] cursor-pointer">
                          Cuenta como resolución de incidencia
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={replaceMutation.isPending}>
            {replaceMutation.isPending ? 'Guardando...' : 'Guardar transiciones'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
