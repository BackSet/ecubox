package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadisticasConsulta;
import com.ecubox.ecubox_backend.dto.EstadisticasDashboardDTO;
import com.ecubox.ecubox_backend.entity.Consignatario;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.enums.GranularidadEstadisticas;
import com.ecubox.ecubox_backend.enums.PresetPeriodoEstadisticas;
import com.ecubox.ecubox_backend.repository.DespachoRepository;
import com.ecubox.ecubox_backend.repository.EstadoRastreoRepository;
import com.ecubox.ecubox_backend.repository.EstadisticasExcepcionRepository;
import com.ecubox.ecubox_backend.repository.LiquidacionRepository;
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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EstadisticasServiceTest {

    @Mock
    private DespachoRepository despachoRepository;
    @Mock
    private PaqueteRepository paqueteRepository;
    @Mock
    private EstadoRastreoRepository estadoRastreoRepository;
    @Mock
    private EstadisticasExcepcionRepository excepcionRepository;
    @Mock
    private LiquidacionRepository liquidacionRepository;
    @Mock
    private ParametroSistemaService parametroSistemaService;

    private EstadisticasService service;

    private static final LocalDateTime DESDE = LocalDateTime.of(2020, 1, 1, 0, 0);
    private static final LocalDateTime HASTA = LocalDateTime.of(2020, 2, 1, 0, 0);
    private static final LocalDateTime ANT_DESDE = LocalDateTime.of(2019, 12, 1, 0, 0);
    private static final LocalDateTime ANT_HASTA = LocalDateTime.of(2020, 1, 1, 0, 0);

    @BeforeEach
    void setUp() {
        service = new EstadisticasService(
                despachoRepository,
                paqueteRepository,
                estadoRastreoRepository,
                excepcionRepository,
                liquidacionRepository,
                parametroSistemaService,
                new PeriodoEstadisticasResolver());
        stubEstadoActual();
        stubTasas();
    }

    private void stubEstadoActual() {
        when(parametroSistemaService.getEstadosRastreoPorPunto()).thenReturn(
                EstadosRastreoPorPuntoDTO.builder().estadoRastreoEnDespachoId(4L).build());
        when(estadoRastreoRepository.findMaxOrdenTrackingActivoByTipoFlujo(any())).thenReturn(8);
        when(estadoRastreoRepository.findById(4L)).thenReturn(Optional.of(
                EstadoRastreo.builder().id(4L).ordenTracking(4).build()));
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

    @Test
    void dashboard_rangoPersonalizado_seriesDiariasYComparacion() {
        when(despachoRepository.aggregateResumen(eq(DESDE), eq(HASTA)))
                .thenReturn(new Object[]{10L, 25L, new BigDecimal("500.0")});
        when(despachoRepository.aggregateResumen(eq(ANT_DESDE), eq(ANT_HASTA)))
                .thenReturn(new Object[]{5L, 12L, new BigDecimal("250.0")});
        when(paqueteRepository.countRegistradosEntre(eq(DESDE), eq(HASTA))).thenReturn(40L);
        when(paqueteRepository.countRegistradosEntre(eq(ANT_DESDE), eq(ANT_HASTA))).thenReturn(20L);
        when(paqueteRepository.sumPesoRegistradoEntre(eq(DESDE), eq(HASTA)))
                .thenReturn(new BigDecimal("800.00"));
        when(paqueteRepository.sumPesoRegistradoEntre(eq(ANT_DESDE), eq(ANT_HASTA)))
                .thenReturn(new BigDecimal("400.00"));
        when(paqueteRepository.avgDiasDespachoEntre(eq(DESDE), eq(HASTA))).thenReturn(3.0);
        when(paqueteRepository.avgDiasDespachoEntre(eq(ANT_DESDE), eq(ANT_HASTA))).thenReturn(2.0);
        when(despachoRepository.aggregateByPeriodo(eq("day"), eq(DESDE), eq(HASTA)))
                .thenReturn(List.<Object[]>of(
                        new Object[]{Timestamp.valueOf("2020-01-05 00:00:00"), 4L, 9L, new BigDecimal("25.5")}));
        when(paqueteRepository.aggregateRegistradosByPeriodo(eq("day"), eq(DESDE), eq(HASTA)))
                .thenReturn(List.<Object[]>of(
                        new Object[]{Timestamp.valueOf("2020-01-05 00:00:00"), 7L}));

        var consulta = new EstadisticasConsulta(
                null, null, null,
                LocalDate.of(2020, 1, 1), LocalDate.of(2020, 2, 1), null, null);
        EstadisticasDashboardDTO result = service.dashboard(consulta);

        // Periodo normalizado
        assertEquals(PresetPeriodoEstadisticas.RANGO_PERSONALIZADO, result.periodo().preset());
        assertEquals(LocalDate.of(2020, 1, 1), result.periodo().desde());
        assertEquals(LocalDate.of(2020, 2, 1), result.periodo().hastaExclusivo());
        assertEquals(LocalDate.of(2020, 1, 31), result.periodo().hastaInclusivo());
        assertEquals(GranularidadEstadisticas.DIARIA, result.granularidad());
        assertFalse(result.periodoParcial());

        // Series diarias: enero tiene 31 puntos
        assertEquals(31, result.resultados().despachosSerie().size());
        assertEquals(31, result.resultados().registrosSerie().size());
        assertEquals("2020-01-01", result.resultados().despachosSerie().getFirst().periodo());

        // Comparación histórica
        var despachos = result.resultados().despachos();
        assertEquals(0, despachos.actual().compareTo(BigDecimal.valueOf(10)));
        assertEquals(0, despachos.anterior().compareTo(BigDecimal.valueOf(5)));
        assertEquals(0, despachos.diferencia().compareTo(BigDecimal.valueOf(5)));
        assertEquals(100.0, despachos.variacionPct());
        assertTrue(despachos.comparacionDisponible());

        assertEquals(0, result.resultados().paquetesRegistrados().actual()
                .compareTo(BigDecimal.valueOf(40)));
        assertEquals(100.0, result.resultados().paquetesRegistrados().variacionPct());

        // Estado operativo actual separado
        assertEquals(6, result.estadoActual().pendientesDespacho());
        assertEquals(1, result.estadoActual().demoradosSinDespachar());
        assertEquals(2, result.estadoActual().entregadosSinDespacho());
        assertEquals(3, result.estadoActual().excepcionesOperativas());
        assertEquals(1, result.estadoActual().distribucion().size());
        assertEquals(1, result.estadoActual().paquetesDemorados().size());
        assertEquals("Entregado a destinatario",
                result.estadoActual().paquetesEntregadosSinDespacho().getFirst().estado());
        assertEquals(1, result.estadoActual().excepciones().size());
    }

    @Test
    void dashboard_anteriorCero_noCalculaVariacionPorcentual() {
        when(despachoRepository.aggregateResumen(eq(DESDE), eq(HASTA)))
                .thenReturn(new Object[]{10L, 25L, new BigDecimal("500.0")});
        when(despachoRepository.aggregateResumen(eq(ANT_DESDE), eq(ANT_HASTA)))
                .thenReturn(new Object[]{0L, 0L, BigDecimal.ZERO});
        when(paqueteRepository.countRegistradosEntre(any(), any())).thenReturn(0L);
        when(paqueteRepository.sumPesoRegistradoEntre(any(), any())).thenReturn(BigDecimal.ZERO);
        when(paqueteRepository.avgDiasDespachoEntre(any(), any())).thenReturn(null);
        when(despachoRepository.aggregateByPeriodo(any(), any(), any())).thenReturn(List.of());
        when(paqueteRepository.aggregateRegistradosByPeriodo(any(), any(), any())).thenReturn(List.of());

        var consulta = new EstadisticasConsulta(
                null, null, null,
                LocalDate.of(2020, 1, 1), LocalDate.of(2020, 2, 1), null, null);
        var result = service.dashboard(consulta);

        var despachos = result.resultados().despachos();
        assertEquals(null, despachos.variacionPct());
        assertTrue(despachos.comparacionDisponible());
        // tiempo promedio sin datos en ambos periodos: no comparable
        assertFalse(result.resultados().tiempoPromedioDespachoDias().comparacionDisponible());
    }

    @Test
    void dashboard_compatibilidadConMeses() {
        when(despachoRepository.aggregateResumen(any(), any()))
                .thenReturn(new Object[]{0L, 0L, BigDecimal.ZERO});
        when(paqueteRepository.countRegistradosEntre(any(), any())).thenReturn(0L);
        when(paqueteRepository.sumPesoRegistradoEntre(any(), any())).thenReturn(BigDecimal.ZERO);
        when(paqueteRepository.avgDiasDespachoEntre(any(), any())).thenReturn(null);
        when(despachoRepository.aggregateByPeriodo(any(), any(), any())).thenReturn(List.of());
        when(paqueteRepository.aggregateRegistradosByPeriodo(any(), any(), any())).thenReturn(List.of());

        var result = service.dashboard(6);

        assertEquals(PresetPeriodoEstadisticas.ULTIMOS_6_MESES, result.periodo().preset());
        assertEquals(GranularidadEstadisticas.MENSUAL, result.granularidad());
        assertFalse(result.resultados().despachosSerie().isEmpty());
    }
}
