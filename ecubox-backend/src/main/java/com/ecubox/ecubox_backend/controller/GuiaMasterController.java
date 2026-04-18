package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.GuiaMasterCerrarConFaltanteRequest;
import com.ecubox.ecubox_backend.dto.GuiaMasterConfirmarDespachoParcialRequest;
import com.ecubox.ecubox_backend.dto.GuiaMasterCreateRequest;
import com.ecubox.ecubox_backend.dto.GuiaMasterDTO;
import com.ecubox.ecubox_backend.dto.GuiaMasterDashboardDTO;
import com.ecubox.ecubox_backend.dto.GuiaMasterUpdateRequest;
import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.entity.GuiaMaster;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.GuiaMasterService;
import com.ecubox.ecubox_backend.service.PaqueteService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/guias-master")
public class GuiaMasterController {

    private final GuiaMasterService guiaMasterService;
    private final PaqueteService paqueteService;
    private final CurrentUserService currentUserService;

    public GuiaMasterController(GuiaMasterService guiaMasterService,
                                PaqueteService paqueteService,
                                CurrentUserService currentUserService) {
        this.guiaMasterService = guiaMasterService;
        this.paqueteService = paqueteService;
        this.currentUserService = currentUserService;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('GUIAS_MASTER_CREATE')")
    public ResponseEntity<GuiaMasterDTO> create(@Valid @RequestBody GuiaMasterCreateRequest request) {
        GuiaMaster gm = guiaMasterService.create(
                request.getTrackingBase(),
                request.getTotalPiezasEsperadas(),
                request.getDestinatarioFinalId());
        return ResponseEntity.status(HttpStatus.CREATED).body(construirDTO(gm, false));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_UPDATE')")
    public ResponseEntity<GuiaMasterDTO> update(@PathVariable Long id,
                                                @Valid @RequestBody GuiaMasterUpdateRequest request) {
        GuiaMaster gm = guiaMasterService.update(id, request);
        return ResponseEntity.ok(construirDTO(gm, true));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        guiaMasterService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    @PreAuthorize("hasAuthority('GUIAS_MASTER_READ')")
    public ResponseEntity<List<GuiaMasterDTO>> findAll(@RequestParam(required = false) String trackingBase) {
        if (trackingBase != null && !trackingBase.isBlank()) {
            GuiaMaster gm = guiaMasterService.findByTrackingBase(trackingBase);
            return ResponseEntity.ok(List.of(construirDTO(gm, true)));
        }
        return ResponseEntity.ok(guiaMasterService.findAll().stream()
                .map(gm -> construirDTO(gm, false))
                .toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_READ')")
    public ResponseEntity<GuiaMasterDTO> findById(@PathVariable Long id) {
        GuiaMaster gm = guiaMasterService.findById(id);
        return ResponseEntity.ok(construirDTO(gm, true));
    }

    @GetMapping("/{id}/piezas")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_READ')")
    public ResponseEntity<List<PaqueteDTO>> listarPiezas(@PathVariable Long id) {
        List<Paquete> piezas = guiaMasterService.listarPiezas(id);
        return ResponseEntity.ok(piezas.stream().map(paqueteService::toDTO).toList());
    }

    @PostMapping("/{id}/cerrar-con-faltante")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_UPDATE')")
    public ResponseEntity<GuiaMasterDTO> cerrarConFaltante(@PathVariable Long id,
                                                           @RequestBody(required = false) GuiaMasterCerrarConFaltanteRequest request) {
        String motivo = request != null ? request.getMotivo() : null;
        GuiaMaster gm = guiaMasterService.cerrarConFaltante(id, motivo);
        return ResponseEntity.ok(construirDTO(gm, true));
    }

    @PostMapping("/{id}/recalcular")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_READ')")
    public ResponseEntity<GuiaMasterDTO> recalcular(@PathVariable Long id) {
        guiaMasterService.recomputarEstado(id);
        GuiaMaster gm = guiaMasterService.findById(id);
        return ResponseEntity.ok(construirDTO(gm, true));
    }

    @PostMapping("/{id}/confirmar-despacho-parcial")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_UPDATE')")
    public ResponseEntity<GuiaMasterDTO> confirmarDespachoParcial(
            @PathVariable Long id,
            @RequestBody(required = false) GuiaMasterConfirmarDespachoParcialRequest request) {
        Long actorId = currentUserService.getCurrentUsuario().getId();
        Long piezaId = request != null ? request.getPiezaId() : null;
        String motivo = request != null ? request.getMotivo() : null;
        GuiaMaster gm = guiaMasterService.confirmarDespachoParcial(id, piezaId, motivo, actorId);
        return ResponseEntity.ok(construirDTO(gm, true));
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_READ')")
    public ResponseEntity<GuiaMasterDashboardDTO> dashboard(
            @RequestParam(defaultValue = "10") int topAntiguas) {
        return ResponseEntity.ok(guiaMasterService.buildDashboard(topAntiguas));
    }

    private GuiaMasterDTO construirDTO(GuiaMaster gm, boolean incluirPiezas) {
        if (gm == null) {
            throw new ResourceNotFoundException("Guía master", "?");
        }
        List<PaqueteDTO> piezasDTO = List.of();
        if (incluirPiezas) {
            piezasDTO = guiaMasterService.listarPiezas(gm.getId()).stream()
                    .map(paqueteService::toDTO)
                    .toList();
        }
        return guiaMasterService.toDTO(gm, piezasDTO);
    }
}
