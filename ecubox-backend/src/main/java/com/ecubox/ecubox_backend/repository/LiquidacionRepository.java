package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.Liquidacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Optional;

public interface LiquidacionRepository
        extends JpaRepository<Liquidacion, Long>, JpaSpecificationExecutor<Liquidacion> {

    /** Devuelve el siguiente número de la secuencia {@code seq_liquidacion_codigo}. */
    @Query(value = "SELECT nextval('seq_liquidacion_codigo')", nativeQuery = true)
    Long nextCodigoSequence();

    @Query("""
            SELECT l FROM Liquidacion l
            LEFT JOIN FETCH l.consolidados lc
            LEFT JOIN FETCH lc.envioConsolidado
            WHERE l.id = :id
            """)
    Optional<Liquidacion> findByIdConConsolidados(@Param("id") Long id);

    @Query(value = """
            SELECT
                COALESCE((
                    SELECT SUM(lcl.margen_linea)
                           / NULLIF(SUM(peso_envio.peso_lbs), 0)
                    FROM liquidacion_consolidado_linea lcl
                    JOIN (
                        SELECT p.envio_consolidado_id,
                               SUM(COALESCE(p.peso_lbs, 0)) AS peso_lbs
                        FROM paquete p
                        WHERE p.envio_consolidado_id IS NOT NULL
                        GROUP BY p.envio_consolidado_id
                    ) peso_envio
                      ON peso_envio.envio_consolidado_id = lcl.envio_consolidado_id
                ), 0) AS "margenPorLibra",
                COALESCE((
                    SELECT SUM(ldl.costo_calculado)
                           / NULLIF(SUM(ldl.peso_lbs), 0)
                    FROM liquidacion_despacho_linea ldl
                ), 0) AS "costoDistribucionPorLibra"
            """, nativeQuery = true)
    TasasEstimacionProjection findTasasEstimacionHistoricas();

    interface TasasEstimacionProjection {
        BigDecimal getMargenPorLibra();

        BigDecimal getCostoDistribucionPorLibra();
    }
}
