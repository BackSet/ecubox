package com.ecubox.ecubox_backend.entity;

import com.ecubox.ecubox_backend.enums.EstadoGuiaMaster;
import com.ecubox.ecubox_backend.enums.TipoCambioEstadoGuiaMaster;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Registro inmutable de un cambio de {@code estado_global} sobre una
 * {@link GuiaMaster}. Se inserta una fila por cada transicion, sea
 * automatica (recalculo) o manual (cierre, cancelacion, revision,
 * reapertura).
 *
 * <p>No expone setters publicos para tipo_cambio/estados/fecha porque
 * la tabla es append-only desde el dominio.
 */
@Entity
@Table(name = "guia_master_estado_historial")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GuiaMasterEstadoHistorial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "guia_master_id", nullable = false)
    private GuiaMaster guiaMaster;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_anterior", length = 40)
    private EstadoGuiaMaster estadoAnterior;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_nuevo", length = 40, nullable = false)
    private EstadoGuiaMaster estadoNuevo;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_cambio", length = 40, nullable = false)
    private TipoCambioEstadoGuiaMaster tipoCambio;

    @Column(name = "motivo", columnDefinition = "TEXT")
    private String motivo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cambiado_por_usuario_id")
    private Usuario cambiadoPorUsuario;

    @Column(name = "cambiado_en", nullable = false)
    private LocalDateTime cambiadoEn;

    @PrePersist
    void onCreate() {
        if (cambiadoEn == null) {
            cambiadoEn = LocalDateTime.now();
        }
    }
}
