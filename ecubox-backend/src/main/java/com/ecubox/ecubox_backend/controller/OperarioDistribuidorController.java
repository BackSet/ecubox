package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.DistribuidorDTO;
import com.ecubox.ecubox_backend.service.DistribuidorService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/operario/distribuidores")
public class OperarioDistribuidorController {

    private final DistribuidorService distribuidorService;

    public OperarioDistribuidorController(DistribuidorService distribuidorService) {
        this.distribuidorService = distribuidorService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<List<DistribuidorDTO>> findAll() {
        return ResponseEntity.ok(distribuidorService.findAll());
    }
}
