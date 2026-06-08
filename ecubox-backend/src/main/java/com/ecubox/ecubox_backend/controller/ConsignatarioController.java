package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.ConsignatarioDTO;
import com.ecubox.ecubox_backend.dto.ConsignatarioRequest;
import com.ecubox.ecubox_backend.security.AccesoSessionResolver;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.ConsignatarioService;
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

@Tag(name = "Cliente", description = "Gestión de consignatarios del cliente")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/mis-consignatarios")
public class ConsignatarioController {

    private final ConsignatarioService consignatarioService;
    private final CurrentUserService currentUserService;
    private final AccesoSessionResolver accesoSessionResolver;

    public ConsignatarioController(ConsignatarioService consignatarioService,
                                        CurrentUserService currentUserService,
                                        AccesoSessionResolver accesoSessionResolver) {
        this.consignatarioService = consignatarioService;
        this.currentUserService = currentUserService;
        this.accesoSessionResolver = accesoSessionResolver;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('CONSIGNATARIOS_READ', 'ACCESO_ENLACE_CONSIGNATARIOS_READ')")
    @Operation(summary = "Listar mis consignatarios", description = "Obtiene los consignatarios asociados al usuario autenticado")
    @ApiResponse(responseCode = "200", description = "Listado de consignatarios")
    public ResponseEntity<List<ConsignatarioDTO>> findAll() {
        if (accesoSessionResolver.isEnlaceSession()) {
            return ResponseEntity.ok(
                    consignatarioService.findByIds(accesoSessionResolver.consignatarioScope()));
        }
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        return ResponseEntity.ok(consignatarioService.findAllByUsuarioId(usuarioId));
    }

    @GetMapping("/sugerir-codigo")
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_READ')")
    @Operation(summary = "Sugerir código de consignatario", description = "Genera una sugerencia de código basado en nombre y cantón")
    @ApiResponse(responseCode = "200", description = "Código sugerido")
    public ResponseEntity<Map<String, String>> sugerirCodigo(
            @Parameter(description = "Nombre del consignatario") @RequestParam(required = false) String nombre,
            @Parameter(description = "Cantón del consignatario") @RequestParam(required = false) String canton,
            @Parameter(description = "ID a excluir para evitar conflicto en edición") @RequestParam(required = false) Long excludeId) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        String codigo = consignatarioService.sugerirCodigo(usuarioId, nombre, canton, excludeId);
        return ResponseEntity.ok(Map.of("codigo", codigo));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('CONSIGNATARIOS_READ', 'ACCESO_ENLACE_CONSIGNATARIOS_READ')")
    @Operation(summary = "Obtener consignatario por ID", description = "Consulta el detalle de un consignatario del cliente")
    @ApiResponse(responseCode = "200", description = "Consignatario encontrado")
    public ResponseEntity<ConsignatarioDTO> findById(@Parameter(description = "ID del consignatario") @PathVariable Long id) {
        if (accesoSessionResolver.isEnlaceSession()) {
            return ResponseEntity.ok(
                    consignatarioService.findByIdInScope(id, accesoSessionResolver.consignatarioScope()));
        }
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        return ResponseEntity.ok(consignatarioService.findByIdAndUsuarioId(id, usuarioId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_CREATE')")
    @Operation(summary = "Crear consignatario", description = "Registra un nuevo consignatario para el cliente actual")
    @ApiResponse(responseCode = "201", description = "Consignatario creado")
    public ResponseEntity<ConsignatarioDTO> create(@Valid @RequestBody ConsignatarioRequest request) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        return ResponseEntity.status(HttpStatus.CREATED).body(consignatarioService.create(usuarioId, request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_UPDATE')")
    @Operation(summary = "Actualizar consignatario", description = "Actualiza la información de un consignatario del cliente")
    @ApiResponse(responseCode = "200", description = "Consignatario actualizado")
    public ResponseEntity<ConsignatarioDTO> update(@Parameter(description = "ID del consignatario") @PathVariable Long id,
                                                       @Valid @RequestBody ConsignatarioRequest request) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        boolean canEditCodigo = currentUserService.hasAuthority("CONSIGNATARIOS_OPERARIO");
        return ResponseEntity.ok(consignatarioService.update(usuarioId, id, canEditCodigo, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_DELETE')")
    @Operation(summary = "Eliminar consignatario", description = "Elimina un consignatario perteneciente al cliente")
    @ApiResponse(responseCode = "204", description = "Consignatario eliminado")
    public ResponseEntity<Void> delete(@Parameter(description = "ID del consignatario") @PathVariable Long id) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        consignatarioService.delete(usuarioId, id);
        return ResponseEntity.noContent().build();
    }
}
