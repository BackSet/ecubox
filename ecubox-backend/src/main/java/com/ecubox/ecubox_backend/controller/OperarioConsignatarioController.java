package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.ConsignatarioDTO;
import com.ecubox.ecubox_backend.dto.ConsignatarioRequest;
import com.ecubox.ecubox_backend.service.ConsignatarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/operario/consignatarios")
public class OperarioConsignatarioController {

    private final ConsignatarioService consignatarioService;

    public OperarioConsignatarioController(ConsignatarioService consignatarioService) {
        this.consignatarioService = consignatarioService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_OPERARIO')")
    public ResponseEntity<List<ConsignatarioDTO>> findAll(
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(consignatarioService.findAllForOperario(search));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_OPERARIO')")
    public ResponseEntity<ConsignatarioDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(consignatarioService.findById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_OPERARIO')")
    public ResponseEntity<ConsignatarioDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody ConsignatarioRequest request) {
        return ResponseEntity.ok(consignatarioService.updateByOperario(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_OPERARIO')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        consignatarioService.deleteByOperario(id);
        return ResponseEntity.noContent().build();
    }
}
