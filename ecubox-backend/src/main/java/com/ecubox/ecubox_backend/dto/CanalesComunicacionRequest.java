package com.ecubox.ecubox_backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CanalesComunicacionRequest {

    @NotNull
    @Valid
    private CanalComunicacionItemDTO email;

    @NotNull
    @Valid
    private CanalComunicacionItemDTO telefono;

    @NotNull
    @Valid
    private CanalComunicacionItemDTO whatsapp;

    @NotNull
    @Valid
    private CanalComunicacionItemDTO facebook;

    @NotNull
    @Valid
    private CanalComunicacionItemDTO instagram;

    @NotNull
    @Valid
    private CanalComunicacionItemDTO tiktok;

    @NotNull
    @Valid
    private CanalComunicacionItemDTO youtube;

    @NotNull
    @Valid
    private CanalComunicacionItemDTO linkedin;

    @NotNull
    @Valid
    private CanalComunicacionItemDTO x;
}
