package com.ecubox.ecubox_backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class RateLimitFilterTest {

    private RateLimitFilter filter;
    private FilterChain chain;

    @BeforeEach
    void setUp() {
        filter = new RateLimitFilter();
        chain = mock(FilterChain.class);
        ReflectionTestUtils.setField(filter, "capacity", 3);
        ReflectionTestUtils.setField(filter, "refillTokens", 3);
        ReflectionTestUtils.setField(filter, "refillPeriodSeconds", 60);
        ReflectionTestUtils.setField(filter, "enabled", true);
    }

    private MockHttpServletRequest reqV1(String ip) {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/tracking");
        req.setRequestURI("/api/v1/tracking");
        req.setRemoteAddr(ip);
        return req;
    }

    @Test
    void permitePeticionesDentroDelLimite() throws ServletException, IOException {
        for (int i = 0; i < 3; i++) {
            MockHttpServletResponse resp = new MockHttpServletResponse();
            filter.doFilter(reqV1("10.0.0.1"), resp, chain);
            assertEquals(200, resp.getStatus());
            assertNotNull(resp.getHeader("X-RateLimit-Limit"));
        }
        verify(chain, times(3)).doFilter(ArgumentMatchers.any(), ArgumentMatchers.any());
    }

    @Test
    void rechazaConTooManyRequestsAlAgotarCupo() throws ServletException, IOException {
        for (int i = 0; i < 3; i++) {
            filter.doFilter(reqV1("10.0.0.2"), new MockHttpServletResponse(), chain);
        }
        MockHttpServletResponse resp = new MockHttpServletResponse();
        filter.doFilter(reqV1("10.0.0.2"), resp, chain);
        assertEquals(429, resp.getStatus());
        assertEquals("0", resp.getHeader("X-RateLimit-Remaining"));
        assertNotNull(resp.getHeader("Retry-After"));
        assertTrue(resp.getContentAsString().contains("TOO_MANY_REQUESTS"));
        verify(chain, times(3)).doFilter(ArgumentMatchers.any(), ArgumentMatchers.any());
    }

    @Test
    void noAplicaAEndpointsNoTracking() throws ServletException, IOException {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/auth/login");
        req.setRequestURI("/api/auth/login");
        assertTrue(filter.shouldNotFilter(req));
    }

    @Test
    void siDeshabilitadoNoFiltra() {
        ReflectionTestUtils.setField(filter, "enabled", false);
        assertTrue(filter.shouldNotFilter(reqV1("1.1.1.1")));
    }

    @Test
    void cupoEsPorIp() throws ServletException, IOException {
        for (int i = 0; i < 3; i++) {
            filter.doFilter(reqV1("10.0.0.10"), new MockHttpServletResponse(), chain);
        }
        MockHttpServletResponse otherIp = new MockHttpServletResponse();
        filter.doFilter(reqV1("10.0.0.11"), otherIp, chain);
        assertEquals(200, otherIp.getStatus(), "Otra IP debe seguir teniendo cupo");
        verify(chain, atLeastOnce()).doFilter(ArgumentMatchers.any(), ArgumentMatchers.any());
        // confirmar que la primera IP ya no pasa
        MockHttpServletResponse blocked = new MockHttpServletResponse();
        filter.doFilter(reqV1("10.0.0.10"), blocked, chain);
        assertEquals(429, blocked.getStatus());
    }

    @Test
    void usaXForwardedForCuandoEstaPresente() throws ServletException, IOException {
        for (int i = 0; i < 3; i++) {
            MockHttpServletRequest req = reqV1("127.0.0.1");
            req.addHeader("X-Forwarded-For", "203.0.113.5, 10.0.0.1");
            filter.doFilter(req, new MockHttpServletResponse(), chain);
        }
        MockHttpServletRequest blockedReq = reqV1("127.0.0.1");
        blockedReq.addHeader("X-Forwarded-For", "203.0.113.5, 10.0.0.1");
        MockHttpServletResponse blocked = new MockHttpServletResponse();
        filter.doFilter(blockedReq, blocked, chain);
        assertEquals(429, blocked.getStatus(), "Misma IP X-Forwarded-For debe agotar cupo");
        // distinta IP X-Forwarded-For deberia pasar
        MockHttpServletRequest otherReq = reqV1("127.0.0.1");
        otherReq.addHeader("X-Forwarded-For", "198.51.100.7");
        MockHttpServletResponse other = new MockHttpServletResponse();
        filter.doFilter(otherReq, other, chain);
        assertEquals(200, other.getStatus());
    }

    @Test
    void respondeSinLlamarAlChainEn429() throws ServletException, IOException {
        FilterChain freshChain = mock(FilterChain.class);
        for (int i = 0; i < 3; i++) {
            filter.doFilter(reqV1("10.0.0.50"), new MockHttpServletResponse(), freshChain);
        }
        MockHttpServletResponse resp = new MockHttpServletResponse();
        filter.doFilter(reqV1("10.0.0.50"), resp, freshChain);
        assertEquals(429, resp.getStatus());
        // Solo las 3 primeras peticiones avanzan al chain; la cuarta queda corto-circuito.
        verify(freshChain, times(3)).doFilter(ArgumentMatchers.any(), ArgumentMatchers.any());
    }
}
