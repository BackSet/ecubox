package com.ecubox.ecubox_backend.entity;

import com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Documento de liquidación periódica.
 *
 * <p>El operario crea una liquidación cada cierto tiempo (típicamente mensual)
 * y agrega dos secciones independientes:
 * <ul>
 *     <li><strong>Sección A — Costos al proveedor (USA → EC):</strong>
 *         {@link LiquidacionConsolidadoLinea} por cada envío consolidado que el
 *         proveedor pide pagar; lleva costo del proveedor e ingreso del cliente.
 *         Genera el {@link #margenBruto}.</li>
 *     <li><strong>Sección B — Costos del courier de entrega (en EC):</strong>
 *         {@link LiquidacionDespachoLinea} por cada despacho enviado a destino;
 *         aplica la tarifa (kg incluidos + precio kg adicional) y suma
 *         {@link #totalCostoDistribucion}.</li>
 * </ul>
 *
 * <p>Las dos secciones son independientes: los despachos liquidados no
 * necesariamente contienen paquetes de los consolidados liquidados.
 * El {@link #ingresoNeto} es {@code margenBruto − totalCostoDistribucion}.
 */
@Entity
@Table(name = "liquidacion")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Liquidacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Código autogenerado tipo {@code LIQ-2026-0001}. */
    @Column(name = "codigo", nullable = false, length = 20, unique = true)
    private String codigo;

    @Column(name = "fecha_documento", nullable = false)
    private LocalDate fechaDocumento;

    @Column(name = "periodo_desde")
    private LocalDate periodoDesde;

    @Column(name = "periodo_hasta")
    private LocalDate periodoHasta;

    @Column(name = "notas", columnDefinition = "TEXT")
    private String notas;

    @Column(name = "margen_bruto", nullable = false, precision = 14, scale = 4)
    @Builder.Default
    private BigDecimal margenBruto = BigDecimal.ZERO;

    @Column(name = "total_costo_distribucion", nullable = false, precision = 14, scale = 4)
    @Builder.Default
    private BigDecimal totalCostoDistribucion = BigDecimal.ZERO;

    @Column(name = "ingreso_neto", nullable = false, precision = 14, scale = 4)
    @Builder.Default
    private BigDecimal ingresoNeto = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_pago", nullable = false, length = 20)
    @Builder.Default
    private EstadoPagoConsolidado estadoPago = EstadoPagoConsolidado.NO_PAGADO;

    @Column(name = "fecha_pago")
    private LocalDateTime fechaPago;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pagado_por_usuario_id")
    private Usuario pagadoPor;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    @Column(nullable = false)
    private Long version;

    @OneToMany(mappedBy = "liquidacion", fetch = FetchType.LAZY,
            cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<LiquidacionConsolidadoLinea> consolidados = new ArrayList<>();

    @OneToMany(mappedBy = "liquidacion", fetch = FetchType.LAZY,
            cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<LiquidacionDespachoLinea> despachos = new ArrayList<>();

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (fechaDocumento == null) fechaDocumento = LocalDate.now();
        if (estadoPago == null) estadoPago = EstadoPagoConsolidado.NO_PAGADO;
        if (margenBruto == null) margenBruto = BigDecimal.ZERO;
        if (totalCostoDistribucion == null) totalCostoDistribucion = BigDecimal.ZERO;
        if (ingresoNeto == null) ingresoNeto = BigDecimal.ZERO;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
