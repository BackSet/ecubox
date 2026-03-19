package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "config_calculadora")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConfigCalculadora {

    @Id
    private Long id;

    @Column(name = "tarifa_por_libra", nullable = false, precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal tarifaPorLibra = BigDecimal.ZERO;
}
