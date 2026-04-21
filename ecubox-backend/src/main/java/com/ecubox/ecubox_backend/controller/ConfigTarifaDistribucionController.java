package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.ConfigTarifaDistribucionDTO;
import com.ecubox.ecubox_backend.dto.ConfigTarifaDistribucionRequest;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.ConfigTarifaDistribucionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/config/tarifa-distribucion")
public class ConfigTarifaDistribucionController {

    private final ConfigTarifaDistribucionService service;
    private final CurrentUserService currentUserService;

    public ConfigTarifaDistribucionController(ConfigTarifaDistribucionService service,
                                              CurrentUserService currentUserService) {
        this.service = service;
        this.currentUserService = currentUserService;
    }

    /** Lectura disponible para cualquier operario autenticado (precarga del form de líneas). */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ConfigTarifaDistribucionDTO> get() {
        return ResponseEntity.ok(service.getActual());
    }

    @PutMapping
    @PreAuthorize("hasAuthority('CONFIG_TARIFA_DISTRIBUCION_WRITE')")
    public ResponseEntity<ConfigTarifaDistribucionDTO> update(
            @Valid @RequestBody ConfigTarifaDistribucionRequest request) {
        Long actor = currentUserService.getCurrentUsuarioIdOrNull();
        return ResponseEntity.ok(service.actualizar(
                request.getKgIncluidos(),
                request.getPrecioFijo(),
                request.getPrecioKgAdicional(),
                actor));
    }
}
