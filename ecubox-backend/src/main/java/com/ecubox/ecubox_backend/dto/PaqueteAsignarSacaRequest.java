package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaqueteAsignarSacaRequest {

    /** ID de la saca a asignar; null para desasignar. */
    private Long sacaId;
}
