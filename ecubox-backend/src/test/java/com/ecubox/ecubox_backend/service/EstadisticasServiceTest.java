package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.entity.Consignatario;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.repository.DespachoRepository;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EstadisticasServiceTest {

    @Mock
    private DespachoRepository despachoRepository;
    @Mock
    private PaqueteRepository paqueteRepository;
    @Mock
    private ParametroSistemaService parametroSistemaService;

    private EstadisticasService service;

    @BeforeEach
    void setUp() {
        service = new EstadisticasService(
                despachoRepository,
                paqueteRepository,
                parametroSistemaService);
    }

    @Test
    void dashboard_completaMesesYCalculaDemoras() {
        LocalDateTime currentMonth = YearMonth.now().atDay(1).atStartOfDay();
        when(parametroSistemaService.getDiasMaxSinDespachar()).thenReturn(7);
        when(despachoRepository.aggregateByMonth(any(), any())).thenReturn(List.<Object[]>of(
                new Object[]{Timestamp.valueOf(currentMonth), 4L, 9L, new BigDecimal("25.5")}));
        when(paqueteRepository.aggregateRegistradosByMonth(any(), any())).thenReturn(List.<Object[]>of(
                new Object[]{Timestamp.valueOf(currentMonth), 12L}));
        when(paqueteRepository.countRegistradosEntre(any(), any())).thenReturn(12L);
        when(paqueteRepository.countPendientesDespacho()).thenReturn(6L);
        when(paqueteRepository.countDemoradosSinDespachar(any())).thenReturn(1L);
        when(paqueteRepository.aggregateByEstado()).thenReturn(List.<Object[]>of(
                new Object[]{1L, "REGISTRADO", "Registrado", 6L}));
        when(paqueteRepository.findDemoradosSinDespachar(any(), any(Pageable.class)))
                .thenReturn(List.of(Paquete.builder()
                        .id(10L)
                        .numeroGuia("GUIA-10")
                        .ref("REF-10")
                        .createdAt(LocalDateTime.now().minusDays(10))
                        .consignatario(Consignatario.builder().nombre("Cliente prueba").build())
                        .estadoRastreo(EstadoRastreo.builder().nombre("Registrado").build())
                        .build()));

        var result = service.dashboard(6);

        assertEquals(6, result.despachosPorMes().size());
        assertEquals(6, result.paquetesRegistradosPorMes().size());
        assertEquals(4, result.resumen().totalDespachos());
        assertEquals(9, result.resumen().paquetesDespachados());
        assertEquals(12, result.resumen().paquetesRegistrados());
        assertEquals(6, result.resumen().pendientesDespacho());
        assertEquals(1, result.resumen().demoradosSinDespachar());
        assertEquals(new BigDecimal("25.5"), result.resumen().pesoDespachadoLbs());
        assertEquals(1, result.paquetesDemorados().size());
        assertTrue(result.paquetesDemorados().getFirst().diasSinDespachar() >= 10);
        assertTrue(result.paquetesDemorados().getFirst().diasAtraso() >= 3);
    }

    @Test
    void dashboard_limitaElPeriodoSolicitado() {
        when(parametroSistemaService.getDiasMaxSinDespachar()).thenReturn(7);
        when(despachoRepository.aggregateByMonth(any(), any())).thenReturn(List.of());
        when(paqueteRepository.aggregateRegistradosByMonth(any(), any())).thenReturn(List.of());
        when(paqueteRepository.aggregateByEstado()).thenReturn(List.of());
        when(paqueteRepository.findDemoradosSinDespachar(any(), any(Pageable.class)))
                .thenReturn(List.of());

        assertEquals(3, service.dashboard(1).despachosPorMes().size());
        assertEquals(24, service.dashboard(100).despachosPorMes().size());
    }
}
