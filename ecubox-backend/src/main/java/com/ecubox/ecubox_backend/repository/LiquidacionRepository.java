package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.Liquidacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
}
