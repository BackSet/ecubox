package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.AgenciaCourierEntregaCreateOperarioRequest;
import com.ecubox.ecubox_backend.dto.AgenciaCourierEntregaDTO;
import com.ecubox.ecubox_backend.dto.AgenciaCourierEntregaRequest;
import com.ecubox.ecubox_backend.service.AgenciaCourierEntregaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@Tag(name = "Operario", description = "Gestión operativa de puntos de entrega")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/operario/couriers-entrega")
public class OperarioAgenciaCourierEntregaController {

    private final AgenciaCourierEntregaService agenciaCourierEntregaService;

    public OperarioAgenciaCourierEntregaController(AgenciaCourierEntregaService agenciaCourierEntregaService) {
        this.agenciaCourierEntregaService = agenciaCourierEntregaService;
    }

    @GetMapping("/{courierEntregaId}/puntos-entrega")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Listar puntos por courier", description = "Obtiene puntos de entrega para un courier específico")
    @ApiResponse(responseCode = "200", description = "Puntos de entrega del courier")
    public ResponseEntity<List<AgenciaCourierEntregaDTO>> findByCourierEntregaId(
            @Parameter(description = "ID del courier de entrega") @PathVariable Long courierEntregaId) {
        return ResponseEntity.ok(agenciaCourierEntregaService.findByCourierEntregaId(courierEntregaId));
    }

    @PostMapping("/{courierEntregaId}/puntos-entrega")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Crear punto de entrega operativo", description = "Registra un punto de entrega para el courier seleccionado")
    @ApiResponse(responseCode = "201", description = "Punto de entrega creado")
    public ResponseEntity<AgenciaCourierEntregaDTO> create(
            @Parameter(description = "ID del courier de entrega") @PathVariable Long courierEntregaId,
            @Valid @RequestBody AgenciaCourierEntregaCreateOperarioRequest body) {
        AgenciaCourierEntregaRequest request = AgenciaCourierEntregaRequest.builder()
                .courierEntregaId(courierEntregaId)
                .codigo(null)
                .provincia(body.getProvincia())
                .canton(body.getCanton())
                .direccion(body.getDireccion())
                .horarioAtencion(body.getHorarioAtencion())
                .diasMaxRetiro(body.getDiasMaxRetiro())
                .build();
        AgenciaCourierEntregaDTO created = agenciaCourierEntregaService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
