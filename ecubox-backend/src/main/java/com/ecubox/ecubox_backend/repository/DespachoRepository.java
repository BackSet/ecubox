package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.Despacho;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface DespachoRepository extends JpaRepository<Despacho, Long>,
        JpaSpecificationExecutor<Despacho> {

    List<Despacho> findByManifiestoId(Long manifiestoId);

    List<Despacho> findByFechaHoraBetweenOrderByFechaHoraAscIdAsc(LocalDateTime desde, LocalDateTime hasta);

    @Query("""
            SELECT d
            FROM Despacho d
            WHERE d.manifiesto IS NULL
              AND d.fechaHora IS NOT NULL
              AND d.fechaHora >= :desde
              AND d.fechaHora < :hastaExclusivo
              AND (:courierEntregaId IS NULL OR d.courierEntrega.id = :courierEntregaId)
              AND (:agenciaId IS NULL OR d.agencia.id = :agenciaId)
            ORDER BY d.fechaHora ASC, d.id ASC
            """)
    List<Despacho> findCandidatosParaManifiesto(
            @Param("desde") LocalDateTime desde,
            @Param("hastaExclusivo") LocalDateTime hastaExclusivo,
            @Param("courierEntregaId") Long courierEntregaId,
            @Param("agenciaId") Long agenciaId
    );
}
