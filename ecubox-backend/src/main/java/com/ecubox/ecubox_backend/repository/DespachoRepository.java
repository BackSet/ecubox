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

    // Nota: las antiguas agregaciones de estadísticas por `despacho.fecha_hora`
    // (aggregateByPeriodo/aggregateResumen) se eliminaron. Las métricas de
    // "paquetes despachados" ahora se calculan desde la fuente canónica y
    // auditable de eventos de paquete (PaqueteEstadoEventoRepository), ya que
    // `fecha_hora` es nullable y editable y producía conteos en cero.

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

    // ---------------------------------------------------------------------
    // Resumen liviano del listado (KPIs + opciones de filtro). Los conteos por
    // tipo (respetando courier/período) se calculan con Specification en el
    // servicio para evitar el problema de binds nulos en Postgres.
    // ---------------------------------------------------------------------

    /** Despachos con fecha en el rango [inicio, fin) (KPIs "hoy" y "últimos 7d"). */
    @Query("SELECT COUNT(d) FROM Despacho d WHERE d.fechaHora >= :inicio AND d.fechaHora < :fin")
    long countByFechaHoraEntre(@Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin);

    /** Total de sacas asignadas a algún despacho (KPI "Sacas asignadas"). */
    @Query("SELECT COUNT(s) FROM Saca s WHERE s.despacho IS NOT NULL")
    long countSacasEnDespachos();

    /** Couriers de entrega distintos con al menos un despacho (KPI). */
    @Query("SELECT COUNT(DISTINCT d.courierEntrega.nombre) FROM Despacho d WHERE d.courierEntrega IS NOT NULL")
    long countDistinctCouriers();

    /** Nombres de couriers de entrega distintos (opciones del filtro). */
    @Query("SELECT DISTINCT d.courierEntrega.nombre FROM Despacho d WHERE d.courierEntrega.nombre IS NOT NULL ORDER BY d.courierEntrega.nombre")
    List<String> findDistinctCouriers();

    /** Tipos de entrega distintos presentes en los despachos (opciones del filtro). */
    @Query("SELECT DISTINCT d.tipoEntrega FROM Despacho d ORDER BY d.tipoEntrega")
    List<com.ecubox.ecubox_backend.enums.TipoEntrega> findDistinctTipos();
}
