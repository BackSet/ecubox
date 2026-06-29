import { openapiClient, unwrap, ensureOk } from '@/lib/api/openapi-client';
import type { components } from '@/lib/api/generated/schema';
import type { Agencia, AgenciaRequest } from '@/types/despacho';
import type { PageQuery, PageResponse } from '@/types/page';

// Contrato laxo vs tipos de dominio: casts localizados (body → tipo generado,
// respuesta → tipo de dominio). El payload no cambia.
const BASE = '/api/agencias' as const;

export async function getAgencias(): Promise<Agencia[]> {
  const data = await unwrap(openapiClient.GET(BASE));
  return data as Agencia[];
}

export async function listarAgenciasPaginado(
  params: PageQuery = {},
): Promise<PageResponse<Agencia>> {
  const data = await unwrap(openapiClient.GET(`${BASE}/page`, { params: { query: params } }));
  return data as PageResponse<Agencia>;
}

export async function getAgencia(id: number): Promise<Agencia> {
  const data = await unwrap(openapiClient.GET(`${BASE}/{id}`, { params: { path: { id } } }));
  return data as Agencia;
}

export async function createAgencia(body: AgenciaRequest): Promise<Agencia> {
  const data = await unwrap(
    openapiClient.POST(BASE, { body: body as components['schemas']['AgenciaRequest'] }),
  );
  return data as Agencia;
}

export async function updateAgencia(id: number, body: AgenciaRequest): Promise<Agencia> {
  const data = await unwrap(
    openapiClient.PUT(`${BASE}/{id}`, {
      params: { path: { id } },
      body: body as components['schemas']['AgenciaRequest'],
    }),
  );
  return data as Agencia;
}

export async function deleteAgencia(id: number): Promise<void> {
  await ensureOk(openapiClient.DELETE(`${BASE}/{id}`, { params: { path: { id } } }));
}
