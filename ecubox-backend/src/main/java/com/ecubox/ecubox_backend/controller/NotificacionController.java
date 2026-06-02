package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.NotificacionDTO;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.NotificacionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;

@Tag(name = "Notificaciones", description = "Notificaciones del usuario autenticado")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/notificaciones")
public class NotificacionController {

    private final NotificacionService notificacionService;
    private final CurrentUserService currentUserService;

    public NotificacionController(NotificacionService notificacionService,
                                  CurrentUserService currentUserService) {
        this.notificacionService = notificacionService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    @Operation(summary = "Listar notificaciones", description = "Devuelve las notificaciones recientes del usuario autenticado")
    public ResponseEntity<List<NotificacionDTO>> listar(@RequestParam(defaultValue = "20") Integer limit) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        return ResponseEntity.ok(notificacionService.listar(usuarioId, limit));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Contar no leidas", description = "Devuelve el numero de notificaciones pendientes de lectura")
    public ResponseEntity<Map<String, Long>> contarNoLeidas() {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        return ResponseEntity.ok(Map.of("count", notificacionService.contarNoLeidas(usuarioId)));
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Marcar notificacion como leida")
    public ResponseEntity<NotificacionDTO> marcarLeida(@PathVariable Long id) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        return ResponseEntity.ok(notificacionService.marcarLeida(id, usuarioId));
    }

    @PatchMapping("/read-all")
    @Operation(summary = "Marcar todas como leidas")
    public ResponseEntity<Void> marcarTodasLeidas() {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        notificacionService.marcarTodasLeidas(usuarioId);
        return ResponseEntity.noContent().build();
    }
}
