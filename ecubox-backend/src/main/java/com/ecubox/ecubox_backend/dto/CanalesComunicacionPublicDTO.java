package com.ecubox.ecubox_backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "Canales de comunicación visibles en el sitio público")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CanalesComunicacionPublicDTO {

    @Schema(description = "Correo de contacto", example = "soporte@ecubox.com")
    private String email;
    @Schema(description = "Teléfono de contacto", example = "+593999999999")
    private String telefono;
    @Schema(description = "Enlace o número de WhatsApp")
    private String whatsapp;
    @Schema(description = "URL de Facebook")
    private String facebook;
    @Schema(description = "URL de Instagram")
    private String instagram;
    @Schema(description = "URL de TikTok")
    private String tiktok;
    @Schema(description = "URL de YouTube")
    private String youtube;
    @Schema(description = "URL de LinkedIn")
    private String linkedin;
    @Schema(description = "URL de X (Twitter)")
    private String x;
}
