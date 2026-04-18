/**
 * Utilidades para generar capturas (PNG/JPEG/canvas) a partir de un nodo
 * del DOM, usando `html-to-image`.
 *
 * Reemplaza al uso histórico de `html2canvas`, ya que `html-to-image`:
 *  - soporta CSS moderno (oklch/oklab) sin necesidad de hacks de normalización,
 *  - produce mejores resultados en alta densidad (retina) sin efectos borrosos,
 *  - tiene una API consistente que también permite obtener `Blob`s y `Canvas`,
 *  - es claramente más liviana y rápida en árboles complejos.
 */
import { toBlob, toCanvas, toJpeg, toPng } from 'html-to-image';

export type SnapshotFormat = 'png' | 'jpeg';

export interface SnapshotOptions {
  /** Multiplicador de pixel ratio. Por defecto 2 (mínimo) o el del dispositivo si es mayor. */
  scale?: number;
  /** Calidad para JPEG (0..1). Ignorado en PNG. */
  quality?: number;
  /** Color de fondo por si la captura cae sobre transparencia. */
  background?: string;
  /** Forzar ancho efectivo (px CSS). Si no se indica, se usa el ancho real del nodo. */
  width?: number;
  /** Permite filtrar nodos (ej. excluir tooltips). */
  filter?: (node: HTMLElement) => boolean;
}

const DEFAULT_BG = '#ffffff';

function buildOptions(node: HTMLElement, opts: SnapshotOptions = {}) {
  const ratio = Math.max(opts.scale ?? 2, window.devicePixelRatio || 1);
  const widthCss = opts.width ?? node.offsetWidth;
  const heightCss = node.offsetHeight;
  return {
    pixelRatio: ratio,
    backgroundColor: opts.background ?? DEFAULT_BG,
    width: widthCss,
    height: heightCss,
    canvasWidth: Math.round(widthCss * ratio),
    canvasHeight: Math.round(heightCss * ratio),
    cacheBust: true,
    style: {
      transformOrigin: 'top left',
      backgroundColor: opts.background ?? DEFAULT_BG,
    },
    quality: opts.quality ?? 0.95,
    filter: opts.filter
      ? (n: HTMLElement) => opts.filter!(n)
      : undefined,
  } as Parameters<typeof toPng>[1];
}

export async function snapshotToDataUrl(
  node: HTMLElement,
  format: SnapshotFormat = 'png',
  opts?: SnapshotOptions,
): Promise<string> {
  const options = buildOptions(node, opts);
  return format === 'jpeg' ? toJpeg(node, options) : toPng(node, options);
}

export async function snapshotToBlob(
  node: HTMLElement,
  format: SnapshotFormat = 'png',
  opts?: SnapshotOptions,
): Promise<Blob> {
  const options = buildOptions(node, opts);
  if (format === 'png') {
    const blob = await toBlob(node, options);
    if (!blob) throw new Error('No se pudo generar la imagen.');
    return blob;
  }
  const dataUrl = await toJpeg(node, options);
  const res = await fetch(dataUrl);
  return res.blob();
}

export async function snapshotToCanvas(
  node: HTMLElement,
  opts?: SnapshotOptions,
): Promise<HTMLCanvasElement> {
  return toCanvas(node, buildOptions(node, opts));
}

/** Descarga un blob como archivo en el navegador. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Copia un blob (PNG) al portapapeles. Lanza error si no es soportado. */
export async function copyImageBlobToClipboard(blob: Blob): Promise<void> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    throw new Error('El portapapeles de imágenes no es soportado por este navegador.');
  }
  const item = new ClipboardItem({ [blob.type]: blob });
  await navigator.clipboard.write([item]);
}

export interface SnapshotPdfOptions extends SnapshotOptions {
  /** Orientación del PDF generado. Por defecto 'portrait'. */
  orientation?: 'portrait' | 'landscape';
  /** Margen en milímetros para cada página. Por defecto 8 mm. */
  margin?: number;
  /** Calidad JPEG (0..1) usada al embeber cada slice. Por defecto 0.92. */
  jpegQuality?: number;
  /** Texto opcional para el pie de página. Por defecto "ECUBOX". */
  footerLeft?: string;
  /** Si true, agrega "Página X de Y" en el pie. Por defecto true. */
  showPageNumbers?: boolean;
}

/**
 * Genera un PDF a partir de la captura del nodo en modo "snapshot": preserva
 * exactamente lo que se ve en pantalla y, cuando el contenido excede una página,
 * **lo divide en múltiples páginas A4** manteniendo la escala 1:1 al ancho útil
 * del PDF (sin distorsión, sin reducir la legibilidad).
 *
 * Estrategia:
 *  1. Renderiza el nodo a un <canvas> usando html-to-image.
 *  2. Calcula `mmPerPx = usableWidthMm / canvas.width` para conservar la escala.
 *  3. Si el alto en mm cabe en la página, lo agrega de una sola vez.
 *  4. Si no cabe, recorta el canvas en franjas verticales del tamaño máximo
 *     que cabe por página y agrega cada franja en una página independiente.
 */
export async function snapshotNodeToPdf(
  node: HTMLElement,
  filename: string,
  opts: SnapshotPdfOptions = {},
): Promise<{ download: () => void; print: () => void; blob: () => Blob }> {
  const { jsPDF } = await import('jspdf');

  const orientation = opts.orientation ?? 'portrait';
  const margin = opts.margin ?? 8;
  const jpegQuality = opts.jpegQuality ?? 0.92;
  const footerLeft = opts.footerLeft ?? 'ECUBOX';
  const showPageNumbers = opts.showPageNumbers ?? true;
  const background = opts.background ?? DEFAULT_BG;

  const canvas = await snapshotToCanvas(node, opts);
  const cw = canvas.width;
  const ch = canvas.height;
  if (cw === 0 || ch === 0) {
    throw new Error('La captura no produjo contenido visible.');
  }

  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const usableW = pageW - margin * 2;
  const footerReserve = showPageNumbers ? 6 : 0;
  const usableH = pageH - margin * 2 - footerReserve;

  const mmPerPx = usableW / cw;
  const totalDrawHmm = ch * mmPerPx;

  if (totalDrawHmm <= usableH) {
    const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
    pdf.addImage(dataUrl, 'JPEG', margin, margin, usableW, totalDrawHmm, undefined, 'FAST');
  } else {
    const slicePx = Math.max(1, Math.floor(usableH / mmPerPx));
    let offsetY = 0;
    let isFirstPage = true;
    while (offsetY < ch) {
      const remaining = ch - offsetY;
      const currentSlicePx = Math.min(slicePx, remaining);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = cw;
      sliceCanvas.height = currentSlicePx;
      const ctx = sliceCanvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo crear el contexto 2D para el slice del PDF.');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, cw, currentSlicePx);
      ctx.drawImage(
        canvas,
        0,
        offsetY,
        cw,
        currentSlicePx,
        0,
        0,
        cw,
        currentSlicePx,
      );
      const sliceUrl = sliceCanvas.toDataURL('image/jpeg', jpegQuality);
      const drawHmm = currentSlicePx * mmPerPx;
      if (!isFirstPage) pdf.addPage('a4', orientation);
      pdf.addImage(sliceUrl, 'JPEG', margin, margin, usableW, drawHmm, undefined, 'FAST');
      offsetY += currentSlicePx;
      isFirstPage = false;
    }
  }

  if (showPageNumbers || footerLeft) {
    const total = pdf.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      pdf.setPage(p);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(130, 130, 130);
      const footerY = pageH - 4;
      if (footerLeft) pdf.text(footerLeft, margin, footerY);
      if (showPageNumbers) {
        pdf.text(`Página ${p} de ${total}`, pageW - margin, footerY, { align: 'right' });
      }
    }
  }

  return {
    download: () => pdf.save(filename),
    print: () => {
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const w = window.open(url);
      if (w) {
        w.onload = () => {
          try {
            w.focus();
            w.print();
          } catch {
            // El usuario puede imprimir manualmente desde la barra del visor PDF.
          }
        };
      }
    },
    blob: () => pdf.output('blob'),
  };
}
