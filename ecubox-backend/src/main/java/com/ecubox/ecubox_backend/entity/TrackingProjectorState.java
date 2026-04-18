package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Estado persistente de un proyector de tracking; usado para reanudacion
 * incremental tras reinicio y para metricas de lag.
 */
@Entity
@Table(name = "tracking_projector_state")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackingProjectorState {

    public static final String NAME_TRACKING_VIEW_PAQUETE = "tracking_view_paquete";

    @Id
    @Column(name = "name", length = 80)
    private String name;

    @Column(name = "last_event_id", nullable = false)
    @Builder.Default
    private Long lastEventId = 0L;

    @Column(name = "last_processed_at", nullable = false)
    private LocalDateTime lastProcessedAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
