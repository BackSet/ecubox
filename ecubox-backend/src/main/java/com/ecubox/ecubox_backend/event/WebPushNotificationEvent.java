package com.ecubox.ecubox_backend.event;

public record WebPushNotificationEvent(
        Long usuarioId,
        Long notificacionId,
        String title,
        String body,
        String url
) {
}
