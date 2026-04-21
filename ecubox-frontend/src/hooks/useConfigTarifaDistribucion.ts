import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  actualizarConfigTarifaDistribucion,
  obtenerConfigTarifaDistribucion,
} from '@/lib/api/config-tarifa-distribucion.service';
import type { ConfigTarifaDistribucionRequest } from '@/types/liquidacion';

export const CONFIG_TARIFA_DISTRIBUCION_QUERY_KEY = ['config', 'tarifa-distribucion'] as const;

export function useConfigTarifaDistribucion() {
  return useQuery({
    queryKey: CONFIG_TARIFA_DISTRIBUCION_QUERY_KEY,
    queryFn: obtenerConfigTarifaDistribucion,
  });
}

export function useActualizarConfigTarifaDistribucion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ConfigTarifaDistribucionRequest) =>
      actualizarConfigTarifaDistribucion(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONFIG_TARIFA_DISTRIBUCION_QUERY_KEY });
    },
  });
}
