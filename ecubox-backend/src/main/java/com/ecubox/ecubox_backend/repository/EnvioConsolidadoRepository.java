package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface EnvioConsolidadoRepository
        extends JpaRepository<EnvioConsolidado, Long>, JpaSpecificationExecutor<EnvioConsolidado> {

    Optional<EnvioConsolidado> findByCodigoIgnoreCase(String codigo);

    boolean existsByCodigoIgnoreCase(String codigo);

    /** Solo envios abiertos (no cerrados): {@code fecha_cerrado IS NULL}. */
    Page<EnvioConsolidado> findByFechaCerradoIsNull(Pageable pageable);

    /** Solo envios cerrados historicamente: {@code fecha_cerrado IS NOT NULL}. */
    Page<EnvioConsolidado> findByFechaCerradoIsNotNull(Pageable pageable);

    /**
     * Envios consolidados que aun no aparecen como linea en ninguna liquidacion
     * (UNIQUE global en {@code liquidacion_consolidado_linea.envio_consolidado_id}).
     * Filtro opcional por busqueda en el codigo.
     */
    @Query("""
            SELECT e FROM EnvioConsolidado e
            WHERE NOT EXISTS (
              SELECT 1 FROM LiquidacionConsolidadoLinea l
              WHERE l.envioConsolidado.id = e.id
            )
              AND LOWER(e.codigo) LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY e.createdAt DESC
            """)
    Page<EnvioConsolidado> findDisponiblesParaLiquidacion(
            @Param("q") String q, Pageable pageable);
}
