import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  LoginRequest,
  LoginResponse,
  ClienteRegisterSimpleRequest,
} from '@/types/auth';

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>(
    API_ENDPOINTS.auth.login,
    credentials
  );
  return data;
}

/** Obtiene el usuario actual (roles y permisos). El token se mantiene en el cliente. */
export async function getCurrentUser(): Promise<
  Pick<LoginResponse, 'username' | 'roles' | 'permissions'>
> {
  const { data } = await apiClient.get<LoginResponse>(API_ENDPOINTS.auth.me);
  return {
    username: data.username,
    roles: data.roles ?? [],
    permissions: data.permissions ?? [],
  };
}

export async function registerClienteSimple(
  data: ClienteRegisterSimpleRequest
): Promise<void> {
  await apiClient.post(API_ENDPOINTS.auth.registerSimple, data);
}
