package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.MensajeAgenciaEeuuDTO;
import com.ecubox.ecubox_backend.dto.MensajeAgenciaEeuuRequest;
import com.ecubox.ecubox_backend.dto.MensajeWhatsAppDespachoDTO;
import com.ecubox.ecubox_backend.dto.MensajeWhatsAppDespachoRequest;
import com.ecubox.ecubox_backend.dto.TarifaCalculadoraDTO;
import com.ecubox.ecubox_backend.dto.TarifaCalculadoraRequest;
import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoRequest;
import com.ecubox.ecubox_backend.service.ConfigCalculadoraService;
import com.ecubox.ecubox_backend.service.ParametroSistemaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/operario/config")
public class OperarioConfigController {

    private final ConfigCalculadoraService configCalculadoraService;
    private final ParametroSistemaService parametroSistemaService;

    public OperarioConfigController(ConfigCalculadoraService configCalculadoraService,
                                   ParametroSistemaService parametroSistemaService) {
        this.configCalculadoraService = configCalculadoraService;
        this.parametroSistemaService = parametroSistemaService;
    }

    @GetMapping("/tarifa-calculadora")
    @PreAuthorize("hasAuthority('TARIFA_CALCULADORA_READ')")
    public ResponseEntity<TarifaCalculadoraDTO> getTarifaCalculadora() {
        return ResponseEntity.ok(configCalculadoraService.getTarifa());
    }

    @PutMapping("/tarifa-calculadora")
    @PreAuthorize("hasAuthority('TARIFA_CALCULADORA_WRITE')")
    public ResponseEntity<TarifaCalculadoraDTO> updateTarifaCalculadora(
            @Valid @RequestBody TarifaCalculadoraRequest request) {
        return ResponseEntity.ok(configCalculadoraService.updateTarifa(request.getTarifaPorLibra()));
    }

    @GetMapping("/mensaje-whatsapp-despacho")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<MensajeWhatsAppDespachoDTO> getMensajeWhatsAppDespacho() {
        return ResponseEntity.ok(parametroSistemaService.getMensajeWhatsAppDespacho());
    }

    @PutMapping("/mensaje-whatsapp-despacho")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<MensajeWhatsAppDespachoDTO> updateMensajeWhatsAppDespacho(
            @Valid @RequestBody MensajeWhatsAppDespachoRequest request) {
        return ResponseEntity.ok(parametroSistemaService.updateMensajeWhatsAppDespacho(request.getPlantilla()));
    }

    @PutMapping("/mensaje-agencia-eeuu")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<MensajeAgenciaEeuuDTO> updateMensajeAgenciaEeuu(
            @Valid @RequestBody MensajeAgenciaEeuuRequest request) {
        return ResponseEntity.ok(parametroSistemaService.updateMensajeAgenciaEeuu(request.getMensaje()));
    }

    @GetMapping("/estados-rastreo-por-punto")
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_READ') or hasRole('ADMIN') or hasRole('OPERARIO')")
    public ResponseEntity<EstadosRastreoPorPuntoDTO> getEstadosRastreoPorPunto() {
        return ResponseEntity.ok(parametroSistemaService.getEstadosRastreoPorPunto());
    }

    @PutMapping("/estados-rastreo-por-punto")
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_UPDATE') or hasRole('ADMIN') or hasRole('OPERARIO')")
    public ResponseEntity<EstadosRastreoPorPuntoDTO> updateEstadosRastreoPorPunto(
            @Valid @RequestBody EstadosRastreoPorPuntoRequest request) {
        return ResponseEntity.ok(parametroSistemaService.updateEstadosRastreoPorPunto(
                request.getEstadoRastreoRegistroPaqueteId(),
                request.getEstadoRastreoEnLoteRecepcionId(),
                request.getEstadoRastreoAsociarGuiaMasterId(),
                request.getEstadoRastreoEnDespachoId(),
                request.getEstadoRastreoEnTransitoId(),
                request.getEstadoRastreoInicioCuentaRegresivaId(),
                request.getEstadoRastreoFinCuentaRegresivaId()));
    }
}
