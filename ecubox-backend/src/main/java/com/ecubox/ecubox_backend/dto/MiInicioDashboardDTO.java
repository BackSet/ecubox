package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Resumen agregado para el inicio del cliente final.
 * Incluye conteos por estado de sus guías, totales y listas compactas
 * (recientes y próximas a despacharse) para mostrar en /inicio.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MiInicioDashboardDTO {

    /** Conteos por estado (clave: nombre del enum {@code EstadoGuiaMaster}). */
    private Map<String, Long> conteosPorEstado;

    private long totalGuias;
    private long totalGuiasActivas;
    private long totalGuiasCerradas;

    /** Guías cuyo {@code totalPiezasEsperadas} aún no fue completado por el operario. */
    private long totalGuiasSinTotalDefinido;

    private long totalDestinatarios;

    /** Suma de piezas registradas pero aún no despachadas en guías activas del cliente. */
    private long piezasEnTransito;

    /** Top 5 guías más recientes (por {@code createdAt} descendente). */
    private List<GuiaMasterDTO> guiasRecientes;

    /** Top 5 guías que ya están listas para despacho parcial o totalmente recibidas. */
    private List<GuiaMasterDTO> guiasProximasACerrar;
}
