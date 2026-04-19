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
    /** DESPACHO_COMPLETADO. */
    private Long totalCerradas;
    /** DESPACHO_INCOMPLETO (cierre manual o por timeout). */
    private Long totalCerradasConFaltante;
    /** CANCELADA (anulaciones administrativas). */
    private Long totalCanceladas;
    /** EN_REVISION (pausa administrativa, no terminal). */
    private Long totalEnRevision;
    private Integer minPiezasParaDespachoParcial;
    private Integer diasParaAutoCierre;
    private Boolean requiereConfirmacionDespachoParcial;
    private List<GuiaMasterDTO> topAntiguasSinCompletar;
}
