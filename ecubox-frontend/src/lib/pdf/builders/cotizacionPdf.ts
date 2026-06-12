import { jsPDF } from 'jspdf';
import {
  createDocCtx,
  drawDocFooter,
  drawDocHeader,
  drawMetaRow,
  drawSectionTitle,
  drawTable,
  drawTotalBar,
} from '@/lib/pdf/builders/internal-doc';
import { ECUBOX_PDF_COLORS, PDF_DOC } from '@/lib/pdf/theme';
import {
  cotizacionATexto,
  fmtLbs,
  fmtMoneda,
  type CotizacionCalculadora,
} from '@/lib/calculadora/cotizacion';

function fmtFecha(d: Date): string {
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtHora(d: Date): string {
  return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}

interface LineaDesglose {
  concepto: string;
  detalle: string;
  valor: string;
}

/**
 * Documento PDF de la cotización de la calculadora pública. Usa exactamente
 * los valores del modelo {@link CotizacionCalculadora} (los mismos de copiar
 * y compartir); no aplica fórmulas ni redondeos propios. Paleta y composición
 * de los documentos internos de ECUBOX (internal-doc), con colores propios
 * del tema PDF: el documento no hereda el dark mode de la pantalla.
 */
export function buildCotizacionPdf(c: CotizacionCalculadora): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const ctx = createDocCtx(doc);

  drawDocHeader(ctx, {
    titulo: 'Cotización de envío',
    subtitulo: 'Calculadora pública · costo estimado',
    codigo: fmtFecha(c.generadaEn),
    meta: `Generada a las ${fmtHora(c.generadaEn)}`,
  });

  drawMetaRow(ctx, [
    {
      titulo: 'Datos del paquete',
      filas: [
        { label: 'Peso', value: `${fmtLbs(c.pesoLbs)} lbs (${fmtLbs(c.pesoKg)} kg)`, bold: true },
      ],
    },
    {
      titulo: 'Tarifa aplicada',
      filas: [
        { label: 'Tarifa', value: `${fmtMoneda(c.tarifaPorLibra)} / lbs`, bold: true },
        { label: 'Moneda', value: c.moneda },
      ],
    },
  ]);

  drawSectionTitle(ctx, 'Desglose');

  const lineas: LineaDesglose[] = [
    {
      concepto: 'Transporte por peso',
      detalle: `${fmtLbs(c.pesoLbs)} lbs × ${fmtMoneda(c.tarifaPorLibra)}/lbs`,
      valor: fmtMoneda(c.subtotal),
    },
  ];
  if (c.recargoMenorPeso != null) {
    lineas.push({
      concepto: 'Recargo envío menor peso',
      detalle: `Aplica a paquetes de menos de ${c.umbralRecargoLbs} lbs`,
      valor: `+${fmtMoneda(c.recargoMenorPeso)}`,
    });
  }

  drawTable<LineaDesglose>(ctx, {
    columns: [
      { key: 'concepto', label: 'Concepto', weight: 3, align: 'left', render: (r) => r.concepto },
      { key: 'detalle', label: 'Detalle', weight: 4, align: 'left', render: (r) => r.detalle },
      { key: 'valor', label: 'Valor', weight: 2, align: 'right', render: (r) => r.valor },
    ],
    rows: lineas,
  });

  drawTotalBar(ctx, {
    left: 'TOTAL ESTIMADO',
    right: `${fmtMoneda(c.total)} ${c.moneda}`,
  });

  ctx.y += 2;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(PDF_DOC.fonts.metaLabel + 1);
  doc.setTextColor(...ECUBOX_PDF_COLORS.muted);
  for (const nota of c.notas) {
    const wrapped = doc.splitTextToSize(`* ${nota}`, ctx.contentWidth);
    doc.text(wrapped, ctx.margin, ctx.y);
    ctx.y += wrapped.length * 4 + 1;
  }

  drawDocFooter(doc, { left: 'ECUBOX · Cotización de calculadora' });
  return doc;
}

/** Texto plano equivalente al documento (reexpuesto para conveniencia). */
export { cotizacionATexto };
