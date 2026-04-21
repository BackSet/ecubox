package com.ecubox.ecubox_backend.entity;

import com.ecubox.ecubox_backend.enums.FiltroManifiesto;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Documento que agrupa los despachos enviados en un periodo (a domicilio,
 * agencia o punto de entrega del consignatario).
 *
 * <p>Es estrictamente un agrupador logistico/operativo: <strong>no</strong>
 * lleva importes ni estado de pago. Los costos y la liquidacion economica
 * los maneja el modulo de Liquidaciones (ver entidad {@code Liquidacion}).
 */
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

    /**
     * Conteo denormalizado de despachos asignados, mantenido por el servicio
     * al asignar/desasignar. Sirve para listados rapidos sin consultar la
     * tabla de despachos.
     */
    @Column(name = "cantidad_despachos", nullable = false)
    @Builder.Default
    private Integer cantidadDespachos = 0;

    @OneToMany(mappedBy = "manifiesto", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Despacho> despachos = new ArrayList<>();

    @Version
    @Column(nullable = false)
    private Long version;
}
