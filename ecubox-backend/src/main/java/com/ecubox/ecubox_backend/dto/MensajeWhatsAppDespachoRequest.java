package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MensajeWhatsAppDespachoRequest {

    @NotNull(message = "La plantilla es obligatoria")
    private String plantilla;
}
