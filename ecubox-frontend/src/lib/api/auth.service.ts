import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  LoginRequest,
  LoginResponse,
  ClienteRegisterSimpleRequest,
  MeUpdateRequest,
} from '@/types/auth';

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>(
    API_ENDPOINTS.auth.login,
    credentials
  );
  return data;
}

/** Obtiene el usuario actual (perfil, roles y permisos). El token se mantiene en el cliente. */
export async function getCurrentUser(): Promise<
  Pick<LoginResponse, 'username' | 'email' | 'createdAt' | 'roles' | 'permissions'>
> {
  const { data } = await apiClient.get<LoginResponse>(API_ENDPOINTS.auth.me);
  return {
    username: data.username,
    email: data.email ?? null,
    createdAt: data.createdAt ?? null,
    roles: data.roles ?? [],
    permissions: data.permissions ?? [],
  };
}

/**
 * Actualiza el perfil del usuario autenticado.
 * Solo se envian los campos definidos. El backend exige currentPassword si
 * newPassword esta presente.
 */
export async function updateMe(
  payload: MeUpdateRequest
): Promise<Pick<LoginResponse, 'username' | 'email' | 'createdAt' | 'roles' | 'permissions'>> {
  const { data } = await apiClient.put<LoginResponse>(
    API_ENDPOINTS.auth.updateMe,
    payload
  );
  return {
    username: data.username,
    email: data.email ?? null,
    createdAt: data.createdAt ?? null,
    roles: data.roles ?? [],
    permissions: data.permissions ?? [],
  };
}

export async function registerClienteSimple(
  data: ClienteRegisterSimpleRequest
): Promise<void> {
  await apiClient.post(API_ENDPOINTS.auth.registerSimple, data);
}
