import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  listarGuiasMaster,
  listarGuiasMasterPaginado,
  obtenerGuiaMaster,
  listarPiezasDeGuiaMaster,
  crearGuiaMaster,
  actualizarGuiaMaster,
  eliminarGuiaMaster,
  cerrarGuiaMasterConFaltante,
  recalcularEstadoGuiaMaster,
  confirmarDespachoParcialGuiaMaster,
  obtenerDashboardGuiasMaster,
  cancelarGuiaMaster,
  marcarGuiaMasterEnRevision,
  salirGuiaMasterDeRevision,
  reabrirGuiaMaster,
  listarHistorialGuiaMaster,
  type ListarGuiasMasterPageParams,
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

/** Versión paginada con búsqueda libre + filtro por estados. */
export function useGuiasMasterPaginadas(params: ListarGuiasMasterPageParams) {
  const estadosKey =
    params.estados && params.estados.length > 0
      ? [...params.estados].sort().join(',')
      : '';
  return useQuery({
    queryKey: [
      ...GUIAS_MASTER_QUERY_KEY,
      'page',
      params.q ?? '',
      estadosKey,
      params.page ?? 0,
      params.size ?? 25,
    ] as const,
    queryFn: () => listarGuiasMasterPaginado(params),
    placeholderData: keepPreviousData,
  });
}

export function useGuiaMaster(id: number | null | undefined) {
  return useQuery({
    queryKey: [...GUIAS_MASTER_QUERY_KEY, 'detail', id],
    queryFn: () => obtenerGuiaMaster(id as number),
    enabled: id != null,
  });
}

export function useGuiaMasterPiezas(id: number | null | undefined) {
  return useQuery({
    queryKey: [...GUIAS_MASTER_QUERY_KEY, 'piezas', id],
    queryFn: () => listarPiezasDeGuiaMaster(id as number),
    enabled: id != null,
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

export function useRecalcularGuiaMaster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => recalcularEstadoGuiaMaster(id),
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

export function useGuiaMasterHistorial(id: number | null | undefined) {
  return useQuery({
    queryKey: [...GUIAS_MASTER_QUERY_KEY, 'historial', id],
    queryFn: () => listarHistorialGuiaMaster(id as number),
    enabled: id != null,
  });
}

export function useDashboardGuiasMaster(_topAntiguas = 10, enabled = true) {
  return useQuery({
    queryKey: [...GUIAS_MASTER_QUERY_KEY, 'dashboard'],
    queryFn: () => obtenerDashboardGuiasMaster(),
    refetchInterval: 60_000,
    enabled,
  });
}
