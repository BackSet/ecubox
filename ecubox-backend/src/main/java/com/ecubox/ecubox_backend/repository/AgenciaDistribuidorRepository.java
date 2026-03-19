package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.AgenciaDistribuidor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AgenciaDistribuidorRepository extends JpaRepository<AgenciaDistribuidor, Long> {

    List<AgenciaDistribuidor> findByDistribuidorIdOrderByCodigoAsc(Long distribuidorId);

    long countByDistribuidorId(Long distribuidorId);

    boolean existsByDistribuidorIdAndCodigo(Long distribuidorId, String codigo);

    boolean existsByDistribuidorIdAndCodigoAndIdNot(Long distribuidorId, String codigo, Long id);
}
