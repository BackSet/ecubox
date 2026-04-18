package com.ecubox.ecubox_backend.projection;

import com.ecubox.ecubox_backend.enums.EstadoGuiaMaster;

/**
 * Proyeccion type-safe para el conteo agrupado de guias master por estado
 * global. Reemplaza el uso de {@code List<Object[]>} en
 * {@code GuiaMasterRepository.countAgrupadoPorEstado()}.
 */
public interface ConteoEstadoGuiaMasterView {
    EstadoGuiaMaster getEstado();
    Long getTotal();
}
