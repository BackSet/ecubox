package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.EstadoCampaniaLanding;
import com.ecubox.ecubox_backend.enums.TipoCampaniaLanding;
import com.ecubox.ecubox_backend.enums.TipoDestinoCta;
import com.ecubox.ecubox_backend.enums.VigenciaCampaniaLanding;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** Vista administrativa completa de una campaña (incluye auditoría y versión). */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampaniaLandingDTO {

    private Long id;
    private String codigo;
    private String nombreInterno;
    private EstadoCampaniaLanding estado;
    /** Vigencia derivada (solo informativa, presente cuando estado = PUBLICADA). */
    private VigenciaCampaniaLanding vigencia;
    private TipoCampaniaLanding tipo;
    private String etiqueta;
    private String titulo;
    private String descripcion;
    private String textoCta;
    private String urlCta;
    private TipoDestinoCta tipoDestinoCta;
    private String imagenUrlClaro;
    private String imagenUrlOscuro;
    private String textoAlternativoImagen;
    private LocalDateTime fechaInicio;
    private LocalDateTime fechaFin;
    private LocalDateTime publicadaAt;
    private Long publicadaPor;
    private String publicadaPorNombre;
    private LocalDateTime creadaAt;
    private Long creadaPor;
    private LocalDateTime actualizadaAt;
    private Long actualizadaPor;
    private String actualizadaPorNombre;
    private Long version;
}
