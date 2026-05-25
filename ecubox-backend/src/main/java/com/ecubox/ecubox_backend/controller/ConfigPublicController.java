package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.CanalesComunicacionPublicDTO;
import com.ecubox.ecubox_backend.dto.MensajeAgenciaEeuuDTO;
import com.ecubox.ecubox_backend.dto.TarifaCalculadoraDTO;
import com.ecubox.ecubox_backend.service.ConfigCalculadoraService;
import com.ecubox.ecubox_backend.service.ParametroSistemaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Público", description = "Configuración pública para la web sin autenticación")
@RestController
@RequestMapping("/api/config")
@OpenApiConstants.StandardApiResponses
public class ConfigPublicController {

    private final ConfigCalculadoraService configCalculadoraService;
    private final ParametroSistemaService parametroSistemaService;

    public ConfigPublicController(ConfigCalculadoraService configCalculadoraService,
                                  ParametroSistemaService parametroSistemaService) {
        this.configCalculadoraService = configCalculadoraService;
        this.parametroSistemaService = parametroSistemaService;
    }

    @Operation(summary = "Tarifa calculadora", description = "Tarifa por libra visible en la calculadora pública")
    @SecurityRequirements
    @ApiResponse(responseCode = "200", description = "Tarifa actual")
    @GetMapping("/tarifa-calculadora")
    public ResponseEntity<TarifaCalculadoraDTO> getTarifaCalculadora() {
        return ResponseEntity.ok(configCalculadoraService.getTarifa());
    }

    @Operation(summary = "Mensaje agencia EE.UU.", description = "Texto informativo para la dirección de casillero en Miami")
    @SecurityRequirements
    @ApiResponse(responseCode = "200", description = "Mensaje configurado")
    @GetMapping("/mensaje-agencia-eeuu")
    public ResponseEntity<MensajeAgenciaEeuuDTO> getMensajeAgenciaEeuu() {
        return ResponseEntity.ok(parametroSistemaService.getMensajeAgenciaEeuu());
    }

    @Operation(summary = "Canales de comunicación", description = "Canales visibles para contacto y redes en el sitio público")
    @SecurityRequirements
    @ApiResponse(responseCode = "200", description = "Canales públicos")
    @GetMapping("/canales-comunicacion")
    public ResponseEntity<CanalesComunicacionPublicDTO> getCanalesComunicacion() {
        return ResponseEntity.ok(parametroSistemaService.getCanalesComunicacionPublic());
    }
}
