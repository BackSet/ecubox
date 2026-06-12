import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  agregarPaquetesEnvioConsolidado,
  aplicarAvanceEstadosConsolidados,
  aplicarEstadoEnConsolidados,
  aplicarTransicionConsolidados,
  crearEnvioConsolidado,
  descargarManifiestoPdf,
  descargarManifiestoXlsx,
  eliminarEnvioConsolidado,
  enviarDesdeUsaEnvioConsolidado,
  getElegiblesParaEstadoRastreo,
  getEstadosAplicablesConsolidados,
  getEstadosDestinoSecuenciaConsolidados,
  listarEnviosConsolidados,
  listarTodosEnviosConsolidados,
  listarEnviosDisponiblesParaRecepcion,
  obtenerResumenEnviosConsolidados,
  obtenerEnvioConsolidado,
  previewAvanceEstadosConsolidados,
  reabrirEnvioConsolidado,
  removerPaquetesEnvioConsolidado,
  cerrarConsolidadoEnvioConsolidado,
  arribarEcuadorEnvioConsolidado,
  cancelarEnvioConsolidado,
  type ListarDisponiblesRecepcionParams,
  type ListarEnviosParams,
} from '@/lib/api/envios-consolidados.service';
import type {
  EnvioConsolidadoCreateRequest,
  EnvioConsolidadoPaquetesRequest,
} from '@/types/envio-consolidado';

export const ENVIOS_CONSOLIDADOS_QUERY_KEY = ['envios-consolidados'] as const;

export function useEnviosConsolidados(
  params: ListarEnviosParams = {},
  enabled = true
) {
  return useQuery({
    queryKey: [...ENVIOS_CONSOLIDADOS_QUERY_KEY, 'list', params],
    queryFn: () => listarEnviosConsolidados(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useTodosEnviosConsolidados(enabled = true) {
  return useQuery({
    queryKey: [...ENVIOS_CONSOLIDADOS_QUERY_KEY, 'list-all'],
    queryFn: listarTodosEnviosConsolidados,
    enabled,
  });
}

/** Resumen liviano (KPIs/chips): conteo por estado operativo y por estado de pago. */
export function useEnvioConsolidadoResumen() {
  return useQuery({
    queryKey: [...ENVIOS_CONSOLIDADOS_QUERY_KEY, 'resumen'],
    queryFn: () => obtenerResumenEnviosConsolidados(),
    placeholderData: keepPreviousData,
  });
}

/**
 * Lista los envíos consolidados elegibles para crearse o agregarse a un lote
 * de recepción. Incluye envíos enviados desde USA y/o pagados (la recepción física es
 * ortogonal al estado administrativo). El backend excluye los que ya están
 * en otro lote y los que no tienen paquetes.
 */
export function useEnviosDisponiblesParaRecepcion(
  params: ListarDisponiblesRecepcionParams = {},
  enabled = true
) {
  return useQuery({
    queryKey: [...ENVIOS_CONSOLIDADOS_QUERY_KEY, 'disponibles-recepcion', params],
    queryFn: () => listarEnviosDisponiblesParaRecepcion(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useEnvioConsolidado(id: number | null | undefined) {
  return useQuery({
    queryKey: [...ENVIOS_CONSOLIDADOS_QUERY_KEY, 'detail', id],
    queryFn: () => obtenerEnvioConsolidado(id as number),
    enabled: id != null,
  });
}

export function useCrearEnvioConsolidado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: EnvioConsolidadoCreateRequest) => crearEnvioConsolidado(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ENVIOS_CONSOLIDADOS_QUERY_KEY });
    },
  });
}

export function useCerrarConsolidadoEnvioConsolidado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cerrarConsolidadoEnvioConsolidado(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ENVIOS_CONSOLIDADOS_QUERY_KEY });
      qc.invalidateQueries({
        queryKey: [...ENVIOS_CONSOLIDADOS_QUERY_KEY, 'detail', id],
      });
    },
  });
}

export function useEnviarDesdeUsaEnvioConsolidado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => enviarDesdeUsaEnvioConsolidado(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ENVIOS_CONSOLIDADOS_QUERY_KEY });
      qc.invalidateQueries({
        queryKey: [...ENVIOS_CONSOLIDADOS_QUERY_KEY, 'detail', id],
      });
    },
  });
}

export function useArribarEcuadorEnvioConsolidado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => arribarEcuadorEnvioConsolidado(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ENVIOS_CONSOLIDADOS_QUERY_KEY });
      qc.invalidateQueries({
        queryKey: [...ENVIOS_CONSOLIDADOS_QUERY_KEY, 'detail', id],
      });
    },
  });
}

export function useCancelarEnvioConsolidado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cancelarEnvioConsolidado(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ENVIOS_CONSOLIDADOS_QUERY_KEY });
      qc.invalidateQueries({
        queryKey: [...ENVIOS_CONSOLIDADOS_QUERY_KEY, 'detail', id],
      });
    },
  });
}

export function useAplicarEstadoEnConsolidados() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: aplicarEstadoEnConsolidados,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ENVIOS_CONSOLIDADOS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['paquetes'] });
      qc.invalidateQueries({ queryKey: ['operario', 'paquetes'] });
    },
  });
}

export function useEstadosAplicablesConsolidados(enabled = true) {
  return useQuery({
    queryKey: [...ENVIOS_CONSOLIDADOS_QUERY_KEY, 'estados-aplicables'],
    queryFn: getEstadosAplicablesConsolidados,
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useEstadosDestinoSecuenciaConsolidados(enabled = true) {
  return useQuery({
    queryKey: [...ENVIOS_CONSOLIDADOS_QUERY_KEY, 'estados-destino-secuencia'],
    queryFn: getEstadosDestinoSecuenciaConsolidados,
    enabled,
  });
}

export function usePreviewAvanceEstadosConsolidados() {
  return useMutation({
    mutationFn: previewAvanceEstadosConsolidados,
  });
}

export function useAplicarAvanceEstadosConsolidados() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: aplicarAvanceEstadosConsolidados,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ENVIOS_CONSOLIDADOS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['paquetes'] });
      qc.invalidateQueries({ queryKey: ['operario', 'paquetes'] });
      qc.invalidateQueries({ queryKey: ['tracking-events'] });
    },
  });
}

/**
 * Ids de consolidados elegibles para aplicar `estadoRastreoId` a sus paquetes
 * (regla de "ir de 1 en 1"). `estadoRastreoId` es `null` mientras no se haya
 * seleccionado un estado.
 */
export function useElegiblesParaEstadoRastreoConsolidados(estadoRastreoId: number | null, enabled = true) {
  return useQuery({
    queryKey: [...ENVIOS_CONSOLIDADOS_QUERY_KEY, 'elegibles-para-estado-rastreo', estadoRastreoId],
    queryFn: () => getElegiblesParaEstadoRastreo(estadoRastreoId as number),
    enabled: enabled && estadoRastreoId != null,
    staleTime: 0,
  });
}

export function useAplicarTransicionConsolidados() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: aplicarTransicionConsolidados,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ENVIOS_CONSOLIDADOS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['paquetes'] });
      qc.invalidateQueries({ queryKey: ['operario', 'paquetes'] });
    },
  });
}

export function useReabrirEnvioConsolidado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reabrirEnvioConsolidado(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ENVIOS_CONSOLIDADOS_QUERY_KEY });
      qc.invalidateQueries({
        queryKey: [...ENVIOS_CONSOLIDADOS_QUERY_KEY, 'detail', id],
      });
    },
  });
}

export function useEliminarEnvioConsolidado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, eliminarPaquetes = false }: { id: number; eliminarPaquetes?: boolean }) =>
      eliminarEnvioConsolidado(id, eliminarPaquetes),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ENVIOS_CONSOLIDADOS_QUERY_KEY });
      qc.removeQueries({
        queryKey: [...ENVIOS_CONSOLIDADOS_QUERY_KEY, 'detail', vars.id],
      });
      if (vars.eliminarPaquetes) {
        qc.invalidateQueries({ queryKey: ['paquetes'] });
        qc.invalidateQueries({ queryKey: ['operario', 'paquetes'] });
      }
    },
  });
}

export function useAgregarPaquetesEnvioConsolidado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: EnvioConsolidadoPaquetesRequest }) =>
      agregarPaquetesEnvioConsolidado(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ENVIOS_CONSOLIDADOS_QUERY_KEY });
      qc.invalidateQueries({
        queryKey: [...ENVIOS_CONSOLIDADOS_QUERY_KEY, 'detail', vars.id],
      });
    },
  });
}

export function useRemoverPaquetesEnvioConsolidado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: EnvioConsolidadoPaquetesRequest }) =>
      removerPaquetesEnvioConsolidado(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ENVIOS_CONSOLIDADOS_QUERY_KEY });
      qc.invalidateQueries({
        queryKey: [...ENVIOS_CONSOLIDADOS_QUERY_KEY, 'detail', vars.id],
      });
    },
  });
}

export function useDescargarManifiesto() {
  return {
    pdf: useMutation({
      mutationFn: (id: number) => descargarManifiestoPdf(id),
    }),
    xlsx: useMutation({
      mutationFn: (id: number) => descargarManifiestoXlsx(id),
    }),
  };
}
