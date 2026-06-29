import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from '@/lib/api/generated/schema';
import { resolveApiBaseUrl } from '@/lib/api/resolve-api-base-url';
import { useAuthStore } from '@/stores/authStore';
import {
  handleUnauthorized,
  isAbortError,
  isServerErrorStatus,
  notifyNetworkError,
  notifyServerError,
} from '@/lib/api/http-feedback';

/**
 * Clientes HTTP tipados con `openapi-fetch`, apoyados en los tipos generados
 * desde el contrato OpenAPI (`generated/schema.d.ts`, regenerable con
 * `npm run api:generate`). Son el único cliente HTTP del frontend; el manejo de
 * auth/errores vive en `http-feedback.ts`.
 *
 * Las claves de ruta del schema incluyen el prefijo `/api` (p. ej.
 * `/api/auth/login`), por eso el `baseUrl` es el **origen sin** `/api`.
 *
 * Contrato de errores:
 * - Respuestas HTTP de error (4xx/5xx) **no lanzan** en `openapi-fetch`: se
 *   normalizan con {@link unwrap}/{@link ensureOk}, que lanzan {@link ApiError}
 *   (compatible con `getApiErrorMessage`/`getApiStatus`), preservando el
 *   contrato de rechazo de promesas en fallos HTTP.
 * - Errores de red / timeout / abort **sí lanzan**.
 * - Descargas: usar la opción por petición `parseAs: 'blob'`.
 */

/** Origen del backend sin el sufijo `/api` (las rutas del schema ya lo incluyen). */
function resolveOpenApiBaseUrl(): string {
  return resolveApiBaseUrl().replace(/\/api$/, '');
}

/**
 * Serializa los parámetros de query de tipo array como `clave=a,b` (estilo
 * `form`, `explode:false`), compatible con los `@RequestParam List<...>` del
 * backend Spring. Sin esto, `openapi-fetch` usaría `clave=a&clave=b`.
 */
const QUERY_SERIALIZER = { array: { style: 'form', explode: false } } as const;

/** Inyecta el `Authorization: Bearer <jwt>` desde el store de auth. */
const authMiddleware: Middleware = {
  onRequest({ request }) {
    const token = useAuthStore.getState().token;
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
};

/**
 * Manejo de respuesta para el cliente autenticado:
 * - 401 → logout + redirección a /login.
 * - 5xx → toast de servidor (con throttle compartido).
 * - error de red/timeout (fetch lanza) → toast de red, salvo cancelación/abort.
 * Nunca "traga" el error: lo deja propagar.
 */
const feedbackMiddleware: Middleware = {
  onResponse({ response }) {
    if (response.status === 401) {
      handleUnauthorized();
      return response;
    }
    if (isServerErrorStatus(response.status)) {
      notifyServerError();
    }
    return response;
  },
  onError({ error }) {
    if (isAbortError(error)) {
      return; // cancelación legítima: no mostrar toast
    }
    notifyNetworkError();
    return; // devolver void mantiene el error original para que se propague
  },
};

/**
 * Cliente autenticado: añade el JWT y aplica el manejo de sesión/errores.
 * Para endpoints bajo autenticación.
 */
export const openapiClient = createClient<paths>({
  baseUrl: resolveOpenApiBaseUrl(),
  querySerializer: QUERY_SERIALIZER,
  headers: {
    'Content-Type': 'application/json',
  },
});
openapiClient.use(authMiddleware, feedbackMiddleware);

/**
 * Cliente público: **sin** token ni middleware de sesión, para endpoints
 * públicos (landing, calculadora, config pública). Replica el `fetch` directo
 * que usaban estos servicios: no arrastra tokens ni dispara redirección por 401
 * en vistas públicas, y no muestra toasts (el consumidor decide).
 */
export const openapiPublicClient = createClient<paths>({
  baseUrl: resolveOpenApiBaseUrl(),
  querySerializer: QUERY_SERIALIZER,
  headers: {
    Accept: 'application/json',
  },
});

/**
 * Error normalizado con la forma `{ response: { status, data } }` que consumen
 * `getApiErrorMessage` y `getApiStatus`.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;
  readonly response: { status: number; data: unknown };

  constructor(status: number, data: unknown, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.response = { status, data };
  }
}

function messageFromBody(body: unknown, status: number): string {
  const message = (body as { message?: unknown } | null | undefined)?.message;
  return typeof message === 'string' && message.trim().length > 0
    ? message.trim()
    : `Error ${status}`;
}

/**
 * Devuelve el `data` de una llamada `openapi-fetch` o lanza {@link ApiError} si
 * la respuesta fue de error (rechazo de promesa en fallos HTTP).
 */
export async function unwrap<T>(
  call: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await call;
  if (error !== undefined) {
    throw new ApiError(response.status, error, messageFromBody(error, response.status));
  }
  // `data` está presente cuando no hubo error en respuestas 2xx con cuerpo; el
  // genérico pierde el discriminated union de openapi-fetch, de ahí el cast.
  return data as T;
}

/** Igual que {@link unwrap} para llamadas sin cuerpo de respuesta (p. ej. DELETE). */
export async function ensureOk(
  call: Promise<{ error?: unknown; response: Response }>,
): Promise<void> {
  const { error, response } = await call;
  if (error !== undefined) {
    throw new ApiError(response.status, error, messageFromBody(error, response.status));
  }
}

/** Re-exporta el tipo de rutas generado para conveniencia de los servicios. */
export type ApiPaths = paths;
