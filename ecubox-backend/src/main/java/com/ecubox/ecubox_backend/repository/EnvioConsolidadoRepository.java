package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import com.ecubox.ecubox_backend.enums.EstadoEnvioConsolidadoOperativo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.List;
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

    /**
     * Envios consolidados candidatos para registrarse en un lote de recepcion.
     *
     * <p>El concepto operativo de "estar disponible para recepcion" es
     * <em>ortogonal</em> a la salida USA y al {@code estadoPago}: un
     * envio puede estar ya enviado desde USA y/o ya liquidado (PAGADO) y aun asi estar
     * fisicamente en USA esperando llegar a Ecuador, donde se recibe en
     * bodega. Por eso este filtro <strong>no</strong> mira esos campos.
     *
     * <p>Reglas:
     * <ul>
     *   <li>Debe tener al menos un {@link Paquete} asociado (un envio vacio
     *       no aporta nada al lote).</li>
     *   <li>No puede estar ya incluido en otro {@link com.ecubox.ecubox_backend.entity.LoteRecepcionGuia}
     *       (la recepcion fisica ocurre una sola vez por envio).</li>
     *   <li>Filtro libre opcional sobre el {@code codigo}.</li>
     * </ul>
     */
    @Query("""
            SELECT e FROM EnvioConsolidado e
            WHERE EXISTS (
              SELECT 1 FROM Paquete p WHERE p.envioConsolidado = e
            )
              AND NOT EXISTS (
                SELECT 1 FROM LoteRecepcionGuia g
                WHERE LOWER(g.numeroGuiaEnvio) = LOWER(e.codigo)
              )
              AND LOWER(e.codigo) LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY e.createdAt DESC
            """)
    Page<EnvioConsolidado> findDisponiblesParaRecepcion(
            @Param("q") String q, Pageable pageable);

    /** Ids de consolidados que tienen al menos un paquete asociado. */
    @Query("""
            SELECT DISTINCT e.id FROM EnvioConsolidado e
            WHERE EXISTS (SELECT 1 FROM Paquete p WHERE p.envioConsolidado = e)
            """)
    List<Long> findAllIdsConPaquetes();

    /**
     * Consolidados elegibles para el avance automático. EXISTS evita duplicar
     * filas cuando un consolidado contiene varios paquetes.
     */
    @Query("""
            SELECT e FROM EnvioConsolidado e
            WHERE e.estadoOperativo IN :estados
              AND EXISTS (
                SELECT 1 FROM Paquete p WHERE p.envioConsolidado = e
              )
            ORDER BY e.createdAt DESC, e.id DESC
            """)
    List<EnvioConsolidado> findCandidatosAvanceEstados(
            @Param("estados") List<EstadoEnvioConsolidadoOperativo> estados);

    /**
     * Ids de consolidados elegibles para aplicar un estado de rastreo masivo:
     * los que tienen al menos un paquete en {@code estadoOrigenId}, o
     * (si {@code estadoOperativoAlterno} no es nulo) cuyo estado operativo
     * coincide con ese valor.
     */
    @Query("""
            SELECT DISTINCT e.id FROM EnvioConsolidado e
            WHERE EXISTS (
              SELECT 1 FROM Paquete p
              WHERE p.envioConsolidado = e AND p.estadoRastreo.id = :estadoOrigenId
            )
            OR (:estadoOperativoAlterno IS NOT NULL AND e.estadoOperativo = :estadoOperativoAlterno)
            """)
    List<Long> findIdsElegiblesParaEstadoRastreo(
            @Param("estadoOrigenId") Long estadoOrigenId,
            @Param("estadoOperativoAlterno") EstadoEnvioConsolidadoOperativo estadoOperativoAlterno);

    /** Conteo agrupado por estado operativo: filas [estadoOperativo, total] (para el resumen liviano). */
    @Query("SELECT e.estadoOperativo, COUNT(e) FROM EnvioConsolidado e GROUP BY e.estadoOperativo")
    List<Object[]> countAgrupadoPorEstadoOperativo();

    /** Conteo agrupado por estado de pago: filas [estadoPago, total] (para el resumen liviano). */
    @Query("SELECT e.estadoPago, COUNT(e) FROM EnvioConsolidado e GROUP BY e.estadoPago")
    List<Object[]> countAgrupadoPorEstadoPago();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM EnvioConsolidado e WHERE e.id IN :ids ORDER BY e.id")
    List<EnvioConsolidado> findAllByIdForUpdate(@Param("ids") List<Long> ids);
}
