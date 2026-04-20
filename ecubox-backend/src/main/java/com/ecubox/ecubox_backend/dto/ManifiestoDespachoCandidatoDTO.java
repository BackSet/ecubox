package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ManifiestoDespachoCandidatoDTO {
    private Long id;
    private String numeroGuia;
    private String courierEntregaNombre;
    private String tipoEntrega;
    private String agenciaNombre;
    private String consignatarioNombre;
    private LocalDateTime fechaHora;
}
