import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

/**
 * Lógica de feedback HTTP usada por los clientes `openapi-fetch`
 * (`openapi-client.ts`): manejo de autenticación y presentación de errores
 * transitorios, centralizada para no duplicarla.
 *
 * El throttle y los timers son a nivel de módulo: una ráfaga de errores
 * (TanStack Query reintentando, varias mutaciones en cadena) produce como máximo
 * un toast por ventana, sin importar qué petición lo originó.
 */

/** Mensajes de error de red/servidor mostrados al usuario. */
export const NETWORK_ERROR_MESSAGE =
  'No se pudo conectar con el servidor. Verifica tu conexión o intenta más tarde.';
export const SERVER_ERROR_MESSAGE =
  'El servidor tuvo un problema procesando la solicitud. Intenta de nuevo en unos segundos.';

const TOAST_THROTTLE_MS = 4000;
let lastNetworkToastAt = 0;
let lastServerToastAt = 0;

/** Toast de red caída / timeout, como máximo uno cada {@link TOAST_THROTTLE_MS}. */
export function notifyNetworkError(): void {
  const now = Date.now();
  if (now - lastNetworkToastAt < TOAST_THROTTLE_MS) return;
  lastNetworkToastAt = now;
  toast.error(NETWORK_ERROR_MESSAGE);
}

/** Toast de error 5xx del servidor, como máximo uno cada {@link TOAST_THROTTLE_MS}. */
export function notifyServerError(): void {
  const now = Date.now();
  if (now - lastServerToastAt < TOAST_THROTTLE_MS) return;
  lastServerToastAt = now;
  toast.error(SERVER_ERROR_MESSAGE);
}

/**
 * Respuesta 401: cierra la sesión y redirige a /login (salvo que ya estemos
 * allí).
 */
export function handleUnauthorized(): void {
  useAuthStore.getState().logout();
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    if (path !== '/login') {
      window.location.href = '/login';
    }
  }
}

/** `true` para códigos de estado 5xx (servidor con error interno). */
export function isServerErrorStatus(status: number | undefined): boolean {
  return typeof status === 'number' && status >= 500 && status < 600;
}

/**
 * Detecta abortos/cancelaciones de un error nativo `fetch` (`AbortController`),
 * para que el cliente `openapi-fetch` no muestre toasts ante cancelaciones
 * legítimas (cambios de página, queries canceladas por TanStack Query).
 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  const name = (error as { name?: string } | undefined)?.name;
  const code = (error as { code?: string } | undefined)?.code;
  return name === 'AbortError' || name === 'CanceledError' || code === 'ERR_CANCELED';
}
