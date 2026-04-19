package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.PageResponse;
import com.ecubox.ecubox_backend.dto.RolDTO;
import com.ecubox.ecubox_backend.dto.RolPermisosUpdateRequest;
import com.ecubox.ecubox_backend.service.RolService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
public class RolController {

    private final RolService rolService;

    public RolController(RolService rolService) {
        this.rolService = rolService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ROLES_READ')")
    public ResponseEntity<List<RolDTO>> findAll() {
        return ResponseEntity.ok(rolService.findAll());
    }

    @GetMapping("/page")
    @PreAuthorize("hasAuthority('ROLES_READ')")
    public ResponseEntity<PageResponse<RolDTO>> findAllPaginated(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(PageResponse.of(rolService.findAllPaginated(q, page, size)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLES_READ')")
    public ResponseEntity<RolDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(rolService.findById(id));
    }

    @PutMapping("/{id}/permisos")
    @PreAuthorize("hasAuthority('ROLES_WRITE')")
    public ResponseEntity<RolDTO> updatePermisos(@PathVariable Long id,
                                                  @Valid @RequestBody RolPermisosUpdateRequest request) {
        return ResponseEntity.ok(rolService.updatePermisos(id, request));
    }
}
