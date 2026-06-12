import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, FastForward, Layers, type LucideIcon } from 'lucide-react';
import { AplicarEstadoMasivoDialog } from '@/components/AplicarEstadoMasivoDialog';
import {
  ResultadoBulkDialog,
  type ResultadoBulkRechazo,
} from '@/components/ResultadoBulkDialog';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
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

/** Modos de "Aplicar estado": tres formas peer de mover un consolidado. */
type ModoAplicar = 'operativa' | 'avance' | 'rastreo';

type TransicionOperativa =
  | 'CERRADO'
  | 'ENVIADO_DESDE_USA'
  | 'ARRIBADO_ECUADOR'
  | 'EN_PREPARACION'
  | 'CANCELADO';

/**
 * Estado(s) de origen admitidos para cada transición operativa manual.
 * Fuente única de la regla en el frontend (el backend revalida).
 */
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

const OPCIONES_OPERATIVAS: Array<{ value: TransicionOperativa; label: string }> = [
  { value: 'CERRADO', label: 'Cerrar envío' },
  { value: 'ENVIADO_DESDE_USA', label: 'Enviar desde USA' },
  { value: 'ARRIBADO_ECUADOR', label: 'Arribar a Ecuador' },
  { value: 'EN_PREPARACION', label: 'Reabrir (En preparación)' },
  { value: 'CANCELADO', label: 'Cancelar envío' },
];

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
  const [estadoOperativo, setEstadoOperativo] = useState<TransicionOperativa | null>(null);
  const [estadoRastreoId, setEstadoRastreoId] = useState<number | null>(null);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [resultado, setResultado] = useState<{
    accionLabel: string;
    procesadas: number;
    rechazados: ResultadoBulkRechazo[];
  } | null>(null);

  const esAvance = modo === 'avance';
  const transicionMutation = useAplicarTransicionConsolidados();
  const estadoMutation = useAplicarEstadoEnConsolidados();
  const { data: estadosAplicables = [] } = useEstadosAplicablesConsolidados(
    open && modo === 'rastreo',
  );
  const { data: elegiblesEstadoRastreo } = useElegiblesParaEstadoRastreoConsolidados(
    estadoRastreoId,
    open && modo === 'rastreo',
  );
  const {
    data: estadosDestino = [],
    isLoading: estadosDestinoLoading,
    isError: estadosDestinoError,
  } = useEstadosDestinoSecuenciaConsolidados(open && esAvance);
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
  }, [open, seleccionInicial]);

  const opciones = useMemo(() => {
    if (modo === 'operativa') {
      return OPCIONES_OPERATIVAS.map((opcion) => ({ value: opcion.value, label: opcion.label }));
    }
    if (modo === 'rastreo') {
      return estadosAplicables.map((estado) => ({
        value: String(estado.id),
        label: estado.nombre,
        meta: estado.tipoFlujo,
      }));
    }
    return [];
  }, [estadosAplicables, modo]);

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
          const origenes = OPERATIVO_FUENTE[estadoOperativo];
          if (!origenes.includes(operativo)) {
            disabledReason = `Estado actual: «${ENVIO_CONSOLIDADO_ESTADO_UI[operativo].label}» · esta transición requiere ${origenes
              .map((origen) => `«${ENVIO_CONSOLIDADO_ESTADO_UI[origen].label}»`)
              .join(' o ')}`;
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
  }, [consolidados, elegiblesEstadoRastreo, esAvance, estadoOperativo, estadoRastreoId, modo]);

  const ayuda =
    modo === 'operativa'
      ? estadoOperativo
        ? `Solo son elegibles los consolidados en ${OPERATIVO_FUENTE[estadoOperativo]
            .map((estado) => `«${ENVIO_CONSOLIDADO_ESTADO_UI[estado].label}»`)
            .join(' o ')}.`
        : 'Aplica una única transición administrativa al consolidado.'
      : estadoRastreoId
        ? 'Aplica un único estado de rastreo a todos los paquetes seleccionados.'
        : 'Selecciona un estado de rastreo para ver los consolidados elegibles.';

  function cambiarModo(siguiente: ModoAplicar) {
    setModo(siguiente);
    setEstadoOperativo(null);
    setEstadoRastreoId(null);
    setSeleccionados([]);
  }

  function cambiarOpcion(value: string) {
    if (modo === 'operativa') {
      setEstadoOperativo((value || null) as TransicionOperativa | null);
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
      if (!estadoOperativo) return;
      try {
        const respuesta = await transicionMutation.mutateAsync({
          estadoOperativoDestino: estadoOperativo,
          consolidadoIds: seleccionados,
        });
        const accionLabel =
          OPCIONES_OPERATIVAS.find((opcion) => opcion.value === estadoOperativo)?.label ??
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

  const selector = <SelectorModo modo={modo} onModoChange={cambiarModo} />;

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
        onSelectedIdsChange={setSeleccionados}
        options={opciones}
        selectedOption={opcionSeleccionada}
        onSelectedOptionChange={cambiarOpcion}
        optionLabel={
          modo === 'operativa' ? 'Transición operativa' : 'Estado de rastreo de paquetes'
        }
        optionHelp={ayuda}
        headerExtra={selector}
        loading={
          transicionMutation.isPending ||
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
