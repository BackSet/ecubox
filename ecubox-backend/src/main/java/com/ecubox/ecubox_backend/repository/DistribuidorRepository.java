package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.Distribuidor;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DistribuidorRepository extends JpaRepository<Distribuidor, Long> {

    boolean existsByCodigo(String codigo);

    boolean existsByCodigoAndIdNot(String codigo, Long id);
}
