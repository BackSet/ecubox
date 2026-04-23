package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.LoteRecepcionGuia;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface LoteRecepcionGuiaRepository extends org.springframework.data.jpa.repository.JpaRepository<LoteRecepcionGuia, Long> {

    boolean existsByNumeroGuiaEnvio(String numeroGuiaEnvio);

    boolean existsByNumeroGuiaEnvioIgnoreCase(String numeroGuiaEnvio);

    /**
     * Fecha de recepción del lote más antigua asociada al código de guía/envío
     * (consolidado o tracking de guía master), para alinear eventos de tracking.
     */
    @Query("SELECT MIN(lr.fechaRecepcion) FROM LoteRecepcionGuia g JOIN g.loteRecepcion lr "
            + "WHERE LOWER(TRIM(g.numeroGuiaEnvio)) = LOWER(TRIM(:codigo))")
    Optional<LocalDateTime> findMinFechaRecepcionByNumeroGuiaEnvioIgnoreCase(@Param("codigo") String codigo);
}
