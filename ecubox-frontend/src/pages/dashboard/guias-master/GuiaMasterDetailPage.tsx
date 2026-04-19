import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  History,
  Pencil,
  RefreshCw,
  RotateCcw,
  Truck,
  UserRound,
  X,
  Building2,
  Package as PackageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  useCancelarGuiaMaster,
  useCerrarGuiaMasterConFaltante,
  useConfirmarDespachoParcial,
  useGuiaMaster,
  useGuiaMasterHistorial,
  useGuiaMasterPiezas,
  useMarcarGuiaMasterEnRevision,
  useReabrirGuiaMaster,
  useRecalcularGuiaMaster,
  useSalirGuiaMasterDeRevision,
} from '@/hooks/useGuiasMaster';
import type {
  GuiaMaster,
  GuiaMasterEstadoHistorial,
  TipoCambioEstadoGuiaMaster,
  TipoCierreGuiaMaster,
} from '@/types/guia-master';
import type { Paquete } from '@/types/paquete';
import {
  GUIA_MASTER_ESTADOS_TERMINALES,
  GuiaMasterEstadoBadge,
} from './_estado';
import { DestinatarioInfo } from '../paquetes/PaqueteCells';
import { EditarDestinatarioDialog } from './EditarDestinatarioDialog';

function piezaRecibida(p: Paquete): boolean {
  return p.pesoLbs != null || p.pesoKg != null;
}

function piezaDespachada(p: Paquete): boolean {
  return p.despachoId != null || (p.despachoNumeroGuia ?? '').length > 0;
}

export function GuiaMasterDetailPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const id = Number(params.id);
  const { data: guia, isLoading, error } = useGuiaMaster(id);
  const { data: piezas, isLoading: loadingPiezas } = useGuiaMasterPiezas(id);
  const recalcular = useRecalcularGuiaMaster();

  const [cerrarOpen, setCerrarOpen] = useState(false);
  const [despachoPiezaId, setDespachoPiezaId] = useState<number | null>(null);
  const [cancelarOpen, setCancelarOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [salirRevisionOpen, setSalirRevisionOpen] = useState(false);
  const [reabrirOpen, setReabrirOpen] = useState(false);

  if (isLoading) return <LoadingState text="Cargando guía master..." />;
  if (error || !guia) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" onClick={() => navigate({ to: '/guias-master' })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <div className="ui-alert ui-alert-error">
          No se pudo cargar la guía master.
        </div>
      </div>
    );
  }

  const enRevision = guia.estadoGlobal === 'EN_REVISION';
  const cancelada = guia.estadoGlobal === 'CANCELADA';
  const cerradaTerminal = GUIA_MASTER_ESTADOS_TERMINALES.has(guia.estadoGlobal);
  const cerrada = cerradaTerminal || enRevision;
  const puedeCancelar =
    !cerradaTerminal &&
    (guia.piezasDespachadas ?? 0) === 0 &&
    !enRevision; // mientras no esté en revisión activa
  const puedeMarcarRevision = !cerradaTerminal && !enRevision;
  const puedeSalirRevision = enRevision;
  const puedeReabrir = cerradaTerminal;
  const puedeCerrarConFaltante = !cerradaTerminal && !enRevision;

  return (
    <div className="page-stack">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/guias-master' })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      <SurfaceCard className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Guía master
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
            {!cerrada && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await recalcular.mutateAsync(id);
                    toast.success('Estado recalculado');
                  } catch {
                    toast.error('Error al recalcular el estado');
                  }
                }}
                disabled={recalcular.isPending}
                title="Vuelve a calcular el estado a partir de las piezas registradas"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Recalcular
              </Button>
            )}
            {puedeMarcarRevision && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRevisionOpen(true)}
                title="Pausa el flujo automático para validar datos"
              >
                <Eye className="mr-2 h-4 w-4" />
                Marcar en revisión
              </Button>
            )}
            {puedeSalirRevision && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSalirRevisionOpen(true)}
                title="Reanuda el flujo automático y recalcula el estado"
              >
                <EyeOff className="mr-2 h-4 w-4" />
                Salir de revisión
              </Button>
            )}
            {puedeReabrir && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReabrirOpen(true)}
                title="Reabre la guía para continuar el flujo"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reabrir
              </Button>
            )}
            {puedeCerrarConFaltante && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setCerrarOpen(true)}
              >
                <X className="mr-2 h-4 w-4" />
                Cerrar con faltante
              </Button>
            )}
            {puedeCancelar && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setCancelarOpen(true)}
                title="Anular la guía antes de despachar"
              >
                <Ban className="mr-2 h-4 w-4" />
                Cancelar guía
              </Button>
            )}
          </div>
        </div>

        {cancelada && (
          <div className="flex items-start gap-2 rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 p-3 text-sm text-[var(--color-destructive)]">
            <Ban className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Guía cancelada</p>
              <p className="text-xs opacity-80">
                Esta guía fue anulada. Si necesitas continuar el flujo, pulsa{' '}
                <strong>Reabrir</strong>.
              </p>
            </div>
          </div>
        )}

        {enRevision && (
          <div className="flex items-start gap-2 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-3 text-sm text-[var(--color-warning)]">
            <Eye className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Guía en revisión</p>
              <p className="text-xs opacity-80">
                El recálculo automático está pausado mientras se valida la información.
                Pulsa <strong>Salir de revisión</strong> para reanudar.
              </p>
            </div>
          </div>
        )}

        <PiezasProgress guia={guia} />

        {guia.totalPiezasEsperadas == null && (
          <div className="flex items-start gap-2 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-3 text-sm text-[var(--color-warning)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Esta guía aún no tiene un total de piezas esperadas. Edita los
              metadatos para indicarlo y poder registrar piezas.
            </p>
          </div>
        )}

        {guia.despachoParcialEnCurso && (
          <div className="flex items-start gap-2 rounded-md border border-[var(--color-primary)]/30 bg-[var(--color-muted)] p-3 text-sm text-[var(--color-primary)]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Despacho parcial en curso</p>
              <p className="text-xs opacity-80">
                Se han despachado {guia.piezasDespachadas ?? 0} de{' '}
                {guia.totalPiezasEsperadas ?? '?'} piezas. La guía permanece abierta para
                las restantes.
              </p>
            </div>
          </div>
        )}

        {!guia.despachoParcialEnCurso && guia.listaParaDespachoParcial && (
          <div className="flex items-start gap-2 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-3 text-sm text-[var(--color-warning)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Lista para despacho parcial. Pulsa <strong>Despachar parcial</strong>{' '}
              en cada pieza recibida para autorizar su salida sin esperar al resto.
            </p>
          </div>
        )}

        <MetadataInline guia={guia} />
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
            Aún no hay piezas registradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[5rem]">Pieza</TableHead>
                  <TableHead className="min-w-[14rem]">Guía ECUBOX</TableHead>
                  <TableHead className="w-[6rem]">Peso</TableHead>
                  <TableHead className="min-w-[10rem]">Estado</TableHead>
                  <TableHead className="min-w-[10rem]">Despacho</TableHead>
                  <TableHead className="w-[10rem] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {piezas.map((p) => {
                  const recibida = piezaRecibida(p);
                  const despachada = piezaDespachada(p);
                  const puedeDespacharParcial =
                    guia.listaParaDespachoParcial &&
                    recibida &&
                    !despachada &&
                    !cerrada;
                  return (
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
                      <TableCell className="max-w-[14rem] align-top text-xs">
                        {p.despachoNumeroGuia ? (
                          <span
                            className="break-all font-mono text-foreground"
                            title={p.despachoNumeroGuia}
                          >
                            {p.despachoNumeroGuia}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-right">
                        {puedeDespacharParcial && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDespachoPiezaId(p.id)}
                          >
                            <Truck className="mr-2 h-4 w-4" />
                            Despachar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SurfaceCard>

      <CierreAuditCard guia={guia} />

      <HistorialEstadosCard guiaMasterId={id} />

      {cerrarOpen && (
        <CerrarConFaltanteAlert
          guiaMasterId={id}
          onClose={() => setCerrarOpen(false)}
        />
      )}
      {despachoPiezaId != null && (
        <DespacharParcialAlert
          guiaMasterId={id}
          piezaId={despachoPiezaId}
          onClose={() => setDespachoPiezaId(null)}
        />
      )}
      {cancelarOpen && (
        <CancelarGuiaAlert guiaMasterId={id} onClose={() => setCancelarOpen(false)} />
      )}
      {revisionOpen && (
        <MarcarRevisionAlert
          guiaMasterId={id}
          onClose={() => setRevisionOpen(false)}
        />
      )}
      {salirRevisionOpen && (
        <SalirRevisionAlert
          guiaMasterId={id}
          onClose={() => setSalirRevisionOpen(false)}
        />
      )}
      {reabrirOpen && (
        <ReabrirGuiaAlert guiaMasterId={id} onClose={() => setReabrirOpen(false)} />
      )}
    </div>
  );
}

function MetadataInline({ guia }: { guia: GuiaMaster }) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <InfoBlock label="Cliente" icon={<Building2 className="h-3.5 w-3.5" />}>
          <p className="text-sm font-medium">
            {guia.clienteUsuarioNombre ?? (
              <span className="italic text-muted-foreground">Sin asignar</span>
            )}
          </p>
        </InfoBlock>

        <InfoBlock label="Destinatario" className="md:col-span-1">
          <DestinatarioInfo
            nombre={guia.destinatarioNombre}
            telefono={guia.destinatarioTelefono}
            direccion={guia.destinatarioDireccion}
            provincia={guia.destinatarioProvincia}
            canton={guia.destinatarioCanton}
            emptyLabel="Sin asignar"
            emptyItalic
          />
          {guia.destinatarioVersionId != null && (
            <p
              className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              title={
                guia.destinatarioCongeladoEn
                  ? `Datos del destinatario congelados al primer despacho (${new Date(guia.destinatarioCongeladoEn).toLocaleString()}). Cambios en el maestro ya no afectan a esta guia.`
                  : 'Datos del destinatario congelados al primer despacho.'
              }
            >
              Datos congelados
            </p>
          )}
        </InfoBlock>

        <InfoBlock label="Total esperado" icon={<PackageIcon className="h-3.5 w-3.5" />}>
          <p className="text-sm font-medium">
            {guia.totalPiezasEsperadas != null
              ? `${guia.totalPiezasEsperadas} pieza${guia.totalPiezasEsperadas === 1 ? '' : 's'}`
              : 'Pendiente'}
          </p>
          {guia.totalPiezasEsperadas == null && (
            <p className="mt-0.5 text-[11px] italic text-muted-foreground">
              Se establecerá al registrar paquetes para esta guía.
            </p>
          )}
          {guia.minPiezasParaDespachoParcial != null && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Mín. para despacho parcial: {guia.minPiezasParaDespachoParcial}
            </p>
          )}
        </InfoBlock>
      </div>
      <div className="flex items-start justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditing(true)}
          title="Editar cliente y destinatario"
        >
          <Pencil className="mr-2 h-4 w-4" />
          Editar cliente y destinatario
        </Button>
      </div>

      <EditarDestinatarioDialog
        guia={guia}
        open={editing}
        onClose={() => setEditing(false)}
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
        Total de piezas pendiente. Se definirá al registrar el primer paquete.
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

function CerrarConFaltanteAlert({
  guiaMasterId,
  onClose,
}: {
  guiaMasterId: number;
  onClose: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const cerrar = useCerrarGuiaMasterConFaltante();

  async function handleConfirm() {
    try {
      await cerrar.mutateAsync({
        id: guiaMasterId,
        body: { motivo: motivo.trim() || undefined },
      });
      toast.success('Guía master cerrada con faltante');
      onClose();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(res?.data?.message ?? 'No se pudo cerrar la guía master');
    }
  }

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cerrar con faltante</AlertDialogTitle>
          <AlertDialogDescription>
            Marca la guía como cerrada aunque falten piezas por recibir o despachar.
            Solo funciona si al menos una pieza ya fue despachada.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <Label htmlFor="motivo" className="mb-1 block">
            Motivo (opcional)
          </Label>
          <Textarea
            id="motivo"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: Pieza 3/3 extraviada en vuelo"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="secondary" disabled={cerrar.isPending}>
              Cancelar
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={cerrar.isPending}
            >
              {cerrar.isPending ? 'Cerrando...' : 'Cerrar con faltante'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DespacharParcialAlert({
  guiaMasterId,
  piezaId,
  onClose,
}: {
  guiaMasterId: number;
  piezaId: number;
  onClose: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const confirmar = useConfirmarDespachoParcial();

  async function handleConfirm() {
    try {
      await confirmar.mutateAsync({
        id: guiaMasterId,
        body: { piezaId, motivo: motivo.trim() || undefined },
      });
      toast.success('Despacho parcial confirmado');
      onClose();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(res?.data?.message ?? 'No se pudo confirmar el despacho parcial');
    }
  }

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Despachar pieza parcialmente</AlertDialogTitle>
          <AlertDialogDescription>
            Autoriza despachar esta pieza sin esperar a las restantes. Las piezas
            faltantes podrán despacharse cuando lleguen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <Label htmlFor="motivo-parcial" className="mb-1 block">
            Motivo (opcional)
          </Label>
          <Textarea
            id="motivo-parcial"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: pieza 3/3 demorada en aduana"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="secondary" disabled={confirmar.isPending}>
              Cancelar
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleConfirm} disabled={confirmar.isPending}>
              {confirmar.isPending ? 'Confirmando...' : 'Confirmar'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const TIPO_CIERRE_LABELS: Record<TipoCierreGuiaMaster, string> = {
  DESPACHO_COMPLETADO: 'Despacho completado',
  DESPACHO_INCOMPLETO_MANUAL: 'Cerrada manualmente con faltante',
  DESPACHO_INCOMPLETO_TIMEOUT: 'Cerrada automáticamente por timeout',
  CANCELACION: 'Cancelación',
};

function formatFechaHora(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });
}

function CierreAuditCard({ guia }: { guia: GuiaMaster }) {
  if (!guia.cerradaEn && !guia.tipoCierre) return null;
  const tipoLabel = guia.tipoCierre
    ? TIPO_CIERRE_LABELS[guia.tipoCierre] ?? guia.tipoCierre
    : '—';

  return (
    <SurfaceCard className="space-y-3 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Auditoría de cierre</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <InfoBlock label="Tipo de cierre">
          <p className="text-sm font-medium">{tipoLabel}</p>
        </InfoBlock>
        <InfoBlock label="Fecha de cierre">
          <p className="text-sm font-medium">{formatFechaHora(guia.cerradaEn)}</p>
        </InfoBlock>
        <InfoBlock label="Cerrada por" icon={<UserRound className="h-3.5 w-3.5" />}>
          <p className="text-sm font-medium">
            {guia.cerradaPorUsuarioNombre ?? (
              <span className="italic text-muted-foreground">Sistema</span>
            )}
          </p>
        </InfoBlock>
      </div>
      {guia.motivoCierre && (
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            Motivo
          </p>
          <p className="whitespace-pre-wrap text-sm">{guia.motivoCierre}</p>
        </div>
      )}
    </SurfaceCard>
  );
}

const TIPO_CAMBIO_LABELS: Record<TipoCambioEstadoGuiaMaster, string> = {
  CREACION: 'Creación',
  RECALCULO_AUTOMATICO: 'Recálculo automático',
  CIERRE_MANUAL_FALTANTE: 'Cierre manual con faltante',
  AUTO_CIERRE_TIMEOUT: 'Auto cierre por timeout',
  CANCELACION: 'Cancelación',
  MARCAR_REVISION: 'Marcada en revisión',
  SALIR_REVISION: 'Salida de revisión',
  REAPERTURA: 'Reapertura',
};

function HistorialEstadosCard({ guiaMasterId }: { guiaMasterId: number }) {
  const { data, isLoading, error } = useGuiaMasterHistorial(guiaMasterId);

  return (
    <SurfaceCard className="space-y-3 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <History className="h-4 w-4 text-muted-foreground" /> Historial de estados
        </h2>
        {data && data.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {data.length} cambio{data.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
      {isLoading ? (
        <LoadingState text="Cargando historial..." />
      ) : error ? (
        <p className="rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 p-3 text-sm text-[var(--color-destructive)]">
          No se pudo cargar el historial.
        </p>
      ) : !data || data.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          Sin cambios registrados.
        </p>
      ) : (
        <ol className="space-y-3">
          {[...data]
            .sort(
              (a, b) =>
                new Date(b.cambiadoEn).getTime() - new Date(a.cambiadoEn).getTime()
            )
            .map((h) => (
              <HistorialItem key={h.id} item={h} />
            ))}
        </ol>
      )}
    </SurfaceCard>
  );
}

function HistorialItem({ item }: { item: GuiaMasterEstadoHistorial }) {
  return (
    <li className="rounded-md border border-border bg-muted/20 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {item.estadoAnterior ? (
          <>
            <GuiaMasterEstadoBadge estado={item.estadoAnterior} withTitle={false} />
            <span className="text-muted-foreground">→</span>
          </>
        ) : null}
        <GuiaMasterEstadoBadge estado={item.estadoNuevo} withTitle={false} />
        <Badge variant="outline" className="font-normal">
          {TIPO_CAMBIO_LABELS[item.tipoCambio] ?? item.tipoCambio}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{formatFechaHora(item.cambiadoEn)}</span>
        <span className="flex items-center gap-1">
          <UserRound className="h-3 w-3" />
          {item.cambiadoPorUsuarioNombre ?? 'Sistema'}
        </span>
      </div>
      {item.motivo && (
        <p className="mt-2 whitespace-pre-wrap text-xs text-foreground/80">
          {item.motivo}
        </p>
      )}
    </li>
  );
}

function CancelarGuiaAlert({
  guiaMasterId,
  onClose,
}: {
  guiaMasterId: number;
  onClose: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const cancelar = useCancelarGuiaMaster();

  async function handleConfirm() {
    if (!motivo.trim()) {
      toast.error('Debes indicar un motivo para cancelar la guía');
      return;
    }
    try {
      await cancelar.mutateAsync({
        id: guiaMasterId,
        body: { motivo: motivo.trim() },
      });
      toast.success('Guía cancelada');
      onClose();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(res?.data?.message ?? 'No se pudo cancelar la guía');
    }
  }

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar guía master</AlertDialogTitle>
          <AlertDialogDescription>
            Anula la guía antes de despachar piezas. Solo aplica si aún no se ha
            despachado ninguna pieza. Quedará registrada en el historial.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <Label htmlFor="motivo-cancelar" className="mb-1 block">
            Motivo (obligatorio)
          </Label>
          <Textarea
            id="motivo-cancelar"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: cliente solicitó anulación / error de registro"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="secondary" disabled={cancelar.isPending}>
              Volver
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={cancelar.isPending}
            >
              {cancelar.isPending ? 'Cancelando...' : 'Cancelar guía'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function MarcarRevisionAlert({
  guiaMasterId,
  onClose,
}: {
  guiaMasterId: number;
  onClose: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const marcar = useMarcarGuiaMasterEnRevision();

  async function handleConfirm() {
    try {
      await marcar.mutateAsync({
        id: guiaMasterId,
        body: { motivo: motivo.trim() || undefined },
      });
      toast.success('Guía marcada en revisión');
      onClose();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(res?.data?.message ?? 'No se pudo marcar en revisión');
    }
  }

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Marcar guía en revisión</AlertDialogTitle>
          <AlertDialogDescription>
            Pausa el recálculo automático del estado mientras se valida algún dato.
            Podrás reanudarla con <strong>Salir de revisión</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <Label htmlFor="motivo-revision" className="mb-1 block">
            Motivo (opcional)
          </Label>
          <Textarea
            id="motivo-revision"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: validar peso reportado / contactar al cliente"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="secondary" disabled={marcar.isPending}>
              Volver
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleConfirm} disabled={marcar.isPending}>
              {marcar.isPending ? 'Marcando...' : 'Marcar en revisión'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SalirRevisionAlert({
  guiaMasterId,
  onClose,
}: {
  guiaMasterId: number;
  onClose: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const salir = useSalirGuiaMasterDeRevision();

  async function handleConfirm() {
    try {
      await salir.mutateAsync({
        id: guiaMasterId,
        body: { motivo: motivo.trim() || undefined },
      });
      toast.success('Revisión finalizada y estado recalculado');
      onClose();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(res?.data?.message ?? 'No se pudo salir de revisión');
    }
  }

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Salir de revisión</AlertDialogTitle>
          <AlertDialogDescription>
            Reanuda el flujo automático y recalcula el estado de la guía a partir de
            las piezas registradas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <Label htmlFor="motivo-salir-revision" className="mb-1 block">
            Comentario (opcional)
          </Label>
          <Textarea
            id="motivo-salir-revision"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: información validada con el cliente"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="secondary" disabled={salir.isPending}>
              Volver
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleConfirm} disabled={salir.isPending}>
              {salir.isPending ? 'Saliendo...' : 'Salir de revisión'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ReabrirGuiaAlert({
  guiaMasterId,
  onClose,
}: {
  guiaMasterId: number;
  onClose: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const reabrir = useReabrirGuiaMaster();

  async function handleConfirm() {
    if (!motivo.trim()) {
      toast.error('Debes indicar un motivo para reabrir la guía');
      return;
    }
    try {
      await reabrir.mutateAsync({
        id: guiaMasterId,
        body: { motivo: motivo.trim() },
      });
      toast.success('Guía reabierta');
      onClose();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(res?.data?.message ?? 'No se pudo reabrir la guía');
    }
  }

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reabrir guía master</AlertDialogTitle>
          <AlertDialogDescription>
            Sale del estado terminal y reanuda el flujo. El nuevo estado se calcula a
            partir de las piezas registradas. Quedará auditado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <Label htmlFor="motivo-reabrir" className="mb-1 block">
            Motivo (obligatorio)
          </Label>
          <Textarea
            id="motivo-reabrir"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: pieza faltante apareció / cierre por error"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="secondary" disabled={reabrir.isPending}>
              Volver
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleConfirm} disabled={reabrir.isPending}>
              {reabrir.isPending ? 'Reabriendo...' : 'Reabrir'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
