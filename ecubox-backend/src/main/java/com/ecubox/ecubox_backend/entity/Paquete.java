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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guia_master_id")
    private GuiaMaster guiaMaster;

    @Column(name = "pieza_numero")
    private Integer piezaNumero;

    @Column(name = "pieza_total")
    private Integer piezaTotal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "envio_consolidado_id")
    private EnvioConsolidado envioConsolidado;

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

    @Version
    @Column(nullable = false)
    private Long version;

    /**
     * Genera el {@code numeroGuia} canonico de un paquete a partir del tracking base
     * de su guia master y la posicion de pieza dentro del lote.
     * Formato: {@code "<trackingBase> <piezaNumero>/<piezaTotal>"}.
     */
    public static String componerNumeroGuia(String trackingBase, int piezaNumero, int piezaTotal) {
        if (trackingBase == null || trackingBase.isBlank()) {
            throw new IllegalArgumentException("trackingBase requerido");
        }
        if (piezaTotal < 1 || piezaNumero < 1 || piezaNumero > piezaTotal) {
            throw new IllegalArgumentException(
                    "pieza fuera de rango (piezaNumero=" + piezaNumero + ", piezaTotal=" + piezaTotal + ")");
        }
        return trackingBase.trim() + " " + piezaNumero + "/" + piezaTotal;
    }
}
