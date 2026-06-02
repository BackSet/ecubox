package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.WebPushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WebPushSubscriptionRepository extends JpaRepository<WebPushSubscription, Long> {

    Optional<WebPushSubscription> findByEndpoint(String endpoint);

    List<WebPushSubscription> findByUsuarioIdAndActiveTrue(Long usuarioId);
}
