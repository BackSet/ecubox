import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  FileText,
  Home,
  Info,
  Truck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  useManifiesto,
  useCreateManifiesto,
  useUpdateManifiesto,
} from '@/hooks/useManifiestos';
import { useDespachos } from '@/hooks/useOperarioDespachos';
import type { ManifiestoRequest } from '@/types/manifiesto';

const formSchema = z
  .object({
    fechaInicio: z.string().min(1, 'La fecha de inicio es obligatoria'),
    fechaFin: z.string().min(1, 'La fecha de fin es obligatoria'),
  })
  .refine((data) => new Date(data.fechaFin) >= new Date(data.fechaInicio), {
    message: 'La fecha de fin debe ser mayor o igual a la fecha de inicio',
    path: ['fechaFin'],
  });

type FormValues = z.infer<typeof formSchema>;

interface ManifiestoFormProps {
  id?: number;
  onClose: () => void;
  onSuccess: () => void;
}

function isoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

interface Preset {
  id: string;
  label: string;
  range: () => { fechaInicio: string; fechaFin: string };
}

const PRESETS: Preset[] = [
  {
    id: 'hoy',
    label: 'Hoy',
    range: () => {
      const t = new Date();
      return { fechaInicio: isoDate(t), fechaFin: isoDate(t) };
    },
  },
  {
    id: 'ayer',
    label: 'Ayer',
    range: () => {
      const t = new Date();
      t.setDate(t.getDate() - 1);
      return { fechaInicio: isoDate(t), fechaFin: isoDate(t) };
    },
  },
  {
    id: '7d',
    label: 'Últimos 7 días',
    range: () => {
      const fin = new Date();
      const inicio = new Date();
      inicio.setDate(inicio.getDate() - 6);
      return { fechaInicio: isoDate(inicio), fechaFin: isoDate(fin) };
    },
  },
  {
    id: '15d',
    label: 'Últimos 15 días',
    range: () => {
      const fin = new Date();
      const inicio = new Date();
      inicio.setDate(inicio.getDate() - 14);
      return { fechaInicio: isoDate(inicio), fechaFin: isoDate(fin) };
    },
  },
  {
    id: 'mesActual',
    label: 'Mes actual',
    range: () => {
      const hoy = new Date();
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      return { fechaInicio: isoDate(inicio), fechaFin: isoDate(hoy) };
    },
  },
  {
    id: 'mesPasado',
    label: 'Mes pasado',
    range: () => {
      const hoy = new Date();
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      return { fechaInicio: isoDate(inicio), fechaFin: isoDate(fin) };
    },
  },
];

function fmtFechaCorta(s?: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function diasEntre(inicio: string, fin: string): number | null {
  const a = new Date(inicio);
  const b = new Date(fin);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const ms = b.getTime() - a.getTime();
  if (ms < 0) return null;
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

export function ManifiestoForm({ id, onClose, onSuccess }: ManifiestoFormProps) {
  const isEdit = id != null;
  const { data: manifiesto } = useManifiesto(id);
  const createMutation = useCreateManifiesto();
  const updateMutation = useUpdateManifiesto();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fechaInicio: '',
      fechaFin: '',
    },
    mode: 'onChange',
  });

  // Cargar todos los despachos para vista previa (solo cuando es necesario).
  // En edición, usamos los del manifiesto existente.
  const { data: todosDespachos = [] } = useDespachos();

  useEffect(() => {
    if (isEdit && manifiesto) {
      form.reset({
        fechaInicio: manifiesto.fechaInicio,
        fechaFin: manifiesto.fechaFin,
      });
    } else if (!isEdit) {
      // Por defecto al abrir "Nuevo", precargar con "Mes actual"
      const preset = PRESETS.find((p) => p.id === 'mesActual')!.range();
      form.reset(preset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, manifiesto]);

  const fechaInicio = form.watch('fechaInicio');
  const fechaFin = form.watch('fechaFin');

  const dias = useMemo(() => {
    if (!fechaInicio || !fechaFin) return null;
    return diasEntre(fechaInicio, fechaFin);
  }, [fechaInicio, fechaFin]);

  const preview = useMemo(() => {
    if (!fechaInicio || !fechaFin || dias == null || dias <= 0) {
      return null;
    }
    const inicio = startOfDay(new Date(fechaInicio));
    const fin = endOfDay(new Date(fechaFin));
    const enRango = todosDespachos.filter((d) => {
      if (!d.fechaHora) return false;
      const dd = new Date(d.fechaHora);
      return dd >= inicio && dd <= fin;
    });
    const total = enRango.length;
    const domicilio = enRango.filter((d) => d.tipoEntrega === 'DOMICILIO').length;
    const agencia = enRango.filter((d) => d.tipoEntrega === 'AGENCIA').length;
    const agenciaDist = enRango.filter((d) => d.tipoEntrega === 'AGENCIA_DISTRIBUIDOR').length;
    const distribuidores = new Set(enRango.map((d) => d.distribuidorNombre).filter(Boolean));
    return {
      total,
      domicilio,
      agencia,
      agenciaDist,
      distribuidores: distribuidores.size,
    };
  }, [todosDespachos, fechaInicio, fechaFin, dias]);

  const activePresetId = useMemo(() => {
    if (!fechaInicio || !fechaFin) return null;
    return PRESETS.find((p) => {
      const r = p.range();
      return r.fechaInicio === fechaInicio && r.fechaFin === fechaFin;
    })?.id;
  }, [fechaInicio, fechaFin]);

  function aplicarPreset(preset: Preset) {
    const r = preset.range();
    form.setValue('fechaInicio', r.fechaInicio, { shouldValidate: true, shouldDirty: true });
    form.setValue('fechaFin', r.fechaFin, { shouldValidate: true, shouldDirty: true });
  }

  async function onSubmit(values: FormValues) {
    const body: ManifiestoRequest = {
      fechaInicio: values.fechaInicio,
      fechaFin: values.fechaFin,
      filtroTipo: 'POR_PERIODO',
    };
    try {
      if (isEdit && id != null) {
        await updateMutation.mutateAsync({ id, body });
      } else {
        await createMutation.mutateAsync(body);
      }
      onSuccess();
    } catch {
      // Error manejado por toast en el hook
    }
  }

  const loading = createMutation.isPending || updateMutation.isPending;
  const hasErrors = !!form.formState.errors.fechaInicio || !!form.formState.errors.fechaFin;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle>
                {isEdit ? 'Editar manifiesto' : 'Nuevo manifiesto'}
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {isEdit
                  ? 'Ajusta el período del manifiesto. Los despachos se recalculan automáticamente.'
                  : 'Selecciona el período de despachos para liquidar. Se autoasignarán los despachos del rango al guardar.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {isEdit && manifiesto?.codigo && (
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-2">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Código del manifiesto
              </Label>
              <p className="mt-0.5 font-mono text-sm font-medium text-foreground">
                {manifiesto.codigo}
              </p>
            </div>
          )}

          {/* Presets de período */}
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Atajos de período
              </Label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => aplicarPreset(p)}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs font-medium transition',
                    activePresetId === p.id
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] bg-card text-muted-foreground hover:bg-[var(--color-muted)] hover:text-foreground',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fechaInicio" className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                Fecha de inicio *
              </Label>
              <Input
                id="fechaInicio"
                type="date"
                {...form.register('fechaInicio')}
                aria-invalid={!!form.formState.errors.fechaInicio}
                className={cn(form.formState.errors.fechaInicio && 'border-[var(--color-destructive)]')}
              />
              {form.formState.errors.fechaInicio ? (
                <p className="text-xs text-[var(--color-destructive)]">
                  {form.formState.errors.fechaInicio.message}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {fmtFechaCorta(fechaInicio)}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fechaFin" className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                Fecha de fin *
              </Label>
              <Input
                id="fechaFin"
                type="date"
                {...form.register('fechaFin')}
                aria-invalid={!!form.formState.errors.fechaFin}
                className={cn(form.formState.errors.fechaFin && 'border-[var(--color-destructive)]')}
              />
              {form.formState.errors.fechaFin ? (
                <p className="text-xs text-[var(--color-destructive)]">
                  {form.formState.errors.fechaFin.message}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {fmtFechaCorta(fechaFin)}
                </p>
              )}
            </div>
          </div>

          {/* Vista previa */}
          {!hasErrors && fechaInicio && fechaFin && dias != null && dias > 0 && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                    Vista previa del período
                  </span>
                </div>
                <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                  {dias} {dias === 1 ? 'día' : 'días'}
                </span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Del <span className="font-medium text-foreground">{fmtFechaCorta(fechaInicio)}</span>{' '}
                al <span className="font-medium text-foreground">{fmtFechaCorta(fechaFin)}</span>
              </p>

              {!isEdit && preview && (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <PreviewCard
                      icon={<Truck className="h-3.5 w-3.5" />}
                      label="Despachos"
                      value={preview.total}
                      tone="primary"
                    />
                    <PreviewCard
                      icon={<Home className="h-3.5 w-3.5" />}
                      label="Domicilio"
                      value={preview.domicilio}
                    />
                    <PreviewCard
                      icon={<Building2 className="h-3.5 w-3.5" />}
                      label="Agencia"
                      value={preview.agencia + preview.agenciaDist}
                    />
                    <PreviewCard
                      icon={<Building2 className="h-3.5 w-3.5" />}
                      label="Distribuidores"
                      value={preview.distribuidores}
                    />
                  </div>
                  {preview.total === 0 ? (
                    <div className="mt-3 flex items-start gap-1.5 rounded-md border border-amber-300/50 bg-amber-50 px-2.5 py-2 text-xs text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/30 dark:text-amber-200">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        No hay despachos registrados en este período. Puedes crear el manifiesto de
                        todas formas y agregar despachos manualmente luego.
                      </span>
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Se autoasignarán <strong className="text-foreground">{preview.total}</strong>{' '}
                      despacho{preview.total === 1 ? '' : 's'} al manifiesto al guardar.
                    </p>
                  )}
                </>
              )}

              {isEdit && (
                <p className="text-xs text-muted-foreground">
                  Los despachos del manifiesto se recalcularán según el nuevo período tras guardar.
                </p>
              )}
            </div>
          )}

          {/* Nota informativa */}
          <div className="flex items-start gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3 py-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
            <span>
              Los filtros por <strong>distribuidor</strong> y <strong>agencia</strong> se aplican
              al momento de descargar el PDF/Excel desde el detalle del manifiesto.
            </span>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || hasErrors} className="gap-2">
              {loading ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Guardando...
                </>
              ) : isEdit ? (
                'Guardar cambios'
              ) : (
                'Crear manifiesto'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PreviewCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: 'primary';
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 rounded-md border p-2',
        tone === 'primary'
          ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5'
          : 'border-[var(--color-border)] bg-card',
      )}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide',
          tone === 'primary' ? 'text-[var(--color-primary)]' : 'text-muted-foreground',
        )}
      >
        {icon}
        {label}
      </span>
      <span
        className={cn(
          'text-lg font-bold tabular-nums',
          tone === 'primary' ? 'text-[var(--color-primary)]' : 'text-foreground',
        )}
      >
        {value}
      </span>
    </div>
  );
}
