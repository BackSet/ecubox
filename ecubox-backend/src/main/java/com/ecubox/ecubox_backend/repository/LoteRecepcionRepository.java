package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.LoteRecepcion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LoteRecepcionRepository extends JpaRepository<LoteRecepcion, Long> {

    @Query("SELECT DISTINCT l FROM LoteRecepcion l LEFT JOIN FETCH l.guias ORDER BY l.fechaRecepcion DESC")
    List<LoteRecepcion> findAllByOrderByFechaRecepcionDesc();

    @Query("SELECT l FROM LoteRecepcion l LEFT JOIN FETCH l.guias WHERE l.id = :id")
    Optional<LoteRecepcion> findByIdWithGuias(@Param("id") Long id);

    @Query("SELECT DISTINCT l FROM LoteRecepcion l LEFT JOIN FETCH l.guias LEFT JOIN FETCH l.operario WHERE l.id = :id")
    Optional<LoteRecepcion> findByIdWithGuiasAndOperario(@Param("id") Long id);
}
