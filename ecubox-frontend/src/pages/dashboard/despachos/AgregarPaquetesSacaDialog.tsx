import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
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
  Boxes,
  Check,
  CheckCircle2,
  Eraser,
  Layers,
  Package as PackageIcon,
  Plus,
  Scale,
  ScanBarcode,
  Trash2,
  X,
} from 'lucide-react';
import type { TamanioSaca } from '@/types/despacho';
import type { TipoEntrega } from '@/types/despacho';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { validateGuiaList } from '@/lib/schemas/bulk-guias';
import { formatWeightFromValues, formatWeightInline } from '@/lib/utils/weight';
import { DistribucionSacasPanel } from '@/components/DistribucionSacasPanel';
import {
  computeDistributionPreview,
  createDefaultDistribucionSacasState,
  resolveDistributionForSubmit,
  type DistribucionSacasState,
} from '@/lib/utils/saca-distribution';

export interface PaqueteDisponible {
  id: number;
  numeroGuia: string;
  pesoKg?: number;
  pesoLbs?: number;
  consignatarioId?: number;
  consignatarioProvincia?: string;
  consignatarioCanton?: string;
}

export type SacaDialogTipo = 'existente' | 'nueva';

export type AgregarPaquetesModo = 'agregarASaca' | 'crearYDistribuir';

export interface AgregarPaquetesSacaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo?: AgregarPaquetesModo;
  sacaTipo: SacaDialogTipo;
  sacaId?: number;
  sacaNuevaIndex?: number;
  sacaLabel: string;
  paquetesDisponibles: PaqueteDisponible[];
  /** Paquetes sin saca que no tienen peso; se usan para avisar al operario cuáles no se pudieron agregar */
  paquetesSinPeso?: PaqueteDisponible[];
  /** Universo de paquetes sin saca (con y sin peso) para distinguir inexistente vs restringido */
  paquetesUniverso?: PaqueteDisponible[];
  tipoEntrega?: TipoEntrega;
  referenciaConsignatarioId?: number;
  referenciaProvincia?: string;
  referenciaCanton?: string;
  paquetesYaAgregadosIds?: number[];
  onAgregarExistente?: (sacaId: number, paqueteId: number) => void | Promise<void>;
  onAgregarNueva?: (index: number, paqueteId: number) => void;
  onCrearYDistribuir?: (
    paqueteIds: number[],
    distribucion: number[],
    tamanio: TamanioSaca | undefined
  ) => void;
  loading?: boolean;
}

function resolverGuia(guia: string, paquetes: PaqueteDisponible[]): PaqueteDisponible | null {
  const g = guia.trim();
  if (!g) return null;
  const gLower = g.toLowerCase();
  const byId = /^\d+$/.test(g) ? paquetes.find((p) => p.id === Number(g)) : null;
  if (byId) return byId;
  return paquetes.find((p) => p.numeroGuia?.trim().toLowerCase() === gLower) ?? null;
}

export function AgregarPaquetesSacaDialog({
  open,
  onOpenChange,
  modo = 'agregarASaca',
  sacaTipo,
  sacaId = 0,
  sacaNuevaIndex = 0,
  sacaLabel,
  paquetesDisponibles,
  paquetesSinPeso = [],
  paquetesUniverso = [],
  tipoEntrega,
  referenciaConsignatarioId,
  referenciaProvincia,
  referenciaCanton,
  paquetesYaAgregadosIds = [],
  onAgregarExistente,
  onAgregarNueva,
  onCrearYDistribuir,
  loading = false,
}: AgregarPaquetesSacaDialogProps): React.ReactElement {
  const [tab, setTab] = useState<'lista' | 'individual'>('lista');
  const [listadoGuias, setListadoGuias] = useState('');
  const [listadoGuiasErrors, setListadoGuiasErrors] = useState<string[]>([]);
  const [procesandoLista, setProcesandoLista] = useState(false);
  const [individualGuia, setIndividualGuia] = useState('');
  const [procesandoIndividual, setProcesandoIndividual] = useState(false);
  const [resultado, setResultado] = useState<{
    agregados: number;
    noEncontrados: string[];
    yaEnSaca: number;
    sinPeso: string[];
    restringidosConsignatario: string[];
    restringidosUbicacion: string[];
  } | null>(null);
  const [historial, setHistorial] = useState<
    Array<{ guia: string; status: 'success' | 'error' | 'warning'; message: string }>
  >([]);

  // Modo crearYDistribuir: lista ordenada de IDs y opciones de distribución
  const [paqueteIdsOrdenados, setPaqueteIdsOrdenados] = useState<number[]>([]);
  const [distribucionState, setDistribucionState] = useState<DistribucionSacasState>(() =>
    createDefaultDistribucionSacasState(),
  );
  const [errorDistribucion, setErrorDistribucion] = useState<string | null>(null);

  const norm = (s: string | undefined | null) => (s ?? '').trim().toLowerCase();

  function clasificarGuia(guia: string): {
    estado: 'disponible' | 'sinPeso' | 'noEncontrado' | 'restringidoConsignatario' | 'restringidoUbicacion' | 'yaAgregado';
    paquete?: PaqueteDisponible;
  } {
    const paqueteDisponible = resolverGuia(guia, paquetesDisponibles);
    if (paqueteDisponible) return { estado: 'disponible', paquete: paqueteDisponible };

    const paqueteSinPeso = resolverGuia(guia, paquetesSinPeso);
    if (paqueteSinPeso) return { estado: 'sinPeso', paquete: paqueteSinPeso };

    const paqueteUniverso = resolverGuia(guia, paquetesUniverso);
    if (!paqueteUniverso) return { estado: 'noEncontrado' };

    if (paquetesYaAgregadosIds.includes(paqueteUniverso.id)) {
      return { estado: 'yaAgregado', paquete: paqueteUniverso };
    }

    if (
      (tipoEntrega === 'DOMICILIO' || tipoEntrega === 'AGENCIA_COURIER_ENTREGA') &&
      referenciaConsignatarioId != null &&
      paqueteUniverso.consignatarioId != null &&
      paqueteUniverso.consignatarioId !== referenciaConsignatarioId
    ) {
      return { estado: 'restringidoConsignatario', paquete: paqueteUniverso };
    }

    if (
      tipoEntrega === 'AGENCIA' &&
      referenciaProvincia != null &&
      referenciaCanton != null &&
      (norm(paqueteUniverso.consignatarioProvincia) !== norm(referenciaProvincia) ||
        norm(paqueteUniverso.consignatarioCanton) !== norm(referenciaCanton))
    ) {
      return { estado: 'restringidoUbicacion', paquete: paqueteUniverso };
    }

    return { estado: 'noEncontrado' };
  }

  const paquetesIngresados = useMemo(() => {
    if (paqueteIdsOrdenados.length === 0) return [];
    const all = [...paquetesUniverso, ...paquetesDisponibles, ...paquetesSinPeso];
    const byId = new Map<number, PaqueteDisponible>();
    for (const p of all) {
      if (!byId.has(p.id)) byId.set(p.id, p);
    }
    return paqueteIdsOrdenados
      .map((id) => byId.get(id))
      .filter((p): p is PaqueteDisponible => p != null);
  }, [paqueteIdsOrdenados, paquetesUniverso, paquetesDisponibles, paquetesSinPeso]);

  const pesoTotalIngresados = useMemo(() => {
    let kg = 0;
    let lbs = 0;
    for (const p of paquetesIngresados) {
      if (p.pesoKg != null) kg += p.pesoKg;
      if (p.pesoLbs != null) lbs += p.pesoLbs;
    }
    return { kg, lbs };
  }, [paquetesIngresados]);

  // Un peso nulo es un dato desconocido (no cero): contamos los ingresados sin
  // peso para advertir que el total es parcial, sin impedir crear las sacas.
  const ingresadosSinPeso = useMemo(
    () =>
      paquetesIngresados.filter(
        (p) =>
          (p.pesoKg == null || Number.isNaN(p.pesoKg) || p.pesoKg <= 0) &&
          (p.pesoLbs == null || Number.isNaN(p.pesoLbs) || p.pesoLbs <= 0),
      ).length,
    [paquetesIngresados],
  );

  const distribucionPreview = useMemo<number[] | null>(
    () => computeDistributionPreview(paqueteIdsOrdenados.length, distribucionState),
    [paqueteIdsOrdenados.length, distribucionState],
  );

  const paquetesDetalleDistribucion = useMemo(
    () =>
      paquetesIngresados.map((p) => ({
        kg: p.pesoKg ?? 0,
        lbs: p.pesoLbs ?? 0,
      })),
    [paquetesIngresados],
  );

  const quitarIngresado = (id: number) => {
    setPaqueteIdsOrdenados((prev) => prev.filter((pid) => pid !== id));
  };

  const limpiarIngresados = () => {
    setPaqueteIdsOrdenados([]);
    setResultado(null);
  };

  const handleProcesarLista = async () => {
    const validation = validateGuiaList(listadoGuias);
    if (!validation.ok) {
      setListadoGuiasErrors(validation.errors);
      return;
    }
    setListadoGuiasErrors([]);
    const lineas = validation.guias;
    if (lineas.length === 0) return;
    setProcesandoLista(true);
    setResultado(null);
    let agregados = 0;
    const noEncontrados: string[] = [];
    const sinPeso: string[] = [];
    const restringidosConsignatario: string[] = [];
    const restringidosUbicacion: string[] = [];
    const lineasFallidas: string[] = [];
    let yaEnSaca = 0;
    if (modo === 'crearYDistribuir') {
      const nuevosIds: number[] = [];
      for (const guia of lineas) {
        const clasificada = clasificarGuia(guia);
        if (clasificada.estado !== 'disponible') {
          if (clasificada.estado === 'sinPeso') {
            sinPeso.push(guia);
            lineasFallidas.push(guia);
          } else if (clasificada.estado === 'yaAgregado') {
            yaEnSaca++;
          } else if (clasificada.estado === 'restringidoConsignatario') {
            restringidosConsignatario.push(guia);
            lineasFallidas.push(guia);
          } else if (clasificada.estado === 'restringidoUbicacion') {
            restringidosUbicacion.push(guia);
            lineasFallidas.push(guia);
          } else {
            noEncontrados.push(guia);
            lineasFallidas.push(guia);
          }
          continue;
        }
        const p = clasificada.paquete!;
        if (paqueteIdsOrdenados.includes(p.id) || nuevosIds.includes(p.id)) {
          yaEnSaca++;
          continue;
        }
        nuevosIds.push(p.id);
        agregados++;
      }
      setPaqueteIdsOrdenados((prev) => [...prev, ...nuevosIds]);
    } else {
      for (const guia of lineas) {
        const clasificada = clasificarGuia(guia);
        if (clasificada.estado !== 'disponible') {
          if (clasificada.estado === 'sinPeso') {
            sinPeso.push(guia);
            lineasFallidas.push(guia);
          } else if (clasificada.estado === 'yaAgregado') {
            yaEnSaca++;
          } else if (clasificada.estado === 'restringidoConsignatario') {
            restringidosConsignatario.push(guia);
            lineasFallidas.push(guia);
          } else if (clasificada.estado === 'restringidoUbicacion') {
            restringidosUbicacion.push(guia);
            lineasFallidas.push(guia);
          } else {
            noEncontrados.push(guia);
            lineasFallidas.push(guia);
          }
          continue;
        }
        const p = clasificada.paquete!;
        if (sacaTipo === 'existente' && onAgregarExistente) {
          try {
            await onAgregarExistente(sacaId, p.id);
            agregados++;
          } catch {
            noEncontrados.push(guia);
            lineasFallidas.push(guia);
          }
        } else if (sacaTipo === 'nueva' && onAgregarNueva) {
          onAgregarNueva(sacaNuevaIndex, p.id);
          agregados++;
        }
      }
    }
    setResultado({ agregados, noEncontrados, yaEnSaca, sinPeso, restringidosConsignatario, restringidosUbicacion });
    setProcesandoLista(false);
    setListadoGuias(lineasFallidas.join('\n'));
  };

  const handleAgregarIndividual = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const guia = individualGuia.trim();
    if (!guia) return;
    setProcesandoIndividual(true);
    const clasificada = clasificarGuia(guia);
    const nuevoHistorial = [...historial];
    if (clasificada.estado !== 'disponible') {
      if (clasificada.estado === 'sinPeso') {
        nuevoHistorial.unshift({
          guia,
          status: 'error',
          message: 'Sin peso — registra el peso en Pesaje',
        });
      } else if (clasificada.estado === 'restringidoConsignatario') {
        nuevoHistorial.unshift({
          guia,
          status: 'warning',
          message: 'Existe, pero no corresponde al consignatario del despacho',
        });
      } else if (clasificada.estado === 'restringidoUbicacion') {
        nuevoHistorial.unshift({
          guia,
          status: 'warning',
          message: 'Existe, pero no corresponde a la provincia/cantón del despacho',
        });
      } else if (clasificada.estado === 'yaAgregado') {
        nuevoHistorial.unshift({
          guia,
          status: 'warning',
          message: 'Ya agregado en este despacho',
        });
      } else {
        nuevoHistorial.unshift({
          guia,
          status: 'error',
          message: 'No existe o no está disponible para operario (sin saca)',
        });
      }
    } else {
      const p = clasificada.paquete!;
      if (modo === 'crearYDistribuir') {
        if (paqueteIdsOrdenados.includes(p.id)) {
          nuevoHistorial.unshift({ guia, status: 'warning', message: 'Ya en la lista' });
        } else {
          setPaqueteIdsOrdenados((prev) => [...prev, p.id]);
          nuevoHistorial.unshift({ guia, status: 'success', message: 'Agregado' });
        }
      } else if (sacaTipo === 'existente' && onAgregarExistente) {
        try {
          await onAgregarExistente(sacaId, p.id);
          nuevoHistorial.unshift({ guia, status: 'success', message: 'Agregado' });
        } catch {
          nuevoHistorial.unshift({ guia, status: 'error', message: 'Error al agregar' });
        }
      } else if (sacaTipo === 'nueva' && onAgregarNueva) {
        onAgregarNueva(sacaNuevaIndex, p.id);
        nuevoHistorial.unshift({ guia, status: 'success', message: 'Agregado' });
      }
    }
    setHistorial(nuevoHistorial.slice(0, 50));
    setIndividualGuia('');
    setProcesandoIndividual(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setListadoGuias('');
      setListadoGuiasErrors([]);
      setIndividualGuia('');
      setResultado(null);
      setHistorial([]);
      setTab('lista');
      setPaqueteIdsOrdenados([]);
      setDistribucionState(createDefaultDistribucionSacasState());
      setErrorDistribucion(null);
    }
    onOpenChange(open);
  };

  function handleCrearSacas() {
    setErrorDistribucion(null);
    const N = paqueteIdsOrdenados.length;
    const result = resolveDistributionForSubmit(N, distribucionState);
    if (!result.ok || !result.distribucion) {
      setErrorDistribucion(result.error ?? 'Distribución inválida.');
      return;
    }
    const tamanio: TamanioSaca | undefined = undefined;
    onCrearYDistribuir?.(paqueteIdsOrdenados, result.distribucion, tamanio);
    handleClose(false);
  }

  const lineasEnTextarea = useMemo(
    () => listadoGuias.split('\n').map((l) => l.trim()).filter(Boolean).length,
    [listadoGuias]
  );
  const crearSacasDisabled = paqueteIdsOrdenados.length === 0 || loading;
  const cantidadSacasPreview = distribucionPreview?.length ?? 0;
  const crearSacasLabel =
    paqueteIdsOrdenados.length === 0
      ? 'Crear sacas'
      : `Crear ${cantidadSacasPreview} saca${cantidadSacasPreview === 1 ? '' : 's'}`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-3xl flex-col overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)]">
        <DialogHeader className="shrink-0 border-b border-[var(--color-border)] px-4 pb-4 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--color-muted)] text-[var(--color-primary)]">
              <Boxes className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base">
                {modo === 'crearYDistribuir'
                  ? 'Ingresar paquetes y crear sacas'
                  : `Agregar paquetes a ${sacaLabel}`}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                {modo === 'crearYDistribuir'
                  ? 'Pega o escanea paquetes y elige cómo distribuirlos.'
                  : 'Pega un listado de guías (una por línea) o escanea individualmente. Los paquetes sin peso también pueden incluirse; su peso quedará pendiente.'}
              </DialogDescription>
            </div>
          </div>

          {modo === 'crearYDistribuir' && paqueteIdsOrdenados.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-2.5 py-1 text-xs font-medium text-[var(--color-primary)]">
                <PackageIcon className="h-3.5 w-3.5" />
                {paqueteIdsOrdenados.length} paquete{paqueteIdsOrdenados.length === 1 ? '' : 's'}
              </span>
              {(pesoTotalIngresados.kg > 0 || pesoTotalIngresados.lbs > 0) && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-[var(--color-muted)]/30 px-2.5 py-1 text-xs font-medium text-foreground">
                  <Scale className="h-3.5 w-3.5" />
                  {formatWeightInline(pesoTotalIngresados.lbs, pesoTotalIngresados.kg)}
                  {ingresadosSinPeso > 0 && <span className="text-muted-foreground"> · parcial</span>}
                </span>
              )}
              {ingresadosSinPeso > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-warning)]">
                  <Scale className="h-3.5 w-3.5" />
                  {ingresadosSinPeso} sin peso
                </span>
              )}
              {distribucionPreview && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-[var(--color-muted)]/30 px-2.5 py-1 text-xs font-medium text-foreground">
                  <Layers className="h-3.5 w-3.5" />
                  {distribucionPreview.length} saca{distribucionPreview.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-muted)]/20 px-4 py-2 sm:px-6">
          <button
            type="button"
            onClick={() => setTab('lista')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              tab === 'lista'
                ? 'bg-[var(--color-background)] text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Lista / Masivo
          </button>
          <button
            type="button"
            onClick={() => setTab('individual')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              tab === 'individual'
                ? 'bg-[var(--color-background)] text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ScanBarcode className="h-3.5 w-3.5" />
            Individual / Escáner
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6">
          {tab === 'lista' && (
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">
                  Pega una guía por línea
                </label>
                <span className="text-xs text-muted-foreground">
                  {lineasEnTextarea} línea{lineasEnTextarea === 1 ? '' : 's'}
                </span>
              </div>
              <Textarea
                value={listadoGuias}
                onChange={(e) => {
                  setListadoGuias(e.target.value);
                  if (listadoGuiasErrors.length > 0) setListadoGuiasErrors([]);
                }}
                placeholder={'GU-12345\nGU-12346\nGU-12347'}
                className={cn(
                  'min-h-[160px] resize-y font-mono text-sm',
                  listadoGuiasErrors.length > 0 && 'border-[var(--color-destructive)]'
                )}
                aria-invalid={listadoGuiasErrors.length > 0}
                autoFocus
              />
              {listadoGuiasErrors.length > 0 && (
                <div
                  className="flex items-start gap-2 rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 px-3 py-2 text-sm text-[var(--color-destructive)]"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <ul className="list-inside list-disc space-y-0.5">
                    {listadoGuiasErrors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={handleProcesarLista}
                  disabled={!listadoGuias.trim() || procesandoLista || loading}
                >
                  {procesandoLista ? 'Procesando...' : 'Procesar lista'}
                </Button>
                {listadoGuias.trim() && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setListadoGuias('')}
                    disabled={procesandoLista || loading}
                  >
                    <Eraser className="mr-1 h-3.5 w-3.5" />
                    Limpiar
                  </Button>
                )}
              </div>
              {resultado && <ResultadoBloque resultado={resultado} />}
            </div>
          )}

          {tab === 'individual' && (
            <div className="flex flex-col space-y-3">
              <label className="text-xs font-medium text-muted-foreground">
                Escanea o escribe la guía y presiona Enter
              </label>
              <form onSubmit={handleAgregarIndividual} className="flex gap-2">
                <div className="relative flex-1">
                  <ScanBarcode className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    value={individualGuia}
                    onChange={(e) => setIndividualGuia(e.target.value)}
                    placeholder="Escanea o escribe guía..."
                    className="pl-8 font-mono text-sm"
                    autoFocus
                  />
                </div>
                <Button type="submit" disabled={!individualGuia.trim() || procesandoIndividual || loading}>
                  <Plus className="mr-1 h-4 w-4" />
                  Añadir
                </Button>
              </form>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Historial reciente {historial.length > 0 && `(${historial.length})`}
                </span>
                {historial.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setHistorial([])}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-1.5 overflow-y-auto rounded-md border border-border bg-[var(--color-muted)]/10 p-2">
                {historial.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-1 py-6 text-center text-xs text-muted-foreground">
                    <ScanBarcode className="h-5 w-5 opacity-50" />
                    El historial de escaneo aparecerá aquí
                  </div>
                ) : (
                  historial.map((item, idx) => {
                    const Icon =
                      item.status === 'success'
                        ? CheckCircle2
                        : item.status === 'error'
                          ? AlertCircle
                          : AlertCircle;
                    const color =
                      item.status === 'success'
                        ? 'success'
                        : item.status === 'error'
                          ? 'destructive'
                          : 'warning';
                    return (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-center justify-between gap-2 rounded border px-2.5 py-1.5 text-xs',
                          color === 'success' &&
                            'border-[var(--color-success)]/25 bg-[var(--color-success)]/10',
                          color === 'destructive' &&
                            'border-[var(--color-destructive)]/25 bg-[var(--color-destructive)]/10',
                          color === 'warning' &&
                            'border-[var(--color-warning)]/25 bg-[var(--color-warning)]/10'
                        )}
                      >
                        <span className="min-w-0 truncate font-mono font-medium">{item.guia}</span>
                        <span
                          className={cn(
                            'inline-flex shrink-0 items-center gap-1',
                            color === 'success' && 'text-[var(--color-success)]',
                            color === 'destructive' && 'text-[var(--color-destructive)]',
                            color === 'warning' && 'text-[var(--color-warning)]'
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {item.message}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {modo === 'crearYDistribuir' && paquetesIngresados.length > 0 && (
            <div className="mt-4 space-y-2 rounded-md border border-border bg-[var(--color-card)] p-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <PackageIcon className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                  Paquetes en orden de ingreso
                </span>
                <button
                  type="button"
                  onClick={limpiarIngresados}
                  className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground hover:text-[var(--color-destructive)]"
                >
                  <Trash2 className="h-3 w-3" />
                  Limpiar todo
                </button>
              </div>
              <ul className="max-h-[160px] space-y-1 overflow-y-auto pr-1">
                {paquetesIngresados.map((p, idx) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded border border-border bg-[var(--color-background)] px-2 py-1 text-xs"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--color-muted)]/40 text-[10px] font-semibold text-muted-foreground">
                        {idx + 1}
                      </span>
                      <span className="truncate font-mono font-medium">{p.numeroGuia}</span>
                    </span>
                    <span className="inline-flex items-center gap-2">
                      {(() => {
                        const pesoLabel = formatWeightFromValues(p.pesoLbs, p.pesoKg);
                        return pesoLabel ? (
                          <span className="whitespace-nowrap text-muted-foreground">
                            {pesoLabel}
                          </span>
                        ) : null;
                      })()}
                      <button
                        type="button"
                        onClick={() => quitarIngresado(p.id)}
                        aria-label="Quitar"
                        className="rounded p-0.5 text-muted-foreground hover:bg-[var(--color-destructive)]/10 hover:text-[var(--color-destructive)]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {modo === 'crearYDistribuir' && (
            <div className="mt-4 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/10 p-3">
              <DistribucionSacasPanel
                totalPaquetes={paqueteIdsOrdenados.length}
                paquetesDetalle={paquetesDetalleDistribucion}
                value={distribucionState}
                onChange={setDistribucionState}
                error={errorDistribucion}
              />
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 sm:px-6">
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cerrar
          </Button>
          {modo === 'crearYDistribuir' && (
            <div className="flex flex-col items-stretch gap-1 sm:items-end">
              {paqueteIdsOrdenados.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  Agrega al menos un paquete.
                </span>
              )}
              <Button
                type="button"
                onClick={handleCrearSacas}
                disabled={crearSacasDisabled}
              >
                <Check className="mr-1.5 h-4 w-4" />
                {crearSacasLabel}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResultadoBloque({
  resultado,
}: {
  resultado: {
    agregados: number;
    noEncontrados: string[];
    yaEnSaca: number;
    sinPeso: string[];
    restringidosConsignatario: string[];
    restringidosUbicacion: string[];
  };
}) {
  return (
    <div className="space-y-1.5 rounded-md border border-border bg-[var(--color-muted)]/20 p-3 text-xs">
      <div className="flex flex-wrap gap-1.5">
        {resultado.agregados > 0 && (
          <span className="inline-flex items-center gap-1 rounded border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-2 py-0.5 text-[var(--color-success)]">
            <CheckCircle2 className="h-3 w-3" />
            {resultado.agregados} agregado{resultado.agregados === 1 ? '' : 's'}
          </span>
        )}
        {resultado.yaEnSaca > 0 && (
          <span className="inline-flex items-center gap-1 rounded border border-border bg-[var(--color-muted)]/40 px-2 py-0.5 text-muted-foreground">
            {resultado.yaEnSaca} ya en lista
          </span>
        )}
        {resultado.noEncontrados.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 px-2 py-0.5 text-[var(--color-destructive)]">
            <AlertCircle className="h-3 w-3" />
            {resultado.noEncontrados.length} no encontrado{resultado.noEncontrados.length === 1 ? '' : 's'}
          </span>
        )}
        {resultado.sinPeso.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 px-2 py-0.5 text-[var(--color-destructive)]">
            <Scale className="h-3 w-3" />
            {resultado.sinPeso.length} sin peso
          </span>
        )}
        {resultado.restringidosConsignatario.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-2 py-0.5 text-[var(--color-warning)]">
            <AlertCircle className="h-3 w-3" />
            {resultado.restringidosConsignatario.length} otro consignatario
          </span>
        )}
        {resultado.restringidosUbicacion.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-2 py-0.5 text-[var(--color-warning)]">
            <AlertCircle className="h-3 w-3" />
            {resultado.restringidosUbicacion.length} otra ubicación
          </span>
        )}
      </div>
      {resultado.sinPeso.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Las guías sin peso se mantienen arriba para que las cargues en{' '}
          <span className="font-medium text-foreground">Pesaje</span> y reintentes.
        </p>
      )}
      {(resultado.noEncontrados.length > 0 ||
        resultado.restringidosConsignatario.length > 0 ||
        resultado.restringidosUbicacion.length > 0) && (
        <p className="text-[11px] text-muted-foreground">
          Las guías que no se pudieron agregar permanecen en el cuadro de arriba para que las revises.
        </p>
      )}
    </div>
  );
}
