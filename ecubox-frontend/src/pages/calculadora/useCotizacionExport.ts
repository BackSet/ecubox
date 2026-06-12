import { useCallback } from 'react';
import type { RefObject } from 'react';
import { notify } from '@/lib/notify';
import type { SnapshotFormat, SnapshotOptions } from '@/lib/exporters/domSnapshot';
import {
  buildCotizacionFilename,
  cotizacionATexto,
  type CotizacionCalculadora,
} from '@/lib/calculadora/cotizacion';
import {
  compartirCotizacion,
  type CompartirResultado,
} from '@/lib/calculadora/compartirCotizacion';

export type CotizacionPdfMode = 'documento' | 'snapshot';

/** Opciones de captura del resultado (ancho fijo para una salida estable). */
const SNAPSHOT_OPTS: SnapshotOptions = { background: '#FFFFFF', scale: 2, width: 760 };

/**
 * Orquesta las salidas de la cotización reutilizando las primitivas
 * compartidas de exportación (las mismas que usa Rastreo): documento PDF
 * estructurado (`buildCotizacionPdf`), captura "como en pantalla"
 * (`snapshotNodeToPdf` / `snapshotToBlob`), Web Share con archivo
 * (`compartirCotizacion`) y portapapeles de imagen. No recalcula nada:
 * parte del modelo {@link CotizacionCalculadora} ya construido.
 */
export function useCotizacionExport(
  exportRef: RefObject<HTMLDivElement | null>,
  cotizacion: CotizacionCalculadora | null,
) {
  const filename = useCallback(
    (ext: string) =>
      cotizacion ? buildCotizacionFilename(ext, cotizacion.generadaEn) : `cotizacion.${ext}`,
    [cotizacion],
  );

  const buildStructuredDoc = useCallback(async () => {
    if (!cotizacion) return null;
    const { buildCotizacionPdf } = await import('@/lib/pdf/builders/cotizacionPdf');
    return buildCotizacionPdf(cotizacion);
  }, [cotizacion]);

  const crearArchivoPdf = useCallback(async () => {
    const doc = await buildStructuredDoc();
    if (!doc) throw new Error('No hay cotización para compartir.');
    const blob = doc.output('blob');
    return new File([blob], filename('pdf'), { type: 'application/pdf' });
  }, [buildStructuredDoc, filename]);

  const handleShare = useCallback(async (): Promise<CompartirResultado> => {
    if (!cotizacion) return 'failed';
    const resultado = await compartirCotizacion({
      titulo: 'Cotización de envío ECUBOX',
      texto: cotizacionATexto(cotizacion),
      crearArchivo: crearArchivoPdf,
    });
    if (resultado === 'shared-file' || resultado === 'shared-text') {
      notify.success('Cotización compartida');
    } else if (resultado === 'copied') {
      notify.info(
        'Cotización copiada al portapapeles',
        'Este navegador no permite compartir directamente; pégala donde la necesites.',
      );
    } else if (resultado === 'failed') {
      notify.error(
        'No se pudo compartir la cotización',
        'Puedes usar Copiar o Exportar como alternativa.',
      );
    }
    // 'cancelled': el usuario cerró el diálogo; no es un error.
    return resultado;
  }, [cotizacion, crearArchivoPdf]);

  const handleCopyTexto = useCallback(async () => {
    if (!cotizacion) return;
    const { copyText } = await import('@/lib/clipboard');
    try {
      await copyText(cotizacionATexto(cotizacion));
      notify.success('Cotización copiada');
    } catch {
      notify.error('No se pudo copiar');
    }
  }, [cotizacion]);

  const handleDownloadPdf = useCallback(
    async (mode: CotizacionPdfMode = 'documento') => {
      if (!cotizacion) return;
      try {
        await notify.run(
          (async () => {
            if (mode === 'documento') {
              const [doc, { runJsPdfAction }] = await Promise.all([
                buildStructuredDoc(),
                import('@/lib/pdf/actions'),
              ]);
              if (!doc) throw new Error('No hay datos para exportar.');
              runJsPdfAction(doc, { mode: 'download', filename: filename('pdf') });
              return;
            }
            const node = exportRef.current;
            if (!node) throw new Error('No hay contenido para capturar.');
            const { snapshotNodeToPdf } = await import('@/lib/exporters/domSnapshot');
            const result = await snapshotNodeToPdf(node, filename('pdf'), {
              ...SNAPSHOT_OPTS,
              orientation: 'portrait',
              margin: 8,
              jpegQuality: 0.92,
              footerLeft: 'ECUBOX · Cotización',
            });
            result.download();
          })(),
          {
            loading:
              mode === 'documento'
                ? 'Generando PDF documento...'
                : 'Generando PDF como en pantalla...',
            success: mode === 'documento' ? 'PDF documento descargado' : 'PDF visual descargado',
            error: (err) =>
              `No se pudo generar el PDF. ${err instanceof Error ? err.message : ''}`.trim(),
          },
        );
      } catch {
        // notificado por notify.run
      }
    },
    [cotizacion, buildStructuredDoc, filename, exportRef],
  );

  const handlePrintPdf = useCallback(
    async (mode: CotizacionPdfMode = 'documento') => {
      if (!cotizacion) return;
      try {
        await notify.run(
          (async () => {
            if (mode === 'documento') {
              const [doc, { runJsPdfAction }] = await Promise.all([
                buildStructuredDoc(),
                import('@/lib/pdf/actions'),
              ]);
              if (!doc) throw new Error('No hay datos para imprimir.');
              runJsPdfAction(doc, { mode: 'print', filename: filename('pdf') });
              return;
            }
            const node = exportRef.current;
            if (!node) throw new Error('No hay contenido para capturar.');
            const { snapshotNodeToPdf } = await import('@/lib/exporters/domSnapshot');
            const result = await snapshotNodeToPdf(node, filename('pdf'), {
              ...SNAPSHOT_OPTS,
              orientation: 'portrait',
              margin: 8,
              jpegQuality: 0.92,
              footerLeft: 'ECUBOX · Cotización',
            });
            result.print();
          })(),
          {
            loading:
              mode === 'documento'
                ? 'Preparando documento para imprimir...'
                : 'Preparando vista para imprimir...',
            success: 'Vista previa de impresión abierta',
            error: 'No se pudo abrir la vista previa',
          },
        );
      } catch {
        // notificado
      }
    },
    [cotizacion, buildStructuredDoc, filename, exportRef],
  );

  const handleDownloadImage = useCallback(
    async (format: SnapshotFormat = 'png') => {
      if (!cotizacion) return;
      try {
        await notify.run(
          (async () => {
            const node = exportRef.current;
            if (!node) throw new Error('No hay contenido para capturar.');
            const { downloadBlob, snapshotToBlob } = await import('@/lib/exporters/domSnapshot');
            const blob = await snapshotToBlob(node, format, {
              ...SNAPSHOT_OPTS,
              quality: format === 'jpeg' ? 0.92 : undefined,
            });
            downloadBlob(blob, filename(format === 'png' ? 'png' : 'jpg'));
          })(),
          {
            loading: format === 'png' ? 'Generando imagen PNG...' : 'Generando imagen JPEG...',
            success: 'Imagen descargada',
            error: (err) =>
              `No se pudo descargar la imagen. ${err instanceof Error ? err.message : ''}`.trim(),
          },
        );
      } catch {
        // notificado
      }
    },
    [cotizacion, filename, exportRef],
  );

  const handleCopyImage = useCallback(async () => {
    if (!cotizacion) return;
    try {
      await notify.run(
        (async () => {
          const node = exportRef.current;
          if (!node) throw new Error('No hay contenido para capturar.');
          const { copyImageBlobToClipboard, snapshotToBlob } = await import(
            '@/lib/exporters/domSnapshot'
          );
          const blob = await snapshotToBlob(node, 'png', SNAPSHOT_OPTS);
          await copyImageBlobToClipboard(blob);
        })(),
        {
          loading: 'Copiando imagen al portapapeles...',
          success: 'Imagen copiada',
          error: (err) =>
            `No se pudo copiar la imagen. ${err instanceof Error ? err.message : ''}`.trim(),
        },
      );
    } catch {
      // notificado
    }
  }, [cotizacion, exportRef]);

  return {
    handleShare,
    handleCopyTexto,
    handleDownloadPdf,
    handlePrintPdf,
    handleDownloadImage,
    handleCopyImage,
  };
}
