import { jsPDF } from 'jspdf';
import type { TrackingResponse } from '@/lib/api/tracking.service';
import { TRACKING_COMPACT_A4_THEME } from '@/lib/pdf/theme';
import { kgToLbs, lbsToKg } from '@/lib/utils/weight';

const PAGE_W = 210;
const PAGE_H = 297;

function safe(value?: string | null): string {
  return value && value.trim() ? value.trim() : '-';
}

function formatFecha(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatFechaHora(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });
}

function labelTipoEntrega(tipo?: string): string {
  if (!tipo) return 'Modalidad no disponible';
  if (tipo === 'DOMICILIO') return 'Entrega a domicilio';
  if (tipo === 'AGENCIA') return 'Retiro en agencia';
  if (tipo === 'AGENCIA_COURIER_ENTREGA') return 'Retiro en agencia aliada';
  return tipo;
}

function trackingHost(raw?: string): string {
  if (!raw || !raw.trim()) return '-';
  const value = raw.trim();
  try {
    return new URL(value).host || value;
  } catch {
    return value;
  }
}

function formatPesoDual(kg?: number | null, lbs?: number | null): string {
  const safeKg = kg ?? (lbs != null ? lbsToKg(lbs) : null);
  const safeLbs = lbs ?? (kg != null ? kgToLbs(kg) : null);
  if (safeKg == null && safeLbs == null) return '0 kg / 0 lbs';
  return `${safeKg ?? 0} kg / ${safeLbs ?? 0} lbs`;
}

export function buildTrackingPdf(data: TrackingResponse): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const t = TRACKING_COMPACT_A4_THEME;
  const margin = t.margin;
  const width = PAGE_W - margin * 2;
  const footerY = PAGE_H - 4;
  const headerBottomOffset = 2;
  const cardHeaderHeight = t.cardHeaderHeight;
  const cardPadding = t.cardPadding;
  const sectionGap = t.sectionGap;
  const contentMaxY = PAGE_H - t.footerHeight - 4;
  let y = margin;

  const setFont = (size: number, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
  };

  const lineHeight = (size: number) => Math.max(3.4, size * 0.52);

  const wrap = (value: string, maxWidth: number, maxLines?: number) => {
    const lines = doc.splitTextToSize(value, maxWidth) as string[];
    if (!maxLines || lines.length <= maxLines) return lines;
    const clipped = lines.slice(0, maxLines);
    clipped[maxLines - 1] = `${clipped[maxLines - 1]}...`;
    return clipped;
  };

  const drawTextLines = (
    lines: string[],
    x: number,
    startY: number,
    size: number,
    color: [number, number, number],
    bold = false
  ) => {
    setFont(size, bold);
    doc.setTextColor(...color);
    const lh = lineHeight(size);
    lines.forEach((line, idx) => {
      doc.text(line, x, startY + idx * lh);
    });
    return lines.length * lh;
  };

  const drawField = (
    label: string,
    value: string,
    x: number,
    startY: number,
    maxWidth: number,
    multiline = true
  ) => {
    const labelHeight = drawTextLines([label], x, startY, t.fonts.label, t.colors.muted);
    const valueLines = multiline ? wrap(value, maxWidth) : [value];
    const valueHeight = drawTextLines(
      valueLines,
      x,
      startY + labelHeight + 0.4,
      t.fonts.body,
      t.colors.text,
      true
    );
    return labelHeight + valueHeight + 0.8;
  };

  const measureFieldHeight = (value: string, maxWidth: number, multiline = true) => {
    const labelH = lineHeight(t.fonts.label);
    const valueLines = multiline ? wrap(value, maxWidth) : [value];
    const valueH = valueLines.length * lineHeight(t.fonts.body);
    return labelH + valueH + 1.2;
  };

  const drawBadge = (
    label: string,
    x: number,
    baselineY: number,
    variant: 'neutral' | 'info' | 'accent' | 'success' | 'warning' | 'destructive'
  ) => {
    setFont(t.fonts.badge, false);
    const textWidth = doc.getTextWidth(label);
    const padX = 2.4;
    const h = 4.6;
    const w = textWidth + padX * 2;
    let stroke = t.colors.border;
    let fill: [number, number, number] = [248, 247, 252];
    let text = t.colors.muted;
    switch (variant) {
      case 'accent':
        stroke = t.colors.primarySoftStroke;
        fill = t.colors.primarySoftFill;
        text = t.colors.primary;
        break;
      case 'info':
        stroke = t.colors.infoStroke;
        fill = t.colors.infoFill;
        text = t.colors.info;
        break;
      case 'success':
        stroke = t.colors.successStroke;
        fill = t.colors.successFill;
        text = t.colors.success;
        break;
      case 'warning':
        stroke = t.colors.warningStroke;
        fill = t.colors.warningFill;
        text = t.colors.warning;
        break;
      case 'destructive':
        stroke = t.colors.destructiveStroke;
        fill = t.colors.destructiveFill;
        text = t.colors.destructive;
        break;
      default:
        break;
    }
    doc.setDrawColor(...stroke);
    doc.setFillColor(...fill);
    doc.roundedRect(x, baselineY - 3.4, w, h, 2.2, 2.2, 'FD');
    doc.setTextColor(...text);
    doc.text(label, x + padX, baselineY);
    return w;
  };

  const drawMiniBox = (x: number, startY: number, w: number, label: string, value: string) => {
    const boxH = 13;
    doc.setDrawColor(...t.colors.borderSoft);
    doc.setFillColor(...t.colors.cardSoft);
    doc.roundedRect(x, startY, w, boxH, 1.8, 1.8, 'FD');
    doc.setFillColor(...t.colors.primary);
    doc.rect(x, startY + 1.6, 1.4, boxH - 3.2, 'F');
    drawTextLines([label.toUpperCase()], x + 3.2, startY + 4, t.fonts.label, t.colors.muted, true);
    drawTextLines([value], x + 3.2, startY + 9.4, t.fonts.metric, t.colors.text, true);
    return boxH;
  };

  const drawTable = (
    x: number,
    startY: number,
    contentW: number,
    rows: Array<{ guia: string; estado: string; peso: string }>
  ) => {
    const headerH = 5;
    const rowH = 4.6;
    const col1 = contentW * 0.35;
    const col2 = contentW * 0.47;
    const col3 = contentW - col1 - col2;
    doc.setDrawColor(...t.colors.borderSoft);
    doc.setFillColor(...t.colors.cardHeader);
    doc.roundedRect(x, startY, contentW, headerH, 1, 1, 'FD');
    setFont(t.fonts.label, true);
    doc.setTextColor(...t.colors.primary);
    doc.text('Número de guía', x + 1.2, startY + 3.3);
    doc.text('Estado actual', x + col1 + 1.2, startY + 3.3);
    doc.text('Peso kg/lbs', x + col1 + col2 + 1.2, startY + 3.3);
    let tableY = startY + headerH;
    rows.forEach((row, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(...t.colors.row);
        doc.rect(x, tableY, contentW, rowH, 'F');
      }
      doc.setDrawColor(...t.colors.border);
      doc.line(x, tableY + rowH, x + contentW, tableY + rowH);
      setFont(t.fonts.label, false);
      doc.setTextColor(...t.colors.text);
      const guia = wrap(row.guia, col1 - 2.4, 1)[0] ?? '-';
      const estado = wrap(row.estado, col2 - 2.4, 1)[0] ?? '-';
      const peso = wrap(row.peso, col3 - 2.4, 1)[0] ?? '-';
      doc.text(guia, x + 1.2, tableY + 3.2);
      doc.text(estado, x + col1 + 1.2, tableY + 3.2);
      doc.text(peso, x + col1 + col2 + 1.2, tableY + 3.2);
      tableY += rowH;
    });
    return headerH + rowH * rows.length;
  };

  const drawHeader = () => {
    const barX = margin;
    const barY = y - 1.2;
    const barW = 2.2;
    const barH = lineHeight(t.fonts.title) + lineHeight(t.fonts.subtitle) + 0.4;
    doc.setFillColor(...t.colors.primary);
    doc.roundedRect(barX, barY, barW, barH, 1.1, 1.1, 'F');

    const textX = margin + barW + 3;
    setFont(t.fonts.title, true);
    doc.setTextColor(...t.colors.text);
    doc.text('Seguimiento de envío', textX, y + 0.6);
    const titleW = doc.getTextWidth('Seguimiento de envío');
    drawBadge('ECUBOX', textX + titleW + 3, y + 0.4, 'accent');
    y += lineHeight(t.fonts.title);

    setFont(t.fonts.subtitle, false);
    doc.setTextColor(...t.colors.muted);
    doc.text(
      `Guía: ${safe(data.numeroGuia)}  ·  Generado: ${formatFechaHora(new Date().toISOString())}`,
      textX,
      y,
    );
    y += lineHeight(t.fonts.subtitle);

    doc.setDrawColor(...t.colors.borderSoft);
    doc.line(margin, y, margin + width, y);
    y += headerBottomOffset + sectionGap;
  };

  const addPage = () => {
    doc.addPage('a4', 'portrait');
    y = margin;
    drawHeader();
  };

  const ensureSpace = (heightNeeded: number) => {
    if (y + heightNeeded <= contentMaxY) return;
    addPage();
  };

  const drawCard = (title: string, bodyHeight: number, render: (x: number, startY: number, contentW: number) => void) => {
    const cardHeight = cardHeaderHeight + cardPadding + bodyHeight + cardPadding;
    ensureSpace(cardHeight + sectionGap);
    const startY = y;

    doc.setDrawColor(...t.colors.border);
    doc.setFillColor(...t.colors.card);
    doc.roundedRect(margin, startY, width, cardHeight, t.cardRadius, t.cardRadius, 'FD');

    doc.setFillColor(...t.colors.cardHeader);
    doc.roundedRect(margin, startY, width, cardHeaderHeight, t.cardRadius, t.cardRadius, 'F');
    doc.setFillColor(...t.colors.cardHeader);
    doc.rect(margin, startY + cardHeaderHeight - t.cardRadius, width, t.cardRadius, 'F');

    doc.setFillColor(...t.colors.primary);
    doc.rect(margin, startY, 1.6, cardHeaderHeight, 'F');

    setFont(t.fonts.section, true);
    doc.setTextColor(...t.colors.primary);
    doc.text(title.toUpperCase(), margin + cardPadding + 1.2, startY + 4.4);

    doc.setDrawColor(...t.colors.borderSoft);
    doc.line(margin, startY + cardHeaderHeight, margin + width, startY + cardHeaderHeight);

    const contentX = margin + cardPadding;
    const contentY = startY + cardHeaderHeight + cardPadding + 0.2;
    const contentW = width - cardPadding * 2;
    render(contentX, contentY, contentW);
    y = startY + cardHeight + sectionGap;
  };

  const drawSummaryCard = () => {
    const contentW = width - cardPadding * 2;
    let bodyHeight = 0;
    bodyHeight += lineHeight(t.fonts.label);
    bodyHeight += lineHeight(t.fonts.value) + 0.5;
    bodyHeight += lineHeight(t.fonts.label) + 0.8;
    bodyHeight += lineHeight(t.fonts.body) + t.contentGap;
    if (data.flujoActual === 'ALTERNO') {
      let alternoH = 6.6;
      if (data.motivoAlterno) alternoH += wrap(data.motivoAlterno, contentW - 4).length * lineHeight(t.fonts.label) + 0.4;
      bodyHeight += alternoH + t.contentGap;
    }
    if (data.leyenda) {
      const leyendaH = wrap(data.leyenda, contentW - 4).length * lineHeight(t.fonts.body) + 3.6;
      bodyHeight += leyendaH + t.contentGap;
    }

    drawCard('Resumen', Math.max(bodyHeight, 16), (x, startY, maxW) => {
      let cursorY = startY;
      drawTextLines(['Envío'], x, cursorY, t.fonts.label, t.colors.muted);
      cursorY += lineHeight(t.fonts.label);
      drawTextLines([safe(data.numeroGuia)], x, cursorY, t.fonts.value, t.colors.text, true);

      const estadoLabel = safe(data.estadoRastreoNombre);
      drawBadge(estadoLabel, x + maxW - Math.max(34, doc.getTextWidth(estadoLabel) + 5), cursorY, 'accent');
      cursorY += lineHeight(t.fonts.value) + 0.4;

      drawTextLines(
        [`Estado actualizado: ${formatFecha(data.fechaEstadoDesde)}`],
        x,
        cursorY,
        t.fonts.label,
        t.colors.muted
      );
      cursorY += lineHeight(t.fonts.label) + 0.6;
      drawTextLines(
        [`Estado actual: ${safe(data.estadoRastreoNombre)}`],
        x,
        cursorY,
        t.fonts.body,
        t.colors.text
      );
      cursorY += lineHeight(t.fonts.body) + t.contentGap;

      if (data.flujoActual === 'ALTERNO') {
        const boxH = 6.8 + (data.motivoAlterno ? wrap(data.motivoAlterno, maxW - 4).length * lineHeight(t.fonts.label) : 0);
        doc.setDrawColor(...t.colors.warningStroke);
        doc.setFillColor(...t.colors.warningFill);
        doc.roundedRect(x, cursorY, maxW, boxH, 1.6, 1.6, 'FD');
        doc.setFillColor(...t.colors.warning);
        doc.rect(x, cursorY, 1.4, boxH, 'F');
        drawTextLines(
          ['Envío en flujo alterno por incidencia operativa'],
          x + 3,
          cursorY + 3.4,
          t.fonts.body,
          t.colors.warning,
          true
        );
        if (data.motivoAlterno) {
          drawTextLines(
            wrap(data.motivoAlterno, maxW - 5),
            x + 3,
            cursorY + 6.4,
            t.fonts.label,
            t.colors.text
          );
        }
        cursorY += boxH + t.contentGap;
      }

      if (data.leyenda) {
        const leyendaLines = wrap(data.leyenda, maxW - 5);
        const boxH = leyendaLines.length * lineHeight(t.fonts.body) + 3.8;
        doc.setDrawColor(...t.colors.infoStroke);
        doc.setFillColor(...t.colors.infoFill);
        doc.roundedRect(x, cursorY, maxW, boxH, 1.6, 1.6, 'FD');
        doc.setFillColor(...t.colors.info);
        doc.rect(x, cursorY, 1.4, boxH, 'F');
        drawTextLines(leyendaLines, x + 3, cursorY + 3.4, t.fonts.body, t.colors.text);
      }
    });
  };

  const drawProgressCard = (totalBase: number, pasoBaseActual: number) => {
    const progressPct = totalBase > 0 ? Math.max(0, Math.min(100, (pasoBaseActual / totalBase) * 100)) : 0;
    const showDias =
      data.diasMaxRetiro != null && (data.diasTranscurridos != null || data.diasRestantes != null);
    const periodoCumplido = data.diasRestantes === 0;

    let bodyHeight = lineHeight(t.fonts.label) + 7.2 + lineHeight(t.fonts.label) + t.contentGap;
    if (showDias) {
      bodyHeight += 12 + (periodoCumplido ? lineHeight(t.fonts.body) + 1 : 0);
    } else {
      bodyHeight += lineHeight(t.fonts.label);
    }
    drawCard('Progreso y plazos', bodyHeight, (x, startY, maxW) => {
      let cursorY = startY;
      drawTextLines(
        ['Flujo estimado según los estados configurados del envío.'],
        x,
        cursorY,
        t.fonts.label,
        t.colors.muted
      );
      cursorY += lineHeight(t.fonts.label) + 0.8;

      if (totalBase > 0) {
        const segGap = 1.2;
        const segH = 3;
        const totalGap = segGap * (totalBase - 1);
        const segW = (maxW - totalGap) / totalBase;
        for (let i = 0; i < totalBase; i++) {
          const done = i < pasoBaseActual;
          if (done) {
            doc.setFillColor(...t.colors.primary);
          } else {
            doc.setFillColor(...t.colors.borderSoft);
          }
          doc.roundedRect(x + i * (segW + segGap), cursorY, segW, segH, 1.1, 1.1, 'F');
        }
      } else {
        doc.setFillColor(...t.colors.borderSoft);
        doc.roundedRect(x, cursorY, maxW, 3, 1.1, 1.1, 'F');
      }
      cursorY += 5;

      setFont(t.fonts.label, true);
      doc.setTextColor(...t.colors.primary);
      const pctText = `${Math.round(progressPct)}%`;
      doc.text(pctText, x, cursorY);
      const pctW = doc.getTextWidth(pctText);
      drawTextLines(
        [`  ·  Paso base ${pasoBaseActual} de ${totalBase}`],
        x + pctW,
        cursorY,
        t.fonts.label,
        t.colors.muted
      );
      cursorY += lineHeight(t.fonts.label) + t.contentGap;

      if (showDias) {
        const boxW = (maxW - 1.8) / 2;
        drawMiniBox(x, cursorY, boxW, 'Días transcurridos', String(data.diasTranscurridos ?? 0));
        drawMiniBox(x + boxW + 1.8, cursorY, boxW, 'Días restantes para retiro', String(data.diasRestantes ?? 0));
        cursorY += 12.8;
        if (periodoCumplido) {
          drawTextLines(
            ['El periodo de espera ya se cumplió.'],
            x,
            cursorY,
            t.fonts.body,
            t.colors.text,
            true
          );
          cursorY += lineHeight(t.fonts.body) + 0.6;
        }
      } else {
        drawTextLines(
          ['Este envío no tiene un plazo máximo de retiro configurado.'],
          x,
          cursorY,
          t.fonts.label,
          t.colors.muted
        );
        cursorY += lineHeight(t.fonts.label) + 0.6;
      }
    });
  };

  const drawTimelineCards = (estados: NonNullable<TrackingResponse['estados']>, currentIndex: number) => {
    if (estados.length === 0) {
      drawCard('Flujo del envío', lineHeight(t.fonts.label) + 1.5, (x, startY) => {
        drawTextLines(['No hay estados configurados para mostrar el flujo.'], x, startY, t.fonts.label, t.colors.muted);
      });
      return;
    }

    let baseCounter = 0;
    const baseById = new Map<number, number>();
    estados.forEach((item) => {
      if (item.tipoFlujo === 'ALTERNO') return;
      baseCounter += 1;
      baseById.set(item.id, baseCounter);
    });

    const rowsPerCard = 14;
    let offset = 0;
    while (offset < estados.length) {
      const rows = estados.slice(offset, offset + rowsPerCard);
      let cardBodyHeight = lineHeight(t.fonts.label) + 1.4;
      cardBodyHeight += rows.length * 6;
      const hasMore = offset + rowsPerCard < estados.length;
      if (hasMore) cardBodyHeight += lineHeight(t.fonts.label) + 0.8;

      drawCard('Flujo del envío', cardBodyHeight, (x, startY, maxW) => {
        let cursorY = startY;
        drawTextLines(
          ['Secuencia real del paquete. Las novedades informativas se muestran solo cuando aplican.'],
          x,
          cursorY,
          t.fonts.label,
          t.colors.muted
        );
        cursorY += lineHeight(t.fonts.label) + 0.7;
        const dotX = x + 2;
        const textX = x + 6.4;
        const rowGap = 6;

        rows.forEach((item, idx) => {
          const globalIdx = offset + idx;
          const isLastVisible = idx === rows.length - 1;
          const isCompleted = !item.esActual && currentIndex >= 0 && globalIdx < currentIndex;
          const isAlterno = item.tipoFlujo === 'ALTERNO';
          const rowY = cursorY + idx * rowGap;

          if (!isLastVisible || hasMore) {
            doc.setDrawColor(...t.colors.border);
            doc.line(dotX, rowY + 1.5, dotX, rowY + rowGap);
          }
          const dotColor: [number, number, number] =
            item.esActual || isCompleted ? t.colors.primary : t.colors.border;
          const dotFill: [number, number, number] =
            item.esActual || isCompleted ? t.colors.primary : [255, 255, 255];
          doc.setDrawColor(...dotColor);
          doc.setFillColor(...dotFill);
          doc.circle(dotX, rowY + 0.9, 1.15, 'FD');

          let inlineX = textX;
          const primaryBadge = isAlterno ? 'Novedad informativa' : `Base ${baseById.get(item.id) ?? item.orden}`;
          inlineX += drawBadge(primaryBadge, inlineX, rowY + 1.8, isAlterno ? 'info' : 'neutral') + 1.8;

          setFont(t.fonts.body, item.esActual);
          doc.setTextColor(...(item.esActual || isCompleted ? t.colors.text : t.colors.muted));
          const actualBadgeW = item.esActual ? doc.getTextWidth('Actual') + 4.4 + 1.8 : 0;
          const maxNameW = Math.max(20, x + maxW - inlineX - actualBadgeW);
          const name = wrap(item.nombre, maxNameW, 1)[0] ?? '-';
          doc.text(name, inlineX, rowY + 1.8);
          inlineX += doc.getTextWidth(name) + 1.8;

          if (item.esActual) {
            const rightX = x + maxW - (doc.getTextWidth('Actual') + 4.4);
            drawBadge('Actual', Math.max(inlineX, rightX), rowY + 1.8, 'accent');
          }
        });
        if (hasMore) {
          drawTextLines(
            [`Continúa en la siguiente página (${estados.length - (offset + rows.length)} estado(s) más).`],
            x + 6.4,
            cursorY + rows.length * rowGap,
            t.fonts.label,
            t.colors.muted
          );
        }
      });

      offset += rowsPerCard;
    }
  };

  const drawDespachoCard = () => {
    if (!data.despacho) return;
    const d = data.despacho;
    const colGap = 2.6;
    const colW = (width - cardPadding * 2 - colGap) / 2;
    const sacaLabel = safe(data.sacaActual?.numeroOrden);
    const sacaMeta = `Tamaño: ${safe(data.sacaActual?.tamanio)} | Peso: ${formatPesoDual(data.sacaActual?.pesoKg, data.sacaActual?.pesoLbs)}`;
    const leftHeight =
      measureFieldHeight(safe(d.numeroGuia), colW, false) +
      measureFieldHeight(String(d.totalSacas ?? 0), colW, false) +
      measureFieldHeight(String(d.pesoTotalKg ?? 0), colW, false);
    const rightHeight =
      measureFieldHeight(safe(d.codigoPrecinto), colW, false) +
      measureFieldHeight(String(d.totalPaquetes ?? 0), colW, false) +
      measureFieldHeight(`${sacaLabel} · ${sacaMeta}`, colW, true);
    const bodyHeight = Math.max(leftHeight, rightHeight) + 0.8;
    drawCard('Resumen del envío', bodyHeight, (x, startY, maxW) => {
      const colW = (maxW - colGap) / 2;
      let leftY = startY;
      let rightY = startY;
      leftY += drawField('Guía del despacho', safe(d.numeroGuia), x, leftY, colW, false);
      leftY += drawField('Número de sacas', String(d.totalSacas ?? 0), x, leftY, colW, false);
      leftY += drawField('Peso total estimado', formatPesoDual(d.pesoTotalKg, d.pesoTotalLbs), x, leftY, colW, false);

      rightY += drawField('Precinto de seguridad', safe(d.codigoPrecinto), x + colW + colGap, rightY, colW, false);
      rightY += drawField(
        'Paquetes en este despacho',
        String(d.totalPaquetes ?? 0),
        x + colW + colGap,
        rightY,
        colW,
        false
      );
      drawField('Ubicación del paquete', `${sacaLabel} · ${sacaMeta}`, x + colW + colGap, rightY, colW, true);
    });
  };

  const drawPaquetesCards = () => {
    if (!data.despacho) return;
    const paquetes = data.paquetesDespacho ?? [];
    if (paquetes.length === 0) return;

    const rows = paquetes.map((p) => ({
      guia: safe(p.numeroGuia),
      estado: safe(p.estadoRastreoNombre),
      peso: formatPesoDual(p.pesoKg, p.pesoLbs),
    }));
    const rowsPerCard = 16;
    let offset = 0;
    while (offset < rows.length) {
      const chunk = rows.slice(offset, offset + rowsPerCard);
      const bodyHeight = drawTableHeight(chunk.length) + (offset + rowsPerCard < rows.length ? lineHeight(t.fonts.label) + 0.8 : 0);
      drawCard('Paquetes del despacho', bodyHeight, (x, startY, maxW) => {
        const used = drawTable(x, startY, maxW, chunk);
        if (offset + rowsPerCard < rows.length) {
          drawTextLines(
            [`Continúa en la siguiente página (${rows.length - (offset + chunk.length)} paquete(s) más).`],
            x,
            startY + used + 3.4,
            t.fonts.label,
            t.colors.muted
          );
        }
      });
      offset += rowsPerCard;
    }
  };

  const drawTableHeight = (rowCount: number) => 5 + rowCount * 4.6;

  const drawConsignatarioCard = () => {
    const dest = data.consignatario;
    const entries = [
      ['Nombre', safe(dest?.nombre ?? data.consignatarioNombre)],
      ['Provincia / Cantón', `${safe(dest?.provincia)} / ${safe(dest?.canton)}`],
    ] as const;
    let bodyHeight = 0;
    entries.forEach(([, value]) => {
      bodyHeight += lineHeight(t.fonts.label);
      bodyHeight += wrap(value, width - cardPadding * 2 - 2).length * lineHeight(t.fonts.body) + 1.2;
    });
    bodyHeight += lineHeight(t.fonts.label) + 0.6;

    drawCard('Consignatario', bodyHeight, (x, startY, maxW) => {
      let cursorY = startY;
      entries.forEach(([label, value]) => {
        cursorY += drawField(label, value, x, cursorY, maxW);
      });
      drawTextLines(
        ['La información mostrada depende de los eventos registrados por ECUBOX para esta guía.'],
        x,
        cursorY,
        t.fonts.label,
        t.colors.muted
      );
    });
  };

  const drawOperadorCard = () => {
    if (!data.despacho || !data.operadorEntrega) return;
    const op = data.operadorEntrega;
    const agencia =
      op.tipoEntrega === 'AGENCIA'
        ? [
            ['Agencia', safe(op.agenciaNombre)],
            ['Dirección', `${safe(op.agenciaDireccion)} - ${safe(op.agenciaProvincia)} / ${safe(op.agenciaCanton)}`],
            ['Horario', safe(op.horarioAtencionAgencia)],
            ['Días máx. retiro agencia', String(op.diasMaxRetiroAgencia ?? 'No configurado')],
          ]
        : op.tipoEntrega === 'AGENCIA_COURIER_ENTREGA'
          ? [
              ['Punto de entrega', safe(op.agenciaCourierEntregaEtiqueta)],
              [
                'Dirección',
                `${safe(op.agenciaCourierEntregaDireccion)} - ${safe(op.agenciaCourierEntregaProvincia)} / ${safe(op.agenciaCourierEntregaCanton)}`,
              ],
              ['Horario', safe(op.horarioAtencionAgenciaCourierEntrega)],
              ['Días máx. retiro punto de entrega', String(op.diasMaxRetiroAgenciaCourierEntrega ?? 'No configurado')],
            ]
          : [];

    let bodyHeight = 7.6;
    bodyHeight += 5 * (lineHeight(t.fonts.label) + lineHeight(t.fonts.body) + 0.8);
    if (agencia.length > 0) {
      bodyHeight += 2.6;
      bodyHeight += agencia.length * (lineHeight(t.fonts.label) + lineHeight(t.fonts.body) + 0.8);
    }

    drawCard('Operador de entrega', bodyHeight, (x, startY, maxW) => {
      let cursorY = startY;
      drawBadge(labelTipoEntrega(op.tipoEntrega), x, cursorY + 2, 'info');
      cursorY += 6.2;
      cursorY += drawField('CourierEntrega', safe(op.courierEntregaNombre), x, cursorY, maxW);
      cursorY += drawField(
        'Horario',
        safe(op.horarioRepartoCourierEntrega ?? op.horarioAtencionAgencia ?? op.horarioAtencionAgenciaCourierEntrega),
        x,
        cursorY,
        maxW
      );
      cursorY += drawField(
        'Días máx. retiro domicilio',
        String(op.diasMaxRetiroDomicilio ?? 'No configurado'),
        x,
        cursorY,
        maxW
      );
      const trackingUrl = safe(op.paginaTrackingCourierEntrega);
      const trackingUrlValue = trackingUrl === '-' ? 'No disponible para este envío' : trackingUrl;
      cursorY += drawField(
        'Tracking del courier de entrega',
        `${trackingHost(op.paginaTrackingCourierEntrega)} · ${trackingUrlValue}`,
        x,
        cursorY,
        maxW
      );
      if (agencia.length > 0) {
        doc.setDrawColor(...t.colors.border);
        doc.line(x, cursorY, x + maxW, cursorY);
        cursorY += 1.8;
        agencia.forEach(([label, value]) => {
          cursorY += drawField(label, value, x, cursorY, maxW);
        });
      }
    });
  };

  drawHeader();

  const estados = data.estados ?? [];
  const currentIndex = estados.findIndex((s) => s.esActual);
  const totalBase = estados.filter((s) => s.tipoFlujo !== 'ALTERNO').length;
  const pasoBaseActual = currentIndex >= 0
    ? estados.slice(0, currentIndex + 1).filter((s) => s.tipoFlujo !== 'ALTERNO').length
    : 0;

  drawSummaryCard();
  if (data.despacho) drawDespachoCard();
  drawProgressCard(totalBase, pasoBaseActual);
  drawTimelineCards(estados, currentIndex);
  drawPaquetesCards();
  drawConsignatarioCard();
  drawOperadorCard();

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setDrawColor(...t.colors.borderSoft);
    doc.line(margin, footerY - 3, PAGE_W - margin, footerY - 3);

    doc.setFillColor(...t.colors.primary);
    doc.circle(margin + 1.2, footerY - 1.1, 1.1, 'F');
    setFont(6.8, true);
    doc.setTextColor(...t.colors.primary);
    doc.text('ECUBOX', margin + 3.4, footerY);
    setFont(6.6, false);
    doc.setTextColor(...t.colors.muted);
    const brandW = doc.getTextWidth('ECUBOX');
    doc.text(`  ·  Comprobante de seguimiento`, margin + 3.4 + brandW, footerY);
    doc.text(`Página ${page} / ${totalPages}`, PAGE_W - margin, footerY, { align: 'right' });
  }
  return doc;
}
