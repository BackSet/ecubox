import { copyText } from '@/lib/clipboard';

export type CompartirResultado =
  | 'shared-file'
  | 'shared-text'
  | 'copied'
  | 'cancelled'
  | 'failed';

interface NavigatorLike {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
}

export interface CompartirCotizacionParams {
  titulo: string;
  texto: string;
  /**
   * Fábrica perezosa del PDF a compartir como archivo. Solo se invoca si
   * el navegador soporta compartir archivos (`navigator.canShare`). Si la
   * generación falla se degrada a compartir texto.
   */
  crearArchivo?: () => Promise<File>;
  /** Inyectables para tests; defaults: globals del navegador. */
  nav?: NavigatorLike;
  copiar?: (texto: string) => Promise<void>;
}

function esCancelacion(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

/**
 * Comparte la cotización siguiendo el patrón de rastreo
 * ({@code useTrackingExport.handleShare}), extendido con archivo:
 *
 * 1. Si el navegador soporta compartir archivos, comparte el PDF completo.
 * 2. Si solo soporta Web Share de texto, comparte el texto de la cotización.
 * 3. Sin Web Share, copia el texto al portapapeles (mismo fallback que rastreo).
 * 4. La cancelación del usuario (AbortError) NO es un error.
 *
 * Todo ocurre en el dispositivo: no se envía nada a backend ni terceros.
 */
export async function compartirCotizacion({
  titulo,
  texto,
  crearArchivo,
  nav = typeof navigator !== 'undefined' ? (navigator as NavigatorLike) : {},
  copiar = copyText,
}: CompartirCotizacionParams): Promise<CompartirResultado> {
  if (typeof nav.share === 'function') {
    // 1) Archivo completo, si el navegador declara soportarlo.
    if (crearArchivo && typeof nav.canShare === 'function') {
      let archivo: File | null = null;
      try {
        archivo = await crearArchivo();
      } catch {
        archivo = null; // la generación falló: degradar a texto
      }
      if (archivo && nav.canShare({ files: [archivo] })) {
        try {
          await nav.share({ title: titulo, text: texto, files: [archivo] });
          return 'shared-file';
        } catch (err) {
          if (esCancelacion(err)) return 'cancelled';
          // Algunos navegadores aceptan canShare pero fallan al compartir
          // archivos: degradar a texto.
        }
      }
    }

    // 2) Texto por Web Share.
    try {
      await nav.share({ title: titulo, text: texto });
      return 'shared-text';
    } catch (err) {
      if (esCancelacion(err)) return 'cancelled';
    }
  }

  // 3) Fallback: portapapeles (igual que rastreo).
  try {
    await copiar(texto);
    return 'copied';
  } catch {
    return 'failed';
  }
}
