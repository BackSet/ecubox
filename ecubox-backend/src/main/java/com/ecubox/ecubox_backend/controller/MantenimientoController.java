package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.ReparacionBodegaRequest;
import com.ecubox.ecubox_backend.dto.ReparacionBodegaReporteDTO;
import com.ecubox.ecubox_backend.service.ReparacionEstadoBodegaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Herramientas de mantenimiento controlado (uso administrativo). Operaciones que
 * solo se ejecutan dentro de una ventana aprobada, con dry-run obligatorio antes
 * de ejecutar y confirmación explícita.
 *
 * <p>Se protege con {@code ESTADOS_RASTREO_UPDATE} (permiso administrativo
 * existente sobre el catálogo de estados de rastreo); no se introduce un permiso
 * nuevo. La ejecución exige además la confirmación del request.</p>
 */
@Tag(name = "Mantenimiento", description = "Herramientas administrativas de reparación controlada")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/operario/mantenimiento")
public class MantenimientoController {

    private final ReparacionEstadoBodegaService reparacionEstadoBodegaService;

    public MantenimientoController(ReparacionEstadoBodegaService reparacionEstadoBodegaService) {
        this.reparacionEstadoBodegaService = reparacionEstadoBodegaService;
    }

    @PostMapping("/reparacion-estado-bodega")
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_UPDATE')")
    @Operation(summary = "Auditar/reparar estado de bodega de paquetes históricos",
            description = "DRY_RUN audita sin escribir; EXECUTE aplica con confirmación. "
                    + "Solo avanza paquetes anteriores al hito (no degrada posteriores/terminales/alternos/bloqueados), "
                    + "usa la fecha histórica del lote, registra eventos idempotentes y no envía notificaciones.")
    @ApiResponse(responseCode = "200", description = "Reporte de la corrida (afectados y omitidos por categoría)")
    public ResponseEntity<ReparacionBodegaReporteDTO> repararEstadoBodega(
            @Valid @RequestBody ReparacionBodegaRequest request) {
        boolean dryRun = request.getModo() != ReparacionBodegaRequest.Modo.EXECUTE;
        ReparacionBodegaReporteDTO reporte = reparacionEstadoBodegaService.ejecutar(
                dryRun, request.getBatchSize(), request.getMaxPaquetes(), request.getConfirmacion());
        return ResponseEntity.ok(reporte);
    }
}
