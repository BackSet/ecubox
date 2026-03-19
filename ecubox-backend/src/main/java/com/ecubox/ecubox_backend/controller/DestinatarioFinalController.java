package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.DestinatarioFinalDTO;
import com.ecubox.ecubox_backend.dto.DestinatarioFinalRequest;
import com.ecubox.ecubox_backend.service.DestinatarioFinalService;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mis-destinatarios")
public class DestinatarioFinalController {

    private final DestinatarioFinalService destinatarioFinalService;
    private final CurrentUserService currentUserService;

    public DestinatarioFinalController(DestinatarioFinalService destinatarioFinalService,
                                        CurrentUserService currentUserService) {
        this.destinatarioFinalService = destinatarioFinalService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('DESTINATARIOS_READ')")
    public ResponseEntity<List<DestinatarioFinalDTO>> findAll() {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        return ResponseEntity.ok(destinatarioFinalService.findAllByUsuarioId(usuarioId));
    }

    @GetMapping("/sugerir-codigo")
    @PreAuthorize("hasAuthority('DESTINATARIOS_READ')")
    public ResponseEntity<Map<String, String>> sugerirCodigo(
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String canton,
            @RequestParam(required = false) Long excludeId) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        String codigo = destinatarioFinalService.sugerirCodigo(usuarioId, nombre, canton, excludeId);
        return ResponseEntity.ok(Map.of("codigo", codigo));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('DESTINATARIOS_READ')")
    public ResponseEntity<DestinatarioFinalDTO> findById(@PathVariable Long id) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        return ResponseEntity.ok(destinatarioFinalService.findByIdAndUsuarioId(id, usuarioId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('DESTINATARIOS_CREATE')")
    public ResponseEntity<DestinatarioFinalDTO> create(@Valid @RequestBody DestinatarioFinalRequest request) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        return ResponseEntity.status(HttpStatus.CREATED).body(destinatarioFinalService.create(usuarioId, request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('DESTINATARIOS_UPDATE')")
    public ResponseEntity<DestinatarioFinalDTO> update(@PathVariable Long id,
                                                       @Valid @RequestBody DestinatarioFinalRequest request) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        boolean canEditCodigo = currentUserService.hasAuthority("DESTINATARIOS_OPERARIO");
        return ResponseEntity.ok(destinatarioFinalService.update(usuarioId, id, canEditCodigo, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('DESTINATARIOS_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        destinatarioFinalService.delete(usuarioId, id);
        return ResponseEntity.noContent().build();
    }
}
