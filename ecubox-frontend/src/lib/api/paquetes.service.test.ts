import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock del cliente openapi-fetch para inspeccionar ruta, query y body enviados.
const GET = vi.fn();
const POST = vi.fn();
vi.mock('@/lib/api/openapi-client', () => ({
  openapiClient: {
    GET: (...args: unknown[]) => GET(...args),
    POST: (...args: unknown[]) => POST(...args),
    PUT: vi.fn(),
    PATCH: vi.fn(),
    DELETE: vi.fn(),
  },
  unwrap: async (p: Promise<{ data: unknown }>) => (await p).data,
  ensureOk: async (p: Promise<unknown>) => {
    await p;
  },
}));

import {
  getHistorialRevisionPaquete,
  getPaqueteResumen,
  getPaquetesPaginated,
  iniciarRevisionPaquete,
  resolverRevisionPaquete,
} from './paquetes.service';

type Call = [string, { params?: { query?: Record<string, unknown>; path?: Record<string, unknown> } }];

describe('paquetes.service', () => {
  beforeEach(() => {
    GET.mockReset();
    GET.mockResolvedValue({ data: {} });
    POST.mockReset();
    POST.mockResolvedValue({ data: {} });
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
    const [url, opts] = GET.mock.calls[0] as Call;
    expect(url).toMatch(/\/resumen$/);
    expect(opts.params?.query).toEqual({
      q: 'abc',
      estado: 'REGISTRADO',
      consignatarioId: 7,
      envio: 'EC-1',
      guiaMasterId: 3,
      bandeja: 'en_revision',
    });
  });

  it('getPaquetesPaginated envía el chip "vencidos" al servidor (ya no se filtra en cliente)', async () => {
    GET.mockResolvedValue({ data: { content: [] } });
    await getPaquetesPaginated({ chip: 'vencidos', page: 0, size: 25 });
    const [, opts] = GET.mock.calls[0] as Call;
    expect(opts.params?.query?.chip).toBe('vencidos');
    expect(opts.params?.query?.bandeja).toBe('todos');
  });

  it('getPaquetesPaginated envía la bandeja operativa antes de paginar', async () => {
    await getPaquetesPaginated({ bandeja: 'operativos', page: 2, size: 10 });
    const [, opts] = GET.mock.calls[0] as Call;
    expect(opts.params?.query).toMatchObject({ bandeja: 'operativos', page: 2, size: 10 });
  });

  it('usa los endpoints canónicos de inicio, resolución e historial', async () => {
    await iniciarRevisionPaquete(8, {
      motivo: 'OTRO',
      observacion: 'Verificar sello',
    });
    await resolverRevisionPaquete(8, { observacion: 'Validado' });
    await getHistorialRevisionPaquete(8);

    const iniciar = POST.mock.calls[0] as Call;
    const resolver = POST.mock.calls[1] as Call;
    const historial = GET.mock.calls[0] as Call;
    expect(iniciar[0]).toMatch(/\/revisiones$/);
    expect(iniciar[1].params?.path?.paqueteId).toBe(8);
    expect(resolver[0]).toMatch(/\/revisiones\/activa\/resolver$/);
    expect(resolver[1].params?.path?.paqueteId).toBe(8);
    expect(historial[0]).toMatch(/\/revisiones$/);
    expect(historial[1].params?.path?.paqueteId).toBe(8);
  });
});
