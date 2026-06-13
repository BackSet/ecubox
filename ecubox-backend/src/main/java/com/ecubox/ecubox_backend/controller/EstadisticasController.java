package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.EstadisticasConsulta;
import com.ecubox.ecubox_backend.dto.EstadisticasDashboardDTO;
import com.ecubox.ecubox_backend.enums.GranularidadEstadisticas;
import com.ecubox.ecubox_backend.enums.PresetPeriodoEstadisticas;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.service.EstadisticasService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Locale;

@Tag(name = "Estadísticas", description = "Indicadores para análisis operativo y toma de decisiones")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/estadisticas")
public class EstadisticasController {

    private final EstadisticasService estadisticasService;

    public EstadisticasController(EstadisticasService estadisticasService) {
        this.estadisticasService = estadisticasService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ESTADISTICAS_READ')")
    @Operation(summary = "Obtener estadísticas operativas",
            description = """
                    Devuelve resultados del periodo (con comparación contra el periodo anterior
                    equivalente y series por granularidad) y la fotografía operativa actual.
                    Prioridad: 'desde'+'hasta' (hasta exclusivo) > 'preset' > 'meses' (legado).
                    Zona horaria: America/Guayaquil.""")
    @ApiResponse(responseCode = "200", description = "Panel estadístico generado")
    public ResponseEntity<EstadisticasDashboardDTO> dashboard(
            @RequestParam(required = false) String preset,
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) Integer mes,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) String granularidad,
            @RequestParam(required = false) Integer meses) {

        EstadisticasConsulta consulta = new EstadisticasConsulta(
                parsePreset(preset),
                anio,
                mes,
                desde,
                hasta,
                parseGranularidad(granularidad),
                meses);
        return ResponseEntity.ok(estadisticasService.dashboard(consulta));
    }

    private static PresetPeriodoEstadisticas parsePreset(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        try {
            return PresetPeriodoEstadisticas.valueOf(valor.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Preset de periodo no soportado: " + valor);
        }
    }

    private static GranularidadEstadisticas parseGranularidad(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        try {
            return GranularidadEstadisticas.valueOf(valor.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Granularidad no soportada: " + valor);
        }
    }
}
