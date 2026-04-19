package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "agencia")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLDelete(sql = "UPDATE agencia SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class Agencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String nombre;

    @Column(length = 255)
    private String encargado;

    @Column(nullable = false, unique = true, length = 50)
    private String codigo;

    @Column(length = 255)
    private String direccion;

    @Column(length = 100)
    private String provincia;

    @Column(length = 100)
    private String canton;

    @Column(name = "horario_atencion", columnDefinition = "TEXT")
    private String horarioAtencion;

    @Column(name = "dias_max_retiro")
    private Integer diasMaxRetiro;

    @Column(name = "tarifa_servicio", nullable = false, precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal tarifaServicio = BigDecimal.ZERO;

    /**
     * Soft-delete (V67): si es NOT NULL la agencia esta dada de baja y
     * no debe aparecer en listados vivos. Las versiones historicas
     * referenciadas por despachos siguen siendo legibles.
     */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
