package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.DespachoDisponibleDTO;
import com.ecubox.ecubox_backend.entity.Despacho;
import com.ecubox.ecubox_backend.repository.DespachoRepository;
import com.ecubox.ecubox_backend.repository.EnvioConsolidadoRepository;
import com.ecubox.ecubox_backend.repository.LiquidacionConsolidadoLineaRepository;
import com.ecubox.ecubox_backend.repository.LiquidacionDespachoLineaRepository;
import com.ecubox.ecubox_backend.repository.LiquidacionRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * El selector de despachos disponibles para liquidar expone la completitud del
 * peso: un peso nulo es un dato desconocido (no cero), por lo que un despacho
 * con paquetes sin peso ofrece un peso <b>parcial</b> ({@code pesoCompleto=false}
 * y {@code paquetesSinPeso>0}) para que el operario no liquide un importe
 * definitivo sobre un peso incompleto.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class LiquidacionDespachoDisponibleCompletitudTest {

    @Mock private LiquidacionRepository liquidacionRepository;
    @Mock private LiquidacionConsolidadoLineaRepository consolidadoLineaRepository;
    @Mock private LiquidacionDespachoLineaRepository despachoLineaRepository;
    @Mock private EnvioConsolidadoRepository envioConsolidadoRepository;
    @Mock private DespachoRepository despachoRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private ConfigTarifaDistribucionService configTarifaDistribucionService;
    @Mock private CurrentUserService currentUserService;

    private LiquidacionService createService() {
        return new LiquidacionService(
                liquidacionRepository, consolidadoLineaRepository, despachoLineaRepository,
                envioConsolidadoRepository, despachoRepository, usuarioRepository,
                configTarifaDistribucionService, currentUserService);
    }

    private Despacho despacho(long id) {
        Despacho d = new Despacho();
        d.setId(id);
        d.setNumeroGuia("GU-" + id);
        return d;
    }

    @Test
    void pesoCompleto_cuandoTodosLosPaquetesTienenPeso() {
        Despacho d = despacho(1L);
        Page<Despacho> page = new PageImpl<>(List.of(d), PageRequest.of(0, 30), 1);
        when(despachoRepository.findDisponiblesParaLiquidacion(anyString(), any(Pageable.class)))
                .thenReturn(page);
        when(despachoRepository.sumPesoLbsPorDespacho(eq(1L))).thenReturn(new BigDecimal("10.0000"));
        when(despachoRepository.countPaquetesPorDespacho(eq(1L))).thenReturn(3L);
        when(despachoRepository.countPaquetesSinPesoPorDespacho(eq(1L))).thenReturn(0L);

        DespachoDisponibleDTO dto = createService()
                .listarDespachosDisponibles(null, PageRequest.of(0, 30))
                .getContent().get(0);

        assertEquals(3L, dto.getTotalPaquetes());
        assertEquals(0L, dto.getPaquetesSinPeso());
        assertTrue(dto.isPesoCompleto());
    }

    @Test
    void pesoParcial_cuandoHayPaquetesSinPeso() {
        Despacho d = despacho(2L);
        Page<Despacho> page = new PageImpl<>(List.of(d), PageRequest.of(0, 30), 1);
        when(despachoRepository.findDisponiblesParaLiquidacion(anyString(), any(Pageable.class)))
                .thenReturn(page);
        // SUM ignora los nulos en SQL: el peso es parcial (solo los conocidos).
        when(despachoRepository.sumPesoLbsPorDespacho(eq(2L))).thenReturn(new BigDecimal("4.0000"));
        when(despachoRepository.countPaquetesPorDespacho(eq(2L))).thenReturn(3L);
        when(despachoRepository.countPaquetesSinPesoPorDespacho(eq(2L))).thenReturn(2L);

        DespachoDisponibleDTO dto = createService()
                .listarDespachosDisponibles(null, PageRequest.of(0, 30))
                .getContent().get(0);

        assertEquals(3L, dto.getTotalPaquetes());
        assertEquals(2L, dto.getPaquetesSinPeso());
        assertFalse(dto.isPesoCompleto());
    }

    @Test
    void pesoNoCompleto_cuandoDespachoSinPaquetes() {
        Despacho d = despacho(3L);
        Page<Despacho> page = new PageImpl<>(List.of(d), PageRequest.of(0, 30), 1);
        when(despachoRepository.findDisponiblesParaLiquidacion(anyString(), any(Pageable.class)))
                .thenReturn(page);
        when(despachoRepository.sumPesoLbsPorDespacho(eq(3L))).thenReturn(BigDecimal.ZERO);
        when(despachoRepository.countPaquetesPorDespacho(eq(3L))).thenReturn(0L);
        when(despachoRepository.countPaquetesSinPesoPorDespacho(eq(3L))).thenReturn(0L);

        DespachoDisponibleDTO dto = createService()
                .listarDespachosDisponibles(null, PageRequest.of(0, 30))
                .getContent().get(0);

        assertEquals(0L, dto.getTotalPaquetes());
        assertFalse(dto.isPesoCompleto());
    }
}
