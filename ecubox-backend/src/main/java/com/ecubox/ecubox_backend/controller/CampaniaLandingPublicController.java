package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.CampaniaLandingPublicDTO;
import com.ecubox.ecubox_backend.service.CampaniaLandingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.TimeUnit;

/**
 * Endpoint público (sin autenticación) de la campaña vigente de la landing.
 * Devuelve solo campos públicos; si no hay campaña vigente, devuelve el patrón
 * vacío (objeto con campos nulos), nunca 404. El {@code ETag} deriva del
 * contenido público, por lo que publicar/desactivar/editar lo invalida
 * automáticamente (no hay caché de servidor que purgar). Cache-Control con TTL
 * breve + soporte de {@code If-None-Match} (304).
 */
@Tag(name = "Público", description = "Campaña de la landing para el sitio público sin autenticación")
@RestController
@RequestMapping("/api/public")
@OpenApiConstants.StandardApiResponses
public class CampaniaLandingPublicController {

    private final CampaniaLandingService service;

    @Value("${campania.cache.max-age-seconds:30}")
    private long cacheMaxAgeSeconds;

    @Value("${campania.cache.stale-while-revalidate-seconds:60}")
    private long staleWhileRevalidateSeconds;

    public CampaniaLandingPublicController(CampaniaLandingService service) {
        this.service = service;
    }

    @Operation(summary = "Campaña de la landing",
            description = "Campaña vigente para el sitio público. Patrón vacío si no hay ninguna. Soporta ETag/If-None-Match.")
    @SecurityRequirements
    @ApiResponse(responseCode = "200", description = "Campaña vigente o patrón vacío")
    @GetMapping("/campania-landing")
    public ResponseEntity<CampaniaLandingPublicDTO> getCampaniaLanding(HttpServletRequest request) {
        CampaniaLandingPublicDTO body = service.getPublicVigente()
                .orElseGet(() -> CampaniaLandingPublicDTO.builder().build());
        String etag = etagFor(body);
        if (matchesIfNoneMatch(request, etag)) {
            return cacheable(ResponseEntity.status(HttpStatus.NOT_MODIFIED), etag).build();
        }
        return cacheable(ResponseEntity.ok(), etag).body(body);
    }

    private String etagFor(CampaniaLandingPublicDTO dto) {
        // Cada campo se delimita con prefijo de longitud para que distintos
        // límites entre campos no produzcan la misma cadena (sin colisiones).
        StringBuilder canonical = new StringBuilder();
        appendField(canonical, dto.getCodigo());
        appendField(canonical, dto.getTipo() != null ? dto.getTipo().name() : null);
        appendField(canonical, dto.getEtiqueta());
        appendField(canonical, dto.getTitulo());
        appendField(canonical, dto.getDescripcion());
        appendField(canonical, dto.getTextoCta());
        appendField(canonical, dto.getUrlCta());
        appendField(canonical, dto.getTipoDestinoCta() != null ? dto.getTipoDestinoCta().name() : null);
        appendField(canonical, dto.getImagenUrlClaro());
        appendField(canonical, dto.getImagenUrlOscuro());
        appendField(canonical, dto.getTextoAlternativoImagen());
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(canonical.toString().getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16)).append(Character.forDigit(b & 0xF, 16));
            }
            return "\"" + sb.substring(0, 32) + "\"";
        } catch (Exception e) {
            // Sin ETag fiable, no cacheamos por contenido (solo TTL).
            return null;
        }
    }

    private static void appendField(StringBuilder sb, String value) {
        if (value == null) {
            sb.append("-1:");
        } else {
            sb.append(value.length()).append(':').append(value);
        }
    }

    private boolean matchesIfNoneMatch(HttpServletRequest request, String etag) {
        if (etag == null) return false;
        String header = request.getHeader(HttpHeaders.IF_NONE_MATCH);
        if (header == null || header.isBlank()) return false;
        for (String token : header.split(",")) {
            String t = token.trim();
            if (t.equals("*") || t.equals(etag)) return true;
        }
        return false;
    }

    private ResponseEntity.BodyBuilder cacheable(ResponseEntity.BodyBuilder builder, String etag) {
        CacheControl cc = CacheControl.maxAge(cacheMaxAgeSeconds, TimeUnit.SECONDS)
                .cachePublic()
                .staleWhileRevalidate(staleWhileRevalidateSeconds, TimeUnit.SECONDS);
        builder.cacheControl(cc);
        if (etag != null) builder.eTag(etag);
        return builder;
    }
}
