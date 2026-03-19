package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.*;
import com.ecubox.ecubox_backend.service.ManifiestoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/manifiestos")
public class ManifiestoController {

    private final ManifiestoService manifiestoService;

    public ManifiestoController(ManifiestoService manifiestoService) {
        this.manifiestoService = manifiestoService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('MANIFIESTOS_READ')")
    public ResponseEntity<List<ManifiestoDTO>> findAll() {
        return ResponseEntity.ok(manifiestoService.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('MANIFIESTOS_READ')")
    public ResponseEntity<ManifiestoDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(manifiestoService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('MANIFIESTOS_WRITE')")
    public ResponseEntity<ManifiestoDTO> create(@Valid @RequestBody ManifiestoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(manifiestoService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('MANIFIESTOS_WRITE')")
    public ResponseEntity<ManifiestoDTO> update(@PathVariable Long id, @Valid @RequestBody ManifiestoRequest request) {
        return ResponseEntity.ok(manifiestoService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('MANIFIESTOS_WRITE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        manifiestoService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/asignar-despachos")
    @PreAuthorize("hasAuthority('MANIFIESTOS_WRITE')")
    public ResponseEntity<ManifiestoDTO> asignarDespachos(@PathVariable Long id, @Valid @RequestBody AsignarDespachosRequest request) {
        return ResponseEntity.ok(manifiestoService.asignarDespachos(id, request.getDespachoIds()));
    }

    @GetMapping("/{id}/despachos-candidatos")
    @PreAuthorize("hasAuthority('MANIFIESTOS_READ')")
    public ResponseEntity<List<ManifiestoDespachoCandidatoDTO>> despachosCandidatos(@PathVariable Long id) {
        return ResponseEntity.ok(manifiestoService.findDespachosCandidatos(id));
    }

    @PostMapping("/{id}/recalcular")
    @PreAuthorize("hasAuthority('MANIFIESTOS_WRITE')")
    public ResponseEntity<ManifiestoDTO> recalcularTotales(@PathVariable Long id) {
        return ResponseEntity.ok(manifiestoService.recalcularTotales(id));
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasAuthority('MANIFIESTOS_WRITE')")
    public ResponseEntity<ManifiestoDTO> cambiarEstado(@PathVariable Long id, @Valid @RequestBody CambiarEstadoManifiestoRequest request) {
        return ResponseEntity.ok(manifiestoService.cambiarEstado(id, request.getEstado()));
    }
}
