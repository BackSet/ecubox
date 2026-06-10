package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import com.ecubox.ecubox_backend.enums.EstadoEnvioConsolidadoOperativo;
import com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

class EstadoConsolidadoOperativoResolverTest {

    private EstadoConsolidadoOperativoResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new EstadoConsolidadoOperativoResolver();
    }

    @Test
    void resolve_pagado_siempreLiquidado_aunqueEnLote() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .codigo("PAG-1")
                .estadoOperativo(null) // registro pre-migración: fuerza la lógica de fallback
                .estadoPago(EstadoPagoConsolidado.PAGADO)
                .fechaCerrado(LocalDateTime.now())
                .build();

        assertEquals(EstadoEnvioConsolidadoOperativo.LIQUIDADO, resolver.resolve(envio, 5));
    }

    @Test
    void resolve_estadoOperativoPersistido_devuelveElPersistido() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .codigo("LOTE-1")
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.RECIBIDO_EN_BODEGA)
                .build();

        assertEquals(EstadoEnvioConsolidadoOperativo.RECIBIDO_EN_BODEGA, resolver.resolve(envio, 3));
    }

    @Test
    void resolve_cerradoSinEstadoPersistido_fallbackEnviadoDesdeUsa() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .codigo("USA-1")
                .estadoOperativo(null) // registro pre-migración: fuerza la lógica de fallback
                .fechaCerrado(LocalDateTime.now())
                .build();

        assertEquals(EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA, resolver.resolve(envio, 2));
    }

    @Test
    void resolve_sinPaquetes_vacio() {
        EnvioConsolidado envio = EnvioConsolidado.builder().codigo("VACIO-1").build();

        assertEquals(EstadoEnvioConsolidadoOperativo.VACIO, resolver.resolve(envio, 0));
    }

    @Test
    void resolve_conPaquetesAbierto_enPreparacion() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .codigo("PREP-1")
                .estadoOperativo(null) // registro pre-migración: fuerza la lógica de fallback
                .build();

        assertEquals(EstadoEnvioConsolidadoOperativo.EN_PREPARACION, resolver.resolve(envio, 4));
    }
}
