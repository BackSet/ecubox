package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.GuiaMaster;
import com.ecubox.ecubox_backend.enums.EstadoGuiaMaster;
import com.ecubox.ecubox_backend.projection.ConteoEstadoGuiaMasterView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface GuiaMasterRepository extends JpaRepository<GuiaMaster, Long>,
        JpaSpecificationExecutor<GuiaMaster> {

    Optional<GuiaMaster> findByTrackingBaseIgnoreCase(String trackingBase);

    boolean existsByTrackingBaseIgnoreCase(String trackingBase);

    @Query("SELECT gm.estadoGlobal AS estado, COUNT(gm) AS total FROM GuiaMaster gm GROUP BY gm.estadoGlobal")
    List<ConteoEstadoGuiaMasterView> countAgrupadoPorEstado();

    /**
     * Guias en estado activo de despacho cuyo primer despacho supero el
     * limite indicado. Usado por el job de auto-cierre por timeout.
     * Antes de V66 se llamaba con {@code PARCIAL_DESPACHADA}; ahora con
     * {@link EstadoGuiaMaster#DESPACHO_PARCIAL}.
     */
    @Query("SELECT gm FROM GuiaMaster gm " +
           "WHERE gm.estadoGlobal = :estado " +
           "AND gm.fechaPrimeraPiezaDespachada IS NOT NULL " +
           "AND gm.fechaPrimeraPiezaDespachada < :limite")
    List<GuiaMaster> findCandidatasAutoCierre(@Param("estado") EstadoGuiaMaster estado,
                                              @Param("limite") LocalDateTime limite);

    /**
     * Top guias mas antiguas que aun no han llegado a un estado terminal
     * (DESPACHO_COMPLETADO, DESPACHO_INCOMPLETO, CANCELADA). Las que estan
     * en EN_REVISION se incluyen porque siguen abiertas operativamente.
     */
    @Query("SELECT gm FROM GuiaMaster gm " +
           "WHERE gm.estadoGlobal IN ('SIN_PIEZAS_REGISTRADAS','EN_ESPERA_RECEPCION','RECEPCION_PARCIAL','RECEPCION_COMPLETA','DESPACHO_PARCIAL','EN_REVISION') " +
           "ORDER BY gm.createdAt ASC")
    List<GuiaMaster> findActivasMasAntiguas(org.springframework.data.domain.Pageable pageable);

    /** Listado de guias que pertenecen a un cliente concreto (mas reciente primero). */
    @Query("SELECT gm FROM GuiaMaster gm " +
           "WHERE gm.clienteUsuario.id = :clienteId " +
           "ORDER BY gm.createdAt DESC")
    List<GuiaMaster> findByClienteUsuarioId(@Param("clienteId") Long clienteId);

    /**
     * Listado filtrado por uno o varios estados (operario). El orden es por
     * fecha de creacion descendente para mostrar primero las mas recientes.
     */
    @Query("SELECT gm FROM GuiaMaster gm " +
           "WHERE gm.estadoGlobal IN :estados " +
           "ORDER BY gm.createdAt DESC")
    List<GuiaMaster> findByEstadoGlobalIn(@Param("estados") Collection<EstadoGuiaMaster> estados);
}
