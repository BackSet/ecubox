import { beforeEach, describe, expect, it, vi } from 'vitest';
import { copyText } from '@/lib/clipboard';
import { shareWithFallback } from './share';

vi.mock('@/lib/clipboard', () => ({
  copyText: vi.fn(),
}));

const shareData: ShareData = {
  title: 'Cotización ECUBOX',
  text: 'Cotización completa',
  url: 'https://ecubox.org/calculadora',
};

describe('shareWithFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
  });

  it('usa Web Share cuando está disponible', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });

    await expect(
      shareWithFallback({ data: shareData, fallbackText: shareData.text ?? '' }),
    ).resolves.toBe('shared');

    expect(share).toHaveBeenCalledWith(shareData);
    expect(copyText).not.toHaveBeenCalled();
  });

  it('copia el fallback cuando Web Share no está disponible', async () => {
    vi.mocked(copyText).mockResolvedValue(undefined);

    await expect(
      shareWithFallback({ data: shareData, fallbackText: 'Cotización completa' }),
    ).resolves.toBe('copied');

    expect(copyText).toHaveBeenCalledWith('Cotización completa');
  });

  it('usa el fallback si Web Share falla por una causa no voluntaria', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('Share unavailable')),
    });
    vi.mocked(copyText).mockResolvedValue(undefined);

    await expect(
      shareWithFallback({ data: shareData, fallbackText: 'Cotización completa' }),
    ).resolves.toBe('copied');

    expect(copyText).toHaveBeenCalledWith('Cotización completa');
  });

  it('trata AbortError como cancelación y no ejecuta el fallback', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new DOMException('Cancelado', 'AbortError')),
    });

    await expect(
      shareWithFallback({ data: shareData, fallbackText: 'Cotización completa' }),
    ).resolves.toBe('cancelled');

    expect(copyText).not.toHaveBeenCalled();
  });

  it('reporta fallo cuando tampoco puede copiar el fallback', async () => {
    vi.mocked(copyText).mockRejectedValue(new Error('Clipboard unavailable'));

    await expect(
      shareWithFallback({ data: shareData, fallbackText: 'Cotización completa' }),
    ).resolves.toBe('failed');
  });
});
