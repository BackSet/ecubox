package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.TipoEntrega;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Resumen liviano del listado de despachos: KPIs del universo (total, hoy,
 * últimos 7 días, sacas, couriers de entrega), conteos por tipo de entrega
 * (respetando el filtro de courier y el rango de período activo) y opciones de
 * filtro (couriers y tipos presentes). Evita descargar todos los despachos solo
 * para la cabecera del listado.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DespachoResumenDTO {
    private long total;
    private long hoy;
    private long ultimos7d;
    private long sacas;
    private long couriersEntrega;
    /** Total que respeta courier + período (chip "Todos"). */
    private long tipoCountsTotal;
    /** Conteo por tipo respetando courier + período (chips de tipo). */
    private Map<TipoEntrega, Long> tipoCounts;
    private List<String> couriers;
    private List<TipoEntrega> tipos;
}
