package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.TrackingViewPaquete;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TrackingViewPaqueteRepository extends JpaRepository<TrackingViewPaquete, Long> {
    Optional<TrackingViewPaquete> findByNumeroGuiaIgnoreCase(String numeroGuia);
}
