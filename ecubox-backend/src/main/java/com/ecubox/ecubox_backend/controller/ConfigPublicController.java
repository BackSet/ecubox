package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.MensajeAgenciaEeuuDTO;
import com.ecubox.ecubox_backend.dto.TarifaCalculadoraDTO;
import com.ecubox.ecubox_backend.service.ConfigCalculadoraService;
import com.ecubox.ecubox_backend.service.ParametroSistemaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/config")
public class ConfigPublicController {

    private final ConfigCalculadoraService configCalculadoraService;
    private final ParametroSistemaService parametroSistemaService;

    public ConfigPublicController(ConfigCalculadoraService configCalculadoraService,
                                  ParametroSistemaService parametroSistemaService) {
        this.configCalculadoraService = configCalculadoraService;
        this.parametroSistemaService = parametroSistemaService;
    }

    @GetMapping("/tarifa-calculadora")
    public ResponseEntity<TarifaCalculadoraDTO> getTarifaCalculadora() {
        return ResponseEntity.ok(configCalculadoraService.getTarifa());
    }

    @GetMapping("/mensaje-agencia-eeuu")
    public ResponseEntity<MensajeAgenciaEeuuDTO> getMensajeAgenciaEeuu() {
        return ResponseEntity.ok(parametroSistemaService.getMensajeAgenciaEeuu());
    }
}
