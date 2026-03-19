package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.AgenciaDTO;
import com.ecubox.ecubox_backend.service.AgenciaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/operario/agencias")
public class OperarioAgenciaController {

    private final AgenciaService agenciaService;

    public OperarioAgenciaController(AgenciaService agenciaService) {
        this.agenciaService = agenciaService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<List<AgenciaDTO>> findAll() {
        return ResponseEntity.ok(agenciaService.findAll());
    }
}
