package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Línea de la sección A de una {@link Liquidacion}: costo al proveedor por
 * envío consolidado.
 *
 * <p>El proveedor (USA) le indica al operario qué consolidados quiere que
 * pague; cada línea registra el costo del proveedor y el ingreso por cliente.
 * El {@link #margenLinea} es {@code ingresoCliente − costoProveedor}.
 *
 * <p>Un mismo {@code envio_consolidado_id} solo puede aparecer en UNA línea
 * de cualquier liquidación (UNIQUE global a nivel de BD).
 */
@Entity
@Table(name = "liquidacion_consolidado_linea")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiquidacionConsolidadoLinea {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "liquidacion_id", nullable = false)
    private Liquidacion liquidacion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "envio_consolidado_id", nullable = false, unique = true)
    private EnvioConsolidado envioConsolidado;

    @Column(name = "costo_proveedor", nullable = false, precision = 14, scale = 4)
    @Builder.Default
    private BigDecimal costoProveedor = BigDecimal.ZERO;

    @Column(name = "ingreso_cliente", nullable = false, precision = 14, scale = 4)
    @Builder.Default
    private BigDecimal ingresoCliente = BigDecimal.ZERO;

    @Column(name = "margen_linea", nullable = false, precision = 14, scale = 4)
    @Builder.Default
    private BigDecimal margenLinea = BigDecimal.ZERO;

    @Column(name = "notas", columnDefinition = "TEXT")
    private String notas;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (costoProveedor == null) costoProveedor = BigDecimal.ZERO;
        if (ingresoCliente == null) ingresoCliente = BigDecimal.ZERO;
        if (margenLinea == null) margenLinea = BigDecimal.ZERO;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
