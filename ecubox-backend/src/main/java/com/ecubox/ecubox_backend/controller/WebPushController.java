package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.WebPushPublicKeyDTO;
import com.ecubox.ecubox_backend.dto.WebPushSubscriptionRequest;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.WebPushService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Web Push", description = "Suscripciones push para la PWA")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/push")
public class WebPushController {

    private final WebPushService webPushService;
    private final CurrentUserService currentUserService;

    public WebPushController(WebPushService webPushService,
                             CurrentUserService currentUserService) {
        this.webPushService = webPushService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/public-key")
    @Operation(summary = "Obtener clave publica VAPID")
    public ResponseEntity<WebPushPublicKeyDTO> publicKey() {
        return ResponseEntity.ok(webPushService.publicKey());
    }

    @PostMapping("/subscriptions")
    @Operation(summary = "Registrar suscripcion push del usuario autenticado")
    public ResponseEntity<Void> subscribe(@Valid @RequestBody WebPushSubscriptionRequest request,
                                          HttpServletRequest servletRequest) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        webPushService.guardarSuscripcion(usuarioId, request, servletRequest.getHeader("User-Agent"));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/subscriptions")
    @Operation(summary = "Desactivar suscripcion push")
    public ResponseEntity<Void> unsubscribe(@Valid @RequestBody WebPushSubscriptionRequest request) {
        webPushService.desactivarSuscripcion(request.endpoint());
        return ResponseEntity.noContent().build();
    }
}
