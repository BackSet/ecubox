import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => {
  const toast = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
    dismiss: vi.fn(),
  });
  return { toast };
});

import { toast } from 'sonner';
import { notify } from './notify';

describe('notify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('acepta la descripción como string en el segundo argumento', () => {
    notify.success('Paquete registrado', 'Pieza agregada a la guía master X.');
    expect(toast.success).toHaveBeenCalledWith('Paquete registrado', {
      description: 'Pieza agregada a la guía master X.',
    });
  });

  it('sigue aceptando opciones de sonner como objeto', () => {
    notify.error('Falló', { description: 'Detalle', duration: 1000 });
    expect(toast.error).toHaveBeenCalledWith('Falló', {
      duration: 1000,
      description: 'Detalle',
    });
  });

  it('error sin descripción conserva la duración por defecto', () => {
    notify.error('Falló');
    expect(toast.error).toHaveBeenCalledWith('Falló', { duration: 6000 });
  });

  it('run acepta success con título y descripción', async () => {
    await notify.run(Promise.resolve({ total: 3 }), {
      loading: 'Aplicando estado de rastreo...',
      success: (r) => ({ title: 'Estado aplicado', description: `${r.total} paquetes actualizados.` }),
    });
    expect(toast.loading).toHaveBeenCalledWith('Aplicando estado de rastreo...', undefined);
    expect(toast.success).toHaveBeenCalledWith('Estado aplicado', {
      id: 'toast-id',
      description: '3 paquetes actualizados.',
    });
  });

  it('run sin error explícito usa el mensaje del backend', async () => {
    const apiError = { response: { data: { message: 'La guía ya está cerrada.' } } };
    await expect(
      notify.run(Promise.reject(apiError), { loading: 'Guardando...', success: 'Listo' }),
    ).rejects.toBe(apiError);
    expect(toast.error).toHaveBeenCalledWith('La guía ya está cerrada.', {
      id: 'toast-id',
      duration: 6000,
      description: undefined,
    });
  });
});
