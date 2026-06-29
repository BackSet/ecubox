import { openapiClient, unwrap } from '@/lib/api/openapi-client';
import type { PermisoDTO } from '@/types/rol';
import type { PageQuery, PageResponse } from '@/types/page';

const BASE = '/api/permisos' as const;

export async function getPermisos(): Promise<PermisoDTO[]> {
  const data = await unwrap(openapiClient.GET(BASE));
  return data as PermisoDTO[];
}

export async function listarPermisosPaginado(
  params: PageQuery = {},
): Promise<PageResponse<PermisoDTO>> {
  const data = await unwrap(openapiClient.GET(`${BASE}/page`, { params: { query: params } }));
  return data as PageResponse<PermisoDTO>;
}
