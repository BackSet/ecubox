package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Resumen liviano del listado de lotes de recepción: KPIs (total, paquetes
 * recibidos, guías únicas, lotes de hoy) y opciones de filtro (operarios
 * distintos). Evita descargar todos los lotes —con su cálculo de paquetes por
 * guía— solo para alimentar la cabecera del listado.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoteRecepcionResumenDTO {
    private long total;
    private long paquetes;
    private long guiasUnicas;
    private long hoy;
    private List<String> operarios;
}
