package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.AgenciaDTO;
import com.ecubox.ecubox_backend.dto.AgenciaRequest;
import com.ecubox.ecubox_backend.service.AgenciaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/agencias")
public class AgenciaController {

    private final AgenciaService agenciaService;

    public AgenciaController(AgenciaService agenciaService) {
        this.agenciaService = agenciaService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('AGENCIAS_READ')")
    public ResponseEntity<List<AgenciaDTO>> findAll() {
        return ResponseEntity.ok(agenciaService.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('AGENCIAS_READ')")
    public ResponseEntity<AgenciaDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(agenciaService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('AGENCIAS_WRITE')")
    public ResponseEntity<AgenciaDTO> create(@Valid @RequestBody AgenciaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(agenciaService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('AGENCIAS_WRITE')")
    public ResponseEntity<AgenciaDTO> update(@PathVariable Long id, @Valid @RequestBody AgenciaRequest request) {
        return ResponseEntity.ok(agenciaService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('AGENCIAS_WRITE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        agenciaService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
