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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioCards } from '@/components/ui/radio-cards';
import { Label } from '@/components/ui/label';
import {
  useDistribuidores,
  useAgenciasOperario,
  useAgenciasDistribuidor,
  useDestinatariosOperario,
  useSacasOperario,
  useCreateDespacho,
} from '@/hooks/useOperarioDespachos';
import { toast } from 'sonner';
import type { DestinatarioFinal } from '@/types/destinatario';
import type { TipoEntrega } from '@/types/despacho';

function agenciaDistribuidorEtiqueta(a: { etiqueta?: string; provincia?: string; canton?: string; codigo?: string }): string {
  if (a.etiqueta?.trim()) return a.etiqueta.trim();
  const parts = [a.provincia, a.canton].filter(Boolean);
  return (parts.length ? parts.join(', ') + ' ' : '') + (a.codigo ? `(${a.codigo})` : '—');
}

const formSchema = z
  .object({
    numeroGuia: z.string().min(1, 'El número de guía es obligatorio'),
    distribuidorId: z.number().refine((n) => n > 0, 'Selecciona un distribuidor'),
    tipoEntrega: z.enum(['DOMICILIO', 'AGENCIA', 'AGENCIA_DISTRIBUIDOR']),
    destinatarioFinalId: z.number().optional(),
    agenciaId: z.number().optional(),
    agenciaDistribuidorId: z.number().optional(),
    observaciones: z.string().optional(),
    codigoPrecinto: z.string().optional(),
    sacaIds: z.array(z.number()).optional(),
  })
  .refine(
    (data) => {
      if (data.tipoEntrega === 'DOMICILIO') return data.destinatarioFinalId != null && data.destinatarioFinalId > 0;
      if (data.tipoEntrega === 'AGENCIA') return data.agenciaId != null && data.agenciaId > 0;
      if (data.tipoEntrega === 'AGENCIA_DISTRIBUIDOR') return data.agenciaDistribuidorId != null && data.agenciaDistribuidorId > 0;
      return true;
    },
    { message: 'Domicilio requiere destinatario; Agencia requiere agencia; Agencia de distribuidor requiere agencia del distribuidor', path: ['destinatarioFinalId'] }
  );

type FormValues = z.infer<typeof formSchema>;

function destinatarioLabel(d: DestinatarioFinal): string {
  const parts = [d.nombre];
  if (d.canton) parts.push(d.canton);
  if (d.codigo) parts.push(d.codigo);
  return parts.filter(Boolean).join(' — ');
}

function filterDestinatarios(list: DestinatarioFinal[], q: string): DestinatarioFinal[] {
  const s = q.trim().toLowerCase();
  if (!s) return list;
  return list.filter(
    (d) =>
      d.nombre.toLowerCase().includes(s) ||
      (d.canton?.toLowerCase().includes(s) ?? false) ||
      (d.codigo?.toLowerCase().includes(s) ?? false)
  );
}

interface DespachoFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function DespachoForm({ onClose, onSuccess }: DespachoFormProps) {
  const { data: distribuidores = [] } = useDistribuidores();
  const { data: agencias = [] } = useAgenciasOperario();
  const { data: destinatarios = [] } = useDestinatariosOperario();
  const { data: sacas = [] } = useSacasOperario(true);
  const createMutation = useCreateDespacho();
  const [destSearch, setDestSearch] = useState('');
  const [destOpen, setDestOpen] = useState(false);
  const destRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numeroGuia: '',
      distribuidorId: 0,
      tipoEntrega: 'DOMICILIO' as TipoEntrega,
      destinatarioFinalId: undefined,
      agenciaId: undefined,
      agenciaDistribuidorId: undefined,
      observaciones: '',
      codigoPrecinto: '',
      sacaIds: [],
    },
  });

  const tipoEntrega = form.watch('tipoEntrega');
  const distribuidorIdForm = form.watch('distribuidorId');
  const { data: agenciasDistribuidor = [] } = useAgenciasDistribuidor(
    tipoEntrega === 'AGENCIA_DISTRIBUIDOR' && distribuidorIdForm != null && distribuidorIdForm > 0 ? distribuidorIdForm : null
  );
  const selectedDestId = form.watch('destinatarioFinalId');
  const selectedDest = destinatarios.find((d) => d.id === selectedDestId);
  const filteredDest = filterDestinatarios(destinatarios, destSearch);

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
    function handleClickOutside(e: MouseEvent) {
      if (destRef.current && !destRef.current.contains(e.target as Node)) {
        setDestOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loading = createMutation.isPending;
  const selectedSacaIds = form.watch('sacaIds') ?? [];

  function toggleSaca(id: number) {
    form.setValue(
      'sacaIds',
      selectedSacaIds.includes(id) ? selectedSacaIds.filter((x) => x !== id) : [...selectedSacaIds, id]
    );
  }

  async function onSubmit(values: FormValues) {
    const destinatarioFinalId =
      values.tipoEntrega === 'DOMICILIO' && values.destinatarioFinalId != null && !Number.isNaN(values.destinatarioFinalId) && values.destinatarioFinalId > 0
        ? values.destinatarioFinalId
        : undefined;
    const agenciaId =
      values.tipoEntrega === 'AGENCIA' && values.agenciaId != null && !Number.isNaN(values.agenciaId) && values.agenciaId > 0
        ? values.agenciaId
        : undefined;
    const agenciaDistribuidorId =
      values.tipoEntrega === 'AGENCIA_DISTRIBUIDOR' && values.agenciaDistribuidorId != null && !Number.isNaN(values.agenciaDistribuidorId) && values.agenciaDistribuidorId > 0
        ? values.agenciaDistribuidorId
        : undefined;
    if (values.tipoEntrega === 'DOMICILIO' && !destinatarioFinalId) {
      toast.error('Selecciona un destinatario final');
      return;
    }
    if (values.tipoEntrega === 'AGENCIA' && !agenciaId) {
      toast.error('Selecciona una agencia');
      return;
    }
    if (values.tipoEntrega === 'AGENCIA_DISTRIBUIDOR' && !agenciaDistribuidorId) {
      toast.error('Selecciona una agencia del distribuidor');
      return;
    }
    try {
      await createMutation.mutateAsync({
        numeroGuia: values.numeroGuia.trim(),
        distribuidorId: values.distribuidorId,
        tipoEntrega: values.tipoEntrega,
        destinatarioFinalId: values.tipoEntrega === 'DOMICILIO' ? destinatarioFinalId : undefined,
        agenciaId: values.tipoEntrega === 'AGENCIA' ? agenciaId : undefined,
        agenciaDistribuidorId: values.tipoEntrega === 'AGENCIA_DISTRIBUIDOR' ? agenciaDistribuidorId : undefined,
        observaciones: values.observaciones?.trim() || undefined,
        codigoPrecinto: values.codigoPrecinto?.trim() || undefined,
        sacaIds: (values.sacaIds?.length ?? 0) > 0 ? values.sacaIds : undefined,
      });
      toast.success('Despacho creado');
      onSuccess();
      onClose();
    } catch {
      toast.error('Error al crear el despacho');
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo despacho</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="mb-1 block">
              Número de guía
            </Label>
            <Input
              {...form.register('numeroGuia')}
              placeholder="Guía del distribuidor"
            />
            {form.formState.errors.numeroGuia && (
              <p className="mt-1 text-sm text-[var(--color-destructive)]">
                {form.formState.errors.numeroGuia.message}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-1 block">
              Distribuidor
            </Label>
            <select
              {...form.register('distribuidorId', { valueAsNumber: true })}
              className="input-clean"
            >
              <option value={0}>Seleccione distribuidor</option>
              {distribuidores.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre} ({d.codigo})
                </option>
              ))}
            </select>
            {form.formState.errors.distribuidorId && (
              <p className="mt-1 text-sm text-[var(--color-destructive)]">
                {form.formState.errors.distribuidorId.message}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-2 block">Tipo de entrega</Label>
            <RadioCards
              value={tipoEntrega}
              onValueChange={(value) => form.setValue('tipoEntrega', value as TipoEntrega)}
              options={[
                { value: 'DOMICILIO', title: 'Domicilio', description: 'Entrega directa al destinatario final.' },
                { value: 'AGENCIA', title: 'Agencia', description: 'Entrega en agencia según zona.' },
                { value: 'AGENCIA_DISTRIBUIDOR', title: 'Agencia distribuidor', description: 'Entrega en agencia del distribuidor.' },
              ]}
            />
          </div>

          {tipoEntrega === 'DOMICILIO' && (
            <div ref={destRef} className="relative">
              <Label className="mb-1 block">
                Destinatario final
              </Label>
              <Input
                type="text"
                value={selectedDest ? destinatarioLabel(selectedDest) : destSearch}
                onChange={(e) => {
                  setDestSearch(e.target.value);
                  setDestOpen(true);
                  if (selectedDestId) form.setValue('destinatarioFinalId', undefined);
                }}
                onFocus={() => setDestOpen(true)}
                placeholder="Buscar por nombre, cantón o código..."
              />
              {destOpen && (
                <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border border-[var(--color-border)] bg-[var(--color-background)] py-1 shadow-lg">
                  {filteredDest.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
                      Sin resultados
                    </li>
                  ) : (
                    filteredDest.map((d) => (
                      <li
                        key={d.id}
                        className="cursor-pointer px-3 py-2 text-sm hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]"
                        onClick={() => {
                          form.setValue('destinatarioFinalId', d.id);
                          setDestSearch(destinatarioLabel(d));
                          setDestOpen(false);
                        }}
                      >
                        {destinatarioLabel(d)}
                      </li>
                    ))
                  )}
                </ul>
              )}
              {form.formState.errors.destinatarioFinalId && (
                <p className="mt-1 text-sm text-[var(--color-destructive)]">
                  {form.formState.errors.destinatarioFinalId.message}
                </p>
              )}
            </div>
          )}

          {tipoEntrega === 'AGENCIA' && (
            <div>
              <Label className="mb-1 block">
                Agencia
              </Label>
              <select
                {...form.register('agenciaId', { valueAsNumber: true, setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)) })}
                className="input-clean"
              >
                <option value="">Seleccione agencia</option>
                {agencias.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} ({a.codigo})
                  </option>
                ))}
              </select>
              {form.formState.errors.agenciaId && (
                <p className="mt-1 text-sm text-[var(--color-destructive)]">
                  {form.formState.errors.agenciaId.message}
                </p>
              )}
            </div>
          )}

          {tipoEntrega === 'AGENCIA_DISTRIBUIDOR' && (
            <div>
              <Label className="mb-1 block">
                Agencia del distribuidor
              </Label>
              <select
                {...form.register('agenciaDistribuidorId', { valueAsNumber: true, setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)) })}
                className="input-clean"
              >
                <option value="">Seleccione agencia del distribuidor</option>
                {agenciasDistribuidor.map((a) => (
                  <option key={a.id} value={a.id}>
                    {agenciaDistribuidorEtiqueta(a)}
                  </option>
                ))}
              </select>
              {form.formState.errors.agenciaDistribuidorId && (
                <p className="mt-1 text-sm text-[var(--color-destructive)]">
                  {form.formState.errors.agenciaDistribuidorId.message}
                </p>
              )}
            </div>
          )}

          <div>
            <Label className="mb-1 block">
              Observaciones (opcional)
            </Label>
            <Textarea
              {...form.register('observaciones')}
              rows={2}
              placeholder="Observaciones"
            />
          </div>

          <div>
            <Label className="mb-1 block">
              Código de precinto (opcional)
            </Label>
            <Input
              {...form.register('codigoPrecinto')}
              placeholder="Código de precinto"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-foreground)]">
              Sacas a incluir
            </label>
            {sacas.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No hay sacas sin despacho. Crea sacas primero para asignarlas.
              </p>
            ) : (
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-[var(--color-border)] p-2">
                {sacas.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-[var(--color-muted)]/50"
                  >
                    <Checkbox
                      checked={selectedSacaIds.includes(s.id)}
                      onCheckedChange={() => toggleSaca(s.id)}
                    />
                    <span className="text-sm">
                      {s.numeroOrden}
                      {s.pesoLbs != null || s.pesoKg != null
                        ? ` — ${[s.pesoLbs != null ? `${s.pesoLbs} lbs` : null, s.pesoKg != null ? `${s.pesoKg} kg` : null]
                            .filter(Boolean)
                            .join(' / ')}`
                        : ''}
                      {s.tamanio ? ` — ${s.tamanio}` : ''}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear despacho'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
