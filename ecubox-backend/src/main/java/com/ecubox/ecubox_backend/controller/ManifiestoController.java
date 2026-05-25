package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.AsignarDespachosRequest;
import com.ecubox.ecubox_backend.dto.ManifiestoDTO;
import com.ecubox.ecubox_backend.dto.ManifiestoDespachoCandidatoDTO;
import com.ecubox.ecubox_backend.dto.ManifiestoRequest;
import com.ecubox.ecubox_backend.service.ManifiestoService;
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

/**
 * API REST del manifiesto como agrupador logistico de despachos.
 *
 * <p>Las operaciones monetarias y de estado de pago migraron al modulo de
 * Liquidaciones; aqui solo quedan CRUD basico, asignacion de despachos al
 * documento y consulta de candidatos por periodo.
 */
@Tag(name = "Administración", description = "Gestión administrativa de manifiestos")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/manifiestos")
public class ManifiestoController {

    private final ManifiestoService manifiestoService;

    public ManifiestoController(ManifiestoService manifiestoService) {
        this.manifiestoService = manifiestoService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('MANIFIESTOS_READ')")
    @Operation(summary = "Listar manifiestos", description = "Obtiene todos los manifiestos registrados")
    @ApiResponse(responseCode = "200", description = "Listado de manifiestos")
    public ResponseEntity<List<ManifiestoDTO>> findAll() {
        return ResponseEntity.ok(manifiestoService.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('MANIFIESTOS_READ')")
    @Operation(summary = "Obtener manifiesto por ID", description = "Devuelve el detalle de un manifiesto")
    @ApiResponse(responseCode = "200", description = "Manifiesto encontrado")
    public ResponseEntity<ManifiestoDTO> findById(@Parameter(description = "ID del manifiesto") @PathVariable Long id) {
        return ResponseEntity.ok(manifiestoService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('MANIFIESTOS_WRITE')")
    @Operation(summary = "Crear manifiesto", description = "Registra un nuevo manifiesto logístico")
    @ApiResponse(responseCode = "201", description = "Manifiesto creado")
    public ResponseEntity<ManifiestoDTO> create(@Valid @RequestBody ManifiestoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(manifiestoService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('MANIFIESTOS_WRITE')")
    @Operation(summary = "Actualizar manifiesto", description = "Modifica los datos de un manifiesto existente")
    @ApiResponse(responseCode = "200", description = "Manifiesto actualizado")
    public ResponseEntity<ManifiestoDTO> update(@PathVariable Long id,
                                                @Valid @RequestBody ManifiestoRequest request) {
        return ResponseEntity.ok(manifiestoService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('MANIFIESTOS_WRITE')")
    @Operation(summary = "Eliminar manifiesto", description = "Elimina un manifiesto por su identificador")
    @ApiResponse(responseCode = "204", description = "Manifiesto eliminado")
    public ResponseEntity<Void> delete(@Parameter(description = "ID del manifiesto") @PathVariable Long id) {
        manifiestoService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/asignar-despachos")
    @PreAuthorize("hasAuthority('MANIFIESTOS_WRITE')")
    @Operation(summary = "Asignar despachos al manifiesto", description = "Asocia una lista de despachos a un manifiesto")
    @ApiResponse(responseCode = "200", description = "Manifiesto actualizado")
    public ResponseEntity<ManifiestoDTO> asignarDespachos(
            @Parameter(description = "ID del manifiesto") @PathVariable Long id,
            @Valid @RequestBody AsignarDespachosRequest request) {
        return ResponseEntity.ok(manifiestoService.asignarDespachos(id, request.getDespachoIds()));
    }

    @GetMapping("/{id}/despachos-candidatos")
    @PreAuthorize("hasAuthority('MANIFIESTOS_READ')")
    @Operation(summary = "Listar despachos candidatos", description = "Obtiene los despachos disponibles para asignar al manifiesto")
    @ApiResponse(responseCode = "200", description = "Listado de despachos candidatos")
    public ResponseEntity<List<ManifiestoDespachoCandidatoDTO>> despachosCandidatos(
            @Parameter(description = "ID del manifiesto") @PathVariable Long id) {
        return ResponseEntity.ok(manifiestoService.findDespachosCandidatos(id));
    }
}
