package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.OutboxEvent;
import com.ecubox.ecubox_backend.enums.OutboxEventStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {
    List<OutboxEvent> findTop100ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
            OutboxEventStatus status,
            LocalDateTime nextAttemptAt
    );

    long deleteByAggregateTypeAndAggregateId(String aggregateType, String aggregateId);
}
