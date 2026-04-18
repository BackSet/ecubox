package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.Paquete;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PaqueteRepository extends JpaRepository<Paquete, Long> {
    Optional<Paquete> findByNumeroGuiaIgnoreCase(String numeroGuia);

    /** Carga paquete con saca, despacho y relaciones del despacho para tracking (evita N+1). */
    @Query("SELECT DISTINCT p FROM Paquete p " +
           "LEFT JOIN FETCH p.saca s " +
           "LEFT JOIN FETCH s.despacho d " +
           "LEFT JOIN FETCH d.distribuidor " +
           "LEFT JOIN FETCH d.agencia " +
           "LEFT JOIN FETCH d.agenciaDistribuidor " +
           "LEFT JOIN FETCH d.destinatarioFinal " +
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

    long countByDestinatarioFinalId(Long destinatarioFinalId);

    long countBySacaId(Long sacaId);

    long countByEstadoRastreoId(Long estadoRastreoId);

    long countByGuiaMasterId(Long guiaMasterId);

    List<Paquete> findByDestinatarioFinalUsuarioIdOrderByEstadoRastreo_OrdenAscIdAsc(Long usuarioId);

    List<Paquete> findBySacaId(Long sacaId);

    /** Paquetes de una saca en orden de creación. */
    List<Paquete> findBySacaIdOrderByIdAsc(Long sacaId);

    List<Paquete> findByDestinatarioFinalIdOrderByIdAsc(Long destinatarioFinalId);

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

    /** Paquetes asociados a un envío consolidado (ordenados por id). */
    List<Paquete> findByEnvioConsolidadoIdOrderByIdAsc(Long envioConsolidadoId);

    long countByEnvioConsolidadoId(Long envioConsolidadoId);

    @Query("SELECT COALESCE(SUM(p.pesoLbs), 0) FROM Paquete p WHERE p.envioConsolidado.id = :envioId")
    java.math.BigDecimal sumPesoLbsByEnvioConsolidadoId(@Param("envioId") Long envioConsolidadoId);
}
