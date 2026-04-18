package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GuiaMasterDashboardDTO {

    private Map<String, Long> conteosPorEstado;
    private Long totalActivas;
    private Long totalCerradas;
    private Long totalCerradasConFaltante;
    private Integer minPiezasParaDespachoParcial;
    private Integer diasParaAutoCierre;
    private Boolean requiereConfirmacionDespachoParcial;
    private List<GuiaMasterDTO> topAntiguasSinCompletar;
}
