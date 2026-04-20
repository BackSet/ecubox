import { useEffect, useMemo, useState } from 'react';
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
import { useCreatePaquete, useUpdatePaquete } from '@/hooks/usePaquetes';
import { sugerirRef } from '@/lib/api/paquetes.service';
import { onKeyDownNumericDecimal, sanitizeNumericDecimal } from '@/lib/inputFilters';
import { lbsToKg, kgToLbs } from '@/lib/utils/weight';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { Loader2, UserRound, Phone, MapPin, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useGuiasMaster } from '@/hooks/useGuiasMaster';
import type { Paquete } from '@/types/paquete';

const optionalNumber = z
  .union([z.number(), z.nan()])
  .optional()
  .transform((val) => (typeof val === 'number' && Number.isNaN(val) ? undefined : val));

const formSchema = z.object({
  guiaMasterId: z
    .union([z.number(), z.nan()])
    .optional()
    .transform((v) => (typeof v === 'number' && Number.isNaN(v) ? undefined : v))
    .refine((n) => n != null && n > 0, { message: 'Selecciona una guía' }),
  contenido: z.string().min(1, 'El contenido es obligatorio'),
  pesoLbs: optionalNumber,
  pesoKg: optionalNumber,
  ref: z.string().optional(),
});

type FormValues = z.input<typeof formSchema>;

interface PaqueteFormProps {
  paquete?: Paquete | null;
  /**
   * Permite preseleccionar la guía master al abrir el formulario en modo
   * "crear". Útil para flujos donde el operario decide registrar una pieza
   * faltante desde otro contexto (por ejemplo, tras editar el total de
   * piezas esperadas de una guía).
   */
  guiaMasterIdInicial?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaqueteForm({
  paquete,
  guiaMasterIdInicial,
  onClose,
  onSuccess,
}: PaqueteFormProps) {
  const hasPesoWrite = useAuthStore((s) => s.hasPermission('PAQUETES_PESO_WRITE'));
  const isEdit = paquete != null;

  const createMutation = useCreatePaquete();
  const updateMutation = useUpdatePaquete();
  const { data: guiasMaster = [] } = useGuiasMaster();

  const [generatingRef, setGeneratingRef] = useState(false);
  const [pesoLbsInput, setPesoLbsInput] = useState('');
  const [pesoKgInput, setPesoKgInput] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guiaMasterId: paquete?.guiaMasterId ?? guiaMasterIdInicial,
      contenido: paquete?.contenido ?? '',
      pesoLbs: paquete?.pesoLbs != null ? Number(paquete.pesoLbs) : undefined,
      pesoKg: paquete?.pesoKg != null ? Number(paquete.pesoKg) : undefined,
      ref: paquete?.ref ?? '',
    },
  });

  // Solo guías con destinatario asignado pueden recibir paquetes nuevos.
  const guiasSeleccionables = useMemo(
    () => guiasMaster.filter((gm) => gm.destinatarioFinalId != null),
    [guiasMaster]
  );

  const guiaMasterId = form.watch('guiaMasterId');
  const guiaSeleccionada = useMemo(
    () => guiasMaster.find((gm) => gm.id === guiaMasterId) ?? null,
    [guiasMaster, guiaMasterId]
  );

  const destinatarioId = guiaSeleccionada?.destinatarioFinalId ?? paquete?.destinatarioFinalId ?? null;
  const destinatarioNombre = guiaSeleccionada?.destinatarioNombre ?? paquete?.destinatarioNombre ?? null;

  useEffect(() => {
    if (paquete) {
      setPesoLbsInput(paquete.pesoLbs != null ? String(paquete.pesoLbs) : '');
      setPesoKgInput(paquete.pesoKg != null ? String(paquete.pesoKg) : '');
    } else {
      setPesoLbsInput('');
      setPesoKgInput('');
    }
  }, [paquete]);

  async function handleGenerarRef() {
    if (destinatarioId == null) {
      toast.error('Selecciona una guía con destinatario para generar la referencia');
      return;
    }
    setGeneratingRef(true);
    try {
      const data = await sugerirRef(destinatarioId, isEdit && paquete ? paquete.id : undefined);
      form.setValue('ref', data.ref);
    } catch {
      toast.error('No se pudo generar la referencia');
    } finally {
      setGeneratingRef(false);
    }
  }

  async function onSubmit(values: FormValues) {
    const guiaId =
      typeof values.guiaMasterId === 'number' && !Number.isNaN(values.guiaMasterId)
        ? values.guiaMasterId
        : undefined;
    if (guiaId == null) {
      form.setError('guiaMasterId', { message: 'Selecciona una guía' });
      toast.error('Selecciona una guía para continuar');
      return;
    }
    const guia = guiasMaster.find((gm) => gm.id === guiaId);
    const destinatarioFinalId = guia?.destinatarioFinalId ?? paquete?.destinatarioFinalId ?? null;
    if (destinatarioFinalId == null) {
      form.setError('guiaMasterId', {
        message: 'La guía seleccionada no tiene destinatario asignado',
      });
      toast.error('La guía seleccionada no tiene destinatario asignado');
      return;
    }
    try {
      if (isEdit && paquete) {
        const body: {
          destinatarioFinalId: number;
          contenido?: string;
          pesoLbs?: number;
          pesoKg?: number;
          guiaMasterId?: number;
          ref?: string;
        } = {
          destinatarioFinalId,
          contenido: values.contenido?.trim() || undefined,
          guiaMasterId: guiaId,
        };
        if (hasPesoWrite) {
          const lbs = values.pesoLbs;
          const kg = values.pesoKg;
          if (typeof lbs === 'number' && !Number.isNaN(lbs)) body.pesoLbs = lbs;
          if (typeof kg === 'number' && !Number.isNaN(kg)) body.pesoKg = kg;
          // Solo enviar el ref si el usuario lo modifico explicitamente
          // (p.ej. via "generar nuevo ref"). Si reenviamos el ref viejo
          // por defecto, machacamos el ref que el backend regenera al
          // cambiar de destinatario y rompemos la consistencia
          // ref<->destinatario.
          const refOriginal = (paquete?.ref ?? '').trim();
          const refActual = values.ref?.trim() ?? '';
          if (refActual && refActual !== refOriginal) {
            body.ref = refActual;
          }
        }
        await updateMutation.mutateAsync({
          id: paquete.id,
          body,
        });
        toast.success('Paquete actualizado correctamente');
      } else {
        const createBody: {
          destinatarioFinalId: number;
          contenido?: string;
          pesoLbs?: number;
          pesoKg?: number;
          guiaMasterId?: number;
        } = {
          destinatarioFinalId,
          contenido: values.contenido?.trim() || undefined,
          guiaMasterId: guiaId,
        };
        if (hasPesoWrite) {
          const lbs = values.pesoLbs;
          const kg = values.pesoKg;
          if (typeof lbs === 'number' && !Number.isNaN(lbs)) createBody.pesoLbs = lbs;
          if (typeof kg === 'number' && !Number.isNaN(kg)) createBody.pesoKg = kg;
        }
        await createMutation.mutateAsync(createBody);
        toast.success('Paquete registrado correctamente');
      }
      onSuccess();
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      const status = res?.status;
      const message = res?.data?.message ?? '';
      if (status === 409) {
        if (message.includes('referencia')) {
          toast.error('Ya existe otro paquete con esa referencia');
          form.setError('ref', { message: 'Esta referencia ya está en uso' });
        } else {
          toast.error(message?.trim() || 'Conflicto al guardar el paquete');
        }
      } else {
        const fallback = isEdit ? 'Error al actualizar el paquete' : 'Error al registrar el paquete';
        toast.error(message?.trim() || fallback);
        if (status === 400 && message?.toLowerCase().includes('contenido')) {
          form.setError('contenido', { message: 'El contenido es obligatorio' });
        }
      }
    }
  }

  const loading = createMutation.isPending || updateMutation.isPending;
  const sinGuiasDisponibles = !isEdit && guiasSeleccionables.length === 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar paquete' : 'Registrar paquete'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {isEdit ? (
            <GuiaInfoReadonly
              paquete={paquete}
              trackingBaseFallback={guiaSeleccionada?.trackingBase}
              destinatarioNombreFallback={guiaSeleccionada?.destinatarioNombre ?? null}
              guiaMasterId={guiaMasterId ?? paquete?.guiaMasterId}
            />
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                Guía *
              </label>
              <select
                className="input-clean w-full"
                value={form.watch('guiaMasterId') ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  form.setValue(
                    'guiaMasterId',
                    v === '' ? undefined : Number(v),
                    { shouldDirty: true, shouldValidate: true }
                  );
                }}
                disabled={sinGuiasDisponibles || guiaMasterIdInicial != null}
              >
                <option value="">— Selecciona una guía —</option>
                {guiasSeleccionables.map((gm) => (
                  <option key={gm.id} value={gm.id}>
                    {gm.trackingBase}
                    {gm.totalPiezasEsperadas
                      ? ` (${gm.piezasRegistradas ?? 0}/${gm.totalPiezasEsperadas})`
                      : ` (${gm.piezasRegistradas ?? 0})`}
                    {gm.destinatarioNombre ? ` — ${gm.destinatarioNombre}` : ''}
                  </option>
                ))}
              </select>
              {form.formState.errors.guiaMasterId && (
                <p className="mt-1 text-sm text-[var(--color-destructive)]">
                  {form.formState.errors.guiaMasterId.message}
                </p>
              )}
              {sinGuiasDisponibles && (
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  No hay guías con destinatario asignado. Crea o asigna un destinatario en la guía antes de registrar paquetes.
                </p>
              )}
              {destinatarioNombre && (
                <div className="mt-2 flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-2 text-sm">
                  <UserRound className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--color-muted-foreground)]">Destinatario</p>
                    <p className="truncate font-medium text-[var(--color-foreground)]">
                      {destinatarioNombre}
                    </p>
                  </div>
                </div>
              )}
              {guiaMasterId != null && (
                <a
                  href={`/guias-master/${guiaMasterId}`}
                  className="mt-2 inline-block text-xs text-primary hover:underline"
                >
                  Ver detalle de la guía →
                </a>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              Contenido *
            </label>
            <Input
              {...form.register('contenido')}
              variant="clean"
              className="input-clean"
              placeholder="Descripción del contenido"
            />
            {form.formState.errors.contenido && (
              <p className="mt-1 text-sm text-[var(--color-destructive)]">
                {form.formState.errors.contenido.message}
              </p>
            )}
          </div>

          {isEdit && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                Referencia (ref) {hasPesoWrite ? '' : '(solo lectura)'}
              </label>
              {hasPesoWrite ? (
                <div className="flex gap-2">
                  <Input
                    {...form.register('ref')}
                    variant="clean"
                    className="input-clean flex-1 font-mono"
                    placeholder="ECU-XX-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleGenerarRef}
                    disabled={generatingRef || destinatarioId == null}
                  >
                    {generatingRef ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      'Generar código'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-sm font-mono text-[var(--color-muted-foreground)]">
                  {paquete?.ref ?? '—'}
                </div>
              )}
              {form.formState.errors.ref && (
                <p className="mt-1 text-sm text-[var(--color-destructive)]">
                  {form.formState.errors.ref.message}
                </p>
              )}
              {hasPesoWrite && (
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Referencia única. Solo operario y administrador pueden editarla.
                </p>
              )}
            </div>
          )}

          {hasPesoWrite && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                  Peso lbs (opcional)
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
                    form.setValue('pesoLbs', n, { shouldValidate: true, shouldDirty: true });
                    if (typeof n === 'number' && !Number.isNaN(n) && n >= 0) {
                      const kg = lbsToKg(n);
                      form.setValue('pesoKg', kg, { shouldValidate: false, shouldDirty: true });
                      setPesoKgInput(String(kg));
                    } else {
                      form.setValue('pesoKg', undefined, { shouldValidate: false, shouldDirty: true });
                      setPesoKgInput('');
                    }
                  }}
                  variant="clean"
                  className="input-clean"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                  Peso kg (opcional)
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
                    form.setValue('pesoKg', n, { shouldValidate: true, shouldDirty: true });
                    if (typeof n === 'number' && !Number.isNaN(n) && n >= 0) {
                      const lbs = kgToLbs(n);
                      form.setValue('pesoLbs', lbs, { shouldValidate: false, shouldDirty: true });
                      setPesoLbsInput(String(lbs));
                    } else {
                      form.setValue('pesoLbs', undefined, { shouldValidate: false, shouldDirty: true });
                      setPesoLbsInput('');
                    }
                  }}
                  variant="clean"
                  className="input-clean"
                  placeholder="0"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || sinGuiasDisponibles}>
              {loading ? (isEdit ? 'Guardando...' : 'Registrando...') : isEdit ? 'Guardar cambios' : 'Registrar paquete'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface GuiaInfoReadonlyProps {
  paquete?: Paquete | null;
  trackingBaseFallback?: string | null;
  destinatarioNombreFallback?: string | null;
  guiaMasterId?: number;
}

function GuiaInfoReadonly({
  paquete,
  trackingBaseFallback,
  destinatarioNombreFallback,
  guiaMasterId,
}: GuiaInfoReadonlyProps) {
  if (!paquete) return null;

  const trackingBase = paquete.guiaMasterTrackingBase ?? trackingBaseFallback ?? '—';
  const piezaNumero = paquete.piezaNumero;
  const piezaTotal = paquete.piezaTotal ?? paquete.guiaMasterTotalPiezas;
  const piezaLabel =
    piezaNumero != null && piezaTotal != null
      ? `${piezaNumero} / ${piezaTotal}`
      : piezaNumero != null
        ? String(piezaNumero)
        : null;

  const nombre = paquete.destinatarioNombre ?? destinatarioNombreFallback ?? null;
  const telefono = paquete.destinatarioTelefono ?? null;
  const direccion = paquete.destinatarioDireccion ?? null;
  const ubicacion = [paquete.destinatarioCanton, paquete.destinatarioProvincia]
    .filter((v): v is string => Boolean(v && v.trim()))
    .join(', ');

  return (
    <div className="space-y-3 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Guía master
          </p>
          <p className="mt-0.5 break-all font-mono text-sm font-medium text-[var(--color-foreground)]">
            {trackingBase}
          </p>
          {piezaLabel && (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Pieza {piezaLabel}
            </p>
          )}
        </div>
        {guiaMasterId != null && (
          <a
            href={`/guias-master/${guiaMasterId}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-muted)]"
          >
            Editar guía
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {(nombre || telefono || direccion || ubicacion) && (
        <div className="space-y-1.5 border-t border-[var(--color-border)] pt-3">
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Destinatario final
          </p>
          {nombre && (
            <div className="flex items-start gap-2 text-sm">
              <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
              <span className="font-medium text-[var(--color-foreground)]">{nombre}</span>
            </div>
          )}
          {telefono && (
            <div className="flex items-start gap-2 text-sm">
              <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
              <span className="text-[var(--color-foreground)]">{telefono}</span>
            </div>
          )}
          {(direccion || ubicacion) && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
              <div className="min-w-0">
                {direccion && (
                  <p className="text-[var(--color-foreground)]">{direccion}</p>
                )}
                {ubicacion && (
                  <p className="text-xs text-[var(--color-muted-foreground)]">{ubicacion}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-[var(--color-muted-foreground)]">
        La guía y la información del destinatario no se editan desde aquí.
      </p>
    </div>
  );
}
