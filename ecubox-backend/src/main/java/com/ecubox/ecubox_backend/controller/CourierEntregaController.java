package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.CourierEntregaDTO;
import com.ecubox.ecubox_backend.dto.CourierEntregaRequest;
import com.ecubox.ecubox_backend.dto.PageResponse;
import com.ecubox.ecubox_backend.service.CourierEntregaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/couriers-entrega")
public class CourierEntregaController {

    private final CourierEntregaService courierEntregaService;

    public CourierEntregaController(CourierEntregaService courierEntregaService) {
        this.courierEntregaService = courierEntregaService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('COURIERS_ENTREGA_READ')")
    public ResponseEntity<List<CourierEntregaDTO>> findAll() {
        return ResponseEntity.ok(courierEntregaService.findAll());
    }

    @GetMapping("/page")
    @PreAuthorize("hasAuthority('COURIERS_ENTREGA_READ')")
    public ResponseEntity<PageResponse<CourierEntregaDTO>> findAllPaginated(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(PageResponse.of(courierEntregaService.findAllPaginated(q, page, size)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('COURIERS_ENTREGA_READ')")
    public ResponseEntity<CourierEntregaDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(courierEntregaService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('COURIERS_ENTREGA_WRITE')")
    public ResponseEntity<CourierEntregaDTO> create(@Valid @RequestBody CourierEntregaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(courierEntregaService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('COURIERS_ENTREGA_WRITE')")
    public ResponseEntity<CourierEntregaDTO> update(@PathVariable Long id, @Valid @RequestBody CourierEntregaRequest request) {
        return ResponseEntity.ok(courierEntregaService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('COURIERS_ENTREGA_WRITE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        courierEntregaService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
