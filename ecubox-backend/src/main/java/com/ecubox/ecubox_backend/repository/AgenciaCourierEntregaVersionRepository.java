package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.AgenciaCourierEntregaVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AgenciaCourierEntregaVersionRepository extends JpaRepository<AgenciaCourierEntregaVersion, Long> {

    Optional<AgenciaCourierEntregaVersion> findFirstByAgenciaCourierEntregaIdAndValidToIsNull(Long agenciaCourierEntregaId);

    List<AgenciaCourierEntregaVersion> findByAgenciaCourierEntregaIdOrderByValidFromAsc(Long agenciaCourierEntregaId);
}
