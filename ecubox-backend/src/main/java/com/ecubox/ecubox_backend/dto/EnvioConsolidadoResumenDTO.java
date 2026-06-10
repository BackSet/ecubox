package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.EstadoEnvioConsolidadoOperativo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Resumen liviano del listado de envíos consolidados: total, conteo por estado
 * operativo (para KPIs y chips) y desglose por estado de pago. Evita descargar
 * el dataset completo solo para alimentar la cabecera del listado.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnvioConsolidadoResumenDTO {
    private long total;
    private Map<EstadoEnvioConsolidadoOperativo, Long> porOperativo;
    private long pagados;
    private long noPagados;
}
