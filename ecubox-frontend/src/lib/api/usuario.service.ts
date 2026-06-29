import { openapiClient, unwrap, ensureOk } from '@/lib/api/openapi-client';
import type { components } from '@/lib/api/generated/schema';
import type { UsuarioDTO, UsuarioCreateRequest, UsuarioUpdateRequest } from '@/types/usuario';
import type { PageQuery, PageResponse } from '@/types/page';

const BASE = '/api/usuarios' as const;

export async function getUsuarios(): Promise<UsuarioDTO[]> {
  const data = await unwrap(openapiClient.GET(BASE));
  return data as UsuarioDTO[];
}

export async function listarUsuariosPaginado(
  params: PageQuery = {},
): Promise<PageResponse<UsuarioDTO>> {
  const data = await unwrap(openapiClient.GET(`${BASE}/page`, { params: { query: params } }));
  return data as PageResponse<UsuarioDTO>;
}

export async function getUsuario(id: number): Promise<UsuarioDTO> {
  const data = await unwrap(openapiClient.GET(`${BASE}/{id}`, { params: { path: { id } } }));
  return data as UsuarioDTO;
}

export async function createUsuario(body: UsuarioCreateRequest): Promise<UsuarioDTO> {
  const data = await unwrap(
    openapiClient.POST(BASE, { body: body as components['schemas']['UsuarioCreateRequest'] }),
  );
  return data as UsuarioDTO;
}

export async function updateUsuario(id: number, body: UsuarioUpdateRequest): Promise<UsuarioDTO> {
  const data = await unwrap(
    openapiClient.PUT(`${BASE}/{id}`, {
      params: { path: { id } },
      body: body as components['schemas']['UsuarioUpdateRequest'],
    }),
  );
  return data as UsuarioDTO;
}

export async function deleteUsuario(id: number): Promise<void> {
  await ensureOk(openapiClient.DELETE(`${BASE}/{id}`, { params: { path: { id } } }));
}
