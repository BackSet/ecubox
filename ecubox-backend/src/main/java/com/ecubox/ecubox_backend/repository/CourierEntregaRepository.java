package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.CourierEntrega;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CourierEntregaRepository extends JpaRepository<CourierEntrega, Long>, JpaSpecificationExecutor<CourierEntrega> {

    boolean existsByCodigo(String codigo);

    boolean existsByCodigoAndIdNot(String codigo, Long id);
}
