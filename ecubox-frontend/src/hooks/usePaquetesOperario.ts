import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPaquetesOperario,
  getPaquetesVencidosOperario,
  bulkUpdatePesos,
  cambiarEstadoRastreoBulk,
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
