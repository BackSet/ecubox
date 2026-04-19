package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.DistribuidorDTO;
import com.ecubox.ecubox_backend.dto.DistribuidorRequest;
import com.ecubox.ecubox_backend.dto.PageResponse;
import com.ecubox.ecubox_backend.service.DistribuidorService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/distribuidores")
public class DistribuidorController {

    private final DistribuidorService distribuidorService;

    public DistribuidorController(DistribuidorService distribuidorService) {
        this.distribuidorService = distribuidorService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('DISTRIBUIDORES_READ')")
    public ResponseEntity<List<DistribuidorDTO>> findAll() {
        return ResponseEntity.ok(distribuidorService.findAll());
    }

    @GetMapping("/page")
    @PreAuthorize("hasAuthority('DISTRIBUIDORES_READ')")
    public ResponseEntity<PageResponse<DistribuidorDTO>> findAllPaginated(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(PageResponse.of(distribuidorService.findAllPaginated(q, page, size)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('DISTRIBUIDORES_READ')")
    public ResponseEntity<DistribuidorDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(distribuidorService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('DISTRIBUIDORES_WRITE')")
    public ResponseEntity<DistribuidorDTO> create(@Valid @RequestBody DistribuidorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(distribuidorService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('DISTRIBUIDORES_WRITE')")
    public ResponseEntity<DistribuidorDTO> update(@PathVariable Long id, @Valid @RequestBody DistribuidorRequest request) {
        return ResponseEntity.ok(distribuidorService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('DISTRIBUIDORES_WRITE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        distribuidorService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
