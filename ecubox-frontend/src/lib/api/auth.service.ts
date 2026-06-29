import { openapiClient, unwrap, ensureOk } from '@/lib/api/openapi-client';
import type {
  LoginRequest,
  LoginResponse,
  ClienteRegisterSimpleRequest,
  MeUpdateRequest,
} from '@/types/auth';
import type { CanjearAccesoResponse } from '@/types/acceso-enlace';

/** Perfil derivado de la respuesta de autenticación (sin token). */
type AuthProfile = Pick<LoginResponse, 'username' | 'email' | 'createdAt' | 'roles' | 'permissions'>;

/**
 * Normaliza la respuesta del contrato OpenAPI (propiedades opcionales) al tipo
 * de dominio manual usado por el store y la UI. El backend siempre incluye
 * `username` en respuestas de perfil.
 */
function toAuthProfile(data: {
  username?: string;
  email?: string;
  createdAt?: string;
  roles?: string[];
  permissions?: string[];
}): AuthProfile {
  return {
    username: data.username ?? '',
    email: data.email ?? null,
    createdAt: data.createdAt ?? null,
    roles: data.roles ?? [],
    permissions: data.permissions ?? [],
  };
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const data = await unwrap(openapiClient.POST('/api/auth/login', { body: credentials }));
  return {
    token: data.token ?? '',
    ...toAuthProfile(data),
  };
}

/** Obtiene el usuario actual (perfil, roles y permisos). El token se mantiene en el cliente. */
export async function getCurrentUser(): Promise<AuthProfile> {
  const data = await unwrap(openapiClient.GET('/api/auth/me'));
  return toAuthProfile(data);
}

/**
 * Actualiza el perfil del usuario autenticado.
 * Solo se envian los campos definidos. El backend exige currentPassword si
 * newPassword esta presente.
 */
export async function updateMe(payload: MeUpdateRequest): Promise<AuthProfile> {
  const data = await unwrap(openapiClient.PUT('/api/auth/me', { body: payload }));
  return toAuthProfile(data);
}

export async function registerClienteSimple(data: ClienteRegisterSimpleRequest): Promise<void> {
  await ensureOk(openapiClient.POST('/api/auth/register/simple', { body: data }));
}

/**
 * Canjea el token de un enlace de acceso por una sesión JWT de solo lectura
 * acotada a los consignatarios del enlace. Devuelve el JWT y un resumen.
 */
export async function canjearAccesoEnlace(token: string): Promise<CanjearAccesoResponse> {
  const data = await unwrap(
    openapiClient.POST('/api/auth/acceso-enlace', { body: { token } }),
  );
  return data as CanjearAccesoResponse;
}
