import { jsPDF } from 'jspdf';
import type { Despacho, TamanioSaca } from '@/types/despacho';
import { PDF_THEME, drawDivider, drawFooter, setPdfSubtitle, setPdfTitle } from '@/lib/pdf/theme';

const TAMANIO_LABELS: Record<TamanioSaca, string> = {
  INDIVIDUAL: 'Paquete individual',
  PEQUENO: 'Saca pequena',
  MEDIANO: 'Saca mediana',
  GRANDE: 'Saca grande',
};

function formatFechaHora(s?: string): string {
  if (!s) return '-';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
}

function safe(value?: string | null): string {
  return value && value.trim() ? value.trim() : '-';
}

export function buildDespachoPdf(despacho: Despacho): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = PDF_THEME.margin;
  const pageWidth = PDF_THEME.pageWidthLandscape - margin * 2;
  const pageBottom = PDF_THEME.pageBottom;
  let y = margin;

  const sacas = despacho.sacas ?? [];
  const totalPaquetes = sacas.reduce((acc, s) => acc + (s.paquetes?.length ?? 0), 0);

  const addHeader = () => {
    y = margin;
    setPdfTitle(doc, 'DOCUMENTO DE DESPACHO', margin, y);
    y += 6;

    setPdfSubtitle(doc, `Guia: ${safe(despacho.numeroGuia)}`, margin, y);
    setPdfSubtitle(doc, `Fecha: ${formatFechaHora(despacho.fechaHora)}`, margin + 85, y);
    setPdfSubtitle(doc, `Distribuidor: ${safe(despacho.distribuidorNombre)}`, margin + 165, y);
    y += 5;

    const destino =
      despacho.tipoEntrega === 'DOMICILIO'
        ? safe(despacho.destinatarioNombre)
        : despacho.tipoEntrega === 'AGENCIA_DISTRIBUIDOR'
          ? safe(despacho.agenciaDistribuidorNombre)
          : safe(despacho.agenciaNombre);
    const direccion =
      despacho.tipoEntrega === 'DOMICILIO'
        ? safe(despacho.destinatarioDireccion)
        : despacho.tipoEntrega === 'AGENCIA_DISTRIBUIDOR'
          ? safe(despacho.agenciaDistribuidorNombre)
          : safe(despacho.agenciaNombre);
    setPdfSubtitle(doc, `Destino: ${destino}`, margin, y);
    setPdfSubtitle(doc, `Direccion/Lugar: ${direccion}`, margin + 85, y);
    setPdfSubtitle(doc, `Total sacas: ${sacas.length} | Total paquetes: ${totalPaquetes}`, margin + 165, y);
    y += 5;

    drawDivider(doc, margin, y, pageWidth);
    y += 5;
  };

  const addTableHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_THEME.colors.muted);
    doc.text('GUIA', margin + 2, y);
    doc.text('DESTINATARIO', margin + 42, y);
    doc.text('DIRECCION', margin + 92, y);
    doc.text('PROVINCIA', margin + 170, y);
    doc.text('CANTON', margin + 202, y);
    doc.text('TELEFONO', margin + 230, y);
    doc.text('CONTENIDO', margin + 258, y);
    y += 3;
    doc.setDrawColor(...PDF_THEME.colors.border);
    doc.line(margin, y, margin + pageWidth, y);
    y += 3;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_THEME.colors.text);
  };

  addHeader();
  for (const saca of sacas) {
    if (y > pageBottom - 20) {
      doc.addPage('a4', 'landscape');
      addHeader();
    }

    const sacaTitulo = `Saca #${safe(saca.numeroOrden)} | Tamano: ${
      saca.tamanio ? TAMANIO_LABELS[saca.tamanio] ?? saca.tamanio : '-'
    } | Paquetes: ${saca.paquetes?.length ?? 0}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(sacaTitulo, margin, y);
    y += 4;
    addTableHeader();

    const paquetes = saca.paquetes ?? [];
    if (paquetes.length === 0) {
      doc.text('Sin paquetes', margin + 2, y);
      y += 6;
      continue;
    }

    for (const p of paquetes) {
      if (y > pageBottom - 8) {
        doc.addPage('a4', 'landscape');
        addHeader();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(sacaTitulo, margin, y);
        y += 4;
        addTableHeader();
      }

      const colGuia = safe(p.numeroGuia);
      const colDest = safe(p.destinatarioNombre);
      const colDir = safe(p.destinatarioDireccion);
      const colProv = safe(p.destinatarioProvincia);
      const colCant = safe(p.destinatarioCanton);
      const colTel = safe(p.destinatarioTelefono);
      const colCont = safe(p.contenido);

      doc.setFont('courier', 'normal');
      doc.text(colGuia, margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.text(doc.splitTextToSize(colDest, 46), margin + 42, y);
      doc.text(doc.splitTextToSize(colDir, 74), margin + 92, y);
      doc.text(doc.splitTextToSize(colProv, 28), margin + 170, y);
      doc.text(doc.splitTextToSize(colCant, 24), margin + 202, y);
      doc.text(doc.splitTextToSize(colTel, 24), margin + 230, y);
      doc.text(doc.splitTextToSize(colCont, 26), margin + 258, y);

      y += 5;
      doc.setDrawColor(...PDF_THEME.colors.row);
      doc.line(margin, y, margin + pageWidth, y);
      y += 2;
    }
    y += 2;
  }

  if (sacas.length === 0) {
    doc.setFontSize(10);
    doc.text('Este despacho no tiene sacas asignadas.', margin, y);
  }

  drawFooter(doc, 'ECUBOX · Documento generado por el sistema');
  return doc;
}
