package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.AgenciaDTO;
import com.ecubox.ecubox_backend.dto.AgenciaRequest;
import com.ecubox.ecubox_backend.dto.PageResponse;
import com.ecubox.ecubox_backend.service.AgenciaService;
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

@Tag(name = "Administración", description = "Gestión administrativa de agencias")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/agencias")
public class AgenciaController {

    private final AgenciaService agenciaService;

    public AgenciaController(AgenciaService agenciaService) {
        this.agenciaService = agenciaService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('AGENCIAS_READ')")
    @Operation(summary = "Listar agencias", description = "Obtiene el listado completo de agencias registradas")
    @ApiResponse(responseCode = "200", description = "Listado de agencias")
    public ResponseEntity<List<AgenciaDTO>> findAll() {
        return ResponseEntity.ok(agenciaService.findAll());
    }

    @GetMapping("/page")
    @PreAuthorize("hasAuthority('AGENCIAS_READ')")
    @Operation(summary = "Listar agencias paginadas", description = "Consulta agencias con búsqueda opcional y paginación")
    @ApiResponse(responseCode = "200", description = "Página de agencias")
    public ResponseEntity<PageResponse<AgenciaDTO>> findAllPaginated(
            @Parameter(description = "Texto de búsqueda por nombre o código") @RequestParam(required = false) String q,
            @Parameter(description = "Número de página (base cero)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Cantidad de elementos por página") @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(PageResponse.of(agenciaService.findAllPaginated(q, page, size)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('AGENCIAS_READ')")
    @Operation(summary = "Obtener agencia por ID", description = "Devuelve el detalle de una agencia específica")
    @ApiResponse(responseCode = "200", description = "Agencia encontrada")
    public ResponseEntity<AgenciaDTO> findById(@Parameter(description = "ID de la agencia") @PathVariable Long id) {
        return ResponseEntity.ok(agenciaService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('AGENCIAS_WRITE')")
    @Operation(summary = "Crear agencia", description = "Registra una nueva agencia en el sistema")
    @ApiResponse(responseCode = "201", description = "Agencia creada")
    public ResponseEntity<AgenciaDTO> create(@Valid @RequestBody AgenciaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(agenciaService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('AGENCIAS_WRITE')")
    @Operation(summary = "Actualizar agencia", description = "Modifica los datos de una agencia existente")
    @ApiResponse(responseCode = "200", description = "Agencia actualizada")
    public ResponseEntity<AgenciaDTO> update(@Parameter(description = "ID de la agencia") @PathVariable Long id, @Valid @RequestBody AgenciaRequest request) {
        return ResponseEntity.ok(agenciaService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('AGENCIAS_WRITE')")
    @Operation(summary = "Eliminar agencia", description = "Elimina una agencia por su identificador")
    @ApiResponse(responseCode = "204", description = "Agencia eliminada")
    public ResponseEntity<Void> delete(@Parameter(description = "ID de la agencia") @PathVariable Long id) {
        agenciaService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
