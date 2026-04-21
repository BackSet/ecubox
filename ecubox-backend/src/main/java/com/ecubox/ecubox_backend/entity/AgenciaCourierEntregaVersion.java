package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Snapshot inmutable de una {@link AgenciaCourierEntrega} (SCD Tipo 2).
 * Ver {@link ConsignatarioVersion} para la semantica completa.
 *
 * <p>No incluye tarifas: la liquidacion economica vive en el modulo
 * de Liquidaciones y no depende de los snapshots tarifarios del
 * catalogo de puntos de entrega.
 */
@Entity
@Table(name = "agencia_courier_entrega_version")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgenciaCourierEntregaVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "agencia_courier_entrega_id", nullable = false)
    private AgenciaCourierEntrega agenciaCourierEntrega;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
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

    @Column(name = "valid_from", nullable = false)
    private LocalDateTime validFrom;

    @Setter
    @Column(name = "valid_to")
    private LocalDateTime validTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_usuario_id")
    private Usuario createdByUsuario;
}
