package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.entity.Consignatario;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
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
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
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

    @BeforeEach
    void setUp() {
        service = new EstadisticasService(
                despachoRepository,
                paqueteRepository,
                estadoRastreoRepository,
                excepcionRepository,
                liquidacionRepository,
                parametroSistemaService);
    }

    @Test
    void dashboard_completaMesesYCalculaDemoras() {
        LocalDateTime currentMonth = YearMonth.now().atDay(1).atStartOfDay();
        when(parametroSistemaService.getDiasMaxSinDespachar()).thenReturn(7);
        when(parametroSistemaService.getEstadosRastreoPorPunto()).thenReturn(
                EstadosRastreoPorPuntoDTO.builder().estadoRastreoEnDespachoId(4L).build());
        when(estadoRastreoRepository.findMaxOrdenTrackingActivoByTipoFlujo(any())).thenReturn(8);
        when(estadoRastreoRepository.findById(4L)).thenReturn(Optional.of(
                EstadoRastreo.builder().id(4L).ordenTracking(4).build()));
        when(excepcionRepository.countExcepciones(4, 8)).thenReturn(3L);
        when(excepcionRepository.findExcepciones(4, 8, 200)).thenReturn(List.<Object[]>of(
                new Object[]{"ALTA", "Paquetes", "PAQUETE", 12L, "GUIA-12",
                        "PAQUETE_DESPACHADO_ESTADO_ANTERIOR",
                        "Despachado con estado anterior",
                        "Pertenece a un despacho, pero su estado es Registrado.",
                        "/tracking?codigo=GUIA-12"}));
        when(despachoRepository.aggregateByMonth(any(), any())).thenReturn(List.<Object[]>of(
                new Object[]{Timestamp.valueOf(currentMonth), 4L, 9L, new BigDecimal("25.5")}));
        when(paqueteRepository.aggregateRegistradosByMonth(any(), any())).thenReturn(List.<Object[]>of(
                new Object[]{Timestamp.valueOf(currentMonth), 12L}));
        when(paqueteRepository.countRegistradosEntre(any(), any())).thenReturn(12L);
        when(paqueteRepository.countPendientesDespacho(8)).thenReturn(6L);
        when(paqueteRepository.countDemoradosSinDespachar(any(), eq(8))).thenReturn(1L);
        when(paqueteRepository.countEntregadosSinDespacho(8)).thenReturn(2L);
        when(paqueteRepository.sumPesoRegistradoEntre(any(), any()))
                .thenReturn(new BigDecimal("100.00"));
        var tasasEstimacion = mock(LiquidacionRepository.TasasEstimacionProjection.class);
        when(tasasEstimacion.getMargenPorLibra()).thenReturn(new BigDecimal("8.5025"));
        when(tasasEstimacion.getCostoDistribucionPorLibra())
                .thenReturn(new BigDecimal("2.1010"));
        when(liquidacionRepository.findTasasEstimacionHistoricas())
                .thenReturn(tasasEstimacion);
        when(paqueteRepository.aggregateByEstado()).thenReturn(List.<Object[]>of(
                new Object[]{1L, "REGISTRADO", "Registrado", 6L}));
        when(paqueteRepository.findDemoradosSinDespachar(any(), eq(8), any(Pageable.class)))
                .thenReturn(List.of(Paquete.builder()
                        .id(10L)
                        .numeroGuia("GUIA-10")
                        .ref("REF-10")
                        .createdAt(LocalDateTime.now().minusDays(10))
                        .consignatario(Consignatario.builder().nombre("Cliente prueba").build())
                        .estadoRastreo(EstadoRastreo.builder().nombre("Registrado").build())
                        .build()));
        when(paqueteRepository.findEntregadosSinDespacho(eq(8), any(Pageable.class)))
                .thenReturn(List.of(Paquete.builder()
                        .id(11L)
                        .numeroGuia("GUIA-11")
                        .ref("REF-11")
                        .createdAt(LocalDateTime.now().minusDays(20))
                        .consignatario(Consignatario.builder().nombre("Cliente entregado").build())
                        .estadoRastreo(EstadoRastreo.builder().nombre("Entregado a destinatario").build())
                        .build()));

        var result = service.dashboard(6);

        assertEquals(6, result.despachosPorMes().size());
        assertEquals(6, result.paquetesRegistradosPorMes().size());
        assertEquals(4, result.resumen().totalDespachos());
        assertEquals(9, result.resumen().paquetesDespachados());
        assertEquals(12, result.resumen().paquetesRegistrados());
        assertEquals(6, result.resumen().pendientesDespacho());
        assertEquals(1, result.resumen().demoradosSinDespachar());
        assertEquals(2, result.resumen().entregadosSinDespacho());
        assertEquals(3, result.resumen().excepcionesOperativas());
        assertEquals(new BigDecimal("25.5"), result.resumen().pesoDespachadoLbs());
        assertEquals(new BigDecimal("850.2500"), result.resumen().margenBruto());
        assertEquals(new BigDecimal("210.1000"), result.resumen().costoDistribucion());
        assertEquals(new BigDecimal("640.1500"), result.resumen().ingresoNetoAproximado());
        assertEquals(1, result.paquetesDemorados().size());
        assertTrue(result.paquetesDemorados().getFirst().diasSinDespachar() >= 10);
        assertTrue(result.paquetesDemorados().getFirst().diasAtraso() >= 3);
        assertEquals(1, result.paquetesEntregadosSinDespacho().size());
        assertEquals("Entregado a destinatario",
                result.paquetesEntregadosSinDespacho().getFirst().estado());
        assertEquals(1, result.excepcionesOperativas().size());
        assertEquals("ALTA", result.excepcionesOperativas().getFirst().severidad());
        verify(paqueteRepository).countPendientesDespacho(8);
        verify(paqueteRepository).countDemoradosSinDespachar(any(), eq(8));
        verify(paqueteRepository).findDemoradosSinDespachar(any(), eq(8), any(Pageable.class));
        verify(paqueteRepository).findEntregadosSinDespacho(eq(8), any(Pageable.class));
    }

    @Test
    void dashboard_limitaElPeriodoSolicitado() {
        when(parametroSistemaService.getDiasMaxSinDespachar()).thenReturn(7);
        when(parametroSistemaService.getEstadosRastreoPorPunto()).thenReturn(
                EstadosRastreoPorPuntoDTO.builder().estadoRastreoEnDespachoId(4L).build());
        when(estadoRastreoRepository.findMaxOrdenTrackingActivoByTipoFlujo(any())).thenReturn(8);
        when(estadoRastreoRepository.findById(4L)).thenReturn(Optional.of(
                EstadoRastreo.builder().id(4L).ordenTracking(4).build()));
        when(despachoRepository.aggregateByMonth(any(), any())).thenReturn(List.of());
        when(paqueteRepository.aggregateRegistradosByMonth(any(), any())).thenReturn(List.of());
        when(paqueteRepository.aggregateByEstado()).thenReturn(List.of());
        when(paqueteRepository.findDemoradosSinDespachar(any(), eq(8), any(Pageable.class)))
                .thenReturn(List.of());
        when(paqueteRepository.findEntregadosSinDespacho(eq(8), any(Pageable.class)))
                .thenReturn(List.of());
        when(excepcionRepository.findExcepciones(4, 8, 200)).thenReturn(List.of());
        when(paqueteRepository.sumPesoRegistradoEntre(any(), any())).thenReturn(BigDecimal.ZERO);
        var tasasEstimacion = mock(LiquidacionRepository.TasasEstimacionProjection.class);
        when(tasasEstimacion.getMargenPorLibra()).thenReturn(BigDecimal.ZERO);
        when(tasasEstimacion.getCostoDistribucionPorLibra()).thenReturn(BigDecimal.ZERO);
        when(liquidacionRepository.findTasasEstimacionHistoricas())
                .thenReturn(tasasEstimacion);

        assertEquals(3, service.dashboard(1).despachosPorMes().size());
        assertEquals(24, service.dashboard(100).despachosPorMes().size());
    }
}
