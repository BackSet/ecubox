package com.ecubox.ecubox_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class WebPushProperties {

    private final boolean enabled;
    private final String subject;
    private final String publicKey;
    private final String privateKey;
    private final int ttlSeconds;

    public WebPushProperties(
            @Value("${webpush.enabled:false}") boolean enabled,
            @Value("${webpush.subject:}") String subject,
            @Value("${webpush.public-key:}") String publicKey,
            @Value("${webpush.private-key:}") String privateKey,
            @Value("${webpush.ttl-seconds:86400}") int ttlSeconds) {
        this.enabled = enabled;
        this.subject = subject;
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.ttlSeconds = ttlSeconds;
    }

    public boolean isEnabled() {
        return enabled && hasText(subject) && hasText(publicKey) && hasText(privateKey);
    }

    public String getSubject() {
        return subject;
    }

    public String getPublicKey() {
        return publicKey;
    }

    public String getPrivateKey() {
        return privateKey;
    }

    public int getTtlSeconds() {
        return ttlSeconds;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
