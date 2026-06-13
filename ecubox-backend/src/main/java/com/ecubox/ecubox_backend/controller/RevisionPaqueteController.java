package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.*;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.RevisionPaqueteService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mis-paquetes/{paqueteId}/revisiones")
public class RevisionPaqueteController {

    private final RevisionPaqueteService revisionPaqueteService;
    private final CurrentUserService currentUserService;

    public RevisionPaqueteController(RevisionPaqueteService revisionPaqueteService,
                                     CurrentUserService currentUserService) {
        this.revisionPaqueteService = revisionPaqueteService;
        this.currentUserService = currentUserService;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PAQUETES_REVISION_CREATE')")
    public ResponseEntity<RevisionPaqueteDTO> iniciar(
            @PathVariable Long paqueteId,
            @Valid @RequestBody IniciarRevisionPaqueteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                revisionPaqueteService.iniciar(
                        paqueteId, request, currentUserService.getCurrentUsuario()));
    }

    @PostMapping("/activa/resolver")
    @PreAuthorize("hasAuthority('PAQUETES_REVISION_RESOLVE')")
    public ResponseEntity<RevisionPaqueteDTO> resolver(
            @PathVariable Long paqueteId,
            @RequestBody(required = false) ResolverRevisionPaqueteRequest request) {
        return ResponseEntity.ok(revisionPaqueteService.resolver(
                paqueteId,
                request != null ? request : new ResolverRevisionPaqueteRequest(),
                currentUserService.getCurrentUsuario()));
    }

    @GetMapping("/activa")
    @PreAuthorize("hasAuthority('PAQUETES_REVISION_READ')")
    public ResponseEntity<RevisionPaqueteDTO> activa(@PathVariable Long paqueteId) {
        RevisionPaqueteDTO revision = revisionPaqueteService.activa(paqueteId);
        return revision != null ? ResponseEntity.ok(revision) : ResponseEntity.noContent().build();
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PAQUETES_REVISION_READ')")
    public ResponseEntity<List<RevisionPaqueteDTO>> historial(@PathVariable Long paqueteId) {
        return ResponseEntity.ok(revisionPaqueteService.historial(paqueteId));
    }
}
