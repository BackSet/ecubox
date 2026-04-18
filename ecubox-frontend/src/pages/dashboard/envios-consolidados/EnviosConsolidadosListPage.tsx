import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  AlertCircle,
  Boxes,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eraser,
  Eye,
  Lock,
  Package as PackageIcon,
  Plus,
  Scale,
  Search,
  Unlock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { buscarPaquetesPorGuias } from '@/lib/api/paquetes.service';
import type { Paquete } from '@/types/paquete';
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
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { KpiCard } from '@/components/KpiCard';
import { cn } from '@/lib/utils';
import {
  useCerrarEnvioConsolidado,
  useCrearEnvioConsolidado,
  useEnviosConsolidados,
  useReabrirEnvioConsolidado,
} from '@/hooks/useEnviosConsolidados';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { EstadoFiltro } from '@/lib/api/envios-consolidados.service';
import { EnvioConsolidadoBadge } from './EnvioConsolidadoBadge';

const ESTADO_FILTER_OPTIONS: { value: EstadoFiltro; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'ABIERTO', label: 'Abiertos' },
  { value: 'CERRADO', label: 'Cerrados' },
];

const LBS_TO_KG = 0.45359237;

export function EnviosConsolidadosListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoFiltro>('TODOS');
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmCerrar, setConfirmCerrar] = useState<{ id: number; codigo: string } | null>(null);
  const [confirmReabrir, setConfirmReabrir] = useState<{ id: number; codigo: string } | null>(null);

  const cerrarMutation = useCerrarEnvioConsolidado();
  const reabrirMutation = useReabrirEnvioConsolidado();

  const { data, isLoading, error } = useEnviosConsolidados({
    estado: estadoFilter,
    page,
    size: 20,
  });

  async function handleCerrar() {
    if (!confirmCerrar) return;
    try {
      await cerrarMutation.mutateAsync(confirmCerrar.id);
      toast.success(`Envío ${confirmCerrar.codigo} cerrado`);
      setConfirmCerrar(null);
    } catch (err: unknown) {
      const r = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(r?.data?.message ?? 'No se pudo cerrar el envío');
    }
  }

  async function handleReabrir() {
    if (!confirmReabrir) return;
    try {
      await reabrirMutation.mutateAsync(confirmReabrir.id);
      toast.success(`Envío ${confirmReabrir.codigo} reabierto`);
      setConfirmReabrir(null);
    } catch (err: unknown) {
      const r = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(r?.data?.message ?? 'No se pudo reabrir el envío');
    }
  }

  // Carga ligera de todos los envíos para los KPIs globales
  const { data: dataTodos } = useEnviosConsolidados({
    estado: 'TODOS',
    page: 0,
    size: 1000,
  });

  const stats = useMemo(() => {
    const all = dataTodos?.content ?? [];
    let abiertos = 0;
    let cerrados = 0;
    let paquetes = 0;
    let pesoLbs = 0;
    for (const e of all) {
      if (e.cerrado) cerrados += 1;
      else abiertos += 1;
      paquetes += e.totalPaquetes ?? 0;
      pesoLbs += Number(e.pesoTotalLbs ?? 0);
    }
    return {
      total: dataTodos?.totalElements ?? all.length,
      abiertos,
      cerrados,
      paquetes,
      pesoLbs,
      pesoKg: pesoLbs * LBS_TO_KG,
    };
  }, [dataTodos]);

  const filtered = useMemo(() => {
    const items = data?.content ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((e) => e.codigo.toLowerCase().includes(q));
  }, [data?.content, search]);

  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-4">
      <ListToolbar
        title="Envíos consolidados"
        searchPlaceholder="Buscar por código..."
        onSearchChange={setSearch}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo envío
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<Boxes className="h-5 w-5" />}
          label="Total de envíos"
          value={stats.total}
          tone="primary"
        />
        <KpiCard
          icon={<Unlock className="h-5 w-5" />}
          label="Abiertos"
          value={stats.abiertos}
          tone="warning"
          hint="Admiten cambios"
        />
        <KpiCard
          icon={<Lock className="h-5 w-5" />}
          label="Cerrados"
          value={stats.cerrados}
          tone="success"
        />
        <KpiCard
          icon={<PackageIcon className="h-5 w-5" />}
          label="Paquetes acumulados"
          value={stats.paquetes}
          tone="neutral"
          hint={
            stats.pesoLbs > 0
              ? `${stats.pesoLbs.toFixed(2)} lbs · ${stats.pesoKg.toFixed(2)} kg`
              : undefined
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Estado:</span>
        <div className="inline-flex rounded-md border border-border bg-[var(--color-card)] p-0.5">
          {ESTADO_FILTER_OPTIONS.map((opt) => {
            const active = estadoFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setEstadoFilter(opt.value);
                  setPage(0);
                }}
                className={cn(
                  'rounded px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <LoadingState text="Cargando envíos..." />
      ) : error ? (
        <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
          Error al cargar envíos consolidados.
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={
            search
              ? 'Sin resultados'
              : estadoFilter === 'TODOS'
                ? 'Sin envíos'
                : estadoFilter === 'ABIERTO'
                  ? 'No hay envíos abiertos'
                  : 'No hay envíos cerrados'
          }
          description={
            search
              ? `No se encontraron envíos con "${search}".`
              : 'Crea un nuevo envío consolidado y agrupa las piezas listas para despachar.'
          }
          action={
            !search ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo envío
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ListTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Paquetes</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead>Cerrado</TableHead>
                  <TableHead className="w-[140px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow
                    key={e.id}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate({
                        to: '/envios-consolidados/$id',
                        params: { id: String(e.id) },
                      })
                    }
                  >
                    <TableCell>
                      <CodigoCell codigo={e.codigo} />
                    </TableCell>
                    <TableCell>
                      <EnvioConsolidadoBadge cerrado={e.cerrado} />
                    </TableCell>
                    <TableCell className="text-center">
                      <PaquetesBadge total={e.totalPaquetes ?? 0} />
                    </TableCell>
                    <TableCell>
                      <PesoCell lbs={e.pesoTotalLbs} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <FechaCell value={e.createdAt} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <FechaCell value={e.fechaCerrado} mutedIfEmpty />
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ver detalle"
                          aria-label="Ver detalle"
                          onClick={() =>
                            navigate({
                              to: '/envios-consolidados/$id',
                              params: { id: String(e.id) },
                            })
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {e.cerrado ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Reabrir envío"
                            aria-label="Reabrir envío"
                            disabled={reabrirMutation.isPending}
                            onClick={() => setConfirmReabrir({ id: e.id, codigo: e.codigo })}
                          >
                            <Unlock className="h-4 w-4 text-[var(--color-warning)]" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Cerrar envío"
                            aria-label="Cerrar envío"
                            disabled={cerrarMutation.isPending}
                            onClick={() => setConfirmCerrar({ id: e.id, codigo: e.codigo })}
                          >
                            <Lock className="h-4 w-4 text-[var(--color-primary)]" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ListTableShell>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Página {page + 1} de {totalPages} · {data?.totalElements ?? 0} resultados
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {createOpen && <CrearEnvioConGuiasDialog onClose={() => setCreateOpen(false)} />}

      <ConfirmDialog
        open={confirmCerrar !== null}
        onOpenChange={(o) => !o && setConfirmCerrar(null)}
        title="Cerrar envío consolidado"
        description={
          confirmCerrar
            ? `Una vez cerrado el envío "${confirmCerrar.codigo}" no podrás agregar ni remover paquetes hasta reabrirlo.`
            : ''
        }
        confirmLabel="Cerrar envío"
        loading={cerrarMutation.isPending}
        onConfirm={handleCerrar}
      />

      <ConfirmDialog
        open={confirmReabrir !== null}
        onOpenChange={(o) => !o && setConfirmReabrir(null)}
        title="Reabrir envío consolidado"
        description={
          confirmReabrir
            ? `El envío "${confirmReabrir.codigo}" volverá a admitir agregar y remover paquetes.`
            : ''
        }
        confirmLabel="Reabrir"
        loading={reabrirMutation.isPending}
        onConfirm={handleReabrir}
      />
    </div>
  );
}

function CodigoCell({ codigo }: { codigo: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(codigo);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar');
    }
  }
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="font-mono text-sm font-medium text-foreground">{codigo}</span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copiar código"
        title={`Copiar: ${codigo}`}
        className="rounded p-0.5 text-muted-foreground opacity-60 transition-opacity hover:bg-[var(--color-muted)] hover:text-foreground hover:opacity-100"
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

function PaquetesBadge({ total }: { total: number }) {
  const empty = total === 0;
  return (
    <span
      className={cn(
        'inline-flex min-w-[2.25rem] items-center justify-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
        empty
          ? 'border-border bg-[var(--color-muted)]/40 text-muted-foreground'
          : 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
      )}
    >
      <PackageIcon className="h-3 w-3" />
      {total}
    </span>
  );
}

function PesoCell({ lbs }: { lbs?: number | null }) {
  if (lbs == null || lbs === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const lbsNum = Number(lbs);
  const kg = lbsNum * LBS_TO_KG;
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-sm font-medium text-foreground">{lbsNum.toFixed(2)} lbs</span>
      <span className="text-[11px] text-muted-foreground">{kg.toFixed(2)} kg</span>
    </div>
  );
}

function FechaCell({
  value,
  mutedIfEmpty = false,
}: {
  value?: string | null;
  mutedIfEmpty?: boolean;
}) {
  if (!value) {
    return (
      <span className={cn('text-xs', mutedIfEmpty ? 'text-muted-foreground/60' : 'text-muted-foreground')}>
        —
      </span>
    );
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <span className="text-xs text-muted-foreground">—</span>;
  const absolute = date.toLocaleString();
  const short = date.toLocaleDateString();
  const rel = relativeTime(date);
  return (
    <div className="flex flex-col leading-tight" title={absolute}>
      <span>{short}</span>
      {rel && <span className="text-[11px] opacity-70">{rel}</span>}
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

/**
 * Normaliza una línea pegada por el operario al formato canónico
 * <trackingBase> <pieza>/<total> que usa `paquete.numeroGuia`.
 */
function normalizarLineaGuia(linea: string): string {
  return linea
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseGuias(raw: string): string[] {
  const seen = new Map<string, string>();
  for (const linea of raw.split(/[\n,;]+/)) {
    const normalizada = normalizarLineaGuia(linea);
    if (!normalizada) continue;
    const key = normalizada.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, normalizada);
    }
  }
  return Array.from(seen.values());
}

function CrearEnvioConGuiasDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [guiasRaw, setGuiasRaw] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [paquetesPreview, setPaquetesPreview] = useState<Paquete[] | null>(null);
  const [noEncontradasPreview, setNoEncontradasPreview] = useState<string[]>([]);
  const crear = useCrearEnvioConsolidado();

  const guias = useMemo(() => parseGuias(guiasRaw), [guiasRaw]);

  const previewStats = useMemo(() => {
    const found = paquetesPreview ?? [];
    let pesoLbs = 0;
    let yaEnOtro = 0;
    for (const p of found) {
      if (p.pesoLbs != null) pesoLbs += Number(p.pesoLbs);
      if (p.envioConsolidadoCodigo) yaEnOtro += 1;
    }
    return {
      encontradas: found.length,
      noEncontradas: noEncontradasPreview.length,
      yaEnOtro,
      pesoLbs,
      pesoKg: pesoLbs * LBS_TO_KG,
    };
  }, [paquetesPreview, noEncontradasPreview]);

  async function handlePreview() {
    if (guias.length === 0) {
      toast.error('Agrega al menos un número de guía');
      return;
    }
    setPreviewLoading(true);
    try {
      const encontrados = await buscarPaquetesPorGuias(guias);
      setPaquetesPreview(encontrados);
      const set = new Set(encontrados.map((p) => p.numeroGuia.toLowerCase()));
      setNoEncontradasPreview(guias.filter((g) => !set.has(g.toLowerCase())));
    } catch {
      toast.error('No se pudo buscar las guías');
    } finally {
      setPreviewLoading(false);
    }
  }

  function handleConservarSoloFallidas() {
    if (noEncontradasPreview.length === 0) return;
    setGuiasRaw(noEncontradasPreview.join('\n'));
    setPaquetesPreview(null);
    setNoEncontradasPreview([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!codigo.trim()) {
      toast.error('Indica el código del envío');
      return;
    }
    try {
      const res = await crear.mutateAsync({
        codigo: codigo.trim(),
        numerosGuia: guias.length > 0 ? guias : undefined,
      });
      const asociados = res.envio.totalPaquetes ?? 0;
      if (res.guiasNoEncontradas.length > 0) {
        toast.warning(
          `Envío creado con ${asociados} paquetes. No se encontraron: ${res.guiasNoEncontradas.join(', ')}`,
        );
      } else {
        toast.success(
          asociados > 0
            ? `Envío creado con ${asociados} paquete${asociados === 1 ? '' : 's'}`
            : 'Envío consolidado creado',
        );
      }
      onClose();
      navigate({
        to: '/envios-consolidados/$id',
        params: { id: String(res.envio.id) },
      });
    } catch (err: unknown) {
      const r = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      if (r?.status === 409) {
        toast.error('Ya existe un envío con ese código');
      } else {
        toast.error(r?.data?.message ?? 'Error al crear el envío');
      }
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-[var(--color-border)] px-6 pb-4 pt-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <Boxes className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base">Nuevo envío consolidado</DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                Crea un agrupador interno y, opcionalmente, asocia las piezas que
                viajarán en él. Puedes agregar más piezas después.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-4"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="codigo" className="mb-1 block text-xs font-medium text-muted-foreground">
                Código del envío *
              </Label>
              <Input
                id="codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej: ENV-USA-2026-001"
                className="font-mono text-sm"
                autoFocus
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Identificador único interno usado por el operario en lotes de recepción y
                manifiestos.
              </p>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <Label htmlFor="guias" className="text-xs font-medium text-muted-foreground">
                  Piezas asociadas (opcional)
                </Label>
                <span className="text-xs text-muted-foreground">
                  {guias.length} pieza{guias.length === 1 ? '' : 's'}
                </span>
              </div>
              <Textarea
                id="guias"
                rows={6}
                value={guiasRaw}
                onChange={(e) => {
                  setGuiasRaw(e.target.value);
                  setPaquetesPreview(null);
                  setNoEncontradasPreview([]);
                }}
                placeholder={'12312312312 1/2\n12312312312 2/2\nABC987 1/1'}
                className="resize-y font-mono text-sm"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Una línea por pieza. Formato:{' '}
                <span className="font-mono">{'<guía> <pieza>/<total>'}</span>. Acepta
                saltos de línea, comas o punto y coma. Los espacios alrededor de la barra
                se normalizan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={previewLoading || guias.length === 0}
              >
                <Search className="mr-1.5 h-3.5 w-3.5" />
                {previewLoading ? 'Buscando...' : 'Verificar guías'}
              </Button>
              {guiasRaw.trim() && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setGuiasRaw('');
                    setPaquetesPreview(null);
                    setNoEncontradasPreview([]);
                  }}
                >
                  <Eraser className="mr-1.5 h-3.5 w-3.5" />
                  Limpiar
                </Button>
              )}
            </div>

            {paquetesPreview != null && (
              <div className="space-y-3 rounded-md border border-border bg-[var(--color-muted)]/20 p-3">
                <div className="flex flex-wrap gap-1.5">
                  {previewStats.encontradas > 0 && (
                    <span className="inline-flex items-center gap-1 rounded border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-2 py-0.5 text-xs text-[var(--color-success)]">
                      <CheckCircle2 className="h-3 w-3" />
                      {previewStats.encontradas} encontrada{previewStats.encontradas === 1 ? '' : 's'}
                    </span>
                  )}
                  {previewStats.pesoLbs > 0 && (
                    <span className="inline-flex items-center gap-1 rounded border border-border bg-[var(--color-background)] px-2 py-0.5 text-xs text-foreground">
                      <Scale className="h-3 w-3" />
                      {previewStats.pesoLbs.toFixed(2)} lbs · {previewStats.pesoKg.toFixed(2)} kg
                    </span>
                  )}
                  {previewStats.yaEnOtro > 0 && (
                    <span className="inline-flex items-center gap-1 rounded border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-2 py-0.5 text-xs text-[var(--color-warning)]">
                      <AlertCircle className="h-3 w-3" />
                      {previewStats.yaEnOtro} ya en otro envío (se reasignarán)
                    </span>
                  )}
                  {previewStats.noEncontradas > 0 && (
                    <span className="inline-flex items-center gap-1 rounded border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 px-2 py-0.5 text-xs text-[var(--color-destructive)]">
                      <AlertCircle className="h-3 w-3" />
                      {previewStats.noEncontradas} no encontrada{previewStats.noEncontradas === 1 ? '' : 's'}
                    </span>
                  )}
                </div>

                {paquetesPreview.length > 0 && (
                  <div>
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Piezas a incluir
                    </p>
                    <ul className="max-h-44 space-y-1 overflow-auto pr-1">
                      {paquetesPreview.map((p) => {
                        const peso =
                          p.pesoLbs != null ? `${Number(p.pesoLbs).toFixed(2)} lbs` : null;
                        return (
                          <li
                            key={p.id}
                            className="flex flex-wrap items-center gap-2 rounded border border-border bg-[var(--color-background)] px-2 py-1 text-xs"
                          >
                            <span className="font-mono font-medium text-foreground">
                              {p.numeroGuia}
                            </span>
                            {p.destinatarioNombre && (
                              <span className="text-muted-foreground">
                                · {p.destinatarioNombre}
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

                {noEncontradasPreview.length > 0 && (
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
                    <p className="mb-1 text-[11px] text-muted-foreground">
                      Verifica que el formato coincida exactamente con{' '}
                      <span className="font-mono">{'<guía> <pieza>/<total>'}</span>.
                    </p>
                    <ul className="space-y-0.5">
                      {noEncontradasPreview.map((g) => (
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
        </form>

        <DialogFooter className="border-t border-[var(--color-border)] bg-[var(--color-background)] px-6 py-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
            disabled={crear.isPending || !codigo.trim()}
          >
            <Check className="mr-1.5 h-4 w-4" />
            {crear.isPending
              ? 'Creando...'
              : guias.length > 0
                ? `Crear con ${guias.length} pieza${guias.length === 1 ? '' : 's'}`
                : 'Crear envío'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
