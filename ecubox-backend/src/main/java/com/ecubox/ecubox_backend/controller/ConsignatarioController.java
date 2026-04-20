package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.ConsignatarioDTO;
import com.ecubox.ecubox_backend.dto.ConsignatarioRequest;
import com.ecubox.ecubox_backend.service.ConsignatarioService;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mis-consignatarios")
public class ConsignatarioController {

    private final ConsignatarioService consignatarioService;
    private final CurrentUserService currentUserService;

    public ConsignatarioController(ConsignatarioService consignatarioService,
                                        CurrentUserService currentUserService) {
        this.consignatarioService = consignatarioService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_READ')")
    public ResponseEntity<List<ConsignatarioDTO>> findAll() {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        return ResponseEntity.ok(consignatarioService.findAllByUsuarioId(usuarioId));
    }

    @GetMapping("/sugerir-codigo")
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_READ')")
    public ResponseEntity<Map<String, String>> sugerirCodigo(
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String canton,
            @RequestParam(required = false) Long excludeId) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        String codigo = consignatarioService.sugerirCodigo(usuarioId, nombre, canton, excludeId);
        return ResponseEntity.ok(Map.of("codigo", codigo));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_READ')")
    public ResponseEntity<ConsignatarioDTO> findById(@PathVariable Long id) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        return ResponseEntity.ok(consignatarioService.findByIdAndUsuarioId(id, usuarioId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_CREATE')")
    public ResponseEntity<ConsignatarioDTO> create(@Valid @RequestBody ConsignatarioRequest request) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        return ResponseEntity.status(HttpStatus.CREATED).body(consignatarioService.create(usuarioId, request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_UPDATE')")
    public ResponseEntity<ConsignatarioDTO> update(@PathVariable Long id,
                                                       @Valid @RequestBody ConsignatarioRequest request) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        boolean canEditCodigo = currentUserService.hasAuthority("CONSIGNATARIOS_OPERARIO");
        return ResponseEntity.ok(consignatarioService.update(usuarioId, id, canEditCodigo, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        consignatarioService.delete(usuarioId, id);
        return ResponseEntity.noContent().build();
    }
}
