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

    List<Paquete> findByDestinatarioFinalUsuarioIdOrderByEstadoRastreo_OrdenAscIdAsc(Long usuarioId);

    List<Paquete> findBySacaId(Long sacaId);

    /** Paquetes de una saca en orden de creación. */
    List<Paquete> findBySacaIdOrderByIdAsc(Long sacaId);

    List<Paquete> findByDestinatarioFinalIdOrderByIdAsc(Long destinatarioFinalId);

    /** Paquetes sin saca asignada (disponibles para agregar a una saca), orden por creación. */
    List<Paquete> findBySacaIsNullOrderByIdAsc();

    /** Paquetes sin peso cargado (pendientes para operario). */
    List<Paquete> findByPesoLbsIsNullOrderByEstadoRastreo_OrdenAscIdAsc();

    /** Paquetes con una guía de envío dada (consolidador). */
    List<Paquete> findByNumeroGuiaEnvio(String numeroGuiaEnvio);

    /** Paquetes cuyos numeroGuia están en la lista dada. */
    List<Paquete> findByNumeroGuiaIn(List<String> numeroGuias);
}
