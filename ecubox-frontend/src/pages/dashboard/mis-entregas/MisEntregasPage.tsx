import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  CalendarClock,
  CheckCircle2,
  Eye,
  FileDown,
  FileSpreadsheet,
  Loader2,
  PackageCheck,
  Package as PackageIcon,
  Printer,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SurfaceCard } from '@/components/ui/surface-card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { KpiCard } from '@/components/KpiCard';
import { ListTableShell } from '@/components/ListTableShell';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { obtenerMiDespacho } from '@/lib/api/mis-despachos.service';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useConfirmarEntrega, useMisDespachos } from '@/hooks/useMisDespachos';
import type { MiDespacho } from '@/types/mis-despacho';

const TIPO_LABELS: Record<string, string> = {
  DOMICILIO: 'Domicilio',
  AGENCIA: 'Agencia',
  AGENCIA_COURIER_ENTREGA: 'Punto de entrega',
};

const TIPO_BADGE: Record<string, string> = {
  DOMICILIO:
    'border-[color-mix(in_oklab,var(--color-success)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-success)_15%,transparent)] text-[color-mix(in_oklab,var(--color-success)_75%,var(--color-foreground))]',
  AGENCIA:
    'border-[color-mix(in_oklab,var(--color-info)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-info)_15%,transparent)] text-[color-mix(in_oklab,var(--color-info)_75%,var(--color-foreground))]',
  AGENCIA_COURIER_ENTREGA:
    'border-[color-mix(in_oklab,var(--color-primary)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-primary)_15%,transparent)] text-[color-mix(in_oklab,var(--color-primary)_75%,var(--color-foreground))]',
};

function tipoLabel(tipo?: string | null): string {
  if (!tipo) return 'Sin tipo';
  return TIPO_LABELS[tipo] ?? tipo;
}

function formatFecha(fecha?: string | null): string {
  if (!fecha) return '-';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function MisEntregasPage() {
  const navigate = useNavigate();
  const { data: despachos = [], isLoading, error, refetch } = useMisDespachos();
  const confirmar = useConfirmarEntrega();
  const puedeConfirmar = useAuthStore((s) => s.hasPermission('MIS_ENTREGAS_CONFIRM'));
  const puedeExportar = useAuthStore(
    (s) =>
      s.hasPermission('MIS_ENTREGAS_EXPORT') ||
      s.hasPermission('ACCESO_ENLACE_MIS_ENTREGAS_EXPORT'),
  );
  const [exportingId, setExportingId] = useState<{ id: number; mode: 'pdf' | 'print' | 'xlsx' } | null>(null);

  const stats = useMemo(() => {
    const totalPiezas = despachos.reduce((total, d) => total + d.totalPiezas, 0);
    const pendientes = despachos.filter((d) => !d.entregaConfirmada).length;
    const confirmables = despachos.filter((d) => d.confirmable && !d.entregaConfirmada).length;
    const confirmados = despachos.filter((d) => d.entregaConfirmada).length;
    return { totalPiezas, pendientes, confirmables, confirmados };
  }, [despachos]);

  const onConfirmar = async (id: number) => {
    try {
      await confirmar.mutateAsync(id);
      toast.success('¡Gracias! Confirmaste la entrega de tu envío.');
    } catch (e) {
      toast.error(getApiErrorMessage(e) ?? 'No se pudo confirmar la entrega');
    }
  };

  const handleExportar = async (id: number, mode: 'pdf' | 'print' | 'xlsx') => {
    if (exportingId) return;
    setExportingId({ id, mode });
    try {
      const detalle = await obtenerMiDespacho(id);
      if (mode === 'xlsx') {
        const { downloadMiDespachoXlsx } = await import('@/lib/xlsx/miDespachoXlsx');
        await downloadMiDespachoXlsx(detalle);
      } else {
        const [{ buildMiDespachoPdf }, { runJsPdfAction }] = await Promise.all([
          import('@/lib/pdf/builders/miDespachoPdf'),
          import('@/lib/pdf/actions'),
        ]);
        const doc = buildMiDespachoPdf(detalle);
        runJsPdfAction(doc, {
          mode: mode === 'pdf' ? 'download' : 'print',
          filename: `mis-entregas-despacho-${detalle.despachoId}.pdf`,
        });
      }
    } catch {
      toast.error('No se pudo exportar el despacho');
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="page-stack">
      <SurfaceCard className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_oklab,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]">
              <Truck className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Mis despachos
              </p>
              <h1 className="mt-0.5 text-xl font-semibold leading-tight text-foreground">
                Mis entregas
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Consulta tus despachos en modo lectura y confirma la entrega cuando los recibas.
              </p>
            </div>
          </div>
          {error ? (
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          ) : null}
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<Truck className="h-5 w-5" />}
          label="Despachos"
          value={despachos.length}
          tone="primary"
          hint="Despachos asociados a tus piezas"
        />
        <KpiCard
          icon={<PackageIcon className="h-5 w-5" />}
          label="Piezas"
          value={stats.totalPiezas}
          tone="neutral"
          hint="Total de piezas visibles para tu cuenta"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Confirmables"
          value={stats.confirmables}
          tone={stats.confirmables > 0 ? 'info' : 'neutral'}
          hint="Listas para confirmar al recibirlas"
        />
        <KpiCard
          icon={<PackageCheck className="h-5 w-5" />}
          label="Confirmados"
          value={stats.confirmados}
          tone={stats.confirmados > 0 ? 'success' : 'neutral'}
          hint={`${stats.pendientes} pendiente${stats.pendientes === 1 ? '' : 's'}`}
        />
      </div>

      <SurfaceCard className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="inline-flex items-center gap-2 text-base font-semibold">
              <Truck className="h-4 w-4 text-[var(--color-primary)]" />
              Despachos
              <span className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {despachos.length}
              </span>
            </h2>
          </div>
        </div>

        {isLoading ? (
          <SurfaceCard className="p-6 text-sm text-muted-foreground">Cargando tus despachos...</SurfaceCard>
        ) : error ? (
          <div className="ui-alert ui-alert-error">No se pudieron cargar tus despachos.</div>
        ) : despachos.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title="No tienes despachos en camino"
            description="Cuando tengas un envío en despacho aparecerá aquí para que consultes, imprimas o confirmes su entrega."
          />
        ) : (
          <ListTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Despacho</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Piezas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[260px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {despachos.map((d) => (
                  <TableRow key={d.despachoId}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-muted)] text-muted-foreground">
                          <Truck className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-mono text-sm font-medium text-foreground">
                            #{d.despachoId}
                          </p>
                          <p className="text-[11px] text-muted-foreground">Mi despacho</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatFecha(d.fecha)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(TIPO_BADGE[d.tipoEntrega ?? ''] ?? '', 'font-normal')}
                      >
                        {tipoLabel(d.tipoEntrega)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {d.totalPiezas}
                    </TableCell>
                    <TableCell>
                      {d.entregaConfirmada ? (
                        <StatusBadge tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                          Entrega confirmada
                        </StatusBadge>
                      ) : d.confirmable ? (
                        <StatusBadge tone="info">Pendiente de confirmación</StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral">En proceso</StatusBadge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DespachoActions
                        despacho={d}
                        puedeConfirmar={puedeConfirmar}
                        puedeExportar={puedeExportar}
                        exportingId={exportingId}
                        confirmando={confirmar.isPending && confirmar.variables === d.despachoId}
                        onVerDetalle={() =>
                          navigate({ to: '/mis-entregas/$id', params: { id: String(d.despachoId) } })
                        }
                        onConfirmar={() => onConfirmar(d.despachoId)}
                        onExportar={(mode) => handleExportar(d.despachoId, mode)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ListTableShell>
        )}
      </SurfaceCard>
    </div>
  );
}

function DespachoActions({
  despacho,
  puedeConfirmar,
  puedeExportar,
  exportingId,
  confirmando,
  onVerDetalle,
  onConfirmar,
  onExportar,
}: {
  despacho: MiDespacho;
  puedeConfirmar: boolean;
  puedeExportar: boolean;
  exportingId: { id: number; mode: 'pdf' | 'print' | 'xlsx' } | null;
  confirmando: boolean;
  onVerDetalle: () => void;
  onConfirmar: () => void;
  onExportar: (mode: 'pdf' | 'print' | 'xlsx') => void;
}) {
  const exportingThis = exportingId?.id === despacho.despachoId ? exportingId.mode : null;
  const busy = exportingId !== null || confirmando;
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <Button variant="ghost" size="icon" title="Ver detalle" aria-label="Ver detalle" onClick={onVerDetalle}>
        <Eye className="h-4 w-4" />
      </Button>
      {puedeExportar ? (
        <>
          <Button
            variant="outline"
            size="icon"
            title="Imprimir"
            aria-label="Imprimir"
            disabled={busy}
            onClick={() => onExportar('print')}
          >
            {exportingThis === 'print' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            title="Exportar PDF"
            aria-label="Exportar PDF"
            disabled={busy}
            onClick={() => onExportar('pdf')}
          >
            {exportingThis === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            title="Exportar Excel"
            aria-label="Exportar Excel"
            className="text-[var(--color-success)] hover:text-[var(--color-success)]"
            disabled={busy}
            onClick={() => onExportar('xlsx')}
          >
            {exportingThis === 'xlsx' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
          </Button>
        </>
      ) : null}
      {puedeConfirmar && !despacho.entregaConfirmada ? (
        <Button size="sm" className="gap-1.5" disabled={!despacho.confirmable || busy} onClick={onConfirmar}>
          {confirmando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Ya lo recibí
        </Button>
      ) : null}
    </div>
  );
}
