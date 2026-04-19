package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.Distribuidor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface DistribuidorRepository extends JpaRepository<Distribuidor, Long>, JpaSpecificationExecutor<Distribuidor> {

    boolean existsByCodigo(String codigo);

    boolean existsByCodigoAndIdNot(String codigo, Long id);
}
