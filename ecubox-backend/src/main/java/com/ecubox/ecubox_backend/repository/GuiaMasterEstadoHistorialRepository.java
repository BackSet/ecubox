package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.GuiaMasterEstadoHistorial;
import com.ecubox.ecubox_backend.enums.TipoCambioEstadoGuiaMaster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GuiaMasterEstadoHistorialRepository extends JpaRepository<GuiaMasterEstadoHistorial, Long> {

    /** Historial mas reciente primero. */
    List<GuiaMasterEstadoHistorial> findByGuiaMasterIdOrderByCambiadoEnDescIdDesc(Long guiaMasterId);

    /**
     * Ultima entrada de un tipo de cambio concreto (la mas reciente). Se usa
     * para enriquecer el DTO de una guia EN_REVISION con el motivo/actor/fecha
     * de la ultima vez que se marco en revision, sin duplicar esos datos en la
     * entidad GuiaMaster (la trazabilidad ya vive en el historial).
     */
    Optional<GuiaMasterEstadoHistorial> findFirstByGuiaMasterIdAndTipoCambioOrderByCambiadoEnDescIdDesc(
            Long guiaMasterId, TipoCambioEstadoGuiaMaster tipoCambio);
}
