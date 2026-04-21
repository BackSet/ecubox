import type { jsPDF } from 'jspdf';
import { ECUBOX_PDF_COLORS, PDF_DOC, type PdfRgb } from '@/lib/pdf/theme';

/**
 * Helpers compartidos por los PDF internos del sistema (manifiestos,
 * despachos, hojas de ruta, etc.). Mantienen una composición coherente
 * con la UI de ECUBOX y blindan al builder concreto contra superposiciones:
 * cada función calcula su altura, dibuja la sección y devuelve la nueva
 * coordenada `y` lista para encadenar el siguiente bloque.
 *
 *   const ctx = createDocCtx(doc);
 *   ctx.y = drawDocHeader(ctx, { titulo, subtitulo, codigo, badge });
 *   ctx.y = drawMetaRow(ctx, [...bloques]);
 *   ctx.y = drawKpiRow(ctx, [...kpis]);
 *   ctx.y = drawTable(ctx, { columns, rows, ... });
 *   ctx.y = drawTotalBar(ctx, { left, right });
 *   drawDocFooter(doc, { left });
 *
 * Estilo: paleta `ECUBOX_PDF_COLORS` (morado de marca), tipografía
 * Helvetica con tamaños y pesos definidos en `PDF_DOC.fonts`.
 */

// ============================================================
// Tipos auxiliares
// ============================================================

export interface DocCtx {
  doc: jsPDF;
  margin: number;
  contentWidth: number;
  pageW: number;
  contentBottom: number;
  /** Cursor vertical actual; los helpers lo devuelven actualizado. */
  y: number;
  /** Hook para repetir el encabezado en páginas nuevas (lo setea cada builder). */
  onPageBreak?: (ctx: DocCtx) => void;
}

export type Align = 'left' | 'center' | 'right';

export interface MetaField {
  label: string;
  value: string;
  bold?: boolean;
}

export interface MetaBlock {
  titulo: string;
  filas: MetaField[];
}

export interface KpiCard {
  label: string;
  value: string;
  /** Si es `true` se renderiza con fondo morado (highlight). */
  highlight?: boolean;
}

export interface ColumnDef<R> {
  key: string;
  label: string;
  /** Peso relativo dentro del ancho de tabla. Se normaliza en runtime. */
  weight: number;
  align: Align;
  /** Render del valor a string (ya formateado). */
  render: (row: R, idx: number) => string;
  /** Si es `true`, se usa fuente monospace (Courier) para tracking, etc. */
  mono?: boolean;
}

export interface DrawHeaderOpts {
  titulo: string;
  subtitulo?: string;
  codigo: string;
  /** Texto pequeño bajo el código (ej.: "ID: 12 · 4 despachos"). */
  meta?: string;
  /** Badge opcional (estado, etc.) bajo el código. */
  badge?: { text: string; bg: PdfRgb; fg: PdfRgb };
}

// ============================================================
// Helpers internos de bajo nivel
// ============================================================

function setFill(doc: jsPDF, c: PdfRgb) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function setDraw(doc: jsPDF, c: PdfRgb) {
  doc.setDrawColor(c[0], c[1], c[2]);
}
function setText(doc: jsPDF, c: PdfRgb) {
  doc.setTextColor(c[0], c[1], c[2]);
}

// ============================================================
// API pública
// ============================================================

/** Crea el contexto a partir del doc ya inicializado por el builder. */
export function createDocCtx(doc: jsPDF): DocCtx {
  return {
    doc,
    margin: PDF_DOC.margin,
    contentWidth: PDF_DOC.pageW - PDF_DOC.margin * 2,
    pageW: PDF_DOC.pageW,
    contentBottom: PDF_DOC.contentBottom,
    y: PDF_DOC.margin,
  };
}

/**
 * Dibuja el banner superior (banda morada) con marca, código a la derecha
 * y subtítulo. Devuelve la `y` justo debajo del banner (con su gap).
 */
export function drawDocHeader(ctx: DocCtx, opts: DrawHeaderOpts): number {
  const { doc, pageW, margin } = ctx;
  const headerH = PDF_DOC.headerH;

  // Banner principal
  setFill(doc, ECUBOX_PDF_COLORS.primary);
  doc.rect(0, 0, pageW, headerH, 'F');

  // Acento inferior (línea más oscura) — refuerza la separación con el contenido.
  setFill(doc, ECUBOX_PDF_COLORS.primaryDark);
  doc.rect(0, headerH, pageW, 0.8, 'F');

  // Marca + título
  setText(doc, ECUBOX_PDF_COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_DOC.fonts.title);
  doc.text('ECUBOX', margin, 9.6);

  if (opts.subtitulo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_DOC.fonts.subtitle);
    doc.text(opts.subtitulo, margin, 15.6);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_DOC.fonts.subtitle + 0.5);
  doc.text(opts.titulo.toUpperCase(), margin, 19.4);

  // Código y meta a la derecha
  const rightX = pageW - margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_DOC.fonts.title - 1);
  doc.text(opts.codigo, rightX, 9.6, { align: 'right' });

  if (opts.meta) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_DOC.fonts.subtitle);
    doc.text(opts.meta, rightX, 15.6, { align: 'right' });
  }

  if (opts.badge) {
    const padX = 2.2;
    const h = 4.6;
    const textW = doc.getTextWidth(opts.badge.text);
    const w = Math.max(18, textW + padX * 2);
    const x = rightX - w;
    const y = 17.6;
    setFill(doc, opts.badge.bg);
    doc.roundedRect(x, y, w, h, 1, 1, 'F');
    setText(doc, opts.badge.fg);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(PDF_DOC.fonts.badge - 1.4);
    doc.text(opts.badge.text.toUpperCase(), x + w / 2, y + 3.1, {
      align: 'center',
    });
  }

  setText(doc, ECUBOX_PDF_COLORS.text);
  ctx.y = headerH + PDF_DOC.gap;
  return ctx.y;
}

/**
 * Dibuja el footer en TODAS las páginas. Llamar después de generar todo el
 * contenido para que conozca el número total de páginas.
 */
export function drawDocFooter(doc: jsPDF, opts: { left: string }) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    setText(doc, ECUBOX_PDF_COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_DOC.fonts.footer);
    doc.text(opts.left, PDF_DOC.margin, PDF_DOC.footerY);
    doc.text(`Página ${i} / ${total}`, PDF_DOC.pageW - PDF_DOC.margin, PDF_DOC.footerY, {
      align: 'right',
    });
    // Línea fina sobre el footer.
    setDraw(doc, ECUBOX_PDF_COLORS.borderSoft);
    doc.setLineWidth(0.2);
    doc.line(
      PDF_DOC.margin,
      PDF_DOC.footerY - 3,
      PDF_DOC.pageW - PDF_DOC.margin,
      PDF_DOC.footerY - 3,
    );
  }
}

/**
 * Renderiza una fila de bloques de metadatos (cards con título y pares
 * label/value). Calcula la altura mínima para alojar todos los datos sin
 * solapes y devuelve la `y` siguiente.
 */
export function drawMetaRow(ctx: DocCtx, blocks: MetaBlock[]): number {
  const { doc, margin, contentWidth, y } = ctx;
  const gapX = PDF_DOC.gap - 1.5;
  const blockW = (contentWidth - gapX * (blocks.length - 1)) / blocks.length;

  // 1) Calcular altura: cabecera (5) + filas (cada una ~7.6).
  const headerH = 5;
  const rowH = 7.6;
  const padY = PDF_DOC.cardPadY;
  const maxRows = Math.max(...blocks.map((b) => b.filas.length));
  const blockH = padY * 2 + headerH + maxRows * rowH;

  blocks.forEach((b, i) => {
    const x = margin + i * (blockW + gapX);

    // Card
    setDraw(doc, ECUBOX_PDF_COLORS.border);
    setFill(doc, ECUBOX_PDF_COLORS.card);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, blockW, blockH, PDF_DOC.cardRadius, PDF_DOC.cardRadius, 'FD');

    // Título de la card
    setText(doc, ECUBOX_PDF_COLORS.primaryDark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(PDF_DOC.fonts.metaLabel);
    doc.text(b.titulo.toUpperCase(), x + PDF_DOC.cardPadX, y + padY + 2.4);

    // Línea separadora bajo el título
    setDraw(doc, ECUBOX_PDF_COLORS.borderSoft);
    doc.setLineWidth(0.25);
    doc.line(
      x + PDF_DOC.cardPadX,
      y + padY + headerH - 0.2,
      x + blockW - PDF_DOC.cardPadX,
      y + padY + headerH - 0.2,
    );

    // Filas
    let cy = y + padY + headerH + 2.6;
    for (const f of b.filas) {
      setText(doc, ECUBOX_PDF_COLORS.muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(PDF_DOC.fonts.metaLabel);
      doc.text(f.label.toUpperCase(), x + PDF_DOC.cardPadX, cy);

      setText(doc, ECUBOX_PDF_COLORS.text);
      doc.setFont('helvetica', f.bold ? 'bold' : 'normal');
      doc.setFontSize(PDF_DOC.fonts.metaValue - 0.5);
      const lines = doc.splitTextToSize(f.value || '-', blockW - PDF_DOC.cardPadX * 2);
      doc.text(lines.slice(0, 1), x + PDF_DOC.cardPadX, cy + 3.4);
      cy += rowH;
    }
  });

  ctx.y = y + blockH + PDF_DOC.gap;
  return ctx.y;
}

/**
 * Renderiza una fila de KPIs (cards más bajos con label en mayúsculas y
 * valor grande). El último puede destacarse con fondo morado.
 */
export function drawKpiRow(ctx: DocCtx, kpis: KpiCard[]): number {
  const { doc, margin, contentWidth, y } = ctx;
  const gapX = PDF_DOC.gap - 1.5;
  const w = (contentWidth - gapX * (kpis.length - 1)) / kpis.length;
  const h = 16;

  kpis.forEach((k, i) => {
    const x = margin + i * (w + gapX);
    if (k.highlight) {
      setFill(doc, ECUBOX_PDF_COLORS.primary);
      setDraw(doc, ECUBOX_PDF_COLORS.primaryDark);
      doc.setLineWidth(0.25);
      doc.roundedRect(x, y, w, h, PDF_DOC.cardRadius, PDF_DOC.cardRadius, 'FD');
      setText(doc, ECUBOX_PDF_COLORS.white);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(PDF_DOC.fonts.kpiLabel);
      doc.text(k.label.toUpperCase(), x + PDF_DOC.cardPadX, y + 4.6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(PDF_DOC.fonts.kpiValue);
      doc.text(k.value, x + PDF_DOC.cardPadX, y + 12);
    } else {
      setFill(doc, ECUBOX_PDF_COLORS.cardSoft);
      setDraw(doc, ECUBOX_PDF_COLORS.borderSoft);
      doc.setLineWidth(0.25);
      doc.roundedRect(x, y, w, h, PDF_DOC.cardRadius, PDF_DOC.cardRadius, 'FD');
      setText(doc, ECUBOX_PDF_COLORS.muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(PDF_DOC.fonts.kpiLabel);
      doc.text(k.label.toUpperCase(), x + PDF_DOC.cardPadX, y + 4.6);
      setText(doc, ECUBOX_PDF_COLORS.primaryDark);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(PDF_DOC.fonts.kpiValue);
      doc.text(k.value, x + PDF_DOC.cardPadX, y + 12);
    }
  });

  ctx.y = y + h + PDF_DOC.gap;
  return ctx.y;
}

/**
 * Pinta una banda con el título de una sección (sirve para "Detalle de
 * paquetes", "Resumen financiero", etc.).
 */
export function drawSectionTitle(ctx: DocCtx, text: string): number {
  const { doc, margin, contentWidth, y } = ctx;
  setText(doc, ECUBOX_PDF_COLORS.primaryDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_DOC.fonts.sectionTitle);
  doc.text(text, margin, y + 3.2);

  setDraw(doc, ECUBOX_PDF_COLORS.primarySoftStroke);
  doc.setLineWidth(0.4);
  doc.line(margin, y + 4.6, margin + contentWidth, y + 4.6);
  ctx.y = y + 7.6;
  return ctx.y;
}

/**
 * Dibuja una franja con etiquetas + valores (para subtotales financieros u
 * otras métricas en línea).
 */
export interface InlineMetric {
  label: string;
  value: string;
}

export function drawInlineMetrics(
  ctx: DocCtx,
  titulo: string,
  metrics: InlineMetric[],
): number {
  const { doc, margin, contentWidth, y } = ctx;
  const h = 9.5;
  setFill(doc, ECUBOX_PDF_COLORS.primarySoftFill);
  setDraw(doc, ECUBOX_PDF_COLORS.primarySoftStroke);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, y, contentWidth, h, PDF_DOC.cardRadius, PDF_DOC.cardRadius, 'FD');

  setText(doc, ECUBOX_PDF_COLORS.primaryDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_DOC.fonts.metaLabel);
  doc.text(titulo.toUpperCase(), margin + PDF_DOC.cardPadX, y + 3.6);

  // Distribuir metrics en columnas equitativas a la derecha del título.
  const titleZone = 38;
  const zoneW = (contentWidth - titleZone) / metrics.length;
  metrics.forEach((m, i) => {
    const x = margin + titleZone + i * zoneW;
    setText(doc, ECUBOX_PDF_COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(PDF_DOC.fonts.metaLabel);
    doc.text(m.label.toUpperCase(), x, y + 3.6);
    setText(doc, ECUBOX_PDF_COLORS.text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(PDF_DOC.fonts.metaValue);
    doc.text(m.value, x, y + 7.4);
  });

  ctx.y = y + h + PDF_DOC.gap;
  return ctx.y;
}

// ============================================================
// Tabla genérica
// ============================================================

export interface DrawTableOpts<R> {
  columns: ColumnDef<R>[];
  rows: R[];
  /** Mensaje cuando no hay filas. */
  empty?: string;
  /** Si se pasa, se dibuja una banda de subgrupo antes de unas filas. */
  groupHeader?: (group: { idx: number; row: R }) => string | null;
}

interface ResolvedColumns<R> {
  cols: ColumnDef<R>[];
  widths: number[];
}

function resolveColumns<R>(cols: ColumnDef<R>[], contentWidth: number): ResolvedColumns<R> {
  const totalWeight = cols.reduce((s, c) => s + c.weight, 0);
  const widths = cols.map((c) => (c.weight / totalWeight) * contentWidth);
  return { cols, widths };
}

function drawTableHeader<R>(ctx: DocCtx, resolved: ResolvedColumns<R>) {
  const { doc, margin, contentWidth } = ctx;
  const h = 7;
  setFill(doc, ECUBOX_PDF_COLORS.primary);
  doc.rect(margin, ctx.y, contentWidth, h, 'F');

  setText(doc, ECUBOX_PDF_COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_DOC.fonts.tableHeader);

  let x = margin;
  resolved.cols.forEach((c, i) => {
    const w = resolved.widths[i];
    const tx =
      c.align === 'right'
        ? x + w - PDF_DOC.cellPadX
        : c.align === 'center'
          ? x + w / 2
          : x + PDF_DOC.cellPadX;
    doc.text(c.label, tx, ctx.y + 4.6, { align: c.align });
    x += w;
  });
  ctx.y += h;
}

function measureRow<R>(
  doc: jsPDF,
  row: R,
  idx: number,
  resolved: ResolvedColumns<R>,
): number {
  let maxLines = 1;
  resolved.cols.forEach((c, i) => {
    const w = resolved.widths[i] - PDF_DOC.cellPadX * 2;
    const txt = c.render(row, idx) || '';
    if (!txt) return;
    doc.setFont(c.mono ? 'courier' : 'helvetica', 'normal');
    doc.setFontSize(PDF_DOC.fonts.tableCell);
    const lines = doc.splitTextToSize(txt, w) as string[];
    maxLines = Math.max(maxLines, lines.length);
  });
  return Math.max(PDF_DOC.rowMinH, maxLines * PDF_DOC.rowLineH + 2.4);
}

function drawRow<R>(
  ctx: DocCtx,
  row: R,
  idx: number,
  resolved: ResolvedColumns<R>,
  zebra: boolean,
) {
  const { doc, margin, contentWidth } = ctx;
  const h = measureRow(doc, row, idx, resolved);

  if (zebra) {
    setFill(doc, ECUBOX_PDF_COLORS.row);
    doc.rect(margin, ctx.y, contentWidth, h, 'F');
  }
  setDraw(doc, ECUBOX_PDF_COLORS.borderSoft);
  doc.setLineWidth(0.2);
  doc.line(margin, ctx.y + h, margin + contentWidth, ctx.y + h);

  let x = margin;
  resolved.cols.forEach((c, i) => {
    const w = resolved.widths[i];
    const innerW = w - PDF_DOC.cellPadX * 2;
    const tx =
      c.align === 'right'
        ? x + w - PDF_DOC.cellPadX
        : c.align === 'center'
          ? x + w / 2
          : x + PDF_DOC.cellPadX;

    setText(doc, ECUBOX_PDF_COLORS.text);
    const isMono = !!c.mono;
    doc.setFont(isMono ? 'courier' : 'helvetica', isMono ? 'bold' : 'normal');
    doc.setFontSize(isMono ? PDF_DOC.fonts.tableCell - 0.3 : PDF_DOC.fonts.tableCell);
    const lines = doc.splitTextToSize(c.render(row, idx) || '', innerW) as string[];
    doc.text(lines, tx, ctx.y + 4.2, { align: c.align });
    x += w;
  });
  ctx.y += h;
}

function ensureSpace<R>(ctx: DocCtx, need: number, resolved: ResolvedColumns<R>) {
  if (ctx.y + need <= ctx.contentBottom) return;
  ctx.doc.addPage('a4', 'landscape');
  ctx.y = PDF_DOC.margin;
  ctx.onPageBreak?.(ctx);
  drawTableHeader(ctx, resolved);
}

/**
 * Renderiza una tabla con encabezado morado, filas zebra muy sutiles y
 * salto de página automático que repite la cabecera. Devuelve la `y`
 * siguiente al último elemento dibujado.
 */
export function drawTable<R>(ctx: DocCtx, opts: DrawTableOpts<R>): number {
  const resolved = resolveColumns(opts.columns, ctx.contentWidth);
  drawTableHeader(ctx, resolved);

  if (opts.rows.length === 0) {
    setText(ctx.doc, ECUBOX_PDF_COLORS.muted);
    ctx.doc.setFont('helvetica', 'italic');
    ctx.doc.setFontSize(PDF_DOC.fonts.tableCell);
    ctx.doc.text(
      opts.empty ?? 'Sin información para mostrar.',
      ctx.margin + PDF_DOC.cellPadX,
      ctx.y + 5.4,
    );
    ctx.y += 8;
    return ctx.y;
  }

  let lastGroup: string | null = null;
  opts.rows.forEach((r, i) => {
    if (opts.groupHeader) {
      const g = opts.groupHeader({ idx: i, row: r });
      if (g && g !== lastGroup) {
        ensureSpace(ctx, 9, resolved);
        drawGroupHeader(ctx, g);
        lastGroup = g;
      }
    }
    const need = measureRow(ctx.doc, r, i, resolved) + 1;
    ensureSpace(ctx, need, resolved);
    drawRow(ctx, r, i, resolved, i % 2 === 1);
  });

  return ctx.y;
}

function drawGroupHeader(ctx: DocCtx, text: string) {
  const { doc, margin, contentWidth } = ctx;
  const h = 7;
  setFill(doc, ECUBOX_PDF_COLORS.cardHeader);
  setDraw(doc, ECUBOX_PDF_COLORS.borderSoft);
  doc.setLineWidth(0.25);
  doc.rect(margin, ctx.y, contentWidth, h, 'FD');
  setText(doc, ECUBOX_PDF_COLORS.primaryDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_DOC.fonts.metaValue);
  doc.text(text, margin + PDF_DOC.cardPadX, ctx.y + 4.6);
  ctx.y += h;
}

/**
 * Banda final de totales (texto izquierdo + texto derecho), morado fuerte.
 */
export function drawTotalBar(
  ctx: DocCtx,
  opts: { left: string; right: string },
): number {
  const { doc, margin, contentWidth } = ctx;
  const h = 9.6;
  if (ctx.y + h > ctx.contentBottom) {
    doc.addPage('a4', 'landscape');
    ctx.y = PDF_DOC.margin;
    ctx.onPageBreak?.(ctx);
  }

  setFill(doc, ECUBOX_PDF_COLORS.primary);
  doc.roundedRect(margin, ctx.y, contentWidth, h, PDF_DOC.cardRadius, PDF_DOC.cardRadius, 'F');
  setText(doc, ECUBOX_PDF_COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_DOC.fonts.total);
  doc.text(opts.left, margin + PDF_DOC.cardPadX + 1, ctx.y + 6.2);
  doc.text(opts.right, ctx.pageW - margin - PDF_DOC.cardPadX - 1, ctx.y + 6.2, {
    align: 'right',
  });

  ctx.y += h + PDF_DOC.gap;
  return ctx.y;
}

/**
 * Renderiza dos cajas de firma (operario / responsable). Se asegura de no
 * desbordar la página.
 */
export function drawFirmas(
  ctx: DocCtx,
  firmas: Array<{ titulo: string; subtitulo?: string }>,
): number {
  const { doc, margin, contentWidth } = ctx;
  const h = 24;
  if (ctx.y + h > ctx.contentBottom) {
    doc.addPage('a4', 'landscape');
    ctx.y = PDF_DOC.margin;
    ctx.onPageBreak?.(ctx);
  }
  const gapX = PDF_DOC.gap;
  const w = (contentWidth - gapX * (firmas.length - 1)) / firmas.length;

  firmas.forEach((f, i) => {
    const x = margin + i * (w + gapX);
    // Línea de firma
    setDraw(doc, ECUBOX_PDF_COLORS.muted);
    doc.setLineWidth(0.4);
    doc.line(x + 4, ctx.y + 14, x + w - 4, ctx.y + 14);

    setText(doc, ECUBOX_PDF_COLORS.muted);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(PDF_DOC.fonts.metaLabel);
    doc.text(f.titulo.toUpperCase(), x + w / 2, ctx.y + 18, { align: 'center' });
    if (f.subtitulo) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(PDF_DOC.fonts.metaLabel);
      doc.text(f.subtitulo, x + w / 2, ctx.y + 21.4, { align: 'center' });
    }
  });
  ctx.y += h + PDF_DOC.gap;
  return ctx.y;
}

// ============================================================
// Pequeñas utilidades reutilizables
// ============================================================

export function safeStr(value?: string | null, fallback = '-'): string {
  return value && String(value).trim() ? String(value).trim() : fallback;
}

export function fmtFechaCorta(s?: string | null): string {
  if (!s) return '-';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function fmtFechaHora(s?: string | null): string {
  if (!s) return '-';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
}

export function fmtMoneda(n?: number | null): string {
  if (n == null || Number.isNaN(Number(n))) return '$0.00';
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n));
}

export function fmtNumero(n?: number | null, decimals = 2): string {
  if (n == null || Number.isNaN(Number(n))) return '-';
  return Number(n).toFixed(decimals);
}
