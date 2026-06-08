package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.CanalesComunicacionDTO;
import com.ecubox.ecubox_backend.dto.CanalesComunicacionRequest;
import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoRequest;
import com.ecubox.ecubox_backend.dto.MensajeAgenciaEeuuDTO;
import com.ecubox.ecubox_backend.dto.MensajeAgenciaEeuuRequest;
import com.ecubox.ecubox_backend.dto.MensajeWhatsAppDespachoDTO;
import com.ecubox.ecubox_backend.dto.MensajeWhatsAppDespachoRequest;
import com.ecubox.ecubox_backend.dto.TarifaCalculadoraDTO;
import com.ecubox.ecubox_backend.dto.TarifaCalculadoraRequest;
import com.ecubox.ecubox_backend.dto.TemaTemporadaDTO;
import com.ecubox.ecubox_backend.dto.TemaTemporadaRequest;
import com.ecubox.ecubox_backend.service.ConfigCalculadoraService;
import com.ecubox.ecubox_backend.service.ParametroSistemaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Operario", description = "Configuraciones operativas del sistema")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
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
    @Operation(summary = "Obtener tarifa calculadora", description = "Consulta la tarifa por libra usada en la calculadora")
    @ApiResponse(responseCode = "200", description = "Tarifa actual")
    public ResponseEntity<TarifaCalculadoraDTO> getTarifaCalculadora() {
        return ResponseEntity.ok(configCalculadoraService.getTarifa());
    }

    @PutMapping("/tarifa-calculadora")
    @PreAuthorize("hasAuthority('TARIFA_CALCULADORA_WRITE')")
    @Operation(summary = "Actualizar tarifa calculadora", description = "Actualiza la tarifa por libra para cotizaciones")
    @ApiResponse(responseCode = "200", description = "Tarifa actualizada")
    public ResponseEntity<TarifaCalculadoraDTO> updateTarifaCalculadora(
            @Valid @RequestBody TarifaCalculadoraRequest request) {
        return ResponseEntity.ok(configCalculadoraService.updateTarifa(request.getTarifaPorLibra()));
    }

    @GetMapping("/mensaje-whatsapp-despacho")
    @PreAuthorize("hasAuthority('MENSAJE_WHATSAPP_DESPACHO_READ')")
    @Operation(summary = "Obtener mensaje WhatsApp", description = "Consulta la plantilla de WhatsApp para despachos")
    @ApiResponse(responseCode = "200", description = "Plantilla actual")
    public ResponseEntity<MensajeWhatsAppDespachoDTO> getMensajeWhatsAppDespacho() {
        return ResponseEntity.ok(parametroSistemaService.getMensajeWhatsAppDespacho());
    }

    @PutMapping("/mensaje-whatsapp-despacho")
    @PreAuthorize("hasAuthority('MENSAJE_WHATSAPP_DESPACHO_WRITE')")
    @Operation(summary = "Actualizar mensaje WhatsApp", description = "Actualiza la plantilla de WhatsApp usada en despachos")
    @ApiResponse(responseCode = "200", description = "Plantilla actualizada")
    public ResponseEntity<MensajeWhatsAppDespachoDTO> updateMensajeWhatsAppDespacho(
            @Valid @RequestBody MensajeWhatsAppDespachoRequest request) {
        return ResponseEntity.ok(parametroSistemaService.updateMensajeWhatsAppDespacho(request.getPlantilla()));
    }

    @PutMapping("/mensaje-agencia-eeuu")
    @PreAuthorize("hasAuthority('MENSAJE_AGENCIA_EEUU_WRITE')")
    @Operation(summary = "Actualizar mensaje de agencia EE.UU.", description = "Modifica el mensaje operativo para agencia en Estados Unidos")
    @ApiResponse(responseCode = "200", description = "Mensaje actualizado")
    public ResponseEntity<MensajeAgenciaEeuuDTO> updateMensajeAgenciaEeuu(
            @Valid @RequestBody MensajeAgenciaEeuuRequest request) {
        return ResponseEntity.ok(parametroSistemaService.updateMensajeAgenciaEeuu(request.getMensaje()));
    }

    @GetMapping("/canales-comunicacion")
    @PreAuthorize("hasAuthority('CANALES_COMUNICACION_READ')")
    @Operation(summary = "Obtener canales de comunicación", description = "Consulta los canales de comunicación configurados")
    @ApiResponse(responseCode = "200", description = "Canales configurados")
    public ResponseEntity<CanalesComunicacionDTO> getCanalesComunicacion() {
        return ResponseEntity.ok(parametroSistemaService.getCanalesComunicacion());
    }

    @PutMapping("/canales-comunicacion")
    @PreAuthorize("hasAuthority('CANALES_COMUNICACION_WRITE')")
    @Operation(summary = "Actualizar canales de comunicación", description = "Actualiza los datos de canales de contacto")
    @ApiResponse(responseCode = "200", description = "Canales actualizados")
    public ResponseEntity<CanalesComunicacionDTO> updateCanalesComunicacion(
            @Valid @RequestBody CanalesComunicacionRequest request) {
        return ResponseEntity.ok(parametroSistemaService.updateCanalesComunicacion(request));
    }

    @GetMapping("/tema-temporada")
    @PreAuthorize("hasAuthority('TEMA_TEMPORADA_READ')")
    @Operation(summary = "Obtener tema de temporada", description = "Consulta el override del tema de temporada del sitio público")
    @ApiResponse(responseCode = "200", description = "Tema configurado")
    public ResponseEntity<TemaTemporadaDTO> getTemaTemporada() {
        return ResponseEntity.ok(parametroSistemaService.getTemaTemporada());
    }

    @PutMapping("/tema-temporada")
    @PreAuthorize("hasAuthority('TEMA_TEMPORADA_WRITE')")
    @Operation(summary = "Actualizar tema de temporada", description = "Fija el override del tema de temporada (auto, off o id)")
    @ApiResponse(responseCode = "200", description = "Tema actualizado")
    public ResponseEntity<TemaTemporadaDTO> updateTemaTemporada(
            @Valid @RequestBody TemaTemporadaRequest request) {
        return ResponseEntity.ok(parametroSistemaService.updateTemaTemporada(request));
    }

    @GetMapping("/estados-rastreo-por-punto")
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_READ')")
    @Operation(summary = "Obtener estados por punto", description = "Consulta la configuración de estados de rastreo por punto operativo")
    @ApiResponse(responseCode = "200", description = "Configuración actual")
    public ResponseEntity<EstadosRastreoPorPuntoDTO> getEstadosRastreoPorPunto() {
        return ResponseEntity.ok(parametroSistemaService.getEstadosRastreoPorPunto());
    }

    @PutMapping("/estados-rastreo-por-punto")
    @PreAuthorize("hasAuthority('ESTADOS_RASTREO_UPDATE')")
    @Operation(summary = "Actualizar estados por punto", description = "Define los estados de rastreo usados en cada punto operativo")
    @ApiResponse(responseCode = "200", description = "Configuración actualizada")
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
