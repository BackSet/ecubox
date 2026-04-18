import type { jsPDF } from 'jspdf';

export type PdfMode = 'download' | 'print';

interface PdfActionOptions {
  mode: PdfMode;
  filename: string;
  /**
   * Modo de impresion:
   * - "popup" (default): abre una ventana emergente con el PDF embebido y
   *   lanza el dialogo de impresion del navegador. El usuario puede cerrar
   *   la ventana cuando termine.
   * - "iframe": usa un iframe oculto (modo legacy). Util si el bloqueo de
   *   popups del navegador impide abrir ventanas.
   */
  printMode?: 'popup' | 'iframe';
}

export function runJsPdfAction(doc: jsPDF, options: PdfActionOptions) {
  if (options.mode === 'download') {
    doc.save(options.filename);
    return;
  }

  const blob = doc.output('blob');
  const url = window.URL.createObjectURL(blob);
  const printMode = options.printMode ?? 'popup';

  if (printMode === 'popup') {
    openPrintPopup(url, options.filename);
    return;
  }

  printWithIframe(url);
}

function printWithIframe(blobUrl: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '100vw';
  iframe.style.height = '100vh';
  iframe.style.border = '0';
  iframe.style.zIndex = '9999';
  iframe.src = blobUrl;
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
        iframe.remove();
      }, 30000);
    }, 250);
  };
  document.body.appendChild(iframe);
}

/**
 * Abre una ventana emergente con un visor PDF y dispara el dialogo de
 * impresion automaticamente cuando el documento termine de cargar.
 *
 * Si el navegador bloquea los popups, hacemos fallback al modo iframe
 * para que la impresion siga funcionando sin perder la accion del usuario.
 */
function openPrintPopup(blobUrl: string, filename: string) {
  // Tamano razonable para vista previa antes de imprimir
  const width = Math.min(900, window.screen.availWidth - 80);
  const height = Math.min(1100, window.screen.availHeight - 80);
  const left = Math.max(0, (window.screen.availWidth - width) / 2);
  const top = Math.max(0, (window.screen.availHeight - height) / 2);

  const popup = window.open(
    '',
    '_blank',
    `popup=yes,width=${Math.round(width)},height=${Math.round(height)},left=${Math.round(left)},top=${Math.round(top)},scrollbars=yes,resizable=yes`,
  );

  if (!popup) {
    // Fallback: si el popup esta bloqueado, reusamos el iframe full-screen
    printWithIframe(blobUrl);
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(filename)}</title>
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #1f2937; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #f9fafb; }
    .toolbar { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; background: #111827; border-bottom: 1px solid #374151; gap: 12px; }
    .toolbar h1 { margin: 0; font-size: 13px; font-weight: 600; letter-spacing: .02em; opacity: .9; }
    .toolbar .actions { display: flex; gap: 8px; }
    .toolbar button { background: #2563af; color: #fff; border: 0; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: 500; }
    .toolbar button:hover { background: #1d4f8f; }
    .toolbar button.secondary { background: #374151; }
    .toolbar button.secondary:hover { background: #4b5563; }
    .frame-wrap { position: absolute; inset: 42px 0 0 0; }
    iframe { width: 100%; height: 100%; border: 0; background: #1f2937; }
  </style>
</head>
<body>
  <div class="toolbar">
    <h1>${escapeHtml(filename)}</h1>
    <div class="actions">
      <button id="btn-print" type="button">Imprimir</button>
      <button id="btn-close" class="secondary" type="button">Cerrar</button>
    </div>
  </div>
  <div class="frame-wrap">
    <iframe id="pdf" src="${blobUrl}" title="Vista previa de impresion"></iframe>
  </div>
  <script>
    (function () {
      var frame = document.getElementById('pdf');
      var btnPrint = document.getElementById('btn-print');
      var btnClose = document.getElementById('btn-close');
      var didPrint = false;
      function doPrint() {
        try {
          if (frame.contentWindow) {
            frame.contentWindow.focus();
            frame.contentWindow.print();
          } else {
            window.print();
          }
        } catch (err) {
          window.print();
        }
      }
      btnPrint.addEventListener('click', doPrint);
      btnClose.addEventListener('click', function () { window.close(); });
      frame.addEventListener('load', function () {
        if (didPrint) return;
        didPrint = true;
        setTimeout(doPrint, 350);
      });
    })();
  </script>
</body>
</html>`;

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();

  // Liberar el blob cuando la ventana se cierre
  const interval = window.setInterval(() => {
    if (popup.closed) {
      window.URL.revokeObjectURL(blobUrl);
      window.clearInterval(interval);
    }
  }, 1000);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });
}
