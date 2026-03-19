package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "estado_rastreo_transicion",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_estado_rastreo_transicion_origen_destino", columnNames = {"estado_origen_id", "estado_destino_id"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EstadoRastreoTransicion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "estado_origen_id", nullable = false)
    private EstadoRastreo estadoOrigen;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "estado_destino_id", nullable = false)
    private EstadoRastreo estadoDestino;

    @Column(name = "requiere_resolucion", nullable = false)
    @Builder.Default
    private Boolean requiereResolucion = false;

    @Column(name = "activo", nullable = false)
    @Builder.Default
    private Boolean activo = true;
}

