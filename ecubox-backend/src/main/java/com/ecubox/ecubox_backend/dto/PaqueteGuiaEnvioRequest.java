package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaqueteGuiaEnvioRequest {

    /** Guía de envío del consolidador; null o vacío para quitar la asociación. */
    private String numeroGuiaEnvio;
}
