package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.EstadoRastreoDTO;
import com.ecubox.ecubox_backend.dto.EstadoRastreoOrdenTrackingRequest;
import com.ecubox.ecubox_backend.dto.EstadoRastreoRequest;
import com.ecubox.ecubox_backend.service.EstadoRastreoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/operario/estados-rastreo")
public class EstadoRastreoController {

    private final EstadoRastreoService estadoRastreoService;

    public EstadoRastreoController(EstadoRastreoService estadoRastreoService) {
        this.estadoRastreoService = estadoRastreoService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_READ') or hasRole('ADMIN') or hasRole('OPERARIO')")
    public ResponseEntity<List<EstadoRastreoDTO>> findAll() {
        return ResponseEntity.ok(estadoRastreoService.findAll());
    }

    @GetMapping("/activos")
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_READ') or hasRole('ADMIN') or hasRole('OPERARIO')")
    public ResponseEntity<List<EstadoRastreoDTO>> findActivos() {
        return ResponseEntity.ok(estadoRastreoService.findActivos());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_READ') or hasRole('ADMIN') or hasRole('OPERARIO')")
    public ResponseEntity<EstadoRastreoDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(estadoRastreoService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_CREATE') or hasRole('ADMIN') or hasRole('OPERARIO')")
    public ResponseEntity<EstadoRastreoDTO> create(@Valid @RequestBody EstadoRastreoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(estadoRastreoService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_UPDATE') or hasRole('ADMIN') or hasRole('OPERARIO')")
    public ResponseEntity<EstadoRastreoDTO> update(@PathVariable Long id,
                                                   @Valid @RequestBody EstadoRastreoRequest request) {
        return ResponseEntity.ok(estadoRastreoService.update(id, request));
    }

    @PatchMapping("/{id}/desactivar")
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_DELETE') or hasRole('ADMIN') or hasRole('OPERARIO')")
    public ResponseEntity<EstadoRastreoDTO> desactivar(@PathVariable Long id) {
        return ResponseEntity.ok(estadoRastreoService.desactivar(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_DELETE') or hasRole('ADMIN') or hasRole('OPERARIO')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        estadoRastreoService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/orden-tracking")
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_UPDATE') or hasRole('ADMIN') or hasRole('OPERARIO')")
    public ResponseEntity<List<EstadoRastreoDTO>> reorderTracking(
            @Valid @RequestBody EstadoRastreoOrdenTrackingRequest request) {
        return ResponseEntity.ok(estadoRastreoService.reorderTracking(request.getEstadoIds(), request.getAlternosAfter()));
    }
}
