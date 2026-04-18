package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.DestinatarioFinalDTO;
import com.ecubox.ecubox_backend.dto.DestinatarioFinalRequest;
import com.ecubox.ecubox_backend.service.DestinatarioFinalService;
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
@RequestMapping("/api/operario/destinatarios")
public class OperarioDestinatarioController {

    private final DestinatarioFinalService destinatarioFinalService;

    public OperarioDestinatarioController(DestinatarioFinalService destinatarioFinalService) {
        this.destinatarioFinalService = destinatarioFinalService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('DESTINATARIOS_OPERARIO')")
    public ResponseEntity<List<DestinatarioFinalDTO>> findAll(
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(destinatarioFinalService.findAllForOperario(search));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('DESTINATARIOS_OPERARIO')")
    public ResponseEntity<DestinatarioFinalDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(destinatarioFinalService.findById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('DESTINATARIOS_OPERARIO')")
    public ResponseEntity<DestinatarioFinalDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody DestinatarioFinalRequest request) {
        return ResponseEntity.ok(destinatarioFinalService.updateByOperario(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('DESTINATARIOS_OPERARIO')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        destinatarioFinalService.deleteByOperario(id);
        return ResponseEntity.noContent().build();
    }
}
