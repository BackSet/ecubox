import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Boxes,
  CircleDollarSign,
  FileSpreadsheet,
  FileText,
  Loader2,
  LockKeyhole,
  Pencil,
  Plus,
  Save,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  Unlock,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SurfaceCard } from '@/components/ui/surface-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { KpiCard } from '@/components/KpiCard';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DetailHeaderSkeleton } from '@/components/skeletons/DetailHeaderSkeleton';
import { KpiCardsGridSkeleton } from '@/components/skeletons/KpiCardSkeleton';
import { SurfaceCardSkeleton } from '@/components/skeletons/SurfaceCardSkeleton';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api/error-message';
import {
  descargarLiquidacionPdf,
  descargarLiquidacionXlsx,
} from '@/lib/api/liquidacion.service';
import {
  useActualizarHeaderLiquidacion,
  useEliminarConsolidadoLinea,
  useEliminarDespachoLinea,
  useLiquidacion,
  useMarcarLiquidacionNoPagada,
  useMarcarLiquidacionPagada,
} from '@/hooks/useLiquidacion';
import type {
  LiquidacionConsolidadoLinea,
  LiquidacionDespachoLinea,
} from '@/types/liquidacion';
import { AgregarConsolidadoDialog } from './AgregarConsolidadoDialog';
import { AgregarDespachoDialog } from './AgregarDespachoDialog';
import { formatMoney, formatNumber } from './moneyFormat';

const headerSchema = z
  .object({
    fechaDocumento: z.string().min(1, 'Selecciona la fecha del documento'),
    periodoDesde: z.string().optional().or(z.literal('')),
    periodoHasta: z.string().optional().or(z.literal('')),
    notas: z.string().max(2000).optional().or(z.literal('')),
  })
  .refine(
    (v) => {
      if (!v.periodoDesde || !v.periodoHasta) return true;
      return v.periodoDesde <= v.periodoHasta;
    },
    {
      message: 'El período "desde" no puede ser posterior a "hasta"',
      path: ['periodoHasta'],
    },
  );

type HeaderFormValues = z.infer<typeof headerSchema>;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDateTime(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString();
}

export function LiquidacionDetailPage() {
  const navigate = useNavigate();
  const { id: idParam } = useParams({ from: '/liquidaciones/$id' });
  const id = Number(idParam);

  const { data: liq, isLoading, error } = useLiquidacion(id);

  const actualizarHeader = useActualizarHeaderLiquidacion(id);
  const eliminarCons = useEliminarConsolidadoLinea(id);
  const eliminarDesp = useEliminarDespachoLinea(id);
  const marcarPagada = useMarcarLiquidacionPagada(id);
  const marcarNoPagada = useMarcarLiquidacionNoPagada(id);

  const [openAddCons, setOpenAddCons] = useState(false);
  const [editCons, setEditCons] = useState<LiquidacionConsolidadoLinea | null>(null);
  const [openAddDesp, setOpenAddDesp] = useState(false);
  const [editDesp, setEditDesp] = useState<LiquidacionDespachoLinea | null>(null);
  const [confirmDelCons, setConfirmDelCons] =
    useState<LiquidacionConsolidadoLinea | null>(null);
  const [confirmDelDesp, setConfirmDelDesp] =
    useState<LiquidacionDespachoLinea | null>(null);
  const [confirmPay, setConfirmPay] = useState(false);
  const [confirmUnpay, setConfirmUnpay] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);

  const headerForm = useForm<HeaderFormValues>({
    resolver: zodResolver(headerSchema),
    defaultValues: {
      fechaDocumento: liq?.fechaDocumento ?? '',
      periodoDesde: liq?.periodoDesde ?? '',
      periodoHasta: liq?.periodoHasta ?? '',
      notas: liq?.notas ?? '',
    },
  });

  useEffect(() => {
    if (liq) {
      headerForm.reset({
        fechaDocumento: liq.fechaDocumento,
        periodoDesde: liq.periodoDesde ?? '',
        periodoHasta: liq.periodoHasta ?? '',
        notas: liq.notas ?? '',
      });
    }
  }, [liq, headerForm]);

  const isPagada = liq?.estadoPago === 'PAGADO';
  const headerDisabled = isPagada || actualizarHeader.isPending;

  const margen = Number(liq?.margenBruto ?? 0);
  const distribucion = Number(liq?.totalCostoDistribucion ?? 0);
  const neto = Number(liq?.ingresoNeto ?? 0);

  const consolidados = useMemo(() => liq?.consolidados ?? [], [liq?.consolidados]);
  const despachos = useMemo(() => liq?.despachos ?? [], [liq?.despachos]);

  async function onSubmitHeader(values: HeaderFormValues) {
    try {
      await actualizarHeader.mutateAsync({
        fechaDocumento: values.fechaDocumento,
        periodoDesde: values.periodoDesde || undefined,
        periodoHasta: values.periodoHasta || undefined,
        notas: values.notas?.trim() ? values.notas.trim() : undefined,
      });
      toast.success('Cabecera guardada');
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'Error al guardar la cabecera');
    }
  }

  async function handleEliminarCons() {
    if (!confirmDelCons) return;
    try {
      await eliminarCons.mutateAsync(confirmDelCons.id);
      toast.success('Consolidado eliminado de la liquidación');
      setConfirmDelCons(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'Error al eliminar la línea');
    }
  }

  async function handleEliminarDesp() {
    if (!confirmDelDesp) return;
    try {
      await eliminarDesp.mutateAsync(confirmDelDesp.id);
      toast.success('Despacho eliminado de la liquidación');
      setConfirmDelDesp(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'Error al eliminar la línea');
    }
  }

  async function handleMarcarPagada() {
    try {
      await marcarPagada.mutateAsync();
      toast.success('Liquidación marcada como pagada');
      setConfirmPay(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'Error al marcar como pagada');
    }
  }

  async function handleMarcarNoPagada() {
    try {
      await marcarNoPagada.mutateAsync();
      toast.success('Liquidación marcada como no pagada');
      setConfirmUnpay(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'Error al marcar como no pagada');
    }
  }

  async function handleDownloadPdf() {
    if (!liq) return;
    setExportingPdf(true);
    try {
      const blob = await descargarLiquidacionPdf(liq.id);
      downloadBlob(blob, `${liq.codigo}.pdf`);
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'No se pudo descargar el PDF');
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleDownloadXlsx() {
    if (!liq) return;
    setExportingXlsx(true);
    try {
      const blob = await descargarLiquidacionXlsx(liq.id);
      downloadBlob(blob, `${liq.codigo}.xlsx`);
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'No se pudo descargar el Excel');
    } finally {
      setExportingXlsx(false);
    }
  }

  if (isLoading) {
    return (
      <div className="page-stack" aria-busy="true" aria-live="polite">
        <DetailHeaderSkeleton badges={2} metaLines={2} />
        <KpiCardsGridSkeleton count={4} />
        <SurfaceCardSkeleton bodyLines={4} />
        <span className="sr-only">Cargando liquidación...</span>
      </div>
    );
  }

  if (error || !liq) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" onClick={() => navigate({ to: '/liquidaciones' })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <div className="ui-alert ui-alert-error">
          No se pudo cargar la liquidación.
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: '/liquidaciones' })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al listado
      </Button>

      {/* Header del documento */}
      <SurfaceCard className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <Wallet className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Liquidación periódica
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="break-all font-mono text-xl font-semibold leading-tight text-foreground">
                  {liq.codigo}
                </h1>
                <PagoChip
                  isPagada={isPagada}
                  fechaPago={liq.fechaPago}
                  pagadoPor={liq.pagadoPorUsername}
                />
              </div>
              {liq.createdAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Creado el {formatDateTime(liq.createdAt)}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={exportingPdf}
            >
              {exportingPdf ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-1.5 h-4 w-4" />
              )}
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadXlsx}
              disabled={exportingXlsx}
            >
              {exportingXlsx ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              )}
              Excel
            </Button>
            {!isPagada ? (
              <Button
                size="sm"
                onClick={() => setConfirmPay(true)}
                disabled={
                  consolidados.length === 0 && despachos.length === 0
                }
                title={
                  consolidados.length === 0 && despachos.length === 0
                    ? 'Agrega al menos un consolidado o despacho'
                    : 'Marcar como pagada'
                }
              >
                <CircleDollarSign className="mr-1.5 h-4 w-4" />
                Marcar pagada
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmUnpay(true)}
              >
                <Unlock className="mr-1.5 h-4 w-4" />
                Reabrir (marcar no pagada)
              </Button>
            )}
          </div>
        </div>

        {/* Form cabecera */}
        <form
          onSubmit={headerForm.handleSubmit(onSubmitHeader)}
          className="mt-5 grid gap-4 border-t border-[var(--color-border)] pt-4 md:grid-cols-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="fechaDocumento" className="text-xs">
              Fecha del documento <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={headerForm.control}
              name="fechaDocumento"
              render={({ field, fieldState }) => (
                <>
                  <Input
                    id="fechaDocumento"
                    type="date"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={headerDisabled}
                    aria-invalid={!!fieldState.error}
                  />
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="periodoDesde" className="text-xs">
              Período desde
            </Label>
            <Controller
              control={headerForm.control}
              name="periodoDesde"
              render={({ field }) => (
                <Input
                  id="periodoDesde"
                  type="date"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  disabled={headerDisabled}
                />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="periodoHasta" className="text-xs">
              Período hasta
            </Label>
            <Controller
              control={headerForm.control}
              name="periodoHasta"
              render={({ field, fieldState }) => (
                <>
                  <Input
                    id="periodoHasta"
                    type="date"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    disabled={headerDisabled}
                    aria-invalid={!!fieldState.error}
                  />
                  {fieldState.error && (
                    <p className="text-xs text-destructive">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <Label htmlFor="notas" className="text-xs">
              Notas
            </Label>
            <Controller
              control={headerForm.control}
              name="notas"
              render={({ field }) => (
                <Textarea
                  id="notas"
                  rows={2}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  disabled={headerDisabled}
                  placeholder="Observaciones internas (opcional)"
                />
              )}
            />
          </div>

          <div className="md:col-span-3 flex items-center justify-between">
            {isPagada ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <LockKeyhole className="h-3.5 w-3.5" />
                Liquidación pagada: la cabecera y las líneas no se pueden modificar.
              </p>
            ) : (
              <span />
            )}
            <Button
              type="submit"
              size="sm"
              disabled={!headerForm.formState.isDirty || headerDisabled}
            >
              {actualizarHeader.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Guardar cabecera
                </>
              )}
            </Button>
          </div>
        </form>
      </SurfaceCard>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<Boxes className="h-5 w-5" />}
          label="Consolidados"
          value={consolidados.length}
          tone="primary"
        />
        <KpiCard
          icon={<Truck className="h-5 w-5" />}
          label="Despachos"
          value={despachos.length}
          tone="primary"
        />
        <KpiCard
          icon={
            margen >= 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )
          }
          label="Margen bruto"
          value={formatMoney(margen)}
          tone={margen >= 0 ? 'success' : 'warning'}
          hint={`Distribución: ${formatMoney(distribucion)}`}
        />
        <KpiCard
          icon={
            neto >= 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )
          }
          label="Ingreso neto"
          value={formatMoney(neto)}
          tone={neto >= 0 ? 'success' : 'warning'}
          hint="Margen − Distribución"
        />
      </div>

      {/* Sección A: Consolidados */}
      <SeccionConsolidados
        consolidados={consolidados}
        disabled={isPagada}
        onAdd={() => {
          setEditCons(null);
          setOpenAddCons(true);
        }}
        onEdit={(c) => {
          setEditCons(c);
          setOpenAddCons(true);
        }}
        onDelete={(c) => setConfirmDelCons(c)}
      />

      {/* Sección B: Despachos */}
      <SeccionDespachos
        despachos={despachos}
        disabled={isPagada}
        onAdd={() => {
          setEditDesp(null);
          setOpenAddDesp(true);
        }}
        onEdit={(d) => {
          setEditDesp(d);
          setOpenAddDesp(true);
        }}
        onDelete={(d) => setConfirmDelDesp(d)}
      />

      {/* Resumen final */}
      <SurfaceCard className="p-4 sm:p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Resumen
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <ResumenLine
            label="Margen bruto (Sección A)"
            value={formatMoney(margen)}
            hint={`${consolidados.length} consolidado(s)`}
            tone={margen >= 0 ? 'success' : 'warning'}
          />
          <ResumenLine
            label="Costo de distribución (Sección B)"
            value={formatMoney(distribucion)}
            hint={`${despachos.length} despacho(s)`}
            tone="neutral"
            isExpense
          />
          <ResumenLine
            label="Ingreso neto"
            value={formatMoney(neto)}
            hint="Margen − Distribución"
            tone={neto >= 0 ? 'success' : 'warning'}
            emphasis
          />
        </div>
      </SurfaceCard>

      {/* Dialogs */}
      <AgregarConsolidadoDialog
        open={openAddCons}
        onOpenChange={(o) => {
          setOpenAddCons(o);
          if (!o) setEditCons(null);
        }}
        liquidacionId={liq.id}
        linea={editCons}
      />
      <AgregarDespachoDialog
        open={openAddDesp}
        onOpenChange={(o) => {
          setOpenAddDesp(o);
          if (!o) setEditDesp(null);
        }}
        liquidacionId={liq.id}
        tarifaDefault={liq.tarifaDefault}
        linea={editDesp}
      />

      <ConfirmDialog
        open={!!confirmDelCons}
        onOpenChange={(o) => !o && setConfirmDelCons(null)}
        title={`Eliminar ${confirmDelCons?.envioConsolidadoCodigo ?? 'consolidado'}`}
        description="El consolidado se quitará de esta liquidación y volverá a estar disponible para liquidar en otro documento."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={eliminarCons.isPending}
        onConfirm={handleEliminarCons}
      />
      <ConfirmDialog
        open={!!confirmDelDesp}
        onOpenChange={(o) => !o && setConfirmDelDesp(null)}
        title={`Eliminar ${confirmDelDesp?.despachoNumeroGuia ?? 'despacho'}`}
        description="El despacho se quitará de esta liquidación y volverá a estar disponible para liquidar en otro documento."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={eliminarDesp.isPending}
        onConfirm={handleEliminarDesp}
      />
      <ConfirmDialog
        open={confirmPay}
        onOpenChange={setConfirmPay}
        title="Marcar liquidación como pagada"
        description={`Se bloqueará la edición de la cabecera y de todas las líneas. Además, los consolidados (${consolidados.length}) asociados quedarán marcados como pagados.`}
        confirmLabel="Confirmar pago"
        loading={marcarPagada.isPending}
        onConfirm={handleMarcarPagada}
      />
      <ConfirmDialog
        open={confirmUnpay}
        onOpenChange={setConfirmUnpay}
        title="Reabrir liquidación"
        description={`Se permitirá editar las líneas nuevamente y los consolidados (${consolidados.length}) asociados volverán a estado no pagado.`}
        confirmLabel="Reabrir"
        variant="destructive"
        loading={marcarNoPagada.isPending}
        onConfirm={handleMarcarNoPagada}
      />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Sub componentes
// ----------------------------------------------------------------------------

function PagoChip({
  isPagada,
  fechaPago,
  pagadoPor,
}: {
  isPagada: boolean;
  fechaPago?: string;
  pagadoPor?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={cn(
          'inline-flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
          isPagada
            ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]'
            : 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
        )}
      >
        <CircleDollarSign className="h-3 w-3" />
        {isPagada ? 'Pagada' : 'No pagada'}
      </span>
      {isPagada && (
        <span className="text-[11px] text-muted-foreground">
          {formatDateTime(fechaPago)}
          {pagadoPor && ` · ${pagadoPor}`}
        </span>
      )}
    </div>
  );
}

function SeccionConsolidados({
  consolidados,
  disabled,
  onAdd,
  onEdit,
  onDelete,
}: {
  consolidados: LiquidacionConsolidadoLinea[];
  disabled: boolean;
  onAdd: () => void;
  onEdit: (c: LiquidacionConsolidadoLinea) => void;
  onDelete: (c: LiquidacionConsolidadoLinea) => void;
}) {
  const totalCosto = consolidados.reduce(
    (acc, c) => acc + Number(c.costoProveedor ?? 0),
    0,
  );
  const totalIngreso = consolidados.reduce(
    (acc, c) => acc + Number(c.ingresoCliente ?? 0),
    0,
  );
  const totalMargen = consolidados.reduce(
    (acc, c) => acc + Number(c.margenLinea ?? 0),
    0,
  );

  return (
    <SurfaceCard className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sección A
          </p>
          <h2 className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
            Costos al proveedor (USA → EC)
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cada envío consolidado se liquida en un único documento.
          </p>
        </div>
        <Button size="sm" onClick={onAdd} disabled={disabled}>
          <Plus className="mr-1.5 h-4 w-4" />
          Agregar consolidado
        </Button>
      </div>

      {consolidados.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={Boxes}
            title="Sin consolidados en esta liquidación"
            description="Agrega los envíos consolidados que el proveedor está cobrando en este período."
            action={
              !disabled ? (
                <Button size="sm" onClick={onAdd}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Agregar consolidado
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ListTableShell className="rounded-none border-0">
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead>Consolidado</TableHead>
                <TableHead className="text-right">Costo proveedor</TableHead>
                <TableHead className="text-right">Ingreso cliente</TableHead>
                <TableHead className="text-right">Margen</TableHead>
                <TableHead className="hidden lg:table-cell">Notas</TableHead>
                <TableHead className="w-[120px] text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {consolidados.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {c.envioConsolidadoCodigo}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {(c.envioConsolidadoTotalPaquetes ?? 0)} paq ·{' '}
                        {Number(c.envioConsolidadoPesoTotalLbs ?? 0).toFixed(2)} lbs
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatMoney(c.costoProveedor)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatMoney(c.ingresoCliente)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-mono text-sm font-semibold',
                      Number(c.margenLinea ?? 0) < 0
                        ? 'text-[var(--color-warning)]'
                        : 'text-[var(--color-success)]',
                    )}
                  >
                    {formatMoney(c.margenLinea)}
                  </TableCell>
                  <TableCell className="hidden max-w-[280px] truncate text-xs text-muted-foreground lg:table-cell">
                    {c.notas ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(c)}
                        disabled={disabled}
                        aria-label="Editar línea"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[var(--color-destructive)] hover:text-[var(--color-destructive)]"
                        onClick={() => onDelete(c)}
                        disabled={disabled}
                        aria-label="Eliminar línea"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              <TableRow className="bg-[var(--color-muted)]/30 font-semibold">
                <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">
                  Totales
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatMoney(totalCosto)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatMoney(totalIngreso)}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right font-mono text-sm',
                    totalMargen < 0
                      ? 'text-[var(--color-warning)]'
                      : 'text-[var(--color-success)]',
                  )}
                >
                  {formatMoney(totalMargen)}
                </TableCell>
                <TableCell className="hidden lg:table-cell" />
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </ListTableShell>
      )}
    </SurfaceCard>
  );
}

function SeccionDespachos({
  despachos,
  disabled,
  onAdd,
  onEdit,
  onDelete,
}: {
  despachos: LiquidacionDespachoLinea[];
  disabled: boolean;
  onAdd: () => void;
  onEdit: (d: LiquidacionDespachoLinea) => void;
  onDelete: (d: LiquidacionDespachoLinea) => void;
}) {
  const totalKg = despachos.reduce((acc, d) => acc + Number(d.pesoKg ?? 0), 0);
  const totalCosto = despachos.reduce(
    (acc, d) => acc + Number(d.costoCalculado ?? 0),
    0,
  );

  return (
    <SurfaceCard className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sección B
          </p>
          <h2 className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
            Costo del courier de entrega (dentro de EC)
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cada despacho aparece en una única liquidación. La tarifa que ingreses se
            promueve como tarifa por defecto del sistema.
          </p>
        </div>
        <Button size="sm" onClick={onAdd} disabled={disabled}>
          <Plus className="mr-1.5 h-4 w-4" />
          Agregar despacho
        </Button>
      </div>

      {despachos.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={Truck}
            title="Sin despachos en esta liquidación"
            description="Agrega los despachos enviados por courier de entrega en este período."
            action={
              !disabled ? (
                <Button size="sm" onClick={onAdd}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Agregar despacho
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ListTableShell className="rounded-none border-0">
          <Table className="min-w-[1080px]">
            <TableHeader>
              <TableRow>
                <TableHead>Despacho</TableHead>
                <TableHead className="text-right">Peso</TableHead>
                <TableHead className="text-right">Kg incl.</TableHead>
                <TableHead className="text-right">Precio fijo</TableHead>
                <TableHead className="text-right">$/kg adic.</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="hidden lg:table-cell">Notas</TableHead>
                <TableHead className="w-[120px] text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {despachos.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {d.despachoNumeroGuia ?? `#${d.despachoId}`}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {d.despachoCourierEntregaNombre ?? '—'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    <div className="flex flex-col">
                      <span>{formatNumber(d.pesoKg, 2)} kg</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatNumber(d.pesoLbs, 2)} lbs
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatNumber(d.kgIncluidos, 2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatMoney(d.precioFijo)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatMoney(d.precioKgAdicional)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold text-[var(--color-primary)]">
                    {formatMoney(d.costoCalculado)}
                  </TableCell>
                  <TableCell className="hidden max-w-[260px] truncate text-xs text-muted-foreground lg:table-cell">
                    {d.notas ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(d)}
                        disabled={disabled}
                        aria-label="Editar línea"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[var(--color-destructive)] hover:text-[var(--color-destructive)]"
                        onClick={() => onDelete(d)}
                        disabled={disabled}
                        aria-label="Eliminar línea"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              <TableRow className="bg-[var(--color-muted)]/30 font-semibold">
                <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">
                  Totales
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatNumber(totalKg, 2)} kg
                </TableCell>
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell className="text-right font-mono text-sm text-[var(--color-primary)]">
                  {formatMoney(totalCosto)}
                </TableCell>
                <TableCell className="hidden lg:table-cell" />
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </ListTableShell>
      )}
    </SurfaceCard>
  );
}

function ResumenLine({
  label,
  value,
  hint,
  tone,
  isExpense,
  emphasis,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: 'success' | 'warning' | 'neutral';
  isExpense?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-md border p-3',
        emphasis
          ? 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5'
          : 'border-[var(--color-border)] bg-[var(--color-muted)]/20',
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-2 text-right font-mono text-2xl font-bold',
          tone === 'success' && 'text-[var(--color-success)]',
          tone === 'warning' && 'text-[var(--color-warning)]',
          tone === 'neutral' && 'text-foreground',
        )}
      >
        {isExpense && value !== '$ 0.00' ? `− ${value}` : value}
      </p>
      {hint && (
        <p className="mt-1 text-right text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
