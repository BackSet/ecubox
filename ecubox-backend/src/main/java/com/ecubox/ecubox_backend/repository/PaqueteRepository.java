package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.Paquete;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PaqueteRepository extends JpaRepository<Paquete, Long>, JpaSpecificationExecutor<Paquete> {
    Optional<Paquete> findByNumeroGuiaIgnoreCase(String numeroGuia);

    /**
     * Carga paquete con todas las asociaciones que el endpoint publico de
     * tracking lee (saca, despacho, courierEntrega/agencia/agenciaCourierEntrega,
     * destinatario del despacho, destinatario final del paquete, estado y
     * guia master). Sin estos JOIN FETCH la respuesta de tracking dispara
     * decenas de queries por LAZY loading.
     */
    @Query("SELECT DISTINCT p FROM Paquete p " +
           "LEFT JOIN FETCH p.estadoRastreo " +
           "LEFT JOIN FETCH p.consignatario df " +
           "LEFT JOIN FETCH df.usuario " +
           "LEFT JOIN FETCH p.saca s " +
           "LEFT JOIN FETCH s.despacho d " +
           "LEFT JOIN FETCH d.courierEntrega " +
           "LEFT JOIN FETCH d.agencia " +
           "LEFT JOIN FETCH d.agenciaCourierEntrega " +
           "LEFT JOIN FETCH d.consignatario " +
           "LEFT JOIN FETCH p.guiaMaster " +
           "WHERE LOWER(p.numeroGuia) = LOWER(:numeroGuia)")
    Optional<Paquete> findByNumeroGuiaWithSacaAndDespacho(@Param("numeroGuia") String numeroGuia);

    boolean existsByNumeroGuia(String numeroGuia);

    /** Verifica si existe otro paquete (distinto de id) con el mismo número de guía. */
    boolean existsByNumeroGuiaAndIdNot(String numeroGuia, Long id);

    Optional<Paquete> findByRef(String ref);

    boolean existsByRef(String ref);

    /** Verifica si existe otro paquete (distinto de id) con la misma ref. */
    boolean existsByRefAndIdNot(String ref, Long id);

    long countByConsignatarioId(Long consignatarioId);

    long countBySacaId(Long sacaId);

    long countByEstadoRastreoId(Long estadoRastreoId);

    long countByGuiaMasterId(Long guiaMasterId);

    @Query(value = """
            SELECT date_trunc('month', p.created_at) AS periodo,
                   COUNT(*) AS total
            FROM paquete p
            WHERE p.created_at >= :desde
              AND p.created_at < :hasta
            GROUP BY date_trunc('month', p.created_at)
            ORDER BY periodo
            """, nativeQuery = true)
    List<Object[]> aggregateRegistradosByMonth(@Param("desde") LocalDateTime desde,
                                               @Param("hasta") LocalDateTime hasta);

    @Query("""
            SELECT p.estadoRastreo.id, p.estadoRastreo.codigo,
                   p.estadoRastreo.nombre, COUNT(p)
            FROM Paquete p
            GROUP BY p.estadoRastreo.id, p.estadoRastreo.codigo,
                     p.estadoRastreo.nombre, p.estadoRastreo.orden
            ORDER BY p.estadoRastreo.orden, p.estadoRastreo.nombre
            """)
    List<Object[]> aggregateByEstado();

    @Query("""
            SELECT COUNT(p)
            FROM Paquete p
            LEFT JOIN p.saca s
            LEFT JOIN s.despacho d
            WHERE (s IS NULL OR d IS NULL)
              AND p.estadoRastreo.ordenTracking < :ordenTerminal
            """)
    long countPendientesDespacho(@Param("ordenTerminal") Integer ordenTerminal);

    @Query("""
            SELECT COUNT(p)
            FROM Paquete p
            LEFT JOIN p.saca s
            LEFT JOIN s.despacho d
            WHERE (s IS NULL OR d IS NULL)
              AND p.createdAt < :limite
              AND p.estadoRastreo.ordenTracking < :ordenTerminal
            """)
    long countDemoradosSinDespachar(@Param("limite") LocalDateTime limite,
                                    @Param("ordenTerminal") Integer ordenTerminal);

    @Query("""
            SELECT p
            FROM Paquete p
            JOIN FETCH p.estadoRastreo
            JOIN FETCH p.consignatario
            LEFT JOIN FETCH p.guiaMaster
            LEFT JOIN FETCH p.saca s
            LEFT JOIN FETCH s.despacho
            WHERE (p.saca IS NULL OR s.despacho IS NULL)
              AND p.createdAt < :limite
              AND p.estadoRastreo.ordenTracking < :ordenTerminal
            ORDER BY p.createdAt ASC, p.id ASC
            """)
    List<Paquete> findDemoradosSinDespachar(@Param("limite") LocalDateTime limite,
                                            @Param("ordenTerminal") Integer ordenTerminal,
                                            org.springframework.data.domain.Pageable pageable);

    @Query("""
            SELECT COUNT(p)
            FROM Paquete p
            LEFT JOIN p.saca s
            LEFT JOIN s.despacho d
            WHERE (s IS NULL OR d IS NULL)
              AND p.estadoRastreo.ordenTracking >= :ordenTerminal
            """)
    long countEntregadosSinDespacho(@Param("ordenTerminal") Integer ordenTerminal);

    @Query("""
            SELECT p
            FROM Paquete p
            JOIN FETCH p.estadoRastreo
            JOIN FETCH p.consignatario
            LEFT JOIN FETCH p.guiaMaster
            LEFT JOIN FETCH p.saca s
            LEFT JOIN FETCH s.despacho
            WHERE (p.saca IS NULL OR s.despacho IS NULL)
              AND p.estadoRastreo.ordenTracking >= :ordenTerminal
            ORDER BY p.createdAt ASC, p.id ASC
            """)
    List<Paquete> findEntregadosSinDespacho(
            @Param("ordenTerminal") Integer ordenTerminal,
            org.springframework.data.domain.Pageable pageable);

    @Query("""
            SELECT COUNT(p)
            FROM Paquete p
            WHERE p.createdAt >= :desde AND p.createdAt < :hasta
            """)
    long countRegistradosEntre(@Param("desde") LocalDateTime desde,
                               @Param("hasta") LocalDateTime hasta);

    @Query("""
            SELECT COALESCE(SUM(p.pesoLbs), 0)
            FROM Paquete p
            WHERE p.createdAt >= :desde
              AND p.createdAt < :hasta
            """)
    BigDecimal sumPesoRegistradoEntre(@Param("desde") LocalDateTime desde,
                                      @Param("hasta") LocalDateTime hasta);

    /**
     * Promedio de días entre el registro del paquete y la fecha del despacho,
     * para los paquetes despachados dentro del período. Devuelve {@code null}
     * cuando no hay despachos con fechas válidas.
     */
    @Query(value = """
            SELECT AVG(EXTRACT(EPOCH FROM (d.fecha_hora - p.created_at)) / 86400.0)
            FROM paquete p
            JOIN saca s ON p.saca_id = s.id
            JOIN despacho d ON s.despacho_id = d.id
            WHERE d.fecha_hora >= :desde
              AND d.fecha_hora < :hasta
              AND d.fecha_hora >= p.created_at
            """, nativeQuery = true)
    Double avgDiasDespachoEntre(@Param("desde") LocalDateTime desde,
                                @Param("hasta") LocalDateTime hasta);

    List<Paquete> findByConsignatarioUsuarioIdOrderByEstadoRastreo_OrdenAscIdAsc(Long usuarioId);

    List<Paquete> findBySacaId(Long sacaId);

    /** IDs de paquetes pertenecientes a una saca; util para evitar cargar toda la entidad cuando solo se necesita el id. */
    @Query("SELECT p.id FROM Paquete p WHERE p.saca.id = :sacaId")
    List<Long> findIdsBySacaId(@Param("sacaId") Long sacaId);

    /** IDs de paquetes pertenecientes a una lista de sacas (una sola query por lote). */
    @Query("SELECT p.id FROM Paquete p WHERE p.saca.id IN :sacaIds")
    List<Long> findIdsBySacaIdIn(@Param("sacaIds") List<Long> sacaIds);

    /**
     * IDs distintos de guia_master a los que pertenecen los paquetes indicados.
     * Util para recalcular el estado agregado de las guias afectadas por una
     * operacion en lote.
     */
    @Query("SELECT DISTINCT p.guiaMaster.id FROM Paquete p WHERE p.id IN :paqueteIds AND p.guiaMaster.id IS NOT NULL")
    List<Long> findGuiaMasterIdsByPaqueteIds(@Param("paqueteIds") List<Long> paqueteIds);

    /** Paquetes de una saca en orden de creación. */
    List<Paquete> findBySacaIdOrderByIdAsc(Long sacaId);

    List<Paquete> findByConsignatarioIdOrderByIdAsc(Long consignatarioId);

    /** Paquetes sin saca asignada (disponibles para agregar a una saca), orden por creación. */
    List<Paquete> findBySacaIsNullOrderByIdAsc();

    /** Paquetes sin peso cargado (pendientes para operario). */
    List<Paquete> findByPesoLbsIsNullOrderByEstadoRastreo_OrdenAscIdAsc();

    /** Piezas (paquetes) de una guía master, ordenadas por número de pieza. */
    List<Paquete> findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(Long guiaMasterId);

    /** Piezas de una guía master identificada por su tracking base (case-insensitive). */
    @Query("SELECT p FROM Paquete p " +
           "WHERE LOWER(p.guiaMaster.trackingBase) = LOWER(:trackingBase) " +
           "ORDER BY p.piezaNumero ASC, p.id ASC")
    List<Paquete> findByGuiaMasterTrackingBaseIgnoreCase(@Param("trackingBase") String trackingBase);

    /** Verifica si ya existe una pieza con ese número en la guía. */
    boolean existsByGuiaMasterIdAndPiezaNumero(Long guiaMasterId, Integer piezaNumero);

    /** Paquetes cuyos numeroGuia están en la lista dada. */
    List<Paquete> findByNumeroGuiaIn(List<String> numeroGuias);

    /** Paquetes cuyos numeroGuia están en la lista dada, comparando case-insensitive. */
    @Query("SELECT p FROM Paquete p WHERE LOWER(p.numeroGuia) IN :numeroGuiasLower")
    List<Paquete> findByNumeroGuiaInIgnoreCase(@Param("numeroGuiasLower") List<String> numeroGuiasLower);

    /**
     * Paquetes asociados a un envio consolidado, con destinatario final y guia
     * master ya cargados. Optimizado para la generacion del manifiesto (PDF y
     * XLSX) que itera sobre cada paquete leyendo destinatario.* y guiaMaster.*.
     */
    @Query("SELECT DISTINCT p FROM Paquete p " +
           "LEFT JOIN FETCH p.consignatario df " +
           "LEFT JOIN FETCH df.usuario " +
           "LEFT JOIN FETCH p.guiaMaster " +
           "LEFT JOIN FETCH p.estadoRastreo " +
           "WHERE p.envioConsolidado.id = :envioConsolidadoId " +
           "ORDER BY p.id ASC")
    List<Paquete> findByEnvioConsolidadoIdOrderByIdAsc(@Param("envioConsolidadoId") Long envioConsolidadoId);

    long countByEnvioConsolidadoId(Long envioConsolidadoId);

    @Query("SELECT COALESCE(SUM(p.pesoLbs), 0) FROM Paquete p WHERE p.envioConsolidado.id = :envioId")
    java.math.BigDecimal sumPesoLbsByEnvioConsolidadoId(@Param("envioId") Long envioConsolidadoId);
}
