import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPaquetesOperario,
  getPaquetesVencidosOperario,
  bulkUpdatePesos,
  updateEstadoRastreo,
  cambiarEstadoRastreoBulk,
  getEstadosDestinoPermitidos,
  asignarGuiaEnvio as apiAsignarGuiaEnvio,
  asignarGuiaEnvioBulk,
  type PaquetePesoItem,
} from '@/lib/api/paquetes.service';
import { DESPACHOS_QUERY_KEY, PAQUETES_SIN_SACA_QUERY_KEY } from '@/hooks/useOperarioDespachos';

export const OPERARIO_PAQUETES_QUERY_KEY = ['operario', 'paquetes'] as const;
export const OPERARIO_PAQUETES_VENCIDOS_QUERY_KEY = ['operario', 'paquetes', 'vencidos'] as const;

export function usePaquetesOperario(sinPeso = true) {
  return useQuery({
    queryKey: [...OPERARIO_PAQUETES_QUERY_KEY, { sinPeso }],
    queryFn: () => getPaquetesOperario({ sinPeso }),
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

export function useAsignarGuiaEnvio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paqueteId, numeroGuiaEnvio }: { paqueteId: number; numeroGuiaEnvio: string | null }) =>
      apiAsignarGuiaEnvio(paqueteId, numeroGuiaEnvio),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OPERARIO_PAQUETES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: DESPACHOS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: OPERARIO_PAQUETES_VENCIDOS_QUERY_KEY });
    },
  });
}

export function useAsignarGuiaEnvioBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ numeroGuiaEnvio, paqueteIds }: { numeroGuiaEnvio: string | null; paqueteIds: number[] }) =>
      asignarGuiaEnvioBulk(numeroGuiaEnvio, paqueteIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OPERARIO_PAQUETES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: DESPACHOS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: OPERARIO_PAQUETES_VENCIDOS_QUERY_KEY });
    },
  });
}
