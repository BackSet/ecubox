import { openapiClient, unwrap, ensureOk } from '@/lib/api/openapi-client';
import type { components } from '@/lib/api/generated/schema';
import type { CourierEntrega, CourierEntregaRequest } from '@/types/despacho';
import type { PageQuery, PageResponse } from '@/types/page';

const BASE = '/api/couriers-entrega' as const;

export async function getCouriersEntregaAdmin(): Promise<CourierEntrega[]> {
  const data = await unwrap(openapiClient.GET(BASE));
  return data as CourierEntrega[];
}

export async function listarCouriersEntregaPaginado(
  params: PageQuery = {},
): Promise<PageResponse<CourierEntrega>> {
  const data = await unwrap(openapiClient.GET(`${BASE}/page`, { params: { query: params } }));
  return data as PageResponse<CourierEntrega>;
}

export async function getCourierEntregaAdmin(id: number): Promise<CourierEntrega> {
  const data = await unwrap(openapiClient.GET(`${BASE}/{id}`, { params: { path: { id } } }));
  return data as CourierEntrega;
}

export async function createCourierEntrega(body: CourierEntregaRequest): Promise<CourierEntrega> {
  const data = await unwrap(
    openapiClient.POST(BASE, { body: body as components['schemas']['CourierEntregaRequest'] }),
  );
  return data as CourierEntrega;
}

export async function updateCourierEntrega(
  id: number,
  body: CourierEntregaRequest,
): Promise<CourierEntrega> {
  const data = await unwrap(
    openapiClient.PUT(`${BASE}/{id}`, {
      params: { path: { id } },
      body: body as components['schemas']['CourierEntregaRequest'],
    }),
  );
  return data as CourierEntrega;
}

export async function deleteCourierEntrega(id: number): Promise<void> {
  await ensureOk(openapiClient.DELETE(`${BASE}/{id}`, { params: { path: { id } } }));
}
