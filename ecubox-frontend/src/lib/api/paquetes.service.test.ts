import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock del cliente axios para inspeccionar los parámetros enviados.
const get = vi.fn();
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
  },
}));

import { getPaqueteResumen, getPaquetesPaginated } from './paquetes.service';

describe('paquetes.service', () => {
  beforeEach(() => {
    get.mockReset();
    get.mockResolvedValue({ data: {} });
  });

  it('getPaqueteResumen envía los filtros estructurales (sin chip/page/size)', async () => {
    await getPaqueteResumen({
      q: 'abc',
      estado: 'REGISTRADO',
      consignatarioId: 7,
      envio: 'EC-1',
      guiaMasterId: 3,
    });
    const [url, config] = get.mock.calls[0];
    expect(url).toMatch(/\/resumen$/);
    expect(config.params).toEqual({
      q: 'abc',
      estado: 'REGISTRADO',
      consignatarioId: 7,
      envio: 'EC-1',
      guiaMasterId: 3,
    });
  });

  it('getPaquetesPaginated envía el chip "vencidos" al servidor (ya no se filtra en cliente)', async () => {
    get.mockResolvedValue({ data: { content: [] } });
    await getPaquetesPaginated({ chip: 'vencidos', page: 0, size: 25 });
    const [, config] = get.mock.calls[0];
    expect(config.params.chip).toBe('vencidos');
  });
});
