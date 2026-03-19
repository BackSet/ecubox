import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
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
    let yaEnSaca = 0;
    if (modo === 'crearYDistribuir') {
      const nuevosIds: number[] = [];
      for (const guia of lineas) {
        const clasificada = clasificarGuia(guia);
        if (clasificada.estado !== 'disponible') {
          if (clasificada.estado === 'sinPeso') sinPeso.push(guia);
          else if (clasificada.estado === 'yaAgregado') yaEnSaca++;
          else if (clasificada.estado === 'restringidoDestinatario') restringidosDestinatario.push(guia);
          else if (clasificada.estado === 'restringidoUbicacion') restringidosUbicacion.push(guia);
          else noEncontrados.push(guia);
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
          if (clasificada.estado === 'sinPeso') sinPeso.push(guia);
          else if (clasificada.estado === 'yaAgregado') yaEnSaca++;
          else if (clasificada.estado === 'restringidoDestinatario') restringidosDestinatario.push(guia);
          else if (clasificada.estado === 'restringidoUbicacion') restringidosUbicacion.push(guia);
          else noEncontrados.push(guia);
          continue;
        }
        const p = clasificada.paquete!;
        if (sacaTipo === 'existente' && onAgregarExistente) {
          try {
            await onAgregarExistente(sacaId, p.id);
            agregados++;
          } catch {
            noEncontrados.push(guia);
          }
        } else if (sacaTipo === 'nueva' && onAgregarNueva) {
          onAgregarNueva(sacaNuevaIndex, p.id);
          agregados++;
        }
      }
    }
    setResultado({ agregados, noEncontrados, yaEnSaca, sinPeso, restringidosDestinatario, restringidosUbicacion });
    setProcesandoLista(false);
    setListadoGuias('');
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {modo === 'crearYDistribuir' ? 'Ingresar paquetes y crear sacas' : `Agregar paquetes a ${sacaLabel}`}
          </DialogTitle>
          <DialogDescription>
            {modo === 'crearYDistribuir'
              ? 'Escanea o ingresa paquetes (lista o individual). Solo se pueden agregar paquetes con peso cargado. El orden de ingreso determina el orden de asignación a las sacas. Después podrás configurar el tamaño de cada saca en la página.'
              : 'Pega un listado de guías (una por línea) o escanea/escribe una guía individual. Solo se agregan paquetes con peso cargado; los que no tengan peso se indicarán para que los cargue en Cargar pesos.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 border-b border-[var(--color-border)] pb-2">
          <Button
            type="button"
            variant={tab === 'lista' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('lista')}
          >
            Lista / Masivo
          </Button>
          <Button
            type="button"
            variant={tab === 'individual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('individual')}
          >
            Individual / Escáner
          </Button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {tab === 'lista' && (
            <div className="space-y-4 flex flex-col">
              <Textarea
                value={listadoGuias}
                onChange={(e) => setListadoGuias(e.target.value)}
                placeholder="Una guía por línea..."
                className="min-h-[200px] font-mono resize-y"
              />
              <Button
                type="button"
                onClick={handleProcesarLista}
                disabled={!listadoGuias.trim() || procesandoLista || loading}
              >
                {procesandoLista ? 'Procesando...' : 'Procesar lista'}
              </Button>
              {resultado && (
                <div className="text-sm rounded-md bg-[var(--color-muted)]/30 p-3 space-y-1">
                  {resultado.agregados > 0 && (
                    <p className="text-[var(--color-foreground)]">Agregados: {resultado.agregados}</p>
                  )}
                  {resultado.noEncontrados.length > 0 && (
                    <p className="text-[var(--color-destructive)]">
                      No disponibles/no existentes: {resultado.noEncontrados.length}
                    </p>
                  )}
                  {resultado.restringidosDestinatario.length > 0 && (
                    <p className="text-[var(--color-warning)]">
                      No agregados por restricción de destinatario: {resultado.restringidosDestinatario.length}
                    </p>
                  )}
                  {resultado.restringidosUbicacion.length > 0 && (
                    <p className="text-[var(--color-warning)]">
                      No agregados por restricción de provincia/cantón: {resultado.restringidosUbicacion.length}
                    </p>
                  )}
                  {resultado.sinPeso.length > 0 && (
                    <div>
                      <p className="text-[var(--color-destructive)] font-medium">
                        No agregados por no tener peso: {resultado.sinPeso.length}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                        {resultado.sinPeso.join(', ')} — cargue el peso en Cargar pesos.
                      </p>
                    </div>
                  )}
                  {resultado.yaEnSaca > 0 && (
                    <p className="text-[var(--color-muted-foreground)]">Ya en saca: {resultado.yaEnSaca}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'individual' && (
            <div className="space-y-4 flex flex-col">
              <form onSubmit={handleAgregarIndividual} className="flex gap-2">
                <Input
                  type="text"
                  value={individualGuia}
                  onChange={(e) => setIndividualGuia(e.target.value)}
                  placeholder="Escanea o escribe guía..."
                  className="flex-1 font-mono"
                  autoFocus
                />
                <Button type="submit" disabled={!individualGuia.trim() || procesandoIndividual || loading}>
                  <Plus className="h-4 w-4 mr-1" />
                  Añadir
                </Button>
              </form>
              <div className="flex-1 overflow-y-auto border rounded-md bg-[var(--color-muted)]/20 p-2 space-y-2 min-h-[120px]">
                {historial.length === 0 && (
                  <p className="text-sm text-[var(--color-muted-foreground)] text-center py-4">
                    El historial de escaneo aparecerá aquí
                  </p>
                )}
                {historial.map((item, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-2 rounded text-sm flex items-center justify-between border',
                      item.status === 'success'
                        ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]/25'
                        : item.status === 'error'
                          ? 'bg-[var(--color-destructive)]/10 border-[var(--color-destructive)]/25'
                          : 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]/25'
                    )}
                  >
                    <span className="font-mono font-medium">{item.guia}</span>
                    <span
                      className={
                        item.status === 'success'
                          ? 'text-[var(--color-success)]'
                          : item.status === 'error'
                            ? 'text-[var(--color-destructive)]'
                            : 'text-[var(--color-warning)]'
                      }
                    >
                      {item.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {modo === 'crearYDistribuir' && (
          <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
            <p className="text-sm font-medium text-[var(--color-foreground)]">
              Paquetes ingresados: {paqueteIdsOrdenados.length}
            </p>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-4 items-center">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={distribucionTipo === 'manual'}
                    onChange={() => setDistribucionTipo('manual')}
                    className="rounded border-[var(--color-border)]"
                  />
                  Distribución manual
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={distribucionTipo === 'automatica'}
                    onChange={() => setDistribucionTipo('automatica')}
                    className="rounded border-[var(--color-border)]"
                  />
                  Distribución automática
                </label>
              </div>
              {distribucionTipo === 'manual' && (
                <div>
                  <Input
                    type="text"
                    value={distribucionManual}
                    onChange={(e) => setDistribucionManual(e.target.value.replace(/[^0-9,]/g, ''))}
                    placeholder="Ej. 1,2,4"
                    className="w-full max-w-xs font-mono"
                  />
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                    Números separados por comas. La suma debe ser {paqueteIdsOrdenados.length}.
                  </p>
                </div>
              )}
              {distribucionTipo === 'automatica' && (
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={automaticaTipo === 'numSacas'}
                      onChange={() => setAutomaticaTipo('numSacas')}
                      className="rounded border-[var(--color-border)]"
                    />
                    Repartir en
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(paqueteIdsOrdenados.length, 1)}
                    value={automaticaNumSacas}
                    onChange={(e) => setAutomaticaNumSacas(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-16 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-sm"
                  />
                  <span className="text-sm">sacas</span>
                  <label className="flex items-center gap-2 text-sm ml-4">
                    <input
                      type="radio"
                      checked={automaticaTipo === 'maxPorSaca'}
                      onChange={() => setAutomaticaTipo('maxPorSaca')}
                      className="rounded border-[var(--color-border)]"
                    />
                    Máximo
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={automaticaMaxPorSaca}
                    onChange={(e) => setAutomaticaMaxPorSaca(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-16 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-sm"
                  />
                  <span className="text-sm">por saca</span>
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              El tamaño de cada saca se configura en la tarjeta de la saca después de crearlas.
            </p>
            {errorDistribucion && (
              <p className="text-sm text-[var(--color-destructive)]">{errorDistribucion}</p>
            )}
          </div>
        )}

        <DialogFooter>
          {modo === 'crearYDistribuir' && (
            <Button
              type="button"
              onClick={handleCrearSacas}
              disabled={paqueteIdsOrdenados.length === 0 || loading}
            >
              Crear sacas
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
