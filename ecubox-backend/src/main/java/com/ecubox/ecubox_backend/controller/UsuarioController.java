package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.PageResponse;
import com.ecubox.ecubox_backend.dto.UsuarioCreateRequest;
import com.ecubox.ecubox_backend.dto.UsuarioDTO;
import com.ecubox.ecubox_backend.dto.UsuarioUpdateRequest;
import com.ecubox.ecubox_backend.service.UsuarioService;
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

@Tag(name = "Administración", description = "Gestión administrativa de usuarios")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('USUARIOS_READ')")
    @Operation(summary = "Listar usuarios", description = "Obtiene el listado de usuarios del sistema")
    @ApiResponse(responseCode = "200", description = "Listado de usuarios")
    public ResponseEntity<List<UsuarioDTO>> findAll() {
        return ResponseEntity.ok(usuarioService.findAll());
    }

    @GetMapping("/page")
    @PreAuthorize("hasAuthority('USUARIOS_READ')")
    @Operation(summary = "Listar usuarios paginados", description = "Consulta usuarios con búsqueda y paginación")
    @ApiResponse(responseCode = "200", description = "Página de usuarios")
    public ResponseEntity<PageResponse<UsuarioDTO>> findAllPaginated(
            @Parameter(description = "Texto de búsqueda por nombre o correo") @RequestParam(required = false) String q,
            @Parameter(description = "Número de página (base cero)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Cantidad de elementos por página") @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(PageResponse.of(usuarioService.findAllPaginated(q, page, size)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('USUARIOS_READ')")
    @Operation(summary = "Obtener usuario por ID", description = "Devuelve el detalle de un usuario específico")
    @ApiResponse(responseCode = "200", description = "Usuario encontrado")
    public ResponseEntity<UsuarioDTO> findById(@Parameter(description = "ID del usuario") @PathVariable Long id) {
        return ResponseEntity.ok(usuarioService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('USUARIOS_WRITE')")
    @Operation(summary = "Crear usuario", description = "Registra un nuevo usuario en el sistema")
    @ApiResponse(responseCode = "201", description = "Usuario creado")
    public ResponseEntity<UsuarioDTO> create(@Valid @RequestBody UsuarioCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(usuarioService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('USUARIOS_WRITE')")
    @Operation(summary = "Actualizar usuario", description = "Modifica los datos de un usuario existente")
    @ApiResponse(responseCode = "200", description = "Usuario actualizado")
    public ResponseEntity<UsuarioDTO> update(@Parameter(description = "ID del usuario") @PathVariable Long id,
                                             @Valid @RequestBody UsuarioUpdateRequest request) {
        return ResponseEntity.ok(usuarioService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('USUARIOS_WRITE')")
    @Operation(summary = "Eliminar usuario", description = "Elimina un usuario por su identificador")
    @ApiResponse(responseCode = "204", description = "Usuario eliminado")
    public ResponseEntity<Void> delete(@Parameter(description = "ID del usuario") @PathVariable Long id) {
        usuarioService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
