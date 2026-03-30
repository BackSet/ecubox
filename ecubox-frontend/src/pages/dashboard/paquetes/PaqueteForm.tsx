import { useState, useRef, useEffect } from 'react';
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
import { useDestinatarios } from '@/hooks/useDestinatarios';
import { useCreatePaquete, useUpdatePaquete } from '@/hooks/usePaquetes';
import { useDestinatariosOperario } from '@/hooks/useOperarioDespachos';
import { sugerirRef } from '@/lib/api/paquetes.service';
import { onKeyDownNumericDecimal, sanitizeNumericDecimal } from '@/lib/inputFilters';
import { lbsToKg, kgToLbs } from '@/lib/utils/weight';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { Loader2, MapPin } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMensajeAgenciaEeuu } from '@/hooks/useMensajeAgenciaEeuu';
import { parseWhatsAppPreviewToReact } from '@/pages/dashboard/parametros-sistema/whatsappFormatPreview';
import type { DestinatarioFinal } from '@/types/destinatario';
import type { Paquete } from '@/types/paquete';

// Campos numéricos opcionales: input vacío con valueAsNumber devuelve NaN; lo tratamos como ausente
const optionalNumber = z
  .union([z.number(), z.nan()])
  .optional()
  .transform((val) => (typeof val === 'number' && Number.isNaN(val) ? undefined : val));

const formSchema = z.object({
  numeroGuia: z.string().min(1, 'El número de guía es obligatorio'),
  destinatarioFinalId: z
    .number()
    .optional()
    .refine((n) => n != null && !Number.isNaN(n) && n > 0, { message: 'Selecciona un destinatario' }),
  contenido: z.string().min(1, 'El contenido es obligatorio'),
  pesoLbs: optionalNumber,
  pesoKg: optionalNumber,
  numeroGuiaEnvio: z.string().optional(),
  ref: z.string().optional(),
});

type FormValues = z.input<typeof formSchema>;

function destinatarioLabel(d: DestinatarioFinal): string {
  const parts = [d.nombre];
  if (d.canton) parts.push(d.canton);
  if (d.telefono) parts.push(d.telefono);
  if (d.codigo) parts.push(d.codigo);
  return parts.filter(Boolean).join(' — ');
}

function filterDestinatarios(
  list: DestinatarioFinal[],
  query: string
): DestinatarioFinal[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (d) =>
      d.nombre.toLowerCase().includes(q) ||
      (d.canton != null && d.canton.toLowerCase().includes(q)) ||
      (d.telefono != null && d.telefono.replace(/\s/g, '').toLowerCase().includes(q.replace(/\s/g, '')))
  );
}

interface PaqueteFormProps {
  paquete?: Paquete | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaqueteForm({ paquete, onClose, onSuccess }: PaqueteFormProps) {
  const hasDestinatariosOperario = useAuthStore((s) => s.hasPermission('DESTINATARIOS_OPERARIO'));
  const hasPesoWrite = useAuthStore((s) => s.hasPermission('PAQUETES_PESO_WRITE'));
  const isEdit = paquete != null;
  const useOperarioList = isEdit && hasDestinatariosOperario;
  const { data: misDestinatarios = [] } = useDestinatarios(!useOperarioList);
  const { data: opDestinatarios = [] } = useDestinatariosOperario(undefined, useOperarioList);
  const destinatarios = useOperarioList ? opDestinatarios : misDestinatarios;

  const createMutation = useCreatePaquete();
  const updateMutation = useUpdatePaquete();
  const { data: agenciaMensaje, isLoading: loadingAgenciaMensaje, isError: errorAgenciaMensaje } =
    useMensajeAgenciaEeuu({ enabled: !isEdit });
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [generatingRef, setGeneratingRef] = useState(false);
  const [pesoLbsInput, setPesoLbsInput] = useState('');
  const [pesoKgInput, setPesoKgInput] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numeroGuia: paquete?.numeroGuia ?? '',
      destinatarioFinalId: paquete?.destinatarioFinalId,
      contenido: paquete?.contenido ?? '',
      pesoLbs: paquete?.pesoLbs != null ? Number(paquete.pesoLbs) : undefined,
      pesoKg: paquete?.pesoKg != null ? Number(paquete.pesoKg) : undefined,
      numeroGuiaEnvio: paquete?.numeroGuiaEnvio ?? '',
      ref: paquete?.ref ?? '',
    },
  });

  const selectedId = form.watch('destinatarioFinalId');
  const selected = destinatarios.find((d) => d.id === selectedId);
  const filtered = filterDestinatarios(destinatarios, searchQuery);
  const displayValue = selected
    ? destinatarioLabel(selected)
    : searchQuery;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isEdit && paquete && destinatarios.length > 0) {
      const d = destinatarios.find((x) => x.id === paquete.destinatarioFinalId);
      if (d) setSearchQuery(destinatarioLabel(d));
    }
  }, [isEdit, paquete?.destinatarioFinalId, destinatarios]);

  useEffect(() => {
    if (paquete) {
      setPesoLbsInput(paquete.pesoLbs != null ? String(paquete.pesoLbs) : '');
      setPesoKgInput(paquete.pesoKg != null ? String(paquete.pesoKg) : '');
    } else {
      setPesoLbsInput('');
      setPesoKgInput('');
    }
  }, [paquete]);

  function handleSelect(d: DestinatarioFinal) {
    form.setValue('destinatarioFinalId', d.id);
    setSearchQuery(destinatarioLabel(d));
    setDropdownOpen(false);
    setHighlightedIndex(0);
  }

  function handleComboboxKeyDown(e: React.KeyboardEvent) {
    if (!dropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setDropdownOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }
    if (e.key === 'Escape') {
      setDropdownOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter' && filtered[highlightedIndex]) {
      e.preventDefault();
      handleSelect(filtered[highlightedIndex]);
    }
  }

  async function handleGenerarRef() {
    const destinatarioId = selectedId ?? paquete?.destinatarioFinalId;
    if (destinatarioId == null) {
      toast.error('Selecciona un destinatario');
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
    const destinatarioId = values.destinatarioFinalId;
    if (destinatarioId == null || destinatarioId <= 0) {
      form.setError('destinatarioFinalId', { message: 'Selecciona un destinatario' });
      toast.error('Selecciona un destinatario para continuar');
      return;
    }
    try {
      if (isEdit && paquete) {
        const body: {
          numeroGuia: string;
          destinatarioFinalId: number;
          contenido?: string;
          pesoLbs?: number;
          pesoKg?: number;
          numeroGuiaEnvio?: string;
          ref?: string;
        } = {
          numeroGuia: values.numeroGuia.trim(),
          destinatarioFinalId: destinatarioId,
          contenido: values.contenido?.trim() || undefined,
        };
        if (hasPesoWrite) {
          const lbs = values.pesoLbs;
          const kg = values.pesoKg;
          if (typeof lbs === 'number' && !Number.isNaN(lbs)) body.pesoLbs = lbs;
          if (typeof kg === 'number' && !Number.isNaN(kg)) body.pesoKg = kg;
          body.numeroGuiaEnvio = values.numeroGuiaEnvio?.trim() || undefined;
          body.ref = values.ref?.trim() || undefined;
        }
        await updateMutation.mutateAsync({
          id: paquete.id,
          body,
        });
        toast.success('Paquete actualizado correctamente');
      } else {
        const createBody: {
          numeroGuia: string;
          destinatarioFinalId: number;
          contenido?: string;
          pesoLbs?: number;
          pesoKg?: number;
          numeroGuiaEnvio?: string;
        } = {
          numeroGuia: values.numeroGuia.trim(),
          destinatarioFinalId: destinatarioId,
          contenido: values.contenido?.trim() || undefined,
        };
        if (hasPesoWrite) {
          const lbs = values.pesoLbs;
          const kg = values.pesoKg;
          if (typeof lbs === 'number' && !Number.isNaN(lbs)) createBody.pesoLbs = lbs;
          if (typeof kg === 'number' && !Number.isNaN(kg)) createBody.pesoKg = kg;
          createBody.numeroGuiaEnvio = values.numeroGuiaEnvio?.trim() || undefined;
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
          toast.error('Ya existe un paquete con ese número de guía');
          form.setError('numeroGuia', { message: 'Este número de guía ya está registrado' });
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

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar paquete' : 'Registrar paquete'}</DialogTitle>
        </DialogHeader>
        {!isEdit && (
          <>
            {loadingAgenciaMensaje ? (
              <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                Cargando información de la agencia USA…
              </div>
            ) : errorAgenciaMensaje ? null : agenciaMensaje?.mensaje?.trim() ? (
              <Alert className="border-[var(--color-border)] bg-[var(--color-muted)]/15">
                <MapPin className="h-4 w-4" />
                <AlertTitle>Destino agencia USA</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap text-[var(--color-foreground)]">
                  {parseWhatsAppPreviewToReact(agenciaMensaje.mensaje)}
                </AlertDescription>
              </Alert>
            ) : null}
          </>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              Número de guía *
            </label>
            <input
              {...form.register('numeroGuia')}
              className="input-clean"
              placeholder="Tracking original (USA)"
            />
            {form.formState.errors.numeroGuia && (
              <p className="mt-1 text-sm text-[var(--color-destructive)]">
                {form.formState.errors.numeroGuia.message}
              </p>
            )}
          </div>

          <div className="relative" ref={dropdownRef}>
            <label
              id="destinatario-label"
              className="mb-1 block text-sm font-medium text-[var(--color-foreground)]"
            >
              Destinatario final *
            </label>
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={dropdownOpen}
              aria-controls="destinatario-listbox"
              aria-autocomplete="list"
              aria-labelledby="destinatario-label"
              value={displayValue}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDropdownOpen(true);
                setHighlightedIndex(0);
                if (selectedId) form.setValue('destinatarioFinalId', undefined);
              }}
              onFocus={() => setDropdownOpen(true)}
              onKeyDown={handleComboboxKeyDown}
              className="input-clean"
              placeholder="Buscar por nombre, cantón o teléfono..."
            />
            {dropdownOpen && (
              <ul
                id="destinatario-listbox"
                role="listbox"
                className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-[var(--color-border)] bg-[var(--color-background)] py-1 shadow-lg"
              >
                {filtered.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
                    Sin resultados
                  </li>
                ) : (
                  filtered.map((d, i) => (
                    <li
                      key={d.id}
                      role="option"
                      aria-selected={selectedId === d.id}
                      className={`cursor-pointer px-3 py-2 text-sm ${
                        i === highlightedIndex
                          ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)]'
                          : ''
                      }`}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      onClick={() => handleSelect(d)}
                    >
                      <div className="font-medium">{d.nombre}</div>
                      {(d.canton || d.telefono || d.codigo) && (
                        <div
                          className={`mt-0.5 text-xs ${
                            i === highlightedIndex
                              ? 'opacity-90'
                              : 'text-[var(--color-muted-foreground)]'
                          }`}
                        >
                          {[d.canton, d.telefono, d.codigo].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </li>
                  ))
                )}
              </ul>
            )}
            {destinatarios.length === 0 && (
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Primero registra un destinatario en Mis Destinatarios.
              </p>
            )}
            {form.formState.errors.destinatarioFinalId && (
              <p className="mt-1 text-sm text-[var(--color-destructive)]">
                {form.formState.errors.destinatarioFinalId.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
              Contenido *
            </label>
            <input
              {...form.register('contenido')}
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
                  <input
                    {...form.register('ref')}
                    className="input-clean flex-1 font-mono"
                    placeholder="ECU-XX-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleGenerarRef}
                    disabled={generatingRef || (selectedId ?? paquete?.destinatarioFinalId) == null}
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
                <input
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
                  className="input-clean"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                  Peso kg (opcional)
                </label>
                <input
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
                  className="input-clean"
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {hasPesoWrite && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                Guía de envío consolidador (opcional)
              </label>
              <input
                {...form.register('numeroGuiaEnvio')}
                className="input-clean"
                placeholder="Número de guía del consolidador"
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || destinatarios.length === 0}>
              {loading ? (isEdit ? 'Guardando...' : 'Registrando...') : isEdit ? 'Guardar cambios' : 'Registrar paquete'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
