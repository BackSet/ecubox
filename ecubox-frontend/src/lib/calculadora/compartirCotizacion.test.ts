import { describe, expect, it, vi } from 'vitest';
import { compartirCotizacion } from './compartirCotizacion';

const params = { titulo: 'Cotización de envío ECUBOX', texto: 'Total: $10,00' };

function archivoFake(): Promise<File> {
  return Promise.resolve(new File(['%PDF-fake'], 'cotizacion.pdf', { type: 'application/pdf' }));
}

describe('compartirCotizacion', () => {
  it('comparte el archivo cuando el navegador lo soporta', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);

    const r = await compartirCotizacion({
      ...params,
      crearArchivo: archivoFake,
      nav: { share, canShare },
    });

    expect(r).toBe('shared-file');
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ title: params.titulo, files: expect.any(Array) }),
    );
  });

  it('comparte solo texto cuando no se pueden compartir archivos', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(false);

    const r = await compartirCotizacion({
      ...params,
      crearArchivo: archivoFake,
      nav: { share, canShare },
    });

    expect(r).toBe('shared-text');
    expect(share).toHaveBeenCalledWith({ title: params.titulo, text: params.texto });
  });

  it('sin Web Share copia el texto al portapapeles (fallback de rastreo)', async () => {
    const copiar = vi.fn().mockResolvedValue(undefined);

    const r = await compartirCotizacion({ ...params, nav: {}, copiar });

    expect(r).toBe('copied');
    expect(copiar).toHaveBeenCalledWith(params.texto);
  });

  it('la cancelación del usuario no se reporta como error', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancelado', 'AbortError'));

    const r = await compartirCotizacion({ ...params, nav: { share } });

    expect(r).toBe('cancelled');
  });

  it('un error real de share degrada al portapapeles', async () => {
    const share = vi.fn().mockRejectedValue(new Error('share roto'));
    const copiar = vi.fn().mockResolvedValue(undefined);

    const r = await compartirCotizacion({ ...params, nav: { share }, copiar });

    expect(r).toBe('copied');
  });

  it('devuelve failed cuando ni compartir ni copiar funcionan', async () => {
    const copiar = vi.fn().mockRejectedValue(new Error('clipboard bloqueado'));

    const r = await compartirCotizacion({ ...params, nav: {}, copiar });

    expect(r).toBe('failed');
  });

  it('si la generación del archivo falla, degrada a compartir texto', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);

    const r = await compartirCotizacion({
      ...params,
      crearArchivo: () => Promise.reject(new Error('pdf roto')),
      nav: { share, canShare },
    });

    expect(r).toBe('shared-text');
    expect(share).toHaveBeenCalledWith({ title: params.titulo, text: params.texto });
  });
});
