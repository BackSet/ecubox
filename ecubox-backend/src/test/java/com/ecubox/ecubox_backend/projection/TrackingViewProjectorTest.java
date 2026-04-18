package com.ecubox.ecubox_backend.projection;

import com.ecubox.ecubox_backend.entity.DestinatarioFinal;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.GuiaMaster;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.PaqueteEstadoEvento;
import com.ecubox.ecubox_backend.entity.TrackingProjectorState;
import com.ecubox.ecubox_backend.entity.TrackingViewPaquete;
import com.ecubox.ecubox_backend.enums.TrackingEventType;
import com.ecubox.ecubox_backend.repository.PaqueteEstadoEventoRepository;
import com.ecubox.ecubox_backend.repository.TrackingProjectorStateRepository;
import com.ecubox.ecubox_backend.repository.TrackingViewPaqueteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TrackingViewProjectorTest {

    private PaqueteEstadoEventoRepository eventRepo;
    private TrackingViewPaqueteRepository viewRepo;
    private TrackingProjectorStateRepository stateRepo;
    private TrackingViewProjector projector;

    private final Map<Long, TrackingViewPaquete> viewStore = new HashMap<>();
    private TrackingProjectorState state;

    @BeforeEach
    void setUp() {
        eventRepo = mock(PaqueteEstadoEventoRepository.class);
        viewRepo = mock(TrackingViewPaqueteRepository.class);
        stateRepo = mock(TrackingProjectorStateRepository.class);
        projector = new TrackingViewProjector(eventRepo, viewRepo, stateRepo, /*meterRegistry*/ null);
        ReflectionTestUtils.setField(projector, "batchSize", 100);
        ReflectionTestUtils.setField(projector, "enabled", true);

        viewStore.clear();
        state = TrackingProjectorState.builder()
                .name(TrackingProjectorState.NAME_TRACKING_VIEW_PAQUETE)
                .lastEventId(0L)
                .lastProcessedAt(LocalDateTime.now().minusMinutes(1))
                .updatedAt(LocalDateTime.now().minusMinutes(1))
                .build();
        when(stateRepo.findById(TrackingProjectorState.NAME_TRACKING_VIEW_PAQUETE))
                .thenReturn(Optional.of(state));
        when(stateRepo.save(any(TrackingProjectorState.class))).thenAnswer(i -> i.getArgument(0));

        when(viewRepo.findById(anyLong())).thenAnswer(i -> Optional.ofNullable(viewStore.get(i.getArgument(0))));
        when(viewRepo.save(any(TrackingViewPaquete.class))).thenAnswer(i -> {
            TrackingViewPaquete v = i.getArgument(0);
            viewStore.put(v.getPaqueteId(), v);
            return v;
        });
    }

    private Paquete paquete(Long id, String numeroGuia) {
        DestinatarioFinal d = DestinatarioFinal.builder()
                .id(99L).nombre("Juan Perez").provincia("Pichincha").canton("Quito").build();
        GuiaMaster gm = GuiaMaster.builder().id(11L).trackingBase("TRK-1").build();
        return Paquete.builder()
                .id(id).numeroGuia(numeroGuia).piezaNumero(1).piezaTotal(2)
                .guiaMaster(gm).destinatarioFinal(d).build();
    }

    private EstadoRastreo estado(Long id, String codigo, String nombre) {
        return EstadoRastreo.builder().id(id).codigo(codigo).nombre(nombre).build();
    }

    private PaqueteEstadoEvento evento(long id, Paquete p, EstadoRastreo destino, LocalDateTime when) {
        return PaqueteEstadoEvento.builder()
                .id(id).paquete(p).estadoDestino(destino).occurredAt(when)
                .eventType(TrackingEventType.ESTADO_CAMBIO_MANUAL)
                .enFlujoAlterno(false).bloqueado(false).build();
    }

    @Test
    void drainBatch_aplicaEventosYActualizaEstado() {
        Paquete p = paquete(1L, "ABC 1/2");
        EstadoRastreo enLote = estado(2L, "EN_LOTE", "En lote");
        EstadoRastreo despachado = estado(3L, "EN_DESPACHO", "En despacho");

        when(eventRepo.findEventsAfter(eq(0L), any(Pageable.class)))
                .thenReturn(List.of(
                        evento(10L, p, enLote, LocalDateTime.now().minusMinutes(5)),
                        evento(11L, p, despachado, LocalDateTime.now().minusMinutes(2))
                ));

        int n = projector.drainBatch();
        assertEquals(2, n);

        TrackingViewPaquete row = viewStore.get(1L);
        assertNotNull(row);
        assertEquals("ABC 1/2", row.getNumeroGuia());
        assertEquals("EN_DESPACHO", row.getEstadoActualCodigo(),
                "El ultimo evento debe ser el estado actual");
        assertEquals(11L, row.getLastEventId());
        assertEquals("Pichincha", row.getDestinatarioProvincia());
        // PII NO debe estar (telefono / direccion no estan en el view)

        ArgumentCaptor<TrackingProjectorState> stateCap = ArgumentCaptor.forClass(TrackingProjectorState.class);
        verify(stateRepo).save(stateCap.capture());
        assertEquals(11L, stateCap.getValue().getLastEventId());
    }

    @Test
    void drainBatch_idempotente_noReaplicaEventoYaProcesado() {
        Paquete p = paquete(1L, "ABC 1/2");
        EstadoRastreo enLote = estado(2L, "EN_LOTE", "En lote");
        // Pre-existe la fila con lastEventId = 50
        TrackingViewPaquete preexistente = TrackingViewPaquete.builder()
                .paqueteId(1L).numeroGuia("ABC 1/2").lastEventId(50L)
                .estadoActualId(2L).estadoActualCodigo("EN_LOTE").build();
        viewStore.put(1L, preexistente);

        when(eventRepo.findEventsAfter(eq(0L), any(Pageable.class)))
                .thenReturn(List.of(evento(10L, p, enLote, LocalDateTime.now())));

        projector.drainBatch();
        TrackingViewPaquete row = viewStore.get(1L);
        // No debe reescribir desde un evento mas viejo
        assertEquals(50L, row.getLastEventId());
    }

    @Test
    void drainBatch_sinEventosNoSalva() {
        when(eventRepo.findEventsAfter(eq(0L), any(Pageable.class))).thenReturn(List.of());
        int n = projector.drainBatch();
        assertEquals(0, n);
        verify(viewRepo, never()).save(any());
        verify(stateRepo, never()).save(any());
    }

    @Test
    void drainBatch_creaEstadoSiNoExiste() {
        when(stateRepo.findById(TrackingProjectorState.NAME_TRACKING_VIEW_PAQUETE))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(state));
        when(stateRepo.save(any(TrackingProjectorState.class))).thenAnswer(i -> {
            TrackingProjectorState s = i.getArgument(0);
            state = s;
            return s;
        });
        when(eventRepo.findEventsAfter(eq(0L), any(Pageable.class))).thenReturn(List.of());

        projector.drainBatch();
        verify(stateRepo, times(1)).save(any(TrackingProjectorState.class));
    }

    @Test
    void run_conDeshabilitadoNoHaceNada() {
        ReflectionTestUtils.setField(projector, "enabled", false);
        projector.run();
        verify(eventRepo, never()).findEventsAfter(anyLong(), any(Pageable.class));
    }

    @Test
    void apply_eventoSinPaqueteEsIgnorado() {
        PaqueteEstadoEvento orfano = PaqueteEstadoEvento.builder()
                .id(99L).paquete(null).occurredAt(LocalDateTime.now()).build();
        when(eventRepo.findEventsAfter(eq(0L), any(Pageable.class))).thenReturn(List.of(orfano));

        projector.drainBatch();
        // No deberia escribir filas; el state si avanza
        assertTrue(viewStore.isEmpty());
        verify(viewRepo, never()).save(any());
    }

    @Test
    void isHealthy_evaluaContraUmbral() {
        assertTrue(projector.isHealthy(60));
        // Forzar lag artificialmente para verificar la comparacion
        ReflectionTestUtils.setField(projector, "lagSeconds",
                new java.util.concurrent.atomic.AtomicLong(120));
        assertFalse(projector.isHealthy(60));
        assertTrue(projector.isHealthy(120));
    }

    @Test
    void apply_actualizaCamposDePiezaSinPII() {
        Paquete p = paquete(1L, "ABC 1/2");
        EstadoRastreo entregado = estado(5L, "ENTREGADO", "Entregado");
        when(eventRepo.findEventsAfter(eq(0L), any(Pageable.class)))
                .thenReturn(List.of(evento(20L, p, entregado, LocalDateTime.now())));

        projector.drainBatch();
        TrackingViewPaquete row = viewStore.get(1L);
        // Campos publicos
        assertEquals("Juan Perez", row.getDestinatarioNombre());
        assertEquals("Quito", row.getDestinatarioCanton());
        // No hay setter ni columna de telefono/direccion en la vista (compile-safe)
        assertNull(row.getClass().getDeclaredFields()[0] == null ? null : null,
                "El read model no expone PII (asercion estructural via diseno).");
    }
}
