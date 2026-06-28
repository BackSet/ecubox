import { afterEach, describe, expect, it } from 'vitest';
import { APP_SURFACE_COLORS, applyBrowserChromeTheme } from './theme-colors';

describe('applyBrowserChromeTheme', () => {
  afterEach(() => {
    document.getElementById('ecubox-theme-color')?.remove();
    document.getElementById('ecubox-favicon')?.remove();
    document.querySelectorAll('meta[name="apple-mobile-web-app-status-bar-style"]').forEach((n) => n.remove());
  });

  it('actualiza theme-color al fondo oscuro de la app', () => {
    applyBrowserChromeTheme('dark');
    const meta = document.getElementById('ecubox-theme-color') as HTMLMetaElement;
    expect(meta?.content).toBe(APP_SURFACE_COLORS.dark);
  });

  it('actualiza theme-color al fondo claro de la app', () => {
    applyBrowserChromeTheme('light');
    const meta = document.getElementById('ecubox-theme-color') as HTMLMetaElement;
    expect(meta?.content).toBe(APP_SURFACE_COLORS.light);
  });

  it('ajusta barra de estado iOS en modo oscuro', () => {
    applyBrowserChromeTheme('dark');
    const apple = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    expect(apple?.getAttribute('content')).toBe('black-translucent');
  });

  it('actualiza favicon segun tema efectivo', () => {
    applyBrowserChromeTheme('dark');
    const favicon = document.getElementById('ecubox-favicon') as HTMLLinkElement;
    expect(favicon?.href).toContain('/favicon-dark.svg?v=8');

    applyBrowserChromeTheme('light');
    expect((document.getElementById('ecubox-favicon') as HTMLLinkElement)?.href).toContain(
      '/favicon-light.svg?v=8'
    );
  });
});
