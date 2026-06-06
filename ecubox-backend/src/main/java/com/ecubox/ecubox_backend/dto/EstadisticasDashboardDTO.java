package com.ecubox.ecubox_backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record EstadisticasDashboardDTO(
        LocalDateTime generadoEn,
        LocalDate periodoDesde,
        LocalDate periodoHasta,
        int diasMaxSinDespachar,
        Resumen resumen,
        List<SerieMensual> despachosPorMes,
        List<SerieMensual> paquetesRegistradosPorMes,
        List<DistribucionEstado> paquetesPorEstado,
        List<PaqueteDemorado> paquetesDemorados
) {
    public record Resumen(
            long totalDespachos,
            long paquetesDespachados,
            long paquetesRegistrados,
            long pendientesDespacho,
            long demoradosSinDespachar,
            BigDecimal pesoDespachadoLbs,
            Double tiempoPromedioDespachoDias
    ) {
    }

    public record SerieMensual(
            String periodo,
            String etiqueta,
            long total,
            long paquetes,
            BigDecimal pesoLbs
    ) {
    }

    public record DistribucionEstado(
            Long estadoId,
            String codigo,
            String nombre,
            long total
    ) {
    }

    public record PaqueteDemorado(
            Long id,
            String numeroGuia,
            String referencia,
            String guiaMaster,
            Long guiaMasterId,
            String consignatario,
            String estado,
            LocalDateTime registradoEn,
            long diasSinDespachar,
            long diasAtraso
    ) {
    }
}
