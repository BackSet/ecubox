package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
     * <em>ortogonal</em> a los flags {@code cerrado} y {@code estadoPago}: un
     * envio puede estar ya cerrado y/o ya liquidado (PAGADO) y aun asi estar
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
}
