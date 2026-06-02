package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.config.WebPushProperties;
import com.ecubox.ecubox_backend.dto.WebPushPublicKeyDTO;
import com.ecubox.ecubox_backend.dto.WebPushSubscriptionRequest;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.entity.WebPushSubscription;
import com.ecubox.ecubox_backend.event.WebPushNotificationEvent;
import com.ecubox.ecubox_backend.repository.WebPushSubscriptionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.springframework.transaction.event.TransactionPhase.AFTER_COMMIT;

@Service
public class WebPushService {

    private static final Logger log = LoggerFactory.getLogger(WebPushService.class);

    private final WebPushProperties properties;
    private final WebPushSubscriptionRepository subscriptionRepository;
    private final ObjectMapper objectMapper;

    public WebPushService(WebPushProperties properties,
                          WebPushSubscriptionRepository subscriptionRepository,
                          ObjectMapper objectMapper) {
        this.properties = properties;
        this.subscriptionRepository = subscriptionRepository;
        this.objectMapper = objectMapper;
    }

    public WebPushPublicKeyDTO publicKey() {
        return new WebPushPublicKeyDTO(properties.isEnabled(), properties.getPublicKey());
    }

    @Transactional
    public void guardarSuscripcion(Long usuarioId,
                                   WebPushSubscriptionRequest request,
                                   String userAgent) {
        WebPushSubscription subscription = subscriptionRepository.findByEndpoint(request.endpoint())
                .orElseGet(WebPushSubscription::new);
        subscription.setUsuario(Usuario.builder().id(usuarioId).build());
        subscription.setEndpoint(request.endpoint());
        subscription.setP256dh(request.keys().p256dh());
        subscription.setAuth(request.keys().auth());
        subscription.setUserAgent(userAgent);
        subscription.setActive(true);
        subscription.setFailureCount(0);
        subscriptionRepository.save(subscription);
    }

    @Transactional
    public void desactivarSuscripcion(String endpoint) {
        subscriptionRepository.findByEndpoint(endpoint).ifPresent(subscription -> {
            subscription.setActive(false);
            subscriptionRepository.save(subscription);
        });
    }

    @TransactionalEventListener(phase = AFTER_COMMIT)
    public void enviarDespuesDeCommit(WebPushNotificationEvent event) {
        enviar(event);
    }

    @Transactional
    public void enviar(WebPushNotificationEvent event) {
        if (!properties.isEnabled() || event.usuarioId() == null) {
            return;
        }

        String payload = toPayload(event);
        for (WebPushSubscription subscription :
                subscriptionRepository.findByUsuarioIdAndActiveTrue(event.usuarioId())) {
            enviarASuscripcion(subscription, payload);
        }
    }

    private void enviarASuscripcion(WebPushSubscription subscription, String payload) {
        try {
            PushService pushService = new PushService(
                    properties.getPublicKey(),
                    properties.getPrivateKey(),
                    properties.getSubject());
            Notification notification = Notification.builder()
                    .endpoint(subscription.getEndpoint())
                    .userPublicKey(subscription.getP256dh())
                    .userAuth(subscription.getAuth())
                    .payload(payload)
                    .ttl(properties.getTtlSeconds())
                    .topic("ecubox-paquete")
                    .build();
            HttpResponse response = pushService.send(notification);
            int statusCode = response.getStatusLine().getStatusCode();
            if (statusCode == 404 || statusCode == 410) {
                subscription.setActive(false);
            }
            if (statusCode >= 200 && statusCode < 300) {
                subscription.setLastSuccessAt(LocalDateTime.now());
                subscription.setFailureCount(0);
            } else {
                registrarFallo(subscription);
                log.warn("web_push_failed status={} subscriptionId={}", statusCode, subscription.getId());
            }
        } catch (Exception ex) {
            registrarFallo(subscription);
            log.warn("web_push_exception subscriptionId={} message={}", subscription.getId(), ex.getMessage());
        }
    }

    private void registrarFallo(WebPushSubscription subscription) {
        int failures = subscription.getFailureCount() != null ? subscription.getFailureCount() + 1 : 1;
        subscription.setFailureCount(failures);
        subscription.setLastFailureAt(LocalDateTime.now());
        if (failures >= 5) {
            subscription.setActive(false);
        }
    }

    private String toPayload(WebPushNotificationEvent event) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", event.title());
        payload.put("body", event.body());
        payload.put("url", event.url() != null ? event.url() : "/");
        payload.put("tag", "ecubox-" + event.notificacionId());
        payload.put("notificacionId", event.notificacionId());
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("No se pudo serializar payload web push", ex);
        }
    }
}
