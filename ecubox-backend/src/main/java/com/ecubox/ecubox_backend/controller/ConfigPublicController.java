package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.TarifaCalculadoraDTO;
import com.ecubox.ecubox_backend.service.ConfigCalculadoraService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/config")
public class ConfigPublicController {

    private final ConfigCalculadoraService configCalculadoraService;

    public ConfigPublicController(ConfigCalculadoraService configCalculadoraService) {
        this.configCalculadoraService = configCalculadoraService;
    }

    @GetMapping("/tarifa-calculadora")
    public ResponseEntity<TarifaCalculadoraDTO> getTarifaCalculadora() {
        return ResponseEntity.ok(configCalculadoraService.getTarifa());
    }
}
