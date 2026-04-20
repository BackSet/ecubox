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
 * <p>Formato consistente entre ambos: cabecera tipo "carta", caja de metadatos
 * en dos columnas, tabla con grilla, filas alternas, totales al final y
 * numeracion de paginas (PDF) / freeze + autofilter (XLSX). Las cantidades de
 * peso se muestran tanto en libras como en kilogramos para el operario logistico.
 */
@Service
public class ManifiestoEnvioConsolidadoService {

    private static final DateTimeFormatter FMT_FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter FMT_FECHA_CORTA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final BigDecimal LBS_TO_KG = WeightUtil.LBS_TO_KG;

    /** Color primario corporativo (azul/morado suave) en RGB. */
    private static final Color COLOR_PRIMARY = new Color(63, 81, 181);
    private static final Color COLOR_PRIMARY_SOFT = new Color(232, 234, 246);
    private static final Color COLOR_BORDER = new Color(220, 224, 232);
    private static final Color COLOR_HEADER_BG = new Color(245, 247, 252);
    private static final Color COLOR_ZEBRA = new Color(250, 251, 254);
    private static final Color COLOR_TEXT = new Color(33, 37, 41);
    private static final Color COLOR_MUTED = new Color(108, 117, 125);

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

            // Columnas: # | Master | Pieza | Destinatario | Telefono | Ubicacion | Lbs | Kg
            String[] headers = {"#", "Tracking master", "Pieza", "Destinatario", "Telefono", "Ubicacion",
                    "Peso (lbs)", "Peso (kg)"};
            float[] widths = computeColumnWidths(contentWidth,
                    new float[]{0.04f, 0.18f, 0.07f, 0.22f, 0.10f, 0.21f, 0.09f, 0.09f});
            int[] aligns = {ALIGN_CENTER, ALIGN_LEFT, ALIGN_CENTER, ALIGN_LEFT, ALIGN_LEFT, ALIGN_LEFT,
                    ALIGN_RIGHT, ALIGN_RIGHT};

            float headerTitleHeight = 70f;        // banda azul + datos basicos
            float metadataBoxHeight = 80f;        // caja de metadatos
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
            y -= 14;
            y = drawMetadataBox(cs, fontBold, fontRegular, envio, paquetes.size(), margin, y, contentWidth, metadataBoxHeight);
            y -= 18;

            drawSectionTitle(cs, fontBold, "Detalle de paquetes", margin, y);
            y -= 16;
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
                    drawSectionTitle(cs, fontBold, "Detalle de paquetes (continuacion)", margin, y);
                    y -= 16;
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
            String[] totalRow = new String[]{
                    "",
                    "TOTAL",
                    "",
                    paquetes.size() + " paquete" + (paquetes.size() == 1 ? "" : "s"),
                    "",
                    totalConPeso + " con peso",
                    totalLbs.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                    totalKg.toPlainString(),
            };
            drawTotalRow(cs, fontBold, totalRow, widths, aligns, margin, y, rowHeight, contentWidth);

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
        // Banda de color primario
        fillRect(cs, COLOR_PRIMARY, x, y - height, width, height);

        cs.setNonStrokingColor(Color.WHITE);
        cs.beginText();
        cs.setFont(fontBold, 16);
        cs.newLineAtOffset(x + 14, y - 24);
        cs.showText("MANIFIESTO DE ENVIO CONSOLIDADO");
        cs.endText();

        cs.beginText();
        cs.setFont(fontRegular, 10);
        cs.newLineAtOffset(x + 14, y - 40);
        cs.showText("Documento interno de logistica - ECUBOX");
        cs.endText();

        // Codigo del envio (alineado a la derecha)
        String codigo = sanitizeForPdf(envio.getCodigo());
        float codTextWidth = stringWidth(fontBold, 14, codigo);
        cs.beginText();
        cs.setFont(fontBold, 14);
        cs.newLineAtOffset(x + width - codTextWidth - 14, y - 24);
        cs.showText(codigo);
        cs.endText();

        String estadoTxt = envio.isCerrado() ? "CERRADO" : "ABIERTO";
        float estTextWidth = stringWidth(fontRegular, 10, estadoTxt);
        cs.beginText();
        cs.setFont(fontRegular, 10);
        cs.newLineAtOffset(x + width - estTextWidth - 14, y - 40);
        cs.showText(estadoTxt);
        cs.endText();

        cs.setNonStrokingColor(COLOR_TEXT);
        return y - height;
    }

    private float drawMetadataBox(PDPageContentStream cs, PDFont fontBold, PDFont fontRegular,
                                  EnvioConsolidado envio, int totalPaquetes,
                                  float x, float y, float width, float height) throws IOException {
        // Caja con borde
        fillRect(cs, COLOR_HEADER_BG, x, y - height, width, height);
        strokeRect(cs, COLOR_BORDER, x, y - height, width, height);

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

        float padX = 12;
        float padY = 12;
        float lineH = 18;
        float startY = y - padY;

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
        cs.setFont(fontBold, 8);
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

    private void drawSectionTitle(PDPageContentStream cs, PDFont fontBold, String title, float x, float y)
            throws IOException {
        cs.setNonStrokingColor(COLOR_PRIMARY);
        cs.beginText();
        cs.setFont(fontBold, 11);
        cs.newLineAtOffset(x, y);
        cs.showText(sanitizeForPdf(title));
        cs.endText();
        cs.setNonStrokingColor(COLOR_TEXT);
    }

    private void drawTableHeader(PDPageContentStream cs, PDFont fontBold, String[] headers, float[] widths,
                                 int[] aligns, float x, float y, float height, float contentWidth) throws IOException {
        fillRect(cs, COLOR_PRIMARY_SOFT, x, y - height, contentWidth, height);
        strokeRect(cs, COLOR_BORDER, x, y - height, contentWidth, height);

        cs.setNonStrokingColor(COLOR_PRIMARY);
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
        strokeRect(cs, COLOR_BORDER, x, y - height, contentWidth, height);

        float cursor = x;
        for (int i = 0; i < vals.length; i++) {
            int maxChars = (int) (widths[i] / 4.5f);
            String cellTxt = truncate(vals[i], Math.max(8, maxChars));
            drawCellText(cs, fontRegular, 8.5f, cellTxt, cursor, y - height, widths[i], height, aligns[i], 6);
            cursor += widths[i];
        }
    }

    private void drawTotalRow(PDPageContentStream cs, PDFont fontBold, String[] vals, float[] widths,
                              int[] aligns, float x, float y, float height, float contentWidth) throws IOException {
        fillRect(cs, COLOR_PRIMARY_SOFT, x, y - height, contentWidth, height);
        strokeRect(cs, COLOR_PRIMARY, x, y - height, contentWidth, height);

        cs.setNonStrokingColor(COLOR_PRIMARY);
        float cursor = x;
        for (int i = 0; i < vals.length; i++) {
            drawCellText(cs, fontBold, 9, vals[i], cursor, y - height, widths[i], height, aligns[i], 6);
            cursor += widths[i];
        }
        cs.setNonStrokingColor(COLOR_TEXT);
    }

    private void drawFooter(PDPageContentStream cs, PDFont fontRegular, String codigo, String generadoEn,
                            int pageNum, int total, float x, float y, float width) throws IOException {
        cs.setNonStrokingColor(COLOR_MUTED);
        cs.beginText();
        cs.setFont(fontRegular, 8);
        cs.newLineAtOffset(x, y);
        cs.showText(sanitizeForPdf("Manifiesto " + nullSafe(codigo) + " - generado " + nullSafe(generadoEn)));
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
            sheet.setColumnWidth(5, 28 * 256);   // Destinatario
            sheet.setColumnWidth(6, 14 * 256);   // Telefono
            sheet.setColumnWidth(7, 32 * 256);   // Direccion
            sheet.setColumnWidth(8, 18 * 256);   // Canton / Provincia
            sheet.setColumnWidth(9, 12 * 256);   // Codigo
            sheet.setColumnWidth(10, 12 * 256);  // Peso lbs
            sheet.setColumnWidth(11, 12 * 256);  // Peso kg

            int totalCols = 12;

            EstilosXlsx s = new EstilosXlsx(wb);

            int rowIdx = 0;

            // ----- Titulo -----
            Row tituloRow = sheet.createRow(rowIdx);
            tituloRow.setHeightInPoints(28);
            Cell titulo = tituloRow.createCell(0);
            titulo.setCellValue("MANIFIESTO DE ENVIO CONSOLIDADO");
            titulo.setCellStyle(s.titulo);
            sheet.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 0, totalCols - 1));
            rowIdx++;

            Row subtRow = sheet.createRow(rowIdx);
            subtRow.setHeightInPoints(16);
            Cell subt = subtRow.createCell(0);
            subt.setCellValue("Documento interno de logistica - ECUBOX");
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
                r.setHeightInPoints(18);
                createCell(r, 0, fila[0], s.metaLabel);
                createCell(r, 1, fila[1], s.metaValue);
                createCell(r, 2, "", s.metaSpacer); // espacio
                createCell(r, 3, fila[2], s.metaLabel);
                createCell(r, 4, fila[3], s.metaValue);
                // El resto de columnas
                for (int c = 5; c < totalCols; c++) createCell(r, c, "", s.metaSpacer);
                sheet.addMergedRegion(new CellRangeAddress(r.getRowNum(), r.getRowNum(), 1, 2));
                sheet.addMergedRegion(new CellRangeAddress(r.getRowNum(), r.getRowNum(), 4, totalCols - 1));
            }

            // Linea en blanco
            rowIdx++;

            // ----- Encabezado de tabla -----
            String[] headers = {"#", "Tracking master", "Pieza N", "Pieza Total", "N. Guia pieza",
                    "Destinatario", "Telefono", "Direccion", "Canton / Provincia", "Codigo",
                    "Peso (lbs)", "Peso (kg)"};
            Row header = sheet.createRow(rowIdx);
            header.setHeightInPoints(22);
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

                GuiaMaster gm = p.getGuiaMaster();
                Consignatario d = p.getConsignatario();
                String trackingBase = gm != null && gm.getTrackingBase() != null
                        ? gm.getTrackingBase()
                        : extraerTrackingBase(p.getNumeroGuia());

                createCell(r, 0, String.valueOf(idx++), txtC);
                createCell(r, 1, nullSafe(trackingBase), txtL);
                createNumCell(r, 2, p.getPiezaNumero(), numC);
                createNumCell(r, 3, p.getPiezaTotal(), numC);
                createCell(r, 4, nullSafe(p.getNumeroGuia()), txtL);
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
            totalRow.setHeightInPoints(22);

            // Etiqueta TOTAL ocupando # + Tracking master + Pieza N + Pieza Total + N. Guia pieza
            Cell tCell = totalRow.createCell(0);
            tCell.setCellValue("TOTAL  -  " + paquetes.size() + " paquete"
                    + (paquetes.size() == 1 ? "" : "s"));
            tCell.setCellStyle(s.totalLabel);
            for (int i = 1; i <= 4; i++) {
                Cell c = totalRow.createCell(i);
                c.setCellStyle(s.totalEmpty);
            }
            sheet.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 0, 4));

            // Resumen ocupando Destinatario + Telefono + Direccion + Canton/Prov + Codigo
            Cell resumen = totalRow.createCell(5);
            resumen.setCellValue("Total acumulado");
            resumen.setCellStyle(s.totalLabel);
            for (int i = 6; i <= 9; i++) {
                Cell c = totalRow.createCell(i);
                c.setCellStyle(s.totalEmpty);
            }
            sheet.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 5, 9));

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
                    + " - Manifiesto " + nullSafe(envio.getCodigo()));
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
     * Excel limita el numero de estilos por workbook (~64k).
     */
    private static class EstilosXlsx {
        final CellStyle titulo;
        final CellStyle subtitulo;
        final CellStyle metaLabel;
        final CellStyle metaValue;
        final CellStyle metaSpacer;
        final CellStyle tableHeader;
        final CellStyle cellTextL;
        final CellStyle cellTextC;
        final CellStyle cellNumC;
        final CellStyle cellPeso;
        final CellStyle cellDash;
        final CellStyle cellTextLZebra;
        final CellStyle cellTextCZebra;
        final CellStyle cellNumCZebra;
        final CellStyle cellPesoZebra;
        final CellStyle cellDashZebra;
        final CellStyle totalLabel;
        final CellStyle totalEmpty;
        final CellStyle totalNum;
        final CellStyle pie;

        EstilosXlsx(Workbook wb) {
            DataFormat df = wb.createDataFormat();
            short fmtPeso = df.getFormat("#,##0.00");

            Font fontTitulo = wb.createFont();
            fontTitulo.setBold(true);
            fontTitulo.setFontHeightInPoints((short) 14);
            fontTitulo.setColor(IndexedColors.WHITE.getIndex());

            Font fontSub = wb.createFont();
            fontSub.setItalic(true);
            fontSub.setFontHeightInPoints((short) 9);
            fontSub.setColor(IndexedColors.GREY_50_PERCENT.getIndex());

            Font fontLabel = wb.createFont();
            fontLabel.setBold(true);
            fontLabel.setFontHeightInPoints((short) 9);
            fontLabel.setColor(IndexedColors.GREY_50_PERCENT.getIndex());

            Font fontValue = wb.createFont();
            fontValue.setFontHeightInPoints((short) 11);

            Font fontHeader = wb.createFont();
            fontHeader.setBold(true);
            fontHeader.setFontHeightInPoints((short) 10);
            fontHeader.setColor(IndexedColors.WHITE.getIndex());

            Font fontCell = wb.createFont();
            fontCell.setFontHeightInPoints((short) 10);

            Font fontTotal = wb.createFont();
            fontTotal.setBold(true);
            fontTotal.setFontHeightInPoints((short) 10);

            Font fontPie = wb.createFont();
            fontPie.setItalic(true);
            fontPie.setFontHeightInPoints((short) 8);
            fontPie.setColor(IndexedColors.GREY_50_PERCENT.getIndex());

            this.titulo = wb.createCellStyle();
            titulo.setFont(fontTitulo);
            titulo.setAlignment(HorizontalAlignment.CENTER);
            titulo.setVerticalAlignment(VerticalAlignment.CENTER);
            titulo.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            titulo.setFillForegroundColor(IndexedColors.INDIGO.getIndex());

            this.subtitulo = wb.createCellStyle();
            subtitulo.setFont(fontSub);
            subtitulo.setAlignment(HorizontalAlignment.CENTER);
            subtitulo.setVerticalAlignment(VerticalAlignment.CENTER);

            this.metaLabel = wb.createCellStyle();
            metaLabel.setFont(fontLabel);
            metaLabel.setAlignment(HorizontalAlignment.LEFT);
            metaLabel.setVerticalAlignment(VerticalAlignment.CENTER);
            metaLabel.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            metaLabel.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            applyAllBorders(metaLabel, BorderStyle.THIN, IndexedColors.GREY_40_PERCENT.getIndex());

            this.metaValue = wb.createCellStyle();
            metaValue.setFont(fontValue);
            metaValue.setAlignment(HorizontalAlignment.LEFT);
            metaValue.setVerticalAlignment(VerticalAlignment.CENTER);
            applyAllBorders(metaValue, BorderStyle.THIN, IndexedColors.GREY_40_PERCENT.getIndex());

            this.metaSpacer = wb.createCellStyle();
            metaSpacer.setVerticalAlignment(VerticalAlignment.CENTER);

            this.tableHeader = wb.createCellStyle();
            tableHeader.setFont(fontHeader);
            tableHeader.setAlignment(HorizontalAlignment.CENTER);
            tableHeader.setVerticalAlignment(VerticalAlignment.CENTER);
            tableHeader.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            tableHeader.setFillForegroundColor(IndexedColors.INDIGO.getIndex());
            applyAllBorders(tableHeader, BorderStyle.THIN, IndexedColors.GREY_50_PERCENT.getIndex());

            this.cellTextL = baseCell(wb, fontCell, HorizontalAlignment.LEFT, false);
            this.cellTextC = baseCell(wb, fontCell, HorizontalAlignment.CENTER, false);
            this.cellNumC = baseCell(wb, fontCell, HorizontalAlignment.CENTER, false);
            this.cellPeso = baseCell(wb, fontCell, HorizontalAlignment.RIGHT, false);
            cellPeso.setDataFormat(fmtPeso);
            this.cellDash = baseCell(wb, fontCell, HorizontalAlignment.RIGHT, false);

            this.cellTextLZebra = baseCell(wb, fontCell, HorizontalAlignment.LEFT, true);
            this.cellTextCZebra = baseCell(wb, fontCell, HorizontalAlignment.CENTER, true);
            this.cellNumCZebra = baseCell(wb, fontCell, HorizontalAlignment.CENTER, true);
            this.cellPesoZebra = baseCell(wb, fontCell, HorizontalAlignment.RIGHT, true);
            cellPesoZebra.setDataFormat(fmtPeso);
            this.cellDashZebra = baseCell(wb, fontCell, HorizontalAlignment.RIGHT, true);

            this.totalLabel = wb.createCellStyle();
            totalLabel.setFont(fontTotal);
            totalLabel.setAlignment(HorizontalAlignment.CENTER);
            totalLabel.setVerticalAlignment(VerticalAlignment.CENTER);
            totalLabel.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            totalLabel.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            applyAllBorders(totalLabel, BorderStyle.THIN, IndexedColors.GREY_50_PERCENT.getIndex());

            this.totalEmpty = wb.createCellStyle();
            totalEmpty.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            totalEmpty.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            applyAllBorders(totalEmpty, BorderStyle.THIN, IndexedColors.GREY_50_PERCENT.getIndex());

            this.totalNum = wb.createCellStyle();
            totalNum.setFont(fontTotal);
            totalNum.setAlignment(HorizontalAlignment.RIGHT);
            totalNum.setVerticalAlignment(VerticalAlignment.CENTER);
            totalNum.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            totalNum.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            applyAllBorders(totalNum, BorderStyle.THIN, IndexedColors.GREY_50_PERCENT.getIndex());
            totalNum.setDataFormat(fmtPeso);

            this.pie = wb.createCellStyle();
            pie.setFont(fontPie);
            pie.setAlignment(HorizontalAlignment.RIGHT);
        }

        private static CellStyle baseCell(Workbook wb, Font font, HorizontalAlignment align, boolean zebra) {
            CellStyle st = wb.createCellStyle();
            st.setFont(font);
            st.setAlignment(align);
            st.setVerticalAlignment(VerticalAlignment.CENTER);
            applyAllBorders(st, BorderStyle.THIN, IndexedColors.GREY_25_PERCENT.getIndex());
            if (zebra) {
                st.setFillPattern(FillPatternType.SOLID_FOREGROUND);
                st.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            }
            return st;
        }

        private static void applyAllBorders(CellStyle st, BorderStyle border, short color) {
            st.setBorderTop(border);
            st.setBorderBottom(border);
            st.setBorderLeft(border);
            st.setBorderRight(border);
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
        float drawX;
        switch (align) {
            case ALIGN_RIGHT:
                drawX = x + width - textWidth - padding;
                break;
            case ALIGN_CENTER:
                drawX = x + (width - textWidth) / 2f;
                break;
            default:
                drawX = x + padding;
                break;
        }
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
                case '\u2014': // em dash
                case '\u2013': // en dash
                    sb.append('-');
                    break;
                case '\u2018':
                case '\u2019':
                    sb.append('\'');
                    break;
                case '\u201C':
                case '\u201D':
                    sb.append('"');
                    break;
                case '\u2026':
                    sb.append("...");
                    break;
                case '\u00A0':
                    sb.append(' ');
                    break;
                default:
                    // WinAnsi soporta U+0020..U+007E y la mayoria de Latin-1 (U+00A1..U+00FF).
                    // Para todo lo demas, sustituimos por '?'.
                    if (c < 0x20 || (c > 0x7E && c < 0xA1) || c > 0xFF) {
                        sb.append('?');
                    } else {
                        sb.append(c);
                    }
                    break;
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
        // Fallback: extraer el tracking base del numeroGuia ("<base> <n>/<t>").
        String ng = p.getNumeroGuia();
        if (ng == null) return "";
        int sp = ng.indexOf(' ');
        return sp > 0 ? ng.substring(0, sp) : ng;
    }

    /** Extrae el tracking base de un numeroGuia con formato "<base> <n>/<t>". */
    private static String extraerTrackingBase(String numeroGuia) {
        if (numeroGuia == null) return "";
        int sp = numeroGuia.indexOf(' ');
        return sp > 0 ? numeroGuia.substring(0, sp) : numeroGuia;
    }

    /** "{canton}, {provincia}" / "{canton}" / "{provincia}" / "" segun datos disponibles. */
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

    /** Devuelve la fraccion de pieza "{piezaNumero}/{piezaTotal}" o vacio si no hay datos. */
    private static String formatPieza(Paquete p) {
        Integer pn = p.getPiezaNumero();
        Integer pt = p.getPiezaTotal();
        if (pn == null || pt == null) return "";
        return pn + "/" + pt;
    }

    /** Devuelve "{direccion} - {canton}, {provincia}" segun los datos disponibles. */
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

    /**
     * Truncado defensivo para celdas del PDF. Mantiene la firma
     * por compatibilidad pero valida primero.
     */
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
