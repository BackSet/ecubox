package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Snapshot inmutable de una {@link AgenciaDistribuidor} (SCD Tipo 2).
 * Ver {@link DestinatarioFinalVersion} para la semantica completa.
 */
@Entity
@Table(name = "agencia_distribuidor_version")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgenciaDistribuidorVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "agencia_distribuidor_id", nullable = false)
    private AgenciaDistribuidor agenciaDistribuidor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "distribuidor_id", nullable = false)
    private Distribuidor distribuidor;

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

    @Column(nullable = false, precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal tarifa = BigDecimal.ZERO;

    @Column(name = "valid_from", nullable = false)
    private LocalDateTime validFrom;

    @Setter
    @Column(name = "valid_to")
    private LocalDateTime validTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_usuario_id")
    private Usuario createdByUsuario;
}
