import { useState, useMemo, useCallback, useEffect } from 'react';
import { usePaquetesSinSaca } from '@/hooks/useOperarioDespachos';
import { useCambiarEstadoRastreoBulk } from '@/hooks/usePaquetesOperario';
import { useEstadosRastreoActivos } from '@/hooks/useEstadosRastreo';
import type { EstadoRastreo } from '@/types/estado-rastreo';
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { KpiCard } from '@/components/KpiCard';
import { ChipFiltro } from '@/components/ChipFiltro';
import { FiltrosBar, FiltroCampo } from '@/components/FiltrosBar';
import { MonoTrunc } from '@/components/MonoTrunc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ListChecks,
  Search,
  Tag,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { GuiaMasterPiezaCell, DestinatarioCell } from '../paquetes/PaqueteCells';
import type { Paquete } from '@/types/paquete';

export function GestionarEstadosPaquetesPage() {
  const { data: paquetes, isLoading, error } = usePaquetesSinSaca();
  const { data: estadosRastreo = [] } = useEstadosRastreoActivos();
  const cambiarEstadoBulk = useCambiarEstadoRastreoBulk();

  const [search, setSearch] = useState('');
  const [estadoActualFiltro, setEstadoActualFiltro] = useState<string | undefined>(
    undefined,
  );
  const [envioFiltro, setEnvioFiltro] = useState<string | undefined>(undefined);
  const [soloSeleccionados, setSoloSeleccionados] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [estadoTargetId, setEstadoTargetId] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultadoDialog, setResultadoDialog] = useState<
    | {
        actualizados: number;
        rechazados: { paqueteId: number; motivo: string; numeroGuia?: string }[];
      }
    | null
  >(null);

  const all = useMemo(() => paquetes ?? [], [paquetes]);
  const opcionesEstado: EstadoRastreo[] = estadosRastreo;

  const estadoTarget = useMemo(
    () => opcionesEstado.find((e) => String(e.id) === estadoTargetId) ?? null,
    [opcionesEstado, estadoTargetId],
  );

  const codigosEnvio = useMemo(() => {
    const set = new Set<string>();
    for (const p of all) {
      if (p.envioConsolidadoCodigo) set.add(p.envioConsolidadoCodigo);
    }
    return Array.from(set).sort();
  }, [all]);

  const estadosActualesPresentes = useMemo(() => {
    const map = new Map<string, { codigo: string; nombre: string }>();
    for (const p of all) {
      const codigo = p.estadoRastreoCodigo ?? p.estadoRastreoNombre ?? '';
      if (!codigo) continue;
      if (!map.has(codigo)) {
        map.set(codigo, { codigo, nombre: p.estadoRastreoNombre ?? codigo });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es'),
    );
  }, [all]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((p) => {
      if (
        estadoActualFiltro &&
        (p.estadoRastreoCodigo ?? p.estadoRastreoNombre) !== estadoActualFiltro
      ) {
        return false;
      }
      if (envioFiltro && (p.envioConsolidadoCodigo ?? '') !== envioFiltro) {
        return false;
      }
      if (soloSeleccionados && !selectedIds.has(p.id)) return false;
      if (!q) return true;
      return [
        p.numeroGuia,
        p.guiaMasterTrackingBase,
        p.ref,
        p.contenido,
        p.destinatarioNombre,
        p.destinatarioTelefono,
        p.envioConsolidadoCodigo,
        p.estadoRastreoNombre,
        p.estadoRastreoCodigo,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [all, search, estadoActualFiltro, envioFiltro, soloSeleccionados, selectedIds]);

  const visibleAllSelected = useMemo(
    () => list.length > 0 && list.every((p) => selectedIds.has(p.id)),
    [list, selectedIds],
  );
  const visibleSomeSelected = useMemo(
    () => list.some((p) => selectedIds.has(p.id)),
    [list, selectedIds],
  );

  const seleccionados = useMemo(
    () => all.filter((p) => selectedIds.has(p.id)),
    [all, selectedIds],
  );

  const stats = useMemo(() => {
    const grupos = new Map<string, number>();
    for (const p of seleccionados) {
      const key = p.estadoRastreoNombre ?? p.estadoRastreoCodigo ?? '—';
      grupos.set(key, (grupos.get(key) ?? 0) + 1);
    }
    return {
      totalDisponibles: all.length,
      totalFiltrados: list.length,
      totalSeleccionados: seleccionados.length,
      gruposEstado: Array.from(grupos.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [all, list, seleccionados]);

  const toggleSelected = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllVisibles = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = list.length > 0 && list.every((p) => next.has(p.id));
      if (allSelected) {
        for (const p of list) next.delete(p.id);
      } else {
        for (const p of list) next.add(p.id);
      }
      return next;
    });
  }, [list]);

  const limpiarSeleccion = useCallback(() => {
    setSelectedIds(new Set());
    setSoloSeleccionados(false);
  }, []);

  const limpiarFiltros = useCallback(() => {
    setSearch('');
    setEstadoActualFiltro(undefined);
    setEnvioFiltro(undefined);
    setSoloSeleccionados(false);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && selectedIds.size > 0 && !confirmOpen && !resultadoDialog) {
        limpiarSeleccion();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, confirmOpen, resultadoDialog, limpiarSeleccion]);

  useEffect(() => {
    if (soloSeleccionados && selectedIds.size === 0) {
      setSoloSeleccionados(false);
    }
  }, [soloSeleccionados, selectedIds]);

  const ejecutar = useCallback(async () => {
    if (estadoTarget == null) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      const res = await cambiarEstadoBulk.mutateAsync({
        paqueteIds: ids,
        estadoRastreoId: estadoTarget.id,
      });
      const rechazadosEnriquecidos = res.rechazados.map((r) => ({
        ...r,
        numeroGuia: all.find((p) => p.id === r.paqueteId)?.numeroGuia,
      }));
      if (res.rechazados.length === 0) {
        toast.success(
          `${res.actualizados} paquete${res.actualizados === 1 ? '' : 's'} actualizado${res.actualizados === 1 ? '' : 's'}.`,
        );
      } else {
        toast.warning(
          `${res.actualizados} actualizado${res.actualizados === 1 ? '' : 's'} · ${res.rechazados.length} rechazado${res.rechazados.length === 1 ? '' : 's'}.`,
        );
      }
      setSelectedIds(
        (prev) => new Set([...prev].filter((id) => res.rechazados.some((r) => r.paqueteId === id))),
      );
      setEstadoTargetId('');
      if (res.rechazados.length > 0) {
        setResultadoDialog({ actualizados: res.actualizados, rechazados: rechazadosEnriquecidos });
      }
      setConfirmOpen(false);
    } catch {
      toast.error('Error al aplicar el estado.');
    }
  }, [estadoTarget, selectedIds, cambiarEstadoBulk, all]);

  if (isLoading) {
    return <LoadingState text="Cargando paquetes..." />;
  }
  if (error) {
    return (
      <div className="ui-alert ui-alert-error">
        Error al cargar paquetes.
      </div>
    );
  }

  const tieneFiltros =
    search.trim() !== '' ||
    estadoActualFiltro != null ||
    envioFiltro != null ||
    soloSeleccionados;

  return (
    <div className="space-y-4 pb-32">
      <ListToolbar
        title="Gestionar estados de paquetes"
        searchPlaceholder="Buscar por guía, ref, destinatario, envío o contenido..."
        onSearchChange={setSearch}
      />

      {all.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon={<ListChecks className="h-5 w-5" />}
            label="Disponibles"
            value={stats.totalDisponibles}
            tone="primary"
          />
          <KpiCard
            icon={<Search className="h-5 w-5" />}
            label="Filtrados"
            value={stats.totalFiltrados}
            tone={
              stats.totalFiltrados !== stats.totalDisponibles ? 'warning' : 'neutral'
            }
          />
          <KpiCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Seleccionados"
            value={stats.totalSeleccionados}
            tone={stats.totalSeleccionados > 0 ? 'success' : 'neutral'}
          />
          <KpiCard
            icon={<Users className="h-5 w-5" />}
            label="Estados distintos"
            value={estadosActualesPresentes.length}
            tone="neutral"
          />
        </div>
      )}

      {all.length > 0 && (
        <FiltrosBar
          hayFiltrosActivos={tieneFiltros}
          onLimpiar={limpiarFiltros}
          chips={
            <ChipFiltro
              label={
                soloSeleccionados ? 'Mostrar todos' : 'Solo seleccionados'
              }
              count={selectedIds.size}
              active={soloSeleccionados}
              tone="success"
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              onClick={() => setSoloSeleccionados((v) => !v)}
              hideWhenZero
            />
          }
          filtros={
            <>
              <FiltroCampo label="Estado actual">
                <SearchableCombobox<{ codigo: string; nombre: string }>
                  value={estadoActualFiltro}
                  onChange={(v) =>
                    setEstadoActualFiltro(v == null ? undefined : String(v))
                  }
                  options={estadosActualesPresentes}
                  getKey={(e) => e.codigo}
                  getLabel={(e) => e.nombre}
                  placeholder="Todos los estados"
                  searchPlaceholder="Buscar estado..."
                  emptyMessage="Sin estados"
                  className="h-9 w-full"
                />
              </FiltroCampo>
              <FiltroCampo label="Envío consolidado">
                <SearchableCombobox<string>
                  value={envioFiltro}
                  onChange={(v) =>
                    setEnvioFiltro(v == null ? undefined : String(v))
                  }
                  options={codigosEnvio}
                  getKey={(c) => c}
                  getLabel={(c) => c}
                  placeholder="Todos"
                  searchPlaceholder="Buscar código..."
                  emptyMessage="Sin envíos"
                  className="h-9 w-full"
                  renderOption={(c) => (
                    <span className="font-mono text-xs">{c}</span>
                  )}
                  renderSelected={(c) => (
                    <span className="font-mono text-xs">{c}</span>
                  )}
                />
              </FiltroCampo>
            </>
          }
        />
      )}

      {all.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No hay paquetes para gestionar"
          description="Todos los paquetes tienen saca asignada o no hay paquetes registrados."
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Sin resultados"
          description="No hay paquetes que coincidan con los filtros aplicados."
        />
      ) : (
        <ListTableShell>
          <Table className="min-w-[1080px] text-left">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      visibleAllSelected
                        ? true
                        : visibleSomeSelected
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={toggleAllVisibles}
                    aria-label="Seleccionar todos los visibles"
                  />
                </TableHead>
                <TableHead className="w-[16rem]">Guía / Pieza</TableHead>
                <TableHead>Estado actual</TableHead>
                <TableHead className="min-w-[16rem]">Destinatario</TableHead>
                <TableHead>Envío</TableHead>
                <TableHead>Contenido</TableHead>
                <TableHead className="text-right">Peso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => {
                const selected = selectedIds.has(p.id);
                return (
                  <TableRow
                    key={p.id}
                    onClick={() => toggleSelected(p.id)}
                    className={`cursor-pointer ${
                      selected ? 'bg-primary/5 hover:bg-primary/10' : ''
                    }`}
                  >
                    <TableCell
                      className="align-top"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleSelected(p.id)}
                        aria-label={`Seleccionar ${p.numeroGuia}`}
                      />
                    </TableCell>
                    <TableCell className="max-w-[16rem] align-top">
                      <GuiaMasterPiezaCell paquete={p} />
                      {p.ref && (
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                          {p.ref}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant="secondary" className="font-normal">
                        {p.estadoRastreoNombre ?? p.estadoRastreoCodigo ?? '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[20rem] align-top">
                      <DestinatarioCell paquete={p} />
                    </TableCell>
                    <TableCell className="align-top">
                      {p.envioConsolidadoCodigo ? (
                        <div className="flex items-center gap-1.5">
                          <MonoTrunc
                            value={p.envioConsolidadoCodigo}
                            head={6}
                            tail={6}
                            className="text-xs"
                          />
                          <Badge
                            variant="outline"
                            className="text-[10px] font-normal"
                          >
                            {p.envioConsolidadoCerrado ? 'Cerrado' : 'Abierto'}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[16rem] align-top text-sm text-muted-foreground">
                      <span className="line-clamp-2 break-words">
                        {p.contenido ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right align-top text-sm tabular-nums">
                      {p.pesoLbs != null ? <div>{p.pesoLbs.toFixed(2)} lbs</div> : null}
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
                );
              })}
            </TableBody>
          </Table>
        </ListTableShell>
      )}

      {selectedIds.size > 0 && (
        <SelectionActionBar
          total={selectedIds.size}
          gruposEstado={stats.gruposEstado}
          opcionesEstado={opcionesEstado}
          estadoTargetId={estadoTargetId}
          onChangeEstado={setEstadoTargetId}
          onClear={limpiarSeleccion}
          onApply={() => {
            if (!estadoTargetId) {
              toast.error('Selecciona el estado a aplicar.');
              return;
            }
            setConfirmOpen(true);
          }}
          loading={cambiarEstadoBulk.isPending}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(o) => !o && !cambiarEstadoBulk.isPending && setConfirmOpen(false)}
        title="¿Aplicar nuevo estado?"
        description={
          estadoTarget
            ? `Se aplicará el estado "${estadoTarget.nombre}" a ${selectedIds.size} paquete${
                selectedIds.size === 1 ? '' : 's'
              }. Los que tengan restricciones (lote/despacho) serán rechazados.`
            : undefined
        }
        confirmLabel={`Aplicar a ${selectedIds.size}`}
        loading={cambiarEstadoBulk.isPending}
        onConfirm={ejecutar}
      />

      <ResultadoDialog
        data={resultadoDialog}
        onClose={() => setResultadoDialog(null)}
        paquetes={all}
      />
    </div>
  );
}

interface SelectionActionBarProps {
  total: number;
  gruposEstado: [string, number][];
  opcionesEstado: EstadoRastreo[];
  estadoTargetId: string;
  onChangeEstado: (v: string) => void;
  onClear: () => void;
  onApply: () => void;
  loading: boolean;
}

function SelectionActionBar({
  total,
  gruposEstado,
  opcionesEstado,
  estadoTargetId,
  onChangeEstado,
  onClear,
  onApply,
  loading,
}: SelectionActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Badge className="bg-primary text-primary-foreground hover:bg-primary">
            {total} seleccionado{total === 1 ? '' : 's'}
          </Badge>
          <div className="flex flex-wrap items-center gap-1">
            {gruposEstado.slice(0, 3).map(([nombre, count]) => (
              <Badge key={nombre} variant="outline" className="font-normal">
                {nombre} · {count}
              </Badge>
            ))}
            {gruposEstado.length > 3 && (
              <Badge variant="outline" className="font-normal">
                +{gruposEstado.length - 3} más
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="w-[18rem]">
            <SearchableCombobox<EstadoRastreo>
              value={estadoTargetId === '' ? undefined : Number(estadoTargetId)}
              onChange={(v) =>
                onChangeEstado(v == null ? '' : String(v))
              }
              options={opcionesEstado}
              getKey={(e) => e.id}
              getLabel={(e) => e.nombre}
              getSearchText={(e) => `${e.nombre} ${e.codigo ?? ''}`}
              placeholder="Estado a aplicar"
              searchPlaceholder="Buscar estado..."
              emptyMessage="Sin estados"
              renderOption={(e) => (
                <div className="flex w-full items-center justify-between">
                  <span>{e.nombre}</span>
                  {e.codigo && (
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                      {e.codigo}
                    </span>
                  )}
                </div>
              )}
              renderSelected={(e) => <span className="text-sm">{e.nombre}</span>}
              clearable={false}
            />
          </div>
          <Button
            type="button"
            onClick={onApply}
            disabled={loading || !estadoTargetId}
          >
            <Tag className="mr-2 h-4 w-4" />
            Aplicar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={loading}
            title="Limpiar selección (Esc)"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Limpiar
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ResultadoDialogProps {
  data:
    | { actualizados: number; rechazados: { paqueteId: number; motivo: string; numeroGuia?: string }[] }
    | null;
  paquetes: Paquete[];
  onClose: () => void;
}

function ResultadoDialog({ data, onClose, paquetes }: ResultadoDialogProps) {
  if (!data) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-[var(--color-warning)]" />
            Algunos paquetes no se actualizaron
          </DialogTitle>
          <DialogDescription>
            {data.actualizados} actualizado{data.actualizados === 1 ? '' : 's'} y{' '}
            {data.rechazados.length} rechazado{data.rechazados.length === 1 ? '' : 's'}.
            Revisa los motivos abajo.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[24rem] overflow-y-auto rounded-md border border-border">
          <Table className="text-left">
            <TableHeader>
              <TableRow>
                <TableHead>Paquete</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rechazados.map((r) => {
                const p = paquetes.find((pp) => pp.id === r.paqueteId);
                return (
                  <TableRow key={r.paqueteId}>
                    <TableCell className="align-top">
                      <div className="flex flex-col">
                        {r.numeroGuia ? (
                          <MonoTrunc
                            value={r.numeroGuia}
                            head={6}
                            tail={6}
                            className="text-xs"
                          />
                        ) : (
                          <span className="font-mono text-xs">
                            #{r.paqueteId}
                          </span>
                        )}
                        {p?.destinatarioNombre && (
                          <span className="text-xs text-muted-foreground">
                            {p.destinatarioNombre}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-sm">{r.motivo}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Entendido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

