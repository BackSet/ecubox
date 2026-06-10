package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.LoteRecepcion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface LoteRecepcionRepository
        extends JpaRepository<LoteRecepcion, Long>, JpaSpecificationExecutor<LoteRecepcion> {

    @Query("SELECT DISTINCT l FROM LoteRecepcion l LEFT JOIN FETCH l.guias ORDER BY l.fechaRecepcion DESC")
    List<LoteRecepcion> findAllByOrderByFechaRecepcionDesc();

    @Query("SELECT l FROM LoteRecepcion l LEFT JOIN FETCH l.guias WHERE l.id = :id")
    Optional<LoteRecepcion> findByIdWithGuias(@Param("id") Long id);

    @Query("SELECT DISTINCT l FROM LoteRecepcion l LEFT JOIN FETCH l.guias LEFT JOIN FETCH l.operario WHERE l.id = :id")
    Optional<LoteRecepcion> findByIdWithGuiasAndOperario(@Param("id") Long id);

    // ---------------------------------------------------------------------
    // Resumen liviano del listado (KPIs + opciones de filtro). El listado
    // paginado se resuelve con Specification en el servicio.
    // ---------------------------------------------------------------------

    /** Conteo de guías de envío distintas en recepción (KPI del resumen). */
    @Query("SELECT COUNT(DISTINCT g.numeroGuiaEnvio) FROM LoteRecepcionGuia g")
    long countGuiasUnicas();

    /** Lotes recibidos dentro del rango [inicio, fin) (KPI "Lotes hoy"). */
    @Query("SELECT COUNT(l) FROM LoteRecepcion l WHERE l.fechaRecepcion >= :inicio AND l.fechaRecepcion < :fin")
    long countByFechaRecepcionEntre(@Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin);

    /**
     * Total de paquetes recibidos: paquetes cuyo código de envío consolidado
     * coincide con alguna guía registrada en algún lote de recepción.
     */
    @Query("""
            SELECT COUNT(DISTINCT p.id) FROM Paquete p
            WHERE p.envioConsolidado IS NOT NULL
              AND LOWER(TRIM(p.envioConsolidado.codigo)) IN (
                SELECT DISTINCT LOWER(TRIM(g.numeroGuiaEnvio)) FROM LoteRecepcionGuia g
              )
            """)
    long countPaquetesRecibidos();

    /** Operarios distintos presentes en los lotes (opciones del filtro). */
    @Query("SELECT DISTINCT o.username FROM LoteRecepcion l JOIN l.operario o WHERE o.username IS NOT NULL ORDER BY o.username")
    List<String> findDistinctOperarios();
}
