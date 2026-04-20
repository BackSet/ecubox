package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.ConsignatarioVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConsignatarioVersionRepository extends JpaRepository<ConsignatarioVersion, Long> {

    /** Devuelve la version vigente (valid_to IS NULL) del consignatario indicado. */
    Optional<ConsignatarioVersion> findFirstByConsignatarioIdAndValidToIsNull(Long consignatarioId);

    /** Historial completo (inmutable) ordenado por momento de validez ascendente. */
    List<ConsignatarioVersion> findByConsignatarioIdOrderByValidFromAsc(Long consignatarioId);
}
