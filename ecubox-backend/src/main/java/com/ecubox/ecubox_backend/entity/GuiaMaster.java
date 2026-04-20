package com.ecubox.ecubox_backend.entity;

import com.ecubox.ecubox_backend.enums.EstadoGuiaMaster;
import com.ecubox.ecubox_backend.enums.TipoCierreGuiaMaster;
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
    @JoinColumn(name = "consignatario_id")
    private Consignatario consignatario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_usuario_id")
    private Usuario clienteUsuario;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_global", nullable = false, length = 40)
    @Builder.Default
    private EstadoGuiaMaster estadoGlobal = EstadoGuiaMaster.EN_ESPERA_RECEPCION;

    @Column(name = "fecha_primera_recepcion")
    private LocalDateTime fechaPrimeraRecepcion;

    @Column(name = "fecha_primera_pieza_despachada")
    private LocalDateTime fechaPrimeraPiezaDespachada;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    // ---------------------------------------------------------------------
    // Auditoria de cierre (V66)
    // ---------------------------------------------------------------------

    /** Fecha en que la guia paso a un estado terminal. */
    @Column(name = "cerrada_en")
    private LocalDateTime cerradaEn;

    /**
     * Usuario que cerro la guia. NULL para cierres automaticos por
     * sistema (timeout, recalculo).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cerrada_por_usuario_id")
    private Usuario cerradaPorUsuario;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_cierre", length = 40)
    private TipoCierreGuiaMaster tipoCierre;

    @Column(name = "motivo_cierre", columnDefinition = "TEXT")
    private String motivoCierre;

    // ---------------------------------------------------------------------
    // Snapshot del destinatario congelado (V67 - SCD Tipo 2)
    // ---------------------------------------------------------------------

    /**
     * Snapshot inmutable del destinatario al momento del primer despacho.
     * Mientras sea NULL, las lecturas resuelven al destinatario vivo
     * ({@link #consignatario}). Una vez congelado, las lecturas usan
     * esta version, garantizando que la direccion impresa no cambie si
     * el cliente edita despues.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "consignatario_version_id")
    private ConsignatarioVersion consignatarioVersion;

    @Column(name = "consignatario_congelado_en")
    private LocalDateTime consignatarioCongeladoEn;

    @Version
    @Column(nullable = false)
    private Long version;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (estadoGlobal == null) {
            estadoGlobal = EstadoGuiaMaster.EN_ESPERA_RECEPCION;
        }
    }
}
