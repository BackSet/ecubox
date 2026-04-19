import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eraser,
  PackageX,
  Save,
  Scale,
  Split,
  Weight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { KpiCard } from '@/components/KpiCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { ChipFiltro } from '@/components/ChipFiltro';
import { MonoTrunc } from '@/components/MonoTrunc';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBulkUpdatePesos, usePaquetesOperario } from '@/hooks/usePaquetesOperario';
import { onKeyDownNumericDecimal, sanitizeNumericDecimal } from '@/lib/inputFilters';
import { kgToLbs, lbsToKg } from '@/lib/utils/weight';
import type { Paquete } from '@/types/paquete';
import { DestinatarioCell, GuiaMasterPiezaCell } from '../paquetes/PaqueteCells';

type WeightInputs = Record<number, { lbs: string; kg: string }>;

function getWeightState(state: WeightInputs, id: number): { lbs: string; kg: string } {
  return state[id] ?? { lbs: '', kg: '' };
}

function parsePositive(value: string): number | null {
  if (!value || !value.trim()) return null;
  const n = Number(value);
  if (Number.isNaN(n) || n <= 0) return null;
  return n;
}

/**
 * Reparte un total entre N piezas con dos decimales. Las primeras N-1 reciben
 * floor(total/N * 100) / 100; la ultima absorbe el residuo de redondeo para
 * que la suma sea exactamente igual a `total` (evita drift por floats).
 * Si total <= 0 o n <= 0 retorna [].
 */
function distribuirEquitativo(total: number, n: number): number[] {
  if (!Number.isFinite(total) || total <= 0 || n <= 0) return [];
  const totalCent = Math.round(total * 100);
  const baseCent = Math.floor(totalCent / n);
  const result: number[] = new Array(n).fill(baseCent / 100);
  const usadoCent = baseCent * n;
  const residuoCent = totalCent - usadoCent;
  if (residuoCent !== 0 && n > 0) {
    result[n - 1] = (baseCent + residuoCent) / 100;
  }
  return result;
}

/** Formatea un numero con hasta 2 decimales, sin ceros sobrantes a la derecha. */
function fmtDecimal(n: number): string {
  if (!Number.isFinite(n)) return '';
  return n
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
}

export function CargarPesosPage() {
  const { data: paquetes, isLoading, error } = usePaquetesOperario(true);
  const bulkUpdate = useBulkUpdatePesos();
  const [weights, setWeights] = useState<WeightInputs>({});
  const [search, setSearch] = useState('');
  const [envioFiltro, setEnvioFiltro] = useState<string | undefined>(undefined);
  const [guiaMasterFiltro, setGuiaMasterFiltro] = useState<string | undefined>(
    undefined,
  );
  const [destinatarioFiltro, setDestinatarioFiltro] = useState<
    string | undefined
  >(undefined);
  /**
   * Chip activo. Refleja el estado de la sesion en el formulario:
   * - todos: sin filtrar (default)
   * - pendientes: paquetes sin valor escrito en lbs ni kg
   * - listos: paquetes con valor parseable (>0) en lbs o kg
   * - invalidos: paquetes con texto pero no parseable a numero positivo
   */
  const [chipActivo, setChipActivo] = useState<
    'todos' | 'pendientes' | 'listos' | 'invalidos'
  >('todos');

  // Estado del dialog "Distribuir total"
  const [distribuirOpen, setDistribuirOpen] = useState(false);

  // Codigos de envio consolidado presentes en los paquetes cargados, para
  // poblar el filtro. Mantenemos el mismo patron que en gestionar-estados-paquetes.
  const codigosEnvio = useMemo(() => {
    const set = new Set<string>();
    for (const p of paquetes ?? []) {
      if (p.envioConsolidadoCodigo) set.add(p.envioConsolidadoCodigo);
    }
    return Array.from(set).sort();
  }, [paquetes]);

  // Guias master distintas presentes en los paquetes (tracking base como key).
  const guiasMaster = useMemo(() => {
    const set = new Set<string>();
    for (const p of paquetes ?? []) {
      if (p.guiaMasterTrackingBase) set.add(p.guiaMasterTrackingBase);
    }
    return Array.from(set).sort();
  }, [paquetes]);

  // Destinatarios distintos presentes en los paquetes.
  const destinatarios = useMemo(() => {
    const set = new Set<string>();
    for (const p of paquetes ?? []) {
      const n = p.destinatarioNombre?.trim();
      if (n) set.add(n);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' }),
    );
  }, [paquetes]);

  /**
   * baseList: paquetes que pasan todos los filtros EXCEPTO el chip de estado
   * de carga. Sirve para que los conteos en los chips reflejen los demas
   * filtros activos (envio, guia master, destinatario, busqueda) y el operario
   * vea cuantos paquetes "Listos" hay dentro del subconjunto que esta mirando.
   */
  const baseList = useMemo(() => {
    const raw = paquetes ?? [];
    const q = search.trim().toLowerCase();
    return raw.filter((p) => {
      if (envioFiltro && (p.envioConsolidadoCodigo ?? '') !== envioFiltro) {
        return false;
      }
      if (
        guiaMasterFiltro &&
        (p.guiaMasterTrackingBase ?? '') !== guiaMasterFiltro
      ) {
        return false;
      }
      if (
        destinatarioFiltro &&
        (p.destinatarioNombre ?? '') !== destinatarioFiltro
      ) {
        return false;
      }
      if (!q) return true;
      return (
        p.ref?.toLowerCase().includes(q) ||
        p.numeroGuia?.toLowerCase().includes(q) ||
        (p.guiaMasterTrackingBase?.toLowerCase().includes(q) ?? false) ||
        (p.destinatarioNombre?.toLowerCase().includes(q) ?? false) ||
        (p.contenido?.toLowerCase().includes(q) ?? false) ||
        (p.envioConsolidadoCodigo?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [paquetes, search, envioFiltro, guiaMasterFiltro, destinatarioFiltro]);

  // Conteos por chip dentro del baseList. Pendiente significa "sin texto en
  // el formulario aun"; listo = valor parseable; invalido = texto pero no
  // parseable. Total = baseList.length.
  const chipCounts = useMemo(() => {
    let listos = 0;
    let invalidos = 0;
    let pendientes = 0;
    for (const p of baseList) {
      const w = getWeightState(weights, p.id);
      const tieneTexto = w.lbs.trim() !== '' || w.kg.trim() !== '';
      const lbs = parsePositive(w.lbs);
      const kg = parsePositive(w.kg);
      const valido = lbs != null || kg != null;
      if (valido) listos += 1;
      else if (tieneTexto) invalidos += 1;
      else pendientes += 1;
    }
    return { todos: baseList.length, pendientes, listos, invalidos };
  }, [baseList, weights]);

  const list = useMemo(() => {
    if (chipActivo === 'todos') return baseList;
    return baseList.filter((p) => {
      const w = getWeightState(weights, p.id);
      const tieneTexto = w.lbs.trim() !== '' || w.kg.trim() !== '';
      const lbs = parsePositive(w.lbs);
      const kg = parsePositive(w.kg);
      const valido = lbs != null || kg != null;
      if (chipActivo === 'pendientes') return !tieneTexto;
      if (chipActivo === 'listos') return valido;
      if (chipActivo === 'invalidos') return tieneTexto && !valido;
      return true;
    });
  }, [baseList, chipActivo, weights]);

  const tieneFiltros =
    !!envioFiltro ||
    !!guiaMasterFiltro ||
    !!destinatarioFiltro ||
    chipActivo !== 'todos';

  const limpiarFiltros = useCallback(() => {
    setEnvioFiltro(undefined);
    setGuiaMasterFiltro(undefined);
    setDestinatarioFiltro(undefined);
    setChipActivo('todos');
  }, []);

  const setLbs = useCallback((id: number, value: string) => {
    const sanitized = sanitizeNumericDecimal(value);
    const n = sanitized === '' ? NaN : Number(sanitized);
    const kgStr = !Number.isNaN(n) && n >= 0 ? String(lbsToKg(n)) : '';
    setWeights((prev) => ({
      ...prev,
      [id]: { lbs: sanitized, kg: kgStr },
    }));
  }, []);

  const setKg = useCallback((id: number, value: string) => {
    const sanitized = sanitizeNumericDecimal(value);
    const n = sanitized === '' ? NaN : Number(sanitized);
    const lbsStr = !Number.isNaN(n) && n >= 0 ? String(kgToLbs(n)) : '';
    setWeights((prev) => ({
      ...prev,
      [id]: { lbs: lbsStr, kg: sanitized },
    }));
  }, []);

  const clearRow = useCallback((id: number) => {
    setWeights((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setWeights({});
  }, []);

  /**
   * Asigna pesos en bloque para una lista de paquetes. Para cada item se
   * setea la unidad declarada (la "fuente") y se calcula la otra automaticamente
   * para mantener el formulario consistente. Si un paquete no aparece en
   * `pesosPorPaquete` se deja como esta.
   */
  const aplicarPesosEnBloque = useCallback(
    (
      pesosPorPaquete: Array<{ paqueteId: number; valor: number; unidad: 'lbs' | 'kg' }>,
    ) => {
      setWeights((prev) => {
        const next = { ...prev };
        for (const { paqueteId, valor, unidad } of pesosPorPaquete) {
          if (unidad === 'lbs') {
            next[paqueteId] = {
              lbs: fmtDecimal(valor),
              kg: fmtDecimal(lbsToKg(valor)),
            };
          } else {
            next[paqueteId] = {
              lbs: fmtDecimal(kgToLbs(valor)),
              kg: fmtDecimal(valor),
            };
          }
        }
        return next;
      });
    },
    [],
  );

  const stats = useMemo(() => {
    const all = paquetes ?? [];
    let listos = 0;
    let pendientesConValor = 0;
    let pesoLbsTotal = 0;
    for (const p of all) {
      const w = getWeightState(weights, p.id);
      const lbs = parsePositive(w.lbs);
      const kg = parsePositive(w.kg);
      if (lbs != null || kg != null) {
        listos += 1;
        if (lbs != null) pesoLbsTotal += lbs;
      }
      if (w.lbs.trim() !== '' || w.kg.trim() !== '') {
        if (lbs == null && kg == null) pendientesConValor += 1;
      }
    }
    return {
      pendientes: all.length,
      listos,
      invalidos: pendientesConValor,
      pesoLbsTotal,
    };
  }, [paquetes, weights]);

  const handleGuardar = useCallback(async () => {
    const all = paquetes ?? [];
    const items = all
      .map((p: Paquete) => {
        const w = getWeightState(weights, p.id);
        const lbs = parsePositive(w.lbs);
        const kg = parsePositive(w.kg);
        if (lbs == null && kg == null) return null;
        return {
          paqueteId: p.id,
          ...(lbs != null && { pesoLbs: lbs }),
          ...(kg != null && { pesoKg: kg }),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);

    if (items.length === 0) {
      toast.error('Ingresa al menos un peso válido en alguna fila');
      return;
    }

    try {
      await bulkUpdate.mutateAsync(items);
      toast.success(
        `Pesos actualizados: ${items.length} paquete${items.length === 1 ? '' : 's'}`,
      );
      setWeights((prev) => {
        const next = { ...prev };
        items.forEach((i) => delete next[i.paqueteId]);
        return next;
      });
    } catch {
      toast.error('Error al guardar los pesos');
    }
  }, [paquetes, weights, bulkUpdate]);

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

  const allPaquetes = paquetes ?? [];
  const hayCambios = stats.listos > 0 || stats.invalidos > 0;

  return (
    <div className="page-stack">
      <ListToolbar
        title="Cargar pesos"
        searchPlaceholder="Buscar por ref, guía, destinatario, envío consolidado o contenido..."
        onSearchChange={setSearch}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDistribuirOpen(true)}
              disabled={bulkUpdate.isPending || allPaquetes.length === 0}
              className="w-full sm:w-auto"
            >
              <Split className="mr-2 h-4 w-4" />
              Distribuir total
            </Button>
            {hayCambios && (
              <Button
                type="button"
                variant="secondary"
                onClick={clearAll}
                disabled={bulkUpdate.isPending}
                className="w-full sm:w-auto"
              >
                <Eraser className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
            )}
            <Button
              onClick={handleGuardar}
              disabled={bulkUpdate.isPending || stats.listos === 0}
              className="w-full sm:w-auto"
            >
              <Save className="mr-2 h-4 w-4" />
              {bulkUpdate.isPending
                ? 'Guardando...'
                : stats.listos > 0
                  ? `Guardar ${stats.listos} peso${stats.listos === 1 ? '' : 's'}`
                  : 'Guardar pesos'}
            </Button>
          </div>
        }
      />

      {allPaquetes.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon={<PackageX className="h-5 w-5" />}
            label="Sin peso"
            value={stats.pendientes}
            tone="neutral"
          />
          <KpiCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Listos para guardar"
            value={stats.listos}
            tone={stats.listos > 0 ? 'success' : 'neutral'}
          />
          <KpiCard
            icon={<AlertCircle className="h-5 w-5" />}
            label="Filas inválidas"
            value={stats.invalidos}
            tone={stats.invalidos > 0 ? 'danger' : 'neutral'}
          />
          <KpiCard
            icon={<Scale className="h-5 w-5" />}
            label="Total a registrar"
            value={
              stats.pesoLbsTotal > 0 ? `${stats.pesoLbsTotal.toFixed(2)} lbs` : '—'
            }
            tone="primary"
          />
        </div>
      )}

      {allPaquetes.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <ChipFiltro
              label="Todos"
              count={chipCounts.todos}
              active={chipActivo === 'todos'}
              onClick={() => setChipActivo('todos')}
            />
            <ChipFiltro
              label="Sin ingresar"
              count={chipCounts.pendientes}
              active={chipActivo === 'pendientes'}
              tone="neutral"
              onClick={() => setChipActivo('pendientes')}
            />
            <ChipFiltro
              label="Listos para guardar"
              count={chipCounts.listos}
              active={chipActivo === 'listos'}
              tone="success"
              onClick={() => setChipActivo('listos')}
            />
            <ChipFiltro
              label="Inválidos"
              count={chipCounts.invalidos}
              active={chipActivo === 'invalidos'}
              tone="danger"
              onClick={() => setChipActivo('invalidos')}
            />
          </div>
          {(codigosEnvio.length > 0 ||
            guiasMaster.length > 0 ||
            destinatarios.length > 0) && (
            <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
              {codigosEnvio.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Envío consolidado
                  </span>
                  <SearchableCombobox<string>
                    value={envioFiltro}
                    onChange={(v) =>
                      setEnvioFiltro(v === undefined ? undefined : String(v))
                    }
                    options={codigosEnvio}
                    getKey={(c) => c}
                    getLabel={(c) => c}
                    renderSelected={(c) => (
                      <span className="font-mono text-xs">{c}</span>
                    )}
                    renderOption={(c) => (
                      <span className="font-mono text-xs">{c}</span>
                    )}
                    placeholder="Todos"
                    searchPlaceholder="Buscar código..."
                    emptyMessage="Sin códigos"
                    className="h-9 w-[14rem]"
                  />
                </div>
              )}
              {guiasMaster.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Guía master
                  </span>
                  <SearchableCombobox<string>
                    value={guiaMasterFiltro}
                    onChange={(v) =>
                      setGuiaMasterFiltro(
                        v === undefined ? undefined : String(v),
                      )
                    }
                    options={guiasMaster}
                    getKey={(g) => g}
                    getLabel={(g) => g}
                    renderSelected={(g) => (
                      <span className="font-mono text-xs">{g}</span>
                    )}
                    renderOption={(g) => (
                      <span className="font-mono text-xs">{g}</span>
                    )}
                    placeholder="Todas"
                    searchPlaceholder="Buscar guía..."
                    emptyMessage="Sin guías"
                    className="h-9 w-[14rem]"
                  />
                </div>
              )}
              {destinatarios.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Destinatario
                  </span>
                  <SearchableCombobox<string>
                    value={destinatarioFiltro}
                    onChange={(v) =>
                      setDestinatarioFiltro(
                        v === undefined ? undefined : String(v),
                      )
                    }
                    options={destinatarios}
                    getKey={(n) => n}
                    getLabel={(n) => n}
                    placeholder="Todos"
                    searchPlaceholder="Buscar destinatario..."
                    emptyMessage="Sin destinatarios"
                    className="h-9 w-[16rem]"
                  />
                </div>
              )}
              {tieneFiltros && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={limpiarFiltros}
                  className="ml-auto h-9 gap-1.5 whitespace-nowrap"
                >
                  <X className="h-3.5 w-3.5 shrink-0" />
                  <span>Limpiar filtros</span>
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {allPaquetes.length === 0 ? (
        <EmptyState
          icon={Weight}
          title="No hay paquetes sin peso"
          description="Todos los paquetes registrados ya tienen peso cargado, o no hay paquetes."
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Weight}
          title="Sin resultados"
          description={
            tieneFiltros
              ? 'No hay paquetes que coincidan con los filtros aplicados.'
              : 'No hay paquetes que coincidan con la búsqueda.'
          }
          action={
            tieneFiltros ? (
              <Button variant="outline" onClick={limpiarFiltros}>
                <X className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {list.length} paquete{list.length === 1 ? '' : 's'} sin peso
            {list.length !== allPaquetes.length ? ` de ${allPaquetes.length}` : ''}
            {' · escribe en lbs o kg, la otra unidad se calcula automáticamente.'}
          </p>
          <ListTableShell>
            <Table className="min-w-[1100px] text-left">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[14rem]">Ref / Guía</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="min-w-[14rem]">Destinatario</TableHead>
                  <TableHead>Envío consolidado</TableHead>
                  <TableHead>Contenido</TableHead>
                  <TableHead className="w-[10rem]">Peso (lbs)</TableHead>
                  <TableHead className="w-[10rem]">Peso (kg)</TableHead>
                  <TableHead className="w-12 text-right" aria-label="Acciones" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => {
                  const w = getWeightState(weights, p.id);
                  const lbsValue = parsePositive(w.lbs);
                  const kgValue = parsePositive(w.kg);
                  const tieneAlgo = w.lbs.trim() !== '' || w.kg.trim() !== '';
                  const valido = lbsValue != null || kgValue != null;
                  const invalido = tieneAlgo && !valido;

                  return (
                    <TableRow
                      key={p.id}
                      className={
                        invalido
                          ? 'bg-[var(--color-destructive)]/5'
                          : valido
                            ? 'bg-[var(--color-success)]/5'
                            : undefined
                      }
                    >
                      <TableCell className="max-w-[14rem] align-top">
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
                      <TableCell className="max-w-[18rem] align-top">
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
                        <span className="line-clamp-2 break-words">{p.contenido ?? '—'}</span>
                      </TableCell>
                      <TableCell className="align-top">
                        <PesoInput
                          value={w.lbs}
                          onChange={(v) => setLbs(p.id, v)}
                          unit="lbs"
                          ariaLabel={`Peso en libras para ${p.numeroGuia}`}
                          highlight={valido}
                          invalid={invalido && w.lbs.trim() !== ''}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <PesoInput
                          value={w.kg}
                          onChange={(v) => setKg(p.id, v)}
                          unit="kg"
                          ariaLabel={`Peso en kilogramos para ${p.numeroGuia}`}
                          highlight={valido}
                          invalid={invalido && w.kg.trim() !== ''}
                        />
                      </TableCell>
                      <TableCell className="text-right align-top">
                        {tieneAlgo && (
                          <button
                            type="button"
                            onClick={() => clearRow(p.id)}
                            aria-label="Limpiar fila"
                            title="Limpiar fila"
                            className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-[var(--color-muted)] hover:text-foreground"
                          >
                            <Eraser className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ListTableShell>
        </>
      )}

      <DistribuirTotalDialog
        open={distribuirOpen}
        onOpenChange={setDistribuirOpen}
        paquetes={allPaquetes}
        weights={weights}
        codigosEnvio={codigosEnvio}
        guiasMaster={guiasMaster}
        onAplicar={(items) => {
          aplicarPesosEnBloque(items);
          setDistribuirOpen(false);
          toast.success(
            `Peso distribuido entre ${items.length} paquete${items.length === 1 ? '' : 's'}`,
          );
        }}
      />
    </div>
  );
}

interface PesoInputProps {
  value: string;
  onChange: (value: string) => void;
  unit: 'lbs' | 'kg';
  ariaLabel: string;
  highlight?: boolean;
  invalid?: boolean;
}

function PesoInput({ value, onChange, unit, ariaLabel, highlight, invalid }: PesoInputProps) {
  const borderClass = invalid
    ? 'border-[var(--color-destructive)] focus-within:ring-[var(--color-destructive)]/40'
    : highlight
      ? 'border-[var(--color-success)]/30 focus-within:ring-emerald-500/30'
      : '';
  return (
    <div
      className={`flex h-9 items-center overflow-hidden rounded-md border bg-background ${borderClass}`}
    >
      <Input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => onKeyDownNumericDecimal(e, value)}
        placeholder="0.00"
        aria-label={ariaLabel}
        className="h-9 flex-1 border-0 px-2 text-sm shadow-none focus-visible:ring-0"
      />
      <span className="select-none border-l border-border bg-[var(--color-muted)]/40 px-2 text-xs font-medium text-muted-foreground">
        {unit}
      </span>
    </div>
  );
}

interface DistribuirItem {
  paqueteId: number;
  valor: number;
  unidad: 'lbs' | 'kg';
}

interface DistribuirTotalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paquetes: Paquete[];
  weights: WeightInputs;
  codigosEnvio: string[];
  guiasMaster: string[];
  onAplicar: (items: DistribuirItem[]) => void;
}

/**
 * Dialog que permite ingresar un peso TOTAL para un grupo (envio consolidado o
 * guia master) y lo reparte equitativamente entre los paquetes del grupo
 * presentes en la pagina (paquetes sin peso). El residuo de redondeo se asigna
 * al ultimo paquete para que la suma sea exactamente igual al total.
 *
 * Si hay paquetes del grupo que ya tienen valor escrito en el formulario, se
 * pide confirmacion explicita antes de sobrescribirlos. Por defecto solo se
 * llenan los vacios.
 */
function DistribuirTotalDialog({
  open,
  onOpenChange,
  paquetes,
  weights,
  codigosEnvio,
  guiasMaster,
  onAplicar,
}: DistribuirTotalDialogProps) {
  const [modo, setModo] = useState<'envio' | 'guia'>('envio');
  const [target, setTarget] = useState<string | undefined>(undefined);
  const [unidadFuente, setUnidadFuente] = useState<'lbs' | 'kg'>('lbs');
  const [totalLbs, setTotalLbs] = useState('');
  const [totalKg, setTotalKg] = useState('');
  const [sobrescribir, setSobrescribir] = useState(false);

  // Reset al abrir/cerrar para que cada apertura sea limpia.
  useEffect(() => {
    if (!open) return;
    setModo('envio');
    setTarget(undefined);
    setUnidadFuente('lbs');
    setTotalLbs('');
    setTotalKg('');
    setSobrescribir(false);
  }, [open]);

  // Si cambia el modo o si el target deja de estar disponible, lo reseteo.
  useEffect(() => {
    setTarget(undefined);
  }, [modo]);

  // Paquetes del grupo elegido. Solo cuenta los que estan en `paquetes`
  // (es decir, los sin peso cargados en la pagina actual).
  const paquetesGrupo = useMemo(() => {
    if (!target) return [];
    if (modo === 'envio') {
      return paquetes.filter((p) => p.envioConsolidadoCodigo === target);
    }
    return paquetes.filter((p) => p.guiaMasterTrackingBase === target);
  }, [paquetes, modo, target]);

  // Particion entre vacios y con valor en formulario.
  const { vacios, conValor } = useMemo(() => {
    const v: Paquete[] = [];
    const c: Paquete[] = [];
    for (const p of paquetesGrupo) {
      const w = getWeightState(weights, p.id);
      const tieneTexto = w.lbs.trim() !== '' || w.kg.trim() !== '';
      if (tieneTexto) c.push(p);
      else v.push(p);
    }
    return { vacios: v, conValor: c };
  }, [paquetesGrupo, weights]);

  const aplicaA = sobrescribir ? paquetesGrupo : vacios;

  const setLbsSync = useCallback((value: string) => {
    const sanitized = sanitizeNumericDecimal(value);
    setUnidadFuente('lbs');
    setTotalLbs(sanitized);
    const n = sanitized === '' ? NaN : Number(sanitized);
    setTotalKg(!Number.isNaN(n) && n > 0 ? fmtDecimal(lbsToKg(n)) : '');
  }, []);

  const setKgSync = useCallback((value: string) => {
    const sanitized = sanitizeNumericDecimal(value);
    setUnidadFuente('kg');
    setTotalKg(sanitized);
    const n = sanitized === '' ? NaN : Number(sanitized);
    setTotalLbs(!Number.isNaN(n) && n > 0 ? fmtDecimal(kgToLbs(n)) : '');
  }, []);

  const totalNum = parsePositive(unidadFuente === 'lbs' ? totalLbs : totalKg);

  // Vista previa del peso por paquete (en la unidad fuente).
  const previewPorPaquete = useMemo(() => {
    if (totalNum == null || aplicaA.length === 0) return null;
    const reparto = distribuirEquitativo(totalNum, aplicaA.length);
    return {
      iguales: reparto.length > 1 ? reparto[0] === reparto[reparto.length - 1] : true,
      base: reparto[0] ?? 0,
      ultimo: reparto[reparto.length - 1] ?? 0,
    };
  }, [totalNum, aplicaA.length]);

  const opciones = modo === 'envio' ? codigosEnvio : guiasMaster;
  const tituloOpciones =
    modo === 'envio' ? 'Envío consolidado' : 'Guía master';

  function handleAplicar() {
    if (totalNum == null) {
      toast.error('Ingresa un peso total mayor que 0');
      return;
    }
    if (!target) {
      toast.error(`Selecciona un ${modo === 'envio' ? 'envío consolidado' : 'guía master'}`);
      return;
    }
    if (aplicaA.length === 0) {
      toast.error(
        sobrescribir
          ? 'No hay paquetes en este grupo'
          : 'No hay paquetes vacíos en este grupo. Activa "Sobrescribir" para reemplazar valores existentes.',
      );
      return;
    }
    const reparto = distribuirEquitativo(totalNum, aplicaA.length);
    const items: DistribuirItem[] = aplicaA.map((p, i) => ({
      paqueteId: p.id,
      valor: reparto[i] ?? 0,
      unidad: unidadFuente,
    }));
    onAplicar(items);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Distribuir peso total</DialogTitle>
          <DialogDescription>
            Reparte un peso total equitativamente entre los paquetes de un envío
            consolidado o una guía master. La suma de los pesos asignados será
            exactamente igual al total ingresado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Distribuir por
            </span>
            <div className="inline-flex rounded-md border border-border p-0.5">
              <button
                type="button"
                onClick={() => setModo('envio')}
                className={cn(
                  'flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors',
                  modo === 'envio'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-[var(--color-muted)]',
                )}
              >
                Envío consolidado
              </button>
              <button
                type="button"
                onClick={() => setModo('guia')}
                className={cn(
                  'flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors',
                  modo === 'guia'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-[var(--color-muted)]',
                )}
              >
                Guía master
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {tituloOpciones}
            </label>
            <SearchableCombobox<string>
              value={target}
              onChange={(v) => setTarget(v === undefined ? undefined : String(v))}
              options={opciones}
              getKey={(c) => c}
              getLabel={(c) => c}
              renderSelected={(c) => (
                <span className="font-mono text-xs">{c}</span>
              )}
              renderOption={(c) => (
                <span className="font-mono text-xs">{c}</span>
              )}
              placeholder={
                opciones.length === 0
                  ? `No hay ${modo === 'envio' ? 'envíos' : 'guías'} disponibles`
                  : `Selecciona ${modo === 'envio' ? 'un envío' : 'una guía'}`
              }
              searchPlaceholder="Buscar..."
              emptyMessage="Sin coincidencias"
              disabled={opciones.length === 0}
              className="h-9 w-full"
            />
          </div>

          {target && (
            <div className="rounded-md border border-border bg-[var(--color-muted)]/30 px-3 py-2 text-xs text-muted-foreground">
              {paquetesGrupo.length === 0 ? (
                <span>
                  Este grupo no tiene paquetes en la lista de "sin peso".
                </span>
              ) : (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>
                    <strong className="text-foreground">{paquetesGrupo.length}</strong>{' '}
                    paquete{paquetesGrupo.length === 1 ? '' : 's'} en el grupo
                  </span>
                  {conValor.length > 0 && (
                    <span>
                      ·{' '}
                      <strong className="text-foreground">{conValor.length}</strong>{' '}
                      con valor escrito
                    </span>
                  )}
                  <span>
                    ·{' '}
                    <strong className="text-foreground">{vacios.length}</strong>{' '}
                    vacío{vacios.length === 1 ? '' : 's'}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Total en libras
              </label>
              <PesoInput
                value={totalLbs}
                onChange={setLbsSync}
                unit="lbs"
                ariaLabel="Peso total en libras"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Total en kilogramos
              </label>
              <PesoInput
                value={totalKg}
                onChange={setKgSync}
                unit="kg"
                ariaLabel="Peso total en kilogramos"
              />
            </div>
          </div>

          {target && conValor.length > 0 && (
            <label className="flex items-start gap-2 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 px-3 py-2 text-xs">
              <input
                type="checkbox"
                checked={sobrescribir}
                onChange={(e) => setSobrescribir(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer"
              />
              <span className="text-foreground">
                <span className="font-medium">
                  Sobrescribir {conValor.length} paquete{conValor.length === 1 ? '' : 's'} con valor
                </span>
                <br />
                <span className="text-muted-foreground">
                  Por defecto solo se llenan los {vacios.length} paquete{vacios.length === 1 ? '' : 's'} vacío{vacios.length === 1 ? '' : 's'}.
                </span>
              </span>
            </label>
          )}

          {previewPorPaquete && (
            <div className="rounded-md border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 px-3 py-2 text-xs">
              <span className="font-medium text-foreground">Vista previa: </span>
              {previewPorPaquete.iguales ? (
                <span>
                  {aplicaA.length} paquete{aplicaA.length === 1 ? '' : 's'} ×{' '}
                  <strong>
                    {fmtDecimal(previewPorPaquete.base)} {unidadFuente}
                  </strong>
                </span>
              ) : (
                <span>
                  {aplicaA.length - 1} paquete{aplicaA.length - 1 === 1 ? '' : 's'} ×{' '}
                  <strong>
                    {fmtDecimal(previewPorPaquete.base)} {unidadFuente}
                  </strong>{' '}
                  + 1 paquete con{' '}
                  <strong>
                    {fmtDecimal(previewPorPaquete.ultimo)} {unidadFuente}
                  </strong>{' '}
                  <span className="text-muted-foreground">(absorbe el residuo)</span>
                </span>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleAplicar}
            disabled={
              totalNum == null || !target || aplicaA.length === 0
            }
          >
            <Split className="mr-2 h-4 w-4" />
            Distribuir entre {aplicaA.length} paquete{aplicaA.length === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

