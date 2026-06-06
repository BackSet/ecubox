package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.EstadisticasDashboardDTO;
import com.ecubox.ecubox_backend.service.EstadisticasService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Estadísticas", description = "Indicadores para análisis operativo y toma de decisiones")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/estadisticas")
public class EstadisticasController {

    private final EstadisticasService estadisticasService;

    public EstadisticasController(EstadisticasService estadisticasService) {
        this.estadisticasService = estadisticasService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ESTADISTICAS_READ')")
    @Operation(summary = "Obtener estadísticas operativas",
            description = "Devuelve tendencias mensuales, distribución por estado y paquetes demorados sin despacho")
    @ApiResponse(responseCode = "200", description = "Panel estadístico generado")
    public ResponseEntity<EstadisticasDashboardDTO> dashboard(
            @RequestParam(defaultValue = "12") Integer meses) {
        return ResponseEntity.ok(estadisticasService.dashboard(meses));
    }
}
