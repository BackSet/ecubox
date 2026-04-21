package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.LiquidacionConsolidadoLineaDTO;
import com.ecubox.ecubox_backend.dto.LiquidacionDTO;
import com.ecubox.ecubox_backend.dto.LiquidacionDespachoLineaDTO;
import com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Genera el PDF y XLSX de una {@link LiquidacionDTO} con dos secciones:
 * sección A (consolidados, costo al proveedor) y sección B (despachos, costo
 * del courier de entrega).
 *
 * <p>La paleta y el estilo siguen la línea de {@code ManifiestoEnvioConsolidadoService}
 * para mantener coherencia visual con el resto de los exportables del sistema.
 */
@Service
public class LiquidacionExportService {

    private static final DateTimeFormatter FMT_FECHA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter FMT_FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    // Paleta corporativa.
    private static final Color COLOR_PRIMARY = new Color(123, 63, 228);
    private static final Color COLOR_PRIMARY_DARK = new Color(86, 32, 188);
    private static final Color COLOR_BORDER = new Color(226, 230, 237);
    private static final Color COLOR_HEADER_BG = new Color(244, 240, 254);
    private static final Color COLOR_ZEBRA = new Color(249, 247, 254);
    private static final Color COLOR_TEXT = new Color(10, 22, 40);
    private static final Color COLOR_MUTED = new Color(107, 114, 128);
    private static final Color COLOR_OK = new Color(16, 122, 87);
    private static final Color COLOR_WARN = new Color(176, 99, 12);

    private static final int ALIGN_LEFT = 0;
    private static final int ALIGN_CENTER = 1;
    private static final int ALIGN_RIGHT = 2;

    private final LiquidacionService liquidacionService;

    public LiquidacionExportService(LiquidacionService liquidacionService) {
        this.liquidacionService = liquidacionService;
    }

    public record ExportResult(byte[] content, String fileName) {}

    public ExportResult exportarPdf(Long id) {
        LiquidacionDTO dto = liquidacionService.obtener(id);
        byte[] bytes = generarPdf(dto);
        return new ExportResult(bytes, "liquidacion-" + safe(dto.getCodigo()) + ".pdf");
    }

    public ExportResult exportarXlsx(Long id) {
        LiquidacionDTO dto = liquidacionService.obtener(id);
        byte[] bytes = generarXlsx(dto);
        return new ExportResult(bytes, "liquidacion-" + safe(dto.getCodigo()) + ".xlsx");
    }

    // ===================================================================
    // PDF
    // ===================================================================

    private byte[] generarPdf(LiquidacionDTO liq) {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDFont fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDFont fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            PDRectangle pageSize = new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth());
            float pageWidth = pageSize.getWidth();
            float pageHeight = pageSize.getHeight();
            float margin = 28f;
            float contentWidth = pageWidth - margin * 2;
            float footerY = margin + 14f;

            PdfState state = new PdfState();
            state.doc = doc;
            state.pageSize = pageSize;
            state.margin = margin;
            state.footerY = footerY;
            state.pageHeight = pageHeight;
            state.fontRegular = fontRegular;

            startNewPage(state);

            float y = pageHeight - margin;
            y = drawHeaderBanner(state.cs, fontBold, fontRegular, liq, margin, y, contentWidth, 64f);
            y -= 14;
            y = drawMetadataBox(state.cs, fontBold, fontRegular, liq, margin, y, contentWidth);
            y -= 14;
            y = drawTotalsBox(state.cs, fontBold, fontRegular, liq, margin, y, contentWidth);
            y -= 16;
            state.y = y;

            // -------- Seccion A: consolidados --------
            String[] headersA = {"#", "Codigo consolidado", "Paquetes", "Peso (lbs)",
                    "Costo proveedor (USD)", "Ingreso cliente (USD)", "Margen (USD)"};
            float[] widthsA = computeWidths(contentWidth,
                    new float[]{0.05f, 0.20f, 0.10f, 0.13f, 0.18f, 0.18f, 0.16f});
            int[] alignsA = {ALIGN_CENTER, ALIGN_LEFT, ALIGN_RIGHT, ALIGN_RIGHT, ALIGN_RIGHT, ALIGN_RIGHT, ALIGN_RIGHT};

            ensureSpace(state, 60f);
            state.y = drawSectionTitle(state.cs, fontBold, "Seccion A. Costos al proveedor (USA -> EC)",
                    margin, state.y, contentWidth);
            state.y -= 8;
            state.y = drawTableHeader(state.cs, fontBold, headersA, widthsA, alignsA,
                    margin, state.y, 22f, contentWidth);

            int idx = 1;
            BigDecimal totalCostoProv = BigDecimal.ZERO;
            BigDecimal totalIngreso = BigDecimal.ZERO;
            for (LiquidacionConsolidadoLineaDTO l : safeList(liq.getConsolidados())) {
                ensureSpace(state, 22f);
                String[] row = {
                        String.valueOf(idx++),
                        nz(l.getEnvioConsolidadoCodigo()),
                        l.getEnvioConsolidadoTotalPaquetes() != null
                                ? l.getEnvioConsolidadoTotalPaquetes().toString() : "-",
                        formatNum(l.getEnvioConsolidadoPesoTotalLbs(), 2),
                        formatMoney(l.getCostoProveedor()),
                        formatMoney(l.getIngresoCliente()),
                        formatMoney(l.getMargenLinea())
                };
                drawTableRow(state.cs, fontRegular, row, widthsA, alignsA, margin, state.y, 18f,
                        idx % 2 == 0);
                state.y -= 18f;
                totalCostoProv = sum(totalCostoProv, l.getCostoProveedor());
                totalIngreso = sum(totalIngreso, l.getIngresoCliente());
            }
            ensureSpace(state, 22f);
            drawTotalRow(state.cs, fontBold, new String[]{
                            "", "Total seccion A", "", "",
                            formatMoney(totalCostoProv),
                            formatMoney(totalIngreso),
                            formatMoney(liq.getMargenBruto())},
                    widthsA, alignsA, margin, state.y, 22f);
            state.y -= 22f + 14f;

            // -------- Seccion B: despachos --------
            String[] headersB = {"#", "Guia despacho", "Courier entrega", "Fecha",
                    "Peso (kg)", "Kg incluidos", "Precio fijo (USD)",
                    "Precio kg adic. (USD)", "Costo (USD)"};
            float[] widthsB = computeWidths(contentWidth,
                    new float[]{0.04f, 0.16f, 0.16f, 0.10f, 0.08f, 0.09f, 0.10f, 0.13f, 0.14f});
            int[] alignsB = {ALIGN_CENTER, ALIGN_LEFT, ALIGN_LEFT, ALIGN_CENTER,
                    ALIGN_RIGHT, ALIGN_RIGHT, ALIGN_RIGHT, ALIGN_RIGHT, ALIGN_RIGHT};

            ensureSpace(state, 60f);
            state.y = drawSectionTitle(state.cs, fontBold,
                    "Seccion B. Costos del courier de entrega (en EC)",
                    margin, state.y, contentWidth);
            state.y -= 8;
            state.y = drawTableHeader(state.cs, fontBold, headersB, widthsB, alignsB,
                    margin, state.y, 22f, contentWidth);

            int idxB = 1;
            for (LiquidacionDespachoLineaDTO l : safeList(liq.getDespachos())) {
                ensureSpace(state, 22f);
                String[] row = {
                        String.valueOf(idxB++),
                        nz(l.getDespachoNumeroGuia()),
                        nz(l.getDespachoCourierEntregaNombre()),
                        l.getDespachoFechaHora() != null
                                ? l.getDespachoFechaHora().format(FMT_FECHA) : "-",
                        formatNum(l.getPesoKg(), 2),
                        formatNum(l.getKgIncluidos(), 2),
                        formatMoney(l.getPrecioFijo()),
                        formatMoney(l.getPrecioKgAdicional()),
                        formatMoney(l.getCostoCalculado())
                };
                drawTableRow(state.cs, fontRegular, row, widthsB, alignsB, margin, state.y, 18f,
                        idxB % 2 == 0);
                state.y -= 18f;
            }
            ensureSpace(state, 22f);
            drawTotalRow(state.cs, fontBold, new String[]{
                            "", "Total seccion B", "", "", "", "", "", "",
                            formatMoney(liq.getTotalCostoDistribucion())},
                    widthsB, alignsB, margin, state.y, 22f);
            state.y -= 22f + 14f;

            // -------- Resumen final --------
            ensureSpace(state, 90f);
            drawResumenFinal(state.cs, fontBold, fontRegular, liq, margin, state.y, contentWidth);

            drawFooter(state.cs, fontRegular, footerY, margin);
            state.cs.close();
            doc.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Error generando PDF de liquidacion", e);
        }
    }

    private static class PdfState {
        PDDocument doc;
        PDRectangle pageSize;
        float margin;
        float footerY;
        float pageHeight;
        PDFont fontRegular;
        PDPageContentStream cs;
        float y;
    }

    private void startNewPage(PdfState s) throws IOException {
        if (s.cs != null) {
            drawFooter(s.cs, s.fontRegular, s.footerY, s.margin);
            s.cs.close();
        }
        PDPage page = new PDPage(s.pageSize);
        s.doc.addPage(page);
        s.cs = new PDPageContentStream(s.doc, page);
        s.y = s.pageHeight - s.margin;
    }

    private void ensureSpace(PdfState s, float needed) throws IOException {
        if (s.y - needed < s.footerY + 24) {
            startNewPage(s);
        }
    }

    private float drawHeaderBanner(PDPageContentStream cs, PDFont fontBold, PDFont fontRegular,
                                   LiquidacionDTO liq, float x, float y,
                                   float width, float height) throws IOException {
        cs.setNonStrokingColor(COLOR_PRIMARY);
        cs.addRect(x, y - height, width, height);
        cs.fill();

        cs.setNonStrokingColor(Color.WHITE);
        cs.beginText();
        cs.setFont(fontBold, 18);
        cs.newLineAtOffset(x + 16, y - 26);
        cs.showText("ECUBOX  |  LIQUIDACION");
        cs.endText();

        cs.beginText();
        cs.setFont(fontRegular, 10);
        cs.newLineAtOffset(x + 16, y - 44);
        cs.showText("Documento periodico de cierre. Seccion A: costo al proveedor. Seccion B: courier de entrega.");
        cs.endText();

        // Codigo + estado en la derecha
        String codigo = nz(liq.getCodigo());
        String estado = liq.getEstadoPago() == EstadoPagoConsolidado.PAGADO ? "PAGADA" : "NO PAGADA";
        float rightX = x + width - 16;
        cs.beginText();
        cs.setFont(fontBold, 16);
        float codW = fontBold.getStringWidth(codigo) / 1000 * 16;
        cs.newLineAtOffset(rightX - codW, y - 26);
        cs.showText(codigo);
        cs.endText();

        cs.beginText();
        cs.setFont(fontBold, 10);
        float estW = fontBold.getStringWidth(estado) / 1000 * 10;
        cs.newLineAtOffset(rightX - estW, y - 44);
        cs.showText(estado);
        cs.endText();
        return y - height;
    }

    private float drawMetadataBox(PDPageContentStream cs, PDFont fontBold, PDFont fontRegular,
                                  LiquidacionDTO liq, float x, float y,
                                  float width) throws IOException {
        float boxH = 56f;
        cs.setNonStrokingColor(COLOR_HEADER_BG);
        cs.addRect(x, y - boxH, width, boxH);
        cs.fill();
        cs.setStrokingColor(COLOR_BORDER);
        cs.setLineWidth(0.6f);
        cs.addRect(x, y - boxH, width, boxH);
        cs.stroke();

        float colW = width / 4f;
        drawMetaCell(cs, fontBold, fontRegular, "Fecha del documento",
                liq.getFechaDocumento() != null ? liq.getFechaDocumento().format(FMT_FECHA) : "-",
                x, y);
        drawMetaCell(cs, fontBold, fontRegular, "Periodo",
                formatPeriodo(liq.getPeriodoDesde(), liq.getPeriodoHasta()),
                x + colW, y);
        drawMetaCell(cs, fontBold, fontRegular, "Fecha de pago",
                liq.getFechaPago() != null ? liq.getFechaPago().format(FMT_FECHA_HORA) : "-",
                x + colW * 2, y);
        drawMetaCell(cs, fontBold, fontRegular, "Pagado por",
                nz(liq.getPagadoPorUsername()),
                x + colW * 3, y);
        return y - boxH;
    }

    private void drawMetaCell(PDPageContentStream cs, PDFont fontBold, PDFont fontRegular,
                              String label, String value,
                              float x, float yTop) throws IOException {
        cs.setNonStrokingColor(COLOR_MUTED);
        cs.beginText();
        cs.setFont(fontRegular, 8);
        cs.newLineAtOffset(x + 10, yTop - 14);
        cs.showText(label.toUpperCase());
        cs.endText();

        cs.setNonStrokingColor(COLOR_TEXT);
        cs.beginText();
        cs.setFont(fontBold, 11);
        cs.newLineAtOffset(x + 10, yTop - 32);
        cs.showText(truncate(value, 28));
        cs.endText();
    }

    private float drawTotalsBox(PDPageContentStream cs, PDFont fontBold, PDFont fontRegular,
                                LiquidacionDTO liq, float x, float y,
                                float width) throws IOException {
        float boxH = 60f;
        float colW = width / 3f;

        cs.setNonStrokingColor(Color.WHITE);
        cs.addRect(x, y - boxH, width, boxH);
        cs.fill();
        cs.setStrokingColor(COLOR_PRIMARY);
        cs.setLineWidth(1f);
        cs.addRect(x, y - boxH, width, boxH);
        cs.stroke();

        drawTotalCell(cs, fontBold, fontRegular, "MARGEN BRUTO",
                "$ " + formatMoney(liq.getMargenBruto()),
                x, y, COLOR_PRIMARY_DARK);
        drawTotalCell(cs, fontBold, fontRegular, "TOTAL DISTRIBUCION",
                "$ " + formatMoney(liq.getTotalCostoDistribucion()),
                x + colW, y, COLOR_WARN);
        drawTotalCell(cs, fontBold, fontRegular, "INGRESO NETO",
                "$ " + formatMoney(liq.getIngresoNeto()),
                x + colW * 2, y,
                liq.getIngresoNeto() != null && liq.getIngresoNeto().signum() < 0
                        ? COLOR_WARN : COLOR_OK);
        return y - boxH;
    }

    private void drawTotalCell(PDPageContentStream cs, PDFont fontBold, PDFont fontRegular,
                               String label, String value,
                               float x, float yTop, Color valueColor) throws IOException {
        cs.setNonStrokingColor(COLOR_MUTED);
        cs.beginText();
        cs.setFont(fontRegular, 9);
        cs.newLineAtOffset(x + 12, yTop - 18);
        cs.showText(label);
        cs.endText();

        cs.setNonStrokingColor(valueColor);
        cs.beginText();
        cs.setFont(fontBold, 16);
        cs.newLineAtOffset(x + 12, yTop - 40);
        cs.showText(value);
        cs.endText();
    }

    private float drawSectionTitle(PDPageContentStream cs, PDFont fontBold,
                                   String title, float x, float y,
                                   float width) throws IOException {
        cs.setNonStrokingColor(COLOR_PRIMARY_DARK);
        cs.beginText();
        cs.setFont(fontBold, 12);
        cs.newLineAtOffset(x, y - 12);
        cs.showText(title);
        cs.endText();
        cs.setStrokingColor(COLOR_PRIMARY);
        cs.setLineWidth(0.8f);
        cs.moveTo(x, y - 16);
        cs.lineTo(x + width, y - 16);
        cs.stroke();
        return y - 18;
    }

    private float drawTableHeader(PDPageContentStream cs, PDFont fontBold,
                                  String[] headers, float[] widths, int[] aligns,
                                  float x, float y, float h, float width) throws IOException {
        cs.setNonStrokingColor(COLOR_PRIMARY);
        cs.addRect(x, y - h, width, h);
        cs.fill();

        cs.setNonStrokingColor(Color.WHITE);
        float cellX = x;
        for (int i = 0; i < headers.length; i++) {
            drawTextInCell(cs, fontBold, 9, headers[i], cellX, y, widths[i], h, aligns[i], 6f);
            cellX += widths[i];
        }
        return y - h;
    }

    private void drawTableRow(PDPageContentStream cs, PDFont fontRegular,
                              String[] row, float[] widths, int[] aligns,
                              float x, float y, float h, boolean zebra) throws IOException {
        if (zebra) {
            cs.setNonStrokingColor(COLOR_ZEBRA);
            float total = 0;
            for (float w : widths) total += w;
            cs.addRect(x, y - h, total, h);
            cs.fill();
        }
        cs.setStrokingColor(COLOR_BORDER);
        cs.setLineWidth(0.4f);
        float total = 0;
        for (float w : widths) total += w;
        cs.moveTo(x, y - h);
        cs.lineTo(x + total, y - h);
        cs.stroke();

        cs.setNonStrokingColor(COLOR_TEXT);
        float cellX = x;
        for (int i = 0; i < row.length; i++) {
            drawTextInCell(cs, fontRegular, 9, row[i], cellX, y, widths[i], h, aligns[i], 6f);
            cellX += widths[i];
        }
    }

    private void drawTotalRow(PDPageContentStream cs, PDFont fontBold,
                              String[] row, float[] widths, int[] aligns,
                              float x, float y, float h) throws IOException {
        float total = 0;
        for (float w : widths) total += w;
        cs.setNonStrokingColor(COLOR_HEADER_BG);
        cs.addRect(x, y - h, total, h);
        cs.fill();
        cs.setStrokingColor(COLOR_PRIMARY);
        cs.setLineWidth(0.6f);
        cs.addRect(x, y - h, total, h);
        cs.stroke();

        cs.setNonStrokingColor(COLOR_PRIMARY_DARK);
        float cellX = x;
        for (int i = 0; i < row.length; i++) {
            drawTextInCell(cs, fontBold, 10, row[i], cellX, y, widths[i], h, aligns[i], 6f);
            cellX += widths[i];
        }
    }

    private void drawTextInCell(PDPageContentStream cs, PDFont font, int size,
                                String text, float x, float yTop, float w, float h,
                                int align, float padding) throws IOException {
        if (text == null) text = "";
        text = sanitize(text);
        float textWidth = font.getStringWidth(text) / 1000 * size;
        float drawX = switch (align) {
            case ALIGN_CENTER -> x + (w - textWidth) / 2f;
            case ALIGN_RIGHT -> x + w - padding - textWidth;
            default -> x + padding;
        };
        float drawY = yTop - (h / 2f) - (size * 0.32f);
        cs.beginText();
        cs.setFont(font, size);
        cs.newLineAtOffset(drawX, drawY);
        cs.showText(text);
        cs.endText();
    }

    private void drawResumenFinal(PDPageContentStream cs, PDFont fontBold, PDFont fontRegular,
                                  LiquidacionDTO liq, float x, float y, float width) throws IOException {
        float boxH = 80f;
        cs.setNonStrokingColor(COLOR_HEADER_BG);
        cs.addRect(x, y - boxH, width, boxH);
        cs.fill();
        cs.setStrokingColor(COLOR_PRIMARY);
        cs.setLineWidth(0.8f);
        cs.addRect(x, y - boxH, width, boxH);
        cs.stroke();

        cs.setNonStrokingColor(COLOR_PRIMARY_DARK);
        cs.beginText();
        cs.setFont(fontBold, 11);
        cs.newLineAtOffset(x + 14, y - 18);
        cs.showText("Resumen del documento");
        cs.endText();

        cs.setNonStrokingColor(COLOR_TEXT);
        cs.beginText();
        cs.setFont(fontRegular, 10);
        cs.newLineAtOffset(x + 14, y - 36);
        cs.showText("Margen bruto (A)  =  $ " + formatMoney(liq.getMargenBruto()));
        cs.endText();

        cs.beginText();
        cs.setFont(fontRegular, 10);
        cs.newLineAtOffset(x + 14, y - 50);
        cs.showText("Total distribucion (B)  =  $ " + formatMoney(liq.getTotalCostoDistribucion()));
        cs.endText();

        Color netColor = liq.getIngresoNeto() != null && liq.getIngresoNeto().signum() < 0
                ? COLOR_WARN : COLOR_OK;
        cs.setNonStrokingColor(netColor);
        cs.beginText();
        cs.setFont(fontBold, 12);
        cs.newLineAtOffset(x + 14, y - 68);
        cs.showText("Ingreso neto  =  $ " + formatMoney(liq.getIngresoNeto()));
        cs.endText();

        if (liq.getNotas() != null && !liq.getNotas().isBlank()) {
            cs.setNonStrokingColor(COLOR_MUTED);
            cs.beginText();
            cs.setFont(fontRegular, 9);
            cs.newLineAtOffset(x + width / 2f, y - 36);
            cs.showText("Notas: " + truncate(liq.getNotas(), 80));
            cs.endText();
        }
    }

    private void drawFooter(PDPageContentStream cs, PDFont fontRegular,
                            float footerY, float margin) throws IOException {
        cs.setNonStrokingColor(COLOR_MUTED);
        cs.beginText();
        cs.setFont(fontRegular, 8);
        cs.newLineAtOffset(margin, footerY);
        cs.showText("ECUBOX - Documento generado automaticamente el " +
                LocalDateTime.now().format(FMT_FECHA_HORA));
        cs.endText();
    }

    private float[] computeWidths(float total, float[] proportions) {
        float[] widths = new float[proportions.length];
        for (int i = 0; i < proportions.length; i++) widths[i] = total * proportions[i];
        return widths;
    }

    // ===================================================================
    // XLSX
    // ===================================================================

    private byte[] generarXlsx(LiquidacionDTO liq) {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            EstilosXlsx s = new EstilosXlsx(wb);

            crearHojaResumen(wb, s, liq);
            crearHojaConsolidados(wb, s, liq);
            crearHojaDespachos(wb, s, liq);

            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Error generando XLSX de liquidacion", e);
        }
    }

    private void crearHojaResumen(XSSFWorkbook wb, EstilosXlsx s, LiquidacionDTO liq) {
        Sheet sheet = wb.createSheet("Resumen");
        sheet.setColumnWidth(0, 7000);
        sheet.setColumnWidth(1, 7000);

        Row title = sheet.createRow(0);
        Cell c = title.createCell(0);
        c.setCellValue("Liquidacion " + nz(liq.getCodigo()));
        c.setCellStyle(s.titulo);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 1));
        title.setHeightInPoints(28);

        int r = 2;
        addKv(sheet, r++, "Fecha del documento",
                liq.getFechaDocumento() != null ? liq.getFechaDocumento().format(FMT_FECHA) : "-", s);
        addKv(sheet, r++, "Periodo",
                formatPeriodo(liq.getPeriodoDesde(), liq.getPeriodoHasta()), s);
        addKv(sheet, r++, "Estado de pago",
                liq.getEstadoPago() == EstadoPagoConsolidado.PAGADO ? "Pagada" : "No pagada", s);
        addKv(sheet, r++, "Fecha de pago",
                liq.getFechaPago() != null ? liq.getFechaPago().format(FMT_FECHA_HORA) : "-", s);
        addKv(sheet, r++, "Pagado por", nz(liq.getPagadoPorUsername()), s);
        r++;
        addMoneyKv(sheet, r++, "Margen bruto (A)", liq.getMargenBruto(), s);
        addMoneyKv(sheet, r++, "Total distribucion (B)", liq.getTotalCostoDistribucion(), s);
        addMoneyKv(sheet, r++, "Ingreso neto", liq.getIngresoNeto(), s);

        if (liq.getNotas() != null && !liq.getNotas().isBlank()) {
            r++;
            Row nrow = sheet.createRow(r);
            Cell nc = nrow.createCell(0);
            nc.setCellValue("Notas");
            nc.setCellStyle(s.label);
            Cell nv = nrow.createCell(1);
            nv.setCellValue(liq.getNotas());
            nv.setCellStyle(s.texto);
        }
    }

    private void crearHojaConsolidados(XSSFWorkbook wb, EstilosXlsx s, LiquidacionDTO liq) {
        Sheet sheet = wb.createSheet("Seccion A - Consolidados");
        String[] headers = {"#", "Codigo consolidado", "Cerrado", "Paquetes", "Peso (lbs)",
                "Costo proveedor (USD)", "Ingreso cliente (USD)", "Margen (USD)", "Notas"};
        Row hr = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell c = hr.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(s.header);
        }
        for (int i = 0; i < headers.length; i++) sheet.setColumnWidth(i, 4500);
        sheet.setColumnWidth(1, 6500);
        sheet.setColumnWidth(8, 8000);

        int idx = 1;
        int rowIdx = 1;
        for (LiquidacionConsolidadoLineaDTO l : safeList(liq.getConsolidados())) {
            Row row = sheet.createRow(rowIdx++);
            int col = 0;
            putNum(row, col++, idx++, s);
            putText(row, col++, nz(l.getEnvioConsolidadoCodigo()), s);
            Boolean cerrado = l.getEnvioConsolidadoCerrado();
            putText(row, col++, cerrado != null ? (cerrado ? "Si" : "No") : "-", s);
            Integer totalPaquetes = l.getEnvioConsolidadoTotalPaquetes();
            putNum(row, col++, totalPaquetes != null ? totalPaquetes : 0, s);
            putDecimal(row, col++, l.getEnvioConsolidadoPesoTotalLbs(), s);
            putMoney(row, col++, l.getCostoProveedor(), s);
            putMoney(row, col++, l.getIngresoCliente(), s);
            putMoney(row, col++, l.getMargenLinea(), s);
            putText(row, col++, nz(l.getNotas()), s);
        }
        // total
        Row total = sheet.createRow(rowIdx);
        for (int i = 0; i < headers.length; i++) total.createCell(i).setCellStyle(s.totalText);
        total.getCell(0).setCellValue("");
        total.getCell(1).setCellValue("Total seccion A");
        total.getCell(1).setCellStyle(s.totalText);
        BigDecimal totalCosto = sumConsolidados(liq, true);
        BigDecimal totalIng = sumConsolidados(liq, false);
        total.getCell(5).setCellValue(toDouble(totalCosto));
        total.getCell(5).setCellStyle(s.totalMoney);
        total.getCell(6).setCellValue(toDouble(totalIng));
        total.getCell(6).setCellStyle(s.totalMoney);
        total.getCell(7).setCellValue(toDouble(liq.getMargenBruto()));
        total.getCell(7).setCellStyle(s.totalMoney);
    }

    private void crearHojaDespachos(XSSFWorkbook wb, EstilosXlsx s, LiquidacionDTO liq) {
        Sheet sheet = wb.createSheet("Seccion B - Despachos");
        String[] headers = {"#", "Guia despacho", "Courier entrega", "Fecha",
                "Peso (kg)", "Peso (lbs)", "Kg incluidos",
                "Precio fijo (USD)", "Precio kg adic. (USD)", "Costo (USD)", "Notas"};
        Row hr = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell c = hr.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(s.header);
        }
        for (int i = 0; i < headers.length; i++) sheet.setColumnWidth(i, 4500);
        sheet.setColumnWidth(2, 6500);
        sheet.setColumnWidth(10, 8000);

        int idx = 1;
        int rowIdx = 1;
        for (LiquidacionDespachoLineaDTO l : safeList(liq.getDespachos())) {
            Row row = sheet.createRow(rowIdx++);
            int col = 0;
            putNum(row, col++, idx++, s);
            putText(row, col++, nz(l.getDespachoNumeroGuia()), s);
            putText(row, col++, nz(l.getDespachoCourierEntregaNombre()), s);
            putText(row, col++, l.getDespachoFechaHora() != null
                    ? l.getDespachoFechaHora().format(FMT_FECHA) : "-", s);
            putDecimal(row, col++, l.getPesoKg(), s);
            putDecimal(row, col++, l.getPesoLbs(), s);
            putDecimal(row, col++, l.getKgIncluidos(), s);
            putMoney(row, col++, l.getPrecioFijo(), s);
            putMoney(row, col++, l.getPrecioKgAdicional(), s);
            putMoney(row, col++, l.getCostoCalculado(), s);
            putText(row, col++, nz(l.getNotas()), s);
        }
        Row total = sheet.createRow(rowIdx);
        for (int i = 0; i < headers.length; i++) total.createCell(i).setCellStyle(s.totalText);
        total.getCell(1).setCellValue("Total seccion B");
        total.getCell(1).setCellStyle(s.totalText);
        total.getCell(9).setCellValue(toDouble(liq.getTotalCostoDistribucion()));
        total.getCell(9).setCellStyle(s.totalMoney);
    }

    private void addKv(Sheet sheet, int rowIdx, String label, String value, EstilosXlsx s) {
        Row row = sheet.createRow(rowIdx);
        Cell l = row.createCell(0);
        l.setCellValue(label);
        l.setCellStyle(s.label);
        Cell v = row.createCell(1);
        v.setCellValue(value != null ? value : "-");
        v.setCellStyle(s.texto);
    }

    private void addMoneyKv(Sheet sheet, int rowIdx, String label, BigDecimal value, EstilosXlsx s) {
        Row row = sheet.createRow(rowIdx);
        Cell l = row.createCell(0);
        l.setCellValue(label);
        l.setCellStyle(s.label);
        Cell v = row.createCell(1);
        v.setCellValue(toDouble(value));
        v.setCellStyle(s.totalMoney);
    }

    private void putText(Row row, int col, String value, EstilosXlsx s) {
        Cell c = row.createCell(col);
        c.setCellValue(value);
        c.setCellStyle(s.texto);
    }

    private void putNum(Row row, int col, int value, EstilosXlsx s) {
        Cell c = row.createCell(col);
        c.setCellValue(value);
        c.setCellStyle(s.numero);
    }

    private void putDecimal(Row row, int col, BigDecimal value, EstilosXlsx s) {
        Cell c = row.createCell(col);
        c.setCellValue(toDouble(value));
        c.setCellStyle(s.decimal);
    }

    private void putMoney(Row row, int col, BigDecimal value, EstilosXlsx s) {
        Cell c = row.createCell(col);
        c.setCellValue(toDouble(value));
        c.setCellStyle(s.money);
    }

    private static class EstilosXlsx {
        final XSSFCellStyle titulo;
        final XSSFCellStyle header;
        final XSSFCellStyle label;
        final XSSFCellStyle texto;
        final XSSFCellStyle numero;
        final XSSFCellStyle decimal;
        final XSSFCellStyle money;
        final XSSFCellStyle totalText;
        final XSSFCellStyle totalMoney;

        EstilosXlsx(XSSFWorkbook wb) {
            DataFormat df = wb.createDataFormat();
            XSSFFont fontTitulo = wb.createFont();
            fontTitulo.setBold(true);
            fontTitulo.setFontHeightInPoints((short) 16);
            fontTitulo.setColor(IndexedColors.WHITE.getIndex());

            XSSFFont fontHeader = wb.createFont();
            fontHeader.setBold(true);
            fontHeader.setColor(IndexedColors.WHITE.getIndex());
            fontHeader.setFontHeightInPoints((short) 11);

            XSSFFont fontLabel = wb.createFont();
            fontLabel.setBold(true);
            fontLabel.setColor(new XSSFColor(COLOR_PRIMARY_DARK, null));
            fontLabel.setFontHeightInPoints((short) 11);

            titulo = wb.createCellStyle();
            titulo.setFont(fontTitulo);
            setBg(titulo, COLOR_PRIMARY);
            titulo.setAlignment(HorizontalAlignment.LEFT);
            titulo.setVerticalAlignment(VerticalAlignment.CENTER);

            header = wb.createCellStyle();
            header.setFont(fontHeader);
            setBg(header, COLOR_PRIMARY);
            header.setAlignment(HorizontalAlignment.CENTER);
            header.setVerticalAlignment(VerticalAlignment.CENTER);
            applyBorder(header);

            label = wb.createCellStyle();
            label.setFont(fontLabel);
            setBg(label, COLOR_HEADER_BG);
            label.setAlignment(HorizontalAlignment.LEFT);
            applyBorder(label);

            texto = wb.createCellStyle();
            texto.setAlignment(HorizontalAlignment.LEFT);
            applyBorder(texto);

            numero = wb.createCellStyle();
            numero.setAlignment(HorizontalAlignment.RIGHT);
            applyBorder(numero);

            decimal = wb.createCellStyle();
            decimal.setAlignment(HorizontalAlignment.RIGHT);
            decimal.setDataFormat(df.getFormat("#,##0.00"));
            applyBorder(decimal);

            money = wb.createCellStyle();
            money.setAlignment(HorizontalAlignment.RIGHT);
            money.setDataFormat(df.getFormat("\"$ \"#,##0.00"));
            applyBorder(money);

            totalText = wb.createCellStyle();
            totalText.setFont(fontHeader);
            setBg(totalText, COLOR_PRIMARY_DARK);
            totalText.setAlignment(HorizontalAlignment.RIGHT);
            applyBorder(totalText);

            totalMoney = wb.createCellStyle();
            totalMoney.cloneStyleFrom(totalText);
            totalMoney.setDataFormat(df.getFormat("\"$ \"#,##0.00"));
        }

        private void setBg(XSSFCellStyle style, Color color) {
            style.setFillForegroundColor(new XSSFColor(color, null));
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        }

        private void applyBorder(XSSFCellStyle style) {
            style.setBorderTop(BorderStyle.THIN);
            style.setBorderBottom(BorderStyle.THIN);
            style.setBorderLeft(BorderStyle.THIN);
            style.setBorderRight(BorderStyle.THIN);
            style.setTopBorderColor(new XSSFColor(COLOR_BORDER, null));
            style.setBottomBorderColor(new XSSFColor(COLOR_BORDER, null));
            style.setLeftBorderColor(new XSSFColor(COLOR_BORDER, null));
            style.setRightBorderColor(new XSSFColor(COLOR_BORDER, null));
        }
    }

    // ===================================================================
    // Utils
    // ===================================================================

    private static <T> List<T> safeList(List<T> in) {
        return in != null ? in : List.of();
    }

    private static String nz(String s) {
        return s != null ? s : "-";
    }

    private static String safe(String s) {
        if (s == null || s.isBlank()) return "documento";
        return s.replaceAll("[^A-Za-z0-9_-]", "_");
    }

    private static String sanitize(String s) {
        if (s == null) return "";
        return s.replace('\u00A0', ' ');
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }

    private static String formatNum(BigDecimal v, int scale) {
        if (v == null) return "0,00";
        return String.format("%,." + scale + "f", v.doubleValue()).replace('.', ',');
    }

    private static String formatMoney(BigDecimal v) {
        if (v == null) return "0,00";
        return String.format("%,.2f", v.doubleValue()).replace('.', ',');
    }

    private static String formatPeriodo(LocalDate desde, LocalDate hasta) {
        if (desde != null && hasta != null) return desde.format(FMT_FECHA) + " - " + hasta.format(FMT_FECHA);
        if (desde != null) return "desde " + desde.format(FMT_FECHA);
        if (hasta != null) return "hasta " + hasta.format(FMT_FECHA);
        return "-";
    }

    private static BigDecimal sum(BigDecimal a, BigDecimal b) {
        if (a == null) a = BigDecimal.ZERO;
        if (b == null) b = BigDecimal.ZERO;
        return a.add(b);
    }

    private static BigDecimal sumConsolidados(LiquidacionDTO liq, boolean costo) {
        BigDecimal acc = BigDecimal.ZERO;
        for (LiquidacionConsolidadoLineaDTO l : safeList(liq.getConsolidados())) {
            BigDecimal v = costo ? l.getCostoProveedor() : l.getIngresoCliente();
            if (v != null) acc = acc.add(v);
        }
        return acc;
    }

    private static double toDouble(BigDecimal v) {
        return v != null ? v.doubleValue() : 0d;
    }
}
