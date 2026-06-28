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
    private static final String TIPO_CONFIRMAR_ENTREGA = "CONFIRMAR_ENTREGA";

    private final NotificacionUsuarioRepository notificacionRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final ParametroSistemaService parametroSistemaService;

    public NotificacionService(NotificacionUsuarioRepository notificacionRepository,
                               ApplicationEventPublisher eventPublisher,
                               ParametroSistemaService parametroSistemaService) {
        this.notificacionRepository = notificacionRepository;
        this.eventPublisher = eventPublisher;
        this.parametroSistemaService = parametroSistemaService;
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

        // Si el paquete entró al estado configurado como "aviso de confirmación de
        // entrega", el push invita al cliente a confirmar la recepción (CTA a "Mis
        // entregas"); si no, es el aviso genérico de cambio de estado.
        boolean pedirConfirmacion = esEstadoAvisoConfirmacion(estadoDestino);
        String tipo = pedirConfirmacion ? TIPO_CONFIRMAR_ENTREGA : TIPO_PAQUETE_ESTADO;
        String titulo = pedirConfirmacion ? "¿Recibiste tu envío?" : "Tu paquete cambió de estado";
        String mensaje = pedirConfirmacion
                ? "Tu envío ECUBOX (guía " + numeroGuia + ") va en camino. Confírmanos cuando lo recibas."
                : "La guía " + numeroGuia + " ahora está en \"" + estado + "\". Puedes revisar el rastreo cuando quieras.";
        String url = pedirConfirmacion
                ? "/mis-entregas"
                : "/tracking?codigo=" + URLEncoder.encode(numeroGuia, StandardCharsets.UTF_8);

        NotificacionUsuario notification = NotificacionUsuario.builder()
                .usuario(usuario)
                .paquete(paquete)
                .eventId(eventId)
                .tipo(tipo)
                .titulo(titulo)
                .mensaje(mensaje)
                .url(url)
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

    private boolean esEstadoAvisoConfirmacion(EstadoRastreo estadoDestino) {
        if (estadoDestino == null || estadoDestino.getId() == null) {
            return false;
        }
        Long avisoId = parametroSistemaService.getEstadoRastreoAvisoConfirmacionEntregaId();
        return avisoId != null && avisoId.equals(estadoDestino.getId());
    }

    private Usuario resolverUsuarioDestino(Paquete paquete) {
        if (paquete.getConsignatario() == null) {
            return null;
        }
        return paquete.getConsignatario().getUsuario();
    }
}
