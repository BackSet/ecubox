package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.entity.NotificacionUsuario;

import java.time.LocalDateTime;

public record NotificacionDTO(
        Long id,
        String tipo,
        String titulo,
        String mensaje,
        String url,
        Boolean leida,
        LocalDateTime createdAt,
        LocalDateTime readAt,
        Long paqueteId,
        String numeroGuia
) {
    public static NotificacionDTO fromEntity(NotificacionUsuario notification) {
        var paquete = notification.getPaquete();
        return new NotificacionDTO(
                notification.getId(),
                notification.getTipo(),
                notification.getTitulo(),
                notification.getMensaje(),
                notification.getUrl(),
                Boolean.TRUE.equals(notification.getLeida()),
                notification.getCreatedAt(),
                notification.getReadAt(),
                paquete != null ? paquete.getId() : null,
                paquete != null ? paquete.getNumeroGuia() : null
        );
    }
}
