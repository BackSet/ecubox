package com.ecubox.ecubox_backend.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Respuesta estándar de error de la API")
public record ApiErrorResponse(
        @Schema(description = "Marca de tiempo del error", example = "2026-05-25T12:00:00")
        LocalDateTime timestamp,
        @Schema(description = "Código HTTP", example = "400")
        int status,
        @Schema(description = "Nombre del error HTTP", example = "Bad Request")
        String error,
        @Schema(description = "Mensaje descriptivo del error")
        String message,
        @Schema(description = "Errores de validación por campo (opcional)")
        Map<String, String> errors
) {}
