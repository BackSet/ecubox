package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.TipoCampaniaLanding;
import com.ecubox.ecubox_backend.enums.TipoDestinoCta;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Cuerpo de creación/actualización de una campaña. Las validaciones de longitud
 * y obligatoriedad básica viven aquí; las reglas cruzadas (CTA todo-o-nada,
 * HTTPS, alt con imagen, fechas coherentes, título al publicar) se validan en el
 * servicio para devolver mensajes claros. {@code version} habilita el control de
 * concurrencia optimista en la actualización.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampaniaLandingRequest {

    @NotBlank(message = "El nombre interno es obligatorio")
    @Size(max = 120, message = "El nombre interno admite máximo 120 caracteres")
    private String nombreInterno;

    @NotNull(message = "El tipo es obligatorio")
    private TipoCampaniaLanding tipo;

    @Size(max = 40, message = "La etiqueta admite máximo 40 caracteres")
    private String etiqueta;

    @Size(max = 160, message = "El título admite máximo 160 caracteres")
    private String titulo;

    @Size(max = 500, message = "La descripción admite máximo 500 caracteres")
    private String descripcion;

    @Size(max = 60, message = "El texto del CTA admite máximo 60 caracteres")
    private String textoCta;

    @Size(max = 500, message = "La URL del CTA admite máximo 500 caracteres")
    private String urlCta;

    private TipoDestinoCta tipoDestinoCta;

    @Size(max = 500, message = "La URL de la imagen (modo claro) admite máximo 500 caracteres")
    private String imagenUrlClaro;

    @Size(max = 500, message = "La URL de la imagen (modo oscuro) admite máximo 500 caracteres")
    private String imagenUrlOscuro;

    @Size(max = 200, message = "El texto alternativo admite máximo 200 caracteres")
    private String textoAlternativoImagen;

    private LocalDateTime fechaInicio;
    private LocalDateTime fechaFin;

    /** Versión esperada (optimistic locking) en actualización. */
    private Long version;
}
