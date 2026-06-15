package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadisticasConsulta;
import com.ecubox.ecubox_backend.dto.EstadisticasDashboardDTO;
import com.ecubox.ecubox_backend.enums.DisponibilidadMetrica;
import com.ecubox.ecubox_backend.entity.Consignatario;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.enums.GranularidadEstadisticas;
import com.ecubox.ecubox_backend.enums.PresetPeriodoEstadisticas;
import com.ecubox.ecubox_backend.repository.EstadoRastreoRepository;
import com.ecubox.ecubox_backend.repository.EstadisticasExcepcionRepository;
import com.ecubox.ecubox_backend.repository.LiquidacionRepository;
import com.ecubox.ecubox_backend.repository.PaqueteEstadoEventoRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EstadisticasServiceTest {

    @Mock
    private PaqueteRepository paqueteRepository;
    @Mock
    private PaqueteEstadoEventoRepository paqueteEstadoEventoRepository;
    @Mock
    private EstadoRastreoRepository estadoRastreoRepository;
    @Mock
    private EstadisticasExcepcionRepository excepcionRepository;
    @Mock
    private LiquidacionRepository liquidacionRepository;
    @Mock
    private ParametroSistemaService parametroSistemaService;

    private EstadisticasService service;

    /** Estado configurado como "despacho"; solo para SIN_CONFIGURACION y orden operativo. */
    private static final Long ESTADO_DESPACHO_ID = 4L;
    /** Ancla canónica ESTABLE de la métrica: event_type semántico (no el id mutable). */
    private static final String EVENTO = "ESTADO_APLICADO_DESPACHO";
    private static final LocalDateTime DESDE = LocalDateTime.of(2020, 1, 1, 0, 0);
    private static final LocalDateTime HASTA = LocalDateTime.of(2020, 2, 1, 0, 0);
    private static final LocalDateTime ANT_DESDE = LocalDateTime.of(2019, 12, 1, 0, 0);
    private static final LocalDateTime ANT_HASTA = LocalDateTime.of(2020, 1, 1, 0, 0);

    @BeforeEach
    void setUp() {
        service = new EstadisticasService(
                paqueteRepository,
                paqueteEstadoEventoRepository,
                estadoRastreoRepository,
                excepcionRepository,
                liquidacionRepository,
                parametroSistemaService,
                new PeriodoEstadisticasResolver());
        stubEstadoActual();
        stubTasas();
        // Cobertura por defecto: amplia (cubre el periodo de prueba) => COMPLETA.
        when(paqueteEstadoEventoRepository.coberturaDespachados(any())).thenReturn(new Object[]{
                Timestamp.valueOf("2019-01-01 00:00:00"), Timestamp.valueOf("2020-12-31 00:00:00"), 100L});
    }

    private void stubEstadoActual() {
        when(parametroSistemaService.getEstadosRastreoPorPunto()).thenReturn(
                EstadosRastreoPorPuntoDTO.builder().estadoRastreoEnDespachoId(ESTADO_DESPACHO_ID).build());
        when(estadoRastreoRepository.findMaxOrdenTrackingActivoByTipoFlujo(any())).thenReturn(8);
        when(estadoRastreoRepository.findById(ESTADO_DESPACHO_ID)).thenReturn(Optional.of(
                EstadoRastreo.builder().id(ESTADO_DESPACHO_ID).ordenTracking(4).build()));
        when(paqueteRepository.countPendientesDespacho(8)).thenReturn(6L);
        when(paqueteRepository.countDemoradosSinDespachar(any(LocalDate.class), eq(12), eq(8)))
                .thenReturn(1L);
        when(paqueteRepository.countEntregadosSinDespacho(8)).thenReturn(2L);
        when(excepcionRepository.countExcepciones(4, 8)).thenReturn(3L);
        when(paqueteRepository.aggregateByEstado()).thenReturn(List.<Object[]>of(
                new Object[]{1L, "REGISTRADO", "Registrado", 6L}));
        when(paqueteRepository.findDemoradosSinDespachar(
                any(LocalDate.class), eq(12), eq(8), any(Pageable.class)))
                .thenReturn(List.of(Paquete.builder()
                        .id(10L).numeroGuia("GUIA-10").ref("REF-10")
                        .createdAt(LocalDateTime.of(2020, 1, 5, 0, 0))
                        .consignatario(Consignatario.builder().nombre("Cliente prueba").build())
                        .estadoRastreo(EstadoRastreo.builder().nombre("Registrado").build())
                        .build()));
        when(paqueteRepository.findEntregadosSinDespacho(eq(8), any(Pageable.class)))
                .thenReturn(List.of(Paquete.builder()
                        .id(11L).numeroGuia("GUIA-11").ref("REF-11")
                        .createdAt(LocalDateTime.of(2020, 1, 6, 0, 0))
                        .consignatario(Consignatario.builder().nombre("Cliente entregado").build())
                        .estadoRastreo(EstadoRastreo.builder().nombre("Entregado a destinatario").build())
                        .build()));
        when(excepcionRepository.findExcepciones(4, 8, 200)).thenReturn(List.<Object[]>of(
                new Object[]{"ALTA", "Paquetes", "PAQUETE", 12L, "GUIA-12",
                        "PAQUETE_DESPACHADO_ESTADO_ANTERIOR", "Despachado con estado anterior",
                        "Pertenece a un despacho, pero su estado es Registrado.",
                        "/tracking?codigo=GUIA-12"}));
    }

    private void stubTasas() {
        var tasas = mock(LiquidacionRepository.TasasEstimacionProjection.class);
        when(tasas.getMargenPorLibra()).thenReturn(new BigDecimal("8.5"));
        when(tasas.getCostoDistribucionPorLibra()).thenReturn(new BigDecimal("2.1"));
        when(liquidacionRepository.findTasasEstimacionHistoricas()).thenReturn(tasas);
    }

    /** Stubs comunes de registro (no dependen del caso de despacho). */
    private void stubRegistros(long actual, long anterior, String pesoActual, String pesoAnterior) {
        when(paqueteRepository.countRegistradosEntre(eq(DESDE), eq(HASTA))).thenReturn(actual);
        when(paqueteRepository.countRegistradosEntre(eq(ANT_DESDE), eq(ANT_HASTA))).thenReturn(anterior);
        when(paqueteRepository.sumPesoRegistradoEntre(eq(DESDE), eq(HASTA)))
                .thenReturn(new BigDecimal(pesoActual));
        when(paqueteRepository.sumPesoRegistradoEntre(eq(ANT_DESDE), eq(ANT_HASTA)))
                .thenReturn(new BigDecimal(pesoAnterior));
        when(paqueteRepository.aggregateRegistradosByPeriodo(any(), any(), any()))
                .thenReturn(List.of());
    }

    private static EstadisticasConsulta enero2020() {
        return new EstadisticasConsulta(
                null, null, null, LocalDate.of(2020, 1, 1), LocalDate.of(2020, 2, 1), null, null);
    }

    @Test
    void paquetesDespachados_usaEventoCanonico_noEntidadDespacho() {
        // Fuente canónica: resumen de eventos de despacho (paquetes únicos + peso).
        when(paqueteEstadoEventoRepository.resumenDespachadosEntre(EVENTO, DESDE, HASTA))
                .thenReturn(new Object[]{25L, new BigDecimal("500.0")});
        when(paqueteEstadoEventoRepository.resumenDespachadosEntre(EVENTO, ANT_DESDE, ANT_HASTA))
                .thenReturn(new Object[]{12L, new BigDecimal("250.0")});
        when(paqueteEstadoEventoRepository.avgDiasPrimerDespachoEntre(EVENTO, DESDE, HASTA))
                .thenReturn(3.0);
        when(paqueteEstadoEventoRepository.avgDiasPrimerDespachoEntre(EVENTO, ANT_DESDE, ANT_HASTA))
                .thenReturn(2.0);
        when(paqueteEstadoEventoRepository.aggregateDespachadosByPeriodo(
                eq("day"), eq(EVENTO), eq(DESDE), eq(HASTA)))
                .thenReturn(List.<Object[]>of(
                        new Object[]{Timestamp.valueOf("2020-01-05 00:00:00"), 9L, new BigDecimal("25.5")}));
        stubRegistros(40L, 20L, "800.00", "400.00");

        EstadisticasDashboardDTO result = service.dashboard(enero2020());

        // Periodo normalizado y granularidad diaria
        assertEquals(PresetPeriodoEstadisticas.RANGO_PERSONALIZADO, result.periodo().preset());
        assertEquals(GranularidadEstadisticas.DIARIA, result.granularidad());

        var despachados = result.resultados().paquetesDespachados();
        assertEquals(0, despachados.actual().compareTo(BigDecimal.valueOf(25)));
        assertEquals(0, despachados.anterior().compareTo(BigDecimal.valueOf(12)));
        assertEquals(0, despachados.diferencia().compareTo(BigDecimal.valueOf(13)));
        assertTrue(despachados.comparacionDisponible());

        // Peso despachado proviene del evento (no del peso registrado)
        assertEquals(0, result.resultados().pesoDespachadoLbs().actual().compareTo(new BigDecimal("500.0")));

        // Tiempo promedio (días) desde el evento canónico
        assertEquals(0, result.resultados().tiempoPromedioDespachoDias().actual()
                .compareTo(new BigDecimal("3.0")));

        // Series diarias: 31 puntos en enero; el punto 2020-01-05 trae 9 paquetes
        assertEquals(31, result.resultados().paquetesDespachadosSerie().size());
        assertEquals(31, result.resultados().registrosSerie().size());
        assertEquals(9, result.resultados().paquetesDespachadosSerie().stream()
                .filter(p -> p.periodo().equals("2020-01-05")).findFirst().orElseThrow().total());

        // Registrados y financieras estimadas
        assertEquals(0, result.resultados().paquetesRegistrados().actual().compareTo(BigDecimal.valueOf(40)));
        assertEquals(0, result.resultados().margenBruto().actual().compareTo(new BigDecimal("6800.0000")));
    }

    @Test
    void ceroReal_distintoDeNoCalculable() {
        // Cero real: hubo consulta válida pero sin paquetes despachados.
        when(paqueteEstadoEventoRepository.resumenDespachadosEntre(any(), any(), any()))
                .thenReturn(new Object[]{0L, BigDecimal.ZERO});
        // Promedio NO calculable: sin paquetes despachados con fechas válidas.
        when(paqueteEstadoEventoRepository.avgDiasPrimerDespachoEntre(any(), any(), any()))
                .thenReturn(null);
        when(paqueteEstadoEventoRepository.aggregateDespachadosByPeriodo(any(), any(), any(), any()))
                .thenReturn(List.of());
        stubRegistros(0L, 0L, "0", "0");

        var result = service.dashboard(enero2020());

        // Paquetes despachados: CERO real (no null)
        assertEquals(0, result.resultados().paquetesDespachados().actual().compareTo(BigDecimal.ZERO));
        // Sin actividad en ambos periodos => no hay comparación
        assertFalse(result.resultados().paquetesDespachados().comparacionDisponible());
        // Tiempo promedio: NO calculable => null (no se convierte en cero)
        assertNull(result.resultados().tiempoPromedioDespachoDias().actual());
        assertFalse(result.resultados().tiempoPromedioDespachoDias().comparacionDisponible());
        // La serie se rellena con puntos en cero (no se omite el rango)
        assertEquals(31, result.resultados().paquetesDespachadosSerie().size());
        assertTrue(result.resultados().paquetesDespachadosSerie().stream().allMatch(p -> p.total() == 0));
        // Cero REAL: disponibilidad COMPLETA (hay cobertura), no SIN_HISTORIAL.
        assertEquals(DisponibilidadMetrica.COMPLETA, result.disponibilidadDespacho().estado());
    }

    @Test
    void disponibilidad_sinConfiguracion_cuandoNoHayHitoNiEventos() {
        when(parametroSistemaService.getEstadosRastreoPorPunto()).thenReturn(
                EstadosRastreoPorPuntoDTO.builder().estadoRastreoEnDespachoId(null).build());
        when(paqueteEstadoEventoRepository.resumenDespachadosEntre(any(), any(), any()))
                .thenReturn(new Object[]{0L, BigDecimal.ZERO});
        when(paqueteEstadoEventoRepository.avgDiasPrimerDespachoEntre(any(), any(), any())).thenReturn(null);
        when(paqueteEstadoEventoRepository.aggregateDespachadosByPeriodo(any(), any(), any(), any()))
                .thenReturn(List.of());
        when(paqueteEstadoEventoRepository.coberturaDespachados(any()))
                .thenReturn(new Object[]{null, null, 0L});
        stubRegistros(0L, 0L, "0", "0");

        var d = service.dashboard(enero2020()).disponibilidadDespacho();
        assertEquals(DisponibilidadMetrica.SIN_CONFIGURACION, d.estado());
        assertNotNull(d.advertencia());
    }

    @Test
    void disponibilidad_sinHistorial_cuandoConfiguradoPeroSinEventos() {
        when(paqueteEstadoEventoRepository.resumenDespachadosEntre(any(), any(), any()))
                .thenReturn(new Object[]{0L, BigDecimal.ZERO});
        when(paqueteEstadoEventoRepository.avgDiasPrimerDespachoEntre(any(), any(), any())).thenReturn(null);
        when(paqueteEstadoEventoRepository.aggregateDespachadosByPeriodo(any(), any(), any(), any()))
                .thenReturn(List.of());
        when(paqueteEstadoEventoRepository.coberturaDespachados(any()))
                .thenReturn(new Object[]{null, null, 0L});
        stubRegistros(0L, 0L, "0", "0");

        var d = service.dashboard(enero2020()).disponibilidadDespacho();
        assertEquals(DisponibilidadMetrica.SIN_HISTORIAL, d.estado());
    }

    @Test
    void disponibilidad_parcial_cuandoCoberturaEmpiezaDespuesDelInicio() {
        when(paqueteEstadoEventoRepository.resumenDespachadosEntre(any(), any(), any()))
                .thenReturn(new Object[]{3L, new BigDecimal("30.0")});
        when(paqueteEstadoEventoRepository.avgDiasPrimerDespachoEntre(any(), any(), any())).thenReturn(1.0);
        when(paqueteEstadoEventoRepository.aggregateDespachadosByPeriodo(any(), any(), any(), any()))
                .thenReturn(List.of());
        // El primer evento (cobertura) es posterior al inicio del periodo (2020-01-01).
        when(paqueteEstadoEventoRepository.coberturaDespachados(any())).thenReturn(new Object[]{
                Timestamp.valueOf("2020-01-15 00:00:00"), Timestamp.valueOf("2020-01-20 00:00:00"), 3L});
        stubRegistros(3L, 0L, "30", "0");

        var d = service.dashboard(enero2020()).disponibilidadDespacho();
        assertEquals(DisponibilidadMetrica.PARCIAL, d.estado());
        assertTrue(d.advertencia().toLowerCase().contains("disponibles desde"));
        assertNotNull(d.coberturaDesde());
    }

    @Test
    void unSoloPaqueteDespachado_seCuentaUnaVez() {
        when(paqueteEstadoEventoRepository.resumenDespachadosEntre(EVENTO, DESDE, HASTA))
                .thenReturn(new Object[]{1L, new BigDecimal("12.5")});
        when(paqueteEstadoEventoRepository.resumenDespachadosEntre(EVENTO, ANT_DESDE, ANT_HASTA))
                .thenReturn(new Object[]{0L, BigDecimal.ZERO});
        when(paqueteEstadoEventoRepository.avgDiasPrimerDespachoEntre(any(), any(), any())).thenReturn(2.5);
        when(paqueteEstadoEventoRepository.aggregateDespachadosByPeriodo(any(), any(), any(), any()))
                .thenReturn(List.of());
        stubRegistros(1L, 0L, "12.5", "0");

        var result = service.dashboard(enero2020());

        assertEquals(0, result.resultados().paquetesDespachados().actual().compareTo(BigDecimal.ONE));
        assertEquals(0, result.resultados().pesoDespachadoLbs().actual().compareTo(new BigDecimal("12.5")));
        assertEquals(0, result.resultados().tiempoPromedioDespachoDias().actual()
                .compareTo(new BigDecimal("2.5")));
    }

    @Test
    void compatibilidadConMeses_granularidadMensual() {
        when(paqueteEstadoEventoRepository.resumenDespachadosEntre(any(), any(), any()))
                .thenReturn(new Object[]{0L, BigDecimal.ZERO});
        when(paqueteEstadoEventoRepository.avgDiasPrimerDespachoEntre(any(), any(), any())).thenReturn(null);
        when(paqueteEstadoEventoRepository.aggregateDespachadosByPeriodo(any(), any(), any(), any()))
                .thenReturn(List.of());
        when(paqueteRepository.countRegistradosEntre(any(), any())).thenReturn(0L);
        when(paqueteRepository.sumPesoRegistradoEntre(any(), any())).thenReturn(BigDecimal.ZERO);
        when(paqueteRepository.aggregateRegistradosByPeriodo(any(), any(), any())).thenReturn(List.of());

        var result = service.dashboard(6);

        assertEquals(PresetPeriodoEstadisticas.ULTIMOS_6_MESES, result.periodo().preset());
        assertEquals(GranularidadEstadisticas.MENSUAL, result.granularidad());
        assertFalse(result.resultados().paquetesDespachadosSerie().isEmpty());
    }
}
