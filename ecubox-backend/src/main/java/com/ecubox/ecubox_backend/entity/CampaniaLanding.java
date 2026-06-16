package com.ecubox.ecubox_backend.entity;

import com.ecubox.ecubox_backend.enums.EstadoCampaniaLanding;
import com.ecubox.ecubox_backend.enums.TipoCampaniaLanding;
import com.ecubox.ecubox_backend.enums.TipoDestinoCta;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Campaña configurable de contenido destacado de la landing. Solo puede haber
 * una en estado {@link EstadoCampaniaLanding#PUBLICADA} a la vez (índice único
 * parcial {@code uq_campania_landing_publicada}). La vigencia
 * ({@code PROGRAMADA/VIGENTE/VENCIDA}) se deriva de las fechas y NO se persiste.
 */
@Entity
@Table(name = "campania_landing")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampaniaLanding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String codigo;

    @Column(name = "nombre_interno", nullable = false, length = 120)
    private String nombreInterno;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoCampaniaLanding estado;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoCampaniaLanding tipo;

    @Column(length = 40)
    private String etiqueta;

    @Column(length = 160)
    private String titulo;

    @Column(length = 500)
    private String descripcion;

    @Column(name = "texto_cta", length = 60)
    private String textoCta;

    @Column(name = "url_cta", length = 500)
    private String urlCta;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_destino_cta", length = 20)
    private TipoDestinoCta tipoDestinoCta;

    @Column(name = "imagen_url", length = 500)
    private String imagenUrl;

    @Column(name = "texto_alternativo_imagen", length = 200)
    private String textoAlternativoImagen;

    @Column(name = "fecha_inicio")
    private LocalDateTime fechaInicio;

    @Column(name = "fecha_fin")
    private LocalDateTime fechaFin;

    @Column(name = "publicada_at")
    private LocalDateTime publicadaAt;

    @Column(name = "publicada_por")
    private Long publicadaPor;

    @Column(name = "creada_at", nullable = false)
    private LocalDateTime creadaAt;

    @Column(name = "creada_por")
    private Long creadaPor;

    @Column(name = "actualizada_at", nullable = false)
    private LocalDateTime actualizadaAt;

    @Column(name = "actualizada_por")
    private Long actualizadaPor;

    @Version
    @Column(nullable = false)
    private Long version;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (creadaAt == null) creadaAt = now;
        if (actualizadaAt == null) actualizadaAt = now;
        if (estado == null) estado = EstadoCampaniaLanding.BORRADOR;
    }
}
