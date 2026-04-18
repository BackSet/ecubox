package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.TrackingResolveResponse;
import com.ecubox.ecubox_backend.dto.TrackingResponse;
import com.ecubox.ecubox_backend.service.PaqueteService;
import com.ecubox.ecubox_backend.service.TrackingResolverService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * Cubre las cabeceras HTTP del endpoint publico {@code /api/v1/tracking}:
 * <ul>
 *   <li>{@code ETag} y {@code Cache-Control} en la respuesta 200.</li>
 *   <li>{@code If-None-Match} -> 304 Not Modified cuando el ETag coincide.</li>
 *   <li>{@code If-None-Match: *} comodin tambien dispara 304.</li>
 * </ul>
 */
class TrackingControllerCacheTest {

    private TrackingResolverService resolverService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        resolverService = mock(TrackingResolverService.class);
        PaqueteService paqueteService = mock(PaqueteService.class);
        TrackingController controller = new TrackingController(resolverService, paqueteService);
        ReflectionTestUtils.setField(controller, "cacheMaxAgeSeconds", 30L);
        ReflectionTestUtils.setField(controller, "staleWhileRevalidateSeconds", 60L);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    private TrackingResolveResponse fakeResponse() {
        TrackingResponse pieza = TrackingResponse.builder()
                .numeroGuia("ABC-1")
                .estadoActualId(5L)
                .fechaEstadoDesde("2026-04-17T10:00:00")
                .flujoActual("NORMAL")
                .bloqueado(false)
                .build();
        return TrackingResolveResponse.ofPieza(pieza);
    }

    @Test
    void resolve_devuelveEtagYCacheControl() throws Exception {
        when(resolverService.resolve(anyString())).thenReturn(fakeResponse());
        MvcResult result = mockMvc.perform(get("/api/v1/tracking").param("codigo", "ABC-1"))
                .andReturn();
        assertEquals(200, result.getResponse().getStatus());
        String etag = result.getResponse().getHeader("ETag");
        assertNotNull(etag, "Debe devolver ETag");
        String cache = result.getResponse().getHeader("Cache-Control");
        assertNotNull(cache, "Debe devolver Cache-Control");
        org.junit.jupiter.api.Assertions.assertTrue(cache.contains("max-age=30"));
        org.junit.jupiter.api.Assertions.assertTrue(cache.contains("public"));
        org.junit.jupiter.api.Assertions.assertTrue(cache.contains("stale-while-revalidate=60"));
    }

    @Test
    void resolve_conIfNoneMatchCoincidente_devuelve304() throws Exception {
        when(resolverService.resolve(anyString())).thenReturn(fakeResponse());
        MvcResult first = mockMvc.perform(get("/api/v1/tracking").param("codigo", "ABC-1")).andReturn();
        String etag = first.getResponse().getHeader("ETag");
        assertNotNull(etag);
        MvcResult second = mockMvc.perform(get("/api/v1/tracking")
                        .param("codigo", "ABC-1")
                        .header("If-None-Match", etag))
                .andReturn();
        assertEquals(304, second.getResponse().getStatus());
        assertEquals(etag, second.getResponse().getHeader("ETag"));
        assertEquals(0, second.getResponse().getContentAsByteArray().length,
                "304 no debe incluir cuerpo");
    }

    @Test
    void resolve_conIfNoneMatchComodin_devuelve304() throws Exception {
        when(resolverService.resolve(anyString())).thenReturn(fakeResponse());
        MvcResult result = mockMvc.perform(get("/api/v1/tracking")
                        .param("codigo", "ABC-1")
                        .header("If-None-Match", "*"))
                .andReturn();
        assertEquals(304, result.getResponse().getStatus());
    }

    @Test
    void resolve_conIfNoneMatchDistinto_devuelve200ConBody() throws Exception {
        when(resolverService.resolve(anyString())).thenReturn(fakeResponse());
        MvcResult result = mockMvc.perform(get("/api/v1/tracking")
                        .param("codigo", "ABC-1")
                        .header("If-None-Match", "\"otraversion\""))
                .andReturn();
        assertEquals(200, result.getResponse().getStatus());
        org.junit.jupiter.api.Assertions.assertTrue(result.getResponse().getContentAsByteArray().length > 0);
    }
}
