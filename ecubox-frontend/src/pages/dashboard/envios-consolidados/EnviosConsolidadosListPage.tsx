import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  AlertCircle,
  Boxes,
  Check,
  CheckCircle2,
  Eraser,
  Eye,
  Lock,
  Package as PackageIcon,
  Plus,
  Scale,
  Search,
  Trash2,
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
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { InlineErrorBanner } from '@/components/InlineErrorBanner';
import { KpiCard } from '@/components/KpiCard';
import { ChipFiltro } from '@/components/ChipFiltro';
import { FiltrosBar } from '@/components/FiltrosBar';
import { MonoTrunc } from '@/components/MonoTrunc';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { TablePagination } from '@/components/ui/TablePagination';
import { cn } from '@/lib/utils';
import {
  useCerrarEnvioConsolidado,
  useCrearEnvioConsolidado,
  useEliminarEnvioConsolidado,
  useEnviosConsolidados,
  useReabrirEnvioConsolidado,
} from '@/hooks/useEnviosConsolidados';
import { useSearchPagination } from '@/hooks/useSearchPagination';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { EstadoFiltro } from '@/lib/api/envios-consolidados.service';
import { useAuthStore } from '@/stores/authStore';
import { EnvioConsolidadoBadge } from './EnvioConsolidadoBadge';

const LBS_TO_KG = 0.45359237;

export function EnviosConsolidadosListPage() {
  const navigate = useNavigate();
  const { q, page, size, setQ, setPage, setSize, resetPage } = useSearchPagination({
    initialSize: 20,
  });
  const [estadoFilter, setEstadoFilter] = useState<EstadoFiltro>('TODOS');
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmCerrar, setConfirmCerrar] = useState<{ id: number; codigo: string } | null>(null);
  const [confirmReabrir, setConfirmReabrir] = useState<{ id: number; codigo: string } | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState<{
    id: number;
    codigo: string;
    totalPaquetes: number;
  } | null>(null);

  const cerrarMutation = useCerrarEnvioConsolidado();
  const reabrirMutation = useReabrirEnvioConsolidado();
  const eliminarMutation = useEliminarEnvioConsolidado();
  const hasEnviosDelete = useAuthStore((s) =>
    s.hasPermission('ENVIOS_CONSOLIDADOS_DELETE'),
  );

  const { data, isLoading, isFetching, error, refetch } = useEnviosConsolidados({
    estado: estadoFilter,
    q: q.trim() || undefined,
    page,
    size,
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

  async function handleEliminar(eliminarPaquetes: boolean) {
    if (!confirmEliminar) return;
    try {
      await eliminarMutation.mutateAsync({
        id: confirmEliminar.id,
        eliminarPaquetes,
      });
      const totales = confirmEliminar.totalPaquetes;
      if (eliminarPaquetes && totales > 0) {
        toast.success(
          `Envío ${confirmEliminar.codigo} y ${totales} paquete${totales === 1 ? '' : 's'} eliminados`,
        );
      } else if (totales > 0) {
        toast.success(
          `Envío ${confirmEliminar.codigo} eliminado · ${totales} paquete${totales === 1 ? '' : 's'} desasociado${totales === 1 ? '' : 's'}`,
        );
      } else {
        toast.success(`Envío ${confirmEliminar.codigo} eliminado`);
      }
      setConfirmEliminar(null);
    } catch (err: unknown) {
      const r = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(r?.data?.message ?? 'No se pudo eliminar el envío');
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

  const items = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;
  const search = q;

  return (
    <div className="page-stack">
      <ListToolbar
        title="Envíos consolidados"
        searchPlaceholder="Buscar por código..."
        value={q}
        onSearchChange={setQ}
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

      <FiltrosBar
        hayFiltrosActivos={estadoFilter !== 'TODOS'}
        onLimpiar={() => {
          setEstadoFilter('TODOS');
          resetPage();
        }}
        chips={
          <>
            <ChipFiltro
              label="Todos"
              count={stats.total}
              active={estadoFilter === 'TODOS'}
              onClick={() => {
                setEstadoFilter('TODOS');
                resetPage();
              }}
            />
            <ChipFiltro
              label="Abiertos"
              count={stats.abiertos}
              active={estadoFilter === 'ABIERTO'}
              tone="warning"
              onClick={() => {
                setEstadoFilter('ABIERTO');
                resetPage();
              }}
            />
            <ChipFiltro
              label="Cerrados"
              count={stats.cerrados}
              active={estadoFilter === 'CERRADO'}
              tone="success"
              onClick={() => {
                setEstadoFilter('CERRADO');
                resetPage();
              }}
            />
          </>
        }
      />

      {error && items.length > 0 && (
        <InlineErrorBanner
          message="No se pudieron actualizar los envíos"
          hint="Mostrando los resultados anteriores. Reintentando en segundo plano."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      )}

      {error && items.length === 0 && !isLoading ? (
        <InlineErrorBanner
          message="Error al cargar envíos consolidados"
          hint="Verifica tu conexión o intenta de nuevo."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : !isLoading && items.length === 0 ? (
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
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Paquetes</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="hidden md:table-cell">Cerrado</TableHead>
                  <TableHead className="w-12 text-right" aria-label="Acciones" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRowsSkeleton
                    columns={7}
                    columnClasses={{ 5: 'hidden md:table-cell' }}
                  />
                )}
                {items.map((e) => (
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
                      <MonoTrunc
                        value={e.codigo}
                        className="font-medium text-foreground"
                      />
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
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      <FechaCell value={e.fechaCerrado} mutedIfEmpty />
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      <RowActionsMenu
                        items={[
                          {
                            label: 'Ver detalle',
                            icon: Eye,
                            onSelect: () =>
                              navigate({
                                to: '/envios-consolidados/$id',
                                params: { id: String(e.id) },
                              }),
                          },
                          { type: 'separator' },
                          {
                            label: 'Reabrir envío',
                            icon: Unlock,
                            hidden: !e.cerrado,
                            disabled: reabrirMutation.isPending,
                            onSelect: () =>
                              setConfirmReabrir({ id: e.id, codigo: e.codigo }),
                          },
                          {
                            label: 'Cerrar envío',
                            icon: Lock,
                            hidden: e.cerrado,
                            disabled: cerrarMutation.isPending,
                            onSelect: () =>
                              setConfirmCerrar({ id: e.id, codigo: e.codigo }),
                          },
                          { type: 'separator', hidden: !hasEnviosDelete },
                          {
                            label: 'Eliminar envío',
                            icon: Trash2,
                            destructive: true,
                            hidden: !hasEnviosDelete,
                            disabled: e.cerrado || eliminarMutation.isPending,
                            onSelect: () =>
                              setConfirmEliminar({
                                id: e.id,
                                codigo: e.codigo,
                                totalPaquetes: e.totalPaquetes ?? 0,
                              }),
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ListTableShell>

          <TablePagination
            page={page}
            size={size}
            totalElements={totalElements}
            totalPages={totalPages}
            onPageChange={setPage}
            onSizeChange={setSize}
            loading={isFetching}
          />
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

      <EliminarEnvioDialog
        target={confirmEliminar}
        loading={eliminarMutation.isPending}
        onClose={() => setConfirmEliminar(null)}
        onConfirm={handleEliminar}
      />
    </div>
  );
}

interface EliminarEnvioDialogProps {
  target: { id: number; codigo: string; totalPaquetes: number } | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (eliminarPaquetes: boolean) => void;
}

function EliminarEnvioDialog({ target, loading, onClose, onConfirm }: EliminarEnvioDialogProps) {
  if (!target) return null;
  const tienePaquetes = target.totalPaquetes > 0;
  const plural = target.totalPaquetes === 1 ? '' : 's';

  return (
    <Dialog open onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]">
              <Trash2 className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle>Eliminar envío consolidado</DialogTitle>
              <DialogDescription className="mt-1">
                Vas a eliminar el envío{' '}
                <span className="font-mono font-medium text-foreground">{target.codigo}</span>.
                Esta acción no se puede deshacer.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {tienePaquetes ? (
          <div className="space-y-3">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-3 text-sm text-foreground">
              <p className="inline-flex items-center gap-1.5">
                <PackageIcon className="h-4 w-4 text-muted-foreground" />
                <span>
                  Tiene{' '}
                  <span className="font-semibold">
                    {target.totalPaquetes} paquete{plural}
                  </span>{' '}
                  asociado{plural}.
                </span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Elige qué hacer con esos paquetes antes de eliminar el envío.
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => onConfirm(false)}
                className={cn(
                  'group flex w-full items-start gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-left transition-colors hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-muted)]/30 disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-muted)] text-[var(--color-primary)]">
                  <Unlock className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    Conservar paquetes
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Los {target.totalPaquetes} paquete{plural} se desasocian del envío y siguen
                    existiendo en el sistema. Podrás asignarlos a otro envío después.
                  </span>
                </span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => onConfirm(true)}
                className={cn(
                  'group flex w-full items-start gap-3 rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 p-3 text-left transition-colors hover:border-[var(--color-destructive)]/50 hover:bg-[var(--color-destructive)]/10 disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]">
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[var(--color-destructive)]">
                    Eliminar también los paquetes
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Borra los {target.totalPaquetes} paquete{plural} junto con el envío,
                    incluyendo su historial de tracking. Acción irreversible.
                  </span>
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-3 text-sm text-muted-foreground">
            El envío no tiene paquetes asociados. Se eliminará directamente.
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          {!tienePaquetes && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => onConfirm(false)}
              disabled={loading}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              {loading ? 'Eliminando...' : 'Eliminar envío'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--color-muted)] text-[var(--color-primary)]">
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
                            <MonoTrunc
                              value={p.numeroGuia}
                              className="font-medium text-foreground"
                              copy={false}
                            />
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
