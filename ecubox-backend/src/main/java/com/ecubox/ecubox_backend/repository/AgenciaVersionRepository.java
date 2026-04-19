package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.AgenciaVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AgenciaVersionRepository extends JpaRepository<AgenciaVersion, Long> {

    Optional<AgenciaVersion> findFirstByAgenciaIdAndValidToIsNull(Long agenciaId);

    List<AgenciaVersion> findByAgenciaIdOrderByValidFromAsc(Long agenciaId);
}
