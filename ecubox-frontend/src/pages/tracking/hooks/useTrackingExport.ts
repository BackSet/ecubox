import { useCallback, useMemo } from 'react';
import type { RefObject } from 'react';
import type { TrackingResolveResponse } from '@/lib/api/tracking.service';
import { copyText } from '@/lib/clipboard';
import { notify } from '@/lib/notify';
import type { SnapshotFormat } from '@/lib/exporters/domSnapshot';
import { TRACKING_SNAPSHOT_OPTIONS } from '@/lib/exporters/trackingSnapshotOptions';
import { codigoFromResolved } from '@/lib/tracking/trackingDisplayUtils';

export type TrackingPdfMode = 'estructurado' | 'snapshot';

export interface UseTrackingExportOptions {
  resolved: TrackingResolveResponse | null;
  codigo: string;
  shareUrl: string;
}

function buildExportFilename(resolved: TrackingResolveResponse, extension: string): string {
  const baseRaw =
    resolved.tipo === 'GUIA_MASTER'
      ? resolved.master?.trackingBase ?? 'tracking-master'
      : resolved.pieza?.numeroGuia ?? 'tracking';
  const base = baseRaw.replace(/[^A-Za-z0-9._-]+/g, '_');
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const prefix = resolved.tipo === 'GUIA_MASTER' ? 'consolidado' : 'tracking';
  return `${prefix}-${base}-${yyyy}${mm}${dd}.${extension}`;
}

export function useTrackingExport(
  exportRef: RefObject<HTMLDivElement | null>,
  { resolved, codigo, shareUrl }: UseTrackingExportOptions
) {
  const refLabel = useMemo(
    () => (resolved ? codigoFromResolved(resolved, codigo) : codigo),
    [resolved, codigo]
  );

  const withSnapshotLayout = useCallback(
    async <T,>(fn: (node: HTMLDivElement) => Promise<T>): Promise<T | undefined> => {
      const node = exportRef.current;
      if (!node || !resolved) return undefined;
      node.classList.add('tracking-export-capture');
      try {
        return await fn(node);
      } finally {
        node.classList.remove('tracking-export-capture');
      }
    },
    [exportRef, resolved]
  );

  const handleShare = useCallback(async (): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> => {
    if (!shareUrl || !resolved) return 'failed';
    const cod = codigoFromResolved(resolved, codigo);
    const title = 'Rastreo de envío ECUBOX';
    const text = `Revisa el estado de tu envío con el código ${cod}.`;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return 'shared';
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return 'cancelled';
        }
      }
    }

    try {
      await copyText(shareUrl);
      return 'copied';
    } catch {
      notify.error('No se pudo copiar el enlace.');
      return 'failed';
    }
  }, [shareUrl, resolved, codigo]);

  const buildStructuredDoc = useCallback(async () => {
    if (!resolved) return null;
    if (resolved.tipo === 'GUIA_MASTER' && resolved.master) {
      const { buildTrackingMasterPdf } = await import('@/lib/pdf/builders/trackingMasterPdf');
      return buildTrackingMasterPdf(resolved.master);
    }
    if (resolved.tipo === 'PIEZA' && resolved.pieza) {
      const { buildTrackingPdf } = await import('@/lib/pdf/builders/trackingPdf');
      return buildTrackingPdf(resolved.pieza);
    }
    return null;
  }, [resolved]);

  const handleDownloadImage = useCallback(
    async (format: SnapshotFormat = 'png') => {
      if (!resolved) return;
      try {
        await notify.run(
          (async () => {
            const { downloadBlob, snapshotToBlob } = await import('@/lib/exporters/domSnapshot');
            await withSnapshotLayout(async (node) => {
              const blob = await snapshotToBlob(node, format, {
                ...TRACKING_SNAPSHOT_OPTIONS,
                quality: format === 'jpeg' ? 0.92 : undefined,
              });
              downloadBlob(blob, buildExportFilename(resolved, format === 'png' ? 'png' : 'jpg'));
            });
          })(),
          {
            loading: format === 'png' ? 'Generando imagen PNG...' : 'Generando imagen JPEG...',
            success: 'Imagen descargada',
            error: (err) =>
              `No se pudo descargar la imagen. ${err instanceof Error ? err.message : ''}`.trim(),
          }
        );
      } catch {
        // notificado
      }
    },
    [resolved, withSnapshotLayout]
  );

  const handleCopyImage = useCallback(async () => {
    if (!resolved) return;
    try {
      await notify.run(
        (async () => {
          const { copyImageBlobToClipboard, snapshotToBlob } = await import(
            '@/lib/exporters/domSnapshot'
          );
          await withSnapshotLayout(async (node) => {
            const blob = await snapshotToBlob(node, 'png', TRACKING_SNAPSHOT_OPTIONS);
            await copyImageBlobToClipboard(blob);
          });
        })(),
        {
          loading: 'Copiando imagen al portapapeles...',
          success: 'Imagen copiada',
          error: (err) =>
            `No se pudo copiar la imagen. ${err instanceof Error ? err.message : ''}`.trim(),
        }
      );
    } catch {
      // notificado
    }
  }, [resolved, withSnapshotLayout]);

  const handleDownloadPdf = useCallback(
    async (mode: TrackingPdfMode = 'estructurado') => {
      if (!resolved) return;
      const filename = buildExportFilename(resolved, 'pdf');
      try {
        await notify.run(
          (async () => {
            if (mode === 'estructurado') {
              const [doc, { runJsPdfAction }] = await Promise.all([
                buildStructuredDoc(),
                import('@/lib/pdf/actions'),
              ]);
              if (!doc) throw new Error('No hay datos disponibles para exportar.');
              runJsPdfAction(doc, { mode: 'download', filename });
              return;
            }
            const { snapshotNodeToPdf } = await import('@/lib/exporters/domSnapshot');
            await withSnapshotLayout(async (node) => {
              const result = await snapshotNodeToPdf(node, filename, {
                ...TRACKING_SNAPSHOT_OPTIONS,
                orientation: 'portrait',
                margin: 8,
                jpegQuality: 0.92,
                footerLeft: `ECUBOX · ${refLabel}`,
              });
              result.download();
            });
          })(),
          {
            loading:
              mode === 'estructurado'
                ? 'Generando PDF documento...'
                : 'Generando PDF como en pantalla...',
            success:
              mode === 'estructurado' ? 'PDF documento descargado' : 'PDF visual descargado',
            error: (err) =>
              `No se pudo generar el PDF. ${err instanceof Error ? err.message : ''}`.trim(),
          }
        );
      } catch {
        // notificado
      }
    },
    [resolved, buildStructuredDoc, withSnapshotLayout, refLabel]
  );

  const handlePrintPdf = useCallback(
    async (mode: TrackingPdfMode = 'estructurado') => {
      if (!resolved) return;
      const filename = buildExportFilename(resolved, 'pdf');
      try {
        await notify.run(
          (async () => {
            if (mode === 'estructurado') {
              const [doc, { runJsPdfAction }] = await Promise.all([
                buildStructuredDoc(),
                import('@/lib/pdf/actions'),
              ]);
              if (!doc) throw new Error('No hay datos disponibles para imprimir.');
              runJsPdfAction(doc, { mode: 'print', filename });
              return;
            }
            const { snapshotNodeToPdf } = await import('@/lib/exporters/domSnapshot');
            await withSnapshotLayout(async (node) => {
              const result = await snapshotNodeToPdf(node, filename, {
                ...TRACKING_SNAPSHOT_OPTIONS,
                orientation: 'portrait',
                margin: 8,
                jpegQuality: 0.92,
                footerLeft: `ECUBOX · ${refLabel}`,
              });
              result.print();
            });
          })(),
          {
            loading:
              mode === 'estructurado'
                ? 'Preparando documento para imprimir...'
                : 'Preparando vista de pantalla para imprimir...',
            success: 'Vista previa de impresión abierta',
            error: 'No se pudo abrir la vista previa',
          }
        );
      } catch {
        // notificado
      }
    },
    [resolved, buildStructuredDoc, withSnapshotLayout, refLabel]
  );

  return {
    handleShare,
    handlePrintPdf,
    handleDownloadPdf,
    handleDownloadImage,
    handleCopyImage,
  };
}
