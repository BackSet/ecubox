import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  ConfigTarifaDistribucion,
  ConfigTarifaDistribucionRequest,
} from '@/types/liquidacion';

const BASE = API_ENDPOINTS.configTarifaDistribucion;

export async function obtenerConfigTarifaDistribucion(): Promise<ConfigTarifaDistribucion> {
  const { data } = await apiClient.get<ConfigTarifaDistribucion>(BASE);
  return data;
}

export async function actualizarConfigTarifaDistribucion(
  body: ConfigTarifaDistribucionRequest,
): Promise<ConfigTarifaDistribucion> {
  const { data } = await apiClient.put<ConfigTarifaDistribucion>(BASE, body);
  return data;
}
