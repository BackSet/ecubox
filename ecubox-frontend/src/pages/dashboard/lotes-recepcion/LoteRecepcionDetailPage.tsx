import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useState, useCallback, useMemo } from 'react';
import {
  useLoteRecepcion,
  useAddGuiasToLoteRecepcion,
  useDeleteLoteRecepcion,
} from '@/hooks/useLotesRecepcion';
import { useEnviosConsolidados } from '@/hooks/useEnviosConsolidados';
import { LoadingState } from '@/components/LoadingState';
import { ListTableShell } from '@/components/ListTableShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { KpiCard } from '@/components/KpiCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
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
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  CalendarClock,
  Check,
  Copy,
  FileText,
  ListPlus,
  PackageCheck,
  Plus,
  Search,
  Trash2,
  Truck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Paquete } from '@/types/paquete';
import type { EnvioConsolidado } from '@/types/envio-consolidado';
import {
  DestinatarioCell,
  GuiaMasterPiezaCell,
} from '@/pages/dashboard/paquetes/PaqueteCells';

function formatFechaLarga(s: string | undefined): string {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('es-EC', { dateStyle: 'long', timeStyle: 'short' });
}

function relativeTime(s: string | undefined): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'hace instantes';
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `hace ${days} d`;
  return d.toLocaleDateString('es-EC');
}

export function LoteRecepcionDetailPage() {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const id = params.id != null ? Number(params.id) : NaN;
  const validId = Number.isNaN(id) ? undefined : id;

  const { data: lote, isLoading, error } = useLoteRecepcion(validId);
  const addGuias = useAddGuiasToLoteRecepcion(validId);
  const deleteLote = useDeleteLoteRecepcion();

  const [search, setSearch] = useState('');
  const [groupByDestinatario, setGroupByDestinatario] = useState(false);
  const [dialogAgregarOpen, setDialogAgregarOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const paquetes = lote?.paquetes ?? [];
  const codigosLote = lote?.numeroGuiasEnvio ?? [];

  const aportePorEnvio = useMemo(() => {
    const map = new Map<string, { paquetes: number; pesoLbs: number; pesoKg: number }>();
    for (const c of codigosLote) {
      map.set(c, { paquetes: 0, pesoLbs: 0, pesoKg: 0 });
    }
    for (const p of paquetes) {
      const codigo = p.envioConsolidadoCodigo ?? '';
      if (!codigo) continue;
      const cur = map.get(codigo) ?? { paquetes: 0, pesoLbs: 0, pesoKg: 0 };
      cur.paquetes += 1;
      cur.pesoLbs += Number(p.pesoLbs ?? 0);
      cur.pesoKg += Number(p.pesoKg ?? 0);
      map.set(codigo, cur);
    }
    return map;
  }, [paquetes, codigosLote]);

  const stats = useMemo(() => {
    const destinatarios = new Set<number | string>();
    let pesoLbs = 0;
    let pesoKg = 0;
    for (const p of paquetes) {
      destinatarios.add(p.destinatarioFinalId ?? p.destinatarioNombre ?? p.id);
      pesoLbs += Number(p.pesoLbs ?? 0);
      pesoKg += Number(p.pesoKg ?? 0);
    }
    return {
      envios: codigosLote.length,
      paquetes: paquetes.length,
      destinatarios: destinatarios.size,
      pesoLbs,
      pesoKg,
    };
  }, [paquetes, codigosLote]);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return paquetes;
    return paquetes.filter((p) =>
      [
        p.numeroGuia,
        p.guiaMasterTrackingBase,
        p.ref,
        p.contenido,
        p.destinatarioNombre,
        p.destinatarioTelefono,
        p.destinatarioDireccion,
        p.destinatarioProvincia,
        p.destinatarioCanton,
        p.envioConsolidadoCodigo,
        p.estadoRastreoNombre,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [paquetes, search]);

  const grupos = useMemo(() => {
    if (!groupByDestinatario) return null;
    const norm = (v?: string | null) => (v ?? '').trim().toLowerCase();
    const map = new Map<
      string,
      {
        key: string;
        destinatarioId: number | undefined;
        destinatario: string;
        provincia: string;
        canton: string;
        paquetes: Paquete[];
        pesoLbs: number;
        pesoKg: number;
      }
    >();
    for (const p of filtrados) {
      const destinatario = p.destinatarioNombre?.trim() || 'Sin destinatario';
      const provincia = p.destinatarioProvincia?.trim() || 'Sin provincia';
      const canton = p.destinatarioCanton?.trim() || 'Sin cantón';
      const key = `${p.destinatarioFinalId ?? 0}__${norm(provincia)}__${norm(canton)}`;
      const cur = map.get(key);
      if (cur) {
        cur.paquetes.push(p);
        cur.pesoLbs += Number(p.pesoLbs ?? 0);
        cur.pesoKg += Number(p.pesoKg ?? 0);
      } else {
        map.set(key, {
          key,
          destinatarioId: p.destinatarioFinalId,
          destinatario,
          provincia,
          canton,
          paquetes: [p],
          pesoLbs: Number(p.pesoLbs ?? 0),
          pesoKg: Number(p.pesoKg ?? 0),
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.provincia !== b.provincia) return a.provincia.localeCompare(b.provincia, 'es');
      if (a.canton !== b.canton) return a.canton.localeCompare(b.canton, 'es');
      return a.destinatario.localeCompare(b.destinatario, 'es');
    });
  }, [filtrados, groupByDestinatario]);

  const copiarGuiasDestinatario = useCallback(
    async (paqs: Paquete[], etiqueta: string) => {
      const guias = Array.from(
        new Set(paqs.map((p) => p.numeroGuia.trim()).filter(Boolean)),
      );
      if (guias.length === 0) {
        toast.error('No hay guías para copiar.');
        return;
      }
      try {
        await navigator.clipboard.writeText(guias.join('\n'));
        toast.success(`Se copiaron ${guias.length} guías de ${etiqueta}.`);
      } catch {
        toast.error('No se pudo copiar al portapapeles.');
      }
    },
    [],
  );

  const handleEliminar = useCallback(async () => {
    if (validId == null) return;
    try {
      await deleteLote.mutateAsync(validId);
      toast.success('Lote eliminado.');
      navigate({ to: '/lotes-recepcion' });
    } catch {
      toast.error('No se pudo eliminar el lote.');
      throw new Error('delete-failed');
    }
  }, [deleteLote, navigate, validId]);

  if (Number.isNaN(id)) {
    return (
      <div className="ui-alert ui-alert-error">
        ID de lote no válido.
        <Link to="/lotes-recepcion" className="ml-2 underline">
          Volver a lotes de recepción
        </Link>
      </div>
    );
  }

  if (isLoading) return <LoadingState text="Cargando lote..." />;

  if (error || !lote) {
    return (
      <div className="ui-alert ui-alert-error">
        No se pudo cargar el lote.
        <Link to="/lotes-recepcion" className="ml-2 underline">
          Volver a lotes de recepción
        </Link>
      </div>
    );
  }

  const fechaRel = relativeTime(lote.fechaRecepcion);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link to="/lotes-recepcion">
            <Button variant="ghost" size="icon" aria-label="Volver a lotes de recepción">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[18px] font-semibold tracking-tight text-foreground">
                Lote de recepción
              </h1>
              <Badge variant="outline" className="font-mono">
                #{lote.id}
              </Badge>
              <Badge className="bg-[var(--color-success)]/15 font-normal text-[var(--color-success)] hover:bg-[var(--color-success)]/20 dark:text-[var(--color-success)]">
                <PackageCheck className="mr-1 h-3 w-3" />
                Recibido en bodega
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatFechaLarga(lote.fechaRecepcion)}
              {fechaRel && (
                <span className="ml-2 text-xs text-muted-foreground/80">
                  · {fechaRel}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDialogAgregarOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar envíos
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmDeleteOpen(true)}
            className="text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 hover:text-[var(--color-destructive)]"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar lote
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<Truck className="h-5 w-5" />}
          label="Envíos consolidados"
          value={stats.envios}
          tone="primary"
        />
        <KpiCard
          icon={<Boxes className="h-5 w-5" />}
          label="Paquetes recibidos"
          value={stats.paquetes}
          tone="success"
        />
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Destinatarios"
          value={stats.destinatarios}
          tone="neutral"
        />
        <KpiCard
          icon={<PackageCheck className="h-5 w-5" />}
          label="Peso total"
          value={
            stats.pesoLbs > 0
              ? `${stats.pesoLbs.toFixed(2)} lbs`
              : stats.pesoKg > 0
                ? `${stats.pesoKg.toFixed(2)} kg`
                : '—'
          }
          tone="neutral"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr,1.2fr]">
        <section className="rounded-lg border border-border bg-card p-5">
          <header className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Información del lote
            </h2>
          </header>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
                Fecha de recepción
              </dt>
              <dd className="text-right">
                <div className="text-foreground">
                  {formatFechaLarga(lote.fechaRecepcion)}
                </div>
                {fechaRel && (
                  <div className="text-xs text-muted-foreground">{fechaRel}</div>
                )}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                Operario
              </dt>
              <dd className="text-foreground">{lote.operarioNombre ?? '—'}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                Observaciones
              </dt>
              <dd
                className={`whitespace-pre-wrap rounded-md border border-dashed border-border bg-[var(--color-muted)]/20 p-2 text-sm ${
                  lote.observaciones ? 'text-foreground' : 'text-muted-foreground italic'
                }`}
              >
                {lote.observaciones || 'Sin observaciones'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <header className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Envíos consolidados incluidos
              </h2>
            </div>
            <Badge variant="secondary">{codigosLote.length}</Badge>
          </header>
          {codigosLote.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Este lote aún no tiene envíos asociados. Usa{' '}
              <button
                type="button"
                className="text-primary underline-offset-2 hover:underline"
                onClick={() => setDialogAgregarOpen(true)}
              >
                Agregar envíos
              </button>{' '}
              para incluir uno.
            </p>
          ) : (
            <ul className="space-y-2">
              {codigosLote.map((codigo) => {
                const aporte = aportePorEnvio.get(codigo);
                return (
                  <li
                    key={codigo}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <PackageCheck className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <CopiableMono text={codigo} />
                        <p className="text-xs text-muted-foreground">
                          {(aporte?.paquetes ?? 0)} paquete
                          {aporte?.paquetes === 1 ? '' : 's'}
                          {aporte && aporte.pesoLbs > 0
                            ? ` · ${aporte.pesoLbs.toFixed(2)} lbs`
                            : ''}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Paquetes del lote
            </h2>
            <Badge variant="secondary">{filtrados.length}</Badge>
            {filtrados.length !== paquetes.length && (
              <span className="text-xs text-muted-foreground">
                de {paquetes.length}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por guía, destinatario, ref..."
                className="h-9 w-[18rem] pl-8"
              />
            </div>
            <Button
              type="button"
              variant={groupByDestinatario ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGroupByDestinatario((v) => !v)}
            >
              <Users className="mr-2 h-4 w-4" />
              {groupByDestinatario ? 'Vista plana' : 'Agrupar por destinatario'}
            </Button>
          </div>
        </div>

        {paquetes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-[var(--color-muted)]/30 px-4 py-12 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No hay paquetes asociados a los envíos de este lote.
            </p>
          </div>
        ) : grupos ? (
          <div className="space-y-4">
            {grupos.map((g) => (
              <div
                key={g.key}
                className="overflow-hidden rounded-lg border border-border bg-card"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-[var(--color-muted)]/30 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {g.destinatario}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {g.canton}, {g.provincia}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {g.paquetes.length} paquete{g.paquetes.length === 1 ? '' : 's'}
                    </Badge>
                    {(g.pesoLbs > 0 || g.pesoKg > 0) && (
                      <Badge variant="outline">
                        {g.pesoLbs > 0 ? `${g.pesoLbs.toFixed(2)} lbs` : ''}
                        {g.pesoLbs > 0 && g.pesoKg > 0 ? ' · ' : ''}
                        {g.pesoKg > 0 ? `${g.pesoKg.toFixed(2)} kg` : ''}
                      </Badge>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void copiarGuiasDestinatario(g.paquetes, g.destinatario)
                      }
                    >
                      <Copy className="mr-2 h-3.5 w-3.5" />
                      Copiar guías
                    </Button>
                  </div>
                </div>
                <PaquetesTabla paquetes={g.paquetes} />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <PaquetesTabla paquetes={filtrados} />
          </div>
        )}
      </section>

      <AgregarEnviosDialog
        open={dialogAgregarOpen}
        onOpenChange={setDialogAgregarOpen}
        codigosYaIncluidos={codigosLote}
        onConfirm={async (codigos) => {
          try {
            await addGuias.mutateAsync(codigos);
            toast.success(
              `Se agregaron ${codigos.length} envío${codigos.length === 1 ? '' : 's'} al lote.`,
            );
            setDialogAgregarOpen(false);
          } catch {
            toast.error('Error al agregar envíos al lote.');
          }
        }}
        loading={addGuias.isPending}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={(open) => !open && !deleteLote.isPending && setConfirmDeleteOpen(false)}
        title="¿Eliminar lote?"
        description={
          `Se eliminará el lote #${lote.id} con ${stats.paquetes} paquete${stats.paquetes === 1 ? '' : 's'}. ` +
          'Los paquetes que aún tengan el evento de recepción de este lote como último cambio volverán a su estado anterior.'
        }
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteLote.isPending}
        onConfirm={handleEliminar}
      />
    </div>
  );
}

function PaquetesTabla({ paquetes }: { paquetes: Paquete[] }) {
  if (paquetes.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        Sin paquetes que coincidan con la búsqueda.
      </p>
    );
  }
  return (
    <ListTableShell>
      <Table className="min-w-[920px] text-left">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[16rem]">Guía / Pieza</TableHead>
            <TableHead className="min-w-[16rem]">Destinatario</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Envío</TableHead>
            <TableHead className="text-right">Peso</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paquetes.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="max-w-[16rem] align-top">
                <GuiaMasterPiezaCell paquete={p} />
                {p.ref && (
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {p.ref}
                  </p>
                )}
              </TableCell>
              <TableCell className="max-w-[20rem] align-top">
                <DestinatarioCell paquete={p} />
              </TableCell>
              <TableCell className="align-top">
                <Badge variant="secondary" className="font-normal">
                  {p.estadoRastreoNombre ?? p.estadoRastreoCodigo ?? '—'}
                </Badge>
              </TableCell>
              <TableCell className="align-top">
                {p.envioConsolidadoCodigo ? (
                  <span className="font-mono text-xs">
                    {p.envioConsolidadoCodigo}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right align-top text-sm tabular-nums">
                {p.pesoLbs != null ? (
                  <div>{p.pesoLbs.toFixed(2)} lbs</div>
                ) : null}
                {p.pesoKg != null ? (
                  <div className="text-xs text-muted-foreground">
                    {p.pesoKg.toFixed(2)} kg
                  </div>
                ) : null}
                {p.pesoLbs == null && p.pesoKg == null && (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ListTableShell>
  );
}

function CopiableMono({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar.');
    }
  }
  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="truncate font-mono text-sm font-medium text-foreground">
        {text}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copiar código"
        title="Copiar código"
        className="shrink-0 rounded p-0.5 text-muted-foreground opacity-60 transition-opacity hover:bg-[var(--color-muted)] hover:text-foreground hover:opacity-100"
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

interface AgregarEnviosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codigosYaIncluidos: string[];
  onConfirm: (codigos: string[]) => Promise<void> | void;
  loading: boolean;
}

function AgregarEnviosDialog({
  open,
  onOpenChange,
  codigosYaIncluidos,
  onConfirm,
  loading,
}: AgregarEnviosDialogProps) {
  const [seleccionados, setSeleccionados] = useState<EnvioConsolidado[]>([]);
  const [comboValue, setComboValue] = useState<number | undefined>(undefined);
  const [bulkText, setBulkText] = useState('');

  const { data: enviosResp, isLoading } = useEnviosConsolidados(
    { estado: 'ABIERTO', size: 100 },
    open,
  );
  const envios = enviosResp?.content ?? [];

  const yaIncluidosSet = useMemo(
    () => new Set(codigosYaIncluidos.map((c) => c.toUpperCase())),
    [codigosYaIncluidos],
  );

  const opcionesDisponibles = useMemo(
    () =>
      envios.filter(
        (e) =>
          !yaIncluidosSet.has(e.codigo.toUpperCase()) &&
          !seleccionados.some((s) => s.id === e.id),
      ),
    [envios, seleccionados, yaIncluidosSet],
  );

  const reset = () => {
    setSeleccionados([]);
    setComboValue(undefined);
    setBulkText('');
  };

  const cerrar = (next: boolean) => {
    if (loading) return;
    onOpenChange(next);
    if (!next) reset();
  };

  const agregarCombo = () => {
    if (comboValue == null) return;
    const env = envios.find((e) => e.id === comboValue);
    if (!env) return;
    if (seleccionados.some((s) => s.id === env.id)) return;
    setSeleccionados((prev) => [...prev, env]);
    setComboValue(undefined);
  };

  const agregarBulk = () => {
    const tokens = bulkText.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length === 0) {
      toast.error('Pega o escribe al menos un código.');
      return;
    }
    const dedup = Array.from(new Set(tokens.map((t) => t.toUpperCase())));
    const seleccionadosSet = new Set(seleccionados.map((s) => s.codigo.toUpperCase()));
    const enviosPorCodigo = new Map(envios.map((e) => [e.codigo.toUpperCase(), e]));

    const nuevos: EnvioConsolidado[] = [];
    const desconocidos: string[] = [];
    const duplicados: string[] = [];

    for (const codigo of dedup) {
      if (yaIncluidosSet.has(codigo) || seleccionadosSet.has(codigo)) {
        duplicados.push(codigo);
        continue;
      }
      const env = enviosPorCodigo.get(codigo);
      if (!env) {
        desconocidos.push(codigo);
        continue;
      }
      nuevos.push(env);
      seleccionadosSet.add(codigo);
    }

    if (nuevos.length > 0) {
      setSeleccionados((prev) => [...prev, ...nuevos]);
      toast.success(
        `${nuevos.length} envío${nuevos.length === 1 ? '' : 's'} agregado${nuevos.length === 1 ? '' : 's'}.`,
      );
    }
    if (duplicados.length > 0) {
      toast.message(`${duplicados.length} ya estaban en el lote o lista`);
    }
    if (desconocidos.length > 0) {
      toast.error(`${desconocidos.length} código${desconocidos.length === 1 ? '' : 's'} no encontrado${desconocidos.length === 1 ? '' : 's'}`);
    }
    setBulkText(desconocidos.join('\n'));
  };

  const handleConfirm = async () => {
    if (seleccionados.length === 0) {
      toast.error('Selecciona al menos un envío consolidado.');
      return;
    }
    await onConfirm(seleccionados.map((s) => s.codigo));
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agregar envíos consolidados al lote</DialogTitle>
          <DialogDescription>
            Selecciona uno o más envíos consolidados abiertos. Sus paquetes
            quedarán incluidos automáticamente en este lote.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Buscar y agregar uno
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchableCombobox<EnvioConsolidado>
                  value={comboValue}
                  onChange={(v) => setComboValue(typeof v === 'number' ? v : undefined)}
                  options={opcionesDisponibles}
                  getKey={(o) => o.id}
                  getLabel={(o) => o.codigo}
                  getSearchText={(o) => `${o.codigo} ${o.totalPaquetes ?? 0}`}
                  placeholder={
                    isLoading
                      ? 'Cargando envíos...'
                      : opcionesDisponibles.length === 0
                        ? 'No hay envíos disponibles'
                        : 'Buscar por código de envío'
                  }
                  searchPlaceholder="Escribe el código..."
                  emptyMessage="Sin envíos coincidentes"
                  disabled={isLoading || opcionesDisponibles.length === 0}
                  renderOption={(o) => (
                    <div className="flex w-full items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-medium">
                          {o.codigo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {o.totalPaquetes ?? 0} paquete
                          {o.totalPaquetes === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                  )}
                  renderSelected={(o) => (
                    <span className="font-mono text-sm">{o.codigo}</span>
                  )}
                  clearable={false}
                />
              </div>
              <Button
                type="button"
                onClick={agregarCombo}
                disabled={comboValue == null}
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-dashed border-border bg-[var(--color-muted)]/20 p-3">
            <div className="mb-2 flex items-center gap-2">
              <ListPlus className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-semibold text-foreground">
                Agregar varios códigos
              </h3>
            </div>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  agregarBulk();
                }
              }}
              rows={3}
              placeholder={'EC-2025-001\nEC-2025-002'}
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
              disabled={isLoading}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">
                  Ctrl
                </kbd>
                {' + '}
                <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">
                  Enter
                </kbd>
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={agregarBulk}
                disabled={isLoading || bulkText.trim().length === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar lista
              </Button>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Seleccionados
              </h3>
              <span className="text-xs text-muted-foreground">
                {seleccionados.length} envío{seleccionados.length === 1 ? '' : 's'}
              </span>
            </div>
            {seleccionados.length === 0 ? (
              <p className="rounded-md border border-dashed border-border bg-[var(--color-muted)]/20 p-4 text-center text-sm text-muted-foreground">
                Aún no has agregado envíos a la selección.
              </p>
            ) : (
              <ul className="space-y-2">
                {seleccionados.map((env) => (
                  <li
                    key={env.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <PackageCheck className="h-4 w-4 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-medium">
                          {env.codigo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {env.totalPaquetes ?? 0} paquete
                          {env.totalPaquetes === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSeleccionados((prev) => prev.filter((s) => s.id !== env.id))
                      }
                      aria-label={`Quitar envío ${env.codigo}`}
                      title="Quitar envío"
                      className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:border-[var(--color-destructive)]/40 hover:bg-[var(--color-destructive)]/10 hover:text-[var(--color-destructive)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => cerrar(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading || seleccionados.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            {loading
              ? 'Agregando...'
              : `Agregar ${seleccionados.length} envío${seleccionados.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
