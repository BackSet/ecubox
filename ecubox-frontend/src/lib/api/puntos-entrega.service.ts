import { openapiClient, unwrap, ensureOk } from '@/lib/api/openapi-client';
import type { components } from '@/lib/api/generated/schema';
import type { AgenciaCourierEntrega, AgenciaCourierEntregaRequest } from '@/types/despacho';
import type { PageQuery, PageResponse } from '@/types/page';

const BASE = '/api/puntos-entrega' as const;

export async function getAgenciasCourierEntregaAll(): Promise<AgenciaCourierEntrega[]> {
  const data = await unwrap(openapiClient.GET(BASE));
  return data as AgenciaCourierEntrega[];
}

export async function listarAgenciasCourierEntregaPaginado(
  params: PageQuery = {},
): Promise<PageResponse<AgenciaCourierEntrega>> {
  const data = await unwrap(openapiClient.GET(`${BASE}/page`, { params: { query: params } }));
  return data as PageResponse<AgenciaCourierEntrega>;
}

export async function getAgenciaCourierEntrega(id: number): Promise<AgenciaCourierEntrega> {
  const data = await unwrap(openapiClient.GET(`${BASE}/{id}`, { params: { path: { id } } }));
  return data as AgenciaCourierEntrega;
}

export async function createAgenciaCourierEntrega(
  body: AgenciaCourierEntregaRequest,
): Promise<AgenciaCourierEntrega> {
  const data = await unwrap(
    openapiClient.POST(BASE, {
      body: body as components['schemas']['AgenciaCourierEntregaRequest'],
    }),
  );
  return data as AgenciaCourierEntrega;
}

export async function updateAgenciaCourierEntrega(
  id: number,
  body: AgenciaCourierEntregaRequest,
): Promise<AgenciaCourierEntrega> {
  const data = await unwrap(
    openapiClient.PUT(`${BASE}/{id}`, {
      params: { path: { id } },
      body: body as components['schemas']['AgenciaCourierEntregaRequest'],
    }),
  );
  return data as AgenciaCourierEntrega;
}

export async function deleteAgenciaCourierEntrega(id: number): Promise<void> {
  await ensureOk(openapiClient.DELETE(`${BASE}/{id}`, { params: { path: { id } } }));
}
