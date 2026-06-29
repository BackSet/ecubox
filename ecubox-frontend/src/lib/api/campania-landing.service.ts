import { openapiClient, openapiPublicClient, unwrap, ensureOk } from '@/lib/api/openapi-client';
import type { components } from '@/lib/api/generated/schema';
import type {
  CampaniaLanding,
  CampaniaLandingPublic,
  CampaniaLandingRequest,
} from '@/types/campania-landing';

// El contrato OpenAPI tipa request/response de forma laxa (propiedades
// opcionales y sin `null`); se conservan los tipos de dominio en las firmas y se
// puentea con casts localizados al tipo generado (body) o de dominio (respuesta).
type CampaniaLandingRequestDTO = components['schemas']['CampaniaLandingRequest'];

const BASE = '/api/parametros-sistema/campanias-landing' as const;

// -------------------------------------------------------------- administración

export async function listarCampanias(): Promise<CampaniaLanding[]> {
  const data = await unwrap(openapiClient.GET(BASE));
  return data as CampaniaLanding[];
}

export async function obtenerCampania(id: number): Promise<CampaniaLanding> {
  const data = await unwrap(openapiClient.GET(`${BASE}/{id}`, { params: { path: { id } } }));
  return data as CampaniaLanding;
}

export async function crearCampania(body: CampaniaLandingRequest): Promise<CampaniaLanding> {
  const data = await unwrap(
    openapiClient.POST(BASE, { body: body as CampaniaLandingRequestDTO }),
  );
  return data as CampaniaLanding;
}

export async function actualizarCampania(
  id: number,
  body: CampaniaLandingRequest,
): Promise<CampaniaLanding> {
  const data = await unwrap(
    openapiClient.PUT(`${BASE}/{id}`, {
      params: { path: { id } },
      body: body as CampaniaLandingRequestDTO,
    }),
  );
  return data as CampaniaLanding;
}

export async function publicarCampania(id: number): Promise<CampaniaLanding> {
  const data = await unwrap(
    openapiClient.POST(`${BASE}/{id}/publicar`, { params: { path: { id } } }),
  );
  return data as CampaniaLanding;
}

export async function desactivarCampania(id: number): Promise<CampaniaLanding> {
  const data = await unwrap(
    openapiClient.POST(`${BASE}/{id}/desactivar`, { params: { path: { id } } }),
  );
  return data as CampaniaLanding;
}

export async function eliminarCampania(id: number): Promise<void> {
  await ensureOk(openapiClient.DELETE(`${BASE}/{id}`, { params: { path: { id } } }));
}

// --------------------------------------------------------------------- público

/**
 * Campaña pública vigente. Usa el cliente público (sin token ni redirección por
 * 401) para no arrastrar sesión en una vista pública. Devuelve el patrón vacío
 * (objeto) cuando no hay campaña.
 */
export async function getCampaniaLandingPublic(): Promise<CampaniaLandingPublic> {
  const data = await unwrap(openapiPublicClient.GET('/api/public/campania-landing'));
  return (data ?? {}) as CampaniaLandingPublic;
}
