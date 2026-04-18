import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Pencil,
  RefreshCw,
  Truck,
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
  useCerrarGuiaMasterConFaltante,
  useConfirmarDespachoParcial,
  useGuiaMaster,
  useGuiaMasterPiezas,
  useRecalcularGuiaMaster,
} from '@/hooks/useGuiasMaster';
import type { GuiaMaster } from '@/types/guia-master';
import type { Paquete } from '@/types/paquete';
import { GuiaMasterEstadoBadge } from './_estado';
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

  const cerrada =
    guia.estadoGlobal === 'CERRADA' || guia.estadoGlobal === 'CERRADA_CON_FALTANTE';

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
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Recalcular
            </Button>
            {!cerrada && (
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
          </div>
        </div>

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
          <div className="flex items-start gap-2 rounded-md border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 p-3 text-sm text-[var(--color-primary)]">
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
