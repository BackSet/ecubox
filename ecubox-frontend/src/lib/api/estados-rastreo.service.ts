import { openapiClient, unwrap, ensureOk } from '@/lib/api/openapi-client';
import type { components } from '@/lib/api/generated/schema';
import type {
  EstadoRastreo,
  EstadoRastreoRequest,
  EstadoRastreoOrdenTrackingRequest,
  EstadosRastreoPorPunto,
  EstadosRastreoPorPuntoRequest,
} from '@/types/estado-rastreo';

// El contrato y los tipos de dominio difieren en `null`/optional/`required`: se
// conservan los tipos de dominio en las firmas y se puentea con casts
// localizados (body → tipo generado, respuesta → tipo de dominio). El payload no
// cambia: solo la aserción de tipo.

export async function getEstadosRastreo(): Promise<EstadoRastreo[]> {
  const data = await unwrap(openapiClient.GET('/api/operario/estados-rastreo'));
  return data as EstadoRastreo[];
}

export async function getEstadosRastreoActivos(): Promise<EstadoRastreo[]> {
  const data = await unwrap(openapiClient.GET('/api/operario/estados-rastreo/activos'));
  return data as EstadoRastreo[];
}

export async function createEstadoRastreo(body: EstadoRastreoRequest): Promise<EstadoRastreo> {
  const data = await unwrap(
    openapiClient.POST('/api/operario/estados-rastreo', {
      body: body as components['schemas']['EstadoRastreoRequest'],
    }),
  );
  return data as EstadoRastreo;
}

export async function updateEstadoRastreo(
  id: number,
  body: EstadoRastreoRequest,
): Promise<EstadoRastreo> {
  const data = await unwrap(
    openapiClient.PUT('/api/operario/estados-rastreo/{id}', {
      params: { path: { id } },
      body: body as components['schemas']['EstadoRastreoRequest'],
    }),
  );
  return data as EstadoRastreo;
}

export async function desactivarEstadoRastreo(id: number): Promise<EstadoRastreo> {
  const data = await unwrap(
    openapiClient.PATCH('/api/operario/estados-rastreo/{id}/desactivar', {
      params: { path: { id } },
    }),
  );
  return data as EstadoRastreo;
}

export async function deleteEstadoRastreo(id: number): Promise<void> {
  await ensureOk(
    openapiClient.DELETE('/api/operario/estados-rastreo/{id}', { params: { path: { id } } }),
  );
}

export async function getEstadosRastreoPorPunto(): Promise<EstadosRastreoPorPunto> {
  const data = await unwrap(openapiClient.GET('/api/operario/config/estados-rastreo-por-punto'));
  return data as EstadosRastreoPorPunto;
}

export async function updateEstadosRastreoPorPunto(
  body: EstadosRastreoPorPuntoRequest,
): Promise<EstadosRastreoPorPunto> {
  const data = await unwrap(
    openapiClient.PUT('/api/operario/config/estados-rastreo-por-punto', {
      body: body as components['schemas']['EstadosRastreoPorPuntoRequest'],
    }),
  );
  return data as EstadosRastreoPorPunto;
}

export async function reorderTrackingEstadoRastreo(
  body: EstadoRastreoOrdenTrackingRequest,
): Promise<EstadoRastreo[]> {
  const data = await unwrap(
    openapiClient.PUT('/api/operario/estados-rastreo/orden-tracking', { body }),
  );
  return data as EstadoRastreo[];
}
