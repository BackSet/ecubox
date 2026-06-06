package com.ecubox.ecubox_backend.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limit por IP para endpoints públicos sensibles.
 *
 * Estrategia:
 * <ul>
 *   <li>Bucket por IP con capacidad y recarga configurables (token bucket Bucket4j).</li>
 *   <li>Si se agota el cupo, responde HTTP 429 con {@code Retry-After}, {@code X-RateLimit-*}.</li>
 *   <li>Tracking y autenticación usan cupos separados.</li>
 * </ul>
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Value("${tracking.ratelimit.capacity:60}")
    private int capacity;

    @Value("${tracking.ratelimit.refill-tokens:60}")
    private int refillTokens;

    @Value("${tracking.ratelimit.refill-period-seconds:60}")
    private int refillPeriodSeconds;

    @Value("${tracking.ratelimit.enabled:true}")
    private boolean enabled;

    @Value("${auth.ratelimit.enabled:true}")
    private boolean authEnabled;

    @Value("${auth.ratelimit.capacity:10}")
    private int authCapacity;

    @Value("${auth.ratelimit.refill-tokens:10}")
    private int authRefillTokens;

    @Value("${auth.ratelimit.refill-period-seconds:60}")
    private int authRefillPeriodSeconds;

    @Value("${security.trust-forwarded-headers:false}")
    private boolean trustForwardedHeaders;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return policyFor(request) == null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        RateLimitPolicy policy = policyFor(request);
        if (policy == null) {
            chain.doFilter(request, response);
            return;
        }
        String client = clientKey(request);
        String key = policy.scope() + ":" + client;
        Bucket bucket = buckets.computeIfAbsent(key, k -> newBucket(policy));
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            response.setHeader("X-RateLimit-Limit", String.valueOf(policy.capacity()));
            response.setHeader("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
            chain.doFilter(request, response);
            return;
        }
        long waitSeconds = Math.max(1, probe.getNanosToWaitForRefill() / 1_000_000_000L);
        log.warn("rate_limit_block scope={} path={} ip={} retryAfter={}s",
                policy.scope(), request.getRequestURI(), client, waitSeconds);
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(waitSeconds));
        response.setHeader("X-RateLimit-Limit", String.valueOf(policy.capacity()));
        response.setHeader("X-RateLimit-Remaining", "0");
        String body = "{\"error\":\"TOO_MANY_REQUESTS\",\"message\":\"Demasiadas solicitudes. Intenta nuevamente en "
                + waitSeconds + " segundos.\",\"retryAfterSeconds\":" + waitSeconds + "}";
        response.getWriter().write(body);
    }

    private Bucket newBucket(RateLimitPolicy policy) {
        Bandwidth limit = Bandwidth.builder()
                .capacity(policy.capacity())
                .refillIntervally(policy.refillTokens(), Duration.ofSeconds(policy.refillPeriodSeconds()))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    private RateLimitPolicy policyFor(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path == null) return null;
        if (enabled && (path.equals("/api/v1/tracking")
                || path.startsWith("/api/v1/tracking/")
                || path.equals("/api/tracking")
                || path.startsWith("/api/tracking/"))) {
            return new RateLimitPolicy("tracking", capacity, refillTokens, refillPeriodSeconds);
        }
        if (authEnabled && "POST".equalsIgnoreCase(request.getMethod())
                && (path.equals("/api/auth/login") || path.equals("/api/auth/register/simple"))) {
            return new RateLimitPolicy("auth", authCapacity, authRefillTokens, authRefillPeriodSeconds);
        }
        return null;
    }

    private String clientKey(HttpServletRequest request) {
        if (trustForwardedHeaders) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                int comma = forwarded.indexOf(',');
                return (comma > 0 ? forwarded.substring(0, comma) : forwarded).trim();
            }
            String real = request.getHeader("X-Real-IP");
            if (real != null && !real.isBlank()) {
                return real.trim();
            }
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }

    private record RateLimitPolicy(String scope, int capacity, int refillTokens, int refillPeriodSeconds) {}
}
