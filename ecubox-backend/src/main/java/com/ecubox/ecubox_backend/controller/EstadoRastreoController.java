package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.EstadoRastreoDTO;
import com.ecubox.ecubox_backend.dto.EstadoRastreoOrdenTrackingRequest;
import com.ecubox.ecubox_backend.dto.EstadoRastreoRequest;
import com.ecubox.ecubox_backend.service.EstadoRastreoService;
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

@Tag(name = "Operario", description = "Gestión de estados de rastreo")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/operario/estados-rastreo")
public class EstadoRastreoController {

    private final EstadoRastreoService estadoRastreoService;

    public EstadoRastreoController(EstadoRastreoService estadoRastreoService) {
        this.estadoRastreoService = estadoRastreoService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_READ') or hasRole('ADMIN') or hasRole('OPERARIO')")
    @Operation(summary = "Listar estados de rastreo", description = "Obtiene todos los estados de rastreo configurados")
    @ApiResponse(responseCode = "200", description = "Listado de estados")
    public ResponseEntity<List<EstadoRastreoDTO>> findAll() {
        return ResponseEntity.ok(estadoRastreoService.findAll());
    }

    @GetMapping("/activos")
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_READ') or hasRole('ADMIN') or hasRole('OPERARIO')")
    @Operation(summary = "Listar estados activos", description = "Obtiene únicamente los estados de rastreo activos")
    @ApiResponse(responseCode = "200", description = "Listado de estados activos")
    public ResponseEntity<List<EstadoRastreoDTO>> findActivos() {
        return ResponseEntity.ok(estadoRastreoService.findActivos());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_READ') or hasRole('ADMIN') or hasRole('OPERARIO')")
    @Operation(summary = "Obtener estado por ID", description = "Devuelve el detalle de un estado de rastreo")
    @ApiResponse(responseCode = "200", description = "Estado encontrado")
    public ResponseEntity<EstadoRastreoDTO> findById(@Parameter(description = "ID del estado de rastreo") @PathVariable Long id) {
        return ResponseEntity.ok(estadoRastreoService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_CREATE') or hasRole('ADMIN') or hasRole('OPERARIO')")
    @Operation(summary = "Crear estado de rastreo", description = "Registra un nuevo estado de rastreo")
    @ApiResponse(responseCode = "201", description = "Estado creado")
    public ResponseEntity<EstadoRastreoDTO> create(@Valid @RequestBody EstadoRastreoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(estadoRastreoService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_UPDATE') or hasRole('ADMIN') or hasRole('OPERARIO')")
    @Operation(summary = "Actualizar estado de rastreo", description = "Modifica la información de un estado existente")
    @ApiResponse(responseCode = "200", description = "Estado actualizado")
    public ResponseEntity<EstadoRastreoDTO> update(@Parameter(description = "ID del estado de rastreo") @PathVariable Long id,
                                                   @Valid @RequestBody EstadoRastreoRequest request) {
        return ResponseEntity.ok(estadoRastreoService.update(id, request));
    }

    @PatchMapping("/{id}/desactivar")
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_DELETE') or hasRole('ADMIN') or hasRole('OPERARIO')")
    @Operation(summary = "Desactivar estado de rastreo", description = "Marca un estado de rastreo como inactivo")
    @ApiResponse(responseCode = "200", description = "Estado desactivado")
    public ResponseEntity<EstadoRastreoDTO> desactivar(@Parameter(description = "ID del estado de rastreo") @PathVariable Long id) {
        return ResponseEntity.ok(estadoRastreoService.desactivar(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_DELETE') or hasRole('ADMIN') or hasRole('OPERARIO')")
    @Operation(summary = "Eliminar estado de rastreo", description = "Elimina un estado de rastreo por su identificador")
    @ApiResponse(responseCode = "204", description = "Estado eliminado")
    public ResponseEntity<Void> delete(@Parameter(description = "ID del estado de rastreo") @PathVariable Long id) {
        estadoRastreoService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/orden-tracking")
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_UPDATE') or hasRole('ADMIN') or hasRole('OPERARIO')")
    @Operation(summary = "Reordenar tracking", description = "Actualiza el orden de tracking de los estados de rastreo")
    @ApiResponse(responseCode = "200", description = "Estados reordenados")
    public ResponseEntity<List<EstadoRastreoDTO>> reorderTracking(
            @Valid @RequestBody EstadoRastreoOrdenTrackingRequest request) {
        return ResponseEntity.ok(estadoRastreoService.reorderTracking(request.getEstadoIds(), request.getAlternosAfter()));
    }
}
