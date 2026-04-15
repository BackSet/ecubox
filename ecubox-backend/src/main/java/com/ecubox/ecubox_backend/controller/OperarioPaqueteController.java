package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.BulkPaquetePesoRequest;
import com.ecubox.ecubox_backend.dto.BuscarPaquetesPorGuiasRequest;
import com.ecubox.ecubox_backend.dto.CambiarEstadoRastreoBulkRequest;
import com.ecubox.ecubox_backend.dto.CambiarEstadoRastreoBulkResponse;
import com.ecubox.ecubox_backend.dto.CambiarEstadoRastreoRequest;
import com.ecubox.ecubox_backend.dto.PaqueteAsignarSacaRequest;
import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.dto.PaqueteGuiaEnvioRequest;
import com.ecubox.ecubox_backend.dto.AsignarGuiaEnvioBulkRequest;
import com.ecubox.ecubox_backend.dto.EstadoRastreoDTO;
import com.ecubox.ecubox_backend.dto.EstadosDestinoPermitidosRequest;
import com.ecubox.ecubox_backend.service.PaqueteService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/operario/paquetes")
public class OperarioPaqueteController {

    private final PaqueteService paqueteService;

    public OperarioPaqueteController(PaqueteService paqueteService) {
        this.paqueteService = paqueteService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    public ResponseEntity<List<PaqueteDTO>> listar(
            @RequestParam(defaultValue = "true") boolean sinPeso,
            @RequestParam(defaultValue = "false") boolean sinSaca,
            @RequestParam(defaultValue = "false") boolean vencidos) {
        if (vencidos) {
            return ResponseEntity.ok(paqueteService.listarVencidosParaOperario());
        }
        if (sinSaca) {
            return ResponseEntity.ok(paqueteService.listarSinSaca());
        }
        return ResponseEntity.ok(paqueteService.listarParaOperario(sinPeso));
    }

    @PatchMapping("/{paqueteId}/saca")
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    public ResponseEntity<PaqueteDTO> asignarSaca(
            @PathVariable Long paqueteId,
            @Valid @RequestBody PaqueteAsignarSacaRequest request) {
        return ResponseEntity.ok(paqueteService.asignarSaca(paqueteId, request.getSacaId()));
    }

    @PostMapping("/pesos")
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    public ResponseEntity<List<PaqueteDTO>> actualizarPesosBulk(
            @Valid @RequestBody BulkPaquetePesoRequest request) {
        return ResponseEntity.ok(paqueteService.actualizarPesosBulk(request.getItems()));
    }

    @PatchMapping("/{paqueteId}/estado-rastreo")
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    public ResponseEntity<PaqueteDTO> cambiarEstadoRastreo(
            @PathVariable Long paqueteId,
            @Valid @RequestBody CambiarEstadoRastreoRequest request) {
        return ResponseEntity.ok(paqueteService.cambiarEstadoRastreo(paqueteId, request.getEstadoRastreoId(), request.getMotivoAlterno()));
    }

    @PostMapping("/estados-destino-permitidos")
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    public ResponseEntity<List<EstadoRastreoDTO>> estadosDestinoPermitidos(
            @Valid @RequestBody EstadosDestinoPermitidosRequest request) {
        return ResponseEntity.ok(paqueteService.estadosDestinoPermitidos(request.getPaqueteIds()));
    }

    @PostMapping("/cambiar-estado-rastreo-bulk")
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    public ResponseEntity<CambiarEstadoRastreoBulkResponse> cambiarEstadoRastreoBulk(
            @Valid @RequestBody CambiarEstadoRastreoBulkRequest request) {
        return ResponseEntity.ok(paqueteService.cambiarEstadoRastreoBulk(
                request.getPaqueteIds(), request.getEstadoRastreoId()));
    }

    @PatchMapping("/{paqueteId}/guia-envio")
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    public ResponseEntity<PaqueteDTO> asignarGuiaEnvio(
            @PathVariable Long paqueteId,
            @RequestBody PaqueteGuiaEnvioRequest request) {
        return ResponseEntity.ok(paqueteService.asignarGuiaEnvio(paqueteId, request.getNumeroGuiaEnvio()));
    }

    @PostMapping("/asignar-guia-envio")
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    public ResponseEntity<List<PaqueteDTO>> asignarGuiaEnvioBulk(
            @Valid @RequestBody AsignarGuiaEnvioBulkRequest request) {
        return ResponseEntity.ok(paqueteService.asignarGuiaEnvioBulk(
                request.getNumeroGuiaEnvio(), request.getPaqueteIds()));
    }

    @PostMapping("/buscar-por-guias")
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    public ResponseEntity<List<PaqueteDTO>> buscarPorGuias(
            @Valid @RequestBody BuscarPaquetesPorGuiasRequest request) {
        return ResponseEntity.ok(paqueteService.buscarPorNumeroGuias(request.getNumeroGuias()));
    }

}
