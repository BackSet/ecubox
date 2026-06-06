package com.ecubox.ecubox_backend.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey secretKey;
    private final long expirationMs;
    private final String issuer;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration}") long expirationMs,
            @Value("${jwt.issuer:ecubox-backend}") String issuer
    ) {
        byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < 32) {
            throw new IllegalArgumentException(
                    "jwt.secret debe tener al menos 32 bytes (256 bits) para HS256. Longitud actual: " + secretBytes.length);
        }
        if (expirationMs <= 0) {
            throw new IllegalArgumentException("jwt.expiration debe ser mayor que cero");
        }
        if (issuer == null || issuer.isBlank()) {
            throw new IllegalArgumentException("jwt.issuer no puede estar vacío");
        }
        this.secretKey = Keys.hmacShaKeyFor(secretBytes);
        this.expirationMs = expirationMs;
        this.issuer = issuer;
    }

    public String generateToken(String username) {
        Date now = new Date();
        return Jwts.builder()
                .issuer(issuer)
                .subject(username)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .id(UUID.randomUUID().toString())
                .signWith(secretKey)
                .compact();
    }

    public String extractUsername(String token) {
        return getClaims(token).getSubject();
    }

    public boolean isTokenValid(String token) {
        try {
            getClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
