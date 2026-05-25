package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.CourierEntregaDTO;
import com.ecubox.ecubox_backend.service.CourierEntregaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Operario", description = "Catálogos operativos para despacho")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/operario/couriers-entrega")
public class OperarioCourierEntregaController {

    private final CourierEntregaService courierEntregaService;

    public OperarioCourierEntregaController(CourierEntregaService courierEntregaService) {
        this.courierEntregaService = courierEntregaService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Listar couriers para operario", description = "Obtiene couriers de entrega disponibles para operación")
    @ApiResponse(responseCode = "200", description = "Listado de couriers")
    public ResponseEntity<List<CourierEntregaDTO>> findAll() {
        return ResponseEntity.ok(courierEntregaService.findAll());
    }
}
