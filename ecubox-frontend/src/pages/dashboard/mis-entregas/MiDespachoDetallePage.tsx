import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowLeft,
  Boxes,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Eye,
  FileDown,
  FileSpreadsheet,
  Loader2,
  MapPin,
  Package as PackageIcon,
  Printer,
  Scale,
  Search,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { MonoTrunc } from '@/components/MonoTrunc';
import { PesoCell, PESO_TABLE_CELL_CLASS, PESO_TABLE_HEAD_CLASS } from '@/components/PesoCell';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { formatWeightInline, lbsToKg } from '@/lib/utils/weight';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useConfirmarEntrega, useMiDespacho } from '@/hooks/useMisDespachos';
import type { MiDespachoPieza } from '@/types/mis-despacho';

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

const TIPO_ICON_BG: Record<string, string> = {
  DOMICILIO:
    'bg-[color-mix(in_oklab,var(--color-success)_15%,transparent)] text-[color-mix(in_oklab,var(--color-success)_75%,var(--color-foreground))]',
  AGENCIA:
    'bg-[color-mix(in_oklab,var(--color-info)_15%,transparent)] text-[color-mix(in_oklab,var(--color-info)_75%,var(--color-foreground))]',
  AGENCIA_COURIER_ENTREGA:
    'bg-[color-mix(in_oklab,var(--color-primary)_15%,transparent)] text-[color-mix(in_oklab,var(--color-primary)_75%,var(--color-foreground))]',
};

function tipoLabel(tipo?: string | null): string {
  if (!tipo) return 'Sin tipo';
  return TIPO_LABELS[tipo] ?? tipo;
}

function fmtFechaCompleta(s?: string | null): string {
  if (!s) return '-';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('es-EC', { dateStyle: 'long', timeStyle: 'short' });
}

function fmtFechaCorta(s?: string | null): string {
  if (!s) return '-';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

function matchPieza(p: MiDespachoPieza, q: string): boolean {
  if (!q) return true;
  return Boolean(
    p.numeroGuia?.toLowerCase().includes(q) ||
      p.ref?.toLowerCase().includes(q) ||
      p.contenido?.toLowerCase().includes(q) ||
      p.estadoNombre?.toLowerCase().includes(q) ||
      p.estadoCodigo?.toLowerCase().includes(q),
  );
}

export function MiDespachoDetallePage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const despachoId = Number(params.id);
  const idValido = Number.isFinite(despachoId);
  const { data: d, isLoading, error } = useMiDespacho(idValido ? despachoId : null);
  const confirmar = useConfirmarEntrega();
  const puedeConfirmar = useAuthStore((s) => s.hasPermission('MIS_ENTREGAS_CONFIRM'));
  const puedeExportar = useAuthStore(
    (s) =>
      s.hasPermission('MIS_ENTREGAS_EXPORT') ||
      s.hasPermission('ACCESO_ENLACE_MIS_ENTREGAS_EXPORT'),
  );
  const [exporting, setExporting] = useState<'pdf' | 'print' | 'xlsx' | null>(null);
  const [search, setSearch] = useState('');

  const piezasFiltradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (d?.piezas ?? []).filter((p) => matchPieza(p, q));
  }, [d?.piezas, search]);

  const stats = useMemo(() => {
    const piezas = d?.piezas ?? [];
    const pesoLbs =
      d?.pesoLbsTotal ??
      piezas.reduce((total, p) => total + Number(p.pesoLbs ?? 0), 0);
    const pesoKg = d?.pesoKgTotal ?? lbsToKg(pesoLbs);
    const confirmables = piezas.filter((p) => p.confirmable).length;
    return {
      piezas: piezas.length,
      pesoLbs,
      pesoKg,
      confirmables,
      entregadas: d?.entregaConfirmada ? piezas.length : 0,
    };
  }, [d]);

  const onConfirmar = async () => {
    if (!d) return;
    try {
      await confirmar.mutateAsync(d.despachoId);
      toast.success('¡Gracias! Confirmaste la entrega de tu envío.');
    } catch (e) {
      toast.error(getApiErrorMessage(e) ?? 'No se pudo confirmar la entrega');
    }
  };

  const handleExport = async (mode: 'pdf' | 'print' | 'xlsx') => {
    if (!d || exporting) return;
    setExporting(mode);
    try {
      if (mode === 'xlsx') {
        const { downloadMiDespachoXlsx } = await import('@/lib/xlsx/miDespachoXlsx');
        await downloadMiDespachoXlsx(d);
      } else {
        const [{ buildMiDespachoPdf }, { runJsPdfAction }] = await Promise.all([
          import('@/lib/pdf/builders/miDespachoPdf'),
          import('@/lib/pdf/actions'),
        ]);
        const doc = buildMiDespachoPdf(d);
        runJsPdfAction(doc, {
          mode: mode === 'pdf' ? 'download' : 'print',
          filename: `mis-entregas-despacho-${d.despachoId}.pdf`,
        });
      }
    } catch {
      toast.error('No se pudo exportar el despacho');
    } finally {
      setExporting(null);
    }
  };

  if (!idValido) {
    return <ErrorScreen message="ID de despacho no valido." />;
  }

  if (isLoading) {
    return (
      <div className="page-stack" aria-busy="true" aria-live="polite">
        <SurfaceCard className="p-6 text-sm text-muted-foreground">Cargando el despacho...</SurfaceCard>
        <span className="sr-only">Cargando despacho</span>
      </div>
    );
  }

  if (error || !d) {
    return <ErrorScreen message="No se pudo cargar el despacho." />;
  }

  return (
    <div className="page-stack">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: '/mis-entregas' })}
        className="-ml-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a mis entregas
      </Button>

      <SurfaceCard className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md',
                TIPO_ICON_BG[d.tipoEntrega ?? ''] ?? 'bg-[var(--color-muted)] text-muted-foreground',
              )}
            >
              <Truck className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Mi despacho · #{d.despachoId}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1
                  className="break-all font-mono text-xl font-semibold leading-tight text-foreground"
                  title={d.numeroGuia ?? undefined}
                >
                  {d.numeroGuia ?? `#${d.despachoId}`}
                </h1>
                {d.numeroGuia ? (
                  <MonoTrunc value={d.numeroGuia} iconOnly title="Copiar guía del despacho" />
                ) : null}
                <Badge
                  variant="outline"
                  className={cn(TIPO_BADGE[d.tipoEntrega ?? ''] ?? '', 'font-normal')}
                >
                  {tipoLabel(d.tipoEntrega)}
                </Badge>
                {d.entregaConfirmada ? (
                  <StatusBadge tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                    Entrega confirmada
                  </StatusBadge>
                ) : null}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1" title={fmtFechaCompleta(d.fecha)}>
                  <CalendarClock className="h-3 w-3" />
                  {fmtFechaCorta(d.fecha)}
                </span>
                {d.destinoNombre ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {d.destinoNombre}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {puedeExportar ? (
              <>
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={exporting !== null}
                  onClick={() => handleExport('print')}
                >
                  {exporting === 'print' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Printer className="h-4 w-4" />
                  )}
                  Imprimir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={exporting !== null}
                  onClick={() => handleExport('pdf')}
                >
                  {exporting === 'pdf' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-[var(--color-success)] hover:text-[var(--color-success)]"
                  disabled={exporting !== null}
                  onClick={() => handleExport('xlsx')}
                >
                  {exporting === 'xlsx' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                  Excel
                </Button>
              </>
            ) : null}
            {puedeConfirmar && !d.entregaConfirmada ? (
              <Button
                size="sm"
                className="gap-1.5"
                disabled={!d.confirmable || confirmar.isPending}
                onClick={onConfirmar}
              >
                {confirmar.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Ya lo recibí
              </Button>
            ) : null}
          </div>
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<PackageIcon className="h-5 w-5" />}
          label="Mis piezas"
          value={stats.piezas}
          tone="primary"
          hint={`${stats.piezas} ${stats.piezas === 1 ? 'pieza incluida' : 'piezas incluidas'} en este despacho`}
        />
        <KpiCard
          icon={<Scale className="h-5 w-5" />}
          label="Peso total"
          value={stats.pesoLbs > 0 ? `${stats.pesoLbs.toFixed(2)} lbs` : '-'}
          tone="neutral"
          hint={stats.pesoLbs > 0 ? formatWeightInline(stats.pesoLbs, stats.pesoKg) : undefined}
        />
        <KpiCard
          icon={<Calendar className="h-5 w-5" />}
          label="Despachado"
          value={fmtFechaCorta(d.fecha)}
          tone="neutral"
          hint={relativeTime(d.fecha) ?? undefined}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Entrega"
          value={d.entregaConfirmada ? 'Confirmada' : 'Pendiente'}
          tone={d.entregaConfirmada ? 'success' : stats.confirmables > 0 ? 'info' : 'neutral'}
          hint={
            d.entregaConfirmada
              ? `${stats.entregadas} pieza${stats.entregadas === 1 ? '' : 's'} confirmada${stats.entregadas === 1 ? '' : 's'}`
              : stats.confirmables > 0
                ? 'Lista para confirmar al recibirla'
                : 'Aún no está disponible para confirmar'
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard title="Información del despacho" icon={<Truck className="h-4 w-4" />}>
          <InfoRow label="Guía">
            {d.numeroGuia ? (
              <>
                <span className="break-all font-mono text-sm font-medium">{d.numeroGuia}</span>
                <MonoTrunc value={d.numeroGuia} iconOnly title="Copiar guía" />
              </>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </InfoRow>
          <InfoRow label="ID">
            <span className="font-mono text-sm">#{d.despachoId}</span>
          </InfoRow>
          <InfoRow label="Fecha">
            <span className="text-sm">{fmtFechaCompleta(d.fecha)}</span>
          </InfoRow>
          <InfoRow label="Tipo de entrega">
            <Badge
              variant="outline"
              className={cn(TIPO_BADGE[d.tipoEntrega ?? ''] ?? '', 'font-normal')}
            >
              {tipoLabel(d.tipoEntrega)}
            </Badge>
          </InfoRow>
          {d.codigoPrecinto ? (
            <InfoRow label="Código precinto">
              <span className="break-all font-mono text-sm">{d.codigoPrecinto}</span>
              <MonoTrunc value={d.codigoPrecinto} iconOnly title="Copiar código precinto" />
            </InfoRow>
          ) : null}
          {d.observaciones ? (
            <InfoRow label="Observaciones" multiline>
              <span className="whitespace-pre-wrap text-sm">{d.observaciones}</span>
            </InfoRow>
          ) : null}
        </InfoCard>

        <InfoCard title="Destino" icon={<MapPin className="h-4 w-4" />}>
          <InfoRow label="Tipo">
            <span className="text-sm font-medium">{tipoLabel(d.tipoEntrega)}</span>
          </InfoRow>
          <InfoRow label="Lugar" multiline>
            <span className="text-sm">{d.destinoNombre ?? '-'}</span>
          </InfoRow>
          <InfoRow label="Estado">
            {d.entregaConfirmada ? (
              <StatusBadge tone="success">Entrega confirmada</StatusBadge>
            ) : d.confirmable ? (
              <StatusBadge tone="info">Pendiente de confirmación</StatusBadge>
            ) : (
              <StatusBadge tone="neutral">En proceso</StatusBadge>
            )}
          </InfoRow>
        </InfoCard>
      </div>

      <SurfaceCard className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="inline-flex items-center gap-2 text-base font-semibold">
              <Boxes className="h-4 w-4 text-[var(--color-primary)]" />
              Piezas del despacho
              <span className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {d.totalPiezas} pkt{d.totalPiezas === 1 ? '' : 's'}
              </span>
            </h2>
            {search.trim() ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Mostrando {piezasFiltradas.length} coincidencia{piezasFiltradas.length === 1 ? '' : 's'}
              </p>
            ) : null}
          </div>
          <div className="relative w-full sm:max-w-[300px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar guía, ref, contenido..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>
        </div>

        {d.piezas.length === 0 ? (
          <EmptyState
            icon={PackageIcon}
            title="Este despacho no tiene piezas visibles"
            description="Aquí aparecerán únicamente las piezas asociadas a tu cuenta."
          />
        ) : piezasFiltradas.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-[var(--color-muted)]/20 px-4 py-3 text-sm text-muted-foreground">
            Sin coincidencias para tu búsqueda.
          </div>
        ) : (
          <ListTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[48px] text-center">#</TableHead>
                  <TableHead>Guía / Ref</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden max-w-[260px] md:table-cell">Contenido</TableHead>
                  <TableHead className={PESO_TABLE_HEAD_CLASS}>Peso</TableHead>
                  <TableHead className="w-[72px] text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {piezasFiltradas.map((p, i) => (
                  <TableRow key={p.paqueteId}>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <MonoTrunc value={p.numeroGuia} head={8} tail={6} />
                        {p.ref ? (
                          <span className="text-[11px] text-muted-foreground">
                            Ref: <span className="font-mono">{p.ref}</span>
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <EstadoPiezaBadge pieza={p} />
                    </TableCell>
                    <TableCell className="hidden max-w-[260px] md:table-cell">
                      {p.contenido ? (
                        <span
                          className="line-clamp-2 break-words text-xs text-muted-foreground"
                          title={p.contenido}
                        >
                          {p.contenido}
                        </span>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className={PESO_TABLE_CELL_CLASS}>
                      <PesoCell pesoLbs={p.pesoLbs} pesoKg={p.pesoKg} />
                    </TableCell>
                    <TableCell className="text-right">
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

function EstadoPiezaBadge({ pieza }: { pieza: MiDespachoPieza }) {
  const label = pieza.estadoNombre ?? pieza.estadoCodigo;
  if (!label) {
    return <span className="text-xs italic text-muted-foreground">-</span>;
  }
  return <StatusBadge tone={pieza.confirmable ? 'info' : 'neutral'}>{label}</StatusBadge>;
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SurfaceCard className="p-4">
      <h3 className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </SurfaceCard>
  );
}

function InfoRow({
  label,
  children,
  multiline = false,
}: {
  label: string;
  children: React.ReactNode;
  multiline?: boolean;
}) {
  return (
    <div
      className={cn(
        'grid items-start gap-2 text-sm',
        multiline ? 'grid-cols-1 sm:grid-cols-[140px_1fr]' : 'grid-cols-[140px_1fr]',
      )}
    >
      <span className="pt-0.5 text-xs text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 break-words">
        {children}
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/mis-entregas' })}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>
      <div className="ui-alert ui-alert-error">{message}</div>
    </div>
  );
}
