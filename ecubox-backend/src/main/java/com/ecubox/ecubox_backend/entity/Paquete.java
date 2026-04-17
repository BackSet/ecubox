package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "paquete")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Paquete {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero_guia", nullable = false, unique = true, length = 100)
    private String numeroGuia;

    @Column(name = "numero_guia_envio", length = 100)
    private String numeroGuiaEnvio;

    @Column(name = "ref", nullable = false, unique = true, length = 100)
    private String ref;

    @Column(name = "peso_lbs", precision = 12, scale = 4)
    private BigDecimal pesoLbs;

    @Column(length = 500)
    private String contenido;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estado_rastreo_id", nullable = false)
    private EstadoRastreo estadoRastreo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destinatario_final_id", nullable = false)
    private DestinatarioFinal destinatarioFinal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "saca_id")
    private Saca saca;

    @Column(name = "fecha_estado_actual_desde")
    private LocalDateTime fechaEstadoActualDesde;

    @Column(name = "en_flujo_alterno", nullable = false)
    @Builder.Default
    private Boolean enFlujoAlterno = false;

    @Column(name = "motivo_alterno", columnDefinition = "TEXT")
    private String motivoAlterno;

    @Column(name = "bloqueado", nullable = false)
    @Builder.Default
    private Boolean bloqueado = false;

    @Column(name = "fecha_bloqueo_desde")
    private LocalDateTime fechaBloqueoDesde;
}
