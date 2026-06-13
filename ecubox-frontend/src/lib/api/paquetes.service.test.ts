import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock del cliente axios para inspeccionar los parámetros enviados.
const get = vi.fn();
const post = vi.fn();
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
}));

import {
  getHistorialRevisionPaquete,
  getPaqueteResumen,
  getPaquetesPaginated,
  iniciarRevisionPaquete,
  resolverRevisionPaquete,
} from './paquetes.service';

describe('paquetes.service', () => {
  beforeEach(() => {
    get.mockReset();
    get.mockResolvedValue({ data: {} });
    post.mockReset();
    post.mockResolvedValue({ data: {} });
  });

  it('getPaqueteResumen envía los filtros estructurales (sin chip/page/size)', async () => {
    await getPaqueteResumen({
      q: 'abc',
      estado: 'REGISTRADO',
      consignatarioId: 7,
      envio: 'EC-1',
      guiaMasterId: 3,
      bandeja: 'en_revision',
    });
    const [url, config] = get.mock.calls[0];
    expect(url).toMatch(/\/resumen$/);
    expect(config.params).toEqual({
      q: 'abc',
      estado: 'REGISTRADO',
      consignatarioId: 7,
      envio: 'EC-1',
      guiaMasterId: 3,
      bandeja: 'en_revision',
    });
  });

  it('getPaquetesPaginated envía el chip "vencidos" al servidor (ya no se filtra en cliente)', async () => {
    get.mockResolvedValue({ data: { content: [] } });
    await getPaquetesPaginated({ chip: 'vencidos', page: 0, size: 25 });
    const [, config] = get.mock.calls[0];
    expect(config.params.chip).toBe('vencidos');
    expect(config.params.bandeja).toBe('todos');
  });

  it('getPaquetesPaginated envía la bandeja operativa antes de paginar', async () => {
    await getPaquetesPaginated({ bandeja: 'operativos', page: 2, size: 10 });
    const [, config] = get.mock.calls[0];
    expect(config.params).toMatchObject({ bandeja: 'operativos', page: 2, size: 10 });
  });

  it('usa los endpoints canónicos de inicio, resolución e historial', async () => {
    await iniciarRevisionPaquete(8, {
      motivo: 'OTRO',
      observacion: 'Verificar sello',
    });
    await resolverRevisionPaquete(8, { observacion: 'Validado' });
    await getHistorialRevisionPaquete(8);

    expect(post.mock.calls[0][0]).toMatch(/\/8\/revisiones$/);
    expect(post.mock.calls[1][0]).toMatch(/\/8\/revisiones\/activa\/resolver$/);
    expect(get.mock.calls[0][0]).toMatch(/\/8\/revisiones$/);
  });
});
