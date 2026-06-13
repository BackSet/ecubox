package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Enlace de acceso sin registro acotado a un CONJUNTO de consignatarios.
 *
 * Da acceso de solo lectura a las guías/paquetes de esos consignatarios, sin
 * impersonar a ningún usuario ni exponer el panel. Lo genera un administrador
 * u operario. Solo se persiste el hash del token; el valor en claro se entrega
 * una única vez al generarlo.
 */
@Entity
@Table(name = "acceso_enlace")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccesoEnlace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Identificador de negocio visible y estable (formato {@code ACC-000001}).
     * Se asigna automáticamente al generar el enlace y no es editable. Es solo
     * de presentación/búsqueda: NO autentica el acceso (eso lo hace el token).
     */
    @Column(nullable = false, unique = true, length = 20)
    private String codigo;

    /** SHA-256 (hex) del token; índice único de búsqueda en el canje. */
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    /** Token en claro, para poder volver a copiar el enlace tras crearlo. */
    @Column(length = 64)
    private String token;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoAccesoEnlace tipo;

    /** Etiqueta opcional para identificar el enlace (ej. nombre del cliente). */
    @Column(length = 120)
    private String etiqueta;

    /** Caducidad para enlaces temporales; {@code null} en los persistentes. */
    @Column(name = "expira_at")
    private LocalDateTime expiraAt;

    @Column(name = "revocado_at")
    private LocalDateTime revocadoAt;

    /** Usuario admin/operario que generó el enlace (auditoría). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creado_por_usuario_id")
    private Usuario creadoPor;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "ultimo_acceso_at")
    private LocalDateTime ultimoAccesoAt;

    /** Consignatarios cubiertos por el enlace. */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "acceso_enlace_consignatario",
            joinColumns = @JoinColumn(name = "acceso_enlace_id"),
            inverseJoinColumns = @JoinColumn(name = "consignatario_id")
    )
    @Builder.Default
    private Set<Consignatario> consignatarios = new HashSet<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    /** Indica si el enlace sigue vigente (no revocado y no caducado). */
    @Transient
    public boolean isVigente() {
        if (revocadoAt != null) {
            return false;
        }
        return expiraAt == null || expiraAt.isAfter(LocalDateTime.now());
    }
}
