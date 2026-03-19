package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.AgenciaDistribuidorCreateOperarioRequest;
import com.ecubox.ecubox_backend.dto.AgenciaDistribuidorDTO;
import com.ecubox.ecubox_backend.dto.AgenciaDistribuidorRequest;
import com.ecubox.ecubox_backend.service.AgenciaDistribuidorService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/operario/distribuidores")
public class OperarioAgenciaDistribuidorController {

    private final AgenciaDistribuidorService agenciaDistribuidorService;

    public OperarioAgenciaDistribuidorController(AgenciaDistribuidorService agenciaDistribuidorService) {
        this.agenciaDistribuidorService = agenciaDistribuidorService;
    }

    @GetMapping("/{distribuidorId}/agencias-distribuidor")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<List<AgenciaDistribuidorDTO>> findByDistribuidorId(@PathVariable Long distribuidorId) {
        return ResponseEntity.ok(agenciaDistribuidorService.findByDistribuidorId(distribuidorId));
    }

    @PostMapping("/{distribuidorId}/agencias-distribuidor")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<AgenciaDistribuidorDTO> create(
            @PathVariable Long distribuidorId,
            @Valid @RequestBody AgenciaDistribuidorCreateOperarioRequest body) {
        AgenciaDistribuidorRequest request = AgenciaDistribuidorRequest.builder()
                .distribuidorId(distribuidorId)
                .codigo(null)
                .provincia(body.getProvincia())
                .canton(body.getCanton())
                .direccion(body.getDireccion())
                .horarioAtencion(body.getHorarioAtencion())
                .diasMaxRetiro(body.getDiasMaxRetiro())
                .tarifa(body.getTarifa())
                .build();
        AgenciaDistribuidorDTO created = agenciaDistribuidorService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
