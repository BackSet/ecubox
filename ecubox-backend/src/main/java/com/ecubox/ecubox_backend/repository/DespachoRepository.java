package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.Despacho;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface DespachoRepository extends JpaRepository<Despacho, Long> {

    List<Despacho> findByManifiestoId(Long manifiestoId);

    List<Despacho> findByFechaHoraBetweenOrderByFechaHoraAscIdAsc(LocalDateTime desde, LocalDateTime hasta);

    @Query("""
            SELECT d
            FROM Despacho d
            WHERE d.manifiesto IS NULL
              AND d.fechaHora IS NOT NULL
              AND d.fechaHora >= :desde
              AND d.fechaHora < :hastaExclusivo
              AND (:distribuidorId IS NULL OR d.distribuidor.id = :distribuidorId)
              AND (:agenciaId IS NULL OR d.agencia.id = :agenciaId)
            ORDER BY d.fechaHora ASC, d.id ASC
            """)
    List<Despacho> findCandidatosParaManifiesto(
            @Param("desde") LocalDateTime desde,
            @Param("hastaExclusivo") LocalDateTime hastaExclusivo,
            @Param("distribuidorId") Long distribuidorId,
            @Param("agenciaId") Long agenciaId
    );
}
