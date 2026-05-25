package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CanalesComunicacionDTO {

    private CanalComunicacionItemDTO email;
    private CanalComunicacionItemDTO telefono;
    private CanalComunicacionItemDTO whatsapp;
    private CanalComunicacionItemDTO facebook;
    private CanalComunicacionItemDTO instagram;
    private CanalComunicacionItemDTO tiktok;
    private CanalComunicacionItemDTO youtube;
    private CanalComunicacionItemDTO linkedin;
    private CanalComunicacionItemDTO x;
}
