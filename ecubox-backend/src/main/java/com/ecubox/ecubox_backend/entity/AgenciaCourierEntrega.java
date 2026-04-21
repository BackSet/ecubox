package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;

/**
 * Punto de entrega/oficina de un courier. Es un <strong>catalogo
 * logistico</strong>: no lleva tarifas. El costo del servicio lo
 * calcula el modulo de Liquidaciones a partir de
 * {@code ConfigTarifaDistribucion} y de las lineas de cada documento.
 */
@Entity
@Table(name = "agencia_courier_entrega")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLDelete(sql = "UPDATE agencia_courier_entrega SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class AgenciaCourierEntrega {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "courier_entrega_id", nullable = false)
    private CourierEntrega courierEntrega;

    @Column(nullable = false, length = 50)
    private String codigo;

    @Column(length = 100)
    private String provincia;

    @Column(length = 100)
    private String canton;

    @Column(columnDefinition = "TEXT")
    private String direccion;

    @Column(name = "horario_atencion", columnDefinition = "TEXT")
    private String horarioAtencion;

    @Column(name = "dias_max_retiro")
    private Integer diasMaxRetiro;

    /**
     * Soft-delete (V67): si es NOT NULL la agencia esta dada de baja.
     */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
