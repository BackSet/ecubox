package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.GuiaMasterDTO;
import com.ecubox.ecubox_backend.dto.MiGuiaCreateRequest;
import com.ecubox.ecubox_backend.dto.MiGuiaUpdateRequest;
import com.ecubox.ecubox_backend.dto.MiInicioDashboardDTO;
import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.entity.GuiaMaster;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.security.AccesoSessionResolver;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.GuiaMasterService;
import com.ecubox.ecubox_backend.service.PaqueteService;
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
 * Endpoints para que el cliente final registre y consulte sus propias guías
 * (subset de la entidad {@code GuiaMaster}). El cliente solo ve las suyas.
 */
@Tag(name = "Cliente", description = "Gestión de guías propias del cliente")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/mis-guias")
public class MisGuiasController {

    private final GuiaMasterService guiaMasterService;
    private final PaqueteService paqueteService;
    private final CurrentUserService currentUserService;
    private final AccesoSessionResolver accesoSessionResolver;

    public MisGuiasController(GuiaMasterService guiaMasterService,
                              PaqueteService paqueteService,
                              CurrentUserService currentUserService,
                              AccesoSessionResolver accesoSessionResolver) {
        this.guiaMasterService = guiaMasterService;
        this.paqueteService = paqueteService;
        this.currentUserService = currentUserService;
        this.accesoSessionResolver = accesoSessionResolver;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('MIS_GUIAS_CREATE')")
    @Operation(summary = "Registrar guía", description = "Registra una nueva guía para el cliente autenticado")
    @ApiResponse(responseCode = "201", description = "Guía registrada")
    public ResponseEntity<GuiaMasterDTO> registrar(@Valid @RequestBody MiGuiaCreateRequest request) {
        Long clienteId = currentUserService.getCurrentUsuario().getId();
        GuiaMaster gm = guiaMasterService.createForCliente(
                request.getTrackingBase(),
                request.getConsignatarioId(),
                clienteId);
        return ResponseEntity.status(HttpStatus.CREATED).body(guiaMasterService.toDTO(gm, List.of()));
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyAuthority('MIS_GUIAS_READ', 'ACCESO_ENLACE_GUIAS_READ')")
    @Operation(summary = "Dashboard de mis guías", description = "Obtiene métricas y resumen de las guías del cliente")
    @ApiResponse(responseCode = "200", description = "Resumen de guías")
    public ResponseEntity<MiInicioDashboardDTO> dashboard() {
        if (accesoSessionResolver.isEnlaceSession()) {
            return ResponseEntity.ok(guiaMasterService.dashboardForConsignatarios(
                    accesoSessionResolver.consignatarioScope()));
        }
        Long clienteId = currentUserService.getCurrentUsuario().getId();
        return ResponseEntity.ok(guiaMasterService.dashboardForCliente(clienteId));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('MIS_GUIAS_READ', 'ACCESO_ENLACE_GUIAS_READ')")
    @Operation(summary = "Listar mis guías", description = "Devuelve la lista de guías asociadas al cliente autenticado")
    @ApiResponse(responseCode = "200", description = "Listado de guías")
    public ResponseEntity<List<GuiaMasterDTO>> listar() {
        List<GuiaMaster> fuente = accesoSessionResolver.isEnlaceSession()
                ? guiaMasterService.findAllByConsignatarioIds(accesoSessionResolver.consignatarioScope())
                : guiaMasterService.findAllByCliente(currentUserService.getCurrentUsuario().getId());
        List<GuiaMasterDTO> guias = fuente.stream()
                .map(gm -> guiaMasterService.toDTO(gm, List.of()))
                .toList();
        return ResponseEntity.ok(guias);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('MIS_GUIAS_READ', 'ACCESO_ENLACE_GUIAS_READ')")
    @Operation(summary = "Detalle de mi guía", description = "Obtiene el detalle de una guía del cliente")
    @ApiResponse(responseCode = "200", description = "Detalle de guía")
    public ResponseEntity<GuiaMasterDTO> detalle(@Parameter(description = "ID de la guía") @PathVariable Long id) {
        GuiaMaster gm = accesoSessionResolver.isEnlaceSession()
                ? guiaMasterService.findByIdForConsignatarios(id, accesoSessionResolver.consignatarioScope())
                : guiaMasterService.findByIdForCliente(id, currentUserService.getCurrentUsuario().getId());
        List<PaqueteDTO> piezasDTO = guiaMasterService.listarPiezas(gm.getId()).stream()
                .map(paqueteService::toDTO)
                .toList();
        return ResponseEntity.ok(guiaMasterService.toDTO(gm, piezasDTO));
    }

    @GetMapping("/{id}/piezas")
    @PreAuthorize("hasAnyAuthority('MIS_GUIAS_READ', 'ACCESO_ENLACE_GUIAS_READ')")
    @Operation(summary = "Listar piezas de guía", description = "Lista los paquetes asociados a una guía del cliente")
    @ApiResponse(responseCode = "200", description = "Listado de piezas")
    public ResponseEntity<List<PaqueteDTO>> listarPiezas(@Parameter(description = "ID de la guía") @PathVariable Long id) {
        if (accesoSessionResolver.isEnlaceSession()) {
            guiaMasterService.findByIdForConsignatarios(id, accesoSessionResolver.consignatarioScope());
        } else {
            guiaMasterService.findByIdForCliente(id, currentUserService.getCurrentUsuario().getId());
        }
        List<Paquete> piezas = guiaMasterService.listarPiezas(id);
        return ResponseEntity.ok(piezas.stream().map(paqueteService::toDTO).toList());
    }

    @PutMapping("/{id}/destinatario")
    @PreAuthorize("hasAuthority('MIS_GUIAS_CREATE')")
    @Operation(summary = "Actualizar destinatario de guía", description = "Cambia el consignatario destino de una guía del cliente")
    @ApiResponse(responseCode = "200", description = "Guía actualizada")
    public ResponseEntity<GuiaMasterDTO> actualizarDestinatario(
            @Parameter(description = "ID de la guía") @PathVariable Long id,
            @Valid @RequestBody MiGuiaUpdateRequest request) {
        Long clienteId = currentUserService.getCurrentUsuario().getId();
        GuiaMaster gm = guiaMasterService.updateDestinatarioForCliente(
                id, request.getConsignatarioId(), clienteId);
        return ResponseEntity.ok(guiaMasterService.toDTO(gm, List.of()));
    }

    /**
     * Edición completa de la guía (tracking + destinatario). Solo permitida
     * mientras la guía esté en estado inicial de registro.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('MIS_GUIAS_CREATE')")
    @Operation(summary = "Actualizar guía completa", description = "Actualiza tracking y destinatario de una guía en estado incompleta")
    @ApiResponse(responseCode = "200", description = "Guía actualizada")
    public ResponseEntity<GuiaMasterDTO> actualizar(
            @Parameter(description = "ID de la guía") @PathVariable Long id,
            @Valid @RequestBody MiGuiaUpdateRequest request) {
        Long clienteId = currentUserService.getCurrentUsuario().getId();
        GuiaMaster gm = guiaMasterService.updateForCliente(
                id, request.getTrackingBase(), request.getConsignatarioId(), clienteId);
        return ResponseEntity.ok(guiaMasterService.toDTO(gm, List.of()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('MIS_GUIAS_CREATE')")
    @Operation(summary = "Eliminar guía", description = "Elimina una guía del cliente por su identificador")
    @ApiResponse(responseCode = "204", description = "Guía eliminada")
    public ResponseEntity<Void> eliminar(@Parameter(description = "ID de la guía") @PathVariable Long id) {
        Long clienteId = currentUserService.getCurrentUsuario().getId();
        guiaMasterService.deleteForCliente(id, clienteId);
        return ResponseEntity.noContent().build();
    }
}
