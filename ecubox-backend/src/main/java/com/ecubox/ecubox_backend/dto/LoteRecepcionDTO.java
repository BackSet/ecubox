package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoteRecepcionDTO {

    private Long id;
    private LocalDateTime fechaRecepcion;
    private String observaciones;
    private Long operarioId;
    private String operarioNombre;
    private List<String> numeroGuiasEnvio;
    private List<PaqueteDTO> paquetes;
    private Integer totalPaquetes;
}
