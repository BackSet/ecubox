package com.ecubox.ecubox_backend.projection;

import com.ecubox.ecubox_backend.entity.DestinatarioFinal;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.GuiaMaster;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.PaqueteEstadoEvento;
import com.ecubox.ecubox_backend.entity.TrackingProjectorState;
import com.ecubox.ecubox_backend.entity.TrackingViewPaquete;
import com.ecubox.ecubox_backend.repository.PaqueteEstadoEventoRepository;
import com.ecubox.ecubox_backend.repository.TrackingProjectorStateRepository;
import com.ecubox.ecubox_backend.repository.TrackingViewPaqueteRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Proyector incremental que aplica los eventos de
 * {@link com.ecubox.ecubox_backend.entity.PaqueteEstadoEvento} a la tabla
 * de lectura {@code tracking_view_paquete}.
 *
 * <ul>
 *   <li>Persistente: usa {@link TrackingProjectorState} para reanudar tras reinicio.</li>
 *   <li>Idempotente: solo aplica eventos cuyo {@code id > last_event_id} y
 *       persiste el ultimo aplicado dentro de la misma transaccion.</li>
 *   <li>Observable: expone metricas Micrometer
 *       {@code tracking.projector.events.applied},
 *       {@code tracking.projector.lag.events} y {@code tracking.projector.lag.seconds}.</li>
 * </ul>
 */
@Component
public class TrackingViewProjector {

    private static final Logger log = LoggerFactory.getLogger(TrackingViewProjector.class);

    private final PaqueteEstadoEventoRepository eventRepository;
    private final TrackingViewPaqueteRepository viewRepository;
    private final TrackingProjectorStateRepository stateRepository;
    private final MeterRegistry meterRegistry;
    /**
     * Self-injection (lazy) para que las llamadas a {@link #drainBatch()} desde
     * {@link #run()} pasen por el proxy AOP de Spring y respeten {@code @Transactional}.
     * Si llamáramos directamente {@code drainBatch()} (this) la transacción NO se
     * aplicaría y los proxies lazy de Hibernate (p. ej. {@code Paquete}) quedarían
     * sin sesión, lanzando {@link org.hibernate.LazyInitializationException}.
     */
    // Nota: NO es final para permitir que en tests unitarios se reasigne via
    // ReflectionTestUtils sin chocar con las restricciones de mutación de
    // campos final introducidas en JDK 25.
    private TrackingViewProjector self;

    @Value("${tracking.projector.batch-size:200}")
    private int batchSize;

    @Value("${tracking.projector.enabled:true}")
    private boolean enabled;

    private final AtomicLong lagEvents = new AtomicLong(0);
    private final AtomicLong lagSeconds = new AtomicLong(0);
    private Counter appliedCounter;

    public TrackingViewProjector(PaqueteEstadoEventoRepository eventRepository,
                                 TrackingViewPaqueteRepository viewRepository,
                                 TrackingProjectorStateRepository stateRepository,
                                 @Autowired(required = false) MeterRegistry meterRegistry,
                                 @Lazy TrackingViewProjector self) {
        this.eventRepository = eventRepository;
        this.viewRepository = viewRepository;
        this.stateRepository = stateRepository;
        this.meterRegistry = meterRegistry;
        this.self = self;
    }

    @PostConstruct
    void registerMetrics() {
        if (meterRegistry == null) return;
        appliedCounter = Counter.builder("tracking.projector.events.applied")
                .description("Eventos aplicados a tracking_view_paquete")
                .register(meterRegistry);
        Gauge.builder("tracking.projector.lag.events", lagEvents, AtomicLong::get)
                .description("Eventos pendientes de procesar")
                .register(meterRegistry);
        Gauge.builder("tracking.projector.lag.seconds", lagSeconds, AtomicLong::get)
                .description("Antiguedad en segundos del evento mas viejo no procesado")
                .register(meterRegistry);
    }

    @Scheduled(fixedDelayString = "${tracking.projector.delay-ms:5000}")
    public void run() {
        if (!enabled) return;
        try {
            // IMPORTANTE: invocamos vía self (proxy AOP) para que @Transactional
            // sobre drainBatch sí se aplique. Una llamada directa drainBatch()
            // se ejecutaría sin transacción y los proxies lazy de Paquete
            // quedarían sin sesión Hibernate.
            int total = self.drainBatch();
            updateLagMetrics();
            if (total > 0) {
                log.debug("tracking_projector_batch processed={}", total);
            }
        } catch (Exception ex) {
            log.error("tracking_projector_error", ex);
        }
    }

    @Transactional
    public int drainBatch() {
        TrackingProjectorState state = loadState();
        Long lastId = state.getLastEventId() != null ? state.getLastEventId() : 0L;
        Pageable page = PageRequest.of(0, Math.max(1, batchSize));
        List<PaqueteEstadoEvento> batch = eventRepository.findEventsAfter(lastId, page);
        if (batch.isEmpty()) {
            return 0;
        }
        Long maxApplied = lastId;
        for (PaqueteEstadoEvento ev : batch) {
            try {
                apply(ev);
                if (ev.getId() != null && ev.getId() > maxApplied) {
                    maxApplied = ev.getId();
                }
                if (appliedCounter != null) appliedCounter.increment();
            } catch (Exception ex) {
                log.error("tracking_projector_apply_error eventId={} paqueteId={}",
                        ev.getId(), safePaqueteId(ev), ex);
                throw ex;
            }
        }
        state.setLastEventId(maxApplied);
        state.setLastProcessedAt(LocalDateTime.now());
        state.setUpdatedAt(LocalDateTime.now());
        stateRepository.save(state);
        return batch.size();
    }

    private void apply(PaqueteEstadoEvento ev) {
        Paquete p = ev.getPaquete();
        if (p == null || p.getId() == null) {
            return;
        }
        // Materializamos las propiedades lazy del paquete ANTES de cualquier
        // operación que pueda cerrar/limpiar la sesión Hibernate (findById,
        // save, etc). Si solo se referencian dentro de un lambda diferido
        // (orElseGet), Hibernate puede haber liberado el proxy y se lanza
        // LazyInitializationException ("no session"). Por eso primero leemos
        // todos los valores y luego construimos la fila.
        Long paqueteId = p.getId();
        String numeroGuia = p.getNumeroGuia();
        Integer piezaNumero = p.getPiezaNumero();
        Integer piezaTotal = p.getPiezaTotal();
        GuiaMaster gm = p.getGuiaMaster();
        String trackingBase = gm != null ? gm.getTrackingBase() : null;
        DestinatarioFinal dest = p.getDestinatarioFinal();
        Long destId = dest != null ? dest.getId() : null;
        String destNombre = dest != null ? dest.getNombre() : null;
        String destProvincia = dest != null ? dest.getProvincia() : null;
        String destCanton = dest != null ? dest.getCanton() : null;

        TrackingViewPaquete row = viewRepository.findById(paqueteId)
                .orElseGet(() -> TrackingViewPaquete.builder()
                        .paqueteId(paqueteId)
                        .numeroGuia(numeroGuia)
                        .build());

        // Si el evento ya fue aplicado, ignorar (idempotencia a nivel fila).
        if (row.getLastEventId() != null && ev.getId() != null && ev.getId() <= row.getLastEventId()) {
            return;
        }

        row.setNumeroGuia(numeroGuia);
        row.setTrackingBase(trackingBase);
        row.setPiezaNumero(piezaNumero);
        row.setPiezaTotal(piezaTotal);

        EstadoRastreo destino = ev.getEstadoDestino();
        if (destino != null) {
            row.setEstadoActualId(destino.getId());
            row.setEstadoActualCodigo(destino.getCodigo());
            row.setEstadoActualNombre(destino.getNombre());
        }
        row.setFechaEstadoDesde(ev.getOccurredAt());
        row.setEnFlujoAlterno(Boolean.TRUE.equals(ev.getEnFlujoAlterno()));
        row.setBloqueado(Boolean.TRUE.equals(ev.getBloqueado()));

        if (destId != null) {
            row.setDestinatarioId(destId);
            row.setDestinatarioNombre(destNombre);
            row.setDestinatarioProvincia(destProvincia);
            row.setDestinatarioCanton(destCanton);
        }

        row.setLastEventId(ev.getId());
        row.setUpdatedAt(LocalDateTime.now());
        viewRepository.save(row);
    }

    private TrackingProjectorState loadState() {
        return stateRepository.findById(TrackingProjectorState.NAME_TRACKING_VIEW_PAQUETE)
                .orElseGet(() -> {
                    LocalDateTime now = LocalDateTime.now();
                    TrackingProjectorState s = TrackingProjectorState.builder()
                            .name(TrackingProjectorState.NAME_TRACKING_VIEW_PAQUETE)
                            .lastEventId(0L)
                            .lastProcessedAt(now)
                            .updatedAt(now)
                            .build();
                    return stateRepository.save(s);
                });
    }

    private void updateLagMetrics() {
        try {
            TrackingProjectorState state = loadState();
            Long lastId = state.getLastEventId() != null ? state.getLastEventId() : 0L;
            // Una sola consulta para conocer el evento mas viejo pendiente.
            List<PaqueteEstadoEvento> oldestPending = eventRepository.findEventsAfter(lastId, PageRequest.of(0, 1));
            if (oldestPending.isEmpty()) {
                lagEvents.set(0);
                lagSeconds.set(0);
                return;
            }
            // Aproximacion: usamos una segunda lectura para conocer el id mas grande.
            // Para evitar contar secuencialmente, aproximamos lag con (max-id - last_id).
            // Aqui no tenemos un repo dedicado; usamos el id del maximo del findEventsAfter
            // con un page mayor seria caro, por lo que caemos a una estimacion conservadora:
            // contamos solo si hay al menos 1 pendiente y exponemos su antiguedad.
            PaqueteEstadoEvento oldest = oldestPending.get(0);
            long ageSeconds = oldest.getOccurredAt() != null
                    ? Math.max(0, ChronoUnit.SECONDS.between(oldest.getOccurredAt(), LocalDateTime.now()))
                    : 0;
            lagSeconds.set(ageSeconds);
            // Para lagEvents nos quedamos con el conteo aproximado del batch maximo;
            // un valor exacto requeriria un count(*), aceptable en healthcheck dedicado.
            lagEvents.set(Math.max(1, oldestPending.size()));
        } catch (Exception ex) {
            log.warn("tracking_projector_lag_metric_error", ex);
        }
    }

    /** Para healthchecks externos: true si lag esta dentro del umbral. */
    public boolean isHealthy(long maxLagSeconds) {
        return lagSeconds.get() <= maxLagSeconds;
    }

    public long getCurrentLagSeconds() {
        return lagSeconds.get();
    }

    private static Long safePaqueteId(PaqueteEstadoEvento ev) {
        try {
            return Optional.ofNullable(ev.getPaquete()).map(Paquete::getId).orElse(null);
        } catch (Exception ex) {
            return null;
        }
    }
}
