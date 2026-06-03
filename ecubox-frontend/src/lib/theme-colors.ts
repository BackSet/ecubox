/**
 * Colores de chrome del navegador / PWA (barra de estado, etc.).
 * Deben coincidir con --color-background en index.css (:root y .dark).
 */
export const APP_SURFACE_COLORS = {
  light: '#FBFBFA',
  dark: '#1A1A1A',
} as const;

export type EffectiveTheme = keyof typeof APP_SURFACE_COLORS;

const THEME_COLOR_META_ID = 'ecubox-theme-color';
const APPLE_STATUS_META_NAME = 'apple-mobile-web-app-status-bar-style';
const FAVICON_LINK_ID = 'ecubox-favicon';
/** Incrementar al cambiar favicon SVG para invalidar caché del navegador. */
export const FAVICON_ASSET_VERSION = '7';
const FAVICON_PATHS: Record<EffectiveTheme, string> = {
  light: '/favicon-light.svg',
  dark: '/favicon-dark.svg',
};

function faviconHref(effective: EffectiveTheme): string {
  return `${FAVICON_PATHS[effective]}?v=${FAVICON_ASSET_VERSION}`;
}

/** Sincroniza el icono de pestaña con el tema efectivo de la app (no solo prefers-color-scheme). */
export function applyFaviconTheme(effective: EffectiveTheme): void {
  if (typeof document === 'undefined') return;

  let link = document.getElementById(FAVICON_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = FAVICON_LINK_ID;
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    document.head.appendChild(link);
  }
  link.href = faviconHref(effective);
}

/**
 * Sincroniza theme-color y estilo de barra de estado iOS con el tema efectivo
 * de la app (no solo prefers-color-scheme del sistema).
 */
export function applyBrowserChromeTheme(effective: EffectiveTheme): void {
  if (typeof document === 'undefined') return;

  const color = APP_SURFACE_COLORS[effective];

  let themeMeta = document.getElementById(THEME_COLOR_META_ID) as HTMLMetaElement | null;
  if (!themeMeta) {
    themeMeta = document.createElement('meta');
    themeMeta.name = 'theme-color';
    themeMeta.id = THEME_COLOR_META_ID;
    document.head.appendChild(themeMeta);
  }
  themeMeta.content = color;

  // Metas con media quedan como respaldo para primera carga sin JS; el meta
  // dinamico sin media tiene prioridad en navegadores modernos.
  document
    .querySelectorAll('meta[name="theme-color"][media]')
    .forEach((node) => node.remove());

  let appleStatus = document.querySelector(
    `meta[name="${APPLE_STATUS_META_NAME}"]`
  ) as HTMLMetaElement | null;
  if (!appleStatus) {
    appleStatus = document.createElement('meta');
    appleStatus.name = APPLE_STATUS_META_NAME;
    document.head.appendChild(appleStatus);
  }
  // default = barra clara (texto oscuro); black-translucent = integrada en fondo oscuro
  appleStatus.content = effective === 'dark' ? 'black-translucent' : 'default';

  applyFaviconTheme(effective);
}
