import { openapiClient, unwrap, ensureOk } from '@/lib/api/openapi-client';
import type { components } from '@/lib/api/generated/schema';
import type {
  Manifiesto,
  ManifiestoRequest,
  AsignarDespachosRequest,
  ManifiestoDespachoCandidato,
} from '@/types/manifiesto';

const BASE = '/api/manifiestos' as const;

export async function getManifiestos(): Promise<Manifiesto[]> {
  const data = await unwrap(openapiClient.GET(BASE));
  return data as Manifiesto[];
}

export async function getManifiesto(id: number): Promise<Manifiesto> {
  const data = await unwrap(openapiClient.GET(`${BASE}/{id}`, { params: { path: { id } } }));
  return data as Manifiesto;
}

export async function createManifiesto(body: ManifiestoRequest): Promise<Manifiesto> {
  const data = await unwrap(
    openapiClient.POST(BASE, { body: body as components['schemas']['ManifiestoRequest'] }),
  );
  return data as Manifiesto;
}

export async function updateManifiesto(id: number, body: ManifiestoRequest): Promise<Manifiesto> {
  const data = await unwrap(
    openapiClient.PUT(`${BASE}/{id}`, {
      params: { path: { id } },
      body: body as components['schemas']['ManifiestoRequest'],
    }),
  );
  return data as Manifiesto;
}

export async function deleteManifiesto(id: number): Promise<void> {
  await ensureOk(openapiClient.DELETE(`${BASE}/{id}`, { params: { path: { id } } }));
}

export async function asignarDespachos(
  id: number,
  body: AsignarDespachosRequest,
): Promise<Manifiesto> {
  const data = await unwrap(
    openapiClient.POST(`${BASE}/{id}/asignar-despachos`, {
      params: { path: { id } },
      body: body as components['schemas']['AsignarDespachosRequest'],
    }),
  );
  return data as Manifiesto;
}

export async function getDespachosCandidatosManifiesto(
  id: number,
): Promise<ManifiestoDespachoCandidato[]> {
  const data = await unwrap(
    openapiClient.GET(`${BASE}/{id}/despachos-candidatos`, { params: { path: { id } } }),
  );
  return data as ManifiestoDespachoCandidato[];
}
