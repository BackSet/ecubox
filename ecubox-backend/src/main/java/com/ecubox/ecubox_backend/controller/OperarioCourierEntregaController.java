package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.CourierEntregaDTO;
import com.ecubox.ecubox_backend.service.CourierEntregaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/operario/couriers-entrega")
public class OperarioCourierEntregaController {

    private final CourierEntregaService courierEntregaService;

    public OperarioCourierEntregaController(CourierEntregaService courierEntregaService) {
        this.courierEntregaService = courierEntregaService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<List<CourierEntregaDTO>> findAll() {
        return ResponseEntity.ok(courierEntregaService.findAll());
    }
}
