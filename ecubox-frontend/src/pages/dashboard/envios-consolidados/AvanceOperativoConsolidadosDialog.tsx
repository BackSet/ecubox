import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CheckSquare, Info, ListChecks, Search, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getApiErrorMessage, getApiStatus } from '@/lib/api/error-message';
import type {
  AvanceOperativoConsolidadosPayload,
  AvanceOperativoConsolidadosPreview,
  DestinoAvanceOperativo,
  DestinoAvanceOperativoCodigo,
} from '@/lib/api/envios-consolidados.service';
import {
  useAplicarAvanceOperativoConsolidados,
  usePreviewAvanceOperativoConsolidados,
} from '@/hooks/useEnviosConsolidados';
import { cn } from '@/lib/utils';
import type {
  EnvioConsolidado,
  EstadoEnvioConsolidadoOperativo,
} from '@/types/envio-consolidado';
import { EnvioConsolidadoBadge, ENVIO_CONSOLIDADO_ESTADO_UI } from './EnvioConsolidadoBadge';

interface AvanceOperativoConsolidadosDialogProps {
  open: boolean;
  consolidados: EnvioConsolidado[];
  seleccionInicial: number[];
  destinos: DestinoAvanceOperativo[];
  consolidadosLoading: boolean;
  consolidadosError: boolean;
  destinosLoading: boolean;
  destinosError: boolean;
  /** Selector de modo opcional, para presentar el avance como parte del mismo flujo. */
  headerExtra?: ReactNode;
  onOpenChange: (open: boolean) => void;
}

/**
 * Orden de los estados OPERATIVOS dentro del avance progresivo. Refleja
 * {@code EstadoEnvioConsolidadoOperativo.secuenciaAvanceOperativo()} del backend
 * y permite anticipar (sin pedir preview) qué consolidados pueden alcanzar el
 * destino. No tiene relación con estados de rastreo de paquetes.
 */
const ORDEN_AVANCE_OPERATIVO: Partial<Record<EstadoEnvioConsolidadoOperativo, number>> = {
  EN_PREPARACION: 0,
  CERRADO: 1,
  ENVIADO_DESDE_USA: 2,
  ARRIBADO_ECUADOR: 3,
};

/** Estados origen válidos para el avance operativo (los candidatos del backend). */
export function esCandidatoAvanceOperativo(envio: EnvioConsolidado): boolean {
  return (
    (envio.totalPaquetes ?? 0) > 0 &&
    envio.estadoOperativo != null &&
    (envio.estadoOperativo === 'EN_PREPARACION' ||
      envio.estadoOperativo === 'CERRADO' ||
      envio.estadoOperativo === 'ENVIADO_DESDE_USA')
  );
}

export function AvanceOperativoConsolidadosDialog({
  open,
  consolidados,
  seleccionInicial,
  destinos,
  consolidadosLoading,
  consolidadosError,
  destinosLoading,
  destinosError,
  headerExtra,
  onOpenChange,
}: AvanceOperativoConsolidadosDialogProps) {
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [destino, setDestino] = useState<DestinoAvanceOperativoCodigo | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [preview, setPreview] = useState<AvanceOperativoConsolidadosPreview | null>(null);
  const [previewVigente, setPreviewVigente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewMutation = usePreviewAvanceOperativoConsolidados();
  const aplicarMutation = useAplicarAvanceOperativoConsolidados();

  useEffect(() => {
    if (!open) return;
    setSeleccionados(seleccionInicial);
    setDestino(null);
    setBusqueda('');
    setPreview(null);
    setPreviewVigente(false);
    setError(null);
    previewMutation.reset();
    aplicarMutation.reset();
  }, [open, seleccionInicial]);

  const ordenDestino = destino != null ? ORDEN_AVANCE_OPERATIVO[destino] : undefined;

  const visibles = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    return consolidados.filter(
      (envio) =>
        esCandidatoAvanceOperativo(envio) &&
        (!query || envio.codigo.toLowerCase().includes(query)),
    );
  }, [busqueda, consolidados]);

  /** Un candidato puede avanzar al destino si su orden operativo es menor. */
  function puedeAvanzar(envio: EnvioConsolidado): boolean {
    if (ordenDestino == null || envio.estadoOperativo == null) return false;
    const ordenActual = ORDEN_AVANCE_OPERATIVO[envio.estadoOperativo];
    return ordenActual != null && ordenActual < ordenDestino;
  }

  const seleccion = useMemo(() => new Set(seleccionados), [seleccionados]);
  const seleccionablesVisibles = useMemo(
    () => visibles.filter((envio) => puedeAvanzar(envio)),
    [visibles, ordenDestino],
  );
  const todosVisibles =
    seleccionablesVisibles.length > 0 &&
    seleccionablesVisibles.every((envio) => seleccion.has(envio.id));

  function invalidarPreview() {
    setPreviewVigente(false);
    setError(null);
  }

  function toggle(id: number) {
    setSeleccionados((actuales) =>
      actuales.includes(id) ? actuales.filter((item) => item !== id) : [...actuales, id],
    );
    invalidarPreview();
  }

  function toggleVisibles() {
    if (todosVisibles) {
      const idsVisibles = new Set(seleccionablesVisibles.map((envio) => envio.id));
      setSeleccionados((actuales) => actuales.filter((id) => !idsVisibles.has(id)));
    } else {
      setSeleccionados((actuales) =>
        Array.from(new Set([...actuales, ...seleccionablesVisibles.map((envio) => envio.id)])),
      );
    }
    invalidarPreview();
  }

  function construirPayload(previewToken?: string): AvanceOperativoConsolidadosPayload | null {
    if (!destino || seleccionados.length === 0) return null;
    return {
      consolidadoIds: seleccionados,
      estadoOperativoDestino: destino,
      previewToken,
    };
  }

  async function generarPreview() {
    const payload = construirPayload();
    if (!payload) {
      setError('Selecciona al menos un consolidado y un estado destino.');
      return;
    }
    setError(null);
    try {
      const resultado = await previewMutation.mutateAsync(payload);
      setPreview(resultado);
      setPreviewVigente(true);
    } catch (err: unknown) {
      setPreview(null);
      setPreviewVigente(false);
      setError(getApiErrorMessage(err) ?? 'No se pudo generar la vista previa.');
    }
  }

  async function aplicar() {
    if (!preview || !previewVigente) return;
    const payload = construirPayload(preview.previewToken);
    if (!payload) return;
    setError(null);
    try {
      const resultado = await aplicarMutation.mutateAsync(payload);
      toast.success(
        `${resultado.estadoFinalNombre} aplicado a ${resultado.consolidadosProcesados} consolidado(s) en ${resultado.pasosAplicados} paso(s).`,
      );
      onOpenChange(false);
    } catch (err: unknown) {
      if (getApiStatus(err) === 409) {
        setPreviewVigente(false);
        setError('Los datos cambiaron. Genera nuevamente la vista previa antes de aplicar.');
        return;
      }
      setError(getApiErrorMessage(err) ?? 'No se pudo aplicar el avance operativo.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Avance automático del consolidado
          </DialogTitle>
          <DialogDescription>
            Avanza el estado operativo del consolidado aplicando los pasos intermedios necesarios
            hasta el destino elegido.
          </DialogDescription>
        </DialogHeader>

        {headerExtra}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Cómo funciona el avance</AlertTitle>
          <AlertDescription>
            El avance automático aplica pasos operativos del consolidado. El estado «Recibido en
            bodega» se asigna al registrar el consolidado en un lote de recepción, por lo que no
            está disponible aquí. Es atómico: si falla un paso, no se guarda ningún cambio.
          </AlertDescription>
        </Alert>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
          <section className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="relative flex-1">
                <Label htmlFor="buscar-consolidado-operativo" className="sr-only">
                  Buscar consolidado
                </Label>
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="buscar-consolidado-operativo"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Buscar consolidado..."
                  className="pl-8"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleVisibles}
                disabled={destino == null || seleccionablesVisibles.length === 0}
              >
                {todosVisibles ? (
                  <Square className="mr-2 h-4 w-4" />
                ) : (
                  <CheckSquare className="mr-2 h-4 w-4" />
                )}
                {todosVisibles ? 'Quitar visibles' : 'Marcar visibles'}
              </Button>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-md border">
              {consolidadosLoading ? (
                <p className="p-5 text-center text-sm text-muted-foreground">
                  Cargando consolidados...
                </p>
              ) : consolidadosError ? (
                <p className="p-5 text-center text-sm text-destructive">
                  No se pudieron cargar los consolidados.
                </p>
              ) : visibles.length === 0 ? (
                <p className="p-5 text-center text-sm text-muted-foreground">
                  No hay consolidados que coincidan con la búsqueda.
                </p>
              ) : (
                <ul className="divide-y">
                  {visibles.map((envio) => {
                    const habilitado = destino == null || puedeAvanzar(envio);
                    return (
                      <li key={envio.id}>
                        <label
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5',
                            habilitado ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
                            seleccion.has(envio.id) && 'bg-primary/5',
                          )}
                        >
                          <Checkbox
                            checked={seleccion.has(envio.id)}
                            disabled={!habilitado}
                            onCheckedChange={() => habilitado && toggle(envio.id)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{envio.codigo}</span>
                            <span className="text-xs text-muted-foreground">
                              {envio.totalPaquetes} paquete(s)
                              {!habilitado && destino != null
                                ? ' · ya alcanzó o superó el destino'
                                : ''}
                            </span>
                          </span>
                          <EnvioConsolidadoBadge
                            cerrado={envio.cerrado}
                            estadoOperativo={envio.estadoOperativo}
                          />
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {seleccionados.length} consolidado(s) seleccionado(s).
            </p>
          </section>

          <section className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="destino-avance-operativo">Avanzar hasta</Label>
              <Select
                value={destino ?? ''}
                onValueChange={(value) => {
                  const next = value as DestinoAvanceOperativoCodigo;
                  const ordenNext = ORDEN_AVANCE_OPERATIVO[next];
                  setDestino(next);
                  // Conserva solo los seleccionados que aún pueden alcanzar el nuevo destino.
                  setSeleccionados((actuales) =>
                    actuales.filter((id) => {
                      const envio = consolidados.find((e) => e.id === id);
                      const ordenActual = envio?.estadoOperativo
                        ? ORDEN_AVANCE_OPERATIVO[envio.estadoOperativo]
                        : undefined;
                      return ordenNext != null && ordenActual != null && ordenActual < ordenNext;
                    }),
                  );
                  invalidarPreview();
                }}
                disabled={destinosLoading || destinosError}
              >
                <SelectTrigger id="destino-avance-operativo">
                  <SelectValue
                    placeholder={destinosLoading ? 'Cargando destinos...' : 'Selecciona un destino'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {destinos.map((item) => (
                    <SelectItem key={item.codigo} value={item.codigo}>
                      {item.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {destinosError && (
                <p className="text-xs text-destructive">No se pudieron cargar los destinos.</p>
              )}
              <p className="text-xs text-muted-foreground">
                Destinos disponibles: Cerrado, Enviado desde USA y Arribado a Ecuador.
              </p>
            </div>

            <Button
              type="button"
              variant={previewVigente ? 'outline' : 'default'}
              className="w-full"
              onClick={generarPreview}
              disabled={
                previewMutation.isPending ||
                destino == null ||
                seleccionados.length === 0 ||
                destinosLoading ||
                consolidadosLoading ||
                consolidadosError
              }
            >
              {previewMutation.isPending ? 'Calculando...' : 'Generar vista previa'}
            </Button>
          </section>
        </div>

        {preview && (
          <section className="space-y-4 rounded-lg border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  Hasta {preview.estadoDestino.nombre}
                </p>
                <p className="text-xs text-muted-foreground">
                  {preview.resumen.totalConsolidados} consolidado(s), {preview.resumen.totalPasos}{' '}
                  paso(s) operativo(s)
                </p>
              </div>
              <Badge variant={previewVigente ? 'default' : 'secondary'}>
                {previewVigente ? 'Vista previa vigente' : 'Requiere actualizar'}
              </Badge>
            </div>

            <div className="space-y-2" aria-label="Pasos operativos intermedios">
              {preview.pasos.map((paso, index) => (
                <div
                  key={paso.codigo}
                  className="flex items-center gap-3 rounded-md border bg-background px-3 py-2"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{paso.nombre}</p>
                  </div>
                  <Badge variant="outline">
                    {ENVIO_CONSOLIDADO_ESTADO_UI[paso.codigo]?.label ?? paso.nombre}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {preview.consolidados.map((envio) => (
                <div key={envio.id} className="rounded-md border bg-background p-3">
                  <p className="truncate text-sm font-medium">{envio.codigo}</p>
                  <p className="text-xs text-muted-foreground">
                    {ENVIO_CONSOLIDADO_ESTADO_UI[envio.estadoOperativoActual].label} →{' '}
                    {ENVIO_CONSOLIDADO_ESTADO_UI[envio.estadoOperativoFinal].label} ·{' '}
                    {envio.pasos.length} paso(s)
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No se puede continuar</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={aplicar}
            disabled={
              !preview ||
              !previewVigente ||
              aplicarMutation.isPending ||
              previewMutation.isPending
            }
          >
            {aplicarMutation.isPending
              ? 'Aplicando avance...'
              : `Aplicar ${preview?.resumen.totalPasos ?? 0} paso(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
