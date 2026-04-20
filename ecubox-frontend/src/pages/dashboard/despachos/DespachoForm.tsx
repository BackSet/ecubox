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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useCouriersEntrega,
  useAgenciasOperario,
  useAgenciasCourierEntrega,
  useConsignatariosOperario,
  useSacasOperario,
  useCreateDespacho,
} from '@/hooks/useOperarioDespachos';
import { toast } from 'sonner';
import type { Consignatario } from '@/types/consignatario';
import type { TipoEntrega } from '@/types/despacho';

function agenciaCourierEntregaEtiqueta(a: { etiqueta?: string; provincia?: string; canton?: string; codigo?: string }): string {
  if (a.etiqueta?.trim()) return a.etiqueta.trim();
  const parts = [a.provincia, a.canton].filter(Boolean);
  return (parts.length ? parts.join(', ') + ' ' : '') + (a.codigo ? `(${a.codigo})` : '—');
}

const formSchema = z
  .object({
    numeroGuia: z.string().min(1, 'El número de guía es obligatorio'),
    courierEntregaId: z.number().refine((n) => n > 0, 'Selecciona un courier de entrega'),
    tipoEntrega: z.enum(['DOMICILIO', 'AGENCIA', 'AGENCIA_COURIER_ENTREGA']),
    consignatarioId: z.number().optional(),
    agenciaId: z.number().optional(),
    agenciaCourierEntregaId: z.number().optional(),
    observaciones: z.string().optional(),
    codigoPrecinto: z.string().optional(),
    sacaIds: z.array(z.number()).optional(),
  })
  .refine(
    (data) => {
      if (data.tipoEntrega === 'DOMICILIO') return data.consignatarioId != null && data.consignatarioId > 0;
      if (data.tipoEntrega === 'AGENCIA') return data.agenciaId != null && data.agenciaId > 0;
      if (data.tipoEntrega === 'AGENCIA_COURIER_ENTREGA') return data.agenciaCourierEntregaId != null && data.agenciaCourierEntregaId > 0;
      return true;
    },
    { message: 'Domicilio requiere consignatario; Agencia requiere agencia; Punto de entrega requiere un punto de entrega del courier', path: ['consignatarioId'] }
  );

type FormValues = z.infer<typeof formSchema>;

function consignatarioLabel(d: Consignatario): string {
  const parts = [d.nombre];
  if (d.canton) parts.push(d.canton);
  if (d.codigo) parts.push(d.codigo);
  return parts.filter(Boolean).join(' — ');
}

function filterConsignatarios(list: Consignatario[], q: string): Consignatario[] {
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
  const { data: couriersEntrega = [] } = useCouriersEntrega();
  const { data: agencias = [] } = useAgenciasOperario();
  const { data: consignatarios = [] } = useConsignatariosOperario();
  const { data: sacas = [] } = useSacasOperario(true);
  const createMutation = useCreateDespacho();
  const [destSearch, setDestSearch] = useState('');
  const [destOpen, setDestOpen] = useState(false);
  const destRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numeroGuia: '',
      courierEntregaId: 0,
      tipoEntrega: 'DOMICILIO' as TipoEntrega,
      consignatarioId: undefined,
      agenciaId: undefined,
      agenciaCourierEntregaId: undefined,
      observaciones: '',
      codigoPrecinto: '',
      sacaIds: [],
    },
  });

  const tipoEntrega = form.watch('tipoEntrega');
  const courierEntregaIdForm = form.watch('courierEntregaId');
  const agenciaIdValue = form.watch('agenciaId');
  const agenciaCourierEntregaIdValue = form.watch('agenciaCourierEntregaId');
  const { data: puntosEntrega = [] } = useAgenciasCourierEntrega(
    tipoEntrega === 'AGENCIA_COURIER_ENTREGA' && courierEntregaIdForm != null && courierEntregaIdForm > 0 ? courierEntregaIdForm : null
  );
  const selectedDestId = form.watch('consignatarioId');
  const selectedDest = consignatarios.find((d) => d.id === selectedDestId);
  const filteredDest = filterConsignatarios(consignatarios, destSearch);

  useEffect(() => {
    if (tipoEntrega === 'AGENCIA') {
      form.setValue('consignatarioId', undefined);
      form.setValue('agenciaCourierEntregaId', undefined);
    } else if (tipoEntrega === 'AGENCIA_COURIER_ENTREGA') {
      form.setValue('consignatarioId', undefined);
      form.setValue('agenciaId', undefined);
    } else {
      form.setValue('agenciaId', undefined);
      form.setValue('agenciaCourierEntregaId', undefined);
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
    const consignatarioId =
      values.tipoEntrega === 'DOMICILIO' && values.consignatarioId != null && !Number.isNaN(values.consignatarioId) && values.consignatarioId > 0
        ? values.consignatarioId
        : undefined;
    const agenciaId =
      values.tipoEntrega === 'AGENCIA' && values.agenciaId != null && !Number.isNaN(values.agenciaId) && values.agenciaId > 0
        ? values.agenciaId
        : undefined;
    const agenciaCourierEntregaId =
      values.tipoEntrega === 'AGENCIA_COURIER_ENTREGA' && values.agenciaCourierEntregaId != null && !Number.isNaN(values.agenciaCourierEntregaId) && values.agenciaCourierEntregaId > 0
        ? values.agenciaCourierEntregaId
        : undefined;
    if (values.tipoEntrega === 'DOMICILIO' && !consignatarioId) {
      toast.error('Selecciona un consignatario');
      return;
    }
    if (values.tipoEntrega === 'AGENCIA' && !agenciaId) {
      toast.error('Selecciona una agencia');
      return;
    }
    if (values.tipoEntrega === 'AGENCIA_COURIER_ENTREGA' && !agenciaCourierEntregaId) {
      toast.error('Selecciona un punto de entrega');
      return;
    }
    try {
      await createMutation.mutateAsync({
        numeroGuia: values.numeroGuia.trim(),
        courierEntregaId: values.courierEntregaId,
        tipoEntrega: values.tipoEntrega,
        consignatarioId: values.tipoEntrega === 'DOMICILIO' ? consignatarioId : undefined,
        agenciaId: values.tipoEntrega === 'AGENCIA' ? agenciaId : undefined,
        agenciaCourierEntregaId: values.tipoEntrega === 'AGENCIA_COURIER_ENTREGA' ? agenciaCourierEntregaId : undefined,
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
              placeholder="Guía del courier de entrega"
            />
            {form.formState.errors.numeroGuia && (
              <p className="mt-1 text-sm text-[var(--color-destructive)]">
                {form.formState.errors.numeroGuia.message}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-1 block">
              Courier de entrega
            </Label>
            <Select
              value={courierEntregaIdForm > 0 ? String(courierEntregaIdForm) : undefined}
              onValueChange={(value) => {
                form.setValue('courierEntregaId', Number(value), { shouldValidate: true, shouldDirty: true });
              }}
            >
              <SelectTrigger variant="clean">
                <SelectValue placeholder="Seleccione courier de entrega" />
              </SelectTrigger>
              <SelectContent>
                {couriersEntrega.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.nombre} ({d.codigo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.courierEntregaId && (
              <p className="mt-1 text-sm text-[var(--color-destructive)]">
                {form.formState.errors.courierEntregaId.message}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-2 block">Tipo de entrega</Label>
            <RadioCards
              value={tipoEntrega}
              onValueChange={(value) => form.setValue('tipoEntrega', value as TipoEntrega)}
              options={[
                { value: 'DOMICILIO', title: 'Domicilio', description: 'Entrega directa al consignatario.' },
                { value: 'AGENCIA', title: 'Agencia', description: 'Entrega en agencia según zona.' },
                { value: 'AGENCIA_COURIER_ENTREGA', title: 'Punto de entrega', description: 'Entrega en punto del courier de entrega.' },
              ]}
            />
          </div>

          {tipoEntrega === 'DOMICILIO' && (
            <div ref={destRef} className="relative">
              <Label className="mb-1 block">
                Consignatario
              </Label>
              <Input
                type="text"
                value={selectedDest ? consignatarioLabel(selectedDest) : destSearch}
                onChange={(e) => {
                  setDestSearch(e.target.value);
                  setDestOpen(true);
                  if (selectedDestId) form.setValue('consignatarioId', undefined);
                }}
                onFocus={() => setDestOpen(true)}
                placeholder="Buscar por nombre, cantón o código..."
              />
              {destOpen && (
                <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border border-[var(--color-border)] bg-[var(--color-background)] py-1">
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
                          form.setValue('consignatarioId', d.id);
                          setDestSearch(consignatarioLabel(d));
                          setDestOpen(false);
                        }}
                      >
                        {consignatarioLabel(d)}
                      </li>
                    ))
                  )}
                </ul>
              )}
              {form.formState.errors.consignatarioId && (
                <p className="mt-1 text-sm text-[var(--color-destructive)]">
                  {form.formState.errors.consignatarioId.message}
                </p>
              )}
            </div>
          )}

          {tipoEntrega === 'AGENCIA' && (
            <div>
              <Label className="mb-1 block">
                Agencia
              </Label>
              <Select
                value={agenciaIdValue != null && agenciaIdValue > 0 ? String(agenciaIdValue) : undefined}
                onValueChange={(value) => {
                  form.setValue('agenciaId', Number(value), { shouldValidate: true, shouldDirty: true });
                }}
              >
                <SelectTrigger variant="clean">
                  <SelectValue placeholder="Seleccione agencia" />
                </SelectTrigger>
                <SelectContent>
                  {agencias.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.nombre} ({a.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.agenciaId && (
                <p className="mt-1 text-sm text-[var(--color-destructive)]">
                  {form.formState.errors.agenciaId.message}
                </p>
              )}
            </div>
          )}

          {tipoEntrega === 'AGENCIA_COURIER_ENTREGA' && (
            <div>
              <Label className="mb-1 block">
                Punto de entrega
              </Label>
              <Select
                value={agenciaCourierEntregaIdValue != null && agenciaCourierEntregaIdValue > 0 ? String(agenciaCourierEntregaIdValue) : undefined}
                onValueChange={(value) => {
                  form.setValue('agenciaCourierEntregaId', Number(value), { shouldValidate: true, shouldDirty: true });
                }}
              >
                <SelectTrigger variant="clean">
                  <SelectValue placeholder="Seleccione punto de entrega" />
                </SelectTrigger>
                <SelectContent>
                  {puntosEntrega.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {agenciaCourierEntregaEtiqueta(a)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.agenciaCourierEntregaId && (
                <p className="mt-1 text-sm text-[var(--color-destructive)]">
                  {form.formState.errors.agenciaCourierEntregaId.message}
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
