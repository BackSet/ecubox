import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import {
  AlertTriangle,
  Boxes,
  ClipboardPaste,
  Info,
  Loader2,
  Plus,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { notify } from '@/lib/notify';
import { getApiStatus } from '@/lib/api/error-message';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { useConsignatarios } from '@/hooks/useConsignatarios';
import { useAuthStore } from '@/stores/authStore';
import { ConsignatarioForm } from '@/pages/dashboard/consignatarios/ConsignatarioForm';
import { MIS_GUIAS_QUERY_KEY } from '@/hooks/useMisGuias';
import { registrarMiGuia } from '@/lib/api/mis-guias.service';
import { miGuiasBulkSchema, MAX_MIS_GUIAS_BULK } from '@/lib/schemas/guia';
import { cn } from '@/lib/utils';
import { GuiaTrackingHelp } from './GuiaTrackingHelp';
import {
  GUIA_TRACKING_AVISO_PEDIDO,
  GUIA_TRACKING_HINT_CAMPO,
  pareceNumeroPedido,
} from './guiaTrackingHelpContent';

type FormValues = z.input<typeof miGuiasBulkSchema>;

/**
 * Registro rápido de una o varias guías para un mismo consignatario.
 * Sigue el patrón de planilla: una fila por guía, con pegar lista (un número
 * por línea), navegación con teclado y resumen antes de guardar.
 */
export function RegistrarMisGuiasDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: consignatarios = [], isLoading: loadingDest } = useConsignatarios();
  const puedeCrearDestinatario = useAuthStore((s) => s.hasPermission('CONSIGNATARIOS_CREATE'));
  const [nuevoDestOpen, setNuevoDestOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(miGuiasBulkSchema),
    mode: 'onTouched',
    defaultValues: { guias: [{ tracking: '' }] },
  });
  const { control, handleSubmit, watch, setValue, register, formState, getValues } = form;
  const { fields, append, insert, remove, replace } = useFieldArray({ control, name: 'guias' });

  const consignatarioId = watch('consignatarioId');
  const watchedGuias = watch('guias');

  const [progreso, setProgreso] = useState({ enviando: false, actual: 0, total: 0 });

  // Foco inmediato en la primera fila al elegir consignatario.
  useEffect(() => {
    if (consignatarioId != null) {
      requestAnimationFrame(() => focusTracking(0));
    }
  }, [consignatarioId]);

  const sinConsignatarios = !loadingDest && consignatarios.length === 0;

  // ----- Resumen del lote -----
  const resumen = useMemo(() => {
    const items = watchedGuias ?? [];
    let vacias = 0;
    const seen = new Set<string>();
    let duplicadas = 0;
    let validas = 0;
    for (const g of items) {
      const t = (g.tracking ?? '').trim();
      if (!t) {
        vacias += 1;
        continue;
      }
      const key = t.toUpperCase();
      if (seen.has(key)) {
        duplicadas += 1;
        continue;
      }
      seen.add(key);
      validas += 1;
    }
    return { total: items.length, vacias, duplicadas, validas };
  }, [watchedGuias]);

  function focusTracking(idx: number) {
    const el = document.getElementById(`mi-guia-${idx}`) as HTMLInputElement | null;
    el?.focus();
    el?.select();
  }

  function handleAddOne() {
    if (fields.length >= MAX_MIS_GUIAS_BULK) return;
    append({ tracking: '' });
    requestAnimationFrame(() => focusTracking(fields.length));
  }

  function handleRemove(idx: number) {
    if (fields.length <= 1) return;
    remove(idx);
  }

  function handleEnter(idx: number) {
    if (idx < fields.length - 1) focusTracking(idx + 1);
    else if (fields.length < MAX_MIS_GUIAS_BULK) handleAddOne();
  }

  /** Pega una lista de números (uno por línea/coma/tab) creando una fila por número. */
  function pegarLista(text: string, startIndex?: number) {
    const lineas = text
      .split(/[\r\n\t,;]+/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lineas.length === 0) return;
    const cupo = MAX_MIS_GUIAS_BULK - fields.length;
    if (startIndex != null) {
      setValue(`guias.${startIndex}.tracking`, lineas[0], {
        shouldDirty: true,
        shouldValidate: true,
      });
      const resto = lineas.slice(1, 1 + Math.max(0, cupo));
      if (resto.length > 0) insert(startIndex + 1, resto.map((t) => ({ tracking: t })));
      avisarPegado(lineas.length, 1 + resto.length);
    } else {
      const aAgregar = lineas.slice(0, Math.max(0, cupo));
      if (aAgregar.length > 0) append(aAgregar.map((t) => ({ tracking: t })));
      avisarPegado(lineas.length, aAgregar.length);
    }
  }

  function avisarPegado(detectadas: number, aplicadas: number) {
    if (aplicadas < detectadas) {
      notify.warning(
        `Se agregaron ${aplicadas} de ${detectadas} (máximo ${MAX_MIS_GUIAS_BULK} guías a la vez)`,
      );
    } else {
      notify.success(`${aplicadas} guía${aplicadas === 1 ? '' : 's'} desde la lista`);
    }
  }

  async function pegarDesdePortapapeles() {
    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch {
      notify.error('No se pudo leer el portapapeles. Pega dentro de una fila.');
      return;
    }
    if (!text.trim()) {
      notify.warning('El portapapeles está vacío');
      return;
    }
    const items = getValues('guias') ?? [];
    const vacia = items.findIndex((g) => !(g.tracking ?? '').trim());
    pegarLista(text, vacia >= 0 ? vacia : undefined);
  }

  async function onSubmit(values: FormValues) {
    const cid = values.consignatarioId;
    // Únicos, no vacíos, preservando orden (dedupe case-insensitive).
    const seen = new Set<string>();
    const trackings: string[] = [];
    for (const g of values.guias) {
      const t = (g.tracking ?? '').trim();
      if (!t) continue;
      const key = t.toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      trackings.push(t);
    }
    if (trackings.length === 0) {
      notify.warning('Agrega al menos una guía con número');
      return;
    }

    setProgreso({ enviando: true, actual: 0, total: trackings.length });
    const toastId = notify.loading(
      trackings.length === 1 ? 'Registrando guía...' : `Registrando ${trackings.length} guías...`,
    );

    let ok = 0;
    let duplicadas = 0;
    const fallidos: string[] = [];
    for (let i = 0; i < trackings.length; i++) {
      try {
        await registrarMiGuia({ trackingBase: trackings[i], consignatarioId: cid });
        ok += 1;
      } catch (err: unknown) {
        if (getApiStatus(err) === 409) duplicadas += 1;
        else fallidos.push(trackings[i]);
      }
      setProgreso((p) => ({ ...p, actual: i + 1 }));
    }

    qc.invalidateQueries({ queryKey: MIS_GUIAS_QUERY_KEY });
    setProgreso({ enviando: false, actual: 0, total: 0 });

    const partes: string[] = [];
    if (ok > 0) partes.push(`${ok} registrada${ok === 1 ? '' : 's'}`);
    if (duplicadas > 0) partes.push(`${duplicadas} ya existía${duplicadas === 1 ? '' : 'n'}`);
    if (fallidos.length > 0) partes.push(`${fallidos.length} con error`);
    const resumenMsg = partes.join(' · ');

    if (fallidos.length === 0) {
      notify.success(resumenMsg || 'Guías registradas', { id: toastId });
      onClose();
    } else {
      notify.warning(resumenMsg, { id: toastId });
      // Deja solo las fallidas para reintentar.
      replace(fallidos.map((t) => ({ tracking: t })));
    }
  }

  const enviando = progreso.enviando;

  return (
    <Dialog open onOpenChange={(open) => !open && !enviando && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar guías</DialogTitle>
          <DialogDescription>
            Elige el destinatario y registra una o varias guías de una sola vez.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !enviando) {
              e.preventDefault();
              handleSubmit(onSubmit)();
            }
          }}
        >
          {/* Destinatario */}
          <div>
            <Label htmlFor="mi-guias-consignatario" className="mb-1 flex items-center gap-1 text-sm">
              <UserRound className="h-3.5 w-3.5" />
              ¿Quién recibirá los paquetes de esta guía? *
            </Label>
            <p className="mb-1.5 text-xs text-muted-foreground">
              Selecciona un destinatario guardado o crea uno nuevo.
            </p>
            <SearchableCombobox
              id="mi-guias-consignatario"
              value={consignatarioId}
              onChange={(v) =>
                setValue('consignatarioId', typeof v === 'number' ? v : (undefined as never), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              options={consignatarios}
              getKey={(d) => d.id}
              getLabel={(d) => d.nombre}
              getSearchText={(d) =>
                [d.nombre, d.codigo ?? '', d.canton ?? '', d.provincia ?? '', d.telefono ?? ''].join(' ')
              }
              placeholder={
                loadingDest
                  ? 'Cargando destinatarios...'
                  : sinConsignatarios
                    ? 'Sin destinatarios'
                    : 'Selecciona un destinatario'
              }
              searchPlaceholder="Buscar por nombre, código, cantón..."
              emptyMessage="Sin coincidencias"
              disabled={loadingDest || sinConsignatarios || enviando}
              clearable={false}
              renderOption={(d) => (
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{d.nombre}</span>
                    {d.codigo && <span className="text-xs text-muted-foreground">· {d.codigo}</span>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[d.canton, d.provincia].filter(Boolean).join(', ') || ''}
                  </div>
                </div>
              )}
            />
            {formState.errors.consignatarioId && (
              <p className="mt-1 text-xs text-destructive">
                {formState.errors.consignatarioId.message as string}
              </p>
            )}
            {sinConsignatarios && (
              <p className="mt-1 text-xs text-muted-foreground">
                Aún no tienes destinatarios. Crea el primero aquí mismo.
              </p>
            )}
            {puedeCrearDestinatario && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1.5 h-8 gap-1.5 px-2 text-primary hover:text-primary"
                onClick={() => setNuevoDestOpen(true)}
                disabled={enviando}
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar nuevo destinatario
              </Button>
            )}
          </div>

          {/* Planilla de guías */}
          {consignatarioId != null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h3 className="text-sm font-semibold text-foreground">
                    Guías
                    <span className="ml-1.5 font-normal text-muted-foreground">({fields.length})</span>
                  </h3>
                  <GuiaTrackingHelp variant="inline" />
                </div>
                {fields.length < MAX_MIS_GUIAS_BULK && !enviando && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={pegarDesdePortapapeles}
                      title="Pega aquí una lista de números de guía copiados (uno por línea) y se crea una fila por cada uno"
                    >
                      <ClipboardPaste className="mr-1 h-3.5 w-3.5" />
                      Pegar varias
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={handleAddOne}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Añadir fila
                    </Button>
                  </div>
                )}
              </div>

              {/* Explicación clara de cómo registrar rápido (sobre todo para el cliente) */}
              <div className="flex items-start gap-2 rounded-md border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 px-3 py-2 text-xs text-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                <div className="space-y-1">
                  <p>
                    <strong>¿Tienes varias guías?</strong> Puedes registrarlas todas de una vez:
                  </p>
                  <ul className="ml-3 list-disc space-y-0.5 text-muted-foreground">
                    <li>
                      Copia los números (p. ej. de un correo o Excel) y pégalos con{' '}
                      <strong className="text-foreground">“Pegar varias”</strong> o directamente sobre
                      una fila: se crea una fila por cada número.
                    </li>
                    <li>
                      O escribe un número y presiona{' '}
                      <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">Enter</kbd>{' '}
                      para pasar a la siguiente.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-border">
                <div className="hidden bg-[var(--color-muted)]/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[2rem_minmax(0,1fr)_2.5rem] sm:items-center sm:gap-3">
                  <span className="text-center">#</span>
                  <span>Número de guía</span>
                  <span className="sr-only">Acciones</span>
                </div>
                <div className="divide-y divide-border">
                  {fields.map((field, index) => {
                    const err = formState.errors.guias?.[index]?.tracking?.message as
                      | string
                      | undefined;
                    // Aviso heurístico NO bloqueante: el valor parece un número de pedido.
                    const avisoPedido =
                      !err && pareceNumeroPedido(watchedGuias?.[index]?.tracking ?? '');
                    return (
                      <div key={field.id} className="px-3 py-2">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2rem_minmax(0,1fr)_2.5rem] sm:items-center sm:gap-3">
                          <span className="text-sm tabular-nums text-muted-foreground sm:text-center">
                            {index + 1}
                          </span>
                          <Input
                            id={`mi-guia-${index}`}
                            {...register(`guias.${index}.tracking` as const)}
                            defaultValue={field.tracking}
                            placeholder="Ej: 1Z52159R0379385035"
                            aria-invalid={err ? true : undefined}
                            className={cn(
                              'font-mono',
                              err && 'border-destructive focus-visible:ring-destructive/30',
                            )}
                            disabled={enviando}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleEnter(index);
                              }
                            }}
                            onPaste={(e) => {
                              const text = e.clipboardData.getData('text');
                              if (text && /[\r\n\t,;]/.test(text)) {
                                e.preventDefault();
                                pegarLista(text, index);
                              }
                            }}
                          />
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleRemove(index)}
                              disabled={enviando || fields.length <= 1}
                              aria-label={`Quitar guía ${index + 1}`}
                              title={fields.length <= 1 ? 'Debe haber al menos una' : 'Quitar'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {err && <p className="mt-1 text-xs text-destructive sm:pl-[2.75rem]">{err}</p>}
                        {avisoPedido && (
                          <p
                            role="status"
                            className="mt-1 flex items-start gap-1 text-xs text-[var(--color-warning)] sm:pl-[2.75rem]"
                          >
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                            {GUIA_TRACKING_AVISO_PEDIDO}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {typeof formState.errors.guias?.message === 'string' && (
                <p className="text-sm text-destructive">{formState.errors.guias.message}</p>
              )}

              {/* Resumen */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border bg-[var(--color-muted)]/20 px-3 py-2 text-sm">
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  <Boxes className="h-4 w-4 text-muted-foreground" />
                  {resumen.validas} guía{resumen.validas === 1 ? '' : 's'} a registrar
                </span>
                {resumen.duplicadas > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-[var(--color-warning)]">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {resumen.duplicadas} repetida{resumen.duplicadas === 1 ? '' : 's'} (se omitirá
                    {resumen.duplicadas === 1 ? '' : 'n'})
                  </span>
                )}
                {resumen.vacias > 0 && (
                  <span className="text-muted-foreground">{resumen.vacias} sin número</span>
                )}
              </div>

              <p className="text-[11px] font-medium text-foreground">{GUIA_TRACKING_HINT_CAMPO}</p>

              <p className="text-[11px] text-muted-foreground">
                El total de paquetes y demás detalles los completaremos al recibir tu paquete.
              </p>
            </div>
          )}

          {enviando && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-[var(--color-muted)]/30 px-3 py-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Registrando {progreso.actual} de {progreso.total}…
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando || consignatarioId == null || resumen.validas === 0}>
              {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {enviando
                ? 'Registrando…'
                : resumen.validas <= 1
                  ? 'Registrar guía'
                  : `Registrar ${resumen.validas} guías`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/*
       * Creación rápida de destinatario sin perder el formulario principal: el
       * diálogo se monta como hijo (no se desmonta RegistrarMisGuiasDialog, así
       * las filas de guías pegadas se conservan). Al crear, la mutación invalida
       * la query de consignatarios; aquí autoseleccionamos el nuevo destinatario
       * y cerramos el diálogo secundario.
       */}
      {nuevoDestOpen && (
        <ConsignatarioForm
          useOperarioApi={false}
          onClose={() => setNuevoDestOpen(false)}
          onSuccess={(creado) => {
            setNuevoDestOpen(false);
            if (creado?.id != null) {
              qc.invalidateQueries({ queryKey: ['consignatarios'] });
              setValue('consignatarioId', creado.id, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }
          }}
        />
      )}
    </Dialog>
  );
}
