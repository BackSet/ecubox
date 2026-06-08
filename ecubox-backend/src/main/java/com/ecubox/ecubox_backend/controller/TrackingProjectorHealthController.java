package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.entity.TrackingProjectorState;
import com.ecubox.ecubox_backend.projection.TrackingViewProjector;
import com.ecubox.ecubox_backend.repository.TrackingProjectorStateRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Healthcheck del proyector de tracking (lag observable por administradores).
 * Expone {@code GET /api/admin/tracking/projector/health}.
 */
@Tag(name = "Sistema", description = "Monitoreo del proyector de tracking")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/admin/tracking/projector")
public class TrackingProjectorHealthController {

    private final TrackingViewProjector projector;
    private final TrackingProjectorStateRepository stateRepository;

    @Value("${tracking.projector.health.max-lag-seconds:120}")
    private long maxLagSeconds;

    public TrackingProjectorHealthController(TrackingViewProjector projector,
                                             TrackingProjectorStateRepository stateRepository) {
        this.projector = projector;
        this.stateRepository = stateRepository;
    }

    @GetMapping("/health")
    @PreAuthorize("hasAuthority('TRACKING_PROJECTOR_HEALTH_READ')")
    @Operation(summary = "Estado del proyector de tracking", description = "Devuelve salud y lag del proyector de tracking")
    @ApiResponse(responseCode = "200", description = "Proyector saludable")
    @ApiResponse(responseCode = "503", description = "Proyector degradado")
    public ResponseEntity<Map<String, Object>> health() {
        long lag = projector.getCurrentLagSeconds();
        boolean healthy = projector.isHealthy(maxLagSeconds);
        TrackingProjectorState state = stateRepository
                .findById(TrackingProjectorState.NAME_TRACKING_VIEW_PAQUETE)
                .orElse(null);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", healthy ? "UP" : "DEGRADED");
        body.put("lagSeconds", lag);
        body.put("maxLagSeconds", maxLagSeconds);
        body.put("lastEventId", state != null ? state.getLastEventId() : null);
        body.put("lastProcessedAt", state != null ? state.getLastProcessedAt() : null);
        body.put("now", LocalDateTime.now());
        return ResponseEntity.status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
                .body(body);
    }
}
