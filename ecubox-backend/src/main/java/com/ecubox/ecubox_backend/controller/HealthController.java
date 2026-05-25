package com.ecubox.ecubox_backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "Sistema", description = "Salud y monitoreo de la aplicación")
@RestController
@RequestMapping("/api/health")
public class HealthController {

    @Operation(
            summary = "Healthcheck",
            description = "Verifica que la aplicación está en ejecución. No requiere autenticación."
    )
    @SecurityRequirements
    @ApiResponse(responseCode = "200", description = "Aplicación operativa")
    @GetMapping
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "application", "ecubox-backend"));
    }
}
