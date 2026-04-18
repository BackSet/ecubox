package com.ecubox.ecubox_backend.config;

import com.ecubox.ecubox_backend.dto.TrackingMasterResponse;
import com.ecubox.ecubox_backend.dto.TrackingResolveResponse;
import com.ecubox.ecubox_backend.dto.TrackingResponse;
import com.ecubox.ecubox_backend.enums.EstadoGuiaMaster;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TrackingEtagTest {

    @Test
    void of_devuelveNullSiTipoEsNulo() {
        assertNull(TrackingEtag.of(null));
        TrackingResolveResponse vacio = TrackingResolveResponse.builder().build();
        assertNull(TrackingEtag.of(vacio));
    }

    @Test
    void of_pieza_esEstableYConFormatoQuoted() {
        TrackingResponse pieza = TrackingResponse.builder()
                .numeroGuia("ABC-1")
                .estadoActualId(5L)
                .fechaEstadoDesde("2026-04-17T10:00:00")
                .flujoActual("NORMAL")
                .bloqueado(false)
                .build();
        String etag1 = TrackingEtag.of(TrackingResolveResponse.ofPieza(pieza));
        String etag2 = TrackingEtag.of(TrackingResolveResponse.ofPieza(pieza));
        assertNotNull(etag1);
        assertEquals(etag1, etag2, "ETag debe ser estable para el mismo input");
        assertTrue(etag1.startsWith("\"") && etag1.endsWith("\""), "ETag debe ir entre comillas");
        assertTrue(etag1.length() > 4, "ETag debe tener contenido");
    }

    @Test
    void of_pieza_cambiaSiCambiaEstadoActual() {
        TrackingResponse base = TrackingResponse.builder()
                .numeroGuia("ABC-1").estadoActualId(5L).fechaEstadoDesde("2026-04-17T10:00:00")
                .flujoActual("NORMAL").bloqueado(false).build();
        TrackingResponse otra = TrackingResponse.builder()
                .numeroGuia("ABC-1").estadoActualId(6L).fechaEstadoDesde("2026-04-17T10:00:00")
                .flujoActual("NORMAL").bloqueado(false).build();
        String e1 = TrackingEtag.of(TrackingResolveResponse.ofPieza(base));
        String e2 = TrackingEtag.of(TrackingResolveResponse.ofPieza(otra));
        assertNotEquals(e1, e2);
    }

    @Test
    void of_master_cambiaSiCambianContadores() {
        LocalDateTime now = LocalDateTime.now();
        TrackingMasterResponse m1 = TrackingMasterResponse.builder()
                .trackingBase("MX-1").estadoGlobal(EstadoGuiaMaster.PARCIAL_RECIBIDA)
                .ultimaActualizacion(now).piezasRegistradas(2).piezasRecibidas(1).piezasDespachadas(0)
                .build();
        TrackingMasterResponse m2 = TrackingMasterResponse.builder()
                .trackingBase("MX-1").estadoGlobal(EstadoGuiaMaster.PARCIAL_RECIBIDA)
                .ultimaActualizacion(now).piezasRegistradas(2).piezasRecibidas(2).piezasDespachadas(0)
                .build();
        assertNotEquals(
                TrackingEtag.of(TrackingResolveResponse.ofMaster(m1)),
                TrackingEtag.of(TrackingResolveResponse.ofMaster(m2)));
    }

    @Test
    void of_distintoTipo_distintoEtag() {
        TrackingResponse pieza = TrackingResponse.builder().numeroGuia("X").estadoActualId(1L).build();
        TrackingMasterResponse master = TrackingMasterResponse.builder()
                .trackingBase("X").estadoGlobal(EstadoGuiaMaster.INCOMPLETA).build();
        assertNotEquals(
                TrackingEtag.of(TrackingResolveResponse.ofPieza(pieza)),
                TrackingEtag.of(TrackingResolveResponse.ofMaster(master)));
    }
}
