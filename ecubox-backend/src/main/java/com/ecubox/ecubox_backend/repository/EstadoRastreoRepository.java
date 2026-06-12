package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EstadoRastreoRepository extends JpaRepository<EstadoRastreo, Long> {

    List<EstadoRastreo> findByActivoTrueOrderByOrdenAscIdAsc();

    List<EstadoRastreo> findAllByOrderByOrdenTrackingAscIdAsc();

    List<EstadoRastreo> findByActivoTrueOrderByOrdenTrackingAscIdAsc();

    List<EstadoRastreo> findByActivoTrueAndPublicoTrackingTrueOrderByOrdenTrackingAscIdAsc();

    Optional<EstadoRastreo> findByCodigo(String codigo);

    boolean existsByCodigoAndIdNot(String codigo, Long id);

    boolean existsByCodigo(String codigo);

    @Query("select coalesce(max(e.ordenTracking), 0) from EstadoRastreo e")
    Integer findMaxOrdenTracking();

    @Query("""
            SELECT COALESCE(MAX(e.ordenTracking), 0)
            FROM EstadoRastreo e
            WHERE e.activo = true
              AND e.tipoFlujo = :tipoFlujo
            """)
    Integer findMaxOrdenTrackingActivoByTipoFlujo(
            @Param("tipoFlujo") TipoFlujoEstado tipoFlujo);
}
