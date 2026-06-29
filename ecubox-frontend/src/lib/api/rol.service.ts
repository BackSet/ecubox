import { openapiClient, unwrap } from '@/lib/api/openapi-client';
import type { components } from '@/lib/api/generated/schema';
import type { RolDTO, RolPermisosUpdateRequest } from '@/types/rol';
import type { PageQuery, PageResponse } from '@/types/page';

const BASE = '/api/roles' as const;

export async function getRoles(): Promise<RolDTO[]> {
  const data = await unwrap(openapiClient.GET(BASE));
  return data as RolDTO[];
}

export async function listarRolesPaginado(params: PageQuery = {}): Promise<PageResponse<RolDTO>> {
  const data = await unwrap(openapiClient.GET(`${BASE}/page`, { params: { query: params } }));
  return data as PageResponse<RolDTO>;
}

export async function getRol(id: number): Promise<RolDTO> {
  const data = await unwrap(openapiClient.GET(`${BASE}/{id}`, { params: { path: { id } } }));
  return data as RolDTO;
}

export async function updateRolPermisos(
  id: number,
  body: RolPermisosUpdateRequest,
): Promise<RolDTO> {
  const data = await unwrap(
    openapiClient.PUT(`${BASE}/{id}/permisos`, {
      params: { path: { id } },
      body: body as components['schemas']['RolPermisosUpdateRequest'],
    }),
  );
  return data as RolDTO;
}
