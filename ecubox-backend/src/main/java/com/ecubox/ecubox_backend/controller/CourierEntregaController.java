package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.CourierEntregaDTO;
import com.ecubox.ecubox_backend.dto.CourierEntregaRequest;
import com.ecubox.ecubox_backend.dto.PageResponse;
import com.ecubox.ecubox_backend.service.CourierEntregaService;
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

@Tag(name = "Administración", description = "Gestión administrativa de couriers de entrega")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/couriers-entrega")
public class CourierEntregaController {

    private final CourierEntregaService courierEntregaService;

    public CourierEntregaController(CourierEntregaService courierEntregaService) {
        this.courierEntregaService = courierEntregaService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('COURIERS_ENTREGA_READ')")
    @Operation(summary = "Listar couriers de entrega", description = "Obtiene todos los couriers de entrega disponibles")
    @ApiResponse(responseCode = "200", description = "Listado de couriers")
    public ResponseEntity<List<CourierEntregaDTO>> findAll() {
        return ResponseEntity.ok(courierEntregaService.findAll());
    }

    @GetMapping("/page")
    @PreAuthorize("hasAuthority('COURIERS_ENTREGA_READ')")
    @Operation(summary = "Listar couriers paginados", description = "Consulta couriers de entrega con búsqueda y paginación")
    @ApiResponse(responseCode = "200", description = "Página de couriers")
    public ResponseEntity<PageResponse<CourierEntregaDTO>> findAllPaginated(
            @Parameter(description = "Texto de búsqueda") @RequestParam(required = false) String q,
            @Parameter(description = "Número de página (base cero)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Cantidad de elementos por página") @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(PageResponse.of(courierEntregaService.findAllPaginated(q, page, size)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('COURIERS_ENTREGA_READ')")
    @Operation(summary = "Obtener courier por ID", description = "Devuelve el detalle de un courier de entrega")
    @ApiResponse(responseCode = "200", description = "Courier encontrado")
    public ResponseEntity<CourierEntregaDTO> findById(@Parameter(description = "ID del courier") @PathVariable Long id) {
        return ResponseEntity.ok(courierEntregaService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('COURIERS_ENTREGA_WRITE')")
    @Operation(summary = "Crear courier de entrega", description = "Registra un nuevo courier de entrega")
    @ApiResponse(responseCode = "201", description = "Courier creado")
    public ResponseEntity<CourierEntregaDTO> create(@Valid @RequestBody CourierEntregaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(courierEntregaService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('COURIERS_ENTREGA_WRITE')")
    @Operation(summary = "Actualizar courier de entrega", description = "Modifica un courier de entrega existente")
    @ApiResponse(responseCode = "200", description = "Courier actualizado")
    public ResponseEntity<CourierEntregaDTO> update(
            @Parameter(description = "ID del courier") @PathVariable Long id,
            @Valid @RequestBody CourierEntregaRequest request) {
        return ResponseEntity.ok(courierEntregaService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('COURIERS_ENTREGA_WRITE')")
    @Operation(summary = "Eliminar courier de entrega", description = "Elimina un courier de entrega por identificador")
    @ApiResponse(responseCode = "204", description = "Courier eliminado")
    public ResponseEntity<Void> delete(@Parameter(description = "ID del courier") @PathVariable Long id) {
        courierEntregaService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
