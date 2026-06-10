/**
 * Recuperacion ante chunks obsoletos tras un deploy.
 *
 * Cuando se publica una version nueva, los nombres con hash de los chunks
 * cambian. Una pestaña con el index.html viejo (cache HTTP del navegador o sin
 * Service Worker activo todavia) pide un chunk que ya no existe; el servidor
 * responde con el index.html del fallback SPA (`Content-Type: text/html`), el
 * import dinamico falla con un error de MIME y la ruta queda en blanco.
 *
 * Vite emite `vite:preloadError` en `window` cuando un modulo importado de forma
 * diferida no carga. La recuperacion estandar es recargar para traer un
 * index.html fresco con los hashes nuevos. Recargamos una sola vez por ventana
 * de tiempo para no entrar en un bucle si el fallo persiste.
 */

const RELOAD_FLAG = 'ecubox_chunk_reload_at';
const RELOAD_WINDOW_MS = 15_000;

/** Identifica fallos de carga de chunks (modulo importado de forma diferida). */
export function isModuleLoadError(reason: unknown): boolean {
  const message = reason instanceof Error ? reason.message : String(reason ?? '');
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|expected a javascript(?:-or-wasm)? module|mime type|text\/html/i.test(
    message
  );
}

/**
 * Recarga la pestaña una sola vez por ventana de tiempo. Util tanto ante
 * `vite:preloadError` como cuando un import diferido resuelve a un modulo
 * incompleto (deploy obsoleto): en ambos casos un index.html fresco con los
 * hashes nuevos resuelve la situacion. La guarda evita bucles de recarga.
 */
export function reloadOnce(): void {
  let last = 0;
  try {
    last = Number(window.sessionStorage.getItem(RELOAD_FLAG) ?? 0);
  } catch {
    // sessionStorage bloqueado (modo privado): seguimos sin guarda persistente.
  }

  const now = Date.now();
  if (now - last < RELOAD_WINDOW_MS) return; // ya recargamos hace poco: evitar bucle.

  try {
    window.sessionStorage.setItem(RELOAD_FLAG, String(now));
  } catch {
    // Sin sessionStorage no podemos persistir la guarda; recargamos igualmente.
  }

  window.location.reload();
}

export function setupChunkErrorRecovery(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadOnce();
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (isModuleLoadError(event.reason)) {
      reloadOnce();
    }
  });
}
