package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.PaqueteEstadoEvento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface PaqueteEstadoEventoRepository extends JpaRepository<PaqueteEstadoEvento, Long> {
    List<PaqueteEstadoEvento> findByPaqueteIdOrderByOccurredAtAscIdAsc(Long paqueteId);
    java.util.Optional<PaqueteEstadoEvento> findTopByPaqueteIdOrderByOccurredAtDescIdDesc(Long paqueteId);

    /**
     * Primera (cronológicamente) entrada del paquete al estado destino indicado.
     * Útil para anclar la cuenta regresiva al primer momento en que el paquete
     * llegó al estado configurado como "Inicio de cuenta regresiva".
     */
    java.util.Optional<PaqueteEstadoEvento>
        findTopByPaqueteIdAndEstadoDestino_IdOrderByOccurredAtAscIdAsc(Long paqueteId, Long estadoDestinoId);

    void deleteByPaqueteId(Long paqueteId);

    /**
     * Eventos de tracking de todas las piezas de una guia master, en orden cronologico.
     * Usado para construir el feed agregado del endpoint de tracking de guia master.
     */
    @Query("SELECT e FROM PaqueteEstadoEvento e " +
           "WHERE e.paquete.guiaMaster.id = :guiaMasterId " +
           "ORDER BY e.occurredAt ASC, e.id ASC")
    List<PaqueteEstadoEvento> findByGuiaMasterIdOrderByOccurredAtAsc(@Param("guiaMasterId") Long guiaMasterId);

    /**
     * Eventos posteriores a {@code lastEventId} en orden ascendente, paginado por
     * la firma del proyector ({@link com.ecubox.ecubox_backend.projection.TrackingViewProjector}).
     */
    @Query("SELECT e FROM PaqueteEstadoEvento e " +
           "WHERE e.id > :lastEventId " +
           "ORDER BY e.id ASC")
    List<PaqueteEstadoEvento> findEventsAfter(@Param("lastEventId") Long lastEventId,
                                              org.springframework.data.domain.Pageable pageable);

    // ─────────────────── Estadísticas: paquetes despachados ───────────────────
    //
    // Fuente canónica y auditable del momento "paquete despachado": la PRIMERA
    // transición (MIN(occurred_at)) de cada paquete al estado configurado para
    // despacho (estadoRastreoEnDespachoId). Al agrupar por paquete_id se cuenta
    // cada paquete una sola vez, de modo que:
    //   - eventos duplicados (mismo paquete, mismo estado) no inflan el conteo;
    //   - reversiones / reingresos posteriores no vuelven a contar el paquete;
    //   - correcciones o cambios de despacho son indiferentes (es nivel paquete);
    // No depende de despacho.fecha_hora (que es nullable y editable).

    /** Totales del periodo: {@code [paquetesDespachados, pesoLbs]} por fecha del evento canónico. */
    @Query(value = """
            SELECT COUNT(*) AS paquetes,
                   COALESCE(SUM(p.peso_lbs), 0) AS peso_lbs
            FROM (
                SELECT e.paquete_id AS paquete_id, MIN(e.occurred_at) AS despachado_en
                FROM paquete_estado_evento e
                WHERE e.estado_destino_id = :estadoDespachoId
                GROUP BY e.paquete_id
            ) d
            JOIN paquete p ON p.id = d.paquete_id
            WHERE d.despachado_en >= :desde AND d.despachado_en < :hasta
            """, nativeQuery = true)
    Object[] resumenDespachadosEntre(@Param("estadoDespachoId") Long estadoDespachoId,
                                     @Param("desde") LocalDateTime desde,
                                     @Param("hasta") LocalDateTime hasta);

    /**
     * Serie temporal de paquetes despachados por punto, agregada en base de datos
     * con {@code date_trunc(:trunc, …)}. Filas: {@code [periodo, total, pesoLbs]}.
     */
    @Query(value = """
            SELECT date_trunc(:trunc, d.despachado_en) AS periodo,
                   COUNT(*) AS total,
                   COALESCE(SUM(p.peso_lbs), 0) AS peso_lbs
            FROM (
                SELECT e.paquete_id AS paquete_id, MIN(e.occurred_at) AS despachado_en
                FROM paquete_estado_evento e
                WHERE e.estado_destino_id = :estadoDespachoId
                GROUP BY e.paquete_id
            ) d
            JOIN paquete p ON p.id = d.paquete_id
            WHERE d.despachado_en >= :desde AND d.despachado_en < :hasta
            GROUP BY 1
            ORDER BY 1
            """, nativeQuery = true)
    List<Object[]> aggregateDespachadosByPeriodo(@Param("trunc") String trunc,
                                                 @Param("estadoDespachoId") Long estadoDespachoId,
                                                 @Param("desde") LocalDateTime desde,
                                                 @Param("hasta") LocalDateTime hasta);

    /**
     * Promedio de días entre el registro del paquete y su primer despacho, para
     * los paquetes despachados dentro del periodo. Excluye valores negativos
     * (evento anterior al registro) y devuelve {@code null} si no hay datos.
     */
    @Query(value = """
            SELECT AVG(EXTRACT(EPOCH FROM (d.despachado_en - p.created_at)) / 86400.0)
            FROM (
                SELECT e.paquete_id AS paquete_id, MIN(e.occurred_at) AS despachado_en
                FROM paquete_estado_evento e
                WHERE e.estado_destino_id = :estadoDespachoId
                GROUP BY e.paquete_id
            ) d
            JOIN paquete p ON p.id = d.paquete_id
            WHERE d.despachado_en >= :desde AND d.despachado_en < :hasta
              AND d.despachado_en >= p.created_at
            """, nativeQuery = true)
    Double avgDiasPrimerDespachoEntre(@Param("estadoDespachoId") Long estadoDespachoId,
                                      @Param("desde") LocalDateTime desde,
                                      @Param("hasta") LocalDateTime hasta);
}
