import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  agregarPaquetesEnvioConsolidado,
  cerrarEnvioConsolidado,
  crearEnvioConsolidado,
  descargarManifiestoPdf,
  descargarManifiestoXlsx,
  listarEnviosConsolidados,
  obtenerEnvioConsolidado,
  reabrirEnvioConsolidado,
  removerPaquetesEnvioConsolidado,
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

export function useCerrarEnvioConsolidado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cerrarEnvioConsolidado(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ENVIOS_CONSOLIDADOS_QUERY_KEY });
      qc.invalidateQueries({
        queryKey: [...ENVIOS_CONSOLIDADOS_QUERY_KEY, 'detail', id],
      });
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
