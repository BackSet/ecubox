package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.Despacho;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface DespachoRepository extends JpaRepository<Despacho, Long>,
        JpaSpecificationExecutor<Despacho> {

    List<Despacho> findByManifiestoId(Long manifiestoId);

    List<Despacho> findByFechaHoraBetweenOrderByFechaHoraAscIdAsc(LocalDateTime desde, LocalDateTime hasta);

    @Query("""
            SELECT d
            FROM Despacho d
            WHERE d.manifiesto IS NULL
              AND d.fechaHora IS NOT NULL
              AND d.fechaHora >= :desde
              AND d.fechaHora < :hastaExclusivo
              AND (:courierEntregaId IS NULL OR d.courierEntrega.id = :courierEntregaId)
              AND (:agenciaId IS NULL OR d.agencia.id = :agenciaId)
            ORDER BY d.fechaHora ASC, d.id ASC
            """)
    List<Despacho> findCandidatosParaManifiesto(
            @Param("desde") LocalDateTime desde,
            @Param("hastaExclusivo") LocalDateTime hastaExclusivo,
            @Param("courierEntregaId") Long courierEntregaId,
            @Param("agenciaId") Long agenciaId
    );

    /**
     * Despachos relacionados con un envío consolidado a través de la cadena
     * <code>EnvioConsolidado &lt;- Paquete -&gt; Saca -&gt; Despacho</code>.
     * Se usa en la liquidación para listar despachos candidatos a agregar como
     * línea. Hidrata el courier para evitar lazy loading al armar el DTO.
     */
    @Query("""
            SELECT DISTINCT d
            FROM Paquete p
            JOIN p.saca s
            JOIN s.despacho d
            LEFT JOIN FETCH d.courierEntrega
            WHERE p.envioConsolidado.id = :envioConsolidadoId
              AND s.despacho IS NOT NULL
            ORDER BY d.id ASC
            """)
    List<Despacho> findByEnvioConsolidadoId(@Param("envioConsolidadoId") Long envioConsolidadoId);

    /**
     * Suma del peso (lbs) de los paquetes de un envío consolidado que viajan en
     * un despacho particular (vía saca). Se usa para sugerir el peso de la
     * línea de liquidación.
     */
    @Query("""
            SELECT COALESCE(SUM(p.pesoLbs), 0)
            FROM Paquete p
            JOIN p.saca s
            WHERE p.envioConsolidado.id = :envioConsolidadoId
              AND s.despacho.id = :despachoId
            """)
    java.math.BigDecimal sumPesoLbsPorDespachoYConsolidado(
            @Param("envioConsolidadoId") Long envioConsolidadoId,
            @Param("despachoId") Long despachoId
    );

    /**
     * Suma del peso (lbs) de todos los paquetes incluidos en sacas que viajan
     * en un despacho. Sirve para sugerir el peso al agregar el despacho a la
     * seccion B de una liquidacion (independiente del consolidado).
     */
    @Query("""
            SELECT COALESCE(SUM(p.pesoLbs), 0)
            FROM Paquete p
            JOIN p.saca s
            WHERE s.despacho.id = :despachoId
            """)
    java.math.BigDecimal sumPesoLbsPorDespacho(@Param("despachoId") Long despachoId);

    /**
     * Despachos que aun no aparecen como linea en ninguna liquidacion (UNIQUE
     * global en {@code liquidacion_despacho_linea.despacho_id}). Hidrata el
     * courier para evitar lazy loading al armar el DTO.
     */
    @Query(value = """
            SELECT DISTINCT d FROM Despacho d
            LEFT JOIN FETCH d.courierEntrega
            WHERE NOT EXISTS (
              SELECT 1 FROM LiquidacionDespachoLinea l
              WHERE l.despacho.id = d.id
            )
              AND (LOWER(d.numeroGuia) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(d.courierEntrega.nombre, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY d.fechaHora DESC, d.id DESC
            """,
            countQuery = """
            SELECT COUNT(d) FROM Despacho d
            WHERE NOT EXISTS (
              SELECT 1 FROM LiquidacionDespachoLinea l
              WHERE l.despacho.id = d.id
            )
              AND (LOWER(d.numeroGuia) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(d.courierEntrega.nombre, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<Despacho> findDisponiblesParaLiquidacion(@Param("q") String q, Pageable pageable);
}
