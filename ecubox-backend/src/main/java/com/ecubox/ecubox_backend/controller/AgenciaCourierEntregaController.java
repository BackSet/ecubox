package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.AgenciaCourierEntregaDTO;
import com.ecubox.ecubox_backend.dto.AgenciaCourierEntregaRequest;
import com.ecubox.ecubox_backend.dto.PageResponse;
import com.ecubox.ecubox_backend.service.AgenciaCourierEntregaService;
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

@Tag(name = "Administración", description = "Gestión administrativa de puntos de entrega")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/puntos-entrega")
public class AgenciaCourierEntregaController {

    private final AgenciaCourierEntregaService agenciaCourierEntregaService;

    public AgenciaCourierEntregaController(AgenciaCourierEntregaService agenciaCourierEntregaService) {
        this.agenciaCourierEntregaService = agenciaCourierEntregaService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PUNTOS_ENTREGA_READ')")
    @Operation(summary = "Listar puntos de entrega", description = "Obtiene todos los puntos de entrega configurados")
    @ApiResponse(responseCode = "200", description = "Listado de puntos de entrega")
    public ResponseEntity<List<AgenciaCourierEntregaDTO>> findAll() {
        return ResponseEntity.ok(agenciaCourierEntregaService.findAll());
    }

    @GetMapping("/page")
    @PreAuthorize("hasAuthority('PUNTOS_ENTREGA_READ')")
    @Operation(summary = "Listar puntos paginados", description = "Consulta puntos de entrega con búsqueda y paginación")
    @ApiResponse(responseCode = "200", description = "Página de puntos de entrega")
    public ResponseEntity<PageResponse<AgenciaCourierEntregaDTO>> findAllPaginated(
            @Parameter(description = "Texto de búsqueda") @RequestParam(required = false) String q,
            @Parameter(description = "Número de página (base cero)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Cantidad de elementos por página") @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(PageResponse.of(agenciaCourierEntregaService.findAllPaginated(q, page, size)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PUNTOS_ENTREGA_READ')")
    @Operation(summary = "Obtener punto por ID", description = "Devuelve el detalle de un punto de entrega")
    @ApiResponse(responseCode = "200", description = "Punto de entrega encontrado")
    public ResponseEntity<AgenciaCourierEntregaDTO> findById(@Parameter(description = "ID del punto de entrega") @PathVariable Long id) {
        return ResponseEntity.ok(agenciaCourierEntregaService.findById(id));
    }

    @GetMapping("/por-courier-entrega/{courierEntregaId}")
    @PreAuthorize("hasAuthority('PUNTOS_ENTREGA_READ')")
    @Operation(summary = "Listar puntos por courier", description = "Obtiene los puntos de entrega asociados a un courier")
    @ApiResponse(responseCode = "200", description = "Puntos de entrega del courier")
    public ResponseEntity<List<AgenciaCourierEntregaDTO>> findByCourierEntregaId(
            @Parameter(description = "ID del courier de entrega") @PathVariable Long courierEntregaId) {
        return ResponseEntity.ok(agenciaCourierEntregaService.findByCourierEntregaId(courierEntregaId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PUNTOS_ENTREGA_WRITE')")
    @Operation(summary = "Crear punto de entrega", description = "Registra un nuevo punto de entrega")
    @ApiResponse(responseCode = "201", description = "Punto de entrega creado")
    public ResponseEntity<AgenciaCourierEntregaDTO> create(@Valid @RequestBody AgenciaCourierEntregaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(agenciaCourierEntregaService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PUNTOS_ENTREGA_WRITE')")
    @Operation(summary = "Actualizar punto de entrega", description = "Modifica un punto de entrega existente")
    @ApiResponse(responseCode = "200", description = "Punto de entrega actualizado")
    public ResponseEntity<AgenciaCourierEntregaDTO> update(
            @Parameter(description = "ID del punto de entrega") @PathVariable Long id,
            @Valid @RequestBody AgenciaCourierEntregaRequest request) {
        return ResponseEntity.ok(agenciaCourierEntregaService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PUNTOS_ENTREGA_WRITE')")
    @Operation(summary = "Eliminar punto de entrega", description = "Elimina un punto de entrega por identificador")
    @ApiResponse(responseCode = "204", description = "Punto de entrega eliminado")
    public ResponseEntity<Void> delete(@Parameter(description = "ID del punto de entrega") @PathVariable Long id) {
        agenciaCourierEntregaService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
