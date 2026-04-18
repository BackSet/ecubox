package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EnvioConsolidadoCreateResponse;
import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.exception.ConflictException;
import com.ecubox.ecubox_backend.repository.EnvioConsolidadoRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EnvioConsolidadoServiceTest {

    @Mock private EnvioConsolidadoRepository envioRepository;
    @Mock private PaqueteRepository paqueteRepository;
    @Mock private PaqueteService paqueteService;

    private EnvioConsolidadoService service;

    @BeforeEach
    void setUp() {
        service = new EnvioConsolidadoService(envioRepository, paqueteRepository, paqueteService);
        lenient().when(envioRepository.save(any(EnvioConsolidado.class)))
                .thenAnswer(inv -> {
                    EnvioConsolidado e = inv.getArgument(0);
                    if (e.getId() == null) e.setId(99L);
                    return e;
                });
        lenient().when(paqueteRepository.countByEnvioConsolidadoId(anyLong())).thenReturn(0L);
        lenient().when(paqueteRepository.sumPesoLbsByEnvioConsolidadoId(anyLong())).thenReturn(BigDecimal.ZERO);
        lenient().when(paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(anyLong()))
                .thenReturn(List.of());
    }

    @Test
    void crear_devuelveEnvioAbiertoSinFechaCerrado() {
        when(envioRepository.existsByCodigoIgnoreCase("ABC")).thenReturn(false);

        EnvioConsolidado res = service.crear("ABC", 1L);

        assertEquals("ABC", res.getCodigo());
        assertNull(res.getFechaCerrado(), "envio recien creado debe estar abierto");
        assertTrue(res.isAbierto());
        assertFalse(res.isCerrado());
    }

    @Test
    void crearConGuias_todasEncontradas_asociaPaquetesYNoEncontradasVacio() {
        when(envioRepository.existsByCodigoIgnoreCase("ENV-1")).thenReturn(false);
        Paquete p1 = Paquete.builder().id(10L).numeroGuia("ABC 1/2").build();
        Paquete p2 = Paquete.builder().id(11L).numeroGuia("ABC 2/2").build();
        when(paqueteRepository.findByNumeroGuiaInIgnoreCase(List.of("abc 1/2", "abc 2/2")))
                .thenReturn(List.of(p1, p2));
        when(paqueteRepository.findAllById(any())).thenReturn(List.of(p1, p2));
        when(envioRepository.findById(anyLong())).thenAnswer(inv -> Optional.of(EnvioConsolidado.builder()
                .id(inv.getArgument(0)).codigo("ENV-1").build()));

        EnvioConsolidadoCreateResponse res = service.crearConGuias(
                "ENV-1", List.of("ABC 1/2", "ABC 2/2"), 7L);

        assertNotNull(res.getEnvio());
        assertEquals("ENV-1", res.getEnvio().getCodigo());
        assertFalse(res.getEnvio().isCerrado(), "envio recien creado nunca esta cerrado");
        assertTrue(res.getGuiasNoEncontradas().isEmpty(), "todas deberian encontrarse");
    }

    @Test
    void crearConGuias_parcial_devuelveLasNoEncontradasYCreaIgual() {
        when(envioRepository.existsByCodigoIgnoreCase("ENV-2")).thenReturn(false);
        Paquete p1 = Paquete.builder().id(10L).numeroGuia("OK 1/1").build();
        when(paqueteRepository.findByNumeroGuiaInIgnoreCase(List.of("ok 1/1", "fantasma")))
                .thenReturn(List.of(p1));
        when(paqueteRepository.findAllById(any())).thenReturn(List.of(p1));
        when(envioRepository.findById(anyLong())).thenAnswer(inv -> Optional.of(EnvioConsolidado.builder()
                .id(inv.getArgument(0)).codigo("ENV-2").build()));

        EnvioConsolidadoCreateResponse res = service.crearConGuias(
                "ENV-2", List.of("OK 1/1", "FANTASMA"), 7L);

        assertEquals("ENV-2", res.getEnvio().getCodigo());
        assertEquals(List.of("FANTASMA"), res.getGuiasNoEncontradas());
    }

    @Test
    void crearConGuias_codigoDuplicado_lanzaConflictYNoBuscaPaquetes() {
        when(envioRepository.existsByCodigoIgnoreCase("DUP")).thenReturn(true);

        assertThrows(ConflictException.class,
                () -> service.crearConGuias("DUP", List.of("X"), 1L));
        verify(paqueteRepository, never()).findByNumeroGuiaInIgnoreCase(anyList());
    }

    @Test
    void agregarPaquetes_envioCerrado_lanzaConflict() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("X").fechaCerrado(LocalDateTime.now()).build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(envio));

        assertThrows(ConflictException.class,
                () -> service.agregarPaquetes(1L, List.of(10L)));
    }

    @Test
    void removerPaquetes_envioCerrado_lanzaConflict() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("X").fechaCerrado(LocalDateTime.now()).build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(envio));

        assertThrows(ConflictException.class,
                () -> service.removerPaquetes(1L, List.of(10L)));
    }

    @Test
    void cerrar_envioAbierto_seteaFechaCerrado() {
        EnvioConsolidado envio = EnvioConsolidado.builder().id(1L).codigo("X").build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(envio));

        EnvioConsolidado res = service.cerrar(1L, null);

        assertNotNull(res.getFechaCerrado(), "cerrar debe setear fechaCerrado");
        assertTrue(res.isCerrado());
        verify(envioRepository).save(envio);
    }

    @Test
    void cerrar_envioYaCerrado_esIdempotente() {
        LocalDateTime original = LocalDateTime.now().minusDays(3);
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("X").fechaCerrado(original).build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(envio));

        EnvioConsolidado res = service.cerrar(1L, LocalDateTime.now());

        assertEquals(original, res.getFechaCerrado(), "no debe sobrescribir fechaCerrado original");
        verify(envioRepository, never()).save(any());
    }

    @Test
    void reabrir_envioCerrado_limpiaFechaCerrado() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("X").fechaCerrado(LocalDateTime.now()).build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(envio));

        EnvioConsolidado res = service.reabrir(1L);

        assertNull(res.getFechaCerrado());
        assertTrue(res.isAbierto());
    }

    @Test
    void agregarPaquetes_paqueteEnEnvioYaCerrado_lanzaConflict() {
        EnvioConsolidado destino = EnvioConsolidado.builder().id(1L).codigo("DEST").build();
        EnvioConsolidado origenCerrado = EnvioConsolidado.builder()
                .id(2L).codigo("ORIG-CERRADO").fechaCerrado(LocalDateTime.now()).build();
        Paquete p = Paquete.builder().id(10L).numeroGuia("ABC 1/1")
                .envioConsolidado(origenCerrado).build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(destino));
        when(paqueteRepository.findAllById(any())).thenReturn(List.of(p));

        assertThrows(ConflictException.class,
                () -> service.agregarPaquetes(1L, List.of(10L)));
    }

    @Test
    void agregarPaquetes_paqueteEnEnvioAbierto_permiteReasignar() {
        EnvioConsolidado destino = EnvioConsolidado.builder().id(1L).codigo("DEST").build();
        EnvioConsolidado origenAbierto = EnvioConsolidado.builder().id(2L).codigo("ORIG").build();
        Paquete p = Paquete.builder().id(10L).numeroGuia("ABC 1/1")
                .envioConsolidado(origenAbierto).build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(destino));
        when(paqueteRepository.findAllById(any())).thenReturn(List.of(p));

        EnvioConsolidado res = service.agregarPaquetes(1L, List.of(10L));

        assertSame(destino, p.getEnvioConsolidado(), "paquete debe quedar reasignado al destino");
        assertEquals(1L, res.getId());
    }
}
