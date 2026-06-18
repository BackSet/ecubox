package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.PaqueteEstadoEvento;
import com.ecubox.ecubox_backend.enums.TrackingEventType;
import com.ecubox.ecubox_backend.repository.OutboxEventRepository;
import com.ecubox.ecubox_backend.repository.PaqueteEstadoEventoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * El evento de reparación es solo de auditoría: registra en
 * {@code paquete_estado_evento} pero NO crea outbox ni notificaciones, y es
 * idempotente por clave estable.
 */
@ExtendWith(MockitoExtension.class)
class TrackingEventServiceReparacionTest {

    @Mock private PaqueteEstadoEventoRepository paqueteEstadoEventoRepository;
    @Mock private OutboxEventRepository outboxEventRepository;
    @Mock private NotificacionService notificacionService;

    private TrackingEventService service() {
        return new TrackingEventService(paqueteEstadoEventoRepository, outboxEventRepository, notificacionService);
    }

    private Paquete paquete() {
        return Paquete.builder().id(1L).numeroGuia("GU-1").enFlujoAlterno(false).bloqueado(false).build();
    }

    private EstadoRastreo estado(long id) {
        return EstadoRastreo.builder().id(id).nombre("E" + id).activo(true).build();
    }

    @Test
    void registraEventoDeAuditoria_sinOutboxNiNotificacion() {
        String key = "reparacion-bodega:1:50";
        when(paqueteEstadoEventoRepository.existsByIdempotencyKey(key)).thenReturn(false);

        boolean registrado = service().registrarReparacionEstado(
                paquete(), estado(10L), estado(50L), "REPARACION_LOTE_RECEPCION:run-1",
                key, LocalDateTime.of(2025, 1, 10, 9, 0));

        assertTrue(registrado);
        ArgumentCaptor<PaqueteEstadoEvento> captor = ArgumentCaptor.forClass(PaqueteEstadoEvento.class);
        verify(paqueteEstadoEventoRepository).save(captor.capture());
        PaqueteEstadoEvento ev = captor.getValue();
        assertEquals(TrackingEventType.ESTADO_REPARADO_LOTE_RECEPCION, ev.getEventType());
        assertEquals(key, ev.getIdempotencyKey());
        // Fecha histórica, no la actual.
        assertEquals(LocalDateTime.of(2025, 1, 10, 9, 0), ev.getOccurredAt());
        // Cero notificaciones / automatismos.
        verifyNoInteractions(outboxEventRepository);
        verifyNoInteractions(notificacionService);
    }

    @Test
    void idempotente_noRegistraSiYaExisteLaClave() {
        String key = "reparacion-bodega:1:50";
        when(paqueteEstadoEventoRepository.existsByIdempotencyKey(key)).thenReturn(true);

        boolean registrado = service().registrarReparacionEstado(
                paquete(), estado(10L), estado(50L), "REPARACION_LOTE_RECEPCION:run-1",
                key, LocalDateTime.of(2025, 1, 10, 9, 0));

        assertFalse(registrado);
        verify(paqueteEstadoEventoRepository, never()).save(any());
        verifyNoInteractions(outboxEventRepository);
        verifyNoInteractions(notificacionService);
    }
}
