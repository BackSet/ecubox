package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Courier de entrega: empresa de paqueteria de ultima milla que entrega
 * los paquetes al consignatario en Ecuador (Servientrega, Laar, Tramaco,
 * etc.). Equivale al "carrier" de la industria courier internacional.
 */
@Entity
@Table(name = "courier_entrega")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourierEntrega {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String nombre;

    /** Getter explicito para compatibilidad con IDEs que no procesan Lombok. */
    public String getNombre() {
        return nombre;
    }

    @Column(nullable = false, unique = true, length = 50)
    private String codigo;

    @Column(length = 255)
    private String email;

    @Column(name = "tarifa_envio", nullable = false, precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal tarifaEnvio = BigDecimal.ZERO;

    @Column(name = "horario_reparto", columnDefinition = "TEXT")
    private String horarioReparto;

    @Column(name = "pagina_tracking", columnDefinition = "TEXT")
    private String paginaTracking;

    @Column(name = "dias_max_retiro_domicilio")
    private Integer diasMaxRetiroDomicilio;
}
