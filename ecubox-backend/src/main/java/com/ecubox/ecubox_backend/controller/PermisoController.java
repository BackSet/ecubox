package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.PermisoDTO;
import com.ecubox.ecubox_backend.service.PermisoService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/permisos")
public class PermisoController {

    private final PermisoService permisoService;

    public PermisoController(PermisoService permisoService) {
        this.permisoService = permisoService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PERMISOS_READ')")
    public ResponseEntity<List<PermisoDTO>> findAll() {
        return ResponseEntity.ok(permisoService.findAll());
    }
}
