package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.AgenciaDistribuidorVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AgenciaDistribuidorVersionRepository extends JpaRepository<AgenciaDistribuidorVersion, Long> {

    Optional<AgenciaDistribuidorVersion> findFirstByAgenciaDistribuidorIdAndValidToIsNull(Long agenciaDistribuidorId);

    List<AgenciaDistribuidorVersion> findByAgenciaDistribuidorIdOrderByValidFromAsc(Long agenciaDistribuidorId);
}
