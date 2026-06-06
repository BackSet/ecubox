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
        List<PaqueteDemorado> paquetesDemorados,
        List<PaqueteInconsistente> paquetesEntregadosSinDespacho,
        List<ExcepcionOperativa> excepcionesOperativas
) {
    public record Resumen(
            long totalDespachos,
            long paquetesDespachados,
            long paquetesRegistrados,
            long pendientesDespacho,
            long demoradosSinDespachar,
            long entregadosSinDespacho,
            long excepcionesOperativas,
            BigDecimal pesoDespachadoLbs,
            Double tiempoPromedioDespachoDias,
            BigDecimal margenBruto,
            BigDecimal costoDistribucion,
            BigDecimal ingresoNetoAproximado
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

    public record PaqueteInconsistente(
            Long id,
            String numeroGuia,
            String referencia,
            String guiaMaster,
            Long guiaMasterId,
            String consignatario,
            String estado,
            LocalDateTime registradoEn
    ) {
    }

    public record ExcepcionOperativa(
            String severidad,
            String modulo,
            String entidadTipo,
            Long entidadId,
            String referencia,
            String codigo,
            String titulo,
            String detalle,
            String ruta
    ) {
    }
}
