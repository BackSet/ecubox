package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.OutboxEvent;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.PaqueteEstadoEvento;
import com.ecubox.ecubox_backend.enums.TrackingEventType;
import com.ecubox.ecubox_backend.repository.OutboxEventRepository;
import com.ecubox.ecubox_backend.repository.PaqueteEstadoEventoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class TrackingEventServiceTest {

    @Mock
    private PaqueteEstadoEventoRepository paqueteEstadoEventoRepository;
    @Mock
    private OutboxEventRepository outboxEventRepository;

    private TrackingEventService trackingEventService;

    @BeforeEach
    void setUp() {
        trackingEventService = new TrackingEventService(paqueteEstadoEventoRepository, outboxEventRepository);
    }

    @Test
    void registraEventoYOutboxEnLaMismaOperacion() {
        Paquete paquete = Paquete.builder().id(10L).numeroGuia("GUIA-10").bloqueado(false).enFlujoAlterno(false).build();
        EstadoRastreo origen = EstadoRastreo.builder().id(1L).codigo("REGISTRADO").build();
        EstadoRastreo destino = EstadoRastreo.builder().id(2L).codigo("EN_TRANSITO").build();

        trackingEventService.registrarTransicion(
                paquete,
                origen,
                destino,
                TrackingEventType.ESTADO_CAMBIO_MANUAL,
                "OPERARIO_MANUAL",
                null,
                null,
                "manual:10:1:2:" + UUID.randomUUID()
        );

        ArgumentCaptor<PaqueteEstadoEvento> eventoCaptor = ArgumentCaptor.forClass(PaqueteEstadoEvento.class);
        ArgumentCaptor<OutboxEvent> outboxCaptor = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(paqueteEstadoEventoRepository).save(eventoCaptor.capture());
        verify(outboxEventRepository).save(outboxCaptor.capture());

        PaqueteEstadoEvento evento = eventoCaptor.getValue();
        OutboxEvent outbox = outboxCaptor.getValue();
        assertNotNull(evento.getEventId());
        assertNotNull(outbox.getEventId());
        assertEquals(evento.getEventId(), outbox.getEventId());
        assertEquals("PAQUETE", outbox.getAggregateType());
        assertEquals("10", outbox.getAggregateId());
        assertEquals(TrackingEventType.ESTADO_CAMBIO_MANUAL.name(), outbox.getEventType());
    }
}
