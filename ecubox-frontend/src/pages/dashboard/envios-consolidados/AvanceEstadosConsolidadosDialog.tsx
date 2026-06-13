import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CheckSquare, Clock3, ListChecks, Search, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  AvanceEstadosConsolidadosPayload,
  AvanceEstadosConsolidadosPreview,
  TransicionOperativaConsolidado,
} from '@/lib/api/envios-consolidados.service';
import { localDateTimeInputToApi } from '@/lib/datetime-local';
import {
  useAplicarAvanceEstadosConsolidados,
  usePreviewAvanceEstadosConsolidados,
} from '@/hooks/useEnviosConsolidados';
import { cn } from '@/lib/utils';
import type { EnvioConsolidado } from '@/types/envio-consolidado';
import { EnvioConsolidadoBadge, ENVIO_CONSOLIDADO_ESTADO_UI } from './EnvioConsolidadoBadge';

interface AvanceEstadosConsolidadosDialogProps {
  open: boolean;
  consolidados: EnvioConsolidado[];
  seleccionInicial: number[];
  transiciones: TransicionOperativaConsolidado[];
  consolidadosLoading: boolean;
  consolidadosError: boolean;
  transicionesLoading: boolean;
  transicionesError: boolean;
  /** Selector de modo opcional, para presentar el avance como parte del mismo flujo. */
  headerExtra?: ReactNode;
  onOpenChange: (open: boolean) => void;
}

function ahoraLocalInput(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function fechaInput(value: string): string {
  return value.slice(0, 16);
}

function mensajeAvanceLegible(err: unknown, fallback: string): string {
  return getApiErrorMessage(err) ?? fallback;
}

export function esCandidatoAvanceEstados(
  envio: EnvioConsolidado,
): boolean {
  return (
    (envio.totalPaquetes ?? 0) > 0 &&
    (envio.estadoOperativo === 'EN_PREPARACION' ||
      envio.estadoOperativo === 'CERRADO' ||
      envio.estadoOperativo === 'ENVIADO_DESDE_USA')
  );
}

export function AvanceEstadosConsolidadosDialog({
  open,
  consolidados,
  seleccionInicial,
  transiciones,
  consolidadosLoading,
  consolidadosError,
  transicionesLoading,
  transicionesError,
  headerExtra,
  onOpenChange,
}: AvanceEstadosConsolidadosDialogProps) {
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [transicionFinal, setTransicionFinal] = useState<string | null>(null);
  const [fechaPrincipal, setFechaPrincipal] = useState(ahoraLocalInput);
  const [fechasPorTransicion, setFechasPorTransicion] = useState<Record<string, string>>({});
  const [busqueda, setBusqueda] = useState('');
  const [preview, setPreview] = useState<AvanceEstadosConsolidadosPreview | null>(null);
  const [previewVigente, setPreviewVigente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewMutation = usePreviewAvanceEstadosConsolidados();
  const aplicarMutation = useAplicarAvanceEstadosConsolidados();

  useEffect(() => {
    if (!open) return;
    const primerEstado = consolidados.find((envio) => seleccionInicial.includes(envio.id))
      ?.estadoOperativo;
    setSeleccionados(
      seleccionInicial.filter(
        (id) =>
          consolidados.find((envio) => envio.id === id)?.estadoOperativo === primerEstado,
      ),
    );
    setTransicionFinal(null);
    setFechaPrincipal(ahoraLocalInput());
    setFechasPorTransicion({});
    setBusqueda('');
    setPreview(null);
    setPreviewVigente(false);
    setError(null);
    previewMutation.reset();
    aplicarMutation.reset();
  }, [open, seleccionInicial, consolidados]);

  const transicionesOperativas = useMemo(
    () => transiciones.filter((transicion) => transicion.orden != null),
    [transiciones],
  );
  const estadoOperativoSeleccionado = consolidados.find(
    (envio) => envio.id === seleccionados[0],
  )?.estadoOperativo;
  const transicionInicialDerivada = transicionesOperativas.find(
    (transicion) => transicion.estadoPrevioRequerido === estadoOperativoSeleccionado,
  );
  const transicionesHasta = transicionInicialDerivada
    ? transicionesOperativas.filter(
        (transicion) =>
          (transicion.orden ?? 0) >= (transicionInicialDerivada.orden ?? 0),
      )
    : [];
  const visibles = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    return consolidados.filter(
      (envio) =>
        esCandidatoAvanceEstados(envio) &&
        (!query || envio.codigo.toLowerCase().includes(query)),
    );
  }, [busqueda, consolidados]);
  const visiblesElegibles = visibles.filter(
    (envio) =>
      estadoOperativoSeleccionado == null ||
      envio.estadoOperativo === estadoOperativoSeleccionado,
  );
  const seleccion = useMemo(() => new Set(seleccionados), [seleccionados]);
  const todosVisibles =
    visiblesElegibles.length > 0 &&
    visiblesElegibles.every((envio) => seleccion.has(envio.id));

  function invalidarPreview() {
    setPreviewVigente(false);
    setError(null);
  }

  function toggle(id: number) {
    const envio = consolidados.find((item) => item.id === id);
    if (
      !seleccionados.includes(id) &&
      estadoOperativoSeleccionado != null &&
      envio?.estadoOperativo !== estadoOperativoSeleccionado
    ) {
      return;
    }
    setSeleccionados((actuales) =>
      actuales.includes(id) ? actuales.filter((item) => item !== id) : [...actuales, id],
    );
    setTransicionFinal(null);
    setFechasPorTransicion({});
    invalidarPreview();
  }

  function toggleVisibles() {
    if (todosVisibles) {
      const idsVisibles = new Set(visiblesElegibles.map((envio) => envio.id));
      setSeleccionados((actuales) => actuales.filter((id) => !idsVisibles.has(id)));
    } else {
      setSeleccionados((actuales) =>
        Array.from(new Set([...actuales, ...visiblesElegibles.map((envio) => envio.id)])),
      );
    }
    setTransicionFinal(null);
    setFechasPorTransicion({});
    invalidarPreview();
  }

  function construirPayload(previewToken?: string): AvanceEstadosConsolidadosPayload | null {
    if (!transicionFinal || seleccionados.length === 0 || !fechaPrincipal) {
      return null;
    }
    const fechaApi = localDateTimeInputToApi(fechaPrincipal);
    if (!fechaApi) return null;
    const fechas = Object.fromEntries(
      Object.entries(fechasPorTransicion)
        .filter(([, value]) => Boolean(value))
        .map(([codigo, value]) => [codigo, localDateTimeInputToApi(value) as string]),
    );
    return {
      consolidadoIds: seleccionados,
      transicionFinalCodigo: transicionFinal,
      fechaPrincipal: fechaApi,
      fechasPorTransicion: Object.keys(fechas).length > 0 ? fechas : undefined,
      previewToken,
    };
  }

  async function generarPreview() {
    const payload = construirPayload();
    if (!payload) {
      setError('Selecciona consolidados, una transición final y una fecha principal.');
      return;
    }
    setError(null);
    try {
      const resultado = await previewMutation.mutateAsync(payload);
      setPreview(resultado);
      setPreviewVigente(true);
      setFechasPorTransicion((actuales) => {
        const siguientes = { ...actuales };
        for (const paso of resultado.pasos) {
          if (!siguientes[paso.transicionCodigo]) {
            siguientes[paso.transicionCodigo] = fechaInput(paso.fecha);
          }
        }
        return siguientes;
      });
    } catch (err: unknown) {
      setPreview(null);
      setPreviewVigente(false);
      setError(mensajeAvanceLegible(err, 'No se pudo generar la vista previa.'));
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
        `${resultado.transicionesAplicadas} transición(es) aplicada(s) a ${resultado.consolidadosProcesados} consolidado(s) y ${resultado.paquetesProcesados} paquete(s).`,
      );
      onOpenChange(false);
    } catch (err: unknown) {
      const apiMsg = getApiErrorMessage(err) ?? '';
      if (getApiStatus(err) === 409) {
        setPreviewVigente(false);
        setError(
          apiMsg || 'Los datos cambiaron. Genera nuevamente la vista previa antes de aplicar.',
        );
        return;
      }
      setError(mensajeAvanceLegible(err, 'No se pudo aplicar la secuencia de estados.'));
    }
  }

  const fechasInvalidas = useMemo(() => {
    if (!preview) return false;
    let anterior = '';
    for (const paso of preview.pasos) {
      const fecha = fechasPorTransicion[paso.transicionCodigo] || fechaPrincipal;
      if (!fecha || fecha > ahoraLocalInput() || (anterior && fecha < anterior)) return true;
      anterior = fecha;
    }
    return false;
  }, [fechaPrincipal, fechasPorTransicion, preview]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Avanzar estados de consolidados
          </DialogTitle>
          <DialogDescription>
            Calcula y aplica el rango completo usando el estado operativo de cada consolidado.
          </DialogDescription>
        </DialogHeader>

        {headerExtra}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Cómo funciona el avance</AlertTitle>
            <AlertDescription>
              Se muestran los consolidados que aún pueden avanzar: En preparación, Cerrado y
              Enviado desde USA. El primer consolidado seleccionado fija el estado inicial del
              grupo. El avance llega como máximo a Arribado a Ecuador.
            </AlertDescription>
          </Alert>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
          <section className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="relative flex-1">
                <Label htmlFor="buscar-consolidado-secuencia" className="sr-only">
                  Buscar consolidado
                </Label>
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="buscar-consolidado-secuencia"
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
                disabled={estadoOperativoSeleccionado == null || visiblesElegibles.length === 0}
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
                  No hay consolidados elegibles que coincidan con la búsqueda.
                </p>
              ) : (
                <ul className="divide-y">
                  {visibles.map((envio) => (
                    <li key={envio.id}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-center gap-3 px-3 py-2.5',
                          seleccion.has(envio.id) && 'bg-primary/5',
                          estadoOperativoSeleccionado != null &&
                            envio.estadoOperativo !== estadoOperativoSeleccionado &&
                            'cursor-not-allowed opacity-50',
                        )}
                      >
                        <Checkbox
                          checked={seleccion.has(envio.id)}
                          disabled={
                            estadoOperativoSeleccionado != null &&
                            envio.estadoOperativo !== estadoOperativoSeleccionado
                          }
                          onCheckedChange={() => toggle(envio.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{envio.codigo}</span>
                          <span className="text-xs text-muted-foreground">
                            {envio.totalPaquetes} paquete(s)
                          </span>
                        </span>
                        <EnvioConsolidadoBadge
                          cerrado={envio.cerrado}
                          estadoOperativo={envio.estadoOperativo}
                        />
                      </label>
                      {estadoOperativoSeleccionado != null &&
                        envio.estadoOperativo !== estadoOperativoSeleccionado && (
                          <p className="px-3 pb-2 pl-11 text-[11px] text-muted-foreground">
                            Selecciona consolidados en{' '}
                            {ENVIO_CONSOLIDADO_ESTADO_UI[estadoOperativoSeleccionado].label}.
                          </p>
                        )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {seleccionados.length} consolidado(s) seleccionado(s).
            </p>
          </section>

          <section className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="transicion-final-secuencia">Hasta</Label>
              <Select
                value={transicionFinal ?? ''}
                onValueChange={(value) => {
                  setTransicionFinal(value);
                  setFechasPorTransicion({});
                  invalidarPreview();
                }}
                disabled={
                  seleccionados.length === 0 || transicionesLoading || transicionesError
                }
              >
                <SelectTrigger id="transicion-final-secuencia">
                  <SelectValue placeholder="Selecciona una transición" />
                </SelectTrigger>
                <SelectContent>
                  {transicionesHasta.map((transicion) => (
                    <SelectItem
                      key={transicion.codigo}
                      value={transicion.codigo}
                      disabled={
                        !transicionesOperativas
                          .filter(
                            (paso) =>
                              (paso.orden ?? 0) >= (transicionInicialDerivada?.orden ?? 0) &&
                              (paso.orden ?? 0) <= (transicion.orden ?? 0),
                          )
                          .every((paso) => paso.disponible)
                      }
                    >
                      {transicion.etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {seleccionados.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Selecciona un consolidado para determinar el estado inicial.
                </p>
              )}
              {transicionesError && (
                <p className="text-xs text-destructive">
                  No se pudieron cargar las transiciones.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fecha-principal-secuencia">Fecha principal</Label>
              <Input
                id="fecha-principal-secuencia"
                type="datetime-local"
                value={fechaPrincipal}
                max={ahoraLocalInput()}
                onChange={(event) => {
                  setFechaPrincipal(event.target.value);
                  setFechasPorTransicion({});
                  invalidarPreview();
                }}
              />
              <p className="text-xs text-muted-foreground">
                Se usa en todos los pasos salvo que personalices una fecha.
              </p>
            </div>

            <Button
              type="button"
              variant={previewVigente ? 'outline' : 'default'}
              className="w-full"
              onClick={generarPreview}
              disabled={
                previewMutation.isPending ||
                transicionesLoading ||
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
                  {preview.transicionInicial.etiqueta} → {preview.transicionFinal.etiqueta}
                </p>
                <p className="text-xs text-muted-foreground">
                  {preview.resumen.totalConsolidados} consolidado(s),{' '}
                  {preview.resumen.totalPaquetes} paquete(s), {preview.resumen.totalPasos} paso(s)
                </p>
              </div>
              <Badge variant={previewVigente ? 'default' : 'secondary'}>
                {previewVigente ? 'Vista previa vigente' : 'Requiere actualizar'}
              </Badge>
            </div>

            <div className="space-y-2">
              {preview.pasos.map((paso, index) => (
                <div
                  key={paso.transicionCodigo}
                  className="flex items-center gap-3 rounded-md border bg-background px-3 py-2"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{paso.transicionEtiqueta}</p>
                    <p className="text-xs text-muted-foreground">
                      Consolidado: {ENVIO_CONSOLIDADO_ESTADO_UI[paso.estadoResultante].label}
                      {' · '}Paquetes: {paso.estadoAplicadoPaquetes.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(paso.fecha).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline">{paso.tipo === 'RECOMENDADA' ? 'Recomendada' : 'Requerida'}</Badge>
                </div>
              ))}
            </div>

            <Accordion type="single" collapsible>
              <AccordionItem value="fechas" className="border-none">
                <AccordionTrigger className="py-2">
                  <span className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    Personalizar fechas por transición
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {preview.pasos.map((paso) => (
                      <div key={paso.transicionCodigo} className="space-y-1.5">
                        <Label htmlFor={`fecha-paso-${paso.transicionCodigo}`}>
                          {paso.transicionEtiqueta}
                        </Label>
                        <Input
                          id={`fecha-paso-${paso.transicionCodigo}`}
                          type="datetime-local"
                          max={ahoraLocalInput()}
                          value={fechasPorTransicion[paso.transicionCodigo] ?? fechaPrincipal}
                          onChange={(event) => {
                            setFechasPorTransicion((actuales) => ({
                              ...actuales,
                              [paso.transicionCodigo]: event.target.value,
                            }));
                            invalidarPreview();
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  {fechasInvalidas && (
                    <p className="mt-3 text-xs text-destructive">
                      Las fechas no pueden ser futuras y deben avanzar en orden cronológico.
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="grid gap-2 sm:grid-cols-2">
              {preview.consolidados.map((envio) => (
                <div key={envio.id} className="rounded-md border bg-background p-3">
                  <p className="truncate text-sm font-medium">{envio.codigo}</p>
                  <p className="text-xs text-muted-foreground">
                    {envio.totalPaquetes} paquete(s) ·{' '}
                    {ENVIO_CONSOLIDADO_ESTADO_UI[envio.estadoOperativoActual].label} →{' '}
                    {ENVIO_CONSOLIDADO_ESTADO_UI[envio.estadoOperativoFinal].label}
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
              fechasInvalidas ||
              aplicarMutation.isPending ||
              previewMutation.isPending
            }
          >
            {aplicarMutation.isPending
              ? 'Aplicando secuencia...'
              : `Aplicar ${preview?.resumen.totalPasos ?? 0} paso(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
