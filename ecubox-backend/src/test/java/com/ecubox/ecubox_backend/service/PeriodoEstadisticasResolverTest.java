package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadisticasConsulta;
import com.ecubox.ecubox_backend.enums.GranularidadEstadisticas;
import com.ecubox.ecubox_backend.enums.PresetPeriodoEstadisticas;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PeriodoEstadisticasResolverTest {

    private final PeriodoEstadisticasResolver resolver = new PeriodoEstadisticasResolver();

    private static EstadisticasConsulta preset(PresetPeriodoEstadisticas preset) {
        return new EstadisticasConsulta(preset, null, null, null, null, null, null);
    }

    @Test
    void esteMes_parcial_comparaMismoTramoMesAnterior() {
        LocalDate hoy = LocalDate.of(2026, 6, 13);
        var r = resolver.resolver(preset(PresetPeriodoEstadisticas.ESTE_MES), hoy);

        assertEquals(LocalDate.of(2026, 6, 1), r.desde());
        assertEquals(LocalDate.of(2026, 6, 14), r.hastaExclusivo());
        assertTrue(r.parcial());
        assertEquals(LocalDate.of(2026, 5, 1), r.anteriorDesde());
        assertEquals(LocalDate.of(2026, 5, 14), r.anteriorHastaExclusivo());
        assertEquals(GranularidadEstadisticas.DIARIA, r.granularidad());
    }

    @Test
    void esteMes_ultimoDia_noEsParcial() {
        LocalDate hoy = LocalDate.of(2026, 6, 30);
        var r = resolver.resolver(preset(PresetPeriodoEstadisticas.ESTE_MES), hoy);

        assertEquals(LocalDate.of(2026, 7, 1), r.hastaExclusivo());
        assertFalse(r.parcial());
    }

    @Test
    void esteMes_cambioDeAnio() {
        LocalDate hoy = LocalDate.of(2026, 1, 10);
        var r = resolver.resolver(preset(PresetPeriodoEstadisticas.ESTE_MES), hoy);

        assertEquals(LocalDate.of(2026, 1, 1), r.desde());
        assertEquals(LocalDate.of(2025, 12, 1), r.anteriorDesde());
        assertEquals(LocalDate.of(2025, 12, 11), r.anteriorHastaExclusivo());
    }

    @Test
    void mesAnterior_mesCalendarioCompleto() {
        LocalDate hoy = LocalDate.of(2026, 6, 13);
        var r = resolver.resolver(preset(PresetPeriodoEstadisticas.MES_ANTERIOR), hoy);

        assertEquals(LocalDate.of(2026, 5, 1), r.desde());
        assertEquals(LocalDate.of(2026, 6, 1), r.hastaExclusivo());
        assertFalse(r.parcial());
        assertEquals(LocalDate.of(2026, 4, 1), r.anteriorDesde());
        assertEquals(LocalDate.of(2026, 5, 1), r.anteriorHastaExclusivo());
    }

    @Test
    void mesEspecifico_anioBisiesto_febrero29Dias() {
        var consulta = new EstadisticasConsulta(
                PresetPeriodoEstadisticas.MES_ESPECIFICO, 2024, 2, null, null, null, null);
        var r = resolver.resolver(consulta, LocalDate.of(2026, 6, 13));

        assertEquals(LocalDate.of(2024, 2, 1), r.desde());
        assertEquals(LocalDate.of(2024, 3, 1), r.hastaExclusivo());
        assertEquals(LocalDate.of(2024, 1, 1), r.anteriorDesde());
        assertEquals(LocalDate.of(2024, 2, 1), r.anteriorHastaExclusivo());
    }

    @Test
    void mesEspecifico_futuro_lanza() {
        var consulta = new EstadisticasConsulta(
                PresetPeriodoEstadisticas.MES_ESPECIFICO, 2027, 1, null, null, null, null);
        assertThrows(BadRequestException.class,
                () -> resolver.resolver(consulta, LocalDate.of(2026, 6, 13)));
    }

    @Test
    void ultimos3Meses_granularidadSemanal() {
        var r = resolver.resolver(preset(PresetPeriodoEstadisticas.ULTIMOS_3_MESES),
                LocalDate.of(2026, 6, 13));

        assertEquals(LocalDate.of(2026, 4, 1), r.desde());
        assertEquals(LocalDate.of(2026, 6, 14), r.hastaExclusivo());
        assertEquals(LocalDate.of(2026, 1, 1), r.anteriorDesde());
        assertEquals(LocalDate.of(2026, 4, 1), r.anteriorHastaExclusivo());
        assertEquals(GranularidadEstadisticas.SEMANAL, r.granularidad());
    }

    @Test
    void ultimos6Meses_granularidadMensual() {
        var r = resolver.resolver(preset(PresetPeriodoEstadisticas.ULTIMOS_6_MESES),
                LocalDate.of(2026, 6, 13));

        assertEquals(LocalDate.of(2026, 1, 1), r.desde());
        assertEquals(GranularidadEstadisticas.MENSUAL, r.granularidad());
    }

    @Test
    void ultimos24Meses_siguenSiendoMensuales() {
        var r = resolver.resolver(preset(PresetPeriodoEstadisticas.ULTIMOS_24_MESES),
                LocalDate.of(2026, 6, 13));

        assertEquals(LocalDate.of(2024, 7, 1), r.desde());
        assertEquals(GranularidadEstadisticas.MENSUAL, r.granularidad());
    }

    @Test
    void esteAnio_comparaMismoTramoAnioAnterior() {
        var r = resolver.resolver(preset(PresetPeriodoEstadisticas.ESTE_ANIO),
                LocalDate.of(2026, 6, 13));

        assertEquals(LocalDate.of(2026, 1, 1), r.desde());
        assertEquals(LocalDate.of(2026, 6, 14), r.hastaExclusivo());
        assertEquals(LocalDate.of(2025, 1, 1), r.anteriorDesde());
        assertEquals(LocalDate.of(2025, 6, 14), r.anteriorHastaExclusivo());
        assertTrue(r.parcial());
    }

    @Test
    void anioAnterior_anioCalendarioCompleto() {
        var r = resolver.resolver(preset(PresetPeriodoEstadisticas.ANIO_ANTERIOR),
                LocalDate.of(2026, 6, 13));

        assertEquals(LocalDate.of(2025, 1, 1), r.desde());
        assertEquals(LocalDate.of(2026, 1, 1), r.hastaExclusivo());
        assertEquals(LocalDate.of(2024, 1, 1), r.anteriorDesde());
        assertEquals(LocalDate.of(2025, 1, 1), r.anteriorHastaExclusivo());
        assertFalse(r.parcial());
    }

    @Test
    void rangoPersonalizado_comparaRangoAnteriorDeIgualDuracion() {
        var consulta = new EstadisticasConsulta(
                null, null, null,
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 4, 1), null, null);
        var r = resolver.resolver(consulta, LocalDate.of(2026, 6, 13));

        assertEquals(PresetPeriodoEstadisticas.RANGO_PERSONALIZADO, r.preset());
        assertEquals(LocalDate.of(2026, 1, 1), r.desde());
        assertEquals(LocalDate.of(2026, 4, 1), r.hastaExclusivo());
        assertEquals(LocalDate.of(2026, 1, 1), r.anteriorHastaExclusivo());
        assertEquals(LocalDate.of(2025, 10, 3), r.anteriorDesde()); // 90 días antes
        assertEquals(GranularidadEstadisticas.SEMANAL, r.granularidad());
    }

    @Test
    void rangoPersonalizado_granularidadTrimestralEnRangosLargos() {
        var consulta = new EstadisticasConsulta(
                null, null, null,
                LocalDate.of(2024, 1, 1), LocalDate.of(2026, 3, 1), null, null);
        var r = resolver.resolver(consulta, LocalDate.of(2026, 6, 13));

        assertEquals(GranularidadEstadisticas.TRIMESTRAL, r.granularidad());
    }

    @Test
    void rangoPersonalizado_desdeMayorOIgualHasta_lanza() {
        var consulta = new EstadisticasConsulta(
                null, null, null,
                LocalDate.of(2026, 4, 1), LocalDate.of(2026, 4, 1), null, null);
        assertThrows(BadRequestException.class,
                () -> resolver.resolver(consulta, LocalDate.of(2026, 6, 13)));
    }

    @Test
    void rangoPersonalizado_fechaFutura_lanza() {
        var consulta = new EstadisticasConsulta(
                null, null, null,
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 7, 1), null, null);
        assertThrows(BadRequestException.class,
                () -> resolver.resolver(consulta, LocalDate.of(2026, 6, 13)));
    }

    @Test
    void rangoPersonalizado_superaMaximo_lanza() {
        var consulta = new EstadisticasConsulta(
                null, null, null,
                LocalDate.of(2023, 1, 1), LocalDate.of(2026, 1, 1), null, null);
        assertThrows(BadRequestException.class,
                () -> resolver.resolver(consulta, LocalDate.of(2026, 6, 13)));
    }

    @Test
    void granularidadDiariaForzadaEnRangoAmplio_lanza() {
        var consulta = new EstadisticasConsulta(
                PresetPeriodoEstadisticas.ULTIMOS_24_MESES, null, null, null, null,
                GranularidadEstadisticas.DIARIA, null);
        assertThrows(BadRequestException.class,
                () -> resolver.resolver(consulta, LocalDate.of(2026, 6, 13)));
    }

    @Test
    void granularidadForzadaSeRespetaCuandoEsCompatible() {
        var consulta = new EstadisticasConsulta(
                PresetPeriodoEstadisticas.ESTE_MES, null, null, null, null,
                GranularidadEstadisticas.SEMANAL, null);
        var r = resolver.resolver(consulta, LocalDate.of(2026, 6, 13));

        assertEquals(GranularidadEstadisticas.SEMANAL, r.granularidad());
    }

    @Test
    void legadoMeses_seMapeaAPreset() {
        var consulta = new EstadisticasConsulta(null, null, null, null, null, null, 6);
        var r = resolver.resolver(consulta, LocalDate.of(2026, 6, 13));

        assertEquals(PresetPeriodoEstadisticas.ULTIMOS_6_MESES, r.preset());
    }

    @Test
    void sinParametros_usaUltimos12MesesPorDefecto() {
        var consulta = new EstadisticasConsulta(null, null, null, null, null, null, null);
        var r = resolver.resolver(consulta, LocalDate.of(2026, 6, 13));

        assertEquals(PresetPeriodoEstadisticas.ULTIMOS_12_MESES, r.preset());
    }
}
