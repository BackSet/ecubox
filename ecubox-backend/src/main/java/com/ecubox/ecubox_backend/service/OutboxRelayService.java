package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.entity.OutboxEvent;
import com.ecubox.ecubox_backend.enums.OutboxEventStatus;
import com.ecubox.ecubox_backend.repository.OutboxEventRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class OutboxRelayService {

    private final OutboxEventRepository outboxEventRepository;
    private final TrackingOutboxPublisher trackingOutboxPublisher;
    private final int maxAttempts;

    public OutboxRelayService(OutboxEventRepository outboxEventRepository,
                              TrackingOutboxPublisher trackingOutboxPublisher,
                              @Value("${tracking.outbox.max-attempts:6}") int maxAttempts) {
        this.outboxEventRepository = outboxEventRepository;
        this.trackingOutboxPublisher = trackingOutboxPublisher;
        this.maxAttempts = maxAttempts;
    }

    @Scheduled(fixedDelayString = "${tracking.outbox.relay-delay-ms:5000}")
    @Transactional
    public void processPendingEvents() {
        LocalDateTime now = LocalDateTime.now();
        List<OutboxEvent> pending = outboxEventRepository
                .findTop100ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(OutboxEventStatus.PENDING, now);
        for (OutboxEvent event : pending) {
            try {
                trackingOutboxPublisher.publish(event);
                event.setStatus(OutboxEventStatus.SENT);
                event.setSentAt(LocalDateTime.now());
                event.setErrorMessage(null);
            } catch (Exception ex) {
                int attempts = (event.getAttempts() != null ? event.getAttempts() : 0) + 1;
                event.setAttempts(attempts);
                event.setErrorMessage(ex.getMessage());
                if (attempts >= maxAttempts) {
                    event.setStatus(OutboxEventStatus.FAILED);
                } else {
                    long delaySeconds = Math.min(60L, 1L << Math.min(6, attempts));
                    event.setNextAttemptAt(LocalDateTime.now().plusSeconds(delaySeconds));
                }
            }
            outboxEventRepository.save(event);
        }
    }
}
