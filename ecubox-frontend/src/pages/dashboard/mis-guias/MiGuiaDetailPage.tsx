import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  Copy,
  Pencil,
  Package as PackageIcon,
  Trash2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingState } from '@/components/LoadingState';
import { SurfaceCard } from '@/components/ui/surface-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useEliminarMiGuia, useMiGuia, useMiGuiaPiezas } from '@/hooks/useMisGuias';
import type { GuiaMaster } from '@/types/guia-master';
import type { Paquete } from '@/types/paquete';
import { GuiaMasterEstadoBadge } from '@/pages/dashboard/guias-master/_estado';
import { DestinatarioInfo } from '@/pages/dashboard/paquetes/PaqueteCells';
import { EditarMiGuiaDialog } from './EditarMiGuiaDialog';

const ESTADO_EDITABLE = 'INCOMPLETA' as const;

function piezaRecibida(p: Paquete): boolean {
  return p.pesoLbs != null || p.pesoKg != null;
}

function piezaDespachada(p: Paquete): boolean {
  return p.despachoId != null || (p.despachoNumeroGuia ?? '').length > 0;
}

export function MiGuiaDetailPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const id = Number(params.id);
  const { data: guia, isLoading, error } = useMiGuia(id);
  const { data: piezas, isLoading: loadingPiezas } = useMiGuiaPiezas(id);
  const eliminar = useEliminarMiGuia();

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (isLoading) return <LoadingState text="Cargando guía..." />;
  if (error || !guia) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" onClick={() => navigate({ to: '/mis-guias' })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <div className="ui-alert ui-alert-error">
          No se pudo cargar la guía.
        </div>
      </div>
    );
  }

  const editable = guia.estadoGlobal === ESTADO_EDITABLE;
  const totalPendiente = guia.totalPiezasEsperadas == null;
  const tooltipBloqueada = `No editable: la guía está en estado ${guia.estadoGlobal}`;

  return (
    <div className="page-stack">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/mis-guias' })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      <SurfaceCard className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Mi guía
              </span>
              <GuiaMasterEstadoBadge estado={guia.estadoGlobal} />
            </div>
            <div className="flex items-start gap-2">
              <h1 className="break-all font-mono text-xl font-semibold leading-tight">
                {guia.trackingBase}
              </h1>
              <CopyButton text={guia.trackingBase} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => editable && setEditing(true)}
              disabled={!editable}
              title={editable ? 'Editar guía' : tooltipBloqueada}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => editable && setDeleting(true)}
              disabled={!editable || eliminar.isPending}
              title={editable ? 'Eliminar guía' : tooltipBloqueada}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          </div>
        </div>

        <PiezasProgress guia={guia} />

        {totalPendiente && (
          <div className="flex items-start gap-2 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-3 text-sm text-[var(--color-warning)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Estamos esperando que el operario indique cuántas piezas componen esta guía.
              Apenas se confirme, podrás ver el avance pieza por pieza.
            </p>
          </div>
        )}

        {!editable && (
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-warning)]" />
            <p>
              Esta guía ya tiene piezas en proceso, por lo que el número y el destinatario
              no pueden modificarse. Si necesitas un cambio, contacta al operario.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <InfoBlock label="Destinatario" icon={<UserRound className="h-3.5 w-3.5" />}>
            <DestinatarioInfo
              nombre={guia.destinatarioNombre}
              telefono={guia.destinatarioTelefono}
              direccion={guia.destinatarioDireccion}
              provincia={guia.destinatarioProvincia}
              canton={guia.destinatarioCanton}
              emptyLabel="Sin asignar"
              emptyItalic
            />
          </InfoBlock>

          <InfoBlock label="Total esperado" icon={<PackageIcon className="h-3.5 w-3.5" />}>
            <p className="text-sm font-medium">
              {guia.totalPiezasEsperadas != null
                ? `${guia.totalPiezasEsperadas} pieza${guia.totalPiezasEsperadas === 1 ? '' : 's'}`
                : 'Pendiente'}
            </p>
            {guia.totalPiezasEsperadas == null && (
              <p className="mt-0.5 text-[11px] italic text-muted-foreground">
                Lo definirá el operario al recibir.
              </p>
            )}
          </InfoBlock>

          <InfoBlock label="Registrada" icon={<Calendar className="h-3.5 w-3.5" />}>
            <FechaRegistrada createdAt={guia.createdAt} />
          </InfoBlock>
        </div>
      </SurfaceCard>

      <SurfaceCard className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Piezas</h2>
          {piezas && piezas.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {piezas.length} pieza{piezas.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {loadingPiezas ? (
          <LoadingState text="Cargando piezas..." />
        ) : !piezas || piezas.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            Aún no hay piezas registradas para esta guía.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[5rem]">Pieza</TableHead>
                  <TableHead className="min-w-[14rem]">Guía ECUBOX</TableHead>
                  <TableHead className="w-[7rem]">Peso</TableHead>
                  <TableHead className="min-w-[10rem]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {piezas.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="align-top font-mono text-xs">
                      {p.piezaNumero != null && p.piezaTotal != null
                        ? `${p.piezaNumero}/${p.piezaTotal}`
                        : '—'}
                    </TableCell>
                    <TableCell className="max-w-[18rem] align-top font-medium">
                      <PiezaGuiaCell numeroGuia={p.numeroGuia} />
                    </TableCell>
                    <TableCell className="align-top text-xs">
                      <PesoCell pesoLbs={p.pesoLbs} pesoKg={p.pesoKg} />
                    </TableCell>
                    <TableCell className="align-top">
                      <PiezaEstadoBadges paquete={p} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SurfaceCard>

      {editing && editable && (
        <EditarMiGuiaDialog guia={guia} open onClose={() => setEditing(false)} />
      )}

      <ConfirmDialog
        open={deleting}
        onOpenChange={(open) => !open && !eliminar.isPending && setDeleting(false)}
        title="¿Eliminar guía?"
        description={`Se eliminará la guía "${guia.trackingBase}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        loading={eliminar.isPending}
        onConfirm={async () => {
          try {
            await eliminar.mutateAsync(guia.id);
            toast.success('Guía eliminada');
            navigate({ to: '/mis-guias' });
          } catch (err: unknown) {
            const res = (err as { response?: { data?: { message?: string } } })?.response;
            toast.error(res?.data?.message ?? 'No se pudo eliminar la guía');
            throw err;
          }
        }}
      />
    </div>
  );
}

function InfoBlock({
  label,
  icon,
  className,
  children,
}: {
  label: string;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-md border border-border bg-muted/30 p-3 ${className ?? ''}`.trim()}
    >
      <div className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}

function CopyButton({ text, label = 'Copiar guía' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Guía copiada');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar');
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      title={label}
      className="mt-1 shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-[var(--color-muted)] hover:text-foreground"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-[var(--color-success)]" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function PiezasProgress({ guia }: { guia: GuiaMaster }) {
  const total = guia.totalPiezasEsperadas ?? 0;
  const registradas = guia.piezasRegistradas ?? 0;
  const recibidas = guia.piezasRecibidas ?? 0;
  const despachadas = guia.piezasDespachadas ?? 0;

  if (total <= 0) {
    return (
      <div className="rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-3 text-xs text-[var(--color-warning)]">
        Total de piezas pendiente. Se definirá cuando el operario reciba el primer paquete.
      </div>
    );
  }

  const pct = (n: number) => Math.min(100, Math.round((n / total) * 100));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-muted-foreground">Progreso de piezas</span>
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">{despachadas}</span> de {total}{' '}
          despachadas
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--color-muted)]">
        <div
          className="absolute inset-y-0 left-0 bg-[var(--color-info)] dark:bg-[var(--color-info)]/30"
          style={{ width: `${pct(registradas)}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-[var(--color-warning)] dark:bg-[var(--color-warning)]/50"
          style={{ width: `${pct(recibidas)}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-[var(--color-success)]"
          style={{ width: `${pct(despachadas)}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[var(--color-info)] dark:bg-[var(--color-info)]/60" />
          Registradas {registradas}/{total}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[var(--color-warning)] dark:bg-[var(--color-warning)]" />
          Recibidas {recibidas}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
          Despachadas {despachadas}
        </span>
      </div>
    </div>
  );
}

function PiezaGuiaCell({ numeroGuia }: { numeroGuia: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(numeroGuia);
      setCopied(true);
      toast.success('Guía copiada');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar');
    }
  }

  return (
    <div className="group flex min-w-0 items-start gap-1">
      <a
        href={`/tracking?numeroGuia=${encodeURIComponent(numeroGuia)}`}
        className="min-w-0 break-all font-mono text-sm text-primary hover:underline"
        title={numeroGuia}
      >
        {numeroGuia}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copiar guía"
        title="Copiar guía"
        className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground opacity-60 transition-opacity hover:bg-[var(--color-muted)] hover:text-foreground hover:opacity-100"
      >
        {copied ? (
          <Check className="h-3 w-3 text-[var(--color-success)]" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}

function PesoCell({ pesoLbs, pesoKg }: { pesoLbs?: number; pesoKg?: number }) {
  if (pesoLbs == null && pesoKg == null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="space-y-0.5">
      {pesoLbs != null && (
        <p className="font-medium text-foreground">{pesoLbs.toFixed(2)} lb</p>
      )}
      {pesoKg != null && (
        <p className="text-[11px] text-muted-foreground">{pesoKg.toFixed(2)} kg</p>
      )}
    </div>
  );
}

function PiezaEstadoBadges({ paquete: p }: { paquete: Paquete }) {
  const estado = p.estadoRastreoNombre ?? p.estadoRastreoCodigo ?? '—';
  const recibida = piezaRecibida(p);
  const despachada = piezaDespachada(p);

  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant="secondary" className="font-normal">
        {estado}
      </Badge>
      {recibida && (
        <Badge
          variant="outline"
          className="border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 font-normal text-[var(--color-warning)]"
        >
          Recibida
        </Badge>
      )}
      {despachada && (
        <Badge
          variant="outline"
          className="border-[var(--color-success)]/30 bg-[var(--color-success)]/10 font-normal text-[var(--color-success)]"
        >
          Despachada
        </Badge>
      )}
    </div>
  );
}

function FechaRegistrada({ createdAt }: { createdAt?: string }) {
  if (!createdAt) return <p className="text-sm font-medium">—</p>;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return <p className="text-sm font-medium">—</p>;
  const absolute = date.toLocaleString();
  const short = date.toLocaleDateString();
  const rel = relativeTime(date);
  return (
    <div className="leading-tight" title={absolute}>
      <p className="text-sm font-medium">{short}</p>
      {rel && <p className="text-[11px] text-muted-foreground">{rel}</p>}
    </div>
  );
}

function relativeTime(date: Date): string | null {
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
