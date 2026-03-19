package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.AgenciaDistribuidorDTO;
import com.ecubox.ecubox_backend.dto.AgenciaDistribuidorRequest;
import com.ecubox.ecubox_backend.service.AgenciaDistribuidorService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/agencias-distribuidor")
public class AgenciaDistribuidorController {

    private final AgenciaDistribuidorService agenciaDistribuidorService;

    public AgenciaDistribuidorController(AgenciaDistribuidorService agenciaDistribuidorService) {
        this.agenciaDistribuidorService = agenciaDistribuidorService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('AGENCIAS_DISTRIBUIDOR_READ')")
    public ResponseEntity<List<AgenciaDistribuidorDTO>> findAll() {
        return ResponseEntity.ok(agenciaDistribuidorService.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('AGENCIAS_DISTRIBUIDOR_READ')")
    public ResponseEntity<AgenciaDistribuidorDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(agenciaDistribuidorService.findById(id));
    }

    @GetMapping("/por-distribuidor/{distribuidorId}")
    @PreAuthorize("hasAuthority('AGENCIAS_DISTRIBUIDOR_READ')")
    public ResponseEntity<List<AgenciaDistribuidorDTO>> findByDistribuidorId(@PathVariable Long distribuidorId) {
        return ResponseEntity.ok(agenciaDistribuidorService.findByDistribuidorId(distribuidorId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('AGENCIAS_DISTRIBUIDOR_WRITE')")
    public ResponseEntity<AgenciaDistribuidorDTO> create(@Valid @RequestBody AgenciaDistribuidorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(agenciaDistribuidorService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('AGENCIAS_DISTRIBUIDOR_WRITE')")
    public ResponseEntity<AgenciaDistribuidorDTO> update(@PathVariable Long id, @Valid @RequestBody AgenciaDistribuidorRequest request) {
        return ResponseEntity.ok(agenciaDistribuidorService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('AGENCIAS_DISTRIBUIDOR_WRITE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        agenciaDistribuidorService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
