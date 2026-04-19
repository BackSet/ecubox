package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "agencia_distribuidor")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLDelete(sql = "UPDATE agencia_distribuidor SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class AgenciaDistribuidor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
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

    /**
     * Soft-delete (V67): si es NOT NULL la agencia esta dada de baja.
     */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
