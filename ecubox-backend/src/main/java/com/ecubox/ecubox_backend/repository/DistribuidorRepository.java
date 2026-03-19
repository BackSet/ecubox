package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.Distribuidor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DistribuidorRepository extends JpaRepository<Distribuidor, Long> {

    Optional<Distribuidor> findByCodigo(String codigo);

    boolean existsByCodigo(String codigo);

    boolean existsByCodigoAndIdNot(String codigo, Long id);
}
