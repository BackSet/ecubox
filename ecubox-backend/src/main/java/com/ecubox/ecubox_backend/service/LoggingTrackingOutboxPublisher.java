package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.entity.OutboxEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class LoggingTrackingOutboxPublisher implements TrackingOutboxPublisher {

    private static final Logger log = LoggerFactory.getLogger(LoggingTrackingOutboxPublisher.class);

    @Override
    public void publish(OutboxEvent event) {
        log.info("Tracking outbox published eventId={} aggregateType={} aggregateId={} eventType={}",
                event.getEventId(),
                event.getAggregateType(),
                event.getAggregateId(),
                event.getEventType());
    }
}
