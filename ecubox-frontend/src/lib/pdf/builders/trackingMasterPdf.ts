import { jsPDF } from 'jspdf';
import type {
  EstadoGuiaMaster,
  TrackingMasterEventoItem,
  TrackingMasterResponse,
  TrackingPiezaItem,
} from '@/lib/api/tracking.service';
import { TRACKING_COMPACT_A4_THEME, type PdfRgb } from '@/lib/pdf/theme';

const PAGE_W = 210;
const PAGE_H = 297;

const ESTADO_LABELS: Record<EstadoGuiaMaster, string> = {
  INCOMPLETA: 'Incompleta',
  PARCIAL_RECIBIDA: 'Parcialmente recibida',
  COMPLETA_RECIBIDA: 'Completa en bodega',
  PARCIAL_DESPACHADA: 'Despacho parcial',
  CERRADA: 'Cerrada',
  CERRADA_CON_FALTANTE: 'Cerrada con faltante',
};

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

type BadgeVariant =
  | 'neutral'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'destructive';

function variantFromEstado(estado?: EstadoGuiaMaster): BadgeVariant {
  switch (estado) {
    case 'COMPLETA_RECIBIDA':
    case 'CERRADA':
      return 'success';
    case 'PARCIAL_RECIBIDA':
    case 'PARCIAL_DESPACHADA':
      return 'info';
    case 'CERRADA_CON_FALTANTE':
      return 'warning';
    case 'INCOMPLETA':
      return 'destructive';
    default:
      return 'neutral';
  }
}

function variantFromPieza(item: TrackingPiezaItem): BadgeVariant {
  if (item.bloqueado) return 'destructive';
  if (item.enFlujoAlterno) return 'warning';
  if (item.estadoActualCodigo) return 'info';
  return 'neutral';
}

export function buildTrackingMasterPdf(data: TrackingMasterResponse): jsPDF {
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
    color: PdfRgb,
    bold = false,
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
    multiline = true,
  ) => {
    const labelHeight = drawTextLines([label], x, startY, t.fonts.label, t.colors.muted);
    const valueLines = multiline ? wrap(value, maxWidth) : [value];
    const valueHeight = drawTextLines(
      valueLines,
      x,
      startY + labelHeight + 0.4,
      t.fonts.body,
      t.colors.text,
      true,
    );
    return labelHeight + valueHeight + 0.8;
  };

  const drawBadge = (
    label: string,
    x: number,
    baselineY: number,
    variant: BadgeVariant,
  ) => {
    setFont(t.fonts.badge, false);
    const textWidth = doc.getTextWidth(label);
    const padX = 2.4;
    const h = 4.6;
    const w = textWidth + padX * 2;
    let stroke: PdfRgb = t.colors.border;
    let fill: PdfRgb = [248, 247, 252];
    let text: PdfRgb = t.colors.muted;
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
    doc.text('Guía del consolidador', textX, y + 0.6);
    const titleW = doc.getTextWidth('Guía del consolidador');
    drawBadge('ECUBOX', textX + titleW + 3, y + 0.4, 'accent');
    y += lineHeight(t.fonts.title);

    setFont(t.fonts.subtitle, false);
    doc.setTextColor(...t.colors.muted);
    doc.text(
      `Tracking: ${safe(data.trackingBase)}  ·  Generado: ${formatFechaHora(new Date().toISOString())}`,
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

  const drawCard = (
    title: string,
    bodyHeight: number,
    render: (x: number, startY: number, contentW: number) => void,
  ) => {
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

  const drawSummaryCard = () => {
    const total = data.totalPiezasEsperadas ?? data.piezasRegistradas ?? 0;
    const recibidas = data.piezasRecibidas ?? 0;
    const despachadas = data.piezasDespachadas ?? 0;
    const registradas = data.piezasRegistradas ?? 0;
    const estadoLabel = data.estadoGlobal ? ESTADO_LABELS[data.estadoGlobal] : 'Sin estado';
    const estadoVariant = variantFromEstado(data.estadoGlobal);

    const bodyHeight =
      lineHeight(t.fonts.label) +
      lineHeight(t.fonts.value) +
      0.4 +
      lineHeight(t.fonts.label) +
      lineHeight(t.fonts.body) +
      t.contentGap +
      13 +
      t.contentGap;

    drawCard('Resumen del consolidado', bodyHeight, (x, startY, maxW) => {
      let cursorY = startY;
      drawTextLines(['Tracking del consolidador'], x, cursorY, t.fonts.label, t.colors.muted);
      cursorY += lineHeight(t.fonts.label);
      drawTextLines([safe(data.trackingBase)], x, cursorY, t.fonts.value, t.colors.text, true);
      const valueW = doc.getTextWidth(safe(data.trackingBase));
      drawBadge(estadoLabel, Math.min(x + valueW + 4, x + maxW - 35), cursorY, estadoVariant);
      cursorY += lineHeight(t.fonts.value) + 0.4;

      drawTextLines(['Destinatario'], x, cursorY, t.fonts.label, t.colors.muted);
      cursorY += lineHeight(t.fonts.label);
      drawTextLines(
        [safe(data.destinatarioNombre)],
        x,
        cursorY,
        t.fonts.body,
        t.colors.text,
        true,
      );
      cursorY += lineHeight(t.fonts.body) + t.contentGap;

      const colGap = 2.2;
      const colW = (maxW - colGap * 3) / 4;
      drawMiniBox(x, cursorY, colW, 'Esperadas', String(total));
      drawMiniBox(x + (colW + colGap) * 1, cursorY, colW, 'Registradas', String(registradas));
      drawMiniBox(x + (colW + colGap) * 2, cursorY, colW, 'Recibidas', String(recibidas));
      drawMiniBox(x + (colW + colGap) * 3, cursorY, colW, 'Despachadas', String(despachadas));
    });
  };

  const drawProgressCard = () => {
    const total = data.totalPiezasEsperadas ?? data.piezasRegistradas ?? 0;
    const recibidas = data.piezasRecibidas ?? 0;
    const despachadas = data.piezasDespachadas ?? 0;
    const pctRec = total > 0 ? Math.min(100, (recibidas / total) * 100) : 0;
    const pctDes = total > 0 ? Math.min(100, (despachadas / total) * 100) : 0;

    const dateRowH = lineHeight(t.fonts.label) + lineHeight(t.fonts.body) + 0.8;
    const bodyHeight = total > 0
      ? (lineHeight(t.fonts.label) + 4 + 5 + lineHeight(t.fonts.label) + 4 + 5 + t.contentGap) +
        dateRowH * 2
      : lineHeight(t.fonts.label) + dateRowH * 2 + t.contentGap;

    drawCard('Avance del consolidado', bodyHeight, (x, startY, maxW) => {
      let cursorY = startY;
      if (total > 0) {
        drawTextLines(
          [`Recibidas ${recibidas} de ${total}  ·  ${Math.round(pctRec)}%`],
          x,
          cursorY,
          t.fonts.label,
          t.colors.primary,
          true,
        );
        cursorY += lineHeight(t.fonts.label) + 0.8;
        doc.setFillColor(...t.colors.borderSoft);
        doc.roundedRect(x, cursorY, maxW, 3, 1.1, 1.1, 'F');
        doc.setFillColor(...t.colors.primary);
        if (pctRec > 0) {
          doc.roundedRect(x, cursorY, (maxW * pctRec) / 100, 3, 1.1, 1.1, 'F');
        }
        cursorY += 5;

        drawTextLines(
          [`Despachadas ${despachadas} de ${total}  ·  ${Math.round(pctDes)}%`],
          x,
          cursorY,
          t.fonts.label,
          t.colors.success,
          true,
        );
        cursorY += lineHeight(t.fonts.label) + 0.8;
        doc.setFillColor(...t.colors.borderSoft);
        doc.roundedRect(x, cursorY, maxW, 3, 1.1, 1.1, 'F');
        doc.setFillColor(...t.colors.success);
        if (pctDes > 0) {
          doc.roundedRect(x, cursorY, (maxW * pctDes) / 100, 3, 1.1, 1.1, 'F');
        }
        cursorY += 5 + t.contentGap;
      } else {
        drawTextLines(
          ['Aún no se ha definido el total de piezas esperadas para esta guía.'],
          x,
          cursorY,
          t.fonts.label,
          t.colors.muted,
        );
        cursorY += lineHeight(t.fonts.label) + t.contentGap;
      }

      const colGap = 3;
      const colW = (maxW - colGap) / 2;
      drawField(
        'Primera recepción',
        formatFecha(data.fechaPrimeraRecepcion),
        x,
        cursorY,
        colW,
        false,
      );
      drawField(
        'Primer despacho',
        formatFecha(data.fechaPrimeraPiezaDespachada),
        x + colW + colGap,
        cursorY,
        colW,
        false,
      );
    });
  };

  const drawPiezasCard = () => {
    const piezas = data.piezas ?? [];
    if (piezas.length === 0) {
      drawCard('Piezas de la guía', lineHeight(t.fonts.label) + 1, (x, startY) => {
        drawTextLines(
          ['Aún no se han registrado piezas de esta guía.'],
          x,
          startY,
          t.fonts.label,
          t.colors.muted,
        );
      });
      return;
    }

    const headerH = 5.4;
    const rowH = 5.4;
    const rowsPerCard = 22;
    let offset = 0;
    while (offset < piezas.length) {
      const chunk = piezas.slice(offset, offset + rowsPerCard);
      const remaining = piezas.length - (offset + chunk.length);
      const bodyHeight = headerH + chunk.length * rowH + (remaining > 0 ? lineHeight(t.fonts.label) + 1 : 0);

      drawCard(
        offset === 0 ? `Piezas de la guía (${piezas.length})` : 'Piezas de la guía (continuación)',
        bodyHeight,
        (x, startY, maxW) => {
          const colPieza = maxW * 0.18;
          const colGuia = maxW * 0.42;

          doc.setDrawColor(...t.colors.borderSoft);
          doc.setFillColor(...t.colors.cardHeader);
          doc.roundedRect(x, startY, maxW, headerH, 1, 1, 'FD');
          setFont(t.fonts.label, true);
          doc.setTextColor(...t.colors.primary);
          doc.text('Pieza', x + 1.4, startY + 3.6);
          doc.text('Número de guía', x + colPieza + 1.4, startY + 3.6);
          doc.text('Estado actual', x + colPieza + colGuia + 1.4, startY + 3.6);

          let rowY = startY + headerH;
          chunk.forEach((p, idx) => {
            if (idx % 2 === 1) {
              doc.setFillColor(...t.colors.row);
              doc.rect(x, rowY, maxW, rowH, 'F');
            }
            doc.setDrawColor(...t.colors.borderSoft);
            doc.line(x, rowY + rowH, x + maxW, rowY + rowH);

            const piezaLbl =
              p.piezaNumero != null
                ? `${p.piezaNumero}${p.piezaTotal ? `/${p.piezaTotal}` : ''}`
                : '-';
            setFont(t.fonts.body, true);
            doc.setTextColor(...t.colors.text);
            doc.text(piezaLbl, x + 1.4, rowY + 3.6);

            setFont(t.fonts.body, false);
            const guia = wrap(safe(p.numeroGuia), colGuia - 2.8, 1)[0] ?? '-';
            doc.text(guia, x + colPieza + 1.4, rowY + 3.6);

            const estadoTxt = safe(p.estadoActualNombre);
            const variant = variantFromPieza(p);
            drawBadge(estadoTxt, x + colPieza + colGuia + 1.4, rowY + 3.6, variant);

            rowY += rowH;
          });
          if (remaining > 0) {
            drawTextLines(
              [`Continúa en la siguiente página (${remaining} pieza(s) más).`],
              x,
              rowY + 1.6,
              t.fonts.label,
              t.colors.muted,
            );
          }
        },
      );
      offset += rowsPerCard;
    }
  };

  const drawTimelineCard = () => {
    const timeline: TrackingMasterEventoItem[] = data.timeline ?? [];
    if (timeline.length === 0) return;
    const ordered = [...timeline]
      .sort((a, b) => {
        const at = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
        const bt = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
        return bt - at;
      })
      .slice(0, 30);

    const rowH = 7;
    const rowsPerCard = 16;
    let offset = 0;
    while (offset < ordered.length) {
      const chunk = ordered.slice(offset, offset + rowsPerCard);
      const remaining = ordered.length - (offset + chunk.length);
      const bodyHeight = chunk.length * rowH + (remaining > 0 ? lineHeight(t.fonts.label) + 1 : 0);

      drawCard(
        offset === 0 ? `Actividad reciente` : 'Actividad reciente (continuación)',
        bodyHeight,
        (x, startY, maxW) => {
          const dotX = x + 2;
          const textX = x + 6.6;
          chunk.forEach((ev, idx) => {
            const rowY = startY + idx * rowH;
            const isLast = idx === chunk.length - 1 && remaining === 0;
            if (!isLast) {
              doc.setDrawColor(...t.colors.borderSoft);
              doc.line(dotX, rowY + 1.4, dotX, rowY + rowH);
            }
            doc.setDrawColor(...t.colors.primary);
            doc.setFillColor(...t.colors.primary);
            doc.circle(dotX, rowY + 1, 1.2, 'FD');

            const piezaLbl =
              ev.piezaNumero != null
                ? `Pieza ${ev.piezaNumero}${ev.piezaTotal ? `/${ev.piezaTotal}` : ''}`
                : 'Pieza';
            setFont(t.fonts.body, true);
            doc.setTextColor(...t.colors.text);
            const principal = `${piezaLbl}${ev.estadoNombre ? `  ·  ${ev.estadoNombre}` : ''}`;
            const principalTxt = wrap(principal, maxW - 8, 1)[0] ?? '';
            doc.text(principalTxt, textX, rowY + 1.8);

            setFont(t.fonts.label, false);
            doc.setTextColor(...t.colors.muted);
            const meta = `${safe(ev.numeroGuia)}${ev.occurredAt ? `  ·  ${formatFechaHora(ev.occurredAt)}` : ''}`;
            const metaTxt = wrap(meta, maxW - 8, 1)[0] ?? '';
            doc.text(metaTxt, textX, rowY + 5);
          });
          if (remaining > 0) {
            drawTextLines(
              [`Continúa en la siguiente página (${remaining} evento(s) más).`],
              x,
              startY + chunk.length * rowH + 1.6,
              t.fonts.label,
              t.colors.muted,
            );
          }
        },
      );
      offset += rowsPerCard;
    }
  };

  const drawDestinatarioCard = () => {
    const dest = data.destinatario;
    const nombre = dest?.nombre ?? data.destinatarioNombre ?? null;
    const provincia = dest?.provincia ?? null;
    const canton = dest?.canton ?? null;
    const tieneUbicacion = Boolean(provincia || canton);
    if (!nombre && !tieneUbicacion) return;

    const colGap = 3;
    const colW = (width - cardPadding * 2 - colGap) / 2;
    const fieldH = lineHeight(t.fonts.label) + lineHeight(t.fonts.body) + 0.8;
    const noteH = lineHeight(t.fonts.label) + 0.6;
    const bodyHeight = fieldH + noteH;

    drawCard('Destinatario', bodyHeight, (x, startY) => {
      drawField(
        'Nombre',
        safe(nombre),
        x,
        startY,
        colW,
        false,
      );
      drawField(
        'Provincia / Cantón',
        tieneUbicacion ? `${provincia ?? '-'} / ${canton ?? '-'}` : 'No disponible',
        x + colW + colGap,
        startY,
        colW,
        false,
      );
      drawTextLines(
        ['Por privacidad no se exponen teléfonos ni direcciones exactas.'],
        x,
        startY + fieldH,
        t.fonts.label,
        t.colors.muted,
      );
    });
  };

  drawHeader();
  drawSummaryCard();
  drawProgressCard();
  drawDestinatarioCard();
  drawPiezasCard();
  drawTimelineCard();

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
