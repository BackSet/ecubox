import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPaquetesOperario,
  getPaquetesVencidosOperario,
  bulkUpdatePesos,
  updateEstadoRastreo,
  cambiarEstadoRastreoBulk,
  getEstadosDestinoPermitidos,
  asignarPaqueteAGuiaMaster as apiAsignarPaqueteAGuiaMaster,
  asignarGuiaMasterBulk as apiAsignarGuiaMasterBulk,
  type PaquetePesoItem,
} from '@/lib/api/paquetes.service';
import { DESPACHOS_QUERY_KEY, PAQUETES_SIN_SACA_QUERY_KEY } from '@/hooks/useOperarioDespachos';

export const OPERARIO_PAQUETES_QUERY_KEY = ['operario', 'paquetes'] as const;
export const OPERARIO_PAQUETES_VENCIDOS_QUERY_KEY = ['operario', 'paquetes', 'vencidos'] as const;

export function usePaquetesOperario(sinPeso = true, enabled = true) {
  return useQuery({
    queryKey: [...OPERARIO_PAQUETES_QUERY_KEY, { sinPeso }],
    queryFn: () => getPaquetesOperario({ sinPeso }),
    enabled,
  });
}

export function usePaquetesVencidosOperario(enabled = true) {
  return useQuery({
    queryKey: OPERARIO_PAQUETES_VENCIDOS_QUERY_KEY,
    queryFn: getPaquetesVencidosOperario,
    enabled,
  });
}

export function useBulkUpdatePesos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: PaquetePesoItem[]) => bulkUpdatePesos(items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OPERARIO_PAQUETES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: OPERARIO_PAQUETES_VENCIDOS_QUERY_KEY });
    },
  });
}

export function useUpdateEstadoRastreo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paqueteId, estadoRastreoId }: { paqueteId: number; estadoRastreoId: number }) =>
      updateEstadoRastreo(paqueteId, estadoRastreoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OPERARIO_PAQUETES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: OPERARIO_PAQUETES_VENCIDOS_QUERY_KEY });
    },
  });
}

export function useCambiarEstadoRastreoBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paqueteIds, estadoRastreoId }: { paqueteIds: number[]; estadoRastreoId: number }) =>
      cambiarEstadoRastreoBulk(paqueteIds, estadoRastreoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OPERARIO_PAQUETES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: PAQUETES_SIN_SACA_QUERY_KEY });
      qc.invalidateQueries({ queryKey: OPERARIO_PAQUETES_VENCIDOS_QUERY_KEY });
    },
  });
}

export function useEstadosDestinoPermitidos(paqueteIds: number[]) {
  return useQuery({
    queryKey: [...OPERARIO_PAQUETES_QUERY_KEY, 'estados-destino', paqueteIds.slice().sort((a, b) => a - b).join(',')],
    queryFn: () => getEstadosDestinoPermitidos(paqueteIds),
    enabled: paqueteIds.length > 0,
  });
}

/** Asigna (o desvincula) un paquete individual a una guía master. */
export function useAsignarPaqueteAGuiaMaster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      paqueteId,
      guiaMasterId,
      piezaNumero,
    }: {
      paqueteId: number;
      guiaMasterId: number | null;
      piezaNumero?: number | null;
    }) => apiAsignarPaqueteAGuiaMaster(paqueteId, guiaMasterId, piezaNumero),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OPERARIO_PAQUETES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: DESPACHOS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: OPERARIO_PAQUETES_VENCIDOS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['guias-master'] });
    },
  });
}

/** Asigna varios paquetes como piezas de una misma guía master. */
export function useAsignarGuiaMasterBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ guiaMasterId, paqueteIds }: { guiaMasterId: number; paqueteIds: number[] }) =>
      apiAsignarGuiaMasterBulk(guiaMasterId, paqueteIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OPERARIO_PAQUETES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: DESPACHOS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: OPERARIO_PAQUETES_VENCIDOS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['guias-master'] });
    },
  });
}

