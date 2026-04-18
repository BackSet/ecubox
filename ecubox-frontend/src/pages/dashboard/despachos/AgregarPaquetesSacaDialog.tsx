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

export interface PaqueteDisponible {
  id: number;
  numeroGuia: string;
  pesoKg?: number;
  pesoLbs?: number;
  destinatarioFinalId?: number;
  destinatarioProvincia?: string;
  destinatarioCanton?: string;
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
  referenciaDestinatarioId?: number;
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
  referenciaDestinatarioId,
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
  const [procesandoLista, setProcesandoLista] = useState(false);
  const [individualGuia, setIndividualGuia] = useState('');
  const [procesandoIndividual, setProcesandoIndividual] = useState(false);
  const [resultado, setResultado] = useState<{
    agregados: number;
    noEncontrados: string[];
    yaEnSaca: number;
    sinPeso: string[];
    restringidosDestinatario: string[];
    restringidosUbicacion: string[];
  } | null>(null);
  const [historial, setHistorial] = useState<
    Array<{ guia: string; status: 'success' | 'error' | 'warning'; message: string }>
  >([]);

  // Modo crearYDistribuir: lista ordenada de IDs y opciones de distribución
  const [paqueteIdsOrdenados, setPaqueteIdsOrdenados] = useState<number[]>([]);
  const [distribucionManual, setDistribucionManual] = useState('');
  const [distribucionTipo, setDistribucionTipo] = useState<'manual' | 'automatica'>('manual');
  const [automaticaNumSacas, setAutomaticaNumSacas] = useState<number>(2);
  const [automaticaTipo, setAutomaticaTipo] = useState<'numSacas' | 'maxPorSaca'>('numSacas');
  const [automaticaMaxPorSaca, setAutomaticaMaxPorSaca] = useState<number>(5);
  const [errorDistribucion, setErrorDistribucion] = useState<string | null>(null);

  const norm = (s: string | undefined | null) => (s ?? '').trim().toLowerCase();

  function clasificarGuia(guia: string): {
    estado: 'disponible' | 'sinPeso' | 'noEncontrado' | 'restringidoDestinatario' | 'restringidoUbicacion' | 'yaAgregado';
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
      (tipoEntrega === 'DOMICILIO' || tipoEntrega === 'AGENCIA_DISTRIBUIDOR') &&
      referenciaDestinatarioId != null &&
      paqueteUniverso.destinatarioFinalId != null &&
      paqueteUniverso.destinatarioFinalId !== referenciaDestinatarioId
    ) {
      return { estado: 'restringidoDestinatario', paquete: paqueteUniverso };
    }

    if (
      tipoEntrega === 'AGENCIA' &&
      referenciaProvincia != null &&
      referenciaCanton != null &&
      (norm(paqueteUniverso.destinatarioProvincia) !== norm(referenciaProvincia) ||
        norm(paqueteUniverso.destinatarioCanton) !== norm(referenciaCanton))
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

  const distribucionPreview = useMemo<number[] | null>(() => {
    const N = paqueteIdsOrdenados.length;
    if (N === 0) return null;
    if (distribucionTipo === 'manual') {
      if (!distribucionManual.trim()) return null;
      const parts = distribucionManual
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => parseInt(s, 10));
      if (parts.some((n) => Number.isNaN(n) || n < 1)) return null;
      const sum = parts.reduce((a, b) => a + b, 0);
      if (sum !== N) return null;
      return parts;
    }
    const numSacas =
      automaticaTipo === 'maxPorSaca'
        ? Math.ceil(N / Math.max(1, automaticaMaxPorSaca))
        : Math.max(1, Math.min(automaticaNumSacas, N));
    const base = Math.floor(N / numSacas);
    const rest = N % numSacas;
    return Array.from({ length: numSacas }, (_, i) => base + (i < rest ? 1 : 0));
  }, [
    paqueteIdsOrdenados.length,
    distribucionTipo,
    distribucionManual,
    automaticaTipo,
    automaticaNumSacas,
    automaticaMaxPorSaca,
  ]);

  const distribucionPreviewDetalle = useMemo(() => {
    if (!distribucionPreview) return null;
    let cursor = 0;
    return distribucionPreview.map((n) => {
      const slice = paquetesIngresados.slice(cursor, cursor + n);
      cursor += n;
      let kg = 0;
      let lbs = 0;
      for (const p of slice) {
        if (p.pesoKg != null) kg += p.pesoKg;
        if (p.pesoLbs != null) lbs += p.pesoLbs;
      }
      return { count: n, kg, lbs };
    });
  }, [distribucionPreview, paquetesIngresados]);

  const quitarIngresado = (id: number) => {
    setPaqueteIdsOrdenados((prev) => prev.filter((pid) => pid !== id));
  };

  const limpiarIngresados = () => {
    setPaqueteIdsOrdenados([]);
    setResultado(null);
  };

  const handleProcesarLista = async () => {
    const lineas = listadoGuias
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lineas.length === 0) return;
    setProcesandoLista(true);
    setResultado(null);
    let agregados = 0;
    const noEncontrados: string[] = [];
    const sinPeso: string[] = [];
    const restringidosDestinatario: string[] = [];
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
          } else if (clasificada.estado === 'restringidoDestinatario') {
            restringidosDestinatario.push(guia);
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
          } else if (clasificada.estado === 'restringidoDestinatario') {
            restringidosDestinatario.push(guia);
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
    setResultado({ agregados, noEncontrados, yaEnSaca, sinPeso, restringidosDestinatario, restringidosUbicacion });
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
          message: 'Sin peso — cargue el peso en Cargar pesos',
        });
      } else if (clasificada.estado === 'restringidoDestinatario') {
        nuevoHistorial.unshift({
          guia,
          status: 'warning',
          message: 'Existe, pero no corresponde al destinatario del despacho',
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
      setIndividualGuia('');
      setResultado(null);
      setHistorial([]);
      setTab('lista');
      setPaqueteIdsOrdenados([]);
      setDistribucionManual('');
      setDistribucionTipo('manual');
      setAutomaticaNumSacas(2);
      setAutomaticaTipo('numSacas');
      setAutomaticaMaxPorSaca(5);
      setErrorDistribucion(null);
    }
    onOpenChange(open);
  };

  function handleCrearSacas() {
    setErrorDistribucion(null);
    const N = paqueteIdsOrdenados.length;
    if (N === 0) {
      setErrorDistribucion('Agrega al menos un paquete.');
      return;
    }
    let distribucion: number[];
    if (distribucionTipo === 'manual') {
      const parts = distribucionManual
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => parseInt(s, 10));
      if (parts.some((n) => Number.isNaN(n) || n < 1)) {
        setErrorDistribucion('Distribución manual: solo números positivos separados por comas (ej. 1,2,4).');
        return;
      }
      const sum = parts.reduce((a, b) => a + b, 0);
      if (sum !== N) {
        setErrorDistribucion(`La suma debe ser ${N} (paquetes ingresados).`);
        return;
      }
      distribucion = parts;
    } else {
      const numSacas =
        automaticaTipo === 'maxPorSaca'
          ? Math.ceil(N / Math.max(1, automaticaMaxPorSaca))
          : Math.max(1, Math.min(automaticaNumSacas, N));
      const base = Math.floor(N / numSacas);
      const rest = N % numSacas;
      distribucion = [];
      for (let i = 0; i < numSacas; i++) {
        distribucion.push(base + (i < rest ? 1 : 0));
      }
    }
    const tamanio: TamanioSaca | undefined = undefined; // El tamaño se configura en cada saca en la página
    onCrearYDistribuir?.(paqueteIdsOrdenados, distribucion, tamanio);
    handleClose(false);
  }

  const lineasEnTextarea = useMemo(
    () => listadoGuias.split('\n').map((l) => l.trim()).filter(Boolean).length,
    [listadoGuias]
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-[var(--color-border)] px-6 pb-4 pt-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
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
                  ? 'Escanea o pega guías. El orden de ingreso define a qué saca va cada paquete. Solo se aceptan paquetes con peso cargado.'
                  : 'Pega un listado de guías (una por línea) o escanea individualmente. Solo se aceptan paquetes con peso cargado.'}
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
                  {pesoTotalIngresados.kg.toFixed(2)} kg
                  {pesoTotalIngresados.lbs > 0 && (
                    <span className="text-muted-foreground"> · {pesoTotalIngresados.lbs.toFixed(2)} lbs</span>
                  )}
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

        <div className="flex gap-1 border-b border-[var(--color-border)] bg-[var(--color-muted)]/20 px-6 py-2">
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

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-4">
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
                onChange={(e) => setListadoGuias(e.target.value)}
                placeholder={'GU-12345\nGU-12346\nGU-12347'}
                className="min-h-[160px] resize-y font-mono text-sm"
              />
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
                      {p.pesoKg != null && (
                        <span className="text-muted-foreground">{p.pesoKg.toFixed(2)} kg</span>
                      )}
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
        </div>

        {modo === 'crearYDistribuir' && (
          <div className="space-y-3 border-t border-[var(--color-border)] bg-[var(--color-muted)]/10 px-6 py-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Layers className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                Distribución en sacas
              </span>
              <div className="inline-flex rounded-md border border-border bg-[var(--color-background)] p-0.5">
                <button
                  type="button"
                  onClick={() => setDistribucionTipo('manual')}
                  className={cn(
                    'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                    distribucionTipo === 'manual'
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Manual
                </button>
                <button
                  type="button"
                  onClick={() => setDistribucionTipo('automatica')}
                  className={cn(
                    'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                    distribucionTipo === 'automatica'
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Automática
                </button>
              </div>
            </div>

            {distribucionTipo === 'manual' && (
              <div className="space-y-1.5">
                <Input
                  type="text"
                  value={distribucionManual}
                  onChange={(e) => setDistribucionManual(e.target.value.replace(/[^0-9,]/g, ''))}
                  placeholder="Ej. 1,2,4"
                  className="w-full max-w-xs font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Números separados por comas. La suma debe ser{' '}
                  <span className="font-semibold text-foreground">{paqueteIdsOrdenados.length}</span>.
                </p>
              </div>
            )}

            {distribucionTipo === 'automatica' && (
              <div className="space-y-2">
                <div className="inline-flex rounded-md border border-border bg-[var(--color-background)] p-0.5">
                  <button
                    type="button"
                    onClick={() => setAutomaticaTipo('numSacas')}
                    className={cn(
                      'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                      automaticaTipo === 'numSacas'
                        ? 'bg-[var(--color-muted)] text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Por número de sacas
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutomaticaTipo('maxPorSaca')}
                    className={cn(
                      'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                      automaticaTipo === 'maxPorSaca'
                        ? 'bg-[var(--color-muted)] text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Por tamaño máximo
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {automaticaTipo === 'numSacas' ? (
                    <>
                      <span className="text-muted-foreground">Repartir en</span>
                      <Input
                        type="number"
                        min={1}
                        max={Math.max(paqueteIdsOrdenados.length, 1)}
                        value={automaticaNumSacas}
                        onChange={(e) => setAutomaticaNumSacas(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="h-8 w-20 font-mono text-sm"
                      />
                      <span className="text-muted-foreground">sacas</span>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">Máximo</span>
                      <Input
                        type="number"
                        min={1}
                        value={automaticaMaxPorSaca}
                        onChange={(e) => setAutomaticaMaxPorSaca(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="h-8 w-20 font-mono text-sm"
                      />
                      <span className="text-muted-foreground">paquetes por saca</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {distribucionPreviewDetalle && distribucionPreviewDetalle.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Vista previa</span>
                <div className="flex flex-wrap gap-1.5">
                  {distribucionPreviewDetalle.map((d, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-2 py-0.5 text-xs"
                      title={`${d.kg.toFixed(2)} kg`}
                    >
                      <span className="font-semibold text-[var(--color-primary)]">Saca {i + 1}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-foreground">{d.count} pkg</span>
                      {d.kg > 0 && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">{d.kg.toFixed(1)} kg</span>
                        </>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {errorDistribucion && (
              <p className="inline-flex items-center gap-1.5 text-xs text-[var(--color-destructive)]">
                <AlertCircle className="h-3.5 w-3.5" />
                {errorDistribucion}
              </p>
            )}

            <p className="text-[11px] text-muted-foreground">
              El tamaño de cada saca se configura en su tarjeta después de crearlas.
            </p>
          </div>
        )}

        <DialogFooter className="border-t border-[var(--color-border)] bg-[var(--color-background)] px-6 py-3">
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cerrar
          </Button>
          {modo === 'crearYDistribuir' && (
            <Button
              type="button"
              onClick={handleCrearSacas}
              disabled={paqueteIdsOrdenados.length === 0 || loading}
            >
              <Check className="mr-1.5 h-4 w-4" />
              Crear {distribucionPreview?.length ?? 0} saca{(distribucionPreview?.length ?? 0) === 1 ? '' : 's'}
            </Button>
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
    restringidosDestinatario: string[];
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
        {resultado.restringidosDestinatario.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-2 py-0.5 text-[var(--color-warning)]">
            <AlertCircle className="h-3 w-3" />
            {resultado.restringidosDestinatario.length} otro destinatario
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
          <span className="font-medium text-foreground">Cargar pesos</span> y reintentes.
        </p>
      )}
      {(resultado.noEncontrados.length > 0 ||
        resultado.restringidosDestinatario.length > 0 ||
        resultado.restringidosUbicacion.length > 0) && (
        <p className="text-[11px] text-muted-foreground">
          Las guías que no se pudieron agregar permanecen en el cuadro de arriba para que las revises.
        </p>
      )}
    </div>
  );
}
