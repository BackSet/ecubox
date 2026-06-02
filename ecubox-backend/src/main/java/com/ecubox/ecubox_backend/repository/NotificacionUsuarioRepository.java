package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.NotificacionUsuario;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificacionUsuarioRepository extends JpaRepository<NotificacionUsuario, Long> {

    boolean existsByEventId(UUID eventId);

    @EntityGraph(attributePaths = "paquete")
    List<NotificacionUsuario> findByUsuarioIdOrderByCreatedAtDesc(Long usuarioId, Pageable pageable);

    long countByUsuarioIdAndLeidaFalse(Long usuarioId);

    Optional<NotificacionUsuario> findByIdAndUsuarioId(Long id, Long usuarioId);

    @Modifying
    @Query("""
            UPDATE NotificacionUsuario n
               SET n.leida = true, n.readAt = :readAt
             WHERE n.usuario.id = :usuarioId
               AND n.leida = false
            """)
    int markAllAsRead(@Param("usuarioId") Long usuarioId, @Param("readAt") LocalDateTime readAt);
}
