package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.RevisionPaquete;
import com.ecubox.ecubox_backend.enums.EstadoRevisionPaquete;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RevisionPaqueteRepository extends JpaRepository<RevisionPaquete, Long> {

    boolean existsByPaqueteId(Long paqueteId);

    boolean existsByPaqueteIdAndEstado(Long paqueteId, EstadoRevisionPaquete estado);

    @Query("""
            SELECT r FROM RevisionPaquete r
            JOIN FETCH r.iniciadoPor
            LEFT JOIN FETCH r.resueltoPor
            WHERE r.paquete.id = :paqueteId AND r.estado = :estado
            ORDER BY r.fechaInicio DESC, r.id DESC
            """)
    Optional<RevisionPaquete> findActiva(@Param("paqueteId") Long paqueteId,
                                        @Param("estado") EstadoRevisionPaquete estado);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT r FROM RevisionPaquete r
            JOIN FETCH r.iniciadoPor
            LEFT JOIN FETCH r.resueltoPor
            WHERE r.paquete.id = :paqueteId AND r.estado = :estado
            """)
    Optional<RevisionPaquete> findActivaForUpdate(@Param("paqueteId") Long paqueteId,
                                                 @Param("estado") EstadoRevisionPaquete estado);

    @Query("""
            SELECT r FROM RevisionPaquete r
            JOIN FETCH r.iniciadoPor
            LEFT JOIN FETCH r.resueltoPor
            WHERE r.paquete.id = :paqueteId
            ORDER BY r.fechaInicio DESC, r.id DESC
            """)
    List<RevisionPaquete> findHistorial(@Param("paqueteId") Long paqueteId);

    @Query("""
            SELECT r FROM RevisionPaquete r
            JOIN FETCH r.iniciadoPor
            WHERE r.paquete.id IN :paqueteIds AND r.estado = :estado
            """)
    List<RevisionPaquete> findActivasByPaqueteIds(@Param("paqueteIds") Collection<Long> paqueteIds,
                                                  @Param("estado") EstadoRevisionPaquete estado);

    @Query("""
            SELECT r.paquete.id FROM RevisionPaquete r
            WHERE r.paquete.id IN :paqueteIds AND r.estado = :estado
            """)
    List<Long> findPaqueteIdsByEstado(@Param("paqueteIds") Collection<Long> paqueteIds,
                                     @Param("estado") EstadoRevisionPaquete estado);
}
