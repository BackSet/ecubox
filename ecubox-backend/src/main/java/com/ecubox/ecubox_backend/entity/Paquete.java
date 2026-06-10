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
    @JoinColumn(name = "consignatario_id", nullable = false)
    private Consignatario consignatario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "saca_id")
    private Saca saca;

    @Column(name = "fecha_estado_actual_desde")
    private LocalDateTime fechaEstadoActualDesde;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

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

    /**
     * Fecha limite de retiro persistida. Permite derivar el estado "vencido" como
     * predicado SQL ({@code fecha_limite_retiro < now()}) sin recalcular la logica
     * de cuenta regresiva por fila. Es {@code null} cuando el paquete esta en el
     * estado de fin de cuenta regresiva (entregado) o cuando aun no hay fecha
     * ancla / dias maximos de retiro resueltos. Se recalcula en cada cambio de
     * los insumos del plazo (transicion de estado, asignacion de saca/despacho).
     */
    @Column(name = "fecha_limite_retiro")
    private LocalDateTime fechaLimiteRetiro;

    @Version
    @Column(nullable = false)
    private Long version;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

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
