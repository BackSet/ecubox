package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.LiquidacionConsolidadoLinea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LiquidacionConsolidadoLineaRepository
        extends JpaRepository<LiquidacionConsolidadoLinea, Long> {

    boolean existsByEnvioConsolidadoId(Long envioConsolidadoId);

    Optional<LiquidacionConsolidadoLinea> findByEnvioConsolidadoId(Long envioConsolidadoId);

    @Query("""
            SELECT l FROM LiquidacionConsolidadoLinea l
            JOIN FETCH l.envioConsolidado
            WHERE l.liquidacion.id = :liquidacionId
            ORDER BY l.id ASC
            """)
    List<LiquidacionConsolidadoLinea> findByLiquidacionIdConEnvio(
            @Param("liquidacionId") Long liquidacionId);

    long countByLiquidacionId(Long liquidacionId);

    @Query("""
            SELECT l.envioConsolidado.id
            FROM LiquidacionConsolidadoLinea l
            WHERE l.liquidacion.id = :liquidacionId
            """)
    List<Long> findEnvioIdsByLiquidacionId(@Param("liquidacionId") Long liquidacionId);
}
