import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from './download';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('downloadBlob', () => {
  it('creates a temporary link and revokes the object URL after a delay', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn().mockReturnValue('blob:ecubox');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    downloadBlob(new Blob(['contenido']), 'reporte.txt', 500);

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download="reporte.txt"]')).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:ecubox');
  });
});
