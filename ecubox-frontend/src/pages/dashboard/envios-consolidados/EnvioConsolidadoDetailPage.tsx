import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Boxes,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Eraser,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Lock,
  Package as PackageIcon,
  PlaneLanding,
  Plus,
  Scale,
  Search,
  Trash2,
  Truck,
  Unlock,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { notify } from '@/lib/notify';
import { downloadBlob } from '@/lib/download';
import { Button } from '@/components/ui/button';
import { StatusBadge, getRastreoStatusTone } from '@/components/ui/StatusBadge';
import { Input } from '@/components/ui/input';
import { BulkGuiaInputPanel } from '@/components/BulkGuiaInputPanel';
import type { BulkGuiaTab } from '@/components/BulkGuiaInputPanel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { DetailHeaderSkeleton } from '@/components/skeletons/DetailHeaderSkeleton';
import { KpiCardsGridSkeleton } from '@/components/skeletons/KpiCardSkeleton';
import { SurfaceCardSkeleton } from '@/components/skeletons/SurfaceCardSkeleton';
import { SurfaceCard } from '@/components/ui/surface-card';
import { KpiCard } from '@/components/KpiCard';
import { ListTableShell } from '@/components/ListTableShell';
import { PesoCell, PESO_TABLE_CELL_CLASS, PESO_TABLE_HEAD_CLASS } from '@/components/PesoCell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  useAgregarPaquetesEnvioConsolidado,
  useDescargarManifiesto,
  useEnviarDesdeUsaEnvioConsolidado,
  useEnvioConsolidado,
  useReabrirEnvioConsolidado,
  useRemoverPaquetesEnvioConsolidado,
  useCerrarConsolidadoEnvioConsolidado,
  useArribarEcuadorEnvioConsolidado,
  useCancelarEnvioConsolidado,
} from '@/hooks/useEnviosConsolidados';
import { buscarPaquetesPorGuias } from '@/lib/api/paquetes.service';
import { validateGuiaList } from '@/lib/schemas';
import type { Paquete } from '@/types/paquete';
import {
  GuiaMasterPiezaCell,
  ConsignatarioCell,
} from '@/pages/dashboard/paquetes/PaqueteCells';
import {
  EnvioConsolidadoBadge,
  ENVIO_CONSOLIDADO_ESTADO_UI,
  resolveEstadoOperativoConsolidado,
} from './EnvioConsolidadoBadge';
import { useAuthStore } from '@/stores/authStore';

import { formatWeightFromValues, formatWeightInline, LBS_TO_KG } from '@/lib/utils/weight';

export function EnvioConsolidadoDetailPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const id = Number(params.id);
  const { data: envio, isLoading, error } = useEnvioConsolidado(id);
  const [agregarOpen, setAgregarOpen] = useState(false);
  const [confirmCerrar, setConfirmCerrar] = useState(false);
  const [confirmEnviarUsa, setConfirmEnviarUsa] = useState(false);
  const [confirmArribarEcuador, setConfirmArribarEcuador] = useState(false);
  const [confirmReabrir, setConfirmReabrir] = useState(false);
  const [confirmCancelar, setConfirmCancelar] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const cerrar = useCerrarConsolidadoEnvioConsolidado();
  const enviarUsa = useEnviarDesdeUsaEnvioConsolidado();
  const arribarEcuador = useArribarEcuadorEnvioConsolidado();
  const reabrir = useReabrirEnvioConsolidado();
  const cancelar = useCancelarEnvioConsolidado();
  const remover = useRemoverPaquetesEnvioConsolidado();
  const manifiestos = useDescargarManifiesto();
  const hasLiquidacionRead = useAuthStore((s) =>
    s.hasPermission('LIQUIDACION_CONSOLIDADO_READ'),
  );

  const paquetes = envio?.paquetes ?? [];
  const paquetesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return paquetes;
    return paquetes.filter((p) => {
      return (
        p.numeroGuia?.toLowerCase().includes(q) ||
        p.guiaMasterTrackingBase?.toLowerCase().includes(q) ||
        p.consignatarioNombre?.toLowerCase().includes(q) ||
        p.estadoRastreoNombre?.toLowerCase().includes(q) ||
        p.estadoRastreoCodigo?.toLowerCase().includes(q)
      );
    });
  }, [paquetes, busqueda]);

  const stats = useMemo(() => {
    let pesoLbs = 0;
    let conPeso = 0;
    let sinPeso = 0;
    for (const p of paquetes) {
      if (p.pesoLbs != null) {
        pesoLbs += Number(p.pesoLbs);
        conPeso += 1;
      } else {
        sinPeso += 1;
      }
    }
    return {
      total: paquetes.length,
      pesoLbs,
      pesoKg: pesoLbs * LBS_TO_KG,
      conPeso,
      sinPeso,
    };
  }, [paquetes]);

  if (isLoading) {
    return (
      <div className="page-stack" aria-busy="true" aria-live="polite">
        <DetailHeaderSkeleton badges={2} metaLines={2} />
        <KpiCardsGridSkeleton count={4} />
        <SurfaceCardSkeleton bodyLines={4} />
        <ListTableShell>
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Paquete</TableHead>
                <TableHead className="hidden md:table-cell">Consignatario</TableHead>
                <TableHead className={PESO_TABLE_HEAD_CLASS}>Peso</TableHead>
                <TableHead className="text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRowsSkeleton columns={4} columnClasses={{ 1: 'hidden md:table-cell' }} />
            </TableBody>
          </Table>
        </ListTableShell>
        <span className="sr-only">Cargando envío...</span>
      </div>
    );
  }
  if (error || !envio) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" onClick={() => navigate({ to: '/envios-consolidados' })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <div className="ui-alert ui-alert-error">
          No se pudo cargar el envío consolidado.
        </div>
      </div>
    );
  }

  const op = resolveEstadoOperativoConsolidado(envio);
  const puedeAdministrarPaquetes = op === 'VACIO' || op === 'EN_PREPARACION';

  async function handleCerrar() {
    try {
      await cerrar.mutateAsync(id);
      toast.success('Envío consolidado cerrado para registro');
      setConfirmCerrar(false);
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(res?.data?.message ?? 'Error al cerrar el envío');
    }
  }

  async function handleEnviarUsa() {
    try {
      await enviarUsa.mutateAsync(id);
      toast.success('Envío enviado desde USA');
      setConfirmEnviarUsa(false);
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(res?.data?.message ?? 'Error al enviar desde USA');
    }
  }

  async function handleArribarEcuador() {
    try {
      await arribarEcuador.mutateAsync(id);
      toast.success('Envío consolidado arribado a Ecuador');
      setConfirmArribarEcuador(false);
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(res?.data?.message ?? 'Error al registrar el arribo');
    }
  }

  async function handleReabrir() {
    try {
      await reabrir.mutateAsync(id);
      toast.success('Envío reabierto');
      setConfirmReabrir(false);
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(res?.data?.message ?? 'Error al reabrir el envío');
    }
  }

  async function handleCancelar() {
    try {
      await cancelar.mutateAsync(id);
      toast.success('Envío consolidado cancelado');
      setConfirmCancelar(false);
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(res?.data?.message ?? 'Error al cancelar el envío');
    }
  }

  async function handleQuitarPaquete(paqueteId: number) {
    try {
      await remover.mutateAsync({ id, body: { paqueteIds: [paqueteId] } });
      toast.success('Paquete removido del envío');
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(res?.data?.message ?? 'No se pudo remover el paquete');
    }
  }

  return (
    <div className="page-stack">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: '/envios-consolidados' })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      <SurfaceCard className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[var(--color-muted)] text-[var(--color-primary)]">
              <Boxes className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Envío consolidado
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="break-all font-mono text-xl font-semibold leading-tight text-foreground">
                  {envio.codigo}
                </h1>
                <CopyButton value={envio.codigo} title="Copiar código" />
                <EnvioConsolidadoBadge
                  cerrado={envio.cerrado}
                  estadoOperativo={resolveEstadoOperativoConsolidado(envio)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasLiquidacionRead && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: '/liquidaciones' })}
              >
                <Wallet className="mr-1.5 h-4 w-4" />
                Liquidaciones
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={manifiestos.pdf.isPending}
              onClick={async () => {
                try {
                  const blob = await notify.run(manifiestos.pdf.mutateAsync(id), {
                    loading: 'Generando PDF del manifiesto...',
                    success: 'PDF generado',
                    error: 'No se pudo generar el PDF',
                  });
                  downloadBlob(blob, `manifiesto-${envio.codigo}.pdf`);
                } catch {
                  // notificado por notify.run
                }
              }}
            >
              {manifiestos.pdf.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-1.5 h-4 w-4" />
              )}
              {manifiestos.pdf.isPending ? 'Generando PDF...' : 'PDF'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={manifiestos.xlsx.isPending}
              onClick={async () => {
                try {
                  const blob = await notify.run(manifiestos.xlsx.mutateAsync(id), {
                    loading: 'Generando Excel del manifiesto...',
                    success: 'Excel generado',
                    error: 'No se pudo generar el Excel',
                  });
                  downloadBlob(blob, `manifiesto-${envio.codigo}.xlsx`);
                } catch {
                  // notificado por notify.run
                }
              }}
            >
              {manifiestos.xlsx.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              )}
              {manifiestos.xlsx.isPending ? 'Generando Excel...' : 'Excel'}
            </Button>
            {op === 'EN_PREPARACION' && (
              <Button
                size="sm"
                disabled={cerrar.isPending}
                onClick={() => setConfirmCerrar(true)}
              >
                <Lock className="mr-1.5 h-4 w-4" />
                Cerrar envío
              </Button>
            )}
            {op === 'CERRADO' && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={reabrir.isPending}
                  onClick={() => setConfirmReabrir(true)}
                >
                  <Unlock className="mr-1.5 h-4 w-4" />
                  Reabrir
                </Button>
                <Button
                  size="sm"
                  disabled={enviarUsa.isPending}
                  onClick={() => setConfirmEnviarUsa(true)}
                >
                  <Truck className="mr-1.5 h-4 w-4" />
                  Enviar desde USA
                </Button>
              </>
            )}
            {op === 'ENVIADO_DESDE_USA' && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={reabrir.isPending}
                  onClick={() => setConfirmReabrir(true)}
                >
                  <Unlock className="mr-1.5 h-4 w-4" />
                  Reabrir
                </Button>
                <Button
                  size="sm"
                  disabled={arribarEcuador.isPending}
                  onClick={() => setConfirmArribarEcuador(true)}
                >
                  <PlaneLanding className="mr-1.5 h-4 w-4" />
                  Arribar a Ecuador
                </Button>
              </>
            )}
            {op !== 'LIQUIDADO' && op !== 'CANCELADO' && (
              <Button
                size="sm"
                variant="destructive"
                disabled={cancelar.isPending}
                onClick={() => setConfirmCancelar(true)}
              >
                <Ban className="mr-1.5 h-4 w-4" />
                Cancelar consolidado
              </Button>
            )}
          </div>
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<PackageIcon className="h-5 w-5" />}
          label="Paquetes"
          value={stats.total}
          tone="primary"
          hint={
            stats.sinPeso > 0
              ? `${stats.conPeso} con peso · ${stats.sinPeso} sin peso`
              : stats.total > 0
                ? 'Todos con peso registrado'
                : undefined
          }
        />
        <KpiCard
          icon={<Scale className="h-5 w-5" />}
          label="Peso total"
          value={stats.pesoLbs > 0 ? `${stats.pesoLbs.toFixed(2)} lbs` : '—'}
          tone="neutral"
          hint={stats.pesoLbs > 0 ? formatWeightInline(stats.pesoLbs, stats.pesoKg) : undefined}
        />
        <KpiCard
          icon={<Calendar className="h-5 w-5" />}
          label="Creado"
          value={shortDate(envio.createdAt) ?? '—'}
          tone="neutral"
          hint={relativeTime(envio.createdAt) ?? undefined}
        />
        {(() => {
          const ui = ENVIO_CONSOLIDADO_ESTADO_UI[op];
          const Icon = ui.icon;
          let value = '—';
          let hint = undefined;

          if (op === 'VACIO') {
            value = 'Vacío';
          } else if (op === 'EN_PREPARACION') {
            value = 'En preparación';
            hint = 'Se pueden agregar paquetes';
          } else if (op === 'CERRADO') {
            value = shortDate(envio.fechaCierre) ?? 'Cerrado';
            hint = envio.fechaCierre ? `Cerrado: ${relativeTime(envio.fechaCierre)}` : 'Fecha de cierre no registrada';
          } else if (op === 'ENVIADO_DESDE_USA') {
            value = shortDate(envio.fechaCerrado) ?? 'Enviado USA';
            hint = envio.fechaCerrado ? `Salida USA: ${relativeTime(envio.fechaCerrado)}` : 'Fecha de salida no registrada';
          } else if (op === 'ARRIBADO_ECUADOR') {
            value = shortDate(envio.fechaArriboEcuador) ?? 'Arribado EC';
            hint = envio.fechaArriboEcuador ? `Arribado: ${relativeTime(envio.fechaArriboEcuador)}` : 'Fecha de arribo no registrada';
          } else if (op === 'RECIBIDO_EN_BODEGA') {
            value = 'Recibido';
            hint = 'En Lote de recepción';
          } else if (op === 'LIQUIDADO') {
            value = 'Liquidado';
            hint = 'Cierre administrativo completo';
          } else if (op === 'CANCELADO') {
            value = 'Cancelado';
            hint = 'Envío consolidado anulado';
          }

          const kpiTone =
            ui.tone === 'error' ? 'danger' : ui.tone === 'info' ? 'info' : ui.tone;
          return (
            <KpiCard
              icon={<Icon className="h-5 w-5" />}
              label={ui.label}
              value={value}
              tone={kpiTone}
              hint={hint}
            />
          );
        })()}
      </div>

      <SurfaceCard className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="inline-flex items-center gap-2 text-base font-semibold">
              <PackageIcon className="h-4 w-4 text-[var(--color-primary)]" />
              Paquetes incluidos
              <span className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {paquetes.length}
              </span>
            </h2>
            {!puedeAdministrarPaquetes && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                Envío enviado desde USA: solo lectura. Reábrelo para gestionar paquetes.
              </p>
            )}
          </div>
          <div className="flex flex-1 items-center gap-2 sm:max-w-md sm:justify-end">
            {paquetes.length > 0 && (
              <div className="relative w-full sm:max-w-[260px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar guía, consignatario..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="h-8 pl-7 text-sm"
                />
              </div>
            )}
            {puedeAdministrarPaquetes && (
              <Button size="sm" onClick={() => setAgregarOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Agregar
              </Button>
            )}
          </div>
        </div>

        <PaquetesTable
          paquetes={paquetesFiltrados}
          totalSinFiltro={paquetes.length}
          puedeRemover={puedeAdministrarPaquetes}
          onRemover={handleQuitarPaquete}
          isRemoving={remover.isPending}
          onLimpiarBusqueda={() => setBusqueda('')}
          tieneBusqueda={busqueda.trim() !== ''}
        />
      </SurfaceCard>

      {agregarOpen && (
        <AgregarPaquetesDialog envioId={id} onClose={() => setAgregarOpen(false)} />
      )}
       <ConfirmDialog
        open={confirmCerrar}
        onOpenChange={setConfirmCerrar}
        title="Cerrar envío consolidado"
        description="Al cerrar el envío consolidado se detendrá el registro de nuevos paquetes y quedará bloqueado para modificaciones."
        confirmLabel="Cerrar envío"
        loading={cerrar.isPending}
        onConfirm={handleCerrar}
      />
      <ConfirmDialog
        open={confirmEnviarUsa}
        onOpenChange={setConfirmEnviarUsa}
        title="Enviar consolidado desde USA"
        description="Al marcar como enviado desde USA se registrará su salida desde origen."
        confirmLabel="Enviar desde USA"
        loading={enviarUsa.isPending}
        onConfirm={handleEnviarUsa}
      />
      <ConfirmDialog
        open={confirmArribarEcuador}
        onOpenChange={setConfirmArribarEcuador}
        title="Registrar arribo a Ecuador"
        description="Al registrar el arribo a Ecuador se marcará su llegada a aduana destino."
        confirmLabel="Arribar a Ecuador"
        loading={arribarEcuador.isPending}
        onConfirm={handleArribarEcuador}
      />
      <ConfirmDialog
        open={confirmReabrir}
        onOpenChange={setConfirmReabrir}
        title="Reabrir envío consolidado"
        description="El envío volverá al estado 'En preparación' y admitirá agregar y remover paquetes."
        confirmLabel="Reabrir"
        loading={reabrir.isPending}
        onConfirm={handleReabrir}
      />
      <ConfirmDialog
        open={confirmCancelar}
        onOpenChange={setConfirmCancelar}
        title="Cancelar envío consolidado"
        description="Al cancelar el envío consolidado quedará anulado permanentemente."
        confirmLabel="Cancelar"
        loading={cancelar.isPending}
        onConfirm={handleCancelar}
      />

      {hasLiquidacionRead && (
        <SurfaceCard className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Wallet className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground">Liquidaciones</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Las liquidaciones ahora son documentos periódicos independientes. Crea o
                  abre una liquidación desde el módulo dedicado para incluir este
                  consolidado entre las líneas de costo al proveedor.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate({ to: '/liquidaciones' })}>
              <Wallet className="mr-1.5 h-4 w-4" />
              Ir a liquidaciones
            </Button>
          </div>
        </SurfaceCard>
      )}
    </div>
  );
}

function CopyButton({ value, title }: { value: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar');
    }
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={title ?? 'Copiar'}
      title={title ?? 'Copiar'}
      className="rounded p-1 text-muted-foreground transition-colors hover:bg-[var(--color-muted)] hover:text-foreground"
    >
      {copied ? (
        <Check className="h-4 w-4 text-[var(--color-success)]" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}

function shortDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
}

function relativeTime(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = date.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  if (abs < 60) return rtf.format(diffSec, 'second');
  const min = Math.round(diffSec / 60);
  if (Math.abs(min) < 60) return rtf.format(min, 'minute');
  const hr = Math.round(min / 60);
  if (Math.abs(hr) < 24) return rtf.format(hr, 'hour');
  const day = Math.round(hr / 24);
  if (Math.abs(day) < 30) return rtf.format(day, 'day');
  const month = Math.round(day / 30);
  if (Math.abs(month) < 12) return rtf.format(month, 'month');
  const year = Math.round(month / 12);
  return rtf.format(year, 'year');
}

function PaquetesTable({
  paquetes,
  totalSinFiltro,
  puedeRemover,
  onRemover,
  isRemoving,
  tieneBusqueda,
  onLimpiarBusqueda,
}: {
  paquetes: Paquete[];
  totalSinFiltro: number;
  puedeRemover: boolean;
  onRemover: (id: number) => void;
  isRemoving: boolean;
  tieneBusqueda: boolean;
  onLimpiarBusqueda: () => void;
}) {
  if (totalSinFiltro === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-[var(--color-muted)]/20 p-6 text-center">
        <PackageIcon className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">
          Aún no hay paquetes asignados a este envío.
        </p>
      </div>
    );
  }
  if (paquetes.length === 0) {
    return (
      <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-[var(--color-muted)]/20 px-4 py-3 text-sm text-muted-foreground">
        <span>Sin coincidencias para tu búsqueda.</span>
        {tieneBusqueda && (
          <Button variant="ghost" size="sm" onClick={onLimpiarBusqueda}>
            <Eraser className="mr-1 h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}
      </div>
    );
  }
  return (
    <ListTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px] text-center">#</TableHead>
            <TableHead>Guía master / Pieza</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Consignatario</TableHead>
            <TableHead className={PESO_TABLE_HEAD_CLASS}>Peso</TableHead>
            <TableHead className="w-[100px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paquetes.map((p, idx) => (
            <TableRow key={p.id}>
              <TableCell className="text-center text-xs text-muted-foreground">
                {idx + 1}
              </TableCell>
              <TableCell>
                <GuiaMasterPiezaCell paquete={p} />
              </TableCell>
              <TableCell>
                <EstadoBadge
                  nombre={p.estadoRastreoNombre}
                  tipoFlujo={p.estadoRastreoTipoFlujo}
                  codigo={p.estadoRastreoCodigo}
                />
              </TableCell>
              <TableCell>
                <ConsignatarioCell paquete={p} />
              </TableCell>
              <TableCell className={PESO_TABLE_CELL_CLASS}>
                <PesoCell pesoLbs={p.pesoLbs} pesoKg={p.pesoKg} />
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Ver tracking"
                    aria-label="Ver tracking"
                    onClick={() => {
                      const url = `/tracking?numeroGuia=${encodeURIComponent(p.numeroGuia)}`;
                      window.open(url, '_blank', 'noopener');
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {puedeRemover && (
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isRemoving}
                      onClick={() => onRemover(p.id)}
                      title="Quitar del envío"
                      aria-label="Quitar del envío"
                      className="text-muted-foreground hover:text-[var(--color-destructive)]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ListTableShell>
  );
}

function EstadoBadge({
  nombre,
  codigo,
  tipoFlujo,
}: {
  nombre?: string | null;
  codigo?: string | null;
  tipoFlujo?: 'NORMAL' | 'ALTERNO' | null;
}) {
  const label = nombre ?? codigo ?? '—';
  return <StatusBadge tone={getRastreoStatusTone(tipoFlujo)}>{label}</StatusBadge>;
}

function bulkTextToGuiaLines(raw: string): string {
  return raw
    .split(/[\r\n,;]+/)
    .map((s) => s.replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function AgregarPaquetesDialog({
  envioId,
  onClose,
}: {
  envioId: number;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [tab, setTab] = useState<BulkGuiaTab>('lista');
  const [individualGuia, setIndividualGuia] = useState('');
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [noEncontradas, setNoEncontradas] = useState<string[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [guiaListError, setGuiaListError] = useState<string | undefined>();
  const agregar = useAgregarPaquetesEnvioConsolidado();

  const guias = useMemo(
    () =>
      Array.from(
        new Set(
          text
            .split(/[\r\n,;]+/)
            .map((s) => s.replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim())
            .filter(Boolean),
        ),
      ),
    [text],
  );

  const stats = useMemo(() => {
    let pesoLbs = 0;
    let yaEnOtro = 0;
    for (const p of paquetes) {
      if (p.pesoLbs != null) pesoLbs += Number(p.pesoLbs);
      if (p.envioConsolidadoCodigo) yaEnOtro += 1;
    }
    return {
      encontradas: paquetes.length,
      noEncontradas: noEncontradas.length,
      yaEnOtro,
      pesoLbs,
      pesoKg: pesoLbs * LBS_TO_KG,
    };
  }, [paquetes, noEncontradas]);

  async function handleBuscar() {
    const listCheck = validateGuiaList(bulkTextToGuiaLines(text));
    if (!listCheck.ok) {
      setGuiaListError(listCheck.errors.join(' · '));
      return;
    }
    setGuiaListError(undefined);
    if (listCheck.guias.length === 0) {
      toast.error('Pega al menos un número de guía');
      return;
    }
    setBuscando(true);
    try {
      const encontrados = await buscarPaquetesPorGuias(listCheck.guias);
      setPaquetes(encontrados);
      const set = new Set(encontrados.map((p) => p.numeroGuia.toLowerCase()));
      setNoEncontradas(listCheck.guias.filter((g) => !set.has(g.toLowerCase())));
    } catch {
      toast.error('Error al buscar paquetes');
    } finally {
      setBuscando(false);
    }
  }

  async function handleAgregarIndividual() {
    const g = individualGuia.trim();
    if (!g) return;
    const check = validateGuiaList(g);
    if (!check.ok) {
      setGuiaListError(check.errors.join(' · '));
      return;
    }
    setGuiaListError(undefined);
    const merged = text.trim() ? `${text.trim()}\n${g}` : g;
    setText(merged);
    setIndividualGuia('');
    setTab('lista');
    setBuscando(true);
    try {
      const encontrados = await buscarPaquetesPorGuias([g]);
      if (encontrados.length > 0) {
        setPaquetes((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...encontrados.filter((p) => !ids.has(p.id))];
        });
      } else {
        setNoEncontradas((prev) => (prev.includes(g) ? prev : [...prev, g]));
      }
    } catch {
      toast.error('Error al buscar paquete');
    } finally {
      setBuscando(false);
    }
  }

  function handleConservarSoloFallidas() {
    if (noEncontradas.length === 0) return;
    setText(noEncontradas.join('\n'));
    setPaquetes([]);
    setNoEncontradas([]);
  }


  async function handleAgregar() {
    if (paquetes.length === 0) {
      toast.error('No hay paquetes para agregar');
      return;
    }
    try {
      await agregar.mutateAsync({
        id: envioId,
        body: { paqueteIds: paquetes.map((p) => p.id) },
      });
      toast.success(`${paquetes.length} paquete(s) agregados`);
      onClose();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(res?.data?.message ?? 'No se pudo agregar los paquetes');
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-[var(--color-border)] px-6 pb-4 pt-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--color-muted)] text-[var(--color-primary)]">
              <Plus className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base">Agregar paquetes al envío</DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                Pega o escanea las guías que quieras incluir. Verifica antes de
                confirmar; los paquetes que ya estén en otro envío serán reasignados.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto px-6 py-4">
          <BulkGuiaInputPanel
            tab={tab}
            onTabChange={setTab}
            listValue={text}
            onListChange={(v) => {
              setText(v);
              setPaquetes([]);
              setNoEncontradas([]);
              setGuiaListError(undefined);
            }}
            individualValue={individualGuia}
            onIndividualChange={setIndividualGuia}
            onProcessList={handleBuscar}
            onProcessIndividual={handleAgregarIndividual}
            procesandoLista={buscando}
            procesandoIndividual={buscando}
            listButtonLabel={buscando ? 'Buscando...' : 'Verificar guías'}
            listPlaceholder={'1Z52159R0379385035 1/3\n1Z52159R0379385035 2/3'}
            listLabel={`Guías ECUBOX · ${guias.length} pieza${guias.length === 1 ? '' : 's'}`}
            guiaCount={guias.length}
            validationError={guiaListError}
            resultado={
              <p className="text-[11px] text-muted-foreground">
                Una línea por pieza. Formato:{' '}
                <span className="font-mono">{'<guía> <pieza>/<total>'}</span>. Acepta saltos de línea, comas o punto y coma.
              </p>
            }
          />

          {(paquetes.length > 0 || noEncontradas.length > 0) && (
            <div className="space-y-3 rounded-md border border-border bg-[var(--color-muted)]/20 p-3">
              <div className="flex flex-wrap gap-1.5">
                {stats.encontradas > 0 && (
                  <span className="inline-flex items-center gap-1 rounded border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-2 py-0.5 text-xs text-[var(--color-success)]">
                    <CheckCircle2 className="h-3 w-3" />
                    {stats.encontradas} encontrada{stats.encontradas === 1 ? '' : 's'}
                  </span>
                )}
                {stats.pesoLbs > 0 && (
                  <span className="inline-flex items-center gap-1 rounded border border-border bg-[var(--color-background)] px-2 py-0.5 text-xs text-foreground">
                    <Scale className="h-3 w-3" />
                    {formatWeightInline(stats.pesoLbs, stats.pesoKg)}
                  </span>
                )}
                {stats.yaEnOtro > 0 && (
                  <span className="inline-flex items-center gap-1 rounded border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-2 py-0.5 text-xs text-[var(--color-warning)]">
                    <AlertCircle className="h-3 w-3" />
                    {stats.yaEnOtro} ya en otro envío (se reasignarán)
                  </span>
                )}
                {stats.noEncontradas > 0 && (
                  <span className="inline-flex items-center gap-1 rounded border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 px-2 py-0.5 text-xs text-[var(--color-destructive)]">
                    <AlertCircle className="h-3 w-3" />
                    {stats.noEncontradas} no encontrada{stats.noEncontradas === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {paquetes.length > 0 && (
                <div>
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Piezas a agregar
                  </p>
                  <ul className="max-h-44 space-y-1 overflow-auto pr-1">
                    {paquetes.map((p) => {
                      const peso = formatWeightFromValues(p.pesoLbs, p.pesoKg);
                      return (
                        <li
                          key={p.id}
                          className="flex flex-wrap items-center gap-2 rounded border border-border bg-[var(--color-background)] px-2 py-1 text-xs"
                        >
                          <span className="font-mono font-medium text-foreground">
                            {p.numeroGuia}
                          </span>
                          {p.consignatarioNombre && (
                            <span className="text-muted-foreground">
                              · {p.consignatarioNombre}
                            </span>
                          )}
                          {peso && (
                            <span className="text-muted-foreground">· {peso}</span>
                          )}
                          {p.envioConsolidadoCodigo && (
                            <span className="ml-auto inline-flex items-center gap-1 rounded border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-1.5 py-0.5 text-[10px] text-[var(--color-warning)]">
                              <AlertCircle className="h-2.5 w-2.5" />
                              ya en {p.envioConsolidadoCodigo}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {noEncontradas.length > 0 && (
                <div className="rounded border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-destructive)]">
                      <AlertCircle className="h-3 w-3" />
                      No encontradas
                    </span>
                    <button
                      type="button"
                      onClick={handleConservarSoloFallidas}
                      className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Dejar solo no encontradas
                    </button>
                  </div>
                  <ul className="space-y-0.5">
                    {noEncontradas.map((g) => (
                      <li
                        key={g}
                        className="break-all font-mono text-xs text-[var(--color-destructive)]"
                      >
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-[var(--color-border)] bg-[var(--color-background)] px-6 py-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleAgregar}
            disabled={paquetes.length === 0 || agregar.isPending}
          >
            <Check className="mr-1.5 h-4 w-4" />
            {agregar.isPending
              ? 'Agregando...'
              : `Agregar ${paquetes.length} pieza${paquetes.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
