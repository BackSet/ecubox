package com.ecubox.ecubox_backend.entity;

import com.ecubox.ecubox_backend.enums.EstadoManifiesto;
import com.ecubox.ecubox_backend.enums.FiltroManifiesto;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "manifiesto")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Manifiesto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String codigo;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin", nullable = false)
    private LocalDate fechaFin;

    @Enumerated(EnumType.STRING)
    @Column(name = "filtro_tipo", nullable = false, length = 50)
    private FiltroManifiesto filtroTipo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "filtro_courier_entrega_id")
    private CourierEntrega filtroCourierEntrega;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "filtro_agencia_id")
    private Agencia filtroAgencia;

    @Column(name = "cantidad_despachos", nullable = false)
    @Builder.Default
    private Integer cantidadDespachos = 0;

    @Column(name = "subtotal_domicilio", nullable = false, precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal subtotalDomicilio = BigDecimal.ZERO;

    @Column(name = "subtotal_agencia_flete", nullable = false, precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal subtotalAgenciaFlete = BigDecimal.ZERO;

    @Column(name = "subtotal_comision_agencias", nullable = false, precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal subtotalComisionAgencias = BigDecimal.ZERO;

    @Column(name = "total_pagar", nullable = false, precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal totalPagar = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private EstadoManifiesto estado = EstadoManifiesto.PENDIENTE;

    @OneToMany(mappedBy = "manifiesto", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Despacho> despachos = new ArrayList<>();

    @Version
    @Column(nullable = false)
    private Long version;
}
