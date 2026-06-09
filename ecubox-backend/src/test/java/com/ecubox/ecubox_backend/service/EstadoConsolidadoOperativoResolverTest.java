package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import com.ecubox.ecubox_backend.enums.EstadoEnvioConsolidadoOperativo;
import com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado;
import com.ecubox.ecubox_backend.repository.LoteRecepcionGuiaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EstadoConsolidadoOperativoResolverTest {

    @Mock private LoteRecepcionGuiaRepository loteRecepcionGuiaRepository;

    private EstadoConsolidadoOperativoResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new EstadoConsolidadoOperativoResolver(loteRecepcionGuiaRepository);
    }

    @Test
    void resolve_pagado_siempreLiquidado_aunqueEnLote() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .codigo("PAG-1")
                .estadoPago(EstadoPagoConsolidado.PAGADO)
                .fechaCerrado(LocalDateTime.now())
                .build();

        assertEquals(EstadoEnvioConsolidadoOperativo.LIQUIDADO, resolver.resolve(envio, 5));
    }

    @Test
    void resolve_enLoteSinPago_recibidoEnBodega() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .codigo("LOTE-1")
                .estadoPago(EstadoPagoConsolidado.NO_PAGADO)
                .fechaCerrado(LocalDateTime.now())
                .build();
        when(loteRecepcionGuiaRepository.existsByNumeroGuiaEnvioIgnoreCase("LOTE-1")).thenReturn(true);

        assertEquals(EstadoEnvioConsolidadoOperativo.RECIBIDO_EN_BODEGA, resolver.resolve(envio, 3));
    }

    @Test
    void resolve_cerradoSinLote_enviadoDesdeUsa() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .codigo("USA-1")
                .fechaCerrado(LocalDateTime.now())
                .build();
        when(loteRecepcionGuiaRepository.existsByNumeroGuiaEnvioIgnoreCase("USA-1")).thenReturn(false);

        assertEquals(EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA, resolver.resolve(envio, 2));
    }

    @Test
    void resolve_sinPaquetes_vacio() {
        EnvioConsolidado envio = EnvioConsolidado.builder().codigo("VACIO-1").build();

        assertEquals(EstadoEnvioConsolidadoOperativo.VACIO, resolver.resolve(envio, 0));
    }

    @Test
    void resolve_conPaquetesAbierto_enPreparacion() {
        EnvioConsolidado envio = EnvioConsolidado.builder().codigo("PREP-1").build();
        when(loteRecepcionGuiaRepository.existsByNumeroGuiaEnvioIgnoreCase("PREP-1")).thenReturn(false);

        assertEquals(EstadoEnvioConsolidadoOperativo.EN_PREPARACION, resolver.resolve(envio, 4));
    }
}
