import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  AlertCircle,
  Boxes,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Scale,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { BulkGuiaInputPanel } from '@/components/BulkGuiaInputPanel';
import { buscarPaquetesPorGuias } from '@/lib/api/paquetes.service';
import { envioConsolidadoCreateSchema, validateGuiaList } from '@/lib/schemas';
import type { Paquete } from '@/types/paquete';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MonoTrunc } from '@/components/MonoTrunc';
import { useBuscarPaquetesElegibles, useCrearEnvioConsolidado } from '@/hooks/useEnviosConsolidados';
import { cn } from '@/lib/utils';
import { formatWeightFromValues, formatWeightInline, LBS_TO_KG } from '@/lib/utils/weight';

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

/** Clave de deduplicación por número de guía normalizado (fallback cuando no hay id). */
function guiaKey(numeroGuia: string): string {
  return normalizarLineaGuia(numeroGuia).toLowerCase();
}

type AgregarTab = 'lista' | 'buscar';

export function CrearEnvioConGuiasDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [codigoError, setCodigoError] = useState<string | undefined>();
  const [tab, setTab] = useState<AgregarTab>('lista');
  const crear = useCrearEnvioConsolidado();

  // --- Carga por lista (comportamiento existente) -------------------------
  const [guiasRaw, setGuiasRaw] = useState('');
  const [guiaListError, setGuiaListError] = useState<string | undefined>();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [paquetesPorLista, setPaquetesPorLista] = useState<Paquete[] | null>(null);
  const [noEncontradasLista, setNoEncontradasLista] = useState<string[]>([]);
  const guias = useMemo(() => parseGuias(guiasRaw), [guiasRaw]);

  // --- Búsqueda interactiva de paquetes -----------------------------------
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPage, setSearchPage] = useState(0);
  // id -> paquete seleccionado desde la búsqueda.
  const [seleccionBusqueda, setSeleccionBusqueda] = useState<Map<number, Paquete>>(new Map());

  // Debounce del término de búsqueda para no consultar en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setSearchPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: searchData, isFetching: searchFetching } = useBuscarPaquetesElegibles(
    { q: searchQuery, page: searchPage, size: 20 },
    searchQuery.length > 0,
  );

  // --- Conjunto final combinado (lista + búsqueda), deduplicado -----------
  const seleccionadosBusqueda = useMemo(
    () => Array.from(seleccionBusqueda.values()),
    [seleccionBusqueda],
  );

  /**
   * Paquetes conocidos a incluir = verificados por lista ∪ seleccionados por
   * búsqueda. Dedupe primero por id y, como respaldo, por número de guía
   * normalizado (un paquete verificado por lista y luego seleccionado en la
   * búsqueda no se cuenta dos veces).
   */
  const paquetesSeleccionadosFinales = useMemo(() => {
    const porId = new Map<number, Paquete>();
    const porGuia = new Set<string>();
    const add = (p: Paquete) => {
      if (porId.has(p.id)) return;
      const key = guiaKey(p.numeroGuia);
      if (porGuia.has(key)) return;
      porId.set(p.id, p);
      porGuia.add(key);
    };
    (paquetesPorLista ?? []).forEach(add);
    seleccionadosBusqueda.forEach(add);
    return Array.from(porId.values());
  }, [paquetesPorLista, seleccionadosBusqueda]);

  /**
   * Total real a crear: unión por número de guía de las guías pegadas (aunque no
   * se hayan verificado) y los paquetes seleccionados por búsqueda. Permite
   * mostrar el conteo correcto combinando lista y búsqueda sin doble conteo.
   */
  const totalParaCrear = useMemo(() => {
    const keys = new Set<string>();
    guias.forEach((g) => keys.add(guiaKey(g)));
    seleccionadosBusqueda.forEach((p) => keys.add(guiaKey(p.numeroGuia)));
    return keys.size;
  }, [guias, seleccionadosBusqueda]);

  const previewStats = useMemo(() => {
    let pesoLbs = 0;
    let yaEnOtro = 0;
    for (const p of paquetesSeleccionadosFinales) {
      if (p.pesoLbs != null) pesoLbs += Number(p.pesoLbs);
      if (p.envioConsolidadoCodigo) yaEnOtro += 1;
    }
    return {
      incluidos: paquetesSeleccionadosFinales.length,
      yaEnOtro,
      pesoLbs,
      pesoKg: pesoLbs * LBS_TO_KG,
      noEncontradas: noEncontradasLista.length,
    };
  }, [paquetesSeleccionadosFinales, noEncontradasLista]);

  async function handlePreviewLista() {
    if (guiasRaw.trim()) {
      const rawLines = guiasRaw
        .split(/[\n,;]+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .join('\n');
      const listCheck = validateGuiaList(rawLines);
      if (!listCheck.ok) {
        setGuiaListError(listCheck.errors.join(' · '));
        return;
      }
      setGuiaListError(undefined);
    }
    if (guias.length === 0) {
      toast.error('Agrega al menos un número de guía');
      return;
    }
    setPreviewLoading(true);
    try {
      const encontrados = await buscarPaquetesPorGuias(guias);
      setPaquetesPorLista(encontrados);
      const set = new Set(encontrados.map((p) => p.numeroGuia.toLowerCase()));
      setNoEncontradasLista(guias.filter((g) => !set.has(g.toLowerCase())));
    } catch {
      toast.error('No se pudo buscar las guías');
    } finally {
      setPreviewLoading(false);
    }
  }

  function handleConservarSoloFallidas() {
    if (noEncontradasLista.length === 0) return;
    setGuiasRaw(noEncontradasLista.join('\n'));
    setPaquetesPorLista(null);
    setNoEncontradasLista([]);
  }

  function toggleSeleccionBusqueda(paquete: Paquete) {
    setSeleccionBusqueda((prev) => {
      const next = new Map(prev);
      if (next.has(paquete.id)) next.delete(paquete.id);
      else next.set(paquete.id, paquete);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (guiasRaw.trim()) {
      const rawLines = guiasRaw
        .split(/[\n,;]+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .join('\n');
      const listCheck = validateGuiaList(rawLines);
      if (!listCheck.ok) {
        setGuiaListError(listCheck.errors.join(' · '));
        return;
      }
      setGuiaListError(undefined);
    }
    const paqueteIds = seleccionadosBusqueda.map((p) => p.id);
    const parsed = envioConsolidadoCreateSchema.safeParse({
      codigo: codigo.trim(),
      numerosGuia: guias.length > 0 ? guias : undefined,
      paqueteIds: paqueteIds.length > 0 ? paqueteIds : undefined,
    });
    if (!parsed.success) {
      const codigoIssue = parsed.error.issues.find((i) => i.path[0] === 'codigo');
      const guiaIssue = parsed.error.issues.find((i) => i.path[0] === 'numerosGuia');
      setCodigoError(codigoIssue?.message);
      setGuiaListError(guiaIssue?.message);
      const first = parsed.error.issues[0]?.message;
      if (first) toast.error(first);
      return;
    }
    setCodigoError(undefined);
    setGuiaListError(undefined);
    try {
      const res = await crear.mutateAsync({
        codigo: parsed.data.codigo,
        numerosGuia: parsed.data.numerosGuia,
        paqueteIds: parsed.data.paqueteIds,
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

  const searchResults = searchData?.content ?? [];
  const searchTotalPages = searchData?.totalPages ?? 0;
  const searchTotalElements = searchData?.totalElements ?? 0;

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
                viajarán en él. Puedes pegar una lista, buscar paquetes o combinar
                ambos. Podrás agregar más piezas después.
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
                onChange={(e) => {
                  setCodigo(e.target.value);
                  setCodigoError(undefined);
                }}
                placeholder="Ej: ENV-USA-2026-001"
                className="font-mono text-sm"
                autoFocus
                aria-invalid={!!codigoError}
              />
              {codigoError && (
                <p className="mt-1 text-xs text-destructive">{codigoError}</p>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                Identificador único interno usado por el operario en lotes de recepción y
                manifiestos.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Agregar paquetes</span>
                <SegmentedControl
                  value={tab}
                  onValueChange={setTab}
                  options={[
                    { value: 'lista', label: 'Lista' },
                    { value: 'buscar', label: 'Buscar' },
                  ]}
                />
              </div>

              {tab === 'lista' && (
                <div>
                  <BulkGuiaInputPanel
                    tab="lista"
                    onTabChange={() => {}}
                    listValue={guiasRaw}
                    onListChange={(value) => {
                      setGuiasRaw(value);
                      setPaquetesPorLista(null);
                      setNoEncontradasLista([]);
                      setGuiaListError(undefined);
                    }}
                    individualValue=""
                    onIndividualChange={() => {}}
                    onProcessList={handlePreviewLista}
                    onProcessIndividual={() => {}}
                    procesandoLista={previewLoading}
                    showTabs={false}
                    listButtonLabel="Verificar guías"
                    listLabel="Piezas asociadas (opcional)"
                    listPlaceholder={'12312312312 1/2\n12312312312 2/2\nABC987 1/1'}
                    lineCount={guias.length}
                    guiaCount={guias.length}
                    validationError={guiaListError}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Una línea por pieza. Formato:{' '}
                    <span className="font-mono">{'<guía> <pieza>/<total>'}</span>. Acepta
                    saltos de línea, comas o punto y coma. Los espacios alrededor de la barra
                    se normalizan.
                  </p>

                  {noEncontradasLista.length > 0 && (
                    <div className="mt-3 rounded border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 p-2">
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
                        {noEncontradasLista.map((g) => (
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

              {tab === 'buscar' && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Buscar por guía, ref, contenido o consignatario..."
                      className="pl-8 text-sm"
                    />
                  </div>

                  {searchQuery.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      Escribe para buscar paquetes y selecciónalos para incluirlos.
                    </p>
                  ) : searchFetching && searchResults.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">Buscando...</p>
                  ) : searchResults.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      Sin resultados para «{searchQuery}».
                    </p>
                  ) : (
                    <>
                      <ul className="max-h-56 space-y-1 overflow-auto pr-1">
                        {searchResults.map(({ paquete, elegible, motivoNoElegible }) => {
                          const seleccionado = seleccionBusqueda.has(paquete.id);
                          const peso = formatWeightFromValues(paquete.pesoLbs, paquete.pesoKg);
                          const deshabilitado = !elegible && !seleccionado;
                          return (
                            <li key={paquete.id}>
                              <button
                                type="button"
                                disabled={deshabilitado}
                                onClick={() => toggleSeleccionBusqueda(paquete)}
                                aria-pressed={seleccionado}
                                className={cn(
                                  'flex w-full items-start gap-2 rounded border px-2 py-1.5 text-left text-xs transition-colors',
                                  seleccionado
                                    ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/5'
                                    : 'border-border bg-[var(--color-background)] hover:border-[var(--color-primary)]/30',
                                  deshabilitado && 'cursor-not-allowed opacity-60',
                                )}
                              >
                                <span
                                  className={cn(
                                    'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                                    seleccionado
                                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                                      : 'border-border',
                                  )}
                                >
                                  {seleccionado && <Check className="h-3 w-3" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <MonoTrunc
                                      value={paquete.numeroGuia}
                                      className="font-medium text-foreground"
                                      copy={false}
                                    />
                                    {paquete.consignatarioNombre && (
                                      <span className="text-muted-foreground">
                                        · {paquete.consignatarioNombre}
                                      </span>
                                    )}
                                  </span>
                                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                                    {paquete.estadoRastreoNombre && (
                                      <span>{paquete.estadoRastreoNombre}</span>
                                    )}
                                    {peso && <span>· {peso}</span>}
                                    {paquete.envioConsolidadoCodigo && (
                                      <span className="inline-flex items-center gap-1 text-[var(--color-warning)]">
                                        <AlertCircle className="h-2.5 w-2.5" />
                                        ya en {paquete.envioConsolidadoCodigo}
                                      </span>
                                    )}
                                  </span>
                                  {!elegible && motivoNoElegible && (
                                    <span className="mt-0.5 block text-[11px] text-[var(--color-destructive)]">
                                      {motivoNoElegible}
                                    </span>
                                  )}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                      {searchTotalPages > 1 && (
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{searchTotalElements} resultados</span>
                          <span className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              disabled={searchPage === 0 || searchFetching}
                              onClick={() => setSearchPage((p) => Math.max(0, p - 1))}
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <span className="tabular-nums">
                              {searchPage + 1}/{searchTotalPages}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              disabled={searchPage >= searchTotalPages - 1 || searchFetching}
                              onClick={() => setSearchPage((p) => p + 1)}
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {(paquetesSeleccionadosFinales.length > 0 || totalParaCrear > 0) && (
              <div className="space-y-3 rounded-md border border-border bg-[var(--color-muted)]/20 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Paquetes a incluir
                  </span>
                  <span className="inline-flex items-center gap-1 rounded border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-2 py-0.5 text-xs text-[var(--color-success)]">
                    <CheckCircle2 className="h-3 w-3" />
                    {totalParaCrear} paquete{totalParaCrear === 1 ? '' : 's'}
                  </span>
                  {previewStats.pesoLbs > 0 && (
                    <span className="inline-flex items-center gap-1 rounded border border-border bg-[var(--color-background)] px-2 py-0.5 text-xs text-foreground">
                      <Scale className="h-3 w-3" />
                      {formatWeightInline(previewStats.pesoLbs, previewStats.pesoKg)}
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

                {paquetesSeleccionadosFinales.length > 0 && (
                  <ul className="max-h-44 space-y-1 overflow-auto pr-1">
                    {paquetesSeleccionadosFinales.map((p) => {
                      const peso = formatWeightFromValues(p.pesoLbs, p.pesoKg);
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
                            <span className="text-muted-foreground">· {p.consignatarioNombre}</span>
                          )}
                          {peso && <span className="text-muted-foreground">· {peso}</span>}
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
              : totalParaCrear > 0
                ? `Crear con ${totalParaCrear} paquete${totalParaCrear === 1 ? '' : 's'}`
                : 'Crear envío'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
