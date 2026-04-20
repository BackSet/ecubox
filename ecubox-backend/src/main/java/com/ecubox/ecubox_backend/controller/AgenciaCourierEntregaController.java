package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.AgenciaCourierEntregaDTO;
import com.ecubox.ecubox_backend.dto.AgenciaCourierEntregaRequest;
import com.ecubox.ecubox_backend.dto.PageResponse;
import com.ecubox.ecubox_backend.service.AgenciaCourierEntregaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/puntos-entrega")
public class AgenciaCourierEntregaController {

    private final AgenciaCourierEntregaService agenciaCourierEntregaService;

    public AgenciaCourierEntregaController(AgenciaCourierEntregaService agenciaCourierEntregaService) {
        this.agenciaCourierEntregaService = agenciaCourierEntregaService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PUNTOS_ENTREGA_READ')")
    public ResponseEntity<List<AgenciaCourierEntregaDTO>> findAll() {
        return ResponseEntity.ok(agenciaCourierEntregaService.findAll());
    }

    @GetMapping("/page")
    @PreAuthorize("hasAuthority('PUNTOS_ENTREGA_READ')")
    public ResponseEntity<PageResponse<AgenciaCourierEntregaDTO>> findAllPaginated(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(PageResponse.of(agenciaCourierEntregaService.findAllPaginated(q, page, size)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PUNTOS_ENTREGA_READ')")
    public ResponseEntity<AgenciaCourierEntregaDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(agenciaCourierEntregaService.findById(id));
    }

    @GetMapping("/por-courier-entrega/{courierEntregaId}")
    @PreAuthorize("hasAuthority('PUNTOS_ENTREGA_READ')")
    public ResponseEntity<List<AgenciaCourierEntregaDTO>> findByCourierEntregaId(@PathVariable Long courierEntregaId) {
        return ResponseEntity.ok(agenciaCourierEntregaService.findByCourierEntregaId(courierEntregaId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PUNTOS_ENTREGA_WRITE')")
    public ResponseEntity<AgenciaCourierEntregaDTO> create(@Valid @RequestBody AgenciaCourierEntregaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(agenciaCourierEntregaService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PUNTOS_ENTREGA_WRITE')")
    public ResponseEntity<AgenciaCourierEntregaDTO> update(@PathVariable Long id, @Valid @RequestBody AgenciaCourierEntregaRequest request) {
        return ResponseEntity.ok(agenciaCourierEntregaService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PUNTOS_ENTREGA_WRITE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        agenciaCourierEntregaService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
