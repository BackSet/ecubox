package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.AgregarGuiasLoteRequest;
import com.ecubox.ecubox_backend.dto.LoteRecepcionCreateRequest;
import com.ecubox.ecubox_backend.dto.LoteRecepcionDTO;
import com.ecubox.ecubox_backend.service.LoteRecepcionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/operario/lotes-recepcion")
public class OperarioLoteRecepcionController {

    private final LoteRecepcionService loteRecepcionService;

    public OperarioLoteRecepcionController(LoteRecepcionService loteRecepcionService) {
        this.loteRecepcionService = loteRecepcionService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<List<LoteRecepcionDTO>> findAll() {
        return ResponseEntity.ok(loteRecepcionService.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<LoteRecepcionDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(loteRecepcionService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<LoteRecepcionDTO> create(@Valid @RequestBody LoteRecepcionCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(loteRecepcionService.create(request));
    }

    @PostMapping("/{id}/guias")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<LoteRecepcionDTO> agregarGuias(
            @PathVariable Long id,
            @Valid @RequestBody AgregarGuiasLoteRequest request) {
        return ResponseEntity.ok(loteRecepcionService.agregarGuias(id, request.getNumeroGuiasEnvio()));
    }
}
