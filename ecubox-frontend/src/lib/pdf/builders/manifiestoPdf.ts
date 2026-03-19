import { jsPDF } from 'jspdf';
import type { DespachoEnManifiesto, Manifiesto } from '@/types/manifiesto';
import { PDF_THEME, drawDivider, drawFooter, setPdfSubtitle, setPdfTitle } from '@/lib/pdf/theme';

function safe(value?: string | null): string {
  return value && value.trim() ? value.trim() : '-';
}

export interface BuildManifiestoPdfInput {
  manifiesto: Manifiesto;
  despachos: DespachoEnManifiesto[];
  filtroAgenciaNombre?: string;
  filtroDistribuidorNombre?: string;
}

export function buildManifiestoPdf(input: BuildManifiestoPdfInput): jsPDF {
  const { manifiesto, despachos, filtroAgenciaNombre, filtroDistribuidorNombre } = input;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = PDF_THEME.margin;
  const pageWidth = PDF_THEME.pageWidthLandscape - margin * 2;
  const pageBottom = PDF_THEME.pageBottom;
  let y = margin;

  const addHeader = () => {
    y = margin;
    setPdfTitle(doc, `MANIFIESTO ${safe(manifiesto.codigo)}`, margin, y);
    y += 6;

    setPdfSubtitle(doc, `Periodo: ${manifiesto.fechaInicio} - ${manifiesto.fechaFin}`, margin, y);
    setPdfSubtitle(doc, `Estado: ${safe(manifiesto.estado)}`, margin + 90, y);
    setPdfSubtitle(doc, `Despachos: ${despachos.length}`, margin + 170, y);
    y += 5;

    setPdfSubtitle(doc, `Filtro distribuidor: ${safe(filtroDistribuidorNombre ?? 'Todos')}`, margin, y);
    setPdfSubtitle(doc, `Filtro agencia: ${safe(filtroAgenciaNombre ?? 'Todas')}`, margin + 120, y);
    y += 5;

    setPdfSubtitle(doc, `Subtotal domicilio: ${Number(manifiesto.subtotalDomicilio ?? 0).toFixed(2)}`, margin, y);
    setPdfSubtitle(doc, `Subtotal agencia flete: ${Number(manifiesto.subtotalAgenciaFlete ?? 0).toFixed(2)}`, margin + 70, y);
    setPdfSubtitle(doc, `Subtotal comision agencias: ${Number(manifiesto.subtotalComisionAgencias ?? 0).toFixed(2)}`, margin + 150, y);
    y += 5;
    setPdfSubtitle(doc, `Total distribuidor: ${Number(manifiesto.totalDistribuidor ?? 0).toFixed(2)}`, margin, y);
    setPdfSubtitle(doc, `Total agencia: ${Number(manifiesto.totalAgencia ?? 0).toFixed(2)}`, margin + 90, y);
    setPdfSubtitle(doc, `Total pagar: ${Number(manifiesto.totalPagar ?? 0).toFixed(2)}`, margin + 170, y);
    y += 4;

    drawDivider(doc, margin, y, pageWidth);
    y += 5;
  };

  const addTableHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_THEME.colors.muted);
    doc.text('GUIA', margin + 2, y);
    doc.text('DISTRIBUIDOR', margin + 56, y);
    doc.text('TIPO', margin + 142, y);
    doc.text('AGENCIA', margin + 178, y);
    doc.text('DESTINATARIO', margin + 228, y);
    y += 3;
    doc.setDrawColor(...PDF_THEME.colors.border);
    doc.line(margin, y, margin + pageWidth, y);
    y += 3;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_THEME.colors.text);
  };

  addHeader();
  addTableHeader();

  for (const d of despachos) {
    if (y > pageBottom - 8) {
      doc.addPage('a4', 'landscape');
      addHeader();
      addTableHeader();
    }

    doc.setFont('courier', 'normal');
    doc.text(safe(d.numeroGuia), margin + 2, y);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(safe(d.distribuidorNombre), 80), margin + 56, y);
    doc.text(doc.splitTextToSize(safe(d.tipoEntrega), 30), margin + 142, y);
    doc.text(doc.splitTextToSize(safe(d.agenciaNombre), 46), margin + 178, y);
    doc.text(doc.splitTextToSize(safe(d.destinatarioNombre), 56), margin + 228, y);

    y += 5;
    doc.setDrawColor(...PDF_THEME.colors.row);
    doc.line(margin, y, margin + pageWidth, y);
    y += 2;
  }

  if (despachos.length === 0) {
    doc.setFontSize(10);
    doc.text('No hay despachos para los filtros seleccionados.', margin, y + 2);
  }

  drawFooter(doc, 'ECUBOX · Liquidación de manifiesto');
  return doc;
}
