package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.AgregarGuiasLoteRequest;
import com.ecubox.ecubox_backend.dto.LoteRecepcionCreateRequest;
import com.ecubox.ecubox_backend.dto.LoteRecepcionDTO;
import com.ecubox.ecubox_backend.service.LoteRecepcionService;
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
import java.util.Map;

@Tag(name = "Operario", description = "Gestión de lotes de recepción")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/operario/lotes-recepcion")
public class OperarioLoteRecepcionController {

    private final LoteRecepcionService loteRecepcionService;

    public OperarioLoteRecepcionController(LoteRecepcionService loteRecepcionService) {
        this.loteRecepcionService = loteRecepcionService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Listar lotes de recepción", description = "Obtiene todos los lotes de recepción registrados")
    @ApiResponse(responseCode = "200", description = "Listado de lotes")
    public ResponseEntity<List<LoteRecepcionDTO>> findAll() {
        return ResponseEntity.ok(loteRecepcionService.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Obtener lote por ID", description = "Devuelve el detalle de un lote de recepción")
    @ApiResponse(responseCode = "200", description = "Lote encontrado")
    public ResponseEntity<LoteRecepcionDTO> findById(@Parameter(description = "ID del lote") @PathVariable Long id) {
        return ResponseEntity.ok(loteRecepcionService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Crear lote de recepción", description = "Crea un nuevo lote para agrupar guías recibidas")
    @ApiResponse(responseCode = "201", description = "Lote creado")
    public ResponseEntity<LoteRecepcionDTO> create(@Valid @RequestBody LoteRecepcionCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(loteRecepcionService.create(request));
    }

    @PostMapping("/{id}/guias")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Agregar guías al lote", description = "Asocia una o varias guías de envío a un lote de recepción")
    @ApiResponse(responseCode = "200", description = "Lote actualizado")
    public ResponseEntity<LoteRecepcionDTO> agregarGuias(
            @Parameter(description = "ID del lote") @PathVariable Long id,
            @Valid @RequestBody AgregarGuiasLoteRequest request) {
        return ResponseEntity.ok(loteRecepcionService.agregarGuias(id, request.getNumeroGuiasEnvio()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Eliminar lote de recepción", description = "Elimina un lote y revierte la asociación de paquetes")
    @ApiResponse(responseCode = "200", description = "Lote eliminado con conteo de paquetes revertidos")
    public ResponseEntity<Map<String, Integer>> delete(@Parameter(description = "ID del lote") @PathVariable Long id) {
        int paquetesRevertidos = loteRecepcionService.delete(id);
        return ResponseEntity.ok(Map.of("paquetesRevertidos", paquetesRevertidos));
    }
}
