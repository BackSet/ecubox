import type { jsPDF } from 'jspdf';
import { ECUBOX_PDF_COLORS, type PdfRgb } from '@/lib/pdf/theme';

const PAGE_W = 210;
const PAGE_H = 297;

export type DocumentBadgeVariant =
  | 'neutral'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'destructive';

export interface DocumentStat {
  label: string;
  value: string;
}

export interface DocumentKeyValue {
  label: string;
  value: string;
}

export interface DocumentTimelineItem {
  title: string;
  subtitle?: string;
  date?: string | null;
  isCurrent?: boolean;
  isCompleted?: boolean;
  isAlternate?: boolean;
}

export interface DocumentTableColumn {
  key: string;
  label: string;
  widthRatio: number;
}

export interface DocumentHeroOptions {
  docType: string;
  reference: string;
  statusLabel: string;
  statusVariant?: DocumentBadgeVariant;
  subtitle?: string;
  progressPct?: number;
  progressCaption?: string;
  stats?: DocumentStat[];
}

export interface TrackingDocumentRendererOptions {
  margin?: number;
  footerHeight?: number;
  repeatHeroOnNewPage?: boolean;
  heroSnapshot?: DocumentHeroOptions;
}

export class TrackingDocumentRenderer {
  readonly doc: jsPDF;
  readonly margin: number;
  readonly width: number;
  readonly colors = ECUBOX_PDF_COLORS;
  readonly contentMaxY: number;
  readonly footerY: number;

  private y: number;
  private readonly sectionGap = 5;
  private readonly repeatHeroOnNewPage: boolean;
  private heroSnapshot?: DocumentHeroOptions;
  private compactHeaderLabel?: string;

  constructor(doc: jsPDF, options: TrackingDocumentRendererOptions = {}) {
    this.doc = doc;
    this.margin = options.margin ?? 12;
    this.width = PAGE_W - this.margin * 2;
    const footerHeight = options.footerHeight ?? 10;
    this.contentMaxY = PAGE_H - footerHeight - 6;
    this.footerY = PAGE_H - 5;
    this.y = this.margin;
    this.repeatHeroOnNewPage = options.repeatHeroOnNewPage ?? false;
    this.heroSnapshot = options.heroSnapshot;
  }

  get cursorY(): number {
    return this.y;
  }

  set cursorY(value: number) {
    this.y = value;
  }

  private setFont(size: number, bold = false) {
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
    this.doc.setFontSize(size);
  }

  private wrap(value: string, maxWidth: number, maxLines?: number) {
    const lines = this.doc.splitTextToSize(value, maxWidth) as string[];
    if (!maxLines || lines.length <= maxLines) return lines;
    const clipped = lines.slice(0, maxLines);
    clipped[maxLines - 1] = `${clipped[maxLines - 1]}...`;
    return clipped;
  }

  private drawBrandLockup(x: number, baselineY: number, tone: 'light' | 'accent' = 'light') {
    const ink = tone === 'light' ? this.colors.white : this.colors.primary;
    this.doc.setTextColor(...ink);
    this.doc.setDrawColor(...ink);
    this.doc.setLineWidth(0.35);
    this.doc.roundedRect(x, baselineY - 3.9, 8.4, 5.8, 1.4, 1.4, 'S');
    this.setFont(6.4, true);
    this.doc.text('ec', x + 4.2, baselineY, { align: 'center' });
    this.setFont(8.5, true);
    this.doc.text('ECUBOX', x + 11, baselineY - 1.2);
    this.setFont(4.8, false);
    this.doc.text('Conecta - Envia - Llega', x + 11, baselineY + 1.2);
  }

  ensureSpace(heightNeeded: number) {
    if (this.y + heightNeeded <= this.contentMaxY) return;
    this.addPage();
  }

  addPage() {
    this.doc.addPage('a4', 'portrait');
    this.y = this.margin;
    if (this.repeatHeroOnNewPage && this.heroSnapshot) {
      this.drawCompactHeader(this.compactHeaderLabel ?? this.heroSnapshot.reference);
    }
  }

  drawBadge(
    label: string,
    x: number,
    baselineY: number,
    variant: DocumentBadgeVariant = 'neutral'
  ) {
    this.setFont(6.8, false);
    const textWidth = this.doc.getTextWidth(label);
    const padX = 2.6;
    const h = 4.8;
    const w = textWidth + padX * 2;
    let stroke: PdfRgb = this.colors.border;
    let fill: PdfRgb = [248, 247, 252];
    let text: PdfRgb = this.colors.muted;
    switch (variant) {
      case 'accent':
        stroke = this.colors.primarySoftStroke;
        fill = this.colors.primarySoftFill;
        text = this.colors.primary;
        break;
      case 'info':
        stroke = this.colors.infoStroke;
        fill = this.colors.infoFill;
        text = this.colors.info;
        break;
      case 'success':
        stroke = this.colors.successStroke;
        fill = this.colors.successFill;
        text = this.colors.success;
        break;
      case 'warning':
        stroke = this.colors.warningStroke;
        fill = this.colors.warningFill;
        text = this.colors.warning;
        break;
      case 'destructive':
        stroke = this.colors.destructiveStroke;
        fill = this.colors.destructiveFill;
        text = this.colors.destructive;
        break;
      default:
        break;
    }
    this.doc.setDrawColor(...stroke);
    this.doc.setFillColor(...fill);
    this.doc.roundedRect(x, baselineY - 3.5, w, h, 2.4, 2.4, 'FD');
    this.doc.setTextColor(...text);
    this.doc.text(label, x + padX, baselineY);
    return w;
  }

  drawHero(options: DocumentHeroOptions) {
    this.heroSnapshot = options;
    this.compactHeaderLabel = options.reference;

    const heroH = 46 + (options.stats?.length ? 14 : 0);
    this.ensureSpace(heroH);

    const x = this.margin;
    const startY = this.y;
    const bandH = 9;

    this.doc.setFillColor(...this.colors.primary);
    this.doc.roundedRect(x, startY, this.width, bandH, 2.4, 2.4, 'F');
    this.drawBrandLockup(x + 4, startY + 5.8, 'light');
    this.setFont(7.2, false);
    this.doc.setTextColor(...this.colors.white);
    this.doc.text(options.docType, x + 45, startY + 5.8);

    const generated = new Date().toLocaleString('es-EC', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    this.doc.text(`Generado ${generated}`, x + this.width, startY + 5.8, { align: 'right' });

    const bodyY = startY + bandH + 3;
    const bodyH = heroH - bandH - 3;
    this.doc.setDrawColor(...this.colors.borderSoft);
    this.doc.setFillColor(...this.colors.card);
    this.doc.roundedRect(x, bodyY, this.width, bodyH, 2.4, 2.4, 'FD');

    let cursorY = bodyY + 5;
    this.setFont(7, false);
    this.doc.setTextColor(...this.colors.muted);
    this.doc.text('Referencia', x + 5, cursorY);
    cursorY += 4;

    this.setFont(15, true);
    this.doc.setTextColor(...this.colors.textStrong);
    const refLines = this.wrap(options.reference, this.width - 50, 2);
    refLines.forEach((line, idx) => {
      this.doc.text(line, x + 5, cursorY + idx * 6.2);
    });
    cursorY += refLines.length * 6.2 + 1;

    const badgeVariant = options.statusVariant ?? 'accent';
    this.drawBadge(options.statusLabel, x + 5, cursorY, badgeVariant);

    if (options.subtitle) {
      this.setFont(7.2, false);
      this.doc.setTextColor(...this.colors.muted);
      const subLines = this.wrap(options.subtitle, this.width - 10, 2);
      subLines.forEach((line, idx) => {
        this.doc.text(line, x + 5, cursorY + 5 + idx * 3.6);
      });
      cursorY += 5 + subLines.length * 3.6;
    } else {
      cursorY += 4;
    }

    if (options.progressPct != null) {
      const pct = Math.max(0, Math.min(100, options.progressPct));
      const barY = cursorY;
      this.doc.setFillColor(...this.colors.borderSoft);
      this.doc.roundedRect(x + 5, barY, this.width - 10, 2.8, 1.2, 1.2, 'F');
      if (pct > 0) {
        this.doc.setFillColor(...this.colors.primary);
        this.doc.roundedRect(x + 5, barY, ((this.width - 10) * pct) / 100, 2.8, 1.2, 1.2, 'F');
      }
      cursorY += 5.2;
      if (options.progressCaption) {
        this.setFont(7, false);
        this.doc.setTextColor(...this.colors.primary);
        this.doc.text(options.progressCaption, x + 5, cursorY);
        cursorY += 4;
      }
    }

    if (options.stats?.length) {
      const gap = 2.4;
      const count = options.stats.length;
      const boxW = (this.width - 10 - gap * (count - 1)) / count;
      let statX = x + 5;
      options.stats.forEach((stat) => {
        this.doc.setDrawColor(...this.colors.borderSoft);
        this.doc.setFillColor(...this.colors.cardSoft);
        this.doc.roundedRect(statX, cursorY, boxW, 11, 1.8, 1.8, 'FD');
        this.setFont(6.4, true);
        this.doc.setTextColor(...this.colors.muted);
        this.doc.text(stat.label.toUpperCase(), statX + 2.4, cursorY + 4);
        this.setFont(10, true);
        this.doc.setTextColor(...this.colors.text);
        const val = this.wrap(stat.value, boxW - 4.8, 1)[0] ?? '-';
        this.doc.text(val, statX + 2.4, cursorY + 9);
        statX += boxW + gap;
      });
    }

    this.y = startY + heroH + this.sectionGap;
  }

  drawCompactHeader(reference: string) {
    const h = 10;
    this.ensureSpace(h);
    const x = this.margin;
    const startY = this.y;
    this.doc.setFillColor(...this.colors.primarySoftFill);
    this.doc.roundedRect(x, startY, this.width, h, 1.8, 1.8, 'F');
    this.drawBrandLockup(x + 3.5, startY + 6.2, 'accent');
    this.setFont(7.2, false);
    this.doc.setTextColor(...this.colors.text);
    this.doc.text(reference, x + 37, startY + 6.2);
    this.y = startY + h + 3;
  }

  drawSectionTitle(title: string, description?: string) {
    const descLines = description ? this.wrap(description, this.width - 8, 2) : [];
    const blockH = 6 + descLines.length * 3.4;
    this.ensureSpace(blockH + 2);
    const x = this.margin;
    const startY = this.y;

    this.doc.setFillColor(...this.colors.primary);
    this.doc.roundedRect(x, startY + 0.5, 1.2, 5.5, 0.4, 0.4, 'F');
    this.setFont(10, true);
    this.doc.setTextColor(...this.colors.textStrong);
    this.doc.text(title, x + 3.5, startY + 5.2);

    if (description) {
      this.setFont(7, false);
      this.doc.setTextColor(...this.colors.muted);
      descLines.forEach((line, idx) => {
        this.doc.text(line, x + 3.5, startY + 8.8 + idx * 3.4);
      });
    }

    this.y = startY + blockH + 2;
  }

  drawCallout(
    variant: 'info' | 'warning' | 'destructive',
    title: string,
    body?: string
  ) {
    const bodyLines = body ? this.wrap(body, this.width - 12, 4) : [];
    const h = 7 + bodyLines.length * 3.4;
    this.ensureSpace(h + 2);
    const x = this.margin;
    const startY = this.y;

    const palette =
      variant === 'warning'
        ? { stroke: this.colors.warningStroke, fill: this.colors.warningFill, accent: this.colors.warning }
        : variant === 'destructive'
          ? { stroke: this.colors.destructiveStroke, fill: this.colors.destructiveFill, accent: this.colors.destructive }
          : { stroke: this.colors.infoStroke, fill: this.colors.infoFill, accent: this.colors.info };

    this.doc.setDrawColor(...palette.stroke);
    this.doc.setFillColor(...palette.fill);
    this.doc.roundedRect(x, startY, this.width, h, 2, 2, 'FD');
    this.doc.setFillColor(...palette.accent);
    this.doc.rect(x, startY, 1.3, h, 'F');

    this.setFont(7.6, true);
    this.doc.setTextColor(...palette.accent);
    this.doc.text(title, x + 4, startY + 4.6);
    if (bodyLines.length) {
      this.setFont(7.2, false);
      this.doc.setTextColor(...this.colors.text);
      bodyLines.forEach((line, idx) => {
        this.doc.text(line, x + 4, startY + 8.2 + idx * 3.4);
      });
    }

    this.y = startY + h + 3;
  }

  drawKeyValueGrid(rows: DocumentKeyValue[][], colGap = 4) {
    if (rows.length === 0) return;
    const cols = rows[0]?.length ?? 1;
    const colW = (this.width - colGap * (cols - 1)) / cols;

    let blockH = 0;
    rows.forEach((row) => {
      let rowH = 0;
      row.forEach((cell) => {
        const valLines = this.wrap(cell.value, colW - 2, 3);
        const cellH = 3.8 + valLines.length * 3.5;
        rowH = Math.max(rowH, cellH);
      });
      blockH += rowH + 2.4;
    });

    this.ensureSpace(blockH);
    const startY = this.y;
    let cursorY = startY;

    rows.forEach((row) => {
      let rowH = 0;
      row.forEach((cell, colIdx) => {
        const x = this.margin + colIdx * (colW + colGap);
        this.setFont(6.6, true);
        this.doc.setTextColor(...this.colors.muted);
        this.doc.text(cell.label.toUpperCase(), x, cursorY + 3);
        const valLines = this.wrap(cell.value, colW - 2, 3);
        this.setFont(8.2, true);
        this.doc.setTextColor(...this.colors.text);
        valLines.forEach((line, idx) => {
          this.doc.text(line, x, cursorY + 6.8 + idx * 3.5);
        });
        const cellH = 3.8 + valLines.length * 3.5;
        rowH = Math.max(rowH, cellH);
      });
      cursorY += rowH + 2.4;
    });

    this.y = cursorY + 1;
  }

  drawTimeline(
    items: DocumentTimelineItem[],
    rowsPerPage = 12,
    options?: {
      title?: string;
      continuationTitle?: string;
      description?: string;
      emptyMessage?: string;
    }
  ) {
    const title = options?.title ?? 'Recorrido del envío';
    const continuationTitle = options?.continuationTitle ?? `${title} (continuación)`;
    const description = options?.description ?? 'Secuencia de estados registrados para este envío.';
    const emptyMessage =
      options?.emptyMessage ?? 'No hay estados configurados para mostrar el recorrido.';

    if (items.length === 0) {
      this.drawSectionTitle(title, description);
      this.ensureSpace(6);
      this.setFont(7.2, false);
      this.doc.setTextColor(...this.colors.muted);
      this.doc.text(emptyMessage, this.margin, this.y + 4);
      this.y += 8;
      return;
    }

    let offset = 0;
    while (offset < items.length) {
      const chunk = items.slice(offset, offset + rowsPerPage);
      const isFirst = offset === 0;
      this.drawSectionTitle(
        isFirst ? title : continuationTitle,
        isFirst ? description : undefined
      );

      const rowH = 8.5;
      const blockH = chunk.length * rowH + (offset + chunk.length < items.length ? 5 : 0);
      this.ensureSpace(blockH);

      const x = this.margin;
      const dotX = x + 2;
      const textX = x + 8;
      const dateX = x + this.width - 2;
      let rowY = this.y;

      chunk.forEach((item, idx) => {
        const globalLast = offset + idx === items.length - 1;
        if (!globalLast) {
          this.doc.setDrawColor(...this.colors.border);
          this.doc.line(dotX, rowY + 1.6, dotX, rowY + rowH);
        }

        const active = item.isCurrent || item.isCompleted;
        this.doc.setDrawColor(...(active ? this.colors.primary : this.colors.border));
        this.doc.setFillColor(...(item.isCurrent ? this.colors.primary : active ? this.colors.primarySoftFill : this.colors.white));
        this.doc.circle(dotX, rowY + 1.4, 1.35, 'FD');

        this.setFont(8.2, item.isCurrent);
        this.doc.setTextColor(...(active ? this.colors.text : this.colors.muted));
        const title = this.wrap(item.title, this.width - 52, 1)[0] ?? '-';
        this.doc.text(title, textX, rowY + 2);

        if (item.isCurrent) {
          this.drawBadge('Actual', textX + this.doc.getTextWidth(title) + 2, rowY + 2, 'accent');
        } else if (item.isAlternate) {
          this.drawBadge('Novedad', textX + this.doc.getTextWidth(title) + 2, rowY + 2, 'info');
        }

        if (item.subtitle) {
          this.setFont(6.8, false);
          this.doc.setTextColor(...this.colors.muted);
          const sub = this.wrap(item.subtitle, this.width - 52, 1)[0] ?? '';
          if (sub) this.doc.text(sub, textX, rowY + 5.6);
        }

        if (item.date) {
          this.setFont(6.8, false);
          this.doc.setTextColor(...this.colors.muted);
          this.doc.text(item.date, dateX, rowY + 2, { align: 'right' });
        } else if (!item.isCurrent && !item.isCompleted) {
          this.setFont(6.8, false);
          this.doc.setTextColor(...this.colors.muted);
          this.doc.text('Pendiente', dateX, rowY + 2, { align: 'right' });
        }

        rowY += rowH;
      });

      if (offset + chunk.length < items.length) {
        this.setFont(6.8, false);
        this.doc.setTextColor(...this.colors.muted);
        this.doc.text(
          `Continúa en la siguiente página (${items.length - offset - chunk.length} estado(s) más).`,
          this.margin,
          rowY + 2
        );
        rowY += 5;
      }

      this.y = rowY + this.sectionGap;
      offset += rowsPerPage;
    }
  }

  drawTable(columns: DocumentTableColumn[], rows: Record<string, string>[]) {
    if (rows.length === 0) return;

    const headerH = 6;
    const rowH = 5.2;
    const rowsPerPage = 18;
    let offset = 0;

    while (offset < rows.length) {
      const chunk = rows.slice(offset, offset + rowsPerPage);
      const blockH = headerH + chunk.length * rowH + (offset + chunk.length < rows.length ? 4 : 0);
      this.ensureSpace(blockH);

      const x = this.margin;
      let tableY = this.y;
      const colWidths = columns.map((c) => c.widthRatio * this.width);

      this.doc.setFillColor(...this.colors.primarySoftFill);
      this.doc.roundedRect(x, tableY, this.width, headerH, 1.2, 1.2, 'F');
      this.setFont(6.8, true);
      this.doc.setTextColor(...this.colors.primary);
      let colX = x + 2;
      columns.forEach((col, idx) => {
        this.doc.text(col.label, colX, tableY + 4.2);
        colX += colWidths[idx] ?? 0;
      });
      tableY += headerH;

      chunk.forEach((row, idx) => {
        if (idx % 2 === 1) {
          this.doc.setFillColor(...this.colors.row);
          this.doc.rect(x, tableY, this.width, rowH, 'F');
        }
        this.doc.setDrawColor(...this.colors.borderSoft);
        this.doc.line(x, tableY + rowH, x + this.width, tableY + rowH);

        colX = x + 2;
        columns.forEach((col, colIdx) => {
          const w = (colWidths[colIdx] ?? 0) - 4;
          this.setFont(7.4, false);
          this.doc.setTextColor(...this.colors.text);
          const cell = this.wrap(row[col.key] ?? '-', w, 1)[0] ?? '-';
          this.doc.text(cell, colX, tableY + 3.6);
          colX += colWidths[colIdx] ?? 0;
        });
        tableY += rowH;
      });

      if (offset + chunk.length < rows.length) {
        this.setFont(6.8, false);
        this.doc.setTextColor(...this.colors.muted);
        this.doc.text(
          `Continúa en la siguiente página (${rows.length - offset - chunk.length} fila(s) más).`,
          x,
          tableY + 3
        );
        tableY += 5;
      }

      this.y = tableY + this.sectionGap;
      offset += rowsPerPage;
    }
  }

  drawFooters(footerNote: string) {
    const total = this.doc.getNumberOfPages();
    for (let page = 1; page <= total; page++) {
      this.doc.setPage(page);
      this.doc.setDrawColor(...this.colors.borderSoft);
      this.doc.line(this.margin, this.footerY - 3.2, PAGE_W - this.margin, this.footerY - 3.2);

      this.doc.setFillColor(...this.colors.primary);
      this.doc.circle(this.margin + 1.1, this.footerY - 1.2, 1.1, 'F');
      this.setFont(6.8, true);
      this.doc.setTextColor(...this.colors.primary);
      this.doc.text('ECUBOX', this.margin + 3.2, this.footerY);
      this.setFont(6.6, false);
      this.doc.setTextColor(...this.colors.muted);
      const brandW = this.doc.getTextWidth('ECUBOX');
      this.doc.text(`  ·  ${footerNote}`, this.margin + 3.2 + brandW, this.footerY);
      this.doc.text(`Página ${page} / ${total}`, PAGE_W - this.margin, this.footerY, {
        align: 'right',
      });
    }
  }
}

export function formatPdfFecha(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatPdfFechaHora(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });
}

export function pdfSafe(value?: string | null): string {
  return value && value.trim() ? value.trim() : '-';
}
