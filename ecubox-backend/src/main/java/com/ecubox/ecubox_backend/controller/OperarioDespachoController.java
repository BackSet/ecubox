package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.AplicarEstadoEnDespachosRequest;
import com.ecubox.ecubox_backend.dto.AplicarEstadoPorPeriodoRequest;
import com.ecubox.ecubox_backend.dto.AplicarEstadoPorPeriodoResponse;
import com.ecubox.ecubox_backend.dto.DespachoCreateRequest;
import com.ecubox.ecubox_backend.dto.DespachoDTO;
import com.ecubox.ecubox_backend.dto.MensajeWhatsAppDespachoGeneradoDTO;
import com.ecubox.ecubox_backend.service.DespachoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/operario/despachos")
public class OperarioDespachoController {

    private final DespachoService despachoService;

    public OperarioDespachoController(DespachoService despachoService) {
        this.despachoService = despachoService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<List<DespachoDTO>> findAll() {
        return ResponseEntity.ok(despachoService.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<DespachoDTO> create(@Valid @RequestBody DespachoCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(despachoService.create(request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<DespachoDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(despachoService.findById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<DespachoDTO> update(@PathVariable Long id, @Valid @RequestBody DespachoCreateRequest request) {
        return ResponseEntity.ok(despachoService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        despachoService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/aplicar-estado-por-periodo")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<AplicarEstadoPorPeriodoResponse> aplicarEstadoPorPeriodo(
            @Valid @RequestBody AplicarEstadoPorPeriodoRequest request) {
        return ResponseEntity.ok(despachoService.aplicarEstadoRastreoPorPeriodo(
                request.getFechaInicio(),
                request.getFechaFin(),
                request.getEstadoRastreoId()));
    }

    @PostMapping("/aplicar-estado-en-despachos")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<AplicarEstadoPorPeriodoResponse> aplicarEstadoEnDespachos(
            @Valid @RequestBody AplicarEstadoEnDespachosRequest request) {
        return ResponseEntity.ok(despachoService.aplicarEstadoRastreoEnDespachos(
                request.getDespachoIds(),
                request.getEstadoRastreoId()));
    }

    @GetMapping("/{id}/mensaje-whatsapp")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<MensajeWhatsAppDespachoGeneradoDTO> getMensajeWhatsApp(@PathVariable Long id) {
        return ResponseEntity.ok(despachoService.getMensajeWhatsAppParaDespacho(id));
    }
}
