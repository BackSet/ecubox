import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, FastForward, Layers, type LucideIcon } from 'lucide-react';
import { AplicarEstadoMasivoDialog } from '@/components/AplicarEstadoMasivoDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  ResultadoBulkDialog,
  type ResultadoBulkRechazo,
} from '@/components/ResultadoBulkDialog';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import {
  useAplicarEstadoEnConsolidados,
  useAplicarAvanceEstadosConsolidados,
  useCandidatosAvanceEstados,
  useElegiblesParaEstadoRastreoConsolidados,
  useEstadosAplicablesConsolidados,
  usePreviewAvanceEstadosConsolidados,
  useTransicionesOperativasConsolidados,
} from '@/hooks/useEnviosConsolidados';
import type { AvanceEstadosConsolidadosPreview } from '@/lib/api/envios-consolidados.service';
import { localDateTimeInputToApi } from '@/lib/datetime-local';
import type { EnvioConsolidado } from '@/types/envio-consolidado';
import { EnvioConsolidadoBadge, ENVIO_CONSOLIDADO_ESTADO_UI, resolveEstadoOperativoConsolidado } from './EnvioConsolidadoBadge';
import { AvanceEstadosConsolidadosDialog } from './AvanceEstadosConsolidadosDialog';

/** Modos de "Aplicar estado": tres formas peer de mover un consolidado. */
type ModoAplicar = 'operativa' | 'avance' | 'rastreo';

interface ModoDef {
  modo: ModoAplicar;
  titulo: string;
  descripcion: string;
  icon: LucideIcon;
}

const MODOS: ModoDef[] = [
  {
    modo: 'operativa',
    titulo: 'Transición operativa',
    descripcion: 'Un paso administrativo del consolidado.',
    icon: ArrowRightLeft,
  },
  {
    modo: 'avance',
    titulo: 'Avance automático',
    descripcion: 'Varios pasos con vista previa y fechas.',
    icon: FastForward,
  },
  {
    modo: 'rastreo',
    titulo: 'Estado de rastreo',
    descripcion: 'Un estado a los paquetes del consolidado.',
    icon: Layers,
  },
];

interface Props {
  open: boolean;
  consolidados: EnvioConsolidado[];
  seleccionInicial: number[];
  consolidadosLoading: boolean;
  consolidadosError: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Selector de modo compartido por los dos diálogos para que el flujo se sienta uno solo. */
function SelectorModo({
  modo,
  onModoChange,
}: {
  modo: ModoAplicar;
  onModoChange: (modo: ModoAplicar) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Tipo de acción">
      {MODOS.map((def) => {
        const activo = modo === def.modo;
        const Icon = def.icon;
        return (
          <button
            key={def.modo}
            type="button"
            onClick={() => onModoChange(def.modo)}
            aria-pressed={activo}
            className={cn(
              'flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors',
              activo
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border bg-card hover:bg-muted/40',
            )}
          >
            <span className="flex items-center gap-2">
              <Icon
                className={cn('h-4 w-4', activo ? 'text-primary' : 'text-muted-foreground')}
              />
              <span className="text-sm font-medium">{def.titulo}</span>
            </span>
            <span className="text-[11px] leading-snug text-muted-foreground">
              {def.descripcion}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AplicarEstadoConsolidadosMenuDialog({
  open,
  consolidados,
  seleccionInicial,
  consolidadosLoading,
  consolidadosError,
  onOpenChange,
}: Props) {
  const [modo, setModo] = useState<ModoAplicar>('operativa');
  const [estadoOperativo, setEstadoOperativo] = useState<string | null>(null);
  const [estadoRastreoId, setEstadoRastreoId] = useState<number | null>(null);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [resultado, setResultado] = useState<{
    accionLabel: string;
    procesadas: number;
    rechazados: ResultadoBulkRechazo[];
  } | null>(null);
  const [previewOperativa, setPreviewOperativa] =
    useState<AvanceEstadosConsolidadosPreview | null>(null);
  const [previewOperativaError, setPreviewOperativaError] = useState<string | null>(null);

  const esAvance = modo === 'avance';
  const previewOperativaMutation = usePreviewAvanceEstadosConsolidados();
  const aplicarOperativaMutation = useAplicarAvanceEstadosConsolidados();
  const estadoMutation = useAplicarEstadoEnConsolidados();
  const { data: estadosAplicables = [] } = useEstadosAplicablesConsolidados(
    open && modo === 'rastreo',
  );
  const { data: elegiblesEstadoRastreo } = useElegiblesParaEstadoRastreoConsolidados(
    estadoRastreoId,
    open && modo === 'rastreo',
  );
  const {
    data: transiciones = [],
    isLoading: transicionesLoading,
    isError: transicionesError,
  } = useTransicionesOperativasConsolidados(open);
  const {
    data: candidatosAvance = [],
    isLoading: candidatosAvanceLoading,
    isError: candidatosAvanceError,
  } = useCandidatosAvanceEstados(open && esAvance);
  const seleccionInicialAvance = useMemo(() => {
    const idsCandidatos = new Set(candidatosAvance.map((envio) => envio.id));
    return (seleccionados.length > 0 ? seleccionados : seleccionInicial).filter(
      (id) => idsCandidatos.has(id),
    );
  }, [candidatosAvance, seleccionInicial, seleccionados]);

  useEffect(() => {
    if (!open) return;
    setModo('operativa');
    setEstadoOperativo(null);
    setEstadoRastreoId(null);
    setSeleccionados(seleccionInicial);
    setPreviewOperativa(null);
    setPreviewOperativaError(null);
  }, [open, seleccionInicial]);

  const opciones = useMemo(() => {
    if (modo === 'operativa') {
      return transiciones.map((transicion) => ({
        value: transicion.codigo,
        label: transicion.etiqueta,
        meta: transicion.disponible ? undefined : 'No disponible',
      }));
    }
    if (modo === 'rastreo') {
      return estadosAplicables.map((estado) => ({
        value: String(estado.id),
        label: estado.nombre,
        meta: estado.tipoFlujo,
      }));
    }
    return [];
  }, [estadosAplicables, modo, transiciones]);

  const opcionSeleccionada =
    modo === 'operativa'
      ? estadoOperativo ?? ''
      : modo === 'rastreo' && estadoRastreoId != null
        ? String(estadoRastreoId)
        : '';

  const items = useMemo(() => {
    if (modo === 'operativa' && !estadoOperativo) return [];
    if (modo === 'rastreo' && (estadoRastreoId == null || elegiblesEstadoRastreo == null)) {
      return [];
    }
    if (esAvance) return [];
    const elegiblesIds = new Set(elegiblesEstadoRastreo ?? []);
    return consolidados
      .filter(
        (envio) =>
          (envio.totalPaquetes ?? 0) > 0 &&
          envio.estadoOperativo != null &&
          envio.estadoOperativo !== 'VACIO',
      )
      .map((envio) => {
        const operativo = resolveEstadoOperativoConsolidado(envio);
        let disabledReason: string | undefined;
        if (modo === 'operativa' && estadoOperativo) {
          const transicion = transiciones.find((item) => item.codigo === estadoOperativo);
          if (!transicion?.disponible) {
            disabledReason =
              transicion?.problemaConfiguracion ?? 'La transición tiene configuración incompleta';
          } else if (operativo !== transicion.estadoPrevioRequerido) {
            disabledReason = `Estado actual: «${ENVIO_CONSOLIDADO_ESTADO_UI[operativo].label}» · esta transición requiere «${ENVIO_CONSOLIDADO_ESTADO_UI[transicion.estadoPrevioRequerido].label}»`;
          }
        } else if (modo === 'rastreo') {
          if (operativo === 'CANCELADO') {
            disabledReason = 'El envío está cancelado';
          } else if (!elegiblesIds.has(envio.id)) {
            disabledReason =
              'Sus paquetes no están en el estado de rastreo inmediatamente anterior';
          }
        }
        return {
          id: envio.id,
          searchText: `${envio.codigo} estado:${operativo}`,
          disabledReason,
          content: (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{envio.codigo}</p>
                <p className="text-xs text-muted-foreground">
                  {envio.totalPaquetes ?? 0} paquete(s)
                  {envio.estadoPago === 'PAGADO' ? ' · Pagado' : ''}
                </p>
              </div>
              <EnvioConsolidadoBadge cerrado={envio.cerrado} estadoOperativo={operativo} />
            </div>
          ),
        };
      });
  }, [consolidados, elegiblesEstadoRastreo, esAvance, estadoOperativo, estadoRastreoId, modo, transiciones]);

  const ayuda =
    modo === 'operativa'
      ? estadoOperativo
        ? (() => {
            const transicion = transiciones.find((item) => item.codigo === estadoOperativo);
            return transicion
              ? `Requiere «${ENVIO_CONSOLIDADO_ESTADO_UI[transicion.estadoPrevioRequerido].label}» y aplica «${transicion.estadoAplicadoPaquetes?.nombre ?? 'sin configurar'}» a los paquetes.`
              : 'Selecciona una transición configurada.';
          })()
        : 'Aplica una única transición administrativa al consolidado.'
      : estadoRastreoId
        ? 'Aplica un único estado de rastreo a todos los paquetes seleccionados.'
        : 'Selecciona un estado de rastreo para ver los consolidados elegibles.';

  function cambiarModo(siguiente: ModoAplicar) {
    setModo(siguiente);
    setEstadoOperativo(null);
    setEstadoRastreoId(null);
    setSeleccionados([]);
    setPreviewOperativa(null);
    setPreviewOperativaError(null);
  }

  function cambiarOpcion(value: string) {
    if (modo === 'operativa') {
      setEstadoOperativo(value || null);
      setPreviewOperativa(null);
      setPreviewOperativaError(null);
    } else {
      setEstadoRastreoId(value ? Number(value) : null);
    }
    setSeleccionados([]);
  }

  function cerrar() {
    onOpenChange(false);
  }

  async function confirmar() {
    if (modo === 'operativa') {
      if (!estadoOperativo || !previewOperativa) return;
      try {
        const respuesta = await aplicarOperativaMutation.mutateAsync({
          consolidadoIds: seleccionados,
          transicionFinalCodigo: estadoOperativo,
          fechaPrincipal: previewOperativa.pasos[0]!.fecha,
          previewToken: previewOperativa.previewToken,
        });
        notify.success(
          'Transición aplicada',
          `${respuesta.consolidadosProcesados} envío(s) consolidado(s) y ${respuesta.paquetesProcesados} paquete(s) actualizados.`,
        );
        cerrar();
      } catch (error: unknown) {
        setPreviewOperativa(null);
        notify.error('No se pudo aplicar el estado operativo', getApiErrorMessage(error));
      }
      return;
    }

    if (estadoRastreoId == null) return;
    try {
      const respuesta = await estadoMutation.mutateAsync({
        consolidadoIds: seleccionados,
        estadoRastreoId,
      });
      const nombre = estadosAplicables.find((estado) => estado.id === estadoRastreoId)?.nombre;
      notify.success(
        nombre ? `Estado de rastreo aplicado: ${nombre}` : 'Estado de rastreo aplicado',
        `${respuesta.consolidadosProcesados} consolidado(s) · ${respuesta.paquetesActualizados} paquete(s).`,
      );
      cerrar();
    } catch (error: unknown) {
      notify.error('No se pudo aplicar el estado de rastreo', getApiErrorMessage(error));
    }
  }

  const selector = <SelectorModo modo={modo} onModoChange={cambiarModo} />;
  const transicionSeleccionada = transiciones.find(
    (transicion) => transicion.codigo === estadoOperativo,
  );

  async function generarPreviewOperativa() {
    if (!estadoOperativo || seleccionados.length === 0) return;
    setPreviewOperativaError(null);
    try {
      const fechaPrincipal = localDateTimeInputToApi(
        new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
          .toISOString()
          .slice(0, 16),
      );
      if (!fechaPrincipal) return;
      const preview = await previewOperativaMutation.mutateAsync({
        consolidadoIds: seleccionados,
        transicionFinalCodigo: estadoOperativo,
        fechaPrincipal,
      });
      setPreviewOperativa(preview);
    } catch (error: unknown) {
      setPreviewOperativa(null);
      setPreviewOperativaError(getApiErrorMessage(error) ?? 'No se pudo generar la vista previa.');
    }
  }

  const detalleOperativo =
    modo === 'operativa' && estadoOperativo ? (
      <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Estado resultante:</span>{' '}
            {transicionSeleccionada
              ? ENVIO_CONSOLIDADO_ESTADO_UI[transicionSeleccionada.estadoResultante].label
              : 'No disponible'}
          </p>
          <p>
            <span className="text-muted-foreground">Estado aplicado a paquetes:</span>{' '}
            {transicionSeleccionada?.estadoAplicadoPaquetes?.nombre ?? 'Sin configurar'}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={generarPreviewOperativa}
          disabled={
            seleccionados.length === 0 ||
            !transicionSeleccionada?.disponible ||
            previewOperativaMutation.isPending
          }
        >
          {previewOperativaMutation.isPending ? 'Validando...' : 'Generar vista previa'}
        </Button>
        {previewOperativa && (
          <Alert>
            <AlertTitle>Transición válida</AlertTitle>
            <AlertDescription>
              {previewOperativa.resumen.totalConsolidados} consolidado(s),{' '}
              {previewOperativa.resumen.totalPaquetes} paquete(s). Estado operativo actual:{' '}
              {previewOperativa.consolidados[0]
                ? ENVIO_CONSOLIDADO_ESTADO_UI[
                    previewOperativa.consolidados[0].estadoOperativoActual
                  ].label
                : 'No disponible'}.
            </AlertDescription>
          </Alert>
        )}
        {(previewOperativaError || transicionSeleccionada?.problemaConfiguracion) && (
          <Alert variant="destructive">
            <AlertTitle>No se puede aplicar</AlertTitle>
            <AlertDescription>
              {previewOperativaError ?? transicionSeleccionada?.problemaConfiguracion}
            </AlertDescription>
          </Alert>
        )}
      </div>
    ) : null;

  return (
    <>
      <AplicarEstadoMasivoDialog
        open={open && !esAvance}
        title="Aplicar estado a consolidados"
        description={
          modo === 'operativa'
            ? 'Mueve el consolidado un paso en su ciclo operativo.'
            : 'Aplica un estado de rastreo a los paquetes de los consolidados seleccionados.'
        }
        selectionLabel="consolidados"
        searchPlaceholder="Buscar consolidado..."
        items={items}
        selectedIds={seleccionados}
        onSelectedIdsChange={(ids) => {
          setSeleccionados(ids);
          setPreviewOperativa(null);
          setPreviewOperativaError(null);
        }}
        options={opciones}
        selectedOption={opcionSeleccionada}
        onSelectedOptionChange={cambiarOpcion}
        optionLabel={
          modo === 'operativa' ? 'Transición operativa' : 'Estado de rastreo de paquetes'
        }
        optionHelp={ayuda}
        headerExtra={selector}
        contentExtra={detalleOperativo}
        confirmDisabled={modo === 'operativa' && !previewOperativa}
        confirmLabel={modo === 'operativa' ? 'Aplicar transición' : 'Aplicar estado'}
        loading={
          aplicarOperativaMutation.isPending ||
          estadoMutation.isPending ||
          consolidadosLoading ||
          consolidadosError
        }
        onOpenChange={(next) => {
          if (!next && !esAvance) cerrar();
        }}
        onConfirm={confirmar}
      />

      <AvanceEstadosConsolidadosDialog
        open={open && esAvance}
        headerExtra={selector}
        consolidados={candidatosAvance}
        seleccionInicial={seleccionInicialAvance}
        transiciones={transiciones}
        consolidadosLoading={candidatosAvanceLoading}
        consolidadosError={candidatosAvanceError}
        transicionesLoading={transicionesLoading}
        transicionesError={transicionesError}
        onOpenChange={(next) => {
          if (!next) cerrar();
        }}
      />

      {resultado && (
        <ResultadoBulkDialog
          open
          onOpenChange={(next) => !next && setResultado(null)}
          accionLabel={resultado.accionLabel}
          unidadSingular="envío consolidado"
          unidadPlural="envíos consolidados"
          procesadas={resultado.procesadas}
          rechazados={resultado.rechazados}
        />
      )}
    </>
  );
}
