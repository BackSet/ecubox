package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.GuiaMasterDTO;
import com.ecubox.ecubox_backend.dto.MiGuiaCreateRequest;
import com.ecubox.ecubox_backend.dto.MiGuiaUpdateRequest;
import com.ecubox.ecubox_backend.dto.MiInicioDashboardDTO;
import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.entity.GuiaMaster;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.GuiaMasterService;
import com.ecubox.ecubox_backend.service.PaqueteService;
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
@RestController
@RequestMapping("/api/mis-guias")
public class MisGuiasController {

    private final GuiaMasterService guiaMasterService;
    private final PaqueteService paqueteService;
    private final CurrentUserService currentUserService;

    public MisGuiasController(GuiaMasterService guiaMasterService,
                              PaqueteService paqueteService,
                              CurrentUserService currentUserService) {
        this.guiaMasterService = guiaMasterService;
        this.paqueteService = paqueteService;
        this.currentUserService = currentUserService;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('MIS_GUIAS_CREATE')")
    public ResponseEntity<GuiaMasterDTO> registrar(@Valid @RequestBody MiGuiaCreateRequest request) {
        Long clienteId = currentUserService.getCurrentUsuario().getId();
        GuiaMaster gm = guiaMasterService.createForCliente(
                request.getTrackingBase(),
                request.getDestinatarioFinalId(),
                clienteId);
        return ResponseEntity.status(HttpStatus.CREATED).body(guiaMasterService.toDTO(gm, List.of()));
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('MIS_GUIAS_READ')")
    public ResponseEntity<MiInicioDashboardDTO> dashboard() {
        Long clienteId = currentUserService.getCurrentUsuario().getId();
        return ResponseEntity.ok(guiaMasterService.dashboardForCliente(clienteId));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('MIS_GUIAS_READ')")
    public ResponseEntity<List<GuiaMasterDTO>> listar() {
        Long clienteId = currentUserService.getCurrentUsuario().getId();
        List<GuiaMasterDTO> guias = guiaMasterService.findAllByCliente(clienteId).stream()
                .map(gm -> guiaMasterService.toDTO(gm, List.of()))
                .toList();
        return ResponseEntity.ok(guias);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('MIS_GUIAS_READ')")
    public ResponseEntity<GuiaMasterDTO> detalle(@PathVariable Long id) {
        Long clienteId = currentUserService.getCurrentUsuario().getId();
        GuiaMaster gm = guiaMasterService.findByIdForCliente(id, clienteId);
        List<PaqueteDTO> piezasDTO = guiaMasterService.listarPiezas(gm.getId()).stream()
                .map(paqueteService::toDTO)
                .toList();
        return ResponseEntity.ok(guiaMasterService.toDTO(gm, piezasDTO));
    }

    @GetMapping("/{id}/piezas")
    @PreAuthorize("hasAuthority('MIS_GUIAS_READ')")
    public ResponseEntity<List<PaqueteDTO>> listarPiezas(@PathVariable Long id) {
        Long clienteId = currentUserService.getCurrentUsuario().getId();
        guiaMasterService.findByIdForCliente(id, clienteId);
        List<Paquete> piezas = guiaMasterService.listarPiezas(id);
        return ResponseEntity.ok(piezas.stream().map(paqueteService::toDTO).toList());
    }

    @PutMapping("/{id}/destinatario")
    @PreAuthorize("hasAuthority('MIS_GUIAS_CREATE')")
    public ResponseEntity<GuiaMasterDTO> actualizarDestinatario(
            @PathVariable Long id,
            @Valid @RequestBody MiGuiaUpdateRequest request) {
        Long clienteId = currentUserService.getCurrentUsuario().getId();
        GuiaMaster gm = guiaMasterService.updateDestinatarioForCliente(
                id, request.getDestinatarioFinalId(), clienteId);
        return ResponseEntity.ok(guiaMasterService.toDTO(gm, List.of()));
    }

    /**
     * Edición completa de la guía (tracking + destinatario). Solo permitida
     * mientras la guía esté en estado inicial {@code INCOMPLETA}.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('MIS_GUIAS_CREATE')")
    public ResponseEntity<GuiaMasterDTO> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody MiGuiaUpdateRequest request) {
        Long clienteId = currentUserService.getCurrentUsuario().getId();
        GuiaMaster gm = guiaMasterService.updateForCliente(
                id, request.getTrackingBase(), request.getDestinatarioFinalId(), clienteId);
        return ResponseEntity.ok(guiaMasterService.toDTO(gm, List.of()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('MIS_GUIAS_CREATE')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        Long clienteId = currentUserService.getCurrentUsuario().getId();
        guiaMasterService.deleteForCliente(id, clienteId);
        return ResponseEntity.noContent().build();
    }
}
