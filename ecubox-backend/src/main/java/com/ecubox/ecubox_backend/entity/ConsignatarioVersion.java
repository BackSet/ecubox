package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Snapshot inmutable de un {@link Consignatario} en un momento dado
 * (Slowly Changing Dimension Tipo 2). Cada UPDATE del maestro cierra
 * la version vigente ({@code validTo = now()}) y crea una nueva con
 * {@code validTo = null}.
 *
 * <p>Las guias master y despachos referencian a esta version cuando los
 * datos del consignatario se "congelan" para garantizar que el envio se
 * imprima/despache con los datos historicos correctos.</p>
 */
@Entity
@Table(name = "consignatario_version")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsignatarioVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "consignatario_id", nullable = false)
    private Consignatario consignatario;

    @Column(nullable = false, length = 255)
    private String nombre;

    @Column(length = 50)
    private String telefono;

    @Column(columnDefinition = "TEXT")
    private String direccion;

    @Column(length = 100)
    private String provincia;

    @Column(length = 100)
    private String canton;

    @Column(length = 50)
    private String codigo;

    @Column(name = "valid_from", nullable = false)
    private LocalDateTime validFrom;

    /**
     * NULL = version vigente. Cuando se crea una nueva version se setea
     * con {@code now()} en la version anterior.
     */
    @Setter
    @Column(name = "valid_to")
    private LocalDateTime validTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_usuario_id")
    private Usuario createdByUsuario;
}
