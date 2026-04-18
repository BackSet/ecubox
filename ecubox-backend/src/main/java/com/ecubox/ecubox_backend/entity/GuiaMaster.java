package com.ecubox.ecubox_backend.entity;

import com.ecubox.ecubox_backend.enums.EstadoGuiaMaster;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "guia_master")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GuiaMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tracking_base", nullable = false, unique = true, length = 100)
    private String trackingBase;

    @Column(name = "total_piezas_esperadas")
    private Integer totalPiezasEsperadas;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destinatario_final_id")
    private DestinatarioFinal destinatarioFinal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_usuario_id")
    private Usuario clienteUsuario;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_global", nullable = false, length = 40)
    @Builder.Default
    private EstadoGuiaMaster estadoGlobal = EstadoGuiaMaster.INCOMPLETA;

    @Column(name = "fecha_primera_recepcion")
    private LocalDateTime fechaPrimeraRecepcion;

    @Column(name = "fecha_primera_pieza_despachada")
    private LocalDateTime fechaPrimeraPiezaDespachada;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Version
    @Column(nullable = false)
    private Long version;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (estadoGlobal == null) {
            estadoGlobal = EstadoGuiaMaster.INCOMPLETA;
        }
    }
}
