package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;

/**
 * Consignatario: persona o empresa que recibe el paquete en Ecuador.
 * Pertenece a un usuario (cliente del casillero). En vista del cliente
 * final se muestra como "Destinatario"; en operacion y back-office se
 * usa el termino canonico "Consignatario" (alineado con la jerga
 * aduanera de la industria courier).
 */
@Entity
@Table(name = "consignatario")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLDelete(sql = "UPDATE consignatario SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class Consignatario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

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

    /**
     * Soft-delete: si es NOT NULL el consignatario esta dado de baja.
     * Se aplica para no perder los snapshots historicos referenciados
     * desde guias/despachos.
     */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Version
    @Column(nullable = false)
    private Long version;
}
