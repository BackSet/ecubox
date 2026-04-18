package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.entity.TrackingProjectorState;
import com.ecubox.ecubox_backend.projection.TrackingViewProjector;
import com.ecubox.ecubox_backend.repository.TrackingProjectorStateRepository;
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
    @PreAuthorize("hasRole('ADMIN')")
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
