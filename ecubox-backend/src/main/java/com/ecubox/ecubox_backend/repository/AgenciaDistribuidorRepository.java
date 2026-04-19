package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.AgenciaDistribuidor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface AgenciaDistribuidorRepository extends JpaRepository<AgenciaDistribuidor, Long>, JpaSpecificationExecutor<AgenciaDistribuidor> {

    List<AgenciaDistribuidor> findByDistribuidorIdOrderByCodigoAsc(Long distribuidorId);

    long countByDistribuidorId(Long distribuidorId);

    boolean existsByDistribuidorIdAndCodigo(Long distribuidorId, String codigo);
}
