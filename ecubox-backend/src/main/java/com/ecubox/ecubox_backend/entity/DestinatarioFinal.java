package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;

@Entity
@Table(name = "destinatario_final")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
// Soft-delete: redefinimos el DELETE para marcar deleted_at en vez de borrar
// fisicamente, y filtramos automaticamente las filas borradas en todas las
// consultas JPA. Esto preserva los snapshots SCD2 referenciados por
// guias/despachos historicos.
@SQLDelete(sql = "UPDATE destinatario_final SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class DestinatarioFinal {

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
     * Soft-delete: si es NOT NULL el destinatario esta dado de baja.
     * Se aplica para no perder los snapshots historicos referenciados
     * desde guias/despachos.
     */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Version
    @Column(nullable = false)
    private Long version;
}
