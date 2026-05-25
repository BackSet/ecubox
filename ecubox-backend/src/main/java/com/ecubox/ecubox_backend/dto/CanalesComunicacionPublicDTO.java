package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CanalesComunicacionPublicDTO {

    private String email;
    private String telefono;
    private String whatsapp;
    private String facebook;
    private String instagram;
    private String tiktok;
    private String youtube;
    private String linkedin;
    private String x;
}
