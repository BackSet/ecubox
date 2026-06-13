import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  CalendarClock,
  Check,
  Copy,
  Link2,
  Loader2,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  useAccesoEnlaces,
  useGenerarAccesoEnlace,
  useRevocarAccesoEnlace,
} from '@/hooks/useAccesoEnlaces';
import { useConsignatariosOperario } from '@/hooks/useOperarioDespachos';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { InlineErrorBanner } from '@/components/InlineErrorBanner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ListTableShell } from '@/components/ListTableShell';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { KpiCardsGridSkeleton } from '@/components/skeletons/KpiCardSkeleton';
import { KpiCard } from '@/components/KpiCard';
import { KpiCardsGrid } from '@/components/KpiCardsGrid';
import { ChipFiltro } from '@/components/ChipFiltro';
import { FiltrosBar } from '@/components/FiltrosBar';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { TablePagination } from '@/components/ui/TablePagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
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
import { getApiErrorMessage } from '@/lib/api/error-message';
import type { AccesoEnlace, TipoAccesoEnlace } from '@/types/acceso-enlace';

type Unidad = 'horas' | 'dias';
type ChipKey = 'todos' | 'vigentes' | 'caducados';

function buildEnlaceUrl(token: string): string {
  return `${window.location.origin}/acceso?token=${encodeURIComponent(token)}`;
}

async function copiarEnlace(token: string | null, caducidad?: string): Promise<boolean> {
  if (!token) {
    toast.error('Este enlace no tiene un token disponible para copiar');
    return false;
  }
  try {
    await navigator.clipboard.writeText(buildEnlaceUrl(token));
    toast.success('Enlace copiado', caducidad ? { description: caducidad } : undefined);
    return true;
  } catch {
    toast.error('No se pudo copiar el enlace');
    return false;
  }
}

function formatFecha(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EnlacesAccesoPage() {
  const { data: enlaces = [], isLoading, error, refetch, isFetching } = useAccesoEnlaces();
  const revocarMutation = useRevocarAccesoEnlace();

  const [search, setSearchRaw] = useState('');
  const [chip, setChipRaw] = useState<ChipKey>('todos');
  const [page, setPage] = useState(0);
  const [size, setSizeRaw] = useState(25);
  const [crearOpen, setCrearOpen] = useState(false);
  const [revocarId, setRevocarId] = useState<number | null>(null);

  const setSearch = (v: string) => { setSearchRaw(v); setPage(0); };
  const setChip = (v: ChipKey) => { setChipRaw(v); setPage(0); };
  const setSize = (v: number) => { setSizeRaw(v); setPage(0); };

  const stats = useMemo(() => {
    let vigentes = 0;
    let persistentes = 0;
    let temporales = 0;
    for (const e of enlaces) {
      if (e.vigente) vigentes += 1;
      if (e.tipo === 'PERSISTENTE') persistentes += 1;
      else temporales += 1;
    }
    return { total: enlaces.length, vigentes, persistentes, temporales };
  }, [enlaces]);

  const baseList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enlaces;
    return enlaces.filter(
      (e) =>
        e.codigo.toLowerCase().includes(q) ||
        e.etiqueta?.toLowerCase().includes(q) ||
        e.consignatarios.some(
          (c) =>
            c.nombre.toLowerCase().includes(q) ||
            (c.codigo?.toLowerCase().includes(q) ?? false),
        ),
    );
  }, [enlaces, search]);

  const chipCounts = useMemo(() => {
    let vigentes = 0;
    let caducados = 0;
    for (const e of baseList) {
      if (e.vigente) vigentes += 1;
      else caducados += 1;
    }
    return { todos: baseList.length, vigentes, caducados };
  }, [baseList]);

  const list = useMemo(() => {
    if (chip === 'todos') return baseList;
    return baseList.filter((e) => (chip === 'vigentes' ? e.vigente : !e.vigente));
  }, [baseList, chip]);

  const totalPages = Math.max(1, Math.ceil(list.length / Math.max(1, size)));
  const pagedList = useMemo(
    () => list.slice(page * size, page * size + size),
    [list, page, size],
  );
  useEffect(() => {
    if (page > 0 && page >= totalPages) setPage(totalPages - 1);
  }, [page, totalPages]);

  const tieneFiltros = chip !== 'todos';
  const limpiarFiltros = useCallback(() => {
    setChipRaw('todos');
    setPage(0);
  }, []);

  if (error && enlaces.length === 0) {
    return (
      <InlineErrorBanner
        message="Error al cargar los enlaces de acceso"
        hint="Verifica tu conexión o intenta de nuevo."
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );
  }

  return (
    <div className="page-stack">
      {error && (
        <InlineErrorBanner
          message="No se pudieron actualizar los enlaces"
          hint="Mostrando los resultados anteriores. Reintentando en segundo plano."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      )}

      <ListToolbar
        title="Enlaces de acceso"
        searchPlaceholder="Buscar por código, etiqueta o consignatario..."
        onSearchChange={setSearch}
        actions={
          <Button className="w-full sm:w-auto" onClick={() => setCrearOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo enlace
          </Button>
        }
      />

      <p className="text-sm text-muted-foreground">
        Enlaces de <strong>solo lectura</strong> para que clientes que no usan el sistema consulten
        los paquetes de los consignatarios seleccionados, sin registrarse ni entrar al panel.
      </p>

      {isLoading ? (
        <KpiCardsGridSkeleton count={3} />
      ) : (
        enlaces.length > 0 && (
          <KpiCardsGrid>
            <KpiCard
              icon={<Link2 className="h-5 w-5" />}
              label="Enlaces"
              value={stats.total}
              tone="primary"
              hint="Total de enlaces activos"
            />
            <KpiCard
              icon={<Check className="h-5 w-5" />}
              label="Vigentes"
              value={stats.vigentes}
              tone={stats.vigentes > 0 ? 'success' : 'neutral'}
              hint={`${stats.total - stats.vigentes} caducados`}
            />
            <KpiCard
              icon={<CalendarClock className="h-5 w-5" />}
              label="Temporales"
              value={stats.temporales}
              tone="neutral"
              hint="Con fecha de caducidad"
            />
          </KpiCardsGrid>
        )
      )}

      {!isLoading && enlaces.length > 0 && (
        <FiltrosBar
          hayFiltrosActivos={tieneFiltros}
          onLimpiar={limpiarFiltros}
          chips={
            <>
              <ChipFiltro
                label="Todos"
                count={chipCounts.todos}
                active={chip === 'todos'}
                onClick={() => setChip('todos')}
              />
              <ChipFiltro
                label="Vigentes"
                count={chipCounts.vigentes}
                active={chip === 'vigentes'}
                tone="success"
                onClick={() => setChip('vigentes')}
                hideWhenZero
              />
              <ChipFiltro
                label="Caducados"
                count={chipCounts.caducados}
                active={chip === 'caducados'}
                tone="warning"
                onClick={() => setChip('caducados')}
                hideWhenZero
              />
            </>
          }
        />
      )}

      {isLoading ? (
        <ListTableShell>
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[20rem]">Enlace</TableHead>
                <TableHead>Consignatarios</TableHead>
                <TableHead className="hidden md:table-cell">Acceso</TableHead>
                <TableHead className="hidden lg:table-cell">Creado por</TableHead>
                <TableHead className="w-24 text-right" aria-label="Acciones" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRowsSkeleton
                columns={5}
                columnClasses={{ 2: 'hidden md:table-cell', 3: 'hidden lg:table-cell' }}
              />
            </TableBody>
          </Table>
        </ListTableShell>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Link2}
          title={enlaces.length === 0 ? 'No hay enlaces de acceso' : 'Sin resultados'}
          description={
            enlaces.length === 0
              ? 'Crea un enlace y selecciona los consignatarios que el destinatario podrá ver.'
              : tieneFiltros
                ? 'No hay enlaces que coincidan con los filtros aplicados.'
                : 'No se encontraron enlaces con ese criterio.'
          }
          action={
            enlaces.length === 0 ? (
              <Button onClick={() => setCrearOpen(true)}>Crear enlace</Button>
            ) : tieneFiltros ? (
              <Button variant="outline" onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ListTableShell>
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[20rem]">Enlace</TableHead>
                <TableHead>Consignatarios</TableHead>
                <TableHead className="hidden md:table-cell">Acceso</TableHead>
                <TableHead className="hidden lg:table-cell">Creado por</TableHead>
                <TableHead className="w-24 text-right" aria-label="Acciones" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedList.map((e) => (
                <EnlaceRow key={e.id} enlace={e} onRevocar={() => setRevocarId(e.id)} />
              ))}
            </TableBody>
          </Table>
        </ListTableShell>
      )}

      {!isLoading && !error && list.length > 0 && (
        <TablePagination
          page={page}
          size={size}
          totalElements={list.length}
          totalPages={totalPages}
          onPageChange={setPage}
          onSizeChange={setSize}
        />
      )}

      {crearOpen && <CrearEnlaceDialog onClose={() => setCrearOpen(false)} />}

      <ConfirmDialog
        open={revocarId != null}
        onOpenChange={(open) => !open && setRevocarId(null)}
        title="¿Revocar enlace?"
        description="El enlace dejará de funcionar de inmediato. Esta acción no se puede deshacer."
        confirmLabel="Revocar"
        variant="destructive"
        loading={revocarMutation.isPending}
        onConfirm={async () => {
          if (revocarId == null) return;
          try {
            await revocarMutation.mutateAsync(revocarId);
            toast.success('Enlace revocado');
          } catch (err: unknown) {
            toast.error(getApiErrorMessage(err) ?? 'No se pudo revocar el enlace');
            throw err;
          }
        }}
      />
    </div>
  );
}

function EnlaceRow({ enlace, onRevocar }: { enlace: AccesoEnlace; onRevocar: () => void }) {
  const [copied, setCopied] = useState(false);

  const nombres = enlace.consignatarios.map((c) => c.nombre).join(', ');
  const caducidad =
    enlace.tipo === 'TEMPORAL'
      ? enlace.expiraAt
        ? `Caduca ${formatFecha(enlace.expiraAt)}`
        : 'Temporal'
      : 'Sin caducidad';

  const handleCopy = async () => {
    const ok = await copiarEnlace(enlace.token, caducidad);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <TableRow>
      <TableCell className="max-w-[20rem] align-top">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-foreground" title="Código del enlace">
            {enlace.codigo}
          </span>
          <Badge variant={enlace.tipo === 'PERSISTENTE' ? 'secondary' : 'outline'}>
            {enlace.tipo === 'PERSISTENTE' ? 'Persistente' : 'Temporal'}
          </Badge>
          {!enlace.vigente && (
            <Badge variant="outline" className="text-[var(--color-warning)]">
              Caducado
            </Badge>
          )}
        </div>
        <p className="mt-1 truncate text-sm font-medium text-foreground" title={enlace.etiqueta ?? ''}>
          {enlace.etiqueta?.trim() || <span className="italic text-muted-foreground">Sin etiqueta</span>}
        </p>
      </TableCell>

      <TableCell className="max-w-[18rem] align-top">
        <div className="flex items-center gap-1.5 text-sm text-foreground">
          <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {enlace.consignatarios.length}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground" title={nombres}>
          {nombres}
        </p>
      </TableCell>

      <TableCell className="hidden align-top md:table-cell">
        <p className="text-sm text-foreground">{caducidad}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {enlace.ultimoAccesoAt ? `Último acceso ${formatFecha(enlace.ultimoAccesoAt)}` : 'Sin accesos aún'}
        </p>
      </TableCell>

      <TableCell className="hidden align-top text-sm text-muted-foreground lg:table-cell">
        {enlace.creadoPor ?? '—'}
      </TableCell>

      <TableCell className="text-right align-top">
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleCopy}
            disabled={!enlace.token}
            title={enlace.token ? 'Copiar enlace' : 'Sin token para copiar'}
          >
            {copied ? (
              <Check className="mr-1.5 h-3.5 w-3.5 text-[var(--color-success)]" />
            ) : (
              <Copy className="mr-1.5 h-3.5 w-3.5" />
            )}
            Copiar
          </Button>
          <RowActionsMenu
            items={[
              {
                label: 'Copiar enlace',
                icon: Copy,
                onSelect: handleCopy,
                hidden: !enlace.token,
              },
              { type: 'separator' },
              {
                label: 'Revocar',
                icon: Trash2,
                destructive: true,
                onSelect: onRevocar,
              },
            ]}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

function CrearEnlaceDialog({ onClose }: { onClose: () => void }) {
  const { data: consignatarios = [] } = useConsignatariosOperario(undefined, true);
  const generarMutation = useGenerarAccesoEnlace();

  const [tipo, setTipo] = useState<TipoAccesoEnlace>('PERSISTENTE');
  const [unidad, setUnidad] = useState<Unidad>('dias');
  const [cantidad, setCantidad] = useState('7');
  const [etiqueta, setEtiqueta] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [agregarId, setAgregarId] = useState<number | undefined>(undefined);
  const [nuevoEnlaceUrl, setNuevoEnlaceUrl] = useState<string | null>(null);
  const [nuevoEnlaceCodigo, setNuevoEnlaceCodigo] = useState<string | null>(null);

  const seleccionados = useMemo(
    () => consignatarios.filter((c) => selectedIds.has(c.id)),
    [consignatarios, selectedIds],
  );
  const disponibles = useMemo(
    () => consignatarios.filter((c) => !selectedIds.has(c.id)),
    [consignatarios, selectedIds],
  );

  const duracionHoras = useMemo(() => {
    const n = Number(cantidad);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return unidad === 'dias' ? n * 24 : n;
  }, [cantidad, unidad]);

  const puedeGenerar =
    selectedIds.size > 0 &&
    (tipo === 'PERSISTENTE' || (duracionHoras != null && duracionHoras > 0));

  async function handleGenerar() {
    if (!puedeGenerar) return;
    try {
      const res = await generarMutation.mutateAsync({
        tipo,
        consignatarioIds: Array.from(selectedIds),
        duracionHoras: tipo === 'TEMPORAL' ? duracionHoras : undefined,
        etiqueta: etiqueta.trim() || undefined,
      });
      setNuevoEnlaceUrl(buildEnlaceUrl(res.token));
      setNuevoEnlaceCodigo(res.enlace?.codigo ?? null);
      const exp = res.enlace?.expiraAt;
      toast.success('Enlace de acceso generado', {
        description: exp
          ? `Caduca ${formatFecha(exp)} · Compártelo solo con el destinatario.`
          : 'Sin caducidad · Compártelo solo con el destinatario; puedes revocarlo cuando quieras.',
      });
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error) ?? 'No se pudo generar el enlace');
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Nuevo enlace de acceso</DialogTitle>
          <DialogDescription>
            Selecciona los consignatarios cuyos paquetes podrá ver quien reciba el enlace.
          </DialogDescription>
        </DialogHeader>

        {nuevoEnlaceUrl ? (
          <div className="space-y-4">
            <div className="rounded-md border border-[var(--color-success)]/40 bg-[var(--color-success)]/5 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Enlace listo para compartir</p>
                {nuevoEnlaceCodigo && (
                  <span
                    className="font-mono text-xs font-semibold text-foreground"
                    title="Código del enlace"
                  >
                    {nuevoEnlaceCodigo}
                  </span>
                )}
              </div>
              <CopiableUrl url={nuevoEnlaceUrl} />
              <p className="mt-2 text-xs text-muted-foreground">
                También podrás copiarlo más tarde desde la lista con el botón “Copiar”.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" onClick={onClose}>
                Listo
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Consignatarios</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <SearchableCombobox
                    value={agregarId}
                    onChange={(v) => setAgregarId(typeof v === 'number' ? v : undefined)}
                    options={disponibles}
                    getKey={(c) => c.id}
                    getLabel={(c) => (c.codigo ? `${c.nombre} · ${c.codigo}` : c.nombre)}
                    getSearchText={(c) =>
                      `${c.nombre} ${c.codigo ?? ''} ${c.telefono ?? ''} ${c.clienteUsuarioNombre ?? ''}`
                    }
                    placeholder="Buscar consignatario"
                    searchPlaceholder="Nombre, código, teléfono o cliente..."
                    emptyMessage="Sin consignatarios disponibles"
                    className="h-9"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={agregarId == null}
                    onClick={() => {
                      if (agregarId == null) return;
                      setSelectedIds((prev) => new Set(prev).add(agregarId));
                      setAgregarId(undefined);
                    }}
                    className="sm:w-auto"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                  </Button>
                </div>
              </div>

              <div className="rounded-md border border-border bg-muted/20">
                <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                  <span className="text-sm font-medium text-foreground">
                    {seleccionados.length} agregado{seleccionados.length === 1 ? '' : 's'}
                  </span>
                  {seleccionados.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      Limpiar
                    </Button>
                  )}
                </div>
                {seleccionados.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Aún no has agregado consignatarios.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-auto p-2">
                    {seleccionados.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-start gap-2 rounded-md px-2 py-2 hover:bg-muted/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{c.nombre}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[c.codigo, c.telefono, c.clienteUsuarioNombre]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() =>
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              next.delete(c.id);
                              return next;
                            })
                          }
                          aria-label={`Quitar ${c.nombre}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Tipo de enlace</Label>
                <SegmentedControl<TipoAccesoEnlace>
                  value={tipo}
                  onValueChange={setTipo}
                  options={[
                    { value: 'PERSISTENTE', label: 'Persistente' },
                    { value: 'TEMPORAL', label: 'Temporal' },
                  ]}
                />
                <p className="text-xs text-muted-foreground">
                  {tipo === 'PERSISTENTE'
                    ? 'Sin caducidad. Vive hasta que lo revoques.'
                    : 'Caduca tras la duración indicada.'}
                </p>
              </div>

              {tipo === 'TEMPORAL' && (
                <div className="space-y-1.5">
                  <Label htmlFor="acceso-duracion">Duración</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="acceso-duracion"
                      type="number"
                      min={1}
                      value={cantidad}
                      onChange={(e) => setCantidad(e.target.value)}
                      className="h-9 w-24"
                    />
                    <SegmentedControl<Unidad>
                      value={unidad}
                      onValueChange={setUnidad}
                      options={[
                        { value: 'horas', label: 'Horas' },
                        { value: 'dias', label: 'Días' },
                      ]}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="acceso-etiqueta">Etiqueta (opcional)</Label>
                <Input
                  id="acceso-etiqueta"
                  value={etiqueta}
                  onChange={(e) => setEtiqueta(e.target.value)}
                  maxLength={120}
                  placeholder="Ej. nombre del cliente, WhatsApp..."
                  className="h-9"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleGenerar}
                disabled={!puedeGenerar || generarMutation.isPending}
              >
                {generarMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Generar enlace
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CopiableUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input readOnly value={url} className="h-9 font-mono text-xs" />
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={copiar}
        aria-label="Copiar enlace"
      >
        {copied ? <Check className="h-4 w-4 text-[var(--color-success)]" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
