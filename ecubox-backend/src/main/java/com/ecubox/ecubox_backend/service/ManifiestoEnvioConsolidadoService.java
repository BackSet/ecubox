package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.entity.Consignatario;
import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import com.ecubox.ecubox_backend.entity.GuiaMaster;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.util.WeightUtil;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Genera el manifiesto del envio consolidado en PDF (PDFBox) y XLSX (Apache POI).
 *
 * <p>Estilo coherente con el resto del sistema (paleta morada de marca,
 * tipografia Helvetica/Calibri y composicion en banner + caja de metadatos +
 * tabla con grilla, totales destacados al final). La paleta debe permanecer
 * sincronizada con {@code ecubox-frontend/src/lib/pdf/theme.ts}.
 */
@Service
public class ManifiestoEnvioConsolidadoService {

    private static final DateTimeFormatter FMT_FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter FMT_FECHA_CORTA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final BigDecimal LBS_TO_KG = WeightUtil.LBS_TO_KG;

    // Paleta corporativa ECUBOX (espejo de ECUBOX_PDF_COLORS en frontend).
    private static final Color COLOR_PRIMARY = new Color(123, 63, 228);              // #7B3FE4
    private static final Color COLOR_PRIMARY_DARK = new Color(86, 32, 188);          // #5620BC
    private static final Color COLOR_PRIMARY_SOFT_STROKE = new Color(203, 184, 246); // #CBB8F6
    private static final Color COLOR_BORDER = new Color(226, 230, 237);              // #E2E6ED
    private static final Color COLOR_BORDER_SOFT = new Color(237, 233, 250);         // #EDE9FA
    private static final Color COLOR_HEADER_BG = new Color(244, 240, 254);           // #F4F0FE
    private static final Color COLOR_ZEBRA = new Color(249, 247, 254);               // #F9F7FE
    private static final Color COLOR_TEXT = new Color(10, 22, 40);                   // #0A1628
    private static final Color COLOR_MUTED = new Color(107, 114, 128);               // #6B7280

    private final PaqueteRepository paqueteRepository;

    public ManifiestoEnvioConsolidadoService(PaqueteRepository paqueteRepository) {
        this.paqueteRepository = paqueteRepository;
    }

    // ===================================================================
    // PDF
    // ===================================================================

    @Transactional(readOnly = true)
    public byte[] generarPdf(EnvioConsolidado envio) {
        List<Paquete> paquetes = paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(envio.getId());

        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDFont fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDFont fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            // Geometria: A4 horizontal para acomodar mas datos del destinatario.
            PDRectangle pageSize = new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth());
            float pageWidth = pageSize.getWidth();
            float pageHeight = pageSize.getHeight();
            float margin = 28f;
            float contentWidth = pageWidth - margin * 2;
            float footerY = margin + 14f;

            String[] headers = {"#", "Tracking master", "Pieza", "Consignatario", "Telefono", "Ubicacion",
                    "Peso (lbs)", "Peso (kg)"};
            float[] widths = computeColumnWidths(contentWidth,
                    new float[]{0.04f, 0.18f, 0.07f, 0.22f, 0.10f, 0.21f, 0.09f, 0.09f});
            int[] aligns = {ALIGN_CENTER, ALIGN_LEFT, ALIGN_CENTER, ALIGN_LEFT, ALIGN_LEFT, ALIGN_LEFT,
                    ALIGN_RIGHT, ALIGN_RIGHT};

            float headerTitleHeight = 64f;        // banda morada con marca + codigo
            float metadataBoxHeight = 86f;        // caja de metadatos
            float tableHeaderHeight = 22f;
            float rowHeight = 18f;

            BigDecimal totalLbs = BigDecimal.ZERO;
            int totalConPeso = 0;

            // Primera pagina
            PDPage page = new PDPage(pageSize);
            doc.addPage(page);
            PDPageContentStream cs = new PDPageContentStream(doc, page);

            float y = pageHeight - margin;
            y = drawHeaderBanner(cs, fontBold, fontRegular, envio, margin, y, contentWidth, headerTitleHeight);
            y -= 16;
            y = drawMetadataBox(cs, fontBold, fontRegular, envio, paquetes.size(), margin, y, contentWidth, metadataBoxHeight);
            y -= 16;

            drawSectionTitle(cs, fontBold, "Detalle de paquetes", margin, y, contentWidth);
            y -= 18;
            drawTableHeader(cs, fontBold, headers, widths, aligns, margin, y, tableHeaderHeight, contentWidth);
            y -= tableHeaderHeight;

            int idx = 1;
            for (Paquete p : paquetes) {
                if (y - rowHeight < footerY + 24) {
                    cs.close();
                    page = new PDPage(pageSize);
                    doc.addPage(page);
                    cs = new PDPageContentStream(doc, page);
                    y = pageHeight - margin;
                    y = drawHeaderBanner(cs, fontBold, fontRegular, envio, margin, y, contentWidth, headerTitleHeight);
                    y -= 16;
                    drawSectionTitle(cs, fontBold, "Detalle de paquetes (continuacion)", margin, y, contentWidth);
                    y -= 18;
                    drawTableHeader(cs, fontBold, headers, widths, aligns, margin, y, tableHeaderHeight, contentWidth);
                    y -= tableHeaderHeight;
                }

                BigDecimal pesoLbs = p.getPesoLbs();
                BigDecimal pesoKg = pesoLbs == null ? null : pesoLbs.multiply(LBS_TO_KG).setScale(2, RoundingMode.HALF_UP);
                if (pesoLbs != null) {
                    totalLbs = totalLbs.add(pesoLbs);
                    totalConPeso++;
                }

                Consignatario d = p.getConsignatario();
                String trackingBase = formatTrackingBase(p);
                String pieza = formatPieza(p);
                String destNombre = d == null ? "" : nullSafe(d.getNombre());
                String destTel = d == null ? "" : nullSafe(d.getTelefono());
                String destUbic = formatUbicacion(d);

                String[] row = new String[]{
                        String.valueOf(idx),
                        trackingBase,
                        pieza,
                        destNombre,
                        destTel,
                        destUbic,
                        pesoLbs == null ? "—" : pesoLbs.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                        pesoKg == null ? "—" : pesoKg.toPlainString(),
                };
                drawTableRow(cs, fontRegular, row, widths, aligns, margin, y, rowHeight, contentWidth, idx % 2 == 0);
                y -= rowHeight;
                idx++;
            }

            // Fila de totales
            if (y - rowHeight < footerY + 24) {
                cs.close();
                page = new PDPage(pageSize);
                doc.addPage(page);
                cs = new PDPageContentStream(doc, page);
                y = pageHeight - margin;
            }
            BigDecimal totalKg = totalLbs.multiply(LBS_TO_KG).setScale(2, RoundingMode.HALF_UP);
            String totalLeft = "TOTAL  ·  " + paquetes.size() + " paquete" + (paquetes.size() == 1 ? "" : "s")
                    + "  ·  " + totalConPeso + " con peso";
            String totalRight = totalLbs.setScale(2, RoundingMode.HALF_UP).toPlainString() + " lbs   /   "
                    + totalKg.toPlainString() + " kg";
            drawTotalBar(cs, fontBold, totalLeft, totalRight, margin, y, contentWidth);

            cs.close();

            // Footer (pagina X / Y) en cada pagina, dibujado al final
            int pageCount = doc.getNumberOfPages();
            String generadoEn = LocalDateTime.now().format(FMT_FECHA);
            for (int i = 0; i < pageCount; i++) {
                PDPage p = doc.getPage(i);
                try (PDPageContentStream fcs = new PDPageContentStream(doc, p,
                        PDPageContentStream.AppendMode.APPEND, true, true)) {
                    drawFooter(fcs, fontRegular, envio.getCodigo(), generadoEn, i + 1, pageCount,
                            margin, footerY, contentWidth);
                }
            }

            doc.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Error generando PDF de manifiesto", e);
        }
    }

    private float drawHeaderBanner(PDPageContentStream cs, PDFont fontBold, PDFont fontRegular,
                                   EnvioConsolidado envio, float x, float y, float width, float height)
            throws IOException {
        // Banda principal
        fillRect(cs, COLOR_PRIMARY, x - 0.01f, y - height, width + 0.02f, height);
        // Acento inferior
        fillRect(cs, COLOR_PRIMARY_DARK, x - 0.01f, y - height - 1.6f, width + 0.02f, 1.6f);

        cs.setNonStrokingColor(Color.WHITE);

        cs.beginText();
        cs.setFont(fontBold, 16);
        cs.newLineAtOffset(x + 14, y - 22);
        cs.showText("ECUBOX");
        cs.endText();

        cs.beginText();
        cs.setFont(fontRegular, 9);
        cs.newLineAtOffset(x + 14, y - 36);
        cs.showText("Documento interno de logistica");
        cs.endText();

        cs.beginText();
        cs.setFont(fontBold, 11);
        cs.newLineAtOffset(x + 14, y - 52);
        cs.showText("MANIFIESTO DE ENVIO CONSOLIDADO");
        cs.endText();

        // Codigo del envio (alineado a la derecha)
        String codigo = sanitizeForPdf(envio.getCodigo());
        float codTextWidth = stringWidth(fontBold, 16, codigo);
        cs.beginText();
        cs.setFont(fontBold, 16);
        cs.newLineAtOffset(x + width - codTextWidth - 14, y - 22);
        cs.showText(codigo);
        cs.endText();

        String estadoTxt = envio.isCerrado() ? "CERRADO" : "ABIERTO";
        float estTextWidth = stringWidth(fontBold, 9, estadoTxt) + 14f;
        // Badge de estado (pildora oscura)
        float badgeH = 12f;
        float badgeY = y - 50;
        fillRect(cs, COLOR_PRIMARY_DARK, x + width - estTextWidth - 6, badgeY, estTextWidth, badgeH);
        cs.setNonStrokingColor(Color.WHITE);
        cs.beginText();
        cs.setFont(fontBold, 9);
        cs.newLineAtOffset(x + width - estTextWidth, badgeY + 3);
        cs.showText(estadoTxt);
        cs.endText();

        cs.setNonStrokingColor(COLOR_TEXT);
        return y - height;
    }

    private float drawMetadataBox(PDPageContentStream cs, PDFont fontBold, PDFont fontRegular,
                                  EnvioConsolidado envio, int totalPaquetes,
                                  float x, float y, float width, float height) throws IOException {
        // Caja con borde sutil (fondo blanco para mantener legibilidad)
        fillRect(cs, Color.WHITE, x, y - height, width, height);
        strokeRect(cs, COLOR_BORDER, x, y - height, width, height);

        // Cabecera de la caja (banda muy clara)
        float cabH = 18f;
        fillRect(cs, COLOR_HEADER_BG, x + 0.5f, y - cabH, width - 1f, cabH);
        cs.setNonStrokingColor(COLOR_PRIMARY_DARK);
        cs.beginText();
        cs.setFont(fontBold, 8);
        cs.newLineAtOffset(x + 12, y - 12);
        cs.showText(sanitizeForPdf("INFORMACION DEL ENVIO"));
        cs.endText();
        cs.setNonStrokingColor(COLOR_TEXT);

        // Dos columnas
        float colW = width / 2;
        String[][] left = {
                {"Codigo", nullSafe(envio.getCodigo())},
                {"Fecha de creacion", fmt(envio.getCreatedAt())},
                {"Total de paquetes", String.valueOf(totalPaquetes)},
        };
        BigDecimal pesoLbs = envio.getPesoTotalLbs() == null ? BigDecimal.ZERO : envio.getPesoTotalLbs();
        BigDecimal pesoKg = pesoLbs.multiply(LBS_TO_KG).setScale(2, RoundingMode.HALF_UP);
        String[][] right = {
                {"Estado", envio.isCerrado() ? "Cerrado" : "Abierto"},
                {"Fecha de cierre", envio.isCerrado() ? fmt(envio.getFechaCerrado()) : "—"},
                {"Peso total", pesoLbs.setScale(2, RoundingMode.HALF_UP).toPlainString() + " lbs ("
                        + pesoKg.toPlainString() + " kg)"},
        };

        float padX = 14;
        float lineH = 20;
        float startY = y - cabH - 16;

        for (int i = 0; i < left.length; i++) {
            drawLabelValue(cs, fontBold, fontRegular, left[i][0], left[i][1],
                    x + padX, startY - i * lineH);
        }
        for (int i = 0; i < right.length; i++) {
            drawLabelValue(cs, fontBold, fontRegular, right[i][0], right[i][1],
                    x + colW + padX, startY - i * lineH);
        }
        return y - height;
    }

    private void drawLabelValue(PDPageContentStream cs, PDFont fontBold, PDFont fontRegular,
                                String label, String value, float x, float y) throws IOException {
        cs.setNonStrokingColor(COLOR_MUTED);
        cs.beginText();
        cs.setFont(fontBold, 7.5f);
        cs.newLineAtOffset(x, y);
        cs.showText(sanitizeForPdf(label).toUpperCase());
        cs.endText();

        cs.setNonStrokingColor(COLOR_TEXT);
        cs.beginText();
        cs.setFont(fontRegular, 10);
        cs.newLineAtOffset(x, y - 11);
        cs.showText(sanitizeForPdf(value));
        cs.endText();
    }

    private void drawSectionTitle(PDPageContentStream cs, PDFont fontBold, String title,
                                  float x, float y, float width) throws IOException {
        cs.setNonStrokingColor(COLOR_PRIMARY_DARK);
        cs.beginText();
        cs.setFont(fontBold, 11);
        cs.newLineAtOffset(x, y);
        cs.showText(sanitizeForPdf(title));
        cs.endText();

        // Subrayado morado claro
        cs.setStrokingColor(COLOR_PRIMARY_SOFT_STROKE);
        cs.setLineWidth(0.6f);
        cs.moveTo(x, y - 4);
        cs.lineTo(x + width, y - 4);
        cs.stroke();

        cs.setNonStrokingColor(COLOR_TEXT);
        cs.setStrokingColor(COLOR_TEXT);
    }

    private void drawTableHeader(PDPageContentStream cs, PDFont fontBold, String[] headers, float[] widths,
                                 int[] aligns, float x, float y, float height, float contentWidth) throws IOException {
        // Encabezado morado fuerte con texto blanco
        fillRect(cs, COLOR_PRIMARY, x, y - height, contentWidth, height);

        cs.setNonStrokingColor(Color.WHITE);
        float cursor = x;
        for (int i = 0; i < headers.length; i++) {
            drawCellText(cs, fontBold, 9, headers[i], cursor, y - height, widths[i], height, aligns[i], 6);
            cursor += widths[i];
        }
        cs.setNonStrokingColor(COLOR_TEXT);
    }

    private void drawTableRow(PDPageContentStream cs, PDFont fontRegular, String[] vals, float[] widths,
                              int[] aligns, float x, float y, float height, float contentWidth, boolean zebra)
            throws IOException {
        if (zebra) {
            fillRect(cs, COLOR_ZEBRA, x, y - height, contentWidth, height);
        }
        // Linea inferior delgada en color borde suave
        cs.setStrokingColor(COLOR_BORDER_SOFT);
        cs.setLineWidth(0.3f);
        cs.moveTo(x, y - height);
        cs.lineTo(x + contentWidth, y - height);
        cs.stroke();
        cs.setStrokingColor(COLOR_TEXT);

        float cursor = x;
        for (int i = 0; i < vals.length; i++) {
            int maxChars = (int) (widths[i] / 4.5f);
            String cellTxt = truncate(vals[i], Math.max(8, maxChars));
            drawCellText(cs, fontRegular, 8.5f, cellTxt, cursor, y - height, widths[i], height, aligns[i], 6);
            cursor += widths[i];
        }
    }

    /**
     * Banda final con totales (texto a la izquierda + texto a la derecha) en
     * color primario fuerte. Reemplaza la antigua fila tabular para evitar
     * solapes con la grilla de columnas.
     */
    private void drawTotalBar(PDPageContentStream cs, PDFont fontBold, String left, String right,
                              float x, float y, float contentWidth) throws IOException {
        float h = 22f;
        fillRect(cs, COLOR_PRIMARY, x, y - h, contentWidth, h);

        cs.setNonStrokingColor(Color.WHITE);
        cs.beginText();
        cs.setFont(fontBold, 10);
        cs.newLineAtOffset(x + 12, y - 14);
        cs.showText(sanitizeForPdf(left));
        cs.endText();

        float rightWidth = stringWidth(fontBold, 10, right);
        cs.beginText();
        cs.setFont(fontBold, 10);
        cs.newLineAtOffset(x + contentWidth - rightWidth - 12, y - 14);
        cs.showText(sanitizeForPdf(right));
        cs.endText();
        cs.setNonStrokingColor(COLOR_TEXT);
    }

    private void drawFooter(PDPageContentStream cs, PDFont fontRegular, String codigo, String generadoEn,
                            int pageNum, int total, float x, float y, float width) throws IOException {
        // Linea fina sobre el footer
        cs.setStrokingColor(COLOR_BORDER_SOFT);
        cs.setLineWidth(0.4f);
        cs.moveTo(x, y + 8);
        cs.lineTo(x + width, y + 8);
        cs.stroke();
        cs.setStrokingColor(COLOR_TEXT);

        cs.setNonStrokingColor(COLOR_MUTED);
        cs.beginText();
        cs.setFont(fontRegular, 8);
        cs.newLineAtOffset(x, y);
        cs.showText(sanitizeForPdf("ECUBOX  ·  Manifiesto " + nullSafe(codigo) + "  ·  Generado " + nullSafe(generadoEn)));
        cs.endText();

        String pageStr = "Pagina " + pageNum + " / " + total;
        float pageStrWidth = stringWidth(fontRegular, 8, pageStr);
        cs.beginText();
        cs.setFont(fontRegular, 8);
        cs.newLineAtOffset(x + width - pageStrWidth, y);
        cs.showText(pageStr);
        cs.endText();
        cs.setNonStrokingColor(COLOR_TEXT);
    }

    // ===================================================================
    // XLSX
    // ===================================================================

    @Transactional(readOnly = true)
    public byte[] generarXlsx(EnvioConsolidado envio) {
        List<Paquete> paquetes = paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(envio.getId());

        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Manifiesto");
            sheet.setDisplayGridlines(false);

            // Anchos de columnas (unidades 1/256 char)
            sheet.setColumnWidth(0, 5 * 256);    // #
            sheet.setColumnWidth(1, 22 * 256);   // Tracking master
            sheet.setColumnWidth(2, 8 * 256);    // Pieza N
            sheet.setColumnWidth(3, 8 * 256);    // Pieza Total
            sheet.setColumnWidth(4, 24 * 256);   // N. Guia pieza
            sheet.setColumnWidth(5, 28 * 256);   // Consignatario
            sheet.setColumnWidth(6, 14 * 256);   // Telefono
            sheet.setColumnWidth(7, 32 * 256);   // Direccion
            sheet.setColumnWidth(8, 18 * 256);   // Canton / Provincia
            sheet.setColumnWidth(9, 12 * 256);   // Codigo
            sheet.setColumnWidth(10, 12 * 256);  // Peso lbs
            sheet.setColumnWidth(11, 12 * 256);  // Peso kg

            int totalCols = 12;

            EstilosXlsx s = new EstilosXlsx(wb);

            int rowIdx = 0;

            // ----- Banner (2 filas: titulo + subtitulo) -----
            Row tituloRow = sheet.createRow(rowIdx);
            tituloRow.setHeightInPoints(30);
            for (int c = 0; c < totalCols; c++) {
                Cell cc = tituloRow.createCell(c);
                cc.setCellStyle(s.titulo);
            }
            tituloRow.getCell(0).setCellValue("MANIFIESTO DE ENVIO CONSOLIDADO  ·  " + nullSafe(envio.getCodigo()));
            sheet.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 0, totalCols - 2));
            tituloRow.getCell(totalCols - 1).setCellValue(envio.isCerrado() ? "CERRADO" : "ABIERTO");
            tituloRow.getCell(totalCols - 1).setCellStyle(s.tituloBadge);
            rowIdx++;

            Row subtRow = sheet.createRow(rowIdx);
            subtRow.setHeightInPoints(16);
            Cell subt = subtRow.createCell(0);
            subt.setCellValue("Documento interno de logistica  ·  ECUBOX");
            subt.setCellStyle(s.subtitulo);
            sheet.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 0, totalCols - 1));
            rowIdx++;

            // Linea en blanco
            rowIdx++;

            // ----- Metadatos en grid 2 columnas -----
            BigDecimal pesoLbsEnvio = envio.getPesoTotalLbs() == null ? BigDecimal.ZERO : envio.getPesoTotalLbs();
            BigDecimal pesoKgEnvio = pesoLbsEnvio.multiply(LBS_TO_KG).setScale(2, RoundingMode.HALF_UP);
            String[][] meta = new String[][]{
                    {"Codigo", nullSafe(envio.getCodigo()),
                            "Estado", envio.isCerrado() ? "Cerrado" : "Abierto"},
                    {"Fecha creacion", fmt(envio.getCreatedAt()),
                            "Fecha cierre", envio.isCerrado() ? fmt(envio.getFechaCerrado()) : "—"},
                    {"Total paquetes", String.valueOf(paquetes.size()),
                            "Peso total",
                            pesoLbsEnvio.setScale(2, RoundingMode.HALF_UP).toPlainString() + " lbs ("
                                    + pesoKgEnvio.toPlainString() + " kg)"},
            };
            for (String[] fila : meta) {
                Row r = sheet.createRow(rowIdx++);
                r.setHeightInPoints(19);
                createCell(r, 0, fila[0], s.metaLabel);
                createCell(r, 1, fila[1], s.metaValue);
                createCell(r, 2, "", s.metaValue);
                createCell(r, 3, fila[2], s.metaLabel);
                createCell(r, 4, fila[3], s.metaValue);
                for (int c = 5; c < totalCols; c++) createCell(r, c, "", s.metaValue);
                sheet.addMergedRegion(new CellRangeAddress(r.getRowNum(), r.getRowNum(), 1, 2));
                sheet.addMergedRegion(new CellRangeAddress(r.getRowNum(), r.getRowNum(), 4, totalCols - 1));
            }

            // Linea en blanco
            rowIdx++;

            // Titulo de seccion
            Row sectRow = sheet.createRow(rowIdx);
            sectRow.setHeightInPoints(22);
            Cell sectCell = sectRow.createCell(0);
            sectCell.setCellValue("Detalle de paquetes");
            sectCell.setCellStyle(s.sectionTitle);
            sheet.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 0, totalCols - 1));
            rowIdx++;

            // ----- Encabezado de tabla -----
            String[] headers = {"#", "Tracking master", "Pieza N", "Pieza Total", "N. Guia pieza",
                    "Consignatario", "Telefono", "Direccion", "Canton / Provincia", "Codigo",
                    "Peso (lbs)", "Peso (kg)"};
            Row header = sheet.createRow(rowIdx);
            header.setHeightInPoints(24);
            for (int i = 0; i < headers.length; i++) {
                Cell c = header.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(s.tableHeader);
            }
            int firstHeaderRow = rowIdx;
            int firstDataRow = rowIdx + 1;
            rowIdx++;

            // ----- Filas -----
            BigDecimal totalLbs = BigDecimal.ZERO;
            int idx = 1;
            int rowsWritten = 0;
            for (Paquete p : paquetes) {
                Row r = sheet.createRow(rowIdx++);
                rowsWritten++;
                boolean zebra = rowsWritten % 2 == 0;
                CellStyle txtL = zebra ? s.cellTextLZebra : s.cellTextL;
                CellStyle txtC = zebra ? s.cellTextCZebra : s.cellTextC;
                CellStyle numC = zebra ? s.cellNumCZebra : s.cellNumC;
                CellStyle pesoSt = zebra ? s.cellPesoZebra : s.cellPeso;
                CellStyle dashSt = zebra ? s.cellDashZebra : s.cellDash;
                CellStyle txtMonoL = zebra ? s.cellMonoLZebra : s.cellMonoL;

                GuiaMaster gm = p.getGuiaMaster();
                Consignatario d = p.getConsignatario();
                String trackingBase = gm != null && gm.getTrackingBase() != null
                        ? gm.getTrackingBase()
                        : extraerTrackingBase(p.getNumeroGuia());

                createCell(r, 0, String.valueOf(idx++), txtC);
                createCell(r, 1, nullSafe(trackingBase), txtMonoL);
                createNumCell(r, 2, p.getPiezaNumero(), numC);
                createNumCell(r, 3, p.getPiezaTotal(), numC);
                createCell(r, 4, nullSafe(p.getNumeroGuia()), txtMonoL);
                createCell(r, 5, d != null ? nullSafe(d.getNombre()) : "", txtL);
                createCell(r, 6, d != null ? nullSafe(d.getTelefono()) : "", txtL);
                createCell(r, 7, d != null ? nullSafe(d.getDireccion()) : "", txtL);
                createCell(r, 8, d != null ? formatCantonProvincia(d) : "", txtL);
                createCell(r, 9, d != null ? nullSafe(d.getCodigo()) : "", txtC);

                if (p.getPesoLbs() != null) {
                    BigDecimal lbs = p.getPesoLbs().setScale(2, RoundingMode.HALF_UP);
                    BigDecimal kg = p.getPesoLbs().multiply(LBS_TO_KG).setScale(2, RoundingMode.HALF_UP);
                    Cell cLbs = r.createCell(10);
                    cLbs.setCellValue(lbs.doubleValue());
                    cLbs.setCellStyle(pesoSt);
                    Cell cKg = r.createCell(11);
                    cKg.setCellValue(kg.doubleValue());
                    cKg.setCellStyle(pesoSt);
                    totalLbs = totalLbs.add(p.getPesoLbs());
                } else {
                    createCell(r, 10, "—", dashSt);
                    createCell(r, 11, "—", dashSt);
                }
            }

            // ----- Fila de totales -----
            BigDecimal totalKg = totalLbs.multiply(LBS_TO_KG).setScale(2, RoundingMode.HALF_UP);
            Row totalRow = sheet.createRow(rowIdx);
            totalRow.setHeightInPoints(26);

            Cell tCell = totalRow.createCell(0);
            tCell.setCellValue("TOTAL  ·  " + paquetes.size() + " paquete"
                    + (paquetes.size() == 1 ? "" : "s"));
            tCell.setCellStyle(s.totalLabel);
            for (int i = 1; i <= 9; i++) {
                Cell c = totalRow.createCell(i);
                c.setCellStyle(s.totalEmpty);
            }
            sheet.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 0, 9));

            Cell totLbs = totalRow.createCell(10);
            totLbs.setCellValue(totalLbs.setScale(2, RoundingMode.HALF_UP).doubleValue());
            totLbs.setCellStyle(s.totalNum);
            Cell totKg = totalRow.createCell(11);
            totKg.setCellValue(totalKg.doubleValue());
            totKg.setCellStyle(s.totalNum);
            int lastDataRow = rowIdx;
            rowIdx++;

            // Pie con datos de generacion
            rowIdx++;
            Row pieRow = sheet.createRow(rowIdx);
            Cell pie = pieRow.createCell(0);
            pie.setCellValue("Generado el " + LocalDateTime.now().format(FMT_FECHA)
                    + "  ·  Manifiesto " + nullSafe(envio.getCodigo()) + "  ·  ECUBOX");
            pie.setCellStyle(s.pie);
            sheet.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 0, totalCols - 1));

            // Freeze + autofilter sobre la tabla
            sheet.createFreezePane(0, firstDataRow);
            if (firstDataRow <= lastDataRow) {
                sheet.setAutoFilter(new CellRangeAddress(firstHeaderRow, lastDataRow, 0, totalCols - 1));
            }

            // Configurar impresion (apaisado, ajustar a 1 pagina de ancho)
            PrintSetup ps = sheet.getPrintSetup();
            ps.setLandscape(true);
            ps.setPaperSize(PrintSetup.A4_PAPERSIZE);
            sheet.setFitToPage(true);
            ps.setFitWidth((short) 1);
            ps.setFitHeight((short) 0);
            sheet.setMargin(PageMargin.LEFT, 0.4);
            sheet.setMargin(PageMargin.RIGHT, 0.4);
            sheet.setMargin(PageMargin.TOP, 0.5);
            sheet.setMargin(PageMargin.BOTTOM, 0.5);

            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Error generando XLSX de manifiesto", e);
        }
    }

    /**
     * Estilos reutilizables del XLSX. Se construye una sola vez por libro porque
     * Excel limita el numero de estilos por workbook (~64k). Usa colores RGB
     * exactos vía XSSFColor para mantener la paleta morada de marca, en lugar
     * de los IndexedColors limitados de POI.
     */
    private static class EstilosXlsx {
        final XSSFCellStyle titulo;
        final XSSFCellStyle tituloBadge;
        final XSSFCellStyle subtitulo;
        final XSSFCellStyle sectionTitle;
        final XSSFCellStyle metaLabel;
        final XSSFCellStyle metaValue;
        final XSSFCellStyle tableHeader;
        final XSSFCellStyle cellTextL;
        final XSSFCellStyle cellTextC;
        final XSSFCellStyle cellMonoL;
        final XSSFCellStyle cellNumC;
        final XSSFCellStyle cellPeso;
        final XSSFCellStyle cellDash;
        final XSSFCellStyle cellTextLZebra;
        final XSSFCellStyle cellTextCZebra;
        final XSSFCellStyle cellMonoLZebra;
        final XSSFCellStyle cellNumCZebra;
        final XSSFCellStyle cellPesoZebra;
        final XSSFCellStyle cellDashZebra;
        final XSSFCellStyle totalLabel;
        final XSSFCellStyle totalEmpty;
        final XSSFCellStyle totalNum;
        final XSSFCellStyle pie;

        EstilosXlsx(XSSFWorkbook wb) {
            DataFormat df = wb.createDataFormat();
            short fmtPeso = df.getFormat("#,##0.00");

            XSSFColor primary = new XSSFColor(COLOR_PRIMARY, null);
            XSSFColor primaryDark = new XSSFColor(COLOR_PRIMARY_DARK, null);
            XSSFColor primarySoft = new XSSFColor(COLOR_HEADER_BG, null);
            XSSFColor zebra = new XSSFColor(COLOR_ZEBRA, null);
            XSSFColor border = new XSSFColor(COLOR_BORDER, null);
            XSSFColor borderSoft = new XSSFColor(COLOR_BORDER_SOFT, null);

            XSSFFont fontTitulo = wb.createFont();
            fontTitulo.setFontName("Calibri");
            fontTitulo.setBold(true);
            fontTitulo.setFontHeightInPoints((short) 14);
            fontTitulo.setColor(new XSSFColor(Color.WHITE, null));

            XSSFFont fontSub = wb.createFont();
            fontSub.setFontName("Calibri");
            fontSub.setItalic(true);
            fontSub.setFontHeightInPoints((short) 9);
            fontSub.setColor(new XSSFColor(COLOR_MUTED, null));

            XSSFFont fontSection = wb.createFont();
            fontSection.setFontName("Calibri");
            fontSection.setBold(true);
            fontSection.setFontHeightInPoints((short) 12);
            fontSection.setColor(new XSSFColor(COLOR_PRIMARY, null));

            XSSFFont fontLabel = wb.createFont();
            fontLabel.setFontName("Calibri");
            fontLabel.setBold(true);
            fontLabel.setFontHeightInPoints((short) 9);
            fontLabel.setColor(new XSSFColor(COLOR_MUTED, null));

            XSSFFont fontValue = wb.createFont();
            fontValue.setFontName("Calibri");
            fontValue.setFontHeightInPoints((short) 11);
            fontValue.setColor(new XSSFColor(COLOR_TEXT, null));

            XSSFFont fontHeader = wb.createFont();
            fontHeader.setFontName("Calibri");
            fontHeader.setBold(true);
            fontHeader.setFontHeightInPoints((short) 10);
            fontHeader.setColor(new XSSFColor(Color.WHITE, null));

            XSSFFont fontCell = wb.createFont();
            fontCell.setFontName("Calibri");
            fontCell.setFontHeightInPoints((short) 10);
            fontCell.setColor(new XSSFColor(COLOR_TEXT, null));

            XSSFFont fontMono = wb.createFont();
            fontMono.setFontName("Consolas");
            fontMono.setBold(true);
            fontMono.setFontHeightInPoints((short) 10);
            fontMono.setColor(new XSSFColor(COLOR_TEXT, null));

            XSSFFont fontTotal = wb.createFont();
            fontTotal.setFontName("Calibri");
            fontTotal.setBold(true);
            fontTotal.setFontHeightInPoints((short) 11);
            fontTotal.setColor(new XSSFColor(Color.WHITE, null));

            XSSFFont fontPie = wb.createFont();
            fontPie.setFontName("Calibri");
            fontPie.setItalic(true);
            fontPie.setFontHeightInPoints((short) 8);
            fontPie.setColor(new XSSFColor(COLOR_MUTED, null));

            this.titulo = wb.createCellStyle();
            titulo.setFont(fontTitulo);
            titulo.setAlignment(HorizontalAlignment.LEFT);
            titulo.setVerticalAlignment(VerticalAlignment.CENTER);
            titulo.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            titulo.setFillForegroundColor(primary);
            titulo.setIndention((short) 1);

            this.tituloBadge = wb.createCellStyle();
            tituloBadge.setFont(fontTitulo);
            tituloBadge.setAlignment(HorizontalAlignment.CENTER);
            tituloBadge.setVerticalAlignment(VerticalAlignment.CENTER);
            tituloBadge.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            tituloBadge.setFillForegroundColor(primaryDark);

            this.subtitulo = wb.createCellStyle();
            subtitulo.setFont(fontSub);
            subtitulo.setAlignment(HorizontalAlignment.LEFT);
            subtitulo.setVerticalAlignment(VerticalAlignment.CENTER);
            subtitulo.setIndention((short) 1);

            this.sectionTitle = wb.createCellStyle();
            sectionTitle.setFont(fontSection);
            sectionTitle.setAlignment(HorizontalAlignment.LEFT);
            sectionTitle.setVerticalAlignment(VerticalAlignment.CENTER);
            sectionTitle.setIndention((short) 1);

            this.metaLabel = wb.createCellStyle();
            metaLabel.setFont(fontLabel);
            metaLabel.setAlignment(HorizontalAlignment.LEFT);
            metaLabel.setVerticalAlignment(VerticalAlignment.CENTER);
            metaLabel.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            metaLabel.setFillForegroundColor(primarySoft);
            metaLabel.setIndention((short) 1);
            applyAllBordersXssf(metaLabel, border);

            this.metaValue = wb.createCellStyle();
            metaValue.setFont(fontValue);
            metaValue.setAlignment(HorizontalAlignment.LEFT);
            metaValue.setVerticalAlignment(VerticalAlignment.CENTER);
            applyAllBordersXssf(metaValue, border);

            this.tableHeader = wb.createCellStyle();
            tableHeader.setFont(fontHeader);
            tableHeader.setAlignment(HorizontalAlignment.CENTER);
            tableHeader.setVerticalAlignment(VerticalAlignment.CENTER);
            tableHeader.setWrapText(true);
            tableHeader.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            tableHeader.setFillForegroundColor(primary);
            applyAllBordersXssf(tableHeader, primaryDark);

            this.cellTextL = baseCell(wb, fontCell, HorizontalAlignment.LEFT, null, borderSoft);
            this.cellTextC = baseCell(wb, fontCell, HorizontalAlignment.CENTER, null, borderSoft);
            this.cellMonoL = baseCell(wb, fontMono, HorizontalAlignment.LEFT, null, borderSoft);
            this.cellNumC = baseCell(wb, fontCell, HorizontalAlignment.CENTER, null, borderSoft);
            this.cellPeso = baseCell(wb, fontCell, HorizontalAlignment.RIGHT, null, borderSoft);
            cellPeso.setDataFormat(fmtPeso);
            this.cellDash = baseCell(wb, fontCell, HorizontalAlignment.RIGHT, null, borderSoft);

            this.cellTextLZebra = baseCell(wb, fontCell, HorizontalAlignment.LEFT, zebra, borderSoft);
            this.cellTextCZebra = baseCell(wb, fontCell, HorizontalAlignment.CENTER, zebra, borderSoft);
            this.cellMonoLZebra = baseCell(wb, fontMono, HorizontalAlignment.LEFT, zebra, borderSoft);
            this.cellNumCZebra = baseCell(wb, fontCell, HorizontalAlignment.CENTER, zebra, borderSoft);
            this.cellPesoZebra = baseCell(wb, fontCell, HorizontalAlignment.RIGHT, zebra, borderSoft);
            cellPesoZebra.setDataFormat(fmtPeso);
            this.cellDashZebra = baseCell(wb, fontCell, HorizontalAlignment.RIGHT, zebra, borderSoft);

            this.totalLabel = wb.createCellStyle();
            totalLabel.setFont(fontTotal);
            totalLabel.setAlignment(HorizontalAlignment.LEFT);
            totalLabel.setVerticalAlignment(VerticalAlignment.CENTER);
            totalLabel.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            totalLabel.setFillForegroundColor(primary);
            totalLabel.setIndention((short) 1);
            applyAllBordersXssf(totalLabel, primaryDark);

            this.totalEmpty = wb.createCellStyle();
            totalEmpty.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            totalEmpty.setFillForegroundColor(primary);
            applyAllBordersXssf(totalEmpty, primaryDark);

            this.totalNum = wb.createCellStyle();
            totalNum.setFont(fontTotal);
            totalNum.setAlignment(HorizontalAlignment.RIGHT);
            totalNum.setVerticalAlignment(VerticalAlignment.CENTER);
            totalNum.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            totalNum.setFillForegroundColor(primary);
            applyAllBordersXssf(totalNum, primaryDark);
            totalNum.setDataFormat(fmtPeso);

            this.pie = wb.createCellStyle();
            pie.setFont(fontPie);
            pie.setAlignment(HorizontalAlignment.RIGHT);
        }

        private static XSSFCellStyle baseCell(XSSFWorkbook wb, XSSFFont font, HorizontalAlignment align,
                                              XSSFColor zebra, XSSFColor border) {
            XSSFCellStyle st = wb.createCellStyle();
            st.setFont(font);
            st.setAlignment(align);
            st.setVerticalAlignment(VerticalAlignment.CENTER);
            applyAllBordersXssf(st, border);
            if (zebra != null) {
                st.setFillPattern(FillPatternType.SOLID_FOREGROUND);
                st.setFillForegroundColor(zebra);
            }
            return st;
        }

        private static void applyAllBordersXssf(XSSFCellStyle st, XSSFColor color) {
            st.setBorderTop(BorderStyle.THIN);
            st.setBorderBottom(BorderStyle.THIN);
            st.setBorderLeft(BorderStyle.THIN);
            st.setBorderRight(BorderStyle.THIN);
            st.setTopBorderColor(color);
            st.setBottomBorderColor(color);
            st.setLeftBorderColor(color);
            st.setRightBorderColor(color);
        }
    }

    private static void createCell(Row r, int col, String value, CellStyle style) {
        Cell c = r.createCell(col);
        c.setCellValue(value == null ? "" : value);
        c.setCellStyle(style);
    }

    private static void createNumCell(Row r, int col, Integer value, CellStyle style) {
        Cell c = r.createCell(col);
        if (value != null) {
            c.setCellValue(value);
        }
        c.setCellStyle(style);
    }

    // ===================================================================
    // Helpers genericos
    // ===================================================================

    private static final int ALIGN_LEFT = 0;
    private static final int ALIGN_CENTER = 1;
    private static final int ALIGN_RIGHT = 2;

    private void drawCellText(PDPageContentStream cs, PDFont font, float fontSize, String text,
                              float x, float y, float width, float height, int align, float padding) throws IOException {
        text = sanitizeForPdf(text);
        float textWidth = stringWidth(font, fontSize, text);
        float drawX = switch (align) {
            case ALIGN_RIGHT -> x + width - textWidth - padding;
            case ALIGN_CENTER -> x + (width - textWidth) / 2f;
            default -> x + padding;
        };
        float drawY = y + (height - fontSize) / 2f + 1f;
        cs.beginText();
        cs.setFont(font, fontSize);
        cs.newLineAtOffset(drawX, drawY);
        cs.showText(text);
        cs.endText();
    }

    private void fillRect(PDPageContentStream cs, Color color, float x, float y, float w, float h) throws IOException {
        cs.setNonStrokingColor(color);
        cs.addRect(x, y, w, h);
        cs.fill();
        cs.setNonStrokingColor(COLOR_TEXT);
    }

    private void strokeRect(PDPageContentStream cs, Color color, float x, float y, float w, float h) throws IOException {
        cs.setStrokingColor(color);
        cs.setLineWidth(0.5f);
        cs.addRect(x, y, w, h);
        cs.stroke();
        cs.setStrokingColor(COLOR_TEXT);
    }

    private float stringWidth(PDFont font, float fontSize, String text) throws IOException {
        if (text == null || text.isEmpty()) return 0f;
        return font.getStringWidth(sanitizeForPdf(text)) / 1000f * fontSize;
    }

    /**
     * Sustituye caracteres que la fuente Helvetica (WinAnsiEncoding) no puede
     * representar para evitar IllegalArgumentException en {@code showText}.
     * Mantiene acentos latinos basicos y reemplaza simbolos exoticos por
     * equivalentes ASCII o por '?'.
     */
    private static String sanitizeForPdf(String s) {
        if (s == null || s.isEmpty()) return "";
        StringBuilder sb = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '\u2014', '\u2013' -> sb.append('-');
                case '\u2018', '\u2019' -> sb.append('\'');
                case '\u201C', '\u201D' -> sb.append('"');
                case '\u2026' -> sb.append("...");
                case '\u00A0' -> sb.append(' ');
                case '\u00B7' -> sb.append('-');
                default -> {
                    if (c < 0x20 || (c > 0x7E && c < 0xA1) || c > 0xFF) {
                        sb.append('?');
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.toString();
    }

    private float[] computeColumnWidths(float total, float[] proportions) {
        float[] r = new float[proportions.length];
        for (int i = 0; i < proportions.length; i++) {
            r[i] = total * proportions[i];
        }
        return r;
    }

    /**
     * Devuelve solo el tracking master de la pieza, sin la fraccion de pieza.
     * Si no hay guia master asociada (caso anomalo), cae al numero de guia
     * del paquete entero.
     */
    private static String formatTrackingBase(Paquete p) {
        GuiaMaster gm = p.getGuiaMaster();
        if (gm != null && gm.getTrackingBase() != null && !gm.getTrackingBase().isBlank()) {
            return gm.getTrackingBase();
        }
        String ng = p.getNumeroGuia();
        if (ng == null) return "";
        int sp = ng.indexOf(' ');
        return sp > 0 ? ng.substring(0, sp) : ng;
    }

    private static String extraerTrackingBase(String numeroGuia) {
        if (numeroGuia == null) return "";
        int sp = numeroGuia.indexOf(' ');
        return sp > 0 ? numeroGuia.substring(0, sp) : numeroGuia;
    }

    private static String formatCantonProvincia(Consignatario d) {
        String canton = d.getCanton();
        String prov = d.getProvincia();
        if (canton != null && !canton.isBlank() && prov != null && !prov.isBlank()) {
            return canton.trim() + ", " + prov.trim();
        }
        if (canton != null && !canton.isBlank()) return canton.trim();
        if (prov != null && !prov.isBlank()) return prov.trim();
        return "";
    }

    private static String formatPieza(Paquete p) {
        Integer pn = p.getPiezaNumero();
        Integer pt = p.getPiezaTotal();
        if (pn == null || pt == null) return "";
        return pn + "/" + pt;
    }

    private static String formatUbicacion(Consignatario d) {
        if (d == null) return "";
        StringBuilder sb = new StringBuilder();
        String dir = d.getDireccion();
        String canton = d.getCanton();
        String prov = d.getProvincia();
        if (dir != null && !dir.isBlank()) {
            sb.append(dir.trim());
        }
        String cantonProv;
        if (canton != null && !canton.isBlank() && prov != null && !prov.isBlank()) {
            cantonProv = canton.trim() + ", " + prov.trim();
        } else if (canton != null && !canton.isBlank()) {
            cantonProv = canton.trim();
        } else if (prov != null && !prov.isBlank()) {
            cantonProv = prov.trim();
        } else {
            cantonProv = "";
        }
        if (!cantonProv.isEmpty()) {
            if (sb.length() > 0) sb.append(" - ");
            sb.append(cantonProv);
        }
        return sb.toString();
    }

    private static String nullSafe(String s) {
        return s == null ? "" : s;
    }

    private static String fmt(LocalDateTime ldt) {
        if (ldt == null) return "—";
        return ldt.format(FMT_FECHA);
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() > max ? s.substring(0, max - 1) + "..." : s;
    }

    @SuppressWarnings("unused")
    private static String fechaCorta(LocalDateTime ldt) {
        if (ldt == null) return "—";
        return ldt.format(FMT_FECHA_CORTA);
    }

    @SuppressWarnings("unused")
    private static int safeInt(Integer i) {
        return i == null ? 0 : i;
    }

    @SuppressWarnings("unused")
    private static List<String> ensureList(List<String> in) {
        return in == null ? new ArrayList<>() : in;
    }
}
