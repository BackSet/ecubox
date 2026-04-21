package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Línea de la sección B de una {@link Liquidacion}: costo del courier de
 * entrega por despacho.
 *
 * <p>Para cada despacho enviado a destino, se aplica la regla:
 *
 * <pre>
 *   costoCalculado = precioFijo + max(0, pesoKg − kgIncluidos) × precioKgAdicional
 * </pre>
 *
 * <p>Los tres parámetros tarifarios se snapshotean por línea (al guardar
 * se promueven al singleton {@link ConfigTarifaDistribucion} para que aparezcan
 * precargados en próximas líneas — write-back).
 *
 * <p>Un mismo {@code despacho_id} solo puede aparecer en UNA línea de
 * cualquier liquidación (UNIQUE global a nivel de BD).
 */
@Entity
@Table(name = "liquidacion_despacho_linea")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiquidacionDespachoLinea {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "liquidacion_id", nullable = false)
    private Liquidacion liquidacion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "despacho_id", nullable = false, unique = true)
    private Despacho despacho;

    @Column(name = "peso_kg", nullable = false, precision = 12, scale = 4)
    @Builder.Default
    private BigDecimal pesoKg = BigDecimal.ZERO;

    @Column(name = "peso_lbs", nullable = false, precision = 12, scale = 4)
    @Builder.Default
    private BigDecimal pesoLbs = BigDecimal.ZERO;

    @Column(name = "kg_incluidos", nullable = false, precision = 12, scale = 4)
    @Builder.Default
    private BigDecimal kgIncluidos = BigDecimal.ZERO;

    @Column(name = "precio_fijo", nullable = false, precision = 12, scale = 4)
    @Builder.Default
    private BigDecimal precioFijo = BigDecimal.ZERO;

    @Column(name = "precio_kg_adicional", nullable = false, precision = 12, scale = 4)
    @Builder.Default
    private BigDecimal precioKgAdicional = BigDecimal.ZERO;

    @Column(name = "costo_calculado", nullable = false, precision = 14, scale = 4)
    @Builder.Default
    private BigDecimal costoCalculado = BigDecimal.ZERO;

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
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
