import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  actualizarConsolidadoLinea,
  actualizarDespachoLinea,
  actualizarHeaderLiquidacion,
  agregarConsolidadoLinea,
  agregarDespachoLinea,
  crearLiquidacion,
  eliminarConsolidadoLinea,
  eliminarDespachoLinea,
  eliminarLiquidacion,
  listarConsolidadosDisponibles,
  listarDespachosDisponibles,
  listarLiquidaciones,
  marcarLiquidacionNoPagada,
  marcarLiquidacionPagada,
  obtenerLiquidacion,
} from '@/lib/api/liquidacion.service';
import type {
  LiquidacionConsolidadoLineaRequest,
  LiquidacionCrearRequest,
  LiquidacionDespachoLineaRequest,
  LiquidacionHeaderRequest,
  LiquidacionListaParams,
} from '@/types/liquidacion';
import { ENVIOS_CONSOLIDADOS_QUERY_KEY } from '@/hooks/useEnviosConsolidados';
import { CONFIG_TARIFA_DISTRIBUCION_QUERY_KEY } from '@/hooks/useConfigTarifaDistribucion';

export const LIQUIDACION_QUERY_KEY = ['liquidaciones'] as const;

const listKey = (params: LiquidacionListaParams) =>
  [...LIQUIDACION_QUERY_KEY, 'list', params] as const;
const detailKey = (id: number) => [...LIQUIDACION_QUERY_KEY, 'detail', id] as const;
const consolidadosDisponiblesKey = (q: string | undefined, page: number, size: number) =>
  [...LIQUIDACION_QUERY_KEY, 'disponibles-consolidados', q ?? '', page, size] as const;
const despachosDisponiblesKey = (q: string | undefined, page: number, size: number) =>
  [...LIQUIDACION_QUERY_KEY, 'disponibles-despachos', q ?? '', page, size] as const;

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

export function useLiquidaciones(params: LiquidacionListaParams = {}) {
  return useQuery({
    queryKey: listKey(params),
    queryFn: () => listarLiquidaciones(params),
    placeholderData: (prev) => prev,
  });
}

export function useLiquidacion(id: number | null | undefined) {
  return useQuery({
    queryKey: detailKey(id as number),
    queryFn: () => obtenerLiquidacion(id as number),
    enabled: id != null,
  });
}

export function useConsolidadosDisponibles(q: string | undefined, page = 0, size = 20) {
  return useQuery({
    queryKey: consolidadosDisponiblesKey(q, page, size),
    queryFn: () => listarConsolidadosDisponibles(q, page, size),
    placeholderData: (prev) => prev,
  });
}

export function useDespachosDisponibles(q: string | undefined, page = 0, size = 20) {
  return useQuery({
    queryKey: despachosDisponiblesKey(q, page, size),
    queryFn: () => listarDespachosDisponibles(q, page, size),
    placeholderData: (prev) => prev,
  });
}

// ---------------------------------------------------------------------------
// Mutaciones
// ---------------------------------------------------------------------------

function invalidarTodo(qc: ReturnType<typeof useQueryClient>, id?: number) {
  qc.invalidateQueries({ queryKey: LIQUIDACION_QUERY_KEY });
  if (id != null) qc.invalidateQueries({ queryKey: detailKey(id) });
  qc.invalidateQueries({ queryKey: ENVIOS_CONSOLIDADOS_QUERY_KEY });
}

export function useCrearLiquidacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LiquidacionCrearRequest) => crearLiquidacion(body),
    onSuccess: (data) => invalidarTodo(qc, data.id),
  });
}

export function useActualizarHeaderLiquidacion(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LiquidacionHeaderRequest) => actualizarHeaderLiquidacion(id, body),
    onSuccess: () => invalidarTodo(qc, id),
  });
}

export function useEliminarLiquidacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => eliminarLiquidacion(id),
    onSuccess: () => invalidarTodo(qc),
  });
}

export function useMarcarLiquidacionPagada(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => marcarLiquidacionPagada(id),
    onSuccess: () => invalidarTodo(qc, id),
  });
}

export function useMarcarLiquidacionNoPagada(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => marcarLiquidacionNoPagada(id),
    onSuccess: () => invalidarTodo(qc, id),
  });
}

// --- Sección A ---

export function useAgregarConsolidadoLinea(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LiquidacionConsolidadoLineaRequest) =>
      agregarConsolidadoLinea(id, body),
    onSuccess: () => invalidarTodo(qc, id),
  });
}

export function useActualizarConsolidadoLinea(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      lineaId,
      body,
    }: {
      lineaId: number;
      body: LiquidacionConsolidadoLineaRequest;
    }) => actualizarConsolidadoLinea(id, lineaId, body),
    onSuccess: () => invalidarTodo(qc, id),
  });
}

export function useEliminarConsolidadoLinea(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lineaId: number) => eliminarConsolidadoLinea(id, lineaId),
    onSuccess: () => invalidarTodo(qc, id),
  });
}

// --- Sección B ---

export function useAgregarDespachoLinea(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LiquidacionDespachoLineaRequest) => agregarDespachoLinea(id, body),
    onSuccess: () => {
      invalidarTodo(qc, id);
      qc.invalidateQueries({ queryKey: CONFIG_TARIFA_DISTRIBUCION_QUERY_KEY });
    },
  });
}

export function useActualizarDespachoLinea(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      lineaId,
      body,
    }: {
      lineaId: number;
      body: LiquidacionDespachoLineaRequest;
    }) => actualizarDespachoLinea(id, lineaId, body),
    onSuccess: () => {
      invalidarTodo(qc, id);
      qc.invalidateQueries({ queryKey: CONFIG_TARIFA_DISTRIBUCION_QUERY_KEY });
    },
  });
}

export function useEliminarDespachoLinea(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lineaId: number) => eliminarDespachoLinea(id, lineaId),
    onSuccess: () => invalidarTodo(qc, id),
  });
}
