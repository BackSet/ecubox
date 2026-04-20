import { jsPDF } from 'jspdf';
import type { Despacho, Saca, TamanioSaca } from '@/types/despacho';
import type { Paquete } from '@/types/paquete';
import { lbsToKg } from '@/lib/utils/weight';

const TAMANIO_LABELS: Record<TamanioSaca, string> = {
  INDIVIDUAL: 'Paquete individual',
  PEQUENO: 'Saca pequena',
  MEDIANO: 'Saca mediana',
  GRANDE: 'Saca grande',
};

const TIPO_LABELS: Record<string, string> = {
  DOMICILIO: 'Domicilio',
  AGENCIA: 'Agencia',
  AGENCIA_COURIER_ENTREGA: 'Punto de entrega',
};

const COLORS = {
  primary: [37, 99, 175] as [number, number, number],
  primaryDark: [22, 60, 116] as [number, number, number],
  text: [22, 28, 45] as [number, number, number],
  muted: [102, 112, 133] as [number, number, number],
  border: [210, 215, 226] as [number, number, number],
  rowAlt: [246, 248, 252] as [number, number, number],
  totalBg: [233, 240, 252] as [number, number, number],
  badgeBg: [235, 244, 233] as [number, number, number],
  badgeText: [40, 105, 56] as [number, number, number],
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

function fmtFechaHora(s?: string): string {
  if (!s) return '-';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
}

function fmtNumero(n?: number | null, decimals = 2): string {
  if (n == null || Number.isNaN(Number(n))) return '-';
  return Number(n).toFixed(decimals);
}

function destinoFor(d: Despacho): { titulo: string; nombre: string; direccion: string; telefono: string } {
  if (d.tipoEntrega === 'DOMICILIO') {
    return {
      titulo: 'Entrega a domicilio',
      nombre: safe(d.consignatarioNombre),
      direccion: safe(d.consignatarioDireccion),
      telefono: safe(d.consignatarioTelefono),
    };
  }
  if (d.tipoEntrega === 'AGENCIA_COURIER_ENTREGA') {
    return {
      titulo: 'Entrega en punto de entrega',
      nombre: safe(d.agenciaCourierEntregaNombre),
      direccion: safe(d.agenciaCourierEntregaNombre),
      telefono: '-',
    };
  }
  return {
    titulo: 'Entrega en agencia',
    nombre: safe(d.agenciaNombre),
    direccion: safe(d.agenciaNombre),
    telefono: '-',
  };
}

function totalesGenerales(sacas: Saca[]): {
  paquetes: number;
  pesoLbs: number;
  pesoKg: number;
} {
  let paquetes = 0;
  let pesoLbs = 0;
  let pesoKg = 0;
  for (const s of sacas) {
    const ps = s.paquetes ?? [];
    paquetes += ps.length;
    for (const p of ps) {
      const lbs = Number(p.pesoLbs ?? 0);
      const kg = Number(p.pesoKg ?? (Number.isFinite(lbs) ? lbsToKg(lbs) : 0));
      if (Number.isFinite(lbs)) pesoLbs += lbs;
      if (Number.isFinite(kg)) pesoKg += kg;
    }
  }
  return {
    paquetes,
    pesoLbs: Math.round(pesoLbs * 100) / 100,
    pesoKg: Math.round(pesoKg * 100) / 100,
  };
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

export function buildDespachoPdf(despacho: Despacho): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = PAGE.margin;
  const contentWidth = PAGE.width - margin * 2;

  const sacas = despacho.sacas ?? [];
  const totales = totalesGenerales(sacas);
  const destino = destinoFor(despacho);

  // Cabecera fija
  const drawHeader = () => {
    setFill(doc, COLORS.primary);
    doc.rect(0, 0, PAGE.width, 24, 'F');

    // Marca / titulo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    setText(doc, [255, 255, 255]);
    doc.text('ECUBOX', margin, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Documento de despacho', margin, 17);

    // Numero de guia (derecha)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(safe(despacho.numeroGuia), PAGE.width - margin, 11, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`ID interno: ${despacho.id} · ${fmtFechaHora(despacho.fechaHora)}`, PAGE.width - margin, 17, {
      align: 'right',
    });
  };

  const drawFooter = () => {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      setText(doc, COLORS.muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('ECUBOX · Documento generado por el sistema', margin, 205);
      doc.text(`Pagina ${i} de ${total}`, PAGE.width - margin, 205, { align: 'right' });
    }
  };

  // Bloque resumen (3 columnas)
  let y = 28;

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

    drawBlock(margin, 'Despacho', [
      { label: 'Guia', value: safe(despacho.numeroGuia), bold: true },
      { label: 'Fecha', value: fmtFechaHora(despacho.fechaHora) },
      { label: 'Operario', value: safe(despacho.operarioNombre) },
    ]);

    drawBlock(margin + blockW + 3, 'Distribucion', [
      { label: 'CourierEntrega', value: safe(despacho.courierEntregaNombre), bold: true },
      { label: 'Tipo de entrega', value: TIPO_LABELS[despacho.tipoEntrega] ?? despacho.tipoEntrega },
      { label: 'Codigo precinto', value: safe(despacho.codigoPrecinto) },
    ]);

    drawBlock(margin + (blockW + 3) * 2, destino.titulo, [
      { label: 'Destino', value: destino.nombre, bold: true },
      { label: 'Direccion', value: destino.direccion },
      { label: 'Telefono', value: destino.telefono },
    ]);

    y += blockH + 4;
  };

  // Caja KPIs
  const drawKpis = () => {
    const h = 14;
    const w = (contentWidth - 9) / 4;
    const cards: Array<{ label: string; value: string }> = [
      { label: 'Sacas', value: String(sacas.length) },
      { label: 'Paquetes', value: String(totales.paquetes) },
      { label: 'Peso total (lbs)', value: fmtNumero(totales.pesoLbs) },
      { label: 'Peso total (kg)', value: fmtNumero(totales.pesoKg) },
    ];
    cards.forEach((card, i) => {
      const x = margin + i * (w + 3);
      setFill(doc, COLORS.totalBg);
      setDraw(doc, COLORS.primary);
      doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');

      setText(doc, COLORS.muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(card.label.toUpperCase(), x + 3, y + 4.5);
      setText(doc, COLORS.primaryDark);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(card.value, x + 3, y + 11);
    });
    y += h + 5;
  };

  // Encabezados de tabla por saca
  const cols = [
    { key: 'guia', label: 'GUIA', width: 36, align: 'left' as const },
    { key: 'pieza', label: 'PIEZA', width: 14, align: 'center' as const },
    { key: 'consignatario', label: 'CONSIGNATARIO', width: 50, align: 'left' as const },
    { key: 'telefono', label: 'TELEFONO', width: 24, align: 'left' as const },
    { key: 'ubicacion', label: 'UBICACION', width: 70, align: 'left' as const },
    { key: 'contenido', label: 'CONTENIDO', width: 45, align: 'left' as const },
    { key: 'peso', label: 'PESO', width: 22, align: 'right' as const },
  ];
  const tableWidth = cols.reduce((sum, c) => sum + c.width, 0);
  const colWidths = cols.map((c) => (c.width / tableWidth) * contentWidth);

  const drawTableHeader = () => {
    const h = 6;
    setFill(doc, COLORS.primaryDark);
    doc.rect(margin, y, contentWidth, h, 'F');
    setText(doc, [255, 255, 255]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    let x = margin;
    cols.forEach((c, i) => {
      const w = colWidths[i];
      const tx = c.align === 'right' ? x + w - 2 : c.align === 'center' ? x + w / 2 : x + 2;
      doc.text(c.label, tx, y + 4, { align: c.align });
      x += w;
    });
    y += h + 0.5;
  };

  const drawSacaHeader = (saca: Saca, idx: number) => {
    const h = 8;
    setFill(doc, COLORS.totalBg);
    setDraw(doc, COLORS.primary);
    doc.rect(margin, y, contentWidth, h, 'FD');

    const paquetes = saca.paquetes ?? [];
    const pesoLbsSaca = paquetes.reduce((s, p) => s + Number(p.pesoLbs ?? 0), 0);
    const pesoKgSaca = lbsToKg(pesoLbsSaca);

    setText(doc, COLORS.primaryDark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Saca #${idx + 1}  ${safe(saca.numeroOrden)}`, margin + 2, y + 5.4);

    setText(doc, COLORS.text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const meta = [
      saca.tamanio ? TAMANIO_LABELS[saca.tamanio] ?? saca.tamanio : 'Sin tamano',
      `${paquetes.length} paquete${paquetes.length === 1 ? '' : 's'}`,
      `${fmtNumero(pesoLbsSaca)} lbs / ${fmtNumero(pesoKgSaca)} kg`,
    ].join('   |   ');
    doc.text(meta, PAGE.width - margin - 2, y + 5.4, { align: 'right' });

    y += h + 0.5;
  };

  const ensureSpace = (need: number, repeatTableHeader: () => void) => {
    if (y + need > PAGE.bottom - 8) {
      doc.addPage('a4', 'landscape');
      drawHeader();
      y = 28;
      repeatTableHeader();
    }
  };

  const measurePaqueteHeight = (p: Paquete): number => {
    const candidates: number[] = [];
    cols.forEach((c, i) => {
      const w = colWidths[i] - 4;
      let txt = '';
      switch (c.key) {
        case 'consignatario': txt = safe(p.consignatarioNombre); break;
        case 'ubicacion':
          txt = [safe(p.consignatarioDireccion), [p.consignatarioCanton, p.consignatarioProvincia].filter(Boolean).join(', ')]
            .filter((x) => x && x !== '-')
            .join(' | ') || '-';
          break;
        case 'contenido': txt = safe(p.contenido); break;
        default: txt = '';
      }
      if (txt) {
        const lines = doc.splitTextToSize(txt, w);
        candidates.push(lines.length);
      }
    });
    const maxLines = Math.max(1, ...candidates);
    return Math.max(6, maxLines * 3.6 + 2.4);
  };

  const drawPaqueteRow = (p: Paquete, alt: boolean) => {
    const rowH = measurePaqueteHeight(p);
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
      const tx = c.align === 'right' ? x + w - 2 : c.align === 'center' ? x + w / 2 : x + 2;
      let txt = '';
      let bold = false;
      switch (c.key) {
        case 'guia':
          txt = safe(p.numeroGuia);
          bold = true;
          break;
        case 'pieza':
          txt = p.piezaNumero != null && p.piezaTotal != null ? `${p.piezaNumero}/${p.piezaTotal}` : '-';
          break;
        case 'consignatario':
          txt = safe(p.consignatarioNombre);
          break;
        case 'telefono':
          txt = safe(p.consignatarioTelefono);
          break;
        case 'ubicacion':
          txt = [safe(p.consignatarioDireccion), [p.consignatarioCanton, p.consignatarioProvincia].filter(Boolean).join(', ')]
            .filter((s) => s && s !== '-')
            .join(' | ') || '-';
          break;
        case 'contenido':
          txt = safe(p.contenido);
          break;
        case 'peso': {
          const lbs = Number(p.pesoLbs ?? 0);
          const kg = Number(p.pesoKg ?? (Number.isFinite(lbs) ? lbsToKg(lbs) : 0));
          txt = `${fmtNumero(lbs)} lbs\n${fmtNumero(kg)} kg`;
          break;
        }
        default:
          txt = '';
      }

      setText(doc, COLORS.text);
      doc.setFont(c.key === 'guia' ? 'courier' : 'helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(c.key === 'guia' ? 7.5 : 8);
      const lines = doc.splitTextToSize(txt, innerW);
      doc.text(lines, tx, y + 4, { align: c.align });
      x += w;
    });
    y += rowH;
  };

  const drawSacaTotal = (saca: Saca) => {
    const paquetes = saca.paquetes ?? [];
    const pesoLbsSaca = paquetes.reduce((s, p) => s + Number(p.pesoLbs ?? 0), 0);
    const pesoKgSaca = lbsToKg(pesoLbsSaca);

    const h = 6;
    setFill(doc, COLORS.totalBg);
    doc.rect(margin, y, contentWidth, h, 'F');
    setText(doc, COLORS.primaryDark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`Subtotal saca: ${paquetes.length} paquete${paquetes.length === 1 ? '' : 's'}`, margin + 2, y + 4.2);
    doc.text(`${fmtNumero(pesoLbsSaca)} lbs / ${fmtNumero(pesoKgSaca)} kg`, PAGE.width - margin - 2, y + 4.2, {
      align: 'right',
    });
    y += h + 1.5;
  };

  const drawTotalGeneral = () => {
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
      `TOTAL DESPACHO: ${sacas.length} saca${sacas.length === 1 ? '' : 's'} - ${totales.paquetes} paquete${totales.paquetes === 1 ? '' : 's'}`,
      margin + 2,
      y + 6,
    );
    doc.text(`${fmtNumero(totales.pesoLbs)} lbs / ${fmtNumero(totales.pesoKg)} kg`, PAGE.width - margin - 2, y + 6, {
      align: 'right',
    });
    y += h + 4;
  };

  const drawFirmas = () => {
    if (y + 24 > PAGE.bottom - 8) {
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
    doc.text('Entrega (operario)', margin + 6, y + 18);
    doc.text(safe(despacho.operarioNombre), margin + 6, y + 22);
    doc.text('Recibe (courier de entrega)', margin + w + 6 + 6, y + 18);
    doc.text(safe(despacho.courierEntregaNombre), margin + w + 6 + 6, y + 22);
    y += 26;
  };

  // ---- render ----
  drawHeader();
  drawResumen();
  drawKpis();

  if (sacas.length === 0) {
    setText(doc, COLORS.muted);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.text('Este despacho no tiene sacas asignadas.', margin, y + 5);
  } else {
    sacas.forEach((saca, idx) => {
      ensureSpace(20, () => {});
      drawSacaHeader(saca, idx);
      drawTableHeader();

      const paquetes = saca.paquetes ?? [];
      if (paquetes.length === 0) {
        setText(doc, COLORS.muted);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.text('Esta saca no tiene paquetes asociados.', margin + 2, y + 4);
        y += 8;
      } else {
        paquetes.forEach((p, i) => {
          const need = measurePaqueteHeight(p) + 1;
          ensureSpace(need, () => {
            // Repetir cabeceras de saca y tabla
            drawSacaHeader(saca, idx);
            drawTableHeader();
          });
          drawPaqueteRow(p, i % 2 === 0);
        });
      }
      drawSacaTotal(saca);
      y += 1;
    });
    drawTotalGeneral();
    drawFirmas();
  }

  drawFooter();
  return doc;
}
