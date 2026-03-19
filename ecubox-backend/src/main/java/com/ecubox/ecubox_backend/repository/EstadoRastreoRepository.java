package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface EstadoRastreoRepository extends JpaRepository<EstadoRastreo, Long> {

    List<EstadoRastreo> findAllByOrderByOrdenAscIdAsc();

    List<EstadoRastreo> findByActivoTrueOrderByOrdenAscIdAsc();

    List<EstadoRastreo> findAllByOrderByOrdenTrackingAscIdAsc();

    List<EstadoRastreo> findByActivoTrueOrderByOrdenTrackingAscIdAsc();

    Optional<EstadoRastreo> findByCodigo(String codigo);

    boolean existsByCodigoAndIdNot(String codigo, Long id);

    boolean existsByCodigo(String codigo);

    @Query("select coalesce(max(e.ordenTracking), 0) from EstadoRastreo e")
    Integer findMaxOrdenTracking();
}
