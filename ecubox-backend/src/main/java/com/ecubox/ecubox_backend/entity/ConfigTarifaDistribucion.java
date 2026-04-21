package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Tarifa por defecto para el costo de distribución (courier de entrega) que se
 * usa al construir las líneas de una liquidación de envío consolidado.
 *
 * <p>Es un singleton de la fila id = 1 (mismo patrón que {@link ConfigCalculadora}).
 * Se siembra con valores por defecto en Flyway. Cuando un operario edita los
 * tres parámetros al guardar una línea de liquidación, los valores nuevos se
 * promueven automáticamente a esta fila para que aparezcan precargados en
 * próximos cálculos.
 */
@Entity
@Table(name = "config_tarifa_distribucion")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConfigTarifaDistribucion {

    public static final Long SINGLETON_ID = 1L;

    @Id
    private Long id;

    /** Cuántos kg entran a la tarifa fija (ej. 2 kg). */
    @Column(name = "kg_incluidos", nullable = false, precision = 12, scale = 4)
    @Builder.Default
    private BigDecimal kgIncluidos = BigDecimal.ZERO;

    /** Precio fijo del tramo de los kg incluidos (ej. 2.75 USD). */
    @Column(name = "precio_fijo", nullable = false, precision = 12, scale = 4)
    @Builder.Default
    private BigDecimal precioFijo = BigDecimal.ZERO;

    /** Precio por kg adicional sobre los kg incluidos (ej. 0.50 USD). */
    @Column(name = "precio_kg_adicional", nullable = false, precision = 12, scale = 4)
    @Builder.Default
    private BigDecimal precioKgAdicional = BigDecimal.ZERO;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by_usuario_id")
    private Usuario updatedBy;

    @Version
    @Column(nullable = false)
    private Long version;

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @PrePersist
    void onPersist() {
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
    }
}
