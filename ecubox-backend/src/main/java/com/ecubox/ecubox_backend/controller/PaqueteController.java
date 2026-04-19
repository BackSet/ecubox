package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.PageResponse;
import com.ecubox.ecubox_backend.dto.PaqueteCreateRequest;
import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.dto.PaqueteUpdateRequest;
import com.ecubox.ecubox_backend.service.PaqueteService;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mis-paquetes")
public class PaqueteController {

    private final PaqueteService paqueteService;
    private final CurrentUserService currentUserService;

    public PaqueteController(PaqueteService paqueteService,
                              CurrentUserService currentUserService) {
        this.paqueteService = paqueteService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PAQUETES_READ')")
    public ResponseEntity<List<PaqueteDTO>> findAll() {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        boolean canManageAny = currentUserService.hasRole("ADMIN") || currentUserService.hasRole("OPERARIO");
        List<PaqueteDTO> list = canManageAny
                ? paqueteService.findAll()
                : paqueteService.findAllByUsuarioId(usuarioId);
        return ResponseEntity.ok(list);
    }

    /**
     * Variante paginada con búsqueda libre + filtros estructurales. Sustituye al
     * GET plano cuando el frontend usa el patrón de listas grandes con paginación
     * servidor. El chip {@code vencidos} se sigue resolviendo en cliente.
     */
    @GetMapping("/page")
    @PreAuthorize("hasAuthority('PAQUETES_READ')")
    public ResponseEntity<PageResponse<PaqueteDTO>> findAllPage(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) Long destinatarioFinalId,
            @RequestParam(required = false) String envio,
            @RequestParam(required = false) Long guiaMasterId,
            @RequestParam(required = false) String chip,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        boolean canManageAny = currentUserService.hasRole("ADMIN") || currentUserService.hasRole("OPERARIO");
        var filters = new PaqueteService.PaqueteListFilters(
                estado, destinatarioFinalId, envio, guiaMasterId, chip);
        var pageResult = canManageAny
                ? paqueteService.findAllPaginated(q, filters, page, size)
                : paqueteService.findAllByUsuarioIdPaginated(usuarioId, q, filters, page, size);
        return ResponseEntity.ok(PageResponse.of(pageResult));
    }

    @GetMapping("/sugerir-ref")
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    public ResponseEntity<Map<String, String>> sugerirRef(
            @RequestParam Long destinatarioFinalId,
            @RequestParam(required = false) Long excludePaqueteId) {
        String ref = paqueteService.sugerirRef(destinatarioFinalId, excludePaqueteId);
        return ResponseEntity.ok(Map.of("ref", ref));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PAQUETES_CREATE')")
    public ResponseEntity<PaqueteDTO> create(@Valid @RequestBody PaqueteCreateRequest request) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        boolean contenidoObligatorio = !currentUserService.hasAuthority("PAQUETES_PESO_WRITE");
        boolean canManageAny = currentUserService.hasRole("ADMIN") || currentUserService.hasRole("OPERARIO");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paqueteService.create(usuarioId, canManageAny, contenidoObligatorio, request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PAQUETES_UPDATE')")
    public ResponseEntity<PaqueteDTO> update(@PathVariable Long id, @Valid @RequestBody PaqueteUpdateRequest request) {
        var usuario = currentUserService.getCurrentUsuario();
        boolean canManageAny = currentUserService.hasRole("ADMIN") || currentUserService.hasRole("OPERARIO");
        boolean canEditPeso = currentUserService.hasAuthority("PAQUETES_PESO_WRITE");
        return ResponseEntity.ok(paqueteService.update(id, usuario.getId(), canManageAny, canEditPeso, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PAQUETES_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        var usuario = currentUserService.getCurrentUsuario();
        boolean canManageAny = currentUserService.hasRole("ADMIN") || currentUserService.hasRole("OPERARIO");
        paqueteService.delete(id, usuario.getId(), canManageAny);
        return ResponseEntity.noContent().build();
    }
}
