package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.PaqueteEstadoEvento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaqueteEstadoEventoRepository extends JpaRepository<PaqueteEstadoEvento, Long> {
    List<PaqueteEstadoEvento> findByPaqueteIdOrderByOccurredAtAscIdAsc(Long paqueteId);
}
