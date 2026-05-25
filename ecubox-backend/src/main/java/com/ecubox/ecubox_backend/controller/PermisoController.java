package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.PageResponse;
import com.ecubox.ecubox_backend.dto.PermisoDTO;
import com.ecubox.ecubox_backend.service.PermisoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Administración", description = "Consulta de permisos del sistema")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/permisos")
public class PermisoController {

    private final PermisoService permisoService;

    public PermisoController(PermisoService permisoService) {
        this.permisoService = permisoService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PERMISOS_READ')")
    @Operation(summary = "Listar permisos", description = "Obtiene todos los permisos disponibles en el sistema")
    @ApiResponse(responseCode = "200", description = "Listado de permisos")
    public ResponseEntity<List<PermisoDTO>> findAll() {
        return ResponseEntity.ok(permisoService.findAll());
    }

    @GetMapping("/page")
    @PreAuthorize("hasAuthority('PERMISOS_READ')")
    @Operation(summary = "Listar permisos paginados", description = "Consulta permisos con filtro de búsqueda y paginación")
    @ApiResponse(responseCode = "200", description = "Página de permisos")
    public ResponseEntity<PageResponse<PermisoDTO>> findAllPaginated(
            @Parameter(description = "Texto de búsqueda por nombre o código") @RequestParam(required = false) String q,
            @Parameter(description = "Número de página (base cero)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Cantidad de elementos por página") @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(PageResponse.of(permisoService.findAllPaginated(q, page, size)));
    }
}
