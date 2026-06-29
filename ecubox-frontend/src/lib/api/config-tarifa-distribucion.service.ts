import { openapiClient, unwrap } from '@/lib/api/openapi-client';
import type { components } from '@/lib/api/generated/schema';
import type {
  ConfigTarifaDistribucion,
  ConfigTarifaDistribucionRequest,
} from '@/types/liquidacion';

const BASE = '/api/config/tarifa-distribucion' as const;

export async function obtenerConfigTarifaDistribucion(): Promise<ConfigTarifaDistribucion> {
  const data = await unwrap(openapiClient.GET(BASE));
  return data as ConfigTarifaDistribucion;
}

export async function actualizarConfigTarifaDistribucion(
  body: ConfigTarifaDistribucionRequest,
): Promise<ConfigTarifaDistribucion> {
  const data = await unwrap(
    openapiClient.PUT(BASE, {
      body: body as components['schemas']['ConfigTarifaDistribucionRequest'],
    }),
  );
  return data as ConfigTarifaDistribucion;
}
