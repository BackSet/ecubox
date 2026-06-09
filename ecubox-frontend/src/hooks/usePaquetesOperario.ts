import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPaquetesOperario,
  getPaquetesVencidosOperario,
  bulkUpdatePesos,
  cambiarEstadoRastreoBulk,
  getEstadosDestinoPermitidos,
  getEstadosAplicablesPaquete,
  aplicarEstadoPorPeriodoPaquetes,
  getAllPaquetesOperario,
  type PaquetePesoItem,
} from '@/lib/api/paquetes.service';
import { PAQUETES_SIN_SACA_QUERY_KEY } from '@/hooks/useOperarioDespachos';

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

/**
 * Estados de rastreo permitidos como destino para la selección actual (intersección
 * válida para todos los paquetes, según el backend). Vacío si no hay selección.
 */
export function useEstadosDestinoPermitidos(paqueteIds: number[]) {
  const sorted = [...paqueteIds].sort((a, b) => a - b);
  return useQuery({
    queryKey: [...OPERARIO_PAQUETES_QUERY_KEY, 'estados-destino', sorted],
    queryFn: () => getEstadosDestinoPermitidos(sorted),
    enabled: sorted.length > 0,
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

export function useEstadosAplicablesPaquete(enabled = true) {
  return useQuery({
    queryKey: [...OPERARIO_PAQUETES_QUERY_KEY, 'estados-aplicables'],
    queryFn: getEstadosAplicablesPaquete,
    staleTime: 0,
    enabled,
  });
}

export function useAplicarEstadoPorPeriodoPaquetes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { fechaInicio: string; fechaFin: string; estadoRastreoId: number }) =>
      aplicarEstadoPorPeriodoPaquetes(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OPERARIO_PAQUETES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: PAQUETES_SIN_SACA_QUERY_KEY });
    },
  });
}

export function useAllPaquetesOperario(enabled = true) {
  return useQuery({
    queryKey: [...OPERARIO_PAQUETES_QUERY_KEY, 'all'],
    queryFn: getAllPaquetesOperario,
    staleTime: 0,
    enabled,
  });
}
