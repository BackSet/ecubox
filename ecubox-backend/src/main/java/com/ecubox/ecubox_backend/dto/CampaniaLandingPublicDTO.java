package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.TipoCampaniaLanding;
import com.ecubox.ecubox_backend.enums.TipoDestinoCta;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Proyección pública de la campaña vigente. Solo campos visibles: NO expone
 * actor, nombre interno, estado técnico, versión ni auditoría.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampaniaLandingPublicDTO {

    private String codigo;
    private TipoCampaniaLanding tipo;
    private String etiqueta;
    private String titulo;
    private String descripcion;
    private String textoCta;
    private String urlCta;
    private TipoDestinoCta tipoDestinoCta;
    private String imagenUrl;
    private String textoAlternativoImagen;
}
