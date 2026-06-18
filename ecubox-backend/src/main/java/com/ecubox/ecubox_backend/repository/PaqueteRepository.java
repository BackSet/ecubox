package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.Paquete;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PaqueteRepository extends JpaRepository<Paquete, Long>, JpaSpecificationExecutor<Paquete> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Paquete p WHERE p.id = :id")
    Optional<Paquete> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Paquete p WHERE p.id IN :ids ORDER BY p.id")
    List<Paquete> findAllByIdForUpdate(@Param("ids") Collection<Long> ids);

    Optional<Paquete> findByNumeroGuiaIgnoreCase(String numeroGuia);

    /** Piezas (en algún despacho) cuyo consignatario pertenece al usuario dado. Para la vista de cliente. */
    @Query("SELECT p FROM Paquete p " +
           "JOIN FETCH p.saca s " +
           "JOIN FETCH s.despacho d " +
           "JOIN FETCH p.estadoRastreo e " +
           "JOIN FETCH p.consignatario c " +
           "WHERE c.usuario.id = :usuarioId")
    List<Paquete> findEnDespachoByConsignatarioUsuarioId(@Param("usuarioId") Long usuarioId);

    /** Piezas (en algún despacho) de un conjunto de consignatarios. Para la sesión de enlace. */
    @Query("SELECT p FROM Paquete p " +
           "JOIN FETCH p.saca s " +
           "JOIN FETCH s.despacho d " +
           "JOIN FETCH p.estadoRastreo e " +
           "JOIN FETCH p.consignatario c " +
           "WHERE c.id IN :consignatarioIds")
    List<Paquete> findEnDespachoByConsignatarioIdIn(@Param("consignatarioIds") Collection<Long> consignatarioIds);

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

    /**
     * Conteo de paquetes por consignatario para un conjunto de ids, en una sola
     * consulta agrupada (proyección [consignatarioId, total]); evita descargar
     * los datasets para contar. Usado por "Mis destinatarios".
     */
    @Query("SELECT p.consignatario.id, COUNT(p) FROM Paquete p " +
           "WHERE p.consignatario.id IN :consignatarioIds " +
           "GROUP BY p.consignatario.id")
    List<Object[]> countByConsignatarioIdInAgrupado(@Param("consignatarioIds") java.util.Collection<Long> consignatarioIds);

    long countBySacaId(Long sacaId);

    long countByEstadoRastreoId(Long estadoRastreoId);

    long countByGuiaMasterId(Long guiaMasterId);

    @Query("SELECT p.id FROM Paquete p WHERE p.envioConsolidado.id IN :envioIds")
    List<Long> findIdsByEnvioConsolidadoIdIn(@Param("envioIds") Collection<Long> envioIds);

    @Query("""
            SELECT p FROM Paquete p
            JOIN FETCH p.envioConsolidado
            LEFT JOIN FETCH p.estadoRastreo
            WHERE p.envioConsolidado.id IN :envioIds
            ORDER BY p.envioConsolidado.id, p.id
            """)
    List<Paquete> findByEnvioConsolidadoIdInWithEstado(@Param("envioIds") Collection<Long> envioIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT p FROM Paquete p
            JOIN FETCH p.envioConsolidado
            LEFT JOIN FETCH p.estadoRastreo
            WHERE p.envioConsolidado.id IN :envioIds
            ORDER BY p.envioConsolidado.id, p.id
            """)
    List<Paquete> findByEnvioConsolidadoIdInWithEstadoForUpdate(@Param("envioIds") Collection<Long> envioIds);

    @Query("SELECT p.id FROM Paquete p WHERE CAST(p.createdAt AS LocalDate) BETWEEN :inicio AND :fin")
    List<Long> findIdsByCreatedAtBetween(@Param("inicio") LocalDate inicio, @Param("fin") LocalDate fin);

    /**
     * Agrega paquetes registrados por punto temporal. {@code trunc} es la unidad
     * de {@code date_trunc} (day/week/month/quarter).
     */
    @Query(value = """
            SELECT date_trunc(:trunc, p.created_at) AS periodo,
                   COUNT(*) AS total
            FROM paquete p
            WHERE p.created_at >= :desde
              AND p.created_at < :hasta
            GROUP BY 1
            ORDER BY 1
            """, nativeQuery = true)
    List<Object[]> aggregateRegistradosByPeriodo(@Param("trunc") String trunc,
                                                 @Param("desde") LocalDateTime desde,
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

    @Query(value = """
            SELECT COUNT(*)
            FROM paquete p
            JOIN estado_rastreo er ON er.id = p.estado_rastreo_id
            LEFT JOIN saca s ON s.id = p.saca_id
            LEFT JOIN despacho d ON d.id = s.despacho_id
            WHERE d.id IS NULL
              AND er.orden_tracking < :ordenTerminal
              AND (
                  SELECT COUNT(*)
                  FROM generate_series(
                      p.created_at::date + 1,
                      CAST(:hoy AS date),
                      interval '1 day'
                  ) dia
                  WHERE EXTRACT(ISODOW FROM dia) BETWEEN 1 AND 5
              ) > :diasMax
            """, nativeQuery = true)
    long countDemoradosSinDespachar(@Param("hoy") LocalDate hoy,
                                    @Param("diasMax") Integer diasMax,
                                    @Param("ordenTerminal") Integer ordenTerminal);

    @Query(value = """
            SELECT p.*
            FROM paquete p
            JOIN estado_rastreo er ON er.id = p.estado_rastreo_id
            LEFT JOIN saca s ON s.id = p.saca_id
            LEFT JOIN despacho d ON d.id = s.despacho_id
            WHERE d.id IS NULL
              AND er.orden_tracking < :ordenTerminal
              AND (
                  SELECT COUNT(*)
                  FROM generate_series(
                      p.created_at::date + 1,
                      CAST(:hoy AS date),
                      interval '1 day'
                  ) dia
                  WHERE EXTRACT(ISODOW FROM dia) BETWEEN 1 AND 5
              ) > :diasMax
            ORDER BY p.created_at ASC, p.id ASC
            """, nativeQuery = true)
    List<Paquete> findDemoradosSinDespachar(@Param("hoy") LocalDate hoy,
                                            @Param("diasMax") Integer diasMax,
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

    // Nota: el promedio de días a despacho se calcula desde el evento canónico
    // de despacho del paquete (PaqueteEstadoEventoRepository.avgDiasPrimerDespachoEntre),
    // no desde `despacho.fecha_hora`.

    List<Paquete> findByConsignatarioUsuarioIdOrderByEstadoRastreo_OrdenAscIdAsc(Long usuarioId);

    List<Paquete> findBySacaId(Long sacaId);

    /** IDs de paquetes pertenecientes a una saca; util para evitar cargar toda la entidad cuando solo se necesita el id. */
    @Query("SELECT p.id FROM Paquete p WHERE p.saca.id = :sacaId")
    List<Long> findIdsBySacaId(@Param("sacaId") Long sacaId);

    /** IDs de paquetes pertenecientes a una lista de sacas (una sola query por lote). */
    @Query("SELECT p.id FROM Paquete p WHERE p.saca.id IN :sacaIds")
    List<Long> findIdsBySacaIdIn(@Param("sacaIds") List<Long> sacaIds);

    @Query("""
            SELECT p
            FROM Paquete p
            LEFT JOIN FETCH p.estadoRastreo
            WHERE p.saca.id IN :sacaIds
            ORDER BY p.saca.id, p.id
            """)
    List<Paquete> findBySacaIdInWithEstado(@Param("sacaIds") Collection<Long> sacaIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT p
            FROM Paquete p
            LEFT JOIN FETCH p.estadoRastreo
            WHERE p.saca.id IN :sacaIds
            ORDER BY p.saca.id, p.id
            """)
    List<Paquete> findBySacaIdInWithEstadoForUpdate(@Param("sacaIds") Collection<Long> sacaIds);

    /**
     * IDs de paquetes de las sacas indicadas cuyo estado actual es anterior (menor orden) al
     * orden destino; permite avanzar de forma masiva sin retroceder los que ya pasaron ese punto.
     */
    @Query("SELECT p.id FROM Paquete p WHERE p.saca.id IN :sacaIds " +
           "AND COALESCE(p.estadoRastreo.orden, p.estadoRastreo.ordenTracking) < :ordenDestino")
    List<Long> findIdsBySacaIdInConEstadoAnterior(@Param("sacaIds") List<Long> sacaIds,
                                                  @Param("ordenDestino") Integer ordenDestino);

    /**
     * Estado de rastreo de los paquetes agrupado por despacho: filas
     * [despachoId, estadoId, estadoNombre, ordenEfectivo]. Una sola query para todos los despachos.
     */
    @Query("SELECT p.saca.despacho.id, p.estadoRastreo.id, p.estadoRastreo.nombre, " +
           "COALESCE(p.estadoRastreo.orden, p.estadoRastreo.ordenTracking) " +
           "FROM Paquete p WHERE p.saca.despacho.id IN :despachoIds")
    List<Object[]> findEstadosPaquetesPorDespacho(@Param("despachoIds") List<Long> despachoIds);

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

    /**
     * IDs de paquetes cuyo envío consolidado fue recibido en un lote de recepción
     * (existe {@code lote_recepcion_guia} con el código del consolidado), por
     * encima de {@code checkpoint} y ordenados por id. Acota el universo de la
     * auditoría/reparación de "llegada a bodega" a los consolidados realmente
     * recibidos; la clasificación posterior decide cuáles avanzan. Paginar con un
     * {@code Pageable} de tamaño de lote para procesar por checkpoint.
     */
    @Query("""
            SELECT p.id FROM Paquete p
            WHERE p.id > :checkpoint
              AND p.envioConsolidado IS NOT NULL
              AND EXISTS (
                  SELECT 1 FROM LoteRecepcionGuia g
                  WHERE LOWER(TRIM(g.numeroGuiaEnvio)) = LOWER(TRIM(p.envioConsolidado.codigo))
              )
            ORDER BY p.id ASC
            """)
    List<Long> findIdsEnConsolidadosRecibidosEnLote(@Param("checkpoint") Long checkpoint,
                                                    org.springframework.data.domain.Pageable pageable);

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

    /**
     * Resumen agregado de estados de rastreo de los paquetes de varios
     * consolidados en <b>una sola consulta</b> (evita N+1 en el listado). Cada
     * fila: {@code [consolidadoId, estadoId, codigo, nombre, ordenTracking,
     * tipoFlujo, cantidad]}. El estado de la pieza es {@code NOT NULL}; el
     * {@code LEFT JOIN} es defensivo por si en algún histórico faltara.
     */
    @Query("""
            SELECT p.envioConsolidado.id, er.id, er.codigo, er.nombre, er.ordenTracking, er.tipoFlujo, COUNT(p)
            FROM Paquete p
            LEFT JOIN p.estadoRastreo er
            WHERE p.envioConsolidado.id IN :consolidadoIds
            GROUP BY p.envioConsolidado.id, er.id, er.codigo, er.nombre, er.ordenTracking, er.tipoFlujo
            """)
    List<Object[]> resumenEstadosPaquetesPorConsolidado(@Param("consolidadoIds") List<Long> consolidadoIds);

    // ---------------------------------------------------------------------
    // Resumen liviano de paquetes (KPIs + opciones de filtro) y backfill de
    // la fecha límite de retiro. Las queries de opciones aceptan un usuarioId
    // opcional: si es null se consulta el universo (vista operario/admin), si
    // no, se acota a los paquetes del usuario (vista cliente).
    // ---------------------------------------------------------------------

    /** IDs de paquetes sin fecha límite de retiro persistida (para backfill idempotente). */
    @Query("SELECT p.id FROM Paquete p WHERE p.fechaLimiteRetiro IS NULL")
    List<Long> findIdsByFechaLimiteRetiroIsNull();

    /** Estados de rastreo distintos presentes en los paquetes: filas [codigo, nombre]. */
    @Query("SELECT DISTINCT p.estadoRastreo.codigo, p.estadoRastreo.nombre FROM Paquete p " +
           "WHERE p.estadoRastreo IS NOT NULL " +
           "AND (:usuarioId IS NULL OR p.consignatario.usuario.id = :usuarioId)")
    List<Object[]> findDistinctEstados(@Param("usuarioId") Long usuarioId);

    /** Consignatarios distintos presentes en los paquetes: filas [id, nombre]. */
    @Query("SELECT DISTINCT p.consignatario.id, p.consignatario.nombre FROM Paquete p " +
           "WHERE p.consignatario IS NOT NULL " +
           "AND (:usuarioId IS NULL OR p.consignatario.usuario.id = :usuarioId)")
    List<Object[]> findDistinctConsignatarios(@Param("usuarioId") Long usuarioId);

    /** Códigos de envío consolidado distintos presentes en los paquetes. */
    @Query("SELECT DISTINCT p.envioConsolidado.codigo FROM Paquete p " +
           "WHERE p.envioConsolidado IS NOT NULL " +
           "AND (:usuarioId IS NULL OR p.consignatario.usuario.id = :usuarioId)")
    List<String> findDistinctEnvioCodigos(@Param("usuarioId") Long usuarioId);

    /** Guías master distintas presentes en los paquetes: filas [id, trackingBase]. */
    @Query("SELECT DISTINCT p.guiaMaster.id, p.guiaMaster.trackingBase FROM Paquete p " +
           "WHERE p.guiaMaster IS NOT NULL " +
           "AND (:usuarioId IS NULL OR p.consignatario.usuario.id = :usuarioId)")
    List<Object[]> findDistinctGuiasMaster(@Param("usuarioId") Long usuarioId);

    /** Cantidad de consignatarios distintos (para el KPI del resumen). */
    @Query("SELECT COUNT(DISTINCT p.consignatario.id) FROM Paquete p " +
           "WHERE (:usuarioId IS NULL OR p.consignatario.usuario.id = :usuarioId)")
    long countDistinctConsignatarios(@Param("usuarioId") Long usuarioId);
}
