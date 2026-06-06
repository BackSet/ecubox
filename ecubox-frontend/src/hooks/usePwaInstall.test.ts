import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePwaInstall } from './usePwaInstall';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

beforeEach(() => {
  vi.stubGlobal('navigator', {
    userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/120',
    platform: 'Linux armv8l',
    maxTouchPoints: 5,
  });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('usePwaInstall', () => {
  it('abre la guia en Android sin beforeinstallprompt al pulsar Instalar', async () => {
    const { result } = renderHook(() => usePwaInstall());

    await act(async () => {
      await result.current.requestInstall();
    });

    expect(result.current.guideOpen).toBe(true);
    expect(result.current.canUseNativeInstall).toBe(false);
  });

  it('openInstallGuide abre el dialogo', () => {
    const { result } = renderHook(() => usePwaInstall());

    act(() => {
      result.current.openInstallGuide();
    });

    expect(result.current.guideOpen).toBe(true);
  });

  it('usa el instalador nativo en Windows cuando beforeinstallprompt esta disponible', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125',
      platform: 'Win32',
      maxTouchPoints: 0,
    });
    const prompt = vi.fn().mockResolvedValue(undefined);
    const installEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted'; platform: string }>;
    };
    installEvent.prompt = prompt;
    installEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

    const { result } = renderHook(() => usePwaInstall());
    act(() => {
      window.dispatchEvent(installEvent);
    });

    await act(async () => {
      await result.current.requestInstall();
    });

    expect(result.current.platform).toBe('windows');
    expect(prompt).toHaveBeenCalledOnce();
    expect(result.current.isInstalled).toBe(true);
    expect(result.current.guideOpen).toBe(false);
  });
});
