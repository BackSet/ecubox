import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listarGuiasMaster,
  listarGuiasMasterPaginado,
  obtenerGuiaMaster,
  listarPiezasDeGuiaMaster,
  crearGuiaMaster,
  actualizarGuiaMaster,
  eliminarGuiaMaster,
  cerrarGuiaMasterConFaltante,
  confirmarDespachoParcialGuiaMaster,
  obtenerDashboardGuiasMaster,
  aprobarGuiaMaster,
  cancelarGuiaMaster,
  marcarGuiaMasterEnRevision,
  salirGuiaMasterDeRevision,
  recalcularGuiaMaster,
  reabrirGuiaMaster,
  listarHistorialGuiaMaster,
  type ListarGuiasMasterPageParams,
  aplicarAccionBulkGuiasMaster,
  type AplicarAccionGuiasMasterPayload,
} from '@/lib/api/guias-master.service';
import type {
  EstadoGuiaMaster,
  GuiaMasterCancelarRequest,
  GuiaMasterCreateRequest,
  GuiaMasterUpdateRequest,
  GuiaMasterCerrarConFaltanteRequest,
  GuiaMasterConfirmarDespachoParcialRequest,
  GuiaMasterReabrirRequest,
  GuiaMasterRevisionRequest,
} from '@/types/guia-master';

export const GUIAS_MASTER_QUERY_KEY = ['guias-master'] as const;

export function useGuiasMaster(
  trackingBase?: string,
  estados?: EstadoGuiaMaster[]
) {
  const estadosKey = estados && estados.length > 0 ? [...estados].sort().join(',') : '';
  return useQuery({
    queryKey: [...GUIAS_MASTER_QUERY_KEY, 'list', trackingBase ?? '', estadosKey],
    queryFn: () => listarGuiasMaster(trackingBase, estados),
  });
}

/**
 * Versión paginada con búsqueda libre + filtro por estados, segmentada por
 * BANDEJA (operativas / pendientes / revisión).
 *
 * La `bandeja` forma parte de la queryKey y se usa para acotar el
 * `keepPreviousData`: dentro de la MISMA bandeja conservamos los datos
 * anteriores para una paginación/búsqueda fluida, pero al CAMBIAR de bandeja
 * NO se conservan (devolvemos `undefined`), evitando renderizar filas de la
 * bandeja anterior (estados incompatibles) mientras carga la nueva.
 */
export function useGuiasMasterPaginadas(
  params: ListarGuiasMasterPageParams & { bandeja: string },
) {
  const estadosKey =
    params.estados && params.estados.length > 0
      ? [...params.estados].sort().join(',')
      : '';
  const { bandeja } = params;
  return useQuery({
    queryKey: [
      ...GUIAS_MASTER_QUERY_KEY,
      'page',
      bandeja,
      params.q ?? '',
      estadosKey,
      params.page ?? 0,
      params.size ?? 25,
    ] as const,
    queryFn: () => listarGuiasMasterPaginado(params),
    placeholderData: (previousData, previousQuery) => {
      const prevBandeja = previousQuery?.queryKey?.[2];
      // Solo conservamos datos previos si la bandeja no cambió.
      return prevBandeja === bandeja ? previousData : undefined;
    },
  });
}

export function useGuiaMaster(id: number | null | undefined) {
  return useQuery({
    queryKey: [...GUIAS_MASTER_QUERY_KEY, 'detail', id],
    queryFn: () => obtenerGuiaMaster(id as number),
    enabled: id != null && !isNaN(id) && id > 0,
  });
}

export function useGuiaMasterPiezas(id: number | null | undefined) {
  return useQuery({
    queryKey: [...GUIAS_MASTER_QUERY_KEY, 'piezas', id],
    queryFn: () => listarPiezasDeGuiaMaster(id as number),
    enabled: id != null && !isNaN(id) && id > 0,
  });
}

export function useCrearGuiaMaster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GuiaMasterCreateRequest) => crearGuiaMaster(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GUIAS_MASTER_QUERY_KEY });
    },
  });
}

export function useActualizarGuiaMaster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: GuiaMasterUpdateRequest }) =>
      actualizarGuiaMaster(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: GUIAS_MASTER_QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...GUIAS_MASTER_QUERY_KEY, 'detail', vars.id] });
      qc.invalidateQueries({ queryKey: ['paquetes'] });
      qc.invalidateQueries({ queryKey: ['operario', 'paquetes'] });
    },
  });
}

export function useEliminarGuiaMaster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => eliminarGuiaMaster(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GUIAS_MASTER_QUERY_KEY });
    },
  });
}

export function useCerrarGuiaMasterConFaltante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: GuiaMasterCerrarConFaltanteRequest }) =>
      cerrarGuiaMasterConFaltante(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GUIAS_MASTER_QUERY_KEY });
    },
  });
}

export function useConfirmarDespachoParcial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: GuiaMasterConfirmarDespachoParcialRequest }) =>
      confirmarDespachoParcialGuiaMaster(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: GUIAS_MASTER_QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...GUIAS_MASTER_QUERY_KEY, 'detail', vars.id] });
    },
  });
}

export function useAprobarGuiaMaster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => aprobarGuiaMaster(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: GUIAS_MASTER_QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...GUIAS_MASTER_QUERY_KEY, 'detail', id] });
      qc.invalidateQueries({ queryKey: [...GUIAS_MASTER_QUERY_KEY, 'historial', id] });
    },
  });
}

export function useCancelarGuiaMaster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: GuiaMasterCancelarRequest }) =>
      cancelarGuiaMaster(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: GUIAS_MASTER_QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...GUIAS_MASTER_QUERY_KEY, 'detail', vars.id] });
      qc.invalidateQueries({ queryKey: [...GUIAS_MASTER_QUERY_KEY, 'historial', vars.id] });
    },
  });
}

export function useMarcarGuiaMasterEnRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: GuiaMasterRevisionRequest }) =>
      marcarGuiaMasterEnRevision(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: GUIAS_MASTER_QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...GUIAS_MASTER_QUERY_KEY, 'detail', vars.id] });
      qc.invalidateQueries({ queryKey: [...GUIAS_MASTER_QUERY_KEY, 'historial', vars.id] });
    },
  });
}

export function useSalirGuiaMasterDeRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: GuiaMasterRevisionRequest }) =>
      salirGuiaMasterDeRevision(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: GUIAS_MASTER_QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...GUIAS_MASTER_QUERY_KEY, 'detail', vars.id] });
      qc.invalidateQueries({ queryKey: [...GUIAS_MASTER_QUERY_KEY, 'historial', vars.id] });
    },
  });
}

export function useReabrirGuiaMaster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: GuiaMasterReabrirRequest }) =>
      reabrirGuiaMaster(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: GUIAS_MASTER_QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...GUIAS_MASTER_QUERY_KEY, 'detail', vars.id] });
      qc.invalidateQueries({ queryKey: [...GUIAS_MASTER_QUERY_KEY, 'historial', vars.id] });
    },
  });
}

export function useRecalcularGuiaMaster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => recalcularGuiaMaster(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: GUIAS_MASTER_QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...GUIAS_MASTER_QUERY_KEY, 'detail', id] });
      qc.invalidateQueries({ queryKey: [...GUIAS_MASTER_QUERY_KEY, 'historial', id] });
    },
  });
}

export function useGuiaMasterHistorial(id: number | null | undefined) {
  return useQuery({
    queryKey: [...GUIAS_MASTER_QUERY_KEY, 'historial', id],
    queryFn: () => listarHistorialGuiaMaster(id as number),
    enabled: id != null && !isNaN(id) && id > 0,
  });
}

export function useDashboardGuiasMaster(topAntiguas = 10, enabled = true) {
  return useQuery({
    queryKey: [...GUIAS_MASTER_QUERY_KEY, 'dashboard', topAntiguas],
    queryFn: () => obtenerDashboardGuiasMaster(topAntiguas),
    refetchInterval: 60_000,
    enabled,
  });
}

/** Todas las guías master sin paginación (para el diálogo masivo de aplicar estado). */
export function useAllGuiasMaster(enabled = true) {
  return useQuery({
    queryKey: [...GUIAS_MASTER_QUERY_KEY, 'all'],
    queryFn: () => listarGuiasMaster(),
    staleTime: 0,
    enabled,
  });
}

/**
 * Acción masiva de ciclo de vida sobre guías master (un solo request).
 * Invalida todo el prefijo: cubre list/page/detail/historial/dashboard/all.
 */
export function useAplicarAccionBulkGuiasMaster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AplicarAccionGuiasMasterPayload) =>
      aplicarAccionBulkGuiasMaster(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GUIAS_MASTER_QUERY_KEY });
    },
  });
}
