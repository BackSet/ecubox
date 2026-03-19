package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;

@Entity
@Table(name = "estado_rastreo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EstadoRastreo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "codigo", nullable = false, unique = true, length = 50)
    private String codigo;

    @Column(name = "nombre", nullable = false, length = 255)
    private String nombre;

    @Column(name = "orden", nullable = false)
    @Builder.Default
    private Integer orden = 0;

    @Column(name = "orden_tracking", nullable = false)
    @Builder.Default
    private Integer ordenTracking = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "after_estado_id")
    private EstadoRastreo afterEstado;

    @Column(name = "activo", nullable = false)
    @Builder.Default
    private Boolean activo = true;

    @Column(name = "leyenda", columnDefinition = "TEXT")
    private String leyenda;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_flujo", nullable = false, length = 20)
    @Builder.Default
    private TipoFlujoEstado tipoFlujo = TipoFlujoEstado.NORMAL;

    @Column(name = "bloqueante", nullable = false)
    @Builder.Default
    private Boolean bloqueante = false;

    @Column(name = "publico_tracking", nullable = false)
    @Builder.Default
    private Boolean publicoTracking = true;
}
