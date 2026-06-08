package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.AccesoEnlaceDTO;
import com.ecubox.ecubox_backend.dto.GenerarAccesoEnlaceRequest;
import com.ecubox.ecubox_backend.dto.GenerarAccesoEnlaceResponse;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.AccesoEnlaceService;
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
 * Módulo de enlaces de acceso. Permite a administradores y operarios generar,
 * listar y revocar enlaces de solo lectura acotados a consignatarios concretos.
 */
@Tag(name = "Enlaces de acceso", description = "Gestión de enlaces de acceso por consignatario")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/acceso-enlaces")
public class AccesoEnlaceController {

    private final AccesoEnlaceService accesoEnlaceService;
    private final CurrentUserService currentUserService;

    public AccesoEnlaceController(AccesoEnlaceService accesoEnlaceService,
                                  CurrentUserService currentUserService) {
        this.accesoEnlaceService = accesoEnlaceService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ACCESO_ENLACES_MANAGE')")
    @Operation(summary = "Listar enlaces de acceso", description = "Devuelve los enlaces activos (no revocados)")
    @ApiResponse(responseCode = "200", description = "Listado de enlaces")
    public ResponseEntity<List<AccesoEnlaceDTO>> listar() {
        return ResponseEntity.ok(accesoEnlaceService.listar());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ACCESO_ENLACES_MANAGE')")
    @Operation(summary = "Generar enlace de acceso",
            description = "Crea un enlace persistente o temporal acotado a los consignatarios indicados")
    @ApiResponse(responseCode = "201", description = "Enlace generado (token devuelto una sola vez)")
    public ResponseEntity<GenerarAccesoEnlaceResponse> generar(
            @Valid @RequestBody GenerarAccesoEnlaceRequest request) {
        Long creadoPor = currentUserService.getCurrentUsuario().getId();
        GenerarAccesoEnlaceResponse response = accesoEnlaceService.generar(request, creadoPor);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ACCESO_ENLACES_MANAGE')")
    @Operation(summary = "Revocar enlace de acceso", description = "Invalida un enlace de acceso de inmediato")
    @ApiResponse(responseCode = "204", description = "Enlace revocado")
    public ResponseEntity<Void> revocar(
            @Parameter(description = "ID del enlace de acceso") @PathVariable Long id) {
        accesoEnlaceService.revocar(id);
        return ResponseEntity.noContent().build();
    }
}
