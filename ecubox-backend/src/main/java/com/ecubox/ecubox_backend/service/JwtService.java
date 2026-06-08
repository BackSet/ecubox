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

    /** Claim que marca una sesión iniciada vía enlace de acceso (solo lectura). */
    public static final String CLAIM_ACCESO = "acc";
    public static final String ACCESO_ENLACE = "ENLACE";
    /** Claim con el id del enlace de acceso, para resolver sus consignatarios. */
    public static final String CLAIM_ENLACE_ID = "enlaceId";

    private final SecretKey secretKey;
    private final long expirationMs;
    private final long accesoEnlaceExpirationMs;
    private final String issuer;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration}") long expirationMs,
            @Value("${jwt.acceso-enlace.expiration:1800000}") long accesoEnlaceExpirationMs,
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
        if (accesoEnlaceExpirationMs <= 0) {
            throw new IllegalArgumentException("jwt.acceso-enlace.expiration debe ser mayor que cero");
        }
        if (issuer == null || issuer.isBlank()) {
            throw new IllegalArgumentException("jwt.issuer no puede estar vacío");
        }
        this.secretKey = Keys.hmacShaKeyFor(secretBytes);
        this.expirationMs = expirationMs;
        this.accesoEnlaceExpirationMs = accesoEnlaceExpirationMs;
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

    /**
     * Emite un JWT de corta duración para una sesión iniciada por enlace de
     * acceso. Lleva el claim {@code acc=ENLACE} y el id del enlace, que el filtro
     * usa para crear un principal acotado a sus consignatarios (solo lectura).
     */
    public String generateAccesoEnlaceToken(Long enlaceId) {
        Date now = new Date();
        return Jwts.builder()
                .issuer(issuer)
                .subject("acceso-enlace:" + enlaceId)
                .claim(CLAIM_ACCESO, ACCESO_ENLACE)
                .claim(CLAIM_ENLACE_ID, enlaceId)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + accesoEnlaceExpirationMs))
                .id(UUID.randomUUID().toString())
                .signWith(secretKey)
                .compact();
    }

    public String extractUsername(String token) {
        return getClaims(token).getSubject();
    }

    /** Indica si el token corresponde a una sesión por enlace (solo lectura). */
    public boolean isAccesoEnlaceToken(String token) {
        return ACCESO_ENLACE.equals(getClaims(token).get(CLAIM_ACCESO, String.class));
    }

    /** Id del enlace de acceso embebido en el token, o {@code null} si no aplica. */
    public Long extractEnlaceId(String token) {
        return getClaims(token).get(CLAIM_ENLACE_ID, Long.class);
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
