import { useEffect, useMemo, useState } from 'react';
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
} from '@/lib/api/envios-consolidados.service';
import { localDateTimeInputToApi } from '@/lib/datetime-local';
import {
  useAplicarAvanceEstadosConsolidados,
  usePreviewAvanceEstadosConsolidados,
} from '@/hooks/useEnviosConsolidados';
import { cn } from '@/lib/utils';
import type { EnvioConsolidado } from '@/types/envio-consolidado';
import type { EstadoRastreo } from '@/types/estado-rastreo';
import { EnvioConsolidadoBadge, ENVIO_CONSOLIDADO_ESTADO_UI } from './EnvioConsolidadoBadge';

interface AvanceEstadosConsolidadosDialogProps {
  open: boolean;
  consolidados: EnvioConsolidado[];
  seleccionInicial: number[];
  estadosDestino: EstadoRastreo[];
  consolidadosLoading: boolean;
  consolidadosError: boolean;
  estadosLoading: boolean;
  estadosError: boolean;
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

const ESTADOS_VALIDOS_AVANCE = new Set([
  'EN_PREPARACION',
  'CERRADO',
  'ENVIADO_DESDE_USA',
  'ARRIBADO_ECUADOR',
  'RECIBIDO_EN_BODEGA',
]);

export function esCandidatoAvanceEstados(envio: EnvioConsolidado): boolean {
  return (
    (envio.totalPaquetes ?? 0) > 0 &&
    envio.estadoOperativo != null &&
    ESTADOS_VALIDOS_AVANCE.has(envio.estadoOperativo)
  );
}

export function AvanceEstadosConsolidadosDialog({
  open,
  consolidados,
  seleccionInicial,
  estadosDestino,
  consolidadosLoading,
  consolidadosError,
  estadosLoading,
  estadosError,
  onOpenChange,
}: AvanceEstadosConsolidadosDialogProps) {
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [estadoFinalId, setEstadoFinalId] = useState<number | null>(null);
  const [fechaPrincipal, setFechaPrincipal] = useState(ahoraLocalInput);
  const [fechasPorEstado, setFechasPorEstado] = useState<Record<number, string>>({});
  const [busqueda, setBusqueda] = useState('');
  const [preview, setPreview] = useState<AvanceEstadosConsolidadosPreview | null>(null);
  const [previewVigente, setPreviewVigente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewMutation = usePreviewAvanceEstadosConsolidados();
  const aplicarMutation = useAplicarAvanceEstadosConsolidados();

  useEffect(() => {
    if (!open) return;
    setSeleccionados(seleccionInicial);
    setEstadoFinalId(null);
    setFechaPrincipal(ahoraLocalInput());
    setFechasPorEstado({});
    setBusqueda('');
    setPreview(null);
    setPreviewVigente(false);
    setError(null);
    previewMutation.reset();
    aplicarMutation.reset();
  }, [open, seleccionInicial]);

  const visibles = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    return consolidados.filter(
      (envio) =>
        esCandidatoAvanceEstados(envio) &&
        (!query || envio.codigo.toLowerCase().includes(query)),
    );
  }, [busqueda, consolidados]);
  const seleccion = useMemo(() => new Set(seleccionados), [seleccionados]);
  const todosVisibles =
    visibles.length > 0 && visibles.every((envio) => seleccion.has(envio.id));

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
      const idsVisibles = new Set(visibles.map((envio) => envio.id));
      setSeleccionados((actuales) => actuales.filter((id) => !idsVisibles.has(id)));
    } else {
      setSeleccionados((actuales) =>
        Array.from(new Set([...actuales, ...visibles.map((envio) => envio.id)])),
      );
    }
    invalidarPreview();
  }

  function construirPayload(previewToken?: string): AvanceEstadosConsolidadosPayload | null {
    if (!estadoFinalId || seleccionados.length === 0 || !fechaPrincipal) return null;
    const fechaApi = localDateTimeInputToApi(fechaPrincipal);
    if (!fechaApi) return null;
    const fechas = Object.fromEntries(
      Object.entries(fechasPorEstado)
        .filter(([, value]) => Boolean(value))
        .map(([id, value]) => [Number(id), localDateTimeInputToApi(value) as string]),
    );
    return {
      consolidadoIds: seleccionados,
      estadoFinalId,
      fechaPrincipal: fechaApi,
      fechasPorEstado: Object.keys(fechas).length > 0 ? fechas : undefined,
      previewToken,
    };
  }

  async function generarPreview() {
    const payload = construirPayload();
    if (!payload) {
      setError('Selecciona al menos un consolidado, un estado final y una fecha principal.');
      return;
    }
    setError(null);
    try {
      const resultado = await previewMutation.mutateAsync(payload);
      setPreview(resultado);
      setPreviewVigente(true);
      setFechasPorEstado((actuales) => {
        const siguientes = { ...actuales };
        for (const paso of resultado.pasos) {
          if (!siguientes[paso.estadoId]) siguientes[paso.estadoId] = fechaInput(paso.fecha);
        }
        return siguientes;
      });
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
        `${resultado.estadoFinalNombre} aplicado a ${resultado.consolidadosProcesados} consolidado(s) y ${resultado.paquetesProcesados} paquete(s).`,
      );
      onOpenChange(false);
    } catch (err: unknown) {
      if (getApiStatus(err) === 409) {
        setPreviewVigente(false);
        setError('Los datos cambiaron. Genera nuevamente la vista previa antes de aplicar.');
      } else {
        setError(getApiErrorMessage(err) ?? 'No se pudo aplicar la secuencia de estados.');
      }
    }
  }

  const fechasInvalidas = useMemo(() => {
    if (!preview) return false;
    let anterior = '';
    for (const paso of preview.pasos) {
      const fecha = fechasPorEstado[paso.estadoId] || fechaPrincipal;
      if (!fecha || fecha > ahoraLocalInput() || (anterior && fecha < anterior)) return true;
      anterior = fecha;
    }
    return false;
  }, [fechaPrincipal, fechasPorEstado, preview]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Avanzar estados de consolidados
          </DialogTitle>
          <DialogDescription>
            Calcula y aplica todos los estados activos intermedios a los paquetes, junto con
            sus efectos operativos en el consolidado.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Operación atómica</AlertTitle>
          <AlertDescription>
            Todos los consolidados deben compartir el mismo estado inicial. Si falla un paso,
            no se guarda ningún cambio.
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
              <Button type="button" variant="outline" size="sm" onClick={toggleVisibles}>
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
                  {visibles.map((envio) => (
                    <li key={envio.id}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-center gap-3 px-3 py-2.5',
                          seleccion.has(envio.id) && 'bg-primary/5',
                        )}
                      >
                        <Checkbox
                          checked={seleccion.has(envio.id)}
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
              <Label htmlFor="estado-final-secuencia">Avanzar hasta</Label>
              <Select
                value={estadoFinalId ? String(estadoFinalId) : ''}
                onValueChange={(value) => {
                  setEstadoFinalId(Number(value));
                  setFechasPorEstado({});
                  invalidarPreview();
                }}
                disabled={estadosLoading || estadosError}
              >
                <SelectTrigger id="estado-final-secuencia">
                  <SelectValue
                    placeholder={estadosLoading ? 'Cargando estados...' : 'Selecciona un estado'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {estadosDestino.map((estado) => (
                    <SelectItem key={estado.id} value={String(estado.id)}>
                      {estado.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {estadosError && (
                <p className="text-xs text-destructive">No se pudieron cargar los estados.</p>
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
                  setFechasPorEstado({});
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
                estadosLoading ||
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
                  {preview.estadoInicial.nombre} → {preview.estadoFinal.nombre}
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
                  key={paso.estadoId}
                  className="flex items-center gap-3 rounded-md border bg-background px-3 py-2"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{paso.estadoNombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(paso.fecha).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {paso.efectoOperativo
                      ? ENVIO_CONSOLIDADO_ESTADO_UI[paso.efectoOperativo].label
                      : 'Paso obligatorio'}
                  </Badge>
                </div>
              ))}
            </div>

            <Accordion type="single" collapsible>
              <AccordionItem value="fechas" className="border-none">
                <AccordionTrigger className="py-2">
                  <span className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    Personalizar fechas por estado
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {preview.pasos.map((paso) => (
                      <div key={paso.estadoId} className="space-y-1.5">
                        <Label htmlFor={`fecha-paso-${paso.estadoId}`}>
                          {paso.estadoNombre}
                        </Label>
                        <Input
                          id={`fecha-paso-${paso.estadoId}`}
                          type="datetime-local"
                          max={ahoraLocalInput()}
                          value={fechasPorEstado[paso.estadoId] ?? fechaPrincipal}
                          onChange={(event) => {
                            setFechasPorEstado((actuales) => ({
                              ...actuales,
                              [paso.estadoId]: event.target.value,
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
