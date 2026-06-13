import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getTrackingExampleByCodigo,
  getTrackingExamples,
} from './tracking.service';

describe('tracking.service ejemplos', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('carga el listado desde el endpoint público', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ codigo: 'DEMO', titulo: 'Demo', descripcion: 'D', tipo: 'PIEZA' }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await getTrackingExamples();

    expect(result[0]?.codigo).toBe('DEMO');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/v1/tracking/examples');
  });

  it('codifica el código al resolver una pieza de ejemplo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tipo: 'PIEZA', pieza: { numeroGuia: 'DEMO 1/2' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await getTrackingExampleByCodigo('DEMO 1/2');

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('DEMO%201%2F2');
  });
});
