package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.PageResponse;
import com.ecubox.ecubox_backend.dto.RolDTO;
import com.ecubox.ecubox_backend.dto.RolPermisosUpdateRequest;
import com.ecubox.ecubox_backend.service.RolService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Administración", description = "Gestión de roles y permisos")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/roles")
public class RolController {

    private final RolService rolService;

    public RolController(RolService rolService) {
        this.rolService = rolService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ROLES_READ')")
    @Operation(summary = "Listar roles", description = "Obtiene todos los roles registrados")
    @ApiResponse(responseCode = "200", description = "Listado de roles")
    public ResponseEntity<List<RolDTO>> findAll() {
        return ResponseEntity.ok(rolService.findAll());
    }

    @GetMapping("/page")
    @PreAuthorize("hasAuthority('ROLES_READ')")
    @Operation(summary = "Listar roles paginados", description = "Consulta roles con búsqueda y paginación")
    @ApiResponse(responseCode = "200", description = "Página de roles")
    public ResponseEntity<PageResponse<RolDTO>> findAllPaginated(
            @Parameter(description = "Texto de búsqueda por nombre") @RequestParam(required = false) String q,
            @Parameter(description = "Número de página (base cero)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Cantidad de elementos por página") @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(PageResponse.of(rolService.findAllPaginated(q, page, size)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLES_READ')")
    @Operation(summary = "Obtener rol por ID", description = "Devuelve el detalle de un rol específico")
    @ApiResponse(responseCode = "200", description = "Rol encontrado")
    public ResponseEntity<RolDTO> findById(@Parameter(description = "ID del rol") @PathVariable Long id) {
        return ResponseEntity.ok(rolService.findById(id));
    }

    @PutMapping("/{id}/permisos")
    @PreAuthorize("hasAuthority('ROLES_WRITE')")
    @Operation(summary = "Actualizar permisos de rol", description = "Reemplaza la lista de permisos asignados a un rol")
    @ApiResponse(responseCode = "200", description = "Rol actualizado")
    public ResponseEntity<RolDTO> updatePermisos(@Parameter(description = "ID del rol") @PathVariable Long id,
                                                 @Valid @RequestBody RolPermisosUpdateRequest request) {
        return ResponseEntity.ok(rolService.updatePermisos(id, request));
    }
}
