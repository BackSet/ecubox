package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.NotificacionDTO;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.NotificacionUsuario;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.event.WebPushNotificationEvent;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.NotificacionUsuarioRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class NotificacionService {

    private static final int MAX_LIMIT = 50;
    private static final String TIPO_PAQUETE_ESTADO = "PAQUETE_ESTADO";

    private final NotificacionUsuarioRepository notificacionRepository;
    private final ApplicationEventPublisher eventPublisher;

    public NotificacionService(NotificacionUsuarioRepository notificacionRepository,
                               ApplicationEventPublisher eventPublisher) {
        this.notificacionRepository = notificacionRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public void crearCambioEstadoPaquete(Paquete paquete, EstadoRastreo estadoDestino, UUID eventId) {
        if (paquete == null || estadoDestino == null || eventId == null) {
            return;
        }
        if (notificacionRepository.existsByEventId(eventId)) {
            return;
        }

        Usuario usuario = resolverUsuarioDestino(paquete);
        if (usuario == null || usuario.getId() == null) {
            return;
        }

        String estado = estadoDestino.getNombre() != null && !estadoDestino.getNombre().isBlank()
                ? estadoDestino.getNombre()
                : estadoDestino.getCodigo();
        String numeroGuia = paquete.getNumeroGuia();
        String mensaje = "La guia " + numeroGuia + " ahora esta en \"" + estado + "\".";

        NotificacionUsuario notification = NotificacionUsuario.builder()
                .usuario(usuario)
                .paquete(paquete)
                .eventId(eventId)
                .tipo(TIPO_PAQUETE_ESTADO)
                .titulo("Tu paquete cambio de estado")
                .mensaje(mensaje)
                .url("/tracking?codigo=" + URLEncoder.encode(numeroGuia, StandardCharsets.UTF_8))
                .leida(false)
                .createdAt(LocalDateTime.now())
                .build();
        NotificacionUsuario saved = notificacionRepository.save(notification);
        eventPublisher.publishEvent(new WebPushNotificationEvent(
                usuario.getId(),
                saved.getId(),
                saved.getTitulo(),
                saved.getMensaje(),
                saved.getUrl()));
    }

    @Transactional(readOnly = true)
    public List<NotificacionDTO> listar(Long usuarioId, Integer limit) {
        int pageSize = Math.max(1, Math.min(limit != null ? limit : 20, MAX_LIMIT));
        return notificacionRepository
                .findByUsuarioIdOrderByCreatedAtDesc(usuarioId, PageRequest.of(0, pageSize))
                .stream()
                .map(NotificacionDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public long contarNoLeidas(Long usuarioId) {
        return notificacionRepository.countByUsuarioIdAndLeidaFalse(usuarioId);
    }

    @Transactional
    public NotificacionDTO marcarLeida(Long id, Long usuarioId) {
        NotificacionUsuario notification = notificacionRepository.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Notificacion", id));
        if (!Boolean.TRUE.equals(notification.getLeida())) {
            notification.setLeida(true);
            notification.setReadAt(LocalDateTime.now());
        }
        return NotificacionDTO.fromEntity(notification);
    }

    @Transactional
    public void marcarTodasLeidas(Long usuarioId) {
        notificacionRepository.markAllAsRead(usuarioId, LocalDateTime.now());
    }

    private Usuario resolverUsuarioDestino(Paquete paquete) {
        if (paquete.getConsignatario() == null) {
            return null;
        }
        return paquete.getConsignatario().getUsuario();
    }
}
