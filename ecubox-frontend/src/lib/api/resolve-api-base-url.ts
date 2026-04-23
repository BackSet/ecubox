/**
 * Resuelve la URL base del backend para Axios y peticiones `fetch` manuales.
 *
 * - Origen absoluto **sin** path (o solo `/`), p. ej. `http://localhost:8080` o
 *   `https://api.midominio.com`: se añade el prefijo `/api` (context path típico
 *   del backend Spring Boot de ECUBOX).
 * - Si la URL ya incluye un path que **termina en** `/api`, se deja igual
 *   (p. ej. `http://localhost:8080/api`).
 * - Si incluye otro path (gateway, proxy), se respeta tal cual (no se añade `/api`).
 *
 * Rutas relativas: `/api` se devuelve normalizada; otras rutas relativas reciben
 * `/api` al final si aún no terminan en `/api`.
 */
export function resolveApiBaseUrl(): string {
  const env = import.meta.env.VITE_API_URL?.trim();
  const fallback = '/api';
  if (!env) return fallback;

  const trimmed = env.replace(/\/+$/, '');
  if (trimmed === '' || trimmed === '/') return fallback;

  if (!/^https?:\/\//i.test(trimmed)) {
    if (trimmed === '/api' || trimmed.endsWith('/api')) {
      return trimmed.replace(/\/+$/, '') || fallback;
    }
    if (trimmed.startsWith('/')) {
      return trimmed.endsWith('/api')
        ? trimmed.replace(/\/+$/, '')
        : `${trimmed}/api`.replace(/\/+/g, '/');
    }
    return fallback;
  }

  try {
    const u = new URL(trimmed);
    const pathname = (u.pathname || '').replace(/\/+$/, '') || '/';
    if (pathname === '/' || pathname === '') {
      u.pathname = '/api';
      return u.toString().replace(/\/+$/, '');
    }
    if (pathname.endsWith('/api')) {
      return trimmed;
    }
    return trimmed;
  } catch {
    return fallback;
  }
}
