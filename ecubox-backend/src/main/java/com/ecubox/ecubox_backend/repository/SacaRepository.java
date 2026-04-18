package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.Saca;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SacaRepository extends JpaRepository<Saca, Long> {

    boolean existsByNumeroOrden(String numeroOrden);

    List<Saca> findByDespachoIdIsNullOrderByIdAsc();

    /** Sacas de un despacho ordenadas por id (para mensaje WhatsApp y totales). */
    List<Saca> findByDespachoIdOrderByIdAsc(Long despachoId);

    /** Sacas pertenecientes a una lista de despachos (single-query bulk). */
    List<Saca> findByDespachoIdIn(List<Long> despachoIds);
}
