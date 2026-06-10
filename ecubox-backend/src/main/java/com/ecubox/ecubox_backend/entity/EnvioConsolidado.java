package com.ecubox.ecubox_backend.entity;

import com.ecubox.ecubox_backend.enums.EstadoEnvioConsolidadoOperativo;
import com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.EnumSet;

/**
 * Agrupador interno de paquetes para el operario.
 *
 * <p>El estado operativo se persiste en {@link #estadoOperativo}. Los campos
 * {@link #fechaCierre} (cierre de registro), {@link #fechaCerrado} (salida USA) y
 * {@link #fechaArriboEcuador} marcan hitos de cada transición.
 */
@Entity
@Table(name = "envio_consolidado")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnvioConsolidado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "codigo", nullable = false, length = 100)
    private String codigo;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_operativo", nullable = false, length = 30)
    @Builder.Default
    private EstadoEnvioConsolidadoOperativo estadoOperativo = EstadoEnvioConsolidadoOperativo.VACIO;

    /** Fecha en que se cerró el consolidado para registro (estado CERRADO). */
    @Column(name = "fecha_cierre")
    private LocalDateTime fechaCierre;

    /** Fecha de salida desde USA (estado ENVIADO_DESDE_USA). Antes era el único campo de cierre. */
    @Column(name = "fecha_cerrado")
    private LocalDateTime fechaCerrado;

    /** Fecha de arribo a Ecuador / aduana destino (estado ARRIBADO_ECUADOR). */
    @Column(name = "fecha_arribo_ecuador")
    private LocalDateTime fechaArriboEcuador;

    @Column(name = "peso_total_lbs", precision = 12, scale = 4)
    private BigDecimal pesoTotalLbs;

    @Column(name = "total_paquetes", nullable = false)
    @Builder.Default
    private Integer totalPaquetes = 0;

    /**
     * Estado de pago del envío consolidado. Sincronizado por
     * {@code LiquidacionService} cuando se marca / desmarca pagada la
     * liquidación que contiene a este consolidado en su sección A.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "estado_pago", nullable = false, length = 20)
    @Builder.Default
    private EstadoPagoConsolidado estadoPago = EstadoPagoConsolidado.NO_PAGADO;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    @Column(nullable = false)
    private Long version;

    private static final java.util.Set<EstadoEnvioConsolidadoOperativo> ESTADOS_CERRADOS =
            EnumSet.of(EstadoEnvioConsolidadoOperativo.CERRADO,
                       EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA,
                       EstadoEnvioConsolidadoOperativo.ARRIBADO_ECUADOR,
                       EstadoEnvioConsolidadoOperativo.RECIBIDO_EN_BODEGA,
                       EstadoEnvioConsolidadoOperativo.LIQUIDADO);

    /** True si el consolidado ya no admite cambios de paquetes (estado posterior a EN_PREPARACION). */
    @Transient
    public boolean isCerrado() {
        return estadoOperativo != null && ESTADOS_CERRADOS.contains(estadoOperativo);
    }

    @Transient
    public boolean isAbierto() {
        return !isCerrado();
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (totalPaquetes == null) totalPaquetes = 0;
        if (estadoPago == null) estadoPago = EstadoPagoConsolidado.NO_PAGADO;
        if (estadoOperativo == null) estadoOperativo = EstadoEnvioConsolidadoOperativo.VACIO;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
