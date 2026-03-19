package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.OutboxEvent;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.PaqueteEstadoEvento;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.enums.OutboxEventStatus;
import com.ecubox.ecubox_backend.enums.TrackingEventType;
import com.ecubox.ecubox_backend.repository.OutboxEventRepository;
import com.ecubox.ecubox_backend.repository.PaqueteEstadoEventoRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TrackingEventService {

    private final PaqueteEstadoEventoRepository paqueteEstadoEventoRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    public TrackingEventService(PaqueteEstadoEventoRepository paqueteEstadoEventoRepository,
                                OutboxEventRepository outboxEventRepository) {
        this.paqueteEstadoEventoRepository = paqueteEstadoEventoRepository;
        this.outboxEventRepository = outboxEventRepository;
    }

    @Transactional
    public void registrarTransicion(Paquete paquete,
                                    EstadoRastreo estadoOrigen,
                                    EstadoRastreo estadoDestino,
                                    TrackingEventType eventType,
                                    String eventSource,
                                    String motivoAlterno,
                                    Long actorUsuarioId,
                                    String idempotencyKey) {
        LocalDateTime now = LocalDateTime.now();
        UUID eventId = UUID.randomUUID();
        Usuario actor = actorUsuarioId != null ? Usuario.builder().id(actorUsuarioId).build() : null;

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("numeroGuia", paquete.getNumeroGuia());
        metadata.put("enFlujoAlterno", Boolean.TRUE.equals(paquete.getEnFlujoAlterno()));
        metadata.put("bloqueado", Boolean.TRUE.equals(paquete.getBloqueado()));
        metadata.put("fechaEstadoActualDesde", paquete.getFechaEstadoActualDesde());
        metadata.put("motivoAlterno", paquete.getMotivoAlterno());

        String metadataJson = toJson(metadata);

        PaqueteEstadoEvento evento = PaqueteEstadoEvento.builder()
                .eventId(eventId)
                .paquete(paquete)
                .estadoOrigen(estadoOrigen)
                .estadoDestino(estadoDestino)
                .eventType(eventType)
                .eventSource(eventSource)
                .actorUsuario(actor)
                .motivoAlterno(motivoAlterno)
                .enFlujoAlterno(Boolean.TRUE.equals(paquete.getEnFlujoAlterno()))
                .bloqueado(Boolean.TRUE.equals(paquete.getBloqueado()))
                .idempotencyKey(idempotencyKey)
                .metadataJson(metadataJson)
                .occurredAt(now)
                .createdAt(now)
                .build();
        paqueteEstadoEventoRepository.save(evento);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("eventId", eventId);
        payload.put("eventType", eventType.name());
        payload.put("eventSource", eventSource);
        payload.put("occurredAt", now);
        payload.put("paqueteId", paquete.getId());
        payload.put("numeroGuia", paquete.getNumeroGuia());
        payload.put("estadoOrigenId", estadoOrigen != null ? estadoOrigen.getId() : null);
        payload.put("estadoOrigenCodigo", estadoOrigen != null ? estadoOrigen.getCodigo() : null);
        payload.put("estadoDestinoId", estadoDestino.getId());
        payload.put("estadoDestinoCodigo", estadoDestino.getCodigo());
        payload.put("actorUsuarioId", actorUsuarioId);
        payload.put("motivoAlterno", motivoAlterno);
        payload.put("bloqueado", Boolean.TRUE.equals(paquete.getBloqueado()));
        payload.put("enFlujoAlterno", Boolean.TRUE.equals(paquete.getEnFlujoAlterno()));
        payload.put("idempotencyKey", idempotencyKey);

        OutboxEvent outboxEvent = OutboxEvent.builder()
                .eventId(eventId)
                .aggregateType("PAQUETE")
                .aggregateId(String.valueOf(paquete.getId()))
                .eventType(eventType.name())
                .payloadJson(toJson(payload))
                .status(OutboxEventStatus.PENDING)
                .attempts(0)
                .nextAttemptAt(now)
                .createdAt(now)
                .build();
        outboxEventRepository.save(outboxEvent);
    }

    @Transactional(readOnly = true)
    public List<PaqueteEstadoEvento> listarEventosPorPaquete(Long paqueteId) {
        return paqueteEstadoEventoRepository.findByPaqueteIdOrderByOccurredAtAscIdAsc(paqueteId);
    }

    private String toJson(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("No se pudo serializar payload de tracking event", e);
        }
    }
}
