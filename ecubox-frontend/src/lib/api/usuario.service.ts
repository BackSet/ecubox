import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  UsuarioDTO,
  UsuarioCreateRequest,
  UsuarioUpdateRequest,
} from '@/types/usuario';
import type { PageQuery, PageResponse } from '@/types/page';

const BASE = API_ENDPOINTS.usuarios;

export async function getUsuarios(): Promise<UsuarioDTO[]> {
  const { data } = await apiClient.get<UsuarioDTO[]>(BASE);
  return data;
}

export async function listarUsuariosPaginado(
  params: PageQuery = {},
): Promise<PageResponse<UsuarioDTO>> {
  const { data } = await apiClient.get<PageResponse<UsuarioDTO>>(`${BASE}/page`, {
    params,
  });
  return data;
}

export async function getUsuario(id: number): Promise<UsuarioDTO> {
  const { data } = await apiClient.get<UsuarioDTO>(`${BASE}/${id}`);
  return data;
}

export async function createUsuario(
  body: UsuarioCreateRequest
): Promise<UsuarioDTO> {
  const { data } = await apiClient.post<UsuarioDTO>(BASE, body);
  return data;
}

export async function updateUsuario(
  id: number,
  body: UsuarioUpdateRequest
): Promise<UsuarioDTO> {
  const { data } = await apiClient.put<UsuarioDTO>(`${BASE}/${id}`, body);
  return data;
}

export async function deleteUsuario(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
