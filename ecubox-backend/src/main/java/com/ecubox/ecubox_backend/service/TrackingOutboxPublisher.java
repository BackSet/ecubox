package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.entity.OutboxEvent;

public interface TrackingOutboxPublisher {
    void publish(OutboxEvent event);
}
