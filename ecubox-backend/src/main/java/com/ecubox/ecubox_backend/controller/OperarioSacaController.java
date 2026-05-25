package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.dto.SacaActualizarTamanioRequest;
import com.ecubox.ecubox_backend.dto.SacaAsignarPaquetesRequest;
import com.ecubox.ecubox_backend.dto.SacaCreateRequest;
import com.ecubox.ecubox_backend.dto.SacaDTO;
import com.ecubox.ecubox_backend.service.PaqueteService;
import com.ecubox.ecubox_backend.service.SacaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Operario", description = "Gestión operativa de sacas")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/operario/sacas")
public class OperarioSacaController {

    private final SacaService sacaService;
    private final PaqueteService paqueteService;

    public OperarioSacaController(SacaService sacaService, PaqueteService paqueteService) {
        this.sacaService = sacaService;
        this.paqueteService = paqueteService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Listar sacas", description = "Obtiene sacas con opción de filtrar por sin despacho")
    @ApiResponse(responseCode = "200", description = "Listado de sacas")
    public ResponseEntity<List<SacaDTO>> listar(
            @Parameter(description = "Filtrar solo sacas sin despacho asignado") @RequestParam(defaultValue = "true") boolean sinDespacho) {
        return ResponseEntity.ok(sacaService.findBySinDespacho(sinDespacho));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Crear saca", description = "Registra una nueva saca para operación de despacho")
    @ApiResponse(responseCode = "201", description = "Saca creada")
    public ResponseEntity<SacaDTO> create(@Valid @RequestBody SacaCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sacaService.create(request));
    }

    @PostMapping("/{sacaId}/paquetes")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Asignar paquetes a saca", description = "Asocia paquetes existentes a una saca operativa")
    @ApiResponse(responseCode = "200", description = "Paquetes asignados")
    public ResponseEntity<List<PaqueteDTO>> asignarPaquetes(
            @Parameter(description = "ID de la saca") @PathVariable Long sacaId,
            @Valid @RequestBody SacaAsignarPaquetesRequest request) {
        return ResponseEntity.ok(paqueteService.asignarPaquetesASaca(sacaId, request.getPaqueteIds()));
    }

    @PatchMapping("/{id}/tamanio")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Actualizar tamaño de saca", description = "Modifica el tamaño configurado de una saca")
    @ApiResponse(responseCode = "200", description = "Saca actualizada")
    public ResponseEntity<SacaDTO> actualizarTamanio(
            @Parameter(description = "ID de la saca") @PathVariable Long id,
            @Valid @RequestBody SacaActualizarTamanioRequest request) {
        return ResponseEntity.ok(sacaService.actualizarTamanio(id, request.getTamanio()));
    }
}
