package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvanceEstadosConsolidadosRequest {

    @NotEmpty(message = "Indique al menos un consolidado")
    private List<Long> consolidadoIds;

    @NotNull(message = "Seleccione la transición final")
    private String transicionFinalCodigo;

    @NotNull(message = "La fecha principal es obligatoria")
    private LocalDateTime fechaPrincipal;

    private Map<String, LocalDateTime> fechasPorTransicion;

    /** Obligatorio al aplicar; se obtiene desde el preview. */
    private String previewToken;
}
