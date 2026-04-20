package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.AgenciaCourierEntrega;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface AgenciaCourierEntregaRepository extends JpaRepository<AgenciaCourierEntrega, Long>, JpaSpecificationExecutor<AgenciaCourierEntrega> {

    List<AgenciaCourierEntrega> findByCourierEntregaIdOrderByCodigoAsc(Long courierEntregaId);

    long countByCourierEntregaId(Long courierEntregaId);

    boolean existsByCourierEntregaIdAndCodigo(Long courierEntregaId, String codigo);
}
