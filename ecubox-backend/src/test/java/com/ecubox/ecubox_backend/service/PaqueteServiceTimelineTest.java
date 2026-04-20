package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.dto.TrackingEstadoItemDTO;
import com.ecubox.ecubox_backend.dto.TrackingResponse;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.PaqueteEstadoEvento;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.enums.TrackingEventType;
import com.ecubox.ecubox_backend.repository.DestinatarioFinalRepository;
import com.ecubox.ecubox_backend.repository.GuiaMasterRepository;
import com.ecubox.ecubox_backend.repository.LoteRecepcionGuiaRepository;
import com.ecubox.ecubox_backend.repository.OutboxEventRepository;
import com.ecubox.ecubox_backend.repository.PaqueteEstadoEventoRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.SacaRepository;
import com.ecubox.ecubox_backend.service.validation.OwnershipValidator;
import com.ecubox.ecubox_backend.service.validation.SacaEnDespachoValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Sprint 2: verifica que el timeline de tracking publico se construye a partir
 * del event log {@code paquete_estado_evento}, exponiendo {@code fechaOcurrencia}
 * en cada estado y tolerando reversiones (toma la ultima ocurrencia por estado).
 */
@ExtendWith(MockitoExtension.class)
class PaqueteServiceTimelineTest {

    @Mock private PaqueteRepository paqueteRepository;
    @Mock private DestinatarioFinalRepository destinatarioFinalRepository;
    @Mock private SacaRepository sacaRepository;
    @Mock private LoteRecepcionGuiaRepository loteRecepcionGuiaRepository;
    @Mock private PaqueteEstadoEventoRepository paqueteEstadoEventoRepository;
    @Mock private OutboxEventRepository outboxEventRepository;
    @Mock private ParametroSistemaService parametroSistemaService;
    @Mock private EstadoRastreoService estadoRastreoService;
    @Mock private TrackingEventService trackingEventService;
    @Mock private GuiaMasterRepository guiaMasterRepository;
    @Mock private GuiaMasterService guiaMasterService;
    @Mock private CodigoSecuenciaService codigoSecuenciaService;

    private PaqueteService service;

    @BeforeEach
    void setUp() {
        service = new PaqueteService(
                paqueteRepository, destinatarioFinalRepository, sacaRepository,
                loteRecepcionGuiaRepository, paqueteEstadoEventoRepository, outboxEventRepository,
                parametroSistemaService, estadoRastreoService, trackingEventService,
                guiaMasterRepository, guiaMasterService,
                new OwnershipValidator(), new SacaEnDespachoValidator(),
                codigoSecuenciaService,
                true);
        lenient().when(parametroSistemaService.getEstadosRastreoPorPunto())
                .thenReturn(EstadosRastreoPorPuntoDTO.builder().build());
    }

    @Test
    void timeline_pueblaFechaOcurrenciaDesdeEventos() {
        EstadoRastreo registrado = EstadoRastreo.builder()
                .id(1L).codigo("REGISTRADO").nombre("Registrado")
                .ordenTracking(1).publicoTracking(true).build();
        EstadoRastreo enUsa = EstadoRastreo.builder()
                .id(2L).codigo("EN_USA").nombre("En USA")
                .ordenTracking(2).publicoTracking(true).build();
        EstadoRastreo enEcuador = EstadoRastreo.builder()
                .id(3L).codigo("EN_ECUADOR").nombre("En Ecuador")
                .ordenTracking(3).publicoTracking(true).build();

        Paquete p = Paquete.builder().id(50L).numeroGuia("PAQ-1").estadoRastreo(enUsa).build();
        when(paqueteRepository.findByNumeroGuiaWithSacaAndDespacho("PAQ-1")).thenReturn(Optional.of(p));
        when(estadoRastreoService.findActivosEntities()).thenReturn(List.of(registrado, enUsa, enEcuador));

        LocalDateTime t1 = LocalDateTime.now().minusDays(3);
        LocalDateTime t2 = LocalDateTime.now().minusDays(1);
        when(trackingEventService.listarEventosPorPaquete(50L)).thenReturn(List.of(
                evento(1L, registrado, t1),
                evento(2L, enUsa, t2)
        ));

        TrackingResponse resp = service.findByNumeroGuiaForTracking("PAQ-1");

        TrackingEstadoItemDTO regItem = findByCodigo(resp.getEstados(), "REGISTRADO");
        TrackingEstadoItemDTO usaItem = findByCodigo(resp.getEstados(), "EN_USA");
        TrackingEstadoItemDTO ecuItem = findByCodigo(resp.getEstados(), "EN_ECUADOR");

        assertEquals(t1, regItem.getFechaOcurrencia());
        assertEquals(t2, usaItem.getFechaOcurrencia());
        assertNull(ecuItem.getFechaOcurrencia(), "estado futuro no debe tener fecha");
        assertTrue(usaItem.isEsActual());
    }

    @Test
    void timeline_conReversion_usaUltimoOccurredAtPorEstado() {
        EstadoRastreo registrado = EstadoRastreo.builder()
                .id(1L).codigo("REGISTRADO").nombre("Registrado")
                .ordenTracking(1).publicoTracking(true).build();
        EstadoRastreo enUsa = EstadoRastreo.builder()
                .id(2L).codigo("EN_USA").nombre("En USA")
                .ordenTracking(2).publicoTracking(true).build();

        Paquete p = Paquete.builder().id(60L).numeroGuia("PAQ-2").estadoRastreo(enUsa).build();
        when(paqueteRepository.findByNumeroGuiaWithSacaAndDespacho("PAQ-2")).thenReturn(Optional.of(p));
        when(estadoRastreoService.findActivosEntities()).thenReturn(List.of(registrado, enUsa));

        LocalDateTime original = LocalDateTime.now().minusDays(5);
        LocalDateTime correccion = LocalDateTime.now().minusDays(1);
        when(trackingEventService.listarEventosPorPaquete(60L)).thenReturn(List.of(
                evento(10L, enUsa, original),
                // reversion -> registrado
                evento(11L, registrado, LocalDateTime.now().minusDays(3)),
                // re-aplicacion al EN_USA con timestamp posterior
                evento(12L, enUsa, correccion)
        ));

        TrackingResponse resp = service.findByNumeroGuiaForTracking("PAQ-2");

        TrackingEstadoItemDTO usaItem = findByCodigo(resp.getEstados(), "EN_USA");
        assertEquals(correccion, usaItem.getFechaOcurrencia(),
                "ante reversion+reaplicacion, debe usarse la fecha mas reciente");
    }

    @Test
    void timeline_sinEventosUsaFallbackEnFechaEstadoActualParaEstadoActual() {
        EstadoRastreo registrado = EstadoRastreo.builder()
                .id(1L).codigo("REGISTRADO").nombre("Registrado")
                .ordenTracking(1).publicoTracking(true).build();
        EstadoRastreo enUsa = EstadoRastreo.builder()
                .id(2L).codigo("EN_USA").nombre("En USA")
                .ordenTracking(2).publicoTracking(true).build();

        LocalDateTime fechaActual = LocalDateTime.now().minusHours(6);
        Paquete p = Paquete.builder()
                .id(70L).numeroGuia("PAQ-3")
                .estadoRastreo(enUsa)
                .fechaEstadoActualDesde(fechaActual)
                .build();
        when(paqueteRepository.findByNumeroGuiaWithSacaAndDespacho("PAQ-3")).thenReturn(Optional.of(p));
        when(estadoRastreoService.findActivosEntities()).thenReturn(List.of(registrado, enUsa));
        when(trackingEventService.listarEventosPorPaquete(70L)).thenReturn(List.of());

        TrackingResponse resp = service.findByNumeroGuiaForTracking("PAQ-3");

        TrackingEstadoItemDTO usaItem = findByCodigo(resp.getEstados(), "EN_USA");
        assertEquals(fechaActual, usaItem.getFechaOcurrencia());
        TrackingEstadoItemDTO regItem = findByCodigo(resp.getEstados(), "REGISTRADO");
        assertNull(regItem.getFechaOcurrencia(),
                "estados pasados sin evento permanecen sin fecha (placeholder)");
    }

    private static PaqueteEstadoEvento evento(long id, EstadoRastreo destino, LocalDateTime when) {
        return PaqueteEstadoEvento.builder()
                .id(id)
                .estadoDestino(destino)
                .occurredAt(when)
                .eventType(TrackingEventType.ESTADO_CAMBIO_MANUAL)
                .build();
    }

    private static TrackingEstadoItemDTO findByCodigo(List<TrackingEstadoItemDTO> items, String codigo) {
        TrackingEstadoItemDTO found = items.stream()
                .filter(i -> codigo.equals(i.getCodigo()))
                .findFirst()
                .orElse(null);
        assertNotNull(found, "no se encontro estado " + codigo);
        return found;
    }

    @SuppressWarnings("unused") // utilidad por completitud
    private static TipoFlujoEstado normal() {
        return TipoFlujoEstado.NORMAL;
    }
}
