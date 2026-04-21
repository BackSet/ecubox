package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.LiquidacionDespachoLinea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LiquidacionDespachoLineaRepository
        extends JpaRepository<LiquidacionDespachoLinea, Long> {

    boolean existsByDespachoId(Long despachoId);

    Optional<LiquidacionDespachoLinea> findByDespachoId(Long despachoId);

    @Query("""
            SELECT l FROM LiquidacionDespachoLinea l
            JOIN FETCH l.despacho d
            LEFT JOIN FETCH d.courierEntrega
            WHERE l.liquidacion.id = :liquidacionId
            ORDER BY l.id ASC
            """)
    List<LiquidacionDespachoLinea> findByLiquidacionIdConDespacho(
            @Param("liquidacionId") Long liquidacionId);

    long countByLiquidacionId(Long liquidacionId);
}
