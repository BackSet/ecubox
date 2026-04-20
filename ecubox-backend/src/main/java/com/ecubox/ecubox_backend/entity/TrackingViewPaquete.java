package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Read model denormalizado para resolver el tracking publico de una pieza sin
 * tocar las tablas transaccionales. Mantenido por
 * {@code TrackingViewProjector} a partir del event log.
 */
@Entity
@Table(name = "tracking_view_paquete")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackingViewPaquete {

    @Id
    @Column(name = "paquete_id")
    private Long paqueteId;

    @Column(name = "numero_guia", nullable = false, length = 120)
    private String numeroGuia;

    @Column(name = "tracking_base", length = 120)
    private String trackingBase;

    @Column(name = "pieza_numero")
    private Integer piezaNumero;

    @Column(name = "pieza_total")
    private Integer piezaTotal;

    @Column(name = "estado_actual_id")
    private Long estadoActualId;

    @Column(name = "estado_actual_codigo", length = 60)
    private String estadoActualCodigo;

    @Column(name = "estado_actual_nombre", length = 160)
    private String estadoActualNombre;

    @Column(name = "fecha_estado_desde")
    private LocalDateTime fechaEstadoDesde;

    @Column(name = "en_flujo_alterno", nullable = false)
    @Builder.Default
    private Boolean enFlujoAlterno = false;

    @Column(name = "bloqueado", nullable = false)
    @Builder.Default
    private Boolean bloqueado = false;

    @Column(name = "consignatario_id")
    private Long consignatarioId;

    @Column(name = "consignatario_nombre", length = 200)
    private String consignatarioNombre;

    @Column(name = "consignatario_provincia", length = 80)
    private String consignatarioProvincia;

    @Column(name = "consignatario_canton", length = 80)
    private String consignatarioCanton;

    @Column(name = "last_event_id")
    private Long lastEventId;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
