package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.AgenciaCourierEntregaCreateOperarioRequest;
import com.ecubox.ecubox_backend.dto.AgenciaCourierEntregaDTO;
import com.ecubox.ecubox_backend.dto.AgenciaCourierEntregaRequest;
import com.ecubox.ecubox_backend.service.AgenciaCourierEntregaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/operario/couriers-entrega")
public class OperarioAgenciaCourierEntregaController {

    private final AgenciaCourierEntregaService agenciaCourierEntregaService;

    public OperarioAgenciaCourierEntregaController(AgenciaCourierEntregaService agenciaCourierEntregaService) {
        this.agenciaCourierEntregaService = agenciaCourierEntregaService;
    }

    @GetMapping("/{courierEntregaId}/puntos-entrega")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<List<AgenciaCourierEntregaDTO>> findByCourierEntregaId(@PathVariable Long courierEntregaId) {
        return ResponseEntity.ok(agenciaCourierEntregaService.findByCourierEntregaId(courierEntregaId));
    }

    @PostMapping("/{courierEntregaId}/puntos-entrega")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<AgenciaCourierEntregaDTO> create(
            @PathVariable Long courierEntregaId,
            @Valid @RequestBody AgenciaCourierEntregaCreateOperarioRequest body) {
        AgenciaCourierEntregaRequest request = AgenciaCourierEntregaRequest.builder()
                .courierEntregaId(courierEntregaId)
                .codigo(null)
                .provincia(body.getProvincia())
                .canton(body.getCanton())
                .direccion(body.getDireccion())
                .horarioAtencion(body.getHorarioAtencion())
                .diasMaxRetiro(body.getDiasMaxRetiro())
                .tarifa(body.getTarifa())
                .build();
        AgenciaCourierEntregaDTO created = agenciaCourierEntregaService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
