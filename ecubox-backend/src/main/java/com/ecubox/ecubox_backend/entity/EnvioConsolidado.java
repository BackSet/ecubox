package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Agrupador interno de paquetes para el operario.
 *
 * <p>NO se expone en el tracking publico; solo sirve como contenedor logico
 * para emitir manifiestos y para que el operario pueda referenciar un envio
 * desde la vista de paquetes. Su unico ciclo de vida es:
 * <em>abierto</em> (admite agregar/quitar paquetes) o <em>cerrado</em>
 * (historico, no admite cambios). Se determina por {@link #fechaCerrado}.
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

    @Column(name = "fecha_cerrado")
    private LocalDateTime fechaCerrado;

    @Column(name = "peso_total_lbs", precision = 12, scale = 4)
    private BigDecimal pesoTotalLbs;

    @Column(name = "total_paquetes", nullable = false)
    @Builder.Default
    private Integer totalPaquetes = 0;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    @Column(nullable = false)
    private Long version;

    /** Indica si el envio esta cerrado (no admite mas cambios). */
    @Transient
    public boolean isCerrado() {
        return fechaCerrado != null;
    }

    /** Inverso semantico de {@link #isCerrado()} para legibilidad. */
    @Transient
    public boolean isAbierto() {
        return fechaCerrado == null;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (totalPaquetes == null) totalPaquetes = 0;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
