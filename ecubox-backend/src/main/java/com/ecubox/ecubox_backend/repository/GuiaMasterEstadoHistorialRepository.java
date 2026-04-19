package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.GuiaMasterEstadoHistorial;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GuiaMasterEstadoHistorialRepository extends JpaRepository<GuiaMasterEstadoHistorial, Long> {

    /** Historial mas reciente primero. */
    List<GuiaMasterEstadoHistorial> findByGuiaMasterIdOrderByCambiadoEnDescIdDesc(Long guiaMasterId);
}
