import { useEffect, useMemo, useState } from 'react';
import { FastForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AplicarEstadoMasivoDialog } from '@/components/AplicarEstadoMasivoDialog';
import {
  ResultadoBulkDialog,
  type ResultadoBulkRechazo,
} from '@/components/ResultadoBulkDialog';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { notify } from '@/lib/notify';
import {
  useAplicarEstadoEnConsolidados,
  useAplicarTransicionConsolidados,
  useCandidatosAvanceEstados,
  useElegiblesParaEstadoRastreoConsolidados,
  useEstadosAplicablesConsolidados,
  useEstadosDestinoSecuenciaConsolidados,
} from '@/hooks/useEnviosConsolidados';
import type { EnvioConsolidado, EstadoEnvioConsolidadoOperativo } from '@/types/envio-consolidado';
import { EnvioConsolidadoBadge, ENVIO_CONSOLIDADO_ESTADO_UI, resolveEstadoOperativoConsolidado } from './EnvioConsolidadoBadge';
import { AvanceEstadosConsolidadosDialog } from './AvanceEstadosConsolidadosDialog';

type TipoAccionMasiva = 'operativa' | 'rastreo';
type TransicionOperativa =
  | 'CERRADO'
  | 'ENVIADO_DESDE_USA'
  | 'ARRIBADO_ECUADOR'
  | 'EN_PREPARACION'
  | 'CANCELADO';

const OPERATIVO_FUENTE: Record<TransicionOperativa, EstadoEnvioConsolidadoOperativo[]> = {
  CERRADO: ['EN_PREPARACION'],
  ENVIADO_DESDE_USA: ['CERRADO'],
  ARRIBADO_ECUADOR: ['ENVIADO_DESDE_USA'],
  EN_PREPARACION: ['CERRADO', 'ENVIADO_DESDE_USA'],
  CANCELADO: [
    'EN_PREPARACION',
    'CERRADO',
    'ENVIADO_DESDE_USA',
    'ARRIBADO_ECUADOR',
    'RECIBIDO_EN_BODEGA',
  ],
};

interface Props {
  open: boolean;
  consolidados: EnvioConsolidado[];
  seleccionInicial: number[];
  consolidadosLoading: boolean;
  consolidadosError: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AplicarEstadoConsolidadosMenuDialog({
  open,
  consolidados,
  seleccionInicial,
  consolidadosLoading,
  consolidadosError,
  onOpenChange,
}: Props) {
  const [tipoAccion, setTipoAccion] = useState<TipoAccionMasiva>('operativa');
  const [avanceAutomatico, setAvanceAutomatico] = useState(false);
  const [estadoOperativo, setEstadoOperativo] = useState<TransicionOperativa | null>(null);
  const [estadoRastreoId, setEstadoRastreoId] = useState<number | null>(null);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [resultado, setResultado] = useState<{
    accionLabel: string;
    procesadas: number;
    rechazados: ResultadoBulkRechazo[];
  } | null>(null);

  const transicionMutation = useAplicarTransicionConsolidados();
  const estadoMutation = useAplicarEstadoEnConsolidados();
  const { data: estadosAplicables = [] } = useEstadosAplicablesConsolidados(
    open && tipoAccion === 'rastreo' && !avanceAutomatico,
  );
  const { data: elegiblesEstadoRastreo } = useElegiblesParaEstadoRastreoConsolidados(
    estadoRastreoId,
    open && tipoAccion === 'rastreo' && !avanceAutomatico,
  );
  const {
    data: estadosDestino = [],
    isLoading: estadosDestinoLoading,
    isError: estadosDestinoError,
  } = useEstadosDestinoSecuenciaConsolidados(open && avanceAutomatico);
  const {
    data: candidatosAvance = [],
    isLoading: candidatosAvanceLoading,
    isError: candidatosAvanceError,
  } = useCandidatosAvanceEstados(open && avanceAutomatico);
  const seleccionInicialAvance = useMemo(() => {
    const idsCandidatos = new Set(candidatosAvance.map((envio) => envio.id));
    return (seleccionados.length > 0 ? seleccionados : seleccionInicial).filter(
      (id) => idsCandidatos.has(id),
    );
  }, [candidatosAvance, seleccionInicial, seleccionados]);

  useEffect(() => {
    if (!open) return;
    setTipoAccion('operativa');
    setAvanceAutomatico(false);
    setEstadoOperativo(null);
    setEstadoRastreoId(null);
    setSeleccionados(seleccionInicial);
  }, [open, seleccionInicial]);

  const opciones = useMemo(() => {
    if (tipoAccion === 'operativa') {
      return [
        { value: 'CERRADO', label: 'Cerrar envío' },
        { value: 'ENVIADO_DESDE_USA', label: 'Enviar desde USA' },
        { value: 'ARRIBADO_ECUADOR', label: 'Arribar a Ecuador' },
        { value: 'EN_PREPARACION', label: 'Reabrir (En preparación)' },
        { value: 'CANCELADO', label: 'Cancelar envío' },
      ];
    }
    return estadosAplicables.map((estado) => ({
      value: String(estado.id),
      label: estado.nombre,
      meta: estado.tipoFlujo,
    }));
  }, [estadosAplicables, tipoAccion]);

  const opcionSeleccionada =
    tipoAccion === 'operativa'
      ? estadoOperativo ?? ''
      : estadoRastreoId != null
        ? String(estadoRastreoId)
        : '';

  const items = useMemo(() => {
    if (tipoAccion === 'operativa' && !estadoOperativo) return [];
    if (tipoAccion === 'rastreo' && (estadoRastreoId == null || elegiblesEstadoRastreo == null)) {
      return [];
    }
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
      if (tipoAccion === 'operativa' && estadoOperativo) {
        const origenes = OPERATIVO_FUENTE[estadoOperativo];
        if (!origenes.includes(operativo)) {
          disabledReason = `Estado actual: «${ENVIO_CONSOLIDADO_ESTADO_UI[operativo].label}» · esta transición requiere ${origenes
            .map((origen) => `«${ENVIO_CONSOLIDADO_ESTADO_UI[origen].label}»`)
            .join(' o ')}`;
        }
      } else if ((envio.totalPaquetes ?? 0) === 0) {
        disabledReason = 'No tiene paquetes';
      } else if (operativo === 'CANCELADO') {
        disabledReason = 'El envío está cancelado';
      } else if (!elegiblesIds.has(envio.id)) {
        disabledReason =
          'Sus paquetes no están en el estado de rastreo inmediatamente anterior';
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
              <EnvioConsolidadoBadge
                cerrado={envio.cerrado}
                estadoOperativo={operativo}
              />
            </div>
          ),
        };
      });
  }, [
    consolidados,
    elegiblesEstadoRastreo,
    estadoOperativo,
    estadoRastreoId,
    tipoAccion,
  ]);

  const ayuda =
    tipoAccion === 'operativa'
      ? estadoOperativo
        ? `Solo son elegibles los consolidados en ${OPERATIVO_FUENTE[estadoOperativo]
            .map((estado) => `«${ENVIO_CONSOLIDADO_ESTADO_UI[estado].label}»`)
            .join(' o ')}.`
        : 'Aplica una única transición administrativa al consolidado.'
      : estadoRastreoId
        ? 'Aplica un único estado de rastreo a todos los paquetes seleccionados.'
        : 'Selecciona un estado de rastreo para ver los consolidados elegibles.';

  function cambiarTipo(tipo: TipoAccionMasiva) {
    setTipoAccion(tipo);
    setEstadoOperativo(null);
    setEstadoRastreoId(null);
    setSeleccionados([]);
  }

  function cambiarOpcion(value: string) {
    if (tipoAccion === 'operativa') {
      setEstadoOperativo((value || null) as TransicionOperativa | null);
    } else {
      setEstadoRastreoId(value ? Number(value) : null);
    }
    setSeleccionados([]);
  }

  function cerrar() {
    setAvanceAutomatico(false);
    onOpenChange(false);
  }

  async function confirmar() {
    if (tipoAccion === 'operativa') {
      if (!estadoOperativo) return;
      try {
        const respuesta = await transicionMutation.mutateAsync({
          estadoOperativoDestino: estadoOperativo,
          consolidadoIds: seleccionados,
        });
        const accionLabel =
          opciones.find((opcion) => opcion.value === estadoOperativo)?.label ??
          'Transición operativa';
        if (respuesta.rechazados.length > 0) {
          setResultado({
            accionLabel,
            procesadas: respuesta.consolidadosProcesados,
            rechazados: respuesta.rechazados.map((item) => ({
              codigo: item.codigo,
              motivo: item.motivo,
            })),
          });
        } else {
          notify.success(
            'Transición aplicada',
            `${respuesta.consolidadosProcesados} envío(s) consolidado(s) actualizado(s).`,
          );
        }
        cerrar();
      } catch (error: unknown) {
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

  const headerExtra = (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tipo de acción masiva
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            size="sm"
            variant={tipoAccion === 'operativa' ? 'default' : 'outline'}
            onClick={() => cambiarTipo('operativa')}
          >
            Estado operativo del consolidado
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tipoAccion === 'rastreo' ? 'default' : 'outline'}
            onClick={() => cambiarTipo('rastreo')}
          >
            Estado de rastreo de paquetes
          </Button>
        </div>
      </div>

      {tipoAccion === 'operativa' && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium">Avance automático por varios estados</p>
              <p className="text-xs text-muted-foreground">
                Aplica todos los pasos intermedios con vista previa y fechas.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setAvanceAutomatico(true)}
            >
              <FastForward className="mr-2 h-4 w-4" />
              Abrir avance automático
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <AplicarEstadoMasivoDialog
        open={open && !avanceAutomatico}
        title="Aplicar estado a consolidados"
        description={
          tipoAccion === 'operativa'
            ? 'Selecciona una transición directa o abre el avance automático por varios estados.'
            : 'Aplica un estado de rastreo a los paquetes de los consolidados seleccionados.'
        }
        selectionLabel="consolidados"
        searchPlaceholder="Buscar consolidado..."
        items={items}
        selectedIds={seleccionados}
        onSelectedIdsChange={setSeleccionados}
        options={opciones}
        selectedOption={opcionSeleccionada}
        onSelectedOptionChange={cambiarOpcion}
        optionLabel={
          tipoAccion === 'operativa'
            ? 'Transición operativa directa'
            : 'Estado de rastreo de paquetes'
        }
        optionHelp={ayuda}
        headerExtra={headerExtra}
        loading={
          transicionMutation.isPending ||
          estadoMutation.isPending ||
          consolidadosLoading ||
          consolidadosError
        }
        onOpenChange={(next) => {
          if (!next && !avanceAutomatico) cerrar();
        }}
        onConfirm={confirmar}
      />

      <AvanceEstadosConsolidadosDialog
        open={open && avanceAutomatico}
        consolidados={candidatosAvance}
        seleccionInicial={seleccionInicialAvance}
        estadosDestino={estadosDestino}
        consolidadosLoading={candidatosAvanceLoading}
        consolidadosError={candidatosAvanceError}
        estadosLoading={estadosDestinoLoading}
        estadosError={estadosDestinoError}
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
