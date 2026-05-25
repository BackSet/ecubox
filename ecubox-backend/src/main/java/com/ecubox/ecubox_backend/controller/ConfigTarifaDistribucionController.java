package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.ConfigTarifaDistribucionDTO;
import com.ecubox.ecubox_backend.dto.ConfigTarifaDistribucionRequest;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.ConfigTarifaDistribucionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Administración", description = "Configuración de tarifas de distribución")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/config/tarifa-distribucion")
public class ConfigTarifaDistribucionController {

    private final ConfigTarifaDistribucionService service;
    private final CurrentUserService currentUserService;

    public ConfigTarifaDistribucionController(ConfigTarifaDistribucionService service,
                                              CurrentUserService currentUserService) {
        this.service = service;
        this.currentUserService = currentUserService;
    }

    /** Lectura disponible para cualquier operario autenticado (precarga del form de líneas). */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Obtener tarifa de distribución", description = "Consulta la configuración vigente de tarifa de distribución")
    @ApiResponse(responseCode = "200", description = "Configuración actual")
    public ResponseEntity<ConfigTarifaDistribucionDTO> get() {
        return ResponseEntity.ok(service.getActual());
    }

    @PutMapping
    @PreAuthorize("hasAuthority('CONFIG_TARIFA_DISTRIBUCION_WRITE')")
    @Operation(summary = "Actualizar tarifa de distribución", description = "Actualiza los parámetros de cálculo de la tarifa de distribución")
    @ApiResponse(responseCode = "200", description = "Configuración actualizada")
    public ResponseEntity<ConfigTarifaDistribucionDTO> update(
            @Valid @RequestBody ConfigTarifaDistribucionRequest request) {
        Long actor = currentUserService.getCurrentUsuarioIdOrNull();
        return ResponseEntity.ok(service.actualizar(
                request.getKgIncluidos(),
                request.getPrecioFijo(),
                request.getPrecioKgAdicional(),
                actor));
    }
}
