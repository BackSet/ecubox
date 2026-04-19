package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.Paquete;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PaqueteRepository extends JpaRepository<Paquete, Long> {
    Optional<Paquete> findByNumeroGuiaIgnoreCase(String numeroGuia);

    /**
     * Carga paquete con todas las asociaciones que el endpoint publico de
     * tracking lee (saca, despacho, distribuidor/agencia/agenciaDistribuidor,
     * destinatario del despacho, destinatario final del paquete, estado y
     * guia master). Sin estos JOIN FETCH la respuesta de tracking dispara
     * decenas de queries por LAZY loading.
     */
    @Query("SELECT DISTINCT p FROM Paquete p " +
           "LEFT JOIN FETCH p.estadoRastreo " +
           "LEFT JOIN FETCH p.destinatarioFinal df " +
           "LEFT JOIN FETCH df.usuario " +
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

    /**
     * Paquetes asociados a un envio consolidado, con destinatario final y guia
     * master ya cargados. Optimizado para la generacion del manifiesto (PDF y
     * XLSX) que itera sobre cada paquete leyendo destinatario.* y guiaMaster.*.
     */
    @Query("SELECT DISTINCT p FROM Paquete p " +
           "LEFT JOIN FETCH p.destinatarioFinal df " +
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
