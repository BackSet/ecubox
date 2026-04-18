import { jsPDF } from 'jspdf';
import type { DespachoEnManifiesto, Manifiesto } from '@/types/manifiesto';

const TIPO_LABELS: Record<string, string> = {
  DOMICILIO: 'Domicilio',
  AGENCIA: 'Agencia',
  AGENCIA_DISTRIBUIDOR: 'Agencia distribuidor',
};

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  PAGADO: 'Pagado',
  ANULADO: 'Anulado',
};

const COLORS = {
  primary: [37, 99, 175] as [number, number, number],
  primaryDark: [22, 60, 116] as [number, number, number],
  text: [22, 28, 45] as [number, number, number],
  muted: [102, 112, 133] as [number, number, number],
  border: [210, 215, 226] as [number, number, number],
  rowAlt: [246, 248, 252] as [number, number, number],
  totalBg: [233, 240, 252] as [number, number, number],
  successBg: [220, 245, 226] as [number, number, number],
  successText: [40, 105, 56] as [number, number, number],
  warningBg: [253, 240, 213] as [number, number, number],
  warningText: [128, 86, 8] as [number, number, number],
  dangerBg: [253, 226, 226] as [number, number, number],
  dangerText: [128, 30, 30] as [number, number, number],
};

const PAGE = {
  width: 297,
  height: 210,
  margin: 10,
  bottom: 200,
};

function safe(value?: string | null): string {
  return value && String(value).trim() ? String(value).trim() : '-';
}

function fmtFechaCorta(s?: string | null): string {
  if (!s) return '-';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtMoneda(n?: number | null): string {
  if (n == null || Number.isNaN(Number(n))) return '$0.00';
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n));
}

function diasEntre(inicio?: string | null, fin?: string | null): number | null {
  if (!inicio || !fin) return null;
  const a = new Date(inicio);
  const b = new Date(fin);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const ms = b.getTime() - a.getTime();
  if (ms < 0) return null;
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

function setFill(doc: jsPDF, c: [number, number, number]) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function setDraw(doc: jsPDF, c: [number, number, number]) {
  doc.setDrawColor(c[0], c[1], c[2]);
}
function setText(doc: jsPDF, c: [number, number, number]) {
  doc.setTextColor(c[0], c[1], c[2]);
}

function estadoColors(estado?: string | null): {
  bg: [number, number, number];
  text: [number, number, number];
} {
  switch (estado) {
    case 'PAGADO':
      return { bg: COLORS.successBg, text: COLORS.successText };
    case 'ANULADO':
      return { bg: COLORS.dangerBg, text: COLORS.dangerText };
    case 'PENDIENTE':
    default:
      return { bg: COLORS.warningBg, text: COLORS.warningText };
  }
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
  const margin = PAGE.margin;
  const contentWidth = PAGE.width - margin * 2;

  const codigo = safe(manifiesto.codigo) === '-' ? `#${manifiesto.id}` : safe(manifiesto.codigo);
  const dias = diasEntre(manifiesto.fechaInicio, manifiesto.fechaFin);
  const estadoLabel = ESTADO_LABELS[manifiesto.estado] ?? manifiesto.estado ?? 'Pendiente';

  // ---------- HEADER ----------
  const drawHeader = () => {
    setFill(doc, COLORS.primary);
    doc.rect(0, 0, PAGE.width, 24, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    setText(doc, [255, 255, 255]);
    doc.text('ECUBOX', margin, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Manifiesto de liquidación', margin, 17);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(codigo, PAGE.width - margin, 11, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const sub = `ID: ${manifiesto.id} · ${despachos.length} despacho${despachos.length === 1 ? '' : 's'}`;
    doc.text(sub, PAGE.width - margin, 17, { align: 'right' });

    // Badge de estado dentro del banner
    const c = estadoColors(manifiesto.estado);
    const badgeW = 28;
    const badgeH = 6;
    const badgeX = PAGE.width - margin - badgeW;
    const badgeY = 19;
    setFill(doc, c.bg);
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'F');
    setText(doc, c.text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(estadoLabel.toUpperCase(), badgeX + badgeW / 2, badgeY + 4, {
      align: 'center',
    });
  };

  const drawFooter = () => {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      setText(doc, COLORS.muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(
        `ECUBOX · Manifiesto ${codigo} · Generado ${new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}`,
        margin,
        205,
      );
      doc.text(`Página ${i} de ${total}`, PAGE.width - margin, 205, {
        align: 'right',
      });
    }
  };

  let y = 28;

  // ---------- BLOQUES DE INFORMACIÓN ----------
  const drawResumen = () => {
    const blockH = 30;
    const blockW = (contentWidth - 6) / 3;

    const drawBlock = (
      x: number,
      titulo: string,
      filas: Array<{ label: string; value: string; bold?: boolean }>,
    ) => {
      setDraw(doc, COLORS.border);
      setFill(doc, [255, 255, 255]);
      doc.roundedRect(x, y, blockW, blockH, 1.5, 1.5, 'FD');

      setText(doc, COLORS.primaryDark);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(titulo.toUpperCase(), x + 3, y + 4.5);

      let cy = y + 9;
      for (const fila of filas) {
        setText(doc, COLORS.muted);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(fila.label, x + 3, cy);
        setText(doc, COLORS.text);
        doc.setFont('helvetica', fila.bold ? 'bold' : 'normal');
        doc.setFontSize(8.5);
        const lines = doc.splitTextToSize(fila.value, blockW - 6);
        doc.text(lines.slice(0, 2), x + 3, cy + 3.6);
        cy += 7.4;
      }
    };

    drawBlock(margin, 'Manifiesto', [
      { label: 'Código', value: codigo, bold: true },
      { label: 'Estado', value: estadoLabel },
      {
        label: 'Generado',
        value: new Date().toLocaleDateString('es-EC', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      },
    ]);

    drawBlock(margin + blockW + 3, 'Período', [
      { label: 'Desde', value: fmtFechaCorta(manifiesto.fechaInicio), bold: true },
      { label: 'Hasta', value: fmtFechaCorta(manifiesto.fechaFin), bold: true },
      {
        label: 'Duración',
        value: dias != null ? `${dias} día${dias === 1 ? '' : 's'}` : '-',
      },
    ]);

    drawBlock(margin + (blockW + 3) * 2, 'Filtros aplicados', [
      {
        label: 'Distribuidor',
        value: safe(filtroDistribuidorNombre ?? manifiesto.filtroDistribuidorNombre ?? 'Todos'),
      },
      {
        label: 'Agencia',
        value: safe(filtroAgenciaNombre ?? manifiesto.filtroAgenciaNombre ?? 'Todas'),
      },
      {
        label: 'Despachos incluidos',
        value: String(despachos.length),
        bold: true,
      },
    ]);

    y += blockH + 4;
  };

  // ---------- KPI CARDS (totales) ----------
  const drawKpis = () => {
    const h = 16;
    const w = (contentWidth - 9) / 4;
    const cards: Array<{
      label: string;
      value: string;
      destacar?: boolean;
    }> = [
      { label: 'Despachos', value: String(despachos.length) },
      {
        label: 'Total distribuidor',
        value: fmtMoneda(manifiesto.totalDistribuidor),
      },
      {
        label: 'Total agencia',
        value: fmtMoneda(manifiesto.totalAgencia),
      },
      {
        label: 'Total a pagar',
        value: fmtMoneda(manifiesto.totalPagar),
        destacar: true,
      },
    ];
    cards.forEach((card, i) => {
      const x = margin + i * (w + 3);
      if (card.destacar) {
        setFill(doc, COLORS.primary);
        setDraw(doc, COLORS.primary);
        doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');
        setText(doc, [255, 255, 255]);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(card.label.toUpperCase(), x + 3, y + 4.8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(card.value, x + 3, y + 12);
      } else {
        setFill(doc, COLORS.totalBg);
        setDraw(doc, COLORS.primary);
        doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');
        setText(doc, COLORS.muted);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(card.label.toUpperCase(), x + 3, y + 4.8);
        setText(doc, COLORS.primaryDark);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(card.value, x + 3, y + 12);
      }
    });
    y += h + 5;
  };

  // ---------- SUBTOTALES (línea pequeña) ----------
  const drawSubtotales = () => {
    const h = 8;
    setFill(doc, COLORS.totalBg);
    setDraw(doc, COLORS.border);
    doc.roundedRect(margin, y, contentWidth, h, 1.5, 1.5, 'FD');

    setText(doc, COLORS.primaryDark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('SUBTOTALES', margin + 2, y + 5.4);

    const items: Array<{ label: string; value: string }> = [
      { label: 'Domicilio', value: fmtMoneda(manifiesto.subtotalDomicilio) },
      { label: 'Agencia (flete)', value: fmtMoneda(manifiesto.subtotalAgenciaFlete) },
      {
        label: 'Comisión agencias',
        value: fmtMoneda(manifiesto.subtotalComisionAgencias),
      },
    ];

    let xCursor = margin + 32;
    items.forEach((item) => {
      setText(doc, COLORS.muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(item.label.toUpperCase(), xCursor, y + 3.5);
      setText(doc, COLORS.text);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(item.value, xCursor, y + 7);
      xCursor += 70;
    });

    y += h + 5;
  };

  // ---------- TABLA DE DESPACHOS ----------
  type Align = 'left' | 'center' | 'right';
  const cols: Array<{ key: string; label: string; width: number; align: Align }> = [
    { key: 'idx', label: '#', width: 8, align: 'center' },
    { key: 'guia', label: 'GUÍA', width: 36, align: 'left' },
    { key: 'distribuidor', label: 'DISTRIBUIDOR', width: 56, align: 'left' },
    { key: 'tipo', label: 'TIPO ENTREGA', width: 32, align: 'left' },
    { key: 'agencia', label: 'AGENCIA', width: 50, align: 'left' },
    { key: 'destinatario', label: 'DESTINATARIO', width: 75, align: 'left' },
  ];
  const tableWidth = cols.reduce((s, c) => s + c.width, 0);
  const colWidths = cols.map((c) => (c.width / tableWidth) * contentWidth);

  const drawTableHeader = () => {
    const h = 6.5;
    setFill(doc, COLORS.primaryDark);
    doc.rect(margin, y, contentWidth, h, 'F');
    setText(doc, [255, 255, 255]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    let x = margin;
    cols.forEach((c, i) => {
      const w = colWidths[i];
      const tx =
        c.align === 'right'
          ? x + w - 2
          : c.align === 'center'
            ? x + w / 2
            : x + 2;
      doc.text(c.label, tx, y + 4.4, { align: c.align });
      x += w;
    });
    y += h + 0.5;
  };

  const measureRowHeight = (d: DespachoEnManifiesto): number => {
    const candidates: number[] = [];
    cols.forEach((c, i) => {
      const w = colWidths[i] - 4;
      let txt = '';
      switch (c.key) {
        case 'distribuidor':
          txt = safe(d.distribuidorNombre);
          break;
        case 'agencia':
          txt = safe(d.agenciaNombre);
          break;
        case 'destinatario':
          txt = safe(d.destinatarioNombre);
          break;
        default:
          txt = '';
      }
      if (txt) {
        const lines = doc.splitTextToSize(txt, w);
        candidates.push(lines.length);
      }
    });
    const maxLines = Math.max(1, ...candidates);
    return Math.max(6, maxLines * 3.6 + 2.4);
  };

  const drawRow = (d: DespachoEnManifiesto, idx: number, alt: boolean) => {
    const rowH = measureRowHeight(d);
    if (alt) {
      setFill(doc, COLORS.rowAlt);
      doc.rect(margin, y, contentWidth, rowH, 'F');
    }
    setDraw(doc, COLORS.border);
    doc.line(margin, y + rowH, margin + contentWidth, y + rowH);

    let x = margin;
    cols.forEach((c, i) => {
      const w = colWidths[i];
      const innerW = w - 4;
      const tx =
        c.align === 'right'
          ? x + w - 2
          : c.align === 'center'
            ? x + w / 2
            : x + 2;
      let txt = '';
      switch (c.key) {
        case 'idx':
          txt = String(idx + 1);
          break;
        case 'guia':
          txt = safe(d.numeroGuia);
          break;
        case 'distribuidor':
          txt = safe(d.distribuidorNombre);
          break;
        case 'tipo':
          txt = TIPO_LABELS[d.tipoEntrega] ?? safe(d.tipoEntrega);
          break;
        case 'agencia':
          txt = safe(d.agenciaNombre);
          break;
        case 'destinatario':
          txt = safe(d.destinatarioNombre);
          break;
      }
      setText(doc, c.key === 'idx' ? COLORS.muted : COLORS.text);
      doc.setFont(
        c.key === 'guia' ? 'courier' : 'helvetica',
        c.key === 'guia' ? 'bold' : 'normal',
      );
      doc.setFontSize(c.key === 'guia' ? 7.8 : 8);
      const lines = doc.splitTextToSize(txt, innerW);
      doc.text(lines, tx, y + 4, { align: c.align });
      x += w;
    });
    y += rowH;
  };

  const ensureSpace = (need: number) => {
    if (y + need > PAGE.bottom - 8) {
      doc.addPage('a4', 'landscape');
      drawHeader();
      y = 28;
      drawTableHeader();
    }
  };

  const drawTotalRow = () => {
    const h = 9;
    if (y + h > PAGE.bottom - 8) {
      doc.addPage('a4', 'landscape');
      drawHeader();
      y = 28;
    }
    setFill(doc, COLORS.primary);
    doc.rect(margin, y, contentWidth, h, 'F');
    setText(doc, [255, 255, 255]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(
      `TOTAL: ${despachos.length} despacho${despachos.length === 1 ? '' : 's'}`,
      margin + 2,
      y + 6,
    );
    doc.text(
      `TOTAL A PAGAR: ${fmtMoneda(manifiesto.totalPagar)}`,
      PAGE.width - margin - 2,
      y + 6,
      { align: 'right' },
    );
    y += h + 4;
  };

  const drawFirmas = () => {
    if (y + 26 > PAGE.bottom - 8) {
      doc.addPage('a4', 'landscape');
      drawHeader();
      y = 28;
    }
    const w = (contentWidth - 6) / 2;
    setDraw(doc, COLORS.muted);
    doc.line(margin + 6, y + 14, margin + w - 6, y + 14);
    doc.line(margin + w + 6 + 6, y + 14, margin + w + 6 + w - 6, y + 14);
    setText(doc, COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Aprobación (ECUBOX)', margin + 6, y + 18);
    doc.text('Conformidad (Distribuidor / Agencia)', margin + w + 6 + 6, y + 18);
    y += 26;
  };

  // ---------- RENDER ----------
  drawHeader();
  drawResumen();
  drawKpis();
  drawSubtotales();

  if (despachos.length === 0) {
    setText(doc, COLORS.muted);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.text(
      'No hay despachos para los filtros seleccionados.',
      margin,
      y + 8,
    );
  } else {
    drawTableHeader();
    despachos.forEach((d, i) => {
      const need = measureRowHeight(d) + 1;
      ensureSpace(need);
      drawRow(d, i, i % 2 === 1);
    });
    drawTotalRow();
    drawFirmas();
  }

  drawFooter();
  return doc;
}
