package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.service.PaqueteService.ClasificacionEstadoPunto;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Matriz de clasificación de un paquete frente a un estado configurado por punto
 * del flujo (hito automático). La regla es central y reutilizable: solo avanzan
 * los paquetes anteriores al hito; los demás se omiten sin degradarse. El orden
 * proviene del catálogo configurado (no se comparan solo IDs ni se hardcodean
 * estados). El peso no interviene.
 */
class PaqueteServiceClasificacionEstadoPuntoTest {

    private EstadoRastreo estado(long id, int orden, boolean activo, TipoFlujoEstado flujo) {
        return EstadoRastreo.builder()
                .id(id).nombre("E" + id).orden(orden).activo(activo).tipoFlujo(flujo).build();
    }

    private EstadoRastreo normal(long id, int orden) {
        return estado(id, orden, true, TipoFlujoEstado.NORMAL);
    }

    private Paquete paquete(EstadoRastreo origen) {
        return Paquete.builder().id(1L).estadoRastreo(origen).bloqueado(false).enFlujoAlterno(false).build();
    }

    private final EstadoRastreo bodega = normal(50L, 5); // hito "llegada a bodega"

    @Test
    void anterior_esActualizable() {
        Paquete p = paquete(normal(10L, 3));
        assertEquals(ClasificacionEstadoPunto.ACTUALIZABLE,
                PaqueteService.clasificarParaEstadoDePunto(p, bodega));
    }

    @Test
    void mismoEstado_seOmite() {
        Paquete p = paquete(normal(50L, 5));
        assertEquals(ClasificacionEstadoPunto.MISMO_ESTADO,
                PaqueteService.clasificarParaEstadoDePunto(p, bodega));
    }

    @Test
    void posterior_noSeDegrada() {
        Paquete p = paquete(normal(60L, 8));
        assertEquals(ClasificacionEstadoPunto.POSTERIOR,
                PaqueteService.clasificarParaEstadoDePunto(p, bodega));
    }

    @Test
    void terminal_quedaComoPosterior() {
        // Un estado terminal tiene el mayor orden del catálogo: no se degrada.
        Paquete p = paquete(normal(99L, 100));
        assertEquals(ClasificacionEstadoPunto.POSTERIOR,
                PaqueteService.clasificarParaEstadoDePunto(p, bodega));
    }

    @Test
    void alternoPorTipoFlujo_seOmite() {
        Paquete p = paquete(estado(70L, 4, true, TipoFlujoEstado.ALTERNO));
        assertEquals(ClasificacionEstadoPunto.ALTERNO,
                PaqueteService.clasificarParaEstadoDePunto(p, bodega));
    }

    @Test
    void alternoPorFlag_seOmite() {
        Paquete p = paquete(normal(10L, 3));
        p.setEnFlujoAlterno(true);
        assertEquals(ClasificacionEstadoPunto.ALTERNO,
                PaqueteService.clasificarParaEstadoDePunto(p, bodega));
    }

    @Test
    void bloqueado_seOmite() {
        Paquete p = paquete(normal(10L, 3));
        p.setBloqueado(true);
        assertEquals(ClasificacionEstadoPunto.BLOQUEADO,
                PaqueteService.clasificarParaEstadoDePunto(p, bodega));
    }

    @Test
    void destinoInactivo_noSeAplica() {
        EstadoRastreo inactivo = estado(50L, 5, false, TipoFlujoEstado.NORMAL);
        Paquete p = paquete(normal(10L, 3));
        assertEquals(ClasificacionEstadoPunto.DESTINO_INACTIVO,
                PaqueteService.clasificarParaEstadoDePunto(p, inactivo));
    }

    @Test
    void origenNulo_esActualizable() {
        Paquete p = paquete(null);
        assertEquals(ClasificacionEstadoPunto.ACTUALIZABLE,
                PaqueteService.clasificarParaEstadoDePunto(p, bodega));
    }

    @Test
    void pesoNulo_noAfectaLaClasificacion() {
        Paquete p = paquete(normal(10L, 3));
        p.setPesoLbs(null);
        assertEquals(ClasificacionEstadoPunto.ACTUALIZABLE,
                PaqueteService.clasificarParaEstadoDePunto(p, bodega));

        Paquete conPeso = paquete(normal(10L, 3));
        conPeso.setPesoLbs(new BigDecimal("12.5"));
        assertEquals(ClasificacionEstadoPunto.ACTUALIZABLE,
                PaqueteService.clasificarParaEstadoDePunto(conPeso, bodega));
    }

    @Test
    void mismoEstadoTienePrioridadSobreBloqueado() {
        // Ya está en el hito: idempotente aunque esté marcado bloqueado.
        Paquete p = paquete(normal(50L, 5));
        p.setBloqueado(true);
        assertEquals(ClasificacionEstadoPunto.MISMO_ESTADO,
                PaqueteService.clasificarParaEstadoDePunto(p, bodega));
    }
}
