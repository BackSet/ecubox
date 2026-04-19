import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowLeft,
  Boxes,
  Building2,
  Calendar,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Eraser,
  Eye,
  FileDown,
  FileSpreadsheet,
  Loader2,
  MapPin,
  MessageCircle,
  Package as PackageIcon,
  Pencil,
  Phone,
  Printer,
  Scale,
  Search,
  Trash2,
  Truck,
  User as UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
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
import { LoadingState } from '@/components/LoadingState';
import { SurfaceCard } from '@/components/ui/surface-card';
import { KpiCard } from '@/components/KpiCard';
import { ListTableShell } from '@/components/ListTableShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import {
  useDespacho,
  useDeleteDespacho,
  useMensajeWhatsAppDespachoGenerado,
} from '@/hooks/useOperarioDespachos';
import { useMensajeWhatsAppDespacho } from '@/hooks/useMensajeWhatsAppDespacho';
import { buildDespachoPdf } from '@/lib/pdf/builders/despachoPdf';
import { runJsPdfAction } from '@/lib/pdf/actions';
import { downloadDespachoXlsx } from '@/lib/xlsx/despachoXlsx';
import { lbsToKg } from '@/lib/utils/weight';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { cn } from '@/lib/utils';
import type { Despacho, Saca, TamanioSaca, TipoEntrega } from '@/types/despacho';
import type { Paquete } from '@/types/paquete';
import {
  GuiaMasterPiezaCell,
  DestinatarioCell,
} from '@/pages/dashboard/paquetes/PaqueteCells';

const TAMANIO_LABELS: Record<TamanioSaca, string> = {
  INDIVIDUAL: 'Paquete individual',
  PEQUENO: 'Saca pequeña',
  MEDIANO: 'Saca mediana',
  GRANDE: 'Saca grande',
};

const TIPO_LABELS: Record<TipoEntrega, string> = {
  DOMICILIO: 'Domicilio',
  AGENCIA: 'Agencia',
  AGENCIA_DISTRIBUIDOR: 'Agencia distribuidor',
};

const TIPO_BADGE: Record<TipoEntrega, string> = {
  DOMICILIO:
    'border-[color-mix(in_oklab,var(--color-success)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-success)_15%,transparent)] text-[color-mix(in_oklab,var(--color-success)_75%,var(--color-foreground))]',
  AGENCIA:
    'border-[color-mix(in_oklab,var(--color-info)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-info)_15%,transparent)] text-[color-mix(in_oklab,var(--color-info)_75%,var(--color-foreground))]',
  AGENCIA_DISTRIBUIDOR:
    'border-[color-mix(in_oklab,var(--color-primary)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-primary)_15%,transparent)] text-[color-mix(in_oklab,var(--color-primary)_75%,var(--color-foreground))]',
};

const TIPO_ICON_BG: Record<TipoEntrega, string> = {
  DOMICILIO:
    'bg-[color-mix(in_oklab,var(--color-success)_15%,transparent)] text-[color-mix(in_oklab,var(--color-success)_75%,var(--color-foreground))]',
  AGENCIA:
    'bg-[color-mix(in_oklab,var(--color-info)_15%,transparent)] text-[color-mix(in_oklab,var(--color-info)_75%,var(--color-foreground))]',
  AGENCIA_DISTRIBUIDOR:
    'bg-[color-mix(in_oklab,var(--color-primary)_15%,transparent)] text-[color-mix(in_oklab,var(--color-primary)_75%,var(--color-foreground))]',
};

function fmtFechaCompleta(s?: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('es-EC', { dateStyle: 'long', timeStyle: 'short' });
}

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

function fmtPeso(lbs?: number | null): { lbs: string; kg: string } | null {
  if (lbs == null) return null;
  const n = Number(lbs);
  if (!Number.isFinite(n)) return null;
  return { lbs: n.toFixed(2), kg: lbsToKg(n).toFixed(2) };
}

export function DespachoDetailPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const id = params.id != null ? Number(params.id) : NaN;
  const idValido = !Number.isNaN(id);

  const { data: despacho, isLoading, error } = useDespacho(idValido ? id : undefined);
  const { data: mensajeWhatsApp } = useMensajeWhatsAppDespacho();
  const deleteMutation = useDeleteDespacho();

  const [search, setSearch] = useState('');
  const [collapsedSacas, setCollapsedSacas] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'print' | 'xlsx' | null>(null);

  const { data: mensajeGenerado, isLoading: loadingMensaje } =
    useMensajeWhatsAppDespachoGenerado(
      idValido ? id : undefined,
      whatsappOpen && idValido,
    );

  const sacas: Saca[] = useMemo(() => despacho?.sacas ?? [], [despacho]);
  const allPaquetes: Paquete[] = useMemo(
    () => sacas.flatMap((s) => s.paquetes ?? []),
    [sacas],
  );

  const stats = useMemo(() => {
    let pesoLbs = 0;
    let conPeso = 0;
    let sinPeso = 0;
    for (const p of allPaquetes) {
      if (p.pesoLbs != null) {
        pesoLbs += Number(p.pesoLbs);
        conPeso += 1;
      } else {
        sinPeso += 1;
      }
    }
    return {
      sacas: sacas.length,
      paquetes: allPaquetes.length,
      pesoLbs,
      pesoKg: lbsToKg(pesoLbs),
      conPeso,
      sinPeso,
    };
  }, [sacas, allPaquetes]);

  const matchPaquete = (p: Paquete, q: string): boolean => {
    if (!q) return true;
    return Boolean(
      p.numeroGuia?.toLowerCase().includes(q) ||
        p.guiaMasterTrackingBase?.toLowerCase().includes(q) ||
        p.destinatarioNombre?.toLowerCase().includes(q) ||
        p.destinatarioTelefono?.toLowerCase().includes(q) ||
        p.destinatarioDireccion?.toLowerCase().includes(q) ||
        p.destinatarioCanton?.toLowerCase().includes(q) ||
        p.destinatarioProvincia?.toLowerCase().includes(q) ||
        p.contenido?.toLowerCase().includes(q) ||
        p.estadoRastreoNombre?.toLowerCase().includes(q) ||
        p.estadoRastreoCodigo?.toLowerCase().includes(q) ||
        p.ref?.toLowerCase().includes(q),
    );
  };

  const sacasFiltradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sacas;
    return sacas
      .map((s) => ({
        ...s,
        paquetes: (s.paquetes ?? []).filter((p) => matchPaquete(p, q)),
      }))
      .filter(
        (s) =>
          (s.paquetes?.length ?? 0) > 0 ||
          s.numeroOrden?.toLowerCase().includes(q),
      );
  }, [sacas, search]);

  const matchesCount = useMemo(
    () => sacasFiltradas.reduce((n, s) => n + (s.paquetes?.length ?? 0), 0),
    [sacasFiltradas],
  );

  if (!idValido) {
    return (
      <ErrorScreen message="ID de despacho no válido." />
    );
  }
  if (isLoading) return <LoadingState text="Cargando despacho..." />;
  if (error || !despacho) {
    return <ErrorScreen message="No se pudo cargar el despacho." />;
  }

  const d = despacho;
  const plantillaWhats = mensajeWhatsApp?.plantilla?.trim() ?? '';
  const tieneWhatsApp =
    plantillaWhats.length > 0 && d.tipoEntrega === 'DOMICILIO' && Boolean(d.destinatarioTelefono);

  const handleExport = async (mode: 'pdf' | 'print' | 'xlsx') => {
    if (exporting) return;
    setExporting(mode);
    try {
      if (mode === 'xlsx') {
        await downloadDespachoXlsx(d);
        toast.success('Excel generado');
      } else {
        const doc = buildDespachoPdf(d);
        runJsPdfAction(doc, {
          mode: mode === 'pdf' ? 'download' : 'print',
          filename: `despacho-${d.id}.pdf`,
        });
        if (mode === 'pdf') toast.success('PDF generado');
      }
    } catch {
      toast.error('No se pudo generar el documento');
    } finally {
      setExporting(null);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(d.id);
      toast.success('Despacho eliminado');
      navigate({ to: '/despachos' });
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err) ?? 'Error al eliminar el despacho');
      throw err;
    }
  };

  const toggleSaca = (sacaId: number) => {
    setCollapsedSacas((prev) => {
      const next = new Set(prev);
      if (next.has(sacaId)) next.delete(sacaId);
      else next.add(sacaId);
      return next;
    });
  };
  const expandirTodas = () => setCollapsedSacas(new Set());
  const colapsarTodas = () =>
    setCollapsedSacas(new Set(sacas.map((s) => s.id)));

  const filtroActivo = search.trim() !== '';

  return (
    <div className="page-stack">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: '/despachos' })}
        className="-ml-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a despachos
      </Button>

      <SurfaceCard className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md',
                TIPO_ICON_BG[d.tipoEntrega],
              )}
            >
              <Truck className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Despacho · #{d.id}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1
                  className="break-all font-mono text-xl font-semibold leading-tight text-foreground"
                  title={d.numeroGuia}
                >
                  {d.numeroGuia}
                </h1>
                <CopyButton value={d.numeroGuia} title="Copiar guía del despacho" />
                <Badge
                  variant="outline"
                  className={cn(TIPO_BADGE[d.tipoEntrega], 'font-normal')}
                >
                  {TIPO_LABELS[d.tipoEntrega]}
                </Badge>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {d.fechaHora && (
                  <span
                    className="inline-flex items-center gap-1"
                    title={fmtFechaCompleta(d.fechaHora)}
                  >
                    <CalendarClock className="h-3 w-3" />
                    {fmtFechaCorta(d.fechaHora)}
                  </span>
                )}
                {d.operarioNombre && (
                  <span className="inline-flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    {d.operarioNombre}
                  </span>
                )}
                {d.distribuidorNombre && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {d.distribuidorNombre}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link to="/despachos/$id/editar" params={{ id: String(d.id) }}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            </Link>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={exporting != null}
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
              disabled={exporting != null}
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
              className="gap-1.5 text-[var(--color-success)] hover:text-[var(--color-success)] dark:text-[var(--color-success)] dark:hover:text-[var(--color-success)]"
              disabled={exporting != null}
              onClick={() => handleExport('xlsx')}
            >
              {exporting === 'xlsx' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              Excel
            </Button>
            {tieneWhatsApp && (
              <Button
                variant="outline"
                size="icon"
                className="text-[var(--color-success)] hover:text-[var(--color-success)]"
                aria-label="Generar mensaje WhatsApp"
                title="Generar mensaje WhatsApp"
                onClick={() => setWhatsappOpen(true)}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="text-[var(--color-destructive)] hover:text-[var(--color-destructive)]"
              aria-label="Eliminar despacho"
              title="Eliminar despacho"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<Boxes className="h-5 w-5" />}
          label="Sacas"
          value={stats.sacas}
          tone="primary"
          hint={
            stats.sacas === 0
              ? 'Sin sacas asignadas'
              : `${stats.sacas} ${stats.sacas === 1 ? 'saca' : 'sacas'} en este despacho`
          }
        />
        <KpiCard
          icon={<PackageIcon className="h-5 w-5" />}
          label="Paquetes"
          value={stats.paquetes}
          tone="neutral"
          hint={
            stats.sinPeso > 0
              ? `${stats.conPeso} con peso · ${stats.sinPeso} sin peso`
              : stats.paquetes > 0
                ? 'Todos con peso registrado'
                : undefined
          }
        />
        <KpiCard
          icon={<Scale className="h-5 w-5" />}
          label="Peso total"
          value={stats.pesoLbs > 0 ? `${stats.pesoLbs.toFixed(2)} lbs` : '—'}
          tone="neutral"
          hint={stats.pesoLbs > 0 ? `${stats.pesoKg.toFixed(2)} kg` : undefined}
        />
        <KpiCard
          icon={<Calendar className="h-5 w-5" />}
          label="Despachado"
          value={fmtFechaCorta(d.fechaHora)}
          tone="neutral"
          hint={relativeTime(d.fechaHora) ?? undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard title="Información del despacho" icon={<Truck className="h-4 w-4" />}>
          <InfoRow label="Guía">
            <span className="break-all font-mono text-sm font-medium">{d.numeroGuia}</span>
            <CopyButton value={d.numeroGuia} title="Copiar guía" small />
          </InfoRow>
          <InfoRow label="ID">
            <span className="font-mono text-sm">#{d.id}</span>
          </InfoRow>
          <InfoRow label="Fecha y hora">
            <span className="text-sm">{fmtFechaCompleta(d.fechaHora)}</span>
          </InfoRow>
          <InfoRow label="Distribuidor">
            <span className="text-sm font-medium">{d.distribuidorNombre ?? '—'}</span>
          </InfoRow>
          <InfoRow label="Tipo de entrega">
            <Badge
              variant="outline"
              className={cn(TIPO_BADGE[d.tipoEntrega], 'font-normal')}
            >
              {TIPO_LABELS[d.tipoEntrega]}
            </Badge>
          </InfoRow>
          {d.codigoPrecinto && (
            <InfoRow label="Código precinto">
              <span className="break-all font-mono text-sm">{d.codigoPrecinto}</span>
              <CopyButton value={d.codigoPrecinto} title="Copiar código precinto" small />
            </InfoRow>
          )}
          {d.operarioNombre && (
            <InfoRow label="Operario">
              <span className="inline-flex items-center gap-1.5 text-sm">
                <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {d.operarioNombre}
              </span>
            </InfoRow>
          )}
          {d.observaciones && (
            <InfoRow label="Observaciones" multiline>
              <span className="whitespace-pre-wrap text-sm">{d.observaciones}</span>
            </InfoRow>
          )}
        </InfoCard>

        <DestinoCard despacho={d} />
      </div>

      <SurfaceCard className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="inline-flex items-center gap-2 text-base font-semibold">
              <Boxes className="h-4 w-4 text-[var(--color-primary)]" />
              Sacas y paquetes
              <span className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {stats.sacas} · {stats.paquetes} pkts
              </span>
            </h2>
            {filtroActivo && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Mostrando {matchesCount} coincidencia{matchesCount === 1 ? '' : 's'} en
                {' '}
                {sacasFiltradas.length} saca{sacasFiltradas.length === 1 ? '' : 's'}
              </p>
            )}
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2 sm:max-w-xl sm:justify-end">
            {allPaquetes.length > 0 && (
              <div className="relative w-full sm:max-w-[280px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar guía, destinatario, contenido..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-7 text-sm"
                />
                {filtroActivo && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-[var(--color-muted)] hover:text-foreground"
                    aria-label="Limpiar búsqueda"
                    title="Limpiar"
                  >
                    <Eraser className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
            {sacas.length > 1 && (
              <div className="inline-flex overflow-hidden rounded-md border border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-none border-r border-border px-2 text-xs"
                  onClick={expandirTodas}
                >
                  <ChevronDown className="mr-1 h-3.5 w-3.5" />
                  Expandir
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-none px-2 text-xs"
                  onClick={colapsarTodas}
                >
                  <ChevronRight className="mr-1 h-3.5 w-3.5" />
                  Colapsar
                </Button>
              </div>
            )}
          </div>
        </div>

        {stats.sacas === 0 ? (
          <EmptyState
            icon={Boxes}
            title="Este despacho no tiene sacas"
            description="Asigna sacas desde la pantalla de edición para incluir paquetes."
          />
        ) : sacasFiltradas.length === 0 ? (
          <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-[var(--color-muted)]/20 px-4 py-3 text-sm text-muted-foreground">
            <span>Sin coincidencias para tu búsqueda.</span>
            <Button variant="ghost" size="sm" onClick={() => setSearch('')}>
              <Eraser className="mr-1 h-3.5 w-3.5" />
              Limpiar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sacasFiltradas.map((saca, idx) => (
              <SacaCard
                key={saca.id}
                saca={saca}
                index={idx}
                collapsed={collapsedSacas.has(saca.id)}
                onToggle={() => toggleSaca(saca.id)}
              />
            ))}
          </div>
        )}
      </SurfaceCard>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="¿Eliminar despacho?"
        description="Las sacas asignadas quedarán disponibles para otro despacho. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />

      <Dialog
        open={whatsappOpen}
        onOpenChange={(open) => setWhatsappOpen(open)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-[var(--color-success)]" />
              Mensaje WhatsApp
            </DialogTitle>
          </DialogHeader>
          <WhatsAppPanel
            telefono={d.destinatarioTelefono}
            mensaje={mensajeGenerado?.mensaje}
            loading={loadingMensaje}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="space-y-3">
      <Link to="/despachos">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </Link>
      <div className="ui-alert ui-alert-error">
        {message}
      </div>
    </div>
  );
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

function DestinoCard({ despacho: d }: { despacho: Despacho }) {
  // SCD2: el despacho congela el snapshot del destino al crearse. Mostramos
  // un indicador discreto para que el operario sepa que estos datos son los
  // historicos del momento del despacho, no los del maestro vivo.
  const congelado = d.destinoCongeladoEn != null
    || d.destinatarioVersionId != null
    || d.agenciaVersionId != null
    || d.agenciaDistribuidorVersionId != null;
  const congeladoBadge = congelado ? (
    <span
      className="ml-2 inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
      title={
        d.destinoCongeladoEn
          ? `Snapshot del destino congelado el ${new Date(d.destinoCongeladoEn).toLocaleString()}. Cambios posteriores en el maestro no afectan a este despacho.`
          : 'Snapshot del destino congelado al crear el despacho.'
      }
    >
      Datos congelados
    </span>
  ) : null;

  if (d.tipoEntrega === 'DOMICILIO') {
    return (
      <InfoCard
        title={
          <span className="inline-flex items-center">
            Destino · Domicilio
            {congeladoBadge}
          </span>
        }
        icon={<MapPin className="h-4 w-4" />}
      >
        <InfoRow label="Destinatario">
          <span className="text-sm font-medium">{d.destinatarioNombre ?? '—'}</span>
        </InfoRow>
        <InfoRow label="Teléfono">
          {d.destinatarioTelefono ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {d.destinatarioTelefono}
              </span>
              <CopyButton value={d.destinatarioTelefono} title="Copiar teléfono" small />
            </>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </InfoRow>
        <InfoRow label="Dirección" multiline>
          {d.destinatarioDireccion ? (
            <span className="text-sm">{d.destinatarioDireccion}</span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </InfoRow>
      </InfoCard>
    );
  }

  const lugar =
    d.tipoEntrega === 'AGENCIA_DISTRIBUIDOR'
      ? d.agenciaDistribuidorNombre
      : d.agenciaNombre;
  const titulo =
    d.tipoEntrega === 'AGENCIA_DISTRIBUIDOR'
      ? 'Destino · Agencia distribuidor'
      : 'Destino · Agencia';

  return (
    <InfoCard
      title={
        <span className="inline-flex items-center">
          {titulo}
          {congeladoBadge}
        </span>
      }
      icon={<Building2 className="h-4 w-4" />}
    >
      <InfoRow label="Agencia">
        <span className="text-sm font-medium">{lugar ?? '—'}</span>
      </InfoRow>
      {d.destinatarioNombre && (
        <InfoRow label="Contacto">
          <span className="text-sm">{d.destinatarioNombre}</span>
        </InfoRow>
      )}
      {d.destinatarioTelefono && (
        <InfoRow label="Teléfono">
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            {d.destinatarioTelefono}
          </span>
          <CopyButton value={d.destinatarioTelefono} title="Copiar teléfono" small />
        </InfoRow>
      )}
      {d.destinatarioDireccion && (
        <InfoRow label="Dirección" multiline>
          <span className="text-sm">{d.destinatarioDireccion}</span>
        </InfoRow>
      )}
    </InfoCard>
  );
}

function SacaCard({
  saca,
  index,
  collapsed,
  onToggle,
}: {
  saca: Saca;
  index: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const paquetes = saca.paquetes ?? [];
  const totalPesoPaquetes = paquetes.reduce(
    (sum, p) => sum + Number(p.pesoLbs ?? 0),
    0,
  );
  const pesoSaca = saca.pesoLbs != null ? Number(saca.pesoLbs) : totalPesoPaquetes;
  const peso = fmtPeso(pesoSaca);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-border bg-[var(--color-muted)]/30 px-4 py-2.5 text-left transition hover:bg-[var(--color-muted)]/50"
        aria-expanded={!collapsed}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-muted)] text-[var(--color-primary)]">
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <span className="text-muted-foreground">#{index + 1}</span>
              <span className="break-all font-mono">{saca.numeroOrden}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {saca.tamanio
                ? (TAMANIO_LABELS[saca.tamanio] ?? saca.tamanio)
                : 'Sin tamaño definido'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <PackageIcon className="h-3 w-3" />
            {paquetes.length} pkt{paquetes.length === 1 ? '' : 's'}
          </Badge>
          {peso && (
            <Badge variant="outline" className="gap-1 font-normal">
              <Scale className="h-3 w-3" />
              {peso.lbs} lbs · {peso.kg} kg
            </Badge>
          )}
        </div>
      </button>

      {!collapsed && (
        paquetes.length === 0 ? (
          <div className="px-4 py-3 text-sm italic text-muted-foreground">
            Esta saca no tiene paquetes asociados.
          </div>
        ) : (
          <ListTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] text-center">#</TableHead>
                  <TableHead>Guía master / Pieza</TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead className="max-w-[220px]">Contenido</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Peso</TableHead>
                  <TableHead className="w-[60px] text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paquetes.map((p, i) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell>
                      <GuiaMasterPiezaCell paquete={p} />
                    </TableCell>
                    <TableCell>
                      <DestinatarioCell paquete={p} />
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      {p.contenido ? (
                        <span
                          className="line-clamp-2 break-words text-xs text-muted-foreground"
                          title={p.contenido}
                        >
                          {p.contenido}
                        </span>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <EstadoBadge
                        nombre={p.estadoRastreoNombre}
                        codigo={p.estadoRastreoCodigo}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <PesoMini lbs={p.pesoLbs} />
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
        )
      )}
    </div>
  );
}

function EstadoBadge({
  nombre,
  codigo,
}: {
  nombre?: string | null;
  codigo?: string | null;
}) {
  const label = nombre ?? codigo;
  if (!label) {
    return <span className="text-xs italic text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-[var(--color-muted)]/40 px-2 py-0.5 text-xs font-medium text-foreground">
      {label}
    </span>
  );
}

function PesoMini({ lbs }: { lbs?: number | null }) {
  const peso = fmtPeso(lbs);
  if (!peso) {
    return <span className="text-xs italic text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="text-sm font-medium tabular-nums text-foreground">
        {peso.lbs} lbs
      </span>
      <span className="text-[11px] tabular-nums text-muted-foreground">
        {peso.kg} kg
      </span>
    </div>
  );
}

function CopyButton({
  value,
  title,
  small = false,
}: {
  value: string;
  title?: string;
  small?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar');
    }
  }
  const Icon = copied ? Check : Copy;
  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={title ?? 'Copiar'}
      title={title ?? 'Copiar'}
      className={cn(
        'shrink-0 rounded text-muted-foreground transition-colors hover:bg-[var(--color-muted)] hover:text-foreground',
        small ? 'p-0.5' : 'p-1',
        copied && 'text-[var(--color-success)]',
      )}
    >
      <Icon className={small ? 'h-3 w-3' : 'h-4 w-4'} />
    </button>
  );
}

function WhatsAppPanel({
  telefono,
  mensaje,
  loading,
}: {
  telefono?: string | null;
  mensaje?: string;
  loading: boolean;
}) {
  const text = mensaje?.trim() ?? '';
  const numeroLimpio = (telefono ?? '').replace(/[^\d]/g, '');
  const waUrl = numeroLimpio
    ? `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(text)}`
    : null;

  const handleCopy = () => {
    if (!text) return;
    void navigator.clipboard
      .writeText(text)
      .then(() => toast.success('Mensaje copiado'))
      .catch(() => toast.error('No se pudo copiar'));
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Generando mensaje...
      </div>
    );
  }
  if (!text) {
    return (
      <div className="rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-3 text-sm text-[var(--color-warning)]">
        Configure la plantilla en Parámetros del sistema para generar el mensaje.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[var(--color-success)]/20 bg-[color-mix(in_oklab,var(--color-success)_8%,transparent)] p-3">
        <div className="relative max-h-[280px] overflow-auto whitespace-pre-wrap rounded-xl rounded-tl-sm border border-border bg-[var(--color-card)] p-3 text-sm leading-relaxed text-foreground shadow-sm">
          {text}
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {text.length} carácter{text.length === 1 ? '' : 'es'}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="gap-2">
          <Copy className="h-4 w-4" />
          Copiar
        </Button>
        {waUrl ? (
          <Button
            asChild
            size="sm"
            className="gap-2 bg-[var(--color-success)] text-white shadow-sm transition-colors hover:bg-[var(--color-success)] hover:brightness-110"
          >
            <a href={waUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" />
              Abrir en WhatsApp
            </a>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled
            title="Sin teléfono válido para WhatsApp"
            className="gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Abrir en WhatsApp
          </Button>
        )}
      </div>
    </div>
  );
}
