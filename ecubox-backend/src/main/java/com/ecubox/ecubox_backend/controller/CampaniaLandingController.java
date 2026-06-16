package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.CampaniaLandingDTO;
import com.ecubox.ecubox_backend.dto.CampaniaLandingRequest;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.CampaniaLandingService;
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
 * Administración de campañas de contenido destacado de la landing. Vive bajo
 * Parámetros del sistema. La capacidad de publicar/desactivar exige un permiso
 * distinto (PUBLISH) al de edición (WRITE).
 */
@Tag(name = "Configuración", description = "Campañas de contenido destacado de la landing")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/parametros-sistema/campanias-landing")
public class CampaniaLandingController {

    private final CampaniaLandingService service;
    private final CurrentUserService currentUserService;

    public CampaniaLandingController(CampaniaLandingService service,
                                     CurrentUserService currentUserService) {
        this.service = service;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('CONTENIDO_DESTACADO_LANDING_READ')")
    @Operation(summary = "Listar campañas", description = "Lista todas las campañas (más recientes primero)")
    @ApiResponse(responseCode = "200", description = "Listado de campañas")
    public ResponseEntity<List<CampaniaLandingDTO>> listar() {
        return ResponseEntity.ok(service.listar());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('CONTENIDO_DESTACADO_LANDING_READ')")
    @Operation(summary = "Detalle de campaña")
    @ApiResponse(responseCode = "200", description = "Campaña encontrada")
    public ResponseEntity<CampaniaLandingDTO> obtener(@Parameter(description = "ID de la campaña") @PathVariable Long id) {
        return ResponseEntity.ok(service.obtener(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CONTENIDO_DESTACADO_LANDING_WRITE')")
    @Operation(summary = "Crear campaña (borrador)")
    @ApiResponse(responseCode = "201", description = "Campaña creada")
    public ResponseEntity<CampaniaLandingDTO> crear(@Valid @RequestBody CampaniaLandingRequest request) {
        CampaniaLandingDTO dto = service.crear(request, currentUserService.getCurrentUsuarioIdOrNull());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('CONTENIDO_DESTACADO_LANDING_WRITE')")
    @Operation(summary = "Actualizar campaña")
    @ApiResponse(responseCode = "200", description = "Campaña actualizada")
    public ResponseEntity<CampaniaLandingDTO> actualizar(
            @Parameter(description = "ID de la campaña") @PathVariable Long id,
            @Valid @RequestBody CampaniaLandingRequest request) {
        return ResponseEntity.ok(service.actualizar(id, request, currentUserService.getCurrentUsuarioIdOrNull()));
    }

    @PostMapping("/{id}/publicar")
    @PreAuthorize("hasAuthority('CONTENIDO_DESTACADO_LANDING_PUBLISH')")
    @Operation(summary = "Publicar campaña", description = "Publica la campaña y desactiva la publicada anterior")
    @ApiResponse(responseCode = "200", description = "Campaña publicada")
    public ResponseEntity<CampaniaLandingDTO> publicar(@Parameter(description = "ID de la campaña") @PathVariable Long id) {
        return ResponseEntity.ok(service.publicar(id, currentUserService.getCurrentUsuarioIdOrNull()));
    }

    @PostMapping("/{id}/desactivar")
    @PreAuthorize("hasAuthority('CONTENIDO_DESTACADO_LANDING_PUBLISH')")
    @Operation(summary = "Desactivar campaña")
    @ApiResponse(responseCode = "200", description = "Campaña desactivada")
    public ResponseEntity<CampaniaLandingDTO> desactivar(@Parameter(description = "ID de la campaña") @PathVariable Long id) {
        return ResponseEntity.ok(service.desactivar(id, currentUserService.getCurrentUsuarioIdOrNull()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('CONTENIDO_DESTACADO_LANDING_WRITE')")
    @Operation(summary = "Eliminar campaña", description = "Solo permitido en borrador o inactiva")
    @ApiResponse(responseCode = "204", description = "Campaña eliminada")
    public ResponseEntity<Void> eliminar(@Parameter(description = "ID de la campaña") @PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
