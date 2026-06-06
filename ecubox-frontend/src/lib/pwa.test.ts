import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectInstallBrowser,
  detectInstallPlatform,
  hasActivePushSubscription,
  isInAppBrowser,
  isMobileDevice,
  notifyUser,
  requiresManualInstallGuide,
  setupServiceWorkerUpdateChecks,
} from './pwa';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

const illegalConstructor = vi.fn();

class MockNotification {
  static permission: NotificationPermission = 'granted';
  constructor() {
    // Replica el comportamiento del navegador en contextos con SW: usar el
    // constructor es ilegal. Si notifyUser lo invoca, el test debe fallar.
    illegalConstructor();
    throw new TypeError("Failed to construct 'Notification': Illegal constructor.");
  }
}

let showNotification: ReturnType<typeof vi.fn>;
let getSubscription: ReturnType<typeof vi.fn>;
let visibility: DocumentVisibilityState;

function setVisibility(state: DocumentVisibilityState) {
  visibility = state;
}

beforeEach(() => {
  illegalConstructor.mockReset();
  MockNotification.permission = 'granted';
  visibility = 'hidden';

  showNotification = vi.fn().mockResolvedValue(undefined);
  getSubscription = vi.fn().mockResolvedValue(null);

  const registration = {
    showNotification,
    pushManager: { getSubscription },
  };

  vi.stubGlobal('Notification', MockNotification);
  Object.defineProperty(window, 'PushManager', { configurable: true, value: function () {} });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve(registration) },
  });
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibility,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('notifyUser', () => {
  it('usa ServiceWorkerRegistration.showNotification y nunca el constructor Notification', async () => {
    await notifyUser('Hola', { body: 'Cuerpo', tag: 't1' });

    expect(showNotification).toHaveBeenCalledTimes(1);
    expect(showNotification).toHaveBeenCalledWith(
      'Hola',
      expect.objectContaining({ body: 'Cuerpo', tag: 't1' })
    );
    expect(illegalConstructor).not.toHaveBeenCalled();
  });

  it('no notifica si el permiso no fue concedido', async () => {
    MockNotification.permission = 'default';
    await notifyUser('Hola');
    expect(showNotification).not.toHaveBeenCalled();
    expect(illegalConstructor).not.toHaveBeenCalled();
  });

  it('no muestra notificacion del sistema cuando la pestaña esta visible', async () => {
    setVisibility('visible');
    await notifyUser('Hola');
    expect(showNotification).not.toHaveBeenCalled();
  });
});

describe('detectInstallPlatform', () => {
  it('detecta iOS en iPhone', () => {
    expect(detectInstallPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('ios');
  });

  it('detecta Android', () => {
    expect(detectInstallPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 7)')).toBe('android');
  });

  it('detecta Windows como plataforma instalable', () => {
    expect(detectInstallPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('windows');
  });
});

describe('detectInstallBrowser', () => {
  it.each([
    ['Chrome', 'Mozilla/5.0 Chrome/125.0 Safari/537.36', 'chrome'],
    ['Edge', 'Mozilla/5.0 Chrome/125.0 Safari/537.36 Edg/125.0', 'edge'],
    ['Safari', 'Mozilla/5.0 Version/17.5 Safari/605.1.15', 'safari'],
    ['Firefox', 'Mozilla/5.0 Firefox/126.0', 'firefox'],
    ['Samsung Internet', 'Mozilla/5.0 SamsungBrowser/25.0 Chrome/121.0', 'samsung'],
    ['Opera', 'Mozilla/5.0 Chrome/125.0 OPR/110.0', 'opera'],
    ['Chrome en iOS', 'Mozilla/5.0 (iPhone) CriOS/125.0 Mobile/15E148 Safari/604.1', 'chrome'],
    ['Edge en iOS', 'Mozilla/5.0 (iPhone) EdgiOS/125.0 Mobile/15E148 Safari/605.1.15', 'edge'],
    ['Firefox en iOS', 'Mozilla/5.0 (iPhone) FxiOS/126.0 Mobile/15E148 Safari/605.1.15', 'firefox'],
  ])('detecta %s', (_name, userAgent, expected) => {
    expect(detectInstallBrowser(userAgent)).toBe(expected);
  });
});

describe('isMobileDevice', () => {
  it('es true en Android e iOS', () => {
    expect(isMobileDevice('Mozilla/5.0 (Linux; Android 14)')).toBe(true);
    expect(isMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe(true);
  });

  it('es false en desktop', () => {
    expect(isMobileDevice('Mozilla/5.0 (Windows NT 10.0)')).toBe(false);
  });
});

describe('isInAppBrowser', () => {
  it('detecta Instagram', () => {
    expect(isInAppBrowser('Instagram 123.0')).toBe(true);
  });

  it('detecta WebView Android y Google App', () => {
    expect(
      isInAppBrowser(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A; wv) Version/4.0 Chrome/125 Mobile Safari/537.36'
      )
    ).toBe(true);
    expect(isInAppBrowser('Mozilla/5.0 (iPhone) GSA/320.0 Mobile Safari/605.1')).toBe(true);
  });

  it('no marca Chrome Android', () => {
    expect(isInAppBrowser('Mozilla/5.0 (Linux; Android 14) Chrome/120')).toBe(false);
  });
});

describe('requiresManualInstallGuide', () => {
  it('siempre en iOS', () => {
    expect(requiresManualInstallGuide('ios', true)).toBe(true);
    expect(requiresManualInstallGuide('ios', false)).toBe(true);
  });

  it('en Android solo sin prompt diferido', () => {
    expect(requiresManualInstallGuide('android', false)).toBe(true);
    expect(requiresManualInstallGuide('android', true)).toBe(false);
  });
});

describe('hasActivePushSubscription', () => {
  it('devuelve false cuando no hay suscripcion', async () => {
    getSubscription.mockResolvedValue(null);
    await expect(hasActivePushSubscription()).resolves.toBe(false);
  });

  it('devuelve true cuando existe una suscripcion', async () => {
    getSubscription.mockResolvedValue({ endpoint: 'https://push.example/abc' });
    await expect(hasActivePushSubscription()).resolves.toBe(true);
  });
});

describe('setupServiceWorkerUpdateChecks', () => {
  it('comprueba actualizaciones periodicamente y al recuperar conexion', () => {
    vi.useFakeTimers();
    const update = vi.fn().mockResolvedValue(undefined);
    const registration = { update } as unknown as ServiceWorkerRegistration;
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    setVisibility('visible');

    const cleanup = setupServiceWorkerUpdateChecks(registration, 1_000);
    vi.advanceTimersByTime(1_000);
    window.dispatchEvent(new Event('online'));

    expect(update).toHaveBeenCalledTimes(2);
    cleanup();
    vi.useRealTimers();
  });

  it('no consulta mientras la app esta oculta o sin conexion', () => {
    vi.useFakeTimers();
    const update = vi.fn().mockResolvedValue(undefined);
    const registration = { update } as unknown as ServiceWorkerRegistration;
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    setVisibility('hidden');

    const cleanup = setupServiceWorkerUpdateChecks(registration, 1_000);
    vi.advanceTimersByTime(2_000);

    expect(update).not.toHaveBeenCalled();
    cleanup();
    vi.useRealTimers();
  });
});
