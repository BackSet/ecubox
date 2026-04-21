package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.*;
import com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado;
import com.ecubox.ecubox_backend.service.LiquidacionExportService;
import com.ecubox.ecubox_backend.service.LiquidacionService;
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
    public ResponseEntity<LiquidacionDTO> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(service.obtener(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    public ResponseEntity<LiquidacionDTO> crear(@Valid @RequestBody LiquidacionCrearRequest req) {
        return ResponseEntity.ok(service.crear(req));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    public ResponseEntity<LiquidacionDTO> actualizarHeader(
            @PathVariable Long id,
            @Valid @RequestBody LiquidacionHeaderRequest req) {
        return ResponseEntity.ok(service.actualizarHeader(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    // ------------------------------------------------------------------
    // Seccion A - consolidados
    // ------------------------------------------------------------------

    @PostMapping("/{id}/consolidados")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    public ResponseEntity<LiquidacionDTO> agregarConsolidado(
            @PathVariable Long id,
            @Valid @RequestBody LiquidacionConsolidadoLineaRequest req) {
        return ResponseEntity.ok(service.agregarConsolidado(id, req));
    }

    @PutMapping("/{id}/consolidados/{lineaId}")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    public ResponseEntity<LiquidacionDTO> actualizarConsolidado(
            @PathVariable Long id,
            @PathVariable Long lineaId,
            @Valid @RequestBody LiquidacionConsolidadoLineaRequest req) {
        return ResponseEntity.ok(service.actualizarConsolidado(id, lineaId, req));
    }

    @DeleteMapping("/{id}/consolidados/{lineaId}")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    public ResponseEntity<LiquidacionDTO> eliminarConsolidado(
            @PathVariable Long id,
            @PathVariable Long lineaId) {
        return ResponseEntity.ok(service.eliminarConsolidado(id, lineaId));
    }

    // ------------------------------------------------------------------
    // Seccion B - despachos
    // ------------------------------------------------------------------

    @PostMapping("/{id}/despachos")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    public ResponseEntity<LiquidacionDTO> agregarDespacho(
            @PathVariable Long id,
            @Valid @RequestBody LiquidacionDespachoLineaRequest req) {
        return ResponseEntity.ok(service.agregarDespacho(id, req));
    }

    @PutMapping("/{id}/despachos/{lineaId}")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    public ResponseEntity<LiquidacionDTO> actualizarDespacho(
            @PathVariable Long id,
            @PathVariable Long lineaId,
            @Valid @RequestBody LiquidacionDespachoLineaRequest req) {
        return ResponseEntity.ok(service.actualizarDespacho(id, lineaId, req));
    }

    @DeleteMapping("/{id}/despachos/{lineaId}")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    public ResponseEntity<LiquidacionDTO> eliminarDespacho(
            @PathVariable Long id,
            @PathVariable Long lineaId) {
        return ResponseEntity.ok(service.eliminarDespacho(id, lineaId));
    }

    // ------------------------------------------------------------------
    // Estado de pago
    // ------------------------------------------------------------------

    @PostMapping("/{id}/marcar-pagada")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    public ResponseEntity<LiquidacionDTO> marcarPagada(@PathVariable Long id) {
        return ResponseEntity.ok(service.marcarPagada(id));
    }

    @PostMapping("/{id}/marcar-no-pagada")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_WRITE')")
    public ResponseEntity<LiquidacionDTO> marcarNoPagada(@PathVariable Long id) {
        return ResponseEntity.ok(service.marcarNoPagada(id));
    }

    // ------------------------------------------------------------------
    // Selectores - disponibles
    // ------------------------------------------------------------------

    @GetMapping("/disponibles/consolidados")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_READ')")
    public ResponseEntity<PageResponse<EnvioConsolidadoDisponibleDTO>> consolidadosDisponibles(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        return ResponseEntity.ok(PageResponse.of(service.listarConsolidadosDisponibles(q, pageable)));
    }

    @GetMapping("/disponibles/despachos")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_READ')")
    public ResponseEntity<PageResponse<DespachoDisponibleDTO>> despachosDisponibles(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        return ResponseEntity.ok(PageResponse.of(service.listarDespachosDisponibles(q, pageable)));
    }

    // ------------------------------------------------------------------
    // Exportaciones
    // ------------------------------------------------------------------

    @GetMapping("/{id}/exportar/pdf")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_READ')")
    public ResponseEntity<byte[]> exportarPdf(@PathVariable Long id) {
        LiquidacionExportService.ExportResult r = exportService.exportarPdf(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", r.fileName());
        return ResponseEntity.ok().headers(headers).body(r.content());
    }

    @GetMapping("/{id}/exportar/xlsx")
    @PreAuthorize("hasAuthority('LIQUIDACION_CONSOLIDADO_READ')")
    public ResponseEntity<byte[]> exportarXlsx(@PathVariable Long id) {
        LiquidacionExportService.ExportResult r = exportService.exportarXlsx(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", r.fileName());
        return ResponseEntity.ok().headers(headers).body(r.content());
    }
}
