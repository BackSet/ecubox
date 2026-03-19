import type { jsPDF } from 'jspdf';

export type PdfMode = 'download' | 'print';

interface PdfActionOptions {
  mode: PdfMode;
  filename: string;
}

export function runJsPdfAction(doc: jsPDF, options: PdfActionOptions) {
  if (options.mode === 'download') {
    doc.save(options.filename);
    return;
  }

  const blob = doc.output('blob');
  const url = window.URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '100vw';
  iframe.style.height = '100vh';
  iframe.style.border = '0';
  iframe.style.zIndex = '9999';
  iframe.src = url;
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        iframe.remove();
      }, 30000);
    }, 250);
  };
  document.body.appendChild(iframe);
}
