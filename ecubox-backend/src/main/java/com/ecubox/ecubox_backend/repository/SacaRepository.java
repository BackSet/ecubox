package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.Saca;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SacaRepository extends JpaRepository<Saca, Long> {

    Optional<Saca> findByNumeroOrden(String numeroOrden);

    boolean existsByNumeroOrden(String numeroOrden);

    List<Saca> findByDespachoIdIsNullOrderByIdAsc();

    /** Sacas de un despacho ordenadas por id (para mensaje WhatsApp y totales). */
    List<Saca> findByDespachoIdOrderByIdAsc(Long despachoId);
}
