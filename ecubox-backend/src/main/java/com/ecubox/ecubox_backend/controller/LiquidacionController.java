package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.*;
import com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado;
import com.ecubox.ecubox_backend.service.LiquidacionExportService;
import com.ecubox.ecubox_backend.service.LiquidacionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@Tag(name = "Administración", description = "Gestión administrativa de liquidaciones")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/liquidaciones")
public class LiquidacionController {

    private final LiquidacionService service;
    private final LiquidacionExportService exportService;

    public LiquidacionController(LiquidacionService service,
                                 LiquidacionExportService exportService) {
        this.service = service;
        this.exportService = exportService;
    }

    // ------------------------------------------------------------------
    // Listado y detalle
    // ------------------------------------------------------------------

    @GetMapping
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_READ')")
    @Operation(summary = "Listar liquidaciones", description = "Consulta liquidaciones con filtros de fechas, estado y búsqueda")
    @ApiResponse(responseCode = "200", description = "Página de liquidaciones")
    public ResponseEntity<PageResponse<LiquidacionResumenDTO>> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desdeDocumento,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hastaDocumento,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desdePago,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hastaPago,
            @RequestParam(required = false) EstadoPagoConsolidado estadoPago,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100),
                Sort.by(Sort.Direction.DESC, "fechaDocumento", "id"));
        return ResponseEntity.ok(PageResponse.of(service.listar(
                desdeDocumento, hastaDocumento, desdePago, hastaPago,
                estadoPago, q, pageable)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_READ')")
    @Operation(summary = "Obtener liquidación por ID", description = "Devuelve el detalle completo de una liquidación")
    @ApiResponse(responseCode = "200", description = "Liquidación encontrada")
    public ResponseEntity<LiquidacionDTO> obtener(@Parameter(description = "ID de la liquidación") @PathVariable Long id) {
        return ResponseEntity.ok(service.obtener(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    @Operation(summary = "Crear liquidación", description = "Crea una nueva liquidación")
    @ApiResponse(responseCode = "200", description = "Liquidación creada")
    public ResponseEntity<LiquidacionDTO> crear(@Valid @RequestBody LiquidacionCrearRequest req) {
        return ResponseEntity.ok(service.crear(req));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    @Operation(summary = "Actualizar cabecera de liquidación", description = "Actualiza los datos de encabezado de una liquidación")
    @ApiResponse(responseCode = "200", description = "Liquidación actualizada")
    public ResponseEntity<LiquidacionDTO> actualizarHeader(
            @Parameter(description = "ID de la liquidación") @PathVariable Long id,
            @Valid @RequestBody LiquidacionHeaderRequest req) {
        return ResponseEntity.ok(service.actualizarHeader(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    @Operation(summary = "Eliminar liquidación", description = "Elimina una liquidación por su identificador")
    @ApiResponse(responseCode = "204", description = "Liquidación eliminada")
    public ResponseEntity<Void> eliminar(@Parameter(description = "ID de la liquidación") @PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    // ------------------------------------------------------------------
    // Seccion A - consolidados
    // ------------------------------------------------------------------

    @PostMapping("/{id}/consolidados")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    @Operation(summary = "Agregar consolidado a liquidación", description = "Añade un envío consolidado en la sección A de la liquidación")
    @ApiResponse(responseCode = "200", description = "Liquidación actualizada")
    public ResponseEntity<LiquidacionDTO> agregarConsolidado(
            @Parameter(description = "ID de la liquidación") @PathVariable Long id,
            @Valid @RequestBody LiquidacionConsolidadoLineaRequest req) {
        return ResponseEntity.ok(service.agregarConsolidado(id, req));
    }

    @PutMapping("/{id}/consolidados/{lineaId}")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    @Operation(summary = "Actualizar línea de consolidado", description = "Modifica una línea de consolidado en la liquidación")
    @ApiResponse(responseCode = "200", description = "Liquidación actualizada")
    public ResponseEntity<LiquidacionDTO> actualizarConsolidado(
            @Parameter(description = "ID de la liquidación") @PathVariable Long id,
            @Parameter(description = "ID de la línea consolidada") @PathVariable Long lineaId,
            @Valid @RequestBody LiquidacionConsolidadoLineaRequest req) {
        return ResponseEntity.ok(service.actualizarConsolidado(id, lineaId, req));
    }

    @DeleteMapping("/{id}/consolidados/{lineaId}")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    @Operation(summary = "Eliminar línea de consolidado", description = "Quita una línea de consolidado de la liquidación")
    @ApiResponse(responseCode = "200", description = "Liquidación actualizada")
    public ResponseEntity<LiquidacionDTO> eliminarConsolidado(
            @Parameter(description = "ID de la liquidación") @PathVariable Long id,
            @Parameter(description = "ID de la línea consolidada") @PathVariable Long lineaId) {
        return ResponseEntity.ok(service.eliminarConsolidado(id, lineaId));
    }

    // ------------------------------------------------------------------
    // Seccion B - despachos
    // ------------------------------------------------------------------

    @PostMapping("/{id}/despachos")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    @Operation(summary = "Agregar despacho a liquidación", description = "Añade un despacho en la sección B de la liquidación")
    @ApiResponse(responseCode = "200", description = "Liquidación actualizada")
    public ResponseEntity<LiquidacionDTO> agregarDespacho(
            @Parameter(description = "ID de la liquidación") @PathVariable Long id,
            @Valid @RequestBody LiquidacionDespachoLineaRequest req) {
        return ResponseEntity.ok(service.agregarDespacho(id, req));
    }

    @PutMapping("/{id}/despachos/{lineaId}")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    @Operation(summary = "Actualizar línea de despacho", description = "Modifica una línea de despacho de la liquidación")
    @ApiResponse(responseCode = "200", description = "Liquidación actualizada")
    public ResponseEntity<LiquidacionDTO> actualizarDespacho(
            @Parameter(description = "ID de la liquidación") @PathVariable Long id,
            @Parameter(description = "ID de la línea de despacho") @PathVariable Long lineaId,
            @Valid @RequestBody LiquidacionDespachoLineaRequest req) {
        return ResponseEntity.ok(service.actualizarDespacho(id, lineaId, req));
    }

    @DeleteMapping("/{id}/despachos/{lineaId}")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    @Operation(summary = "Eliminar línea de despacho", description = "Quita una línea de despacho de la liquidación")
    @ApiResponse(responseCode = "200", description = "Liquidación actualizada")
    public ResponseEntity<LiquidacionDTO> eliminarDespacho(
            @Parameter(description = "ID de la liquidación") @PathVariable Long id,
            @Parameter(description = "ID de la línea de despacho") @PathVariable Long lineaId) {
        return ResponseEntity.ok(service.eliminarDespacho(id, lineaId));
    }

    // ------------------------------------------------------------------
    // Estado de pago
    // ------------------------------------------------------------------

    @PostMapping("/{id}/marcar-pagada")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    @Operation(summary = "Marcar liquidación pagada", description = "Cambia el estado de pago de la liquidación a PAGADO")
    @ApiResponse(responseCode = "200", description = "Liquidación actualizada")
    public ResponseEntity<LiquidacionDTO> marcarPagada(@Parameter(description = "ID de la liquidación") @PathVariable Long id) {
        return ResponseEntity.ok(service.marcarPagada(id));
    }

    @PostMapping("/{id}/marcar-no-pagada")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    @Operation(summary = "Marcar liquidación no pagada", description = "Cambia el estado de pago de la liquidación a NO_PAGADO")
    @ApiResponse(responseCode = "200", description = "Liquidación actualizada")
    public ResponseEntity<LiquidacionDTO> marcarNoPagada(@Parameter(description = "ID de la liquidación") @PathVariable Long id) {
        return ResponseEntity.ok(service.marcarNoPagada(id));
    }

    // ------------------------------------------------------------------
    // Selectores - disponibles
    // ------------------------------------------------------------------

    @GetMapping("/disponibles/consolidados")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_READ')")
    @Operation(summary = "Listar consolidados disponibles", description = "Consulta envíos consolidados elegibles para liquidar")
    @ApiResponse(responseCode = "200", description = "Página de consolidados disponibles")
    public ResponseEntity<PageResponse<EnvioConsolidadoDisponibleDTO>> consolidadosDisponibles(
            @Parameter(description = "Texto de búsqueda") @RequestParam(required = false) String q,
            @Parameter(description = "Número de página (base cero)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Cantidad de elementos por página") @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        return ResponseEntity.ok(PageResponse.of(service.listarConsolidadosDisponibles(q, pageable)));
    }

    @GetMapping("/disponibles/despachos")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_READ')")
    @Operation(summary = "Listar despachos disponibles", description = "Consulta despachos elegibles para incorporar en liquidación")
    @ApiResponse(responseCode = "200", description = "Página de despachos disponibles")
    public ResponseEntity<PageResponse<DespachoDisponibleDTO>> despachosDisponibles(
            @Parameter(description = "Texto de búsqueda") @RequestParam(required = false) String q,
            @Parameter(description = "Número de página (base cero)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Cantidad de elementos por página") @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        return ResponseEntity.ok(PageResponse.of(service.listarDespachosDisponibles(q, pageable)));
    }

    // ------------------------------------------------------------------
    // Exportaciones
    // ------------------------------------------------------------------

    @GetMapping("/{id}/exportar/pdf")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_READ')")
    @Operation(summary = "Exportar liquidación a PDF", description = "Genera y descarga la liquidación en formato PDF")
    @ApiResponse(responseCode = "200", description = "Archivo PDF generado")
    public ResponseEntity<byte[]> exportarPdf(@Parameter(description = "ID de la liquidación") @PathVariable Long id) {
        LiquidacionExportService.ExportResult r = exportService.exportarPdf(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", r.fileName());
        return ResponseEntity.ok().headers(headers).body(r.content());
    }

    @GetMapping("/{id}/exportar/xlsx")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_READ')")
    @Operation(summary = "Exportar liquidación a Excel", description = "Genera y descarga la liquidación en formato Excel")
    @ApiResponse(responseCode = "200", description = "Archivo Excel generado")
    public ResponseEntity<byte[]> exportarXlsx(@Parameter(description = "ID de la liquidación") @PathVariable Long id) {
        LiquidacionExportService.ExportResult r = exportService.exportarXlsx(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", r.fileName());
        return ResponseEntity.ok().headers(headers).body(r.content());
    }
}
