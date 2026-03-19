package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.dto.SacaActualizarTamanioRequest;
import com.ecubox.ecubox_backend.dto.SacaAsignarPaquetesRequest;
import com.ecubox.ecubox_backend.dto.SacaCreateRequest;
import com.ecubox.ecubox_backend.dto.SacaDTO;
import com.ecubox.ecubox_backend.service.PaqueteService;
import com.ecubox.ecubox_backend.service.SacaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/operario/sacas")
public class OperarioSacaController {

    private final SacaService sacaService;
    private final PaqueteService paqueteService;

    public OperarioSacaController(SacaService sacaService, PaqueteService paqueteService) {
        this.sacaService = sacaService;
        this.paqueteService = paqueteService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<List<SacaDTO>> listar(
            @RequestParam(defaultValue = "true") boolean sinDespacho) {
        return ResponseEntity.ok(sacaService.findBySinDespacho(sinDespacho));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<SacaDTO> create(@Valid @RequestBody SacaCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sacaService.create(request));
    }

    @PostMapping("/{sacaId}/paquetes")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<List<PaqueteDTO>> asignarPaquetes(
            @PathVariable Long sacaId,
            @Valid @RequestBody SacaAsignarPaquetesRequest request) {
        return ResponseEntity.ok(paqueteService.asignarPaquetesASaca(sacaId, request.getPaqueteIds()));
    }

    @PatchMapping("/{id}/tamanio")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<SacaDTO> actualizarTamanio(
            @PathVariable Long id,
            @Valid @RequestBody SacaActualizarTamanioRequest request) {
        return ResponseEntity.ok(sacaService.actualizarTamanio(id, request.getTamanio()));
    }
}
