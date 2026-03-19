package com.ecubox.ecubox_backend.entity;

import com.ecubox.ecubox_backend.enums.TrackingEventType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "paquete_estado_evento")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaqueteEstadoEvento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, unique = true)
    private UUID eventId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "paquete_id", nullable = false)
    private Paquete paquete;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estado_origen_id")
    private EstadoRastreo estadoOrigen;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estado_destino_id", nullable = false)
    private EstadoRastreo estadoDestino;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 60)
    private TrackingEventType eventType;

    @Column(name = "event_source", nullable = false, length = 60)
    private String eventSource;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_usuario_id")
    private Usuario actorUsuario;

    @Column(name = "motivo_alterno", columnDefinition = "TEXT")
    private String motivoAlterno;

    @Column(name = "en_flujo_alterno", nullable = false)
    @Builder.Default
    private Boolean enFlujoAlterno = false;

    @Column(name = "bloqueado", nullable = false)
    @Builder.Default
    private Boolean bloqueado = false;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 160)
    private String idempotencyKey;

    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
