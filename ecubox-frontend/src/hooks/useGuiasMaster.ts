import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listarGuiasMaster,
  obtenerGuiaMaster,
  listarPiezasDeGuiaMaster,
  crearGuiaMaster,
  actualizarGuiaMaster,
  eliminarGuiaMaster,
  cerrarGuiaMasterConFaltante,
  recalcularEstadoGuiaMaster,
  confirmarDespachoParcialGuiaMaster,
  obtenerDashboardGuiasMaster,
} from '@/lib/api/guias-master.service';
import type {
  GuiaMasterCreateRequest,
  GuiaMasterUpdateRequest,
  GuiaMasterCerrarConFaltanteRequest,
  GuiaMasterConfirmarDespachoParcialRequest,
} from '@/types/guia-master';

export const GUIAS_MASTER_QUERY_KEY = ['guias-master'] as const;

export function useGuiasMaster(trackingBase?: string) {
  return useQuery({
    queryKey: [...GUIAS_MASTER_QUERY_KEY, 'list', trackingBase ?? ''],
    queryFn: () => listarGuiasMaster(trackingBase),
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

export function useDashboardGuiasMaster(_topAntiguas = 10, enabled = true) {
  return useQuery({
    queryKey: [...GUIAS_MASTER_QUERY_KEY, 'dashboard'],
    queryFn: () => obtenerDashboardGuiasMaster(),
    refetchInterval: 60_000,
    enabled,
  });
}
