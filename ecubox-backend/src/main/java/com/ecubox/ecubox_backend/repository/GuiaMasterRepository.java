package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.GuiaMaster;
import com.ecubox.ecubox_backend.enums.EstadoGuiaMaster;
import com.ecubox.ecubox_backend.projection.ConteoEstadoGuiaMasterView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface GuiaMasterRepository extends JpaRepository<GuiaMaster, Long> {

    Optional<GuiaMaster> findByTrackingBaseIgnoreCase(String trackingBase);

    boolean existsByTrackingBaseIgnoreCase(String trackingBase);

    @Query("SELECT gm.estadoGlobal AS estado, COUNT(gm) AS total FROM GuiaMaster gm GROUP BY gm.estadoGlobal")
    List<ConteoEstadoGuiaMasterView> countAgrupadoPorEstado();

    /** Guías con al menos una pieza despachada y aún incompletas (PARCIAL_DESPACHADA) más antiguas que la fecha límite. */
    @Query("SELECT gm FROM GuiaMaster gm " +
           "WHERE gm.estadoGlobal = :estado " +
           "AND gm.fechaPrimeraPiezaDespachada IS NOT NULL " +
           "AND gm.fechaPrimeraPiezaDespachada < :limite")
    List<GuiaMaster> findCandidatasAutoCierre(@Param("estado") EstadoGuiaMaster estado,
                                              @Param("limite") LocalDateTime limite);

    /** Top guías más antiguas sin completar (no en CERRADA ni CERRADA_CON_FALTANTE). */
    @Query("SELECT gm FROM GuiaMaster gm " +
           "WHERE gm.estadoGlobal IN ('INCOMPLETA','PARCIAL_RECIBIDA','COMPLETA_RECIBIDA','PARCIAL_DESPACHADA') " +
           "ORDER BY gm.createdAt ASC")
    List<GuiaMaster> findActivasMasAntiguas(org.springframework.data.domain.Pageable pageable);

    /** Listado de guías que pertenecen a un cliente concreto (más reciente primero). */
    @Query("SELECT gm FROM GuiaMaster gm " +
           "WHERE gm.clienteUsuario.id = :clienteId " +
           "ORDER BY gm.createdAt DESC")
    List<GuiaMaster> findByClienteUsuarioId(@Param("clienteId") Long clienteId);
}
