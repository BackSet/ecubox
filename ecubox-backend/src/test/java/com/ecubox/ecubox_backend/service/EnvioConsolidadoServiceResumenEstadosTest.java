package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.ResumenEstadosPaquetesConsolidadoDTO;
import com.ecubox.ecubox_backend.dto.ResumenEstadosPaquetesConsolidadoDTO.EstadoPaqueteResumenItemDTO;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.repository.EnvioConsolidadoRepository;
import com.ecubox.ecubox_backend.repository.LiquidacionConsolidadoLineaRepository;
import com.ecubox.ecubox_backend.repository.LoteRecepcionGuiaRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Resumen agregado de estados de paquetes por consolidado: orden canónico,
 * atención (flujo alterno / sin estado), estados mixtos y conteos. La
 * agregación es una sola consulta (sin N+1).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EnvioConsolidadoServiceResumenEstadosTest {

    @Mock private EnvioConsolidadoRepository envioRepository;
    @Mock private PaqueteRepository paqueteRepository;
    @Mock private PaqueteService paqueteService;
    @Mock private LiquidacionConsolidadoLineaRepository liquidacionConsolidadoLineaRepository;
    @Mock private LoteRecepcionGuiaRepository loteRecepcionGuiaRepository;
    @Mock private EstadoConsolidadoOperativoResolver estadoConsolidadoOperativoResolver;
    @Mock private EstadoRastreoService estadoRastreoService;
    @Mock private ParametroSistemaService parametroSistemaService;

    private EnvioConsolidadoService service() {
        return new EnvioConsolidadoService(envioRepository, paqueteRepository, paqueteService,
                liquidacionConsolidadoLineaRepository, loteRecepcionGuiaRepository,
                estadoConsolidadoOperativoResolver, estadoRastreoService, parametroSistemaService);
    }

    /** [consolidadoId, estadoId, codigo, nombre, ordenTracking, tipoFlujo, count]. */
    private Object[] fila(long consolidadoId, Long estadoId, String codigo, String nombre,
                          Integer ordenTracking, TipoFlujoEstado tipoFlujo, long count) {
        return new Object[]{consolidadoId, estadoId, codigo, nombre, ordenTracking, tipoFlujo, count};
    }

    @Test
    void requiereAtencionEstado_reglaCanonica() {
        assertTrue(EnvioConsolidadoService.requiereAtencionEstado(null, null)); // sin estado
        assertTrue(EnvioConsolidadoService.requiereAtencionEstado(9L, TipoFlujoEstado.ALTERNO));
        assertFalse(EnvioConsolidadoService.requiereAtencionEstado(9L, TipoFlujoEstado.NORMAL));
    }

    @Test
    void idsVacios_mapaVacio_sinConsultar() {
        Map<Long, ResumenEstadosPaquetesConsolidadoDTO> r = service().construirResumenesEstados(List.of());
        assertTrue(r.isEmpty());
        verifyNoInteractions(paqueteRepository);
    }

    @Test
    void sinPaquetes_totalCeroSinEstados_noMixto() {
        when(paqueteRepository.resumenEstadosPaquetesPorConsolidado(anyList())).thenReturn(List.<Object[]>of());

        ResumenEstadosPaquetesConsolidadoDTO r = service().construirResumenesEstados(List.of(1L)).get(1L);

        assertEquals(0, r.getTotalPaquetes());
        assertTrue(r.getEstados().isEmpty());
        assertFalse(r.isEstadosMixtos());
        assertEquals(0, r.getCantidadRequiereAtencion());
    }

    @Test
    void unEstado_noMixto() {
        when(paqueteRepository.resumenEstadosPaquetesPorConsolidado(anyList())).thenReturn(List.<Object[]>of(
                fila(1L, 50L, "EN_BODEGA", "En bodega", 5, TipoFlujoEstado.NORMAL, 9L)));

        ResumenEstadosPaquetesConsolidadoDTO r = service().construirResumenesEstados(List.of(1L)).get(1L);

        assertEquals(9, r.getTotalPaquetes());
        assertEquals(1, r.getEstados().size());
        assertFalse(r.isEstadosMixtos());
        assertEquals(0, r.getCantidadRequiereAtencion());
    }

    @Test
    void variosEstados_mixto_ordenadoPorOrdenTracking_sinOrdenAlFinal() {
        when(paqueteRepository.resumenEstadosPaquetesPorConsolidado(anyList())).thenReturn(List.<Object[]>of(
                fila(1L, 30L, "C", "Cee", 30, TipoFlujoEstado.NORMAL, 1L),
                fila(1L, 10L, "A", "Aaa", 10, TipoFlujoEstado.NORMAL, 2L),
                fila(1L, 99L, "Z", "Zzz", null, TipoFlujoEstado.NORMAL, 3L)));

        ResumenEstadosPaquetesConsolidadoDTO r = service().construirResumenesEstados(List.of(1L)).get(1L);

        assertTrue(r.isEstadosMixtos());
        assertEquals(6, r.getTotalPaquetes());
        List<EstadoPaqueteResumenItemDTO> e = r.getEstados();
        // Orden canónico: ordenTracking 10, 30, luego sin orden (null) al final.
        assertEquals(10, e.get(0).getOrdenTracking());
        assertEquals(30, e.get(1).getOrdenTracking());
        assertNull(e.get(2).getOrdenTracking());
    }

    @Test
    void atencion_cuentaPaquetesEnFlujoAlterno() {
        when(paqueteRepository.resumenEstadosPaquetesPorConsolidado(anyList())).thenReturn(List.<Object[]>of(
                fila(1L, 5L, "BODEGA", "En bodega", 5, TipoFlujoEstado.NORMAL, 3L),
                fila(1L, 8L, "RETENIDO", "Retenido en aduana", 6, TipoFlujoEstado.ALTERNO, 2L)));

        ResumenEstadosPaquetesConsolidadoDTO r = service().construirResumenesEstados(List.of(1L)).get(1L);

        assertEquals(5, r.getTotalPaquetes());
        assertEquals(2, r.getCantidadRequiereAtencion());
        assertTrue(r.getEstados().stream().anyMatch(EstadoPaqueteResumenItemDTO::isRequiereAtencion));
    }

    @Test
    void unaSolaConsultaAgregadaParaTodaLaPagina_sinNMasUno() {
        when(paqueteRepository.resumenEstadosPaquetesPorConsolidado(anyList())).thenReturn(List.<Object[]>of(
                fila(1L, 5L, "BODEGA", "En bodega", 5, TipoFlujoEstado.NORMAL, 1L),
                fila(2L, 5L, "BODEGA", "En bodega", 5, TipoFlujoEstado.NORMAL, 1L)));

        Map<Long, ResumenEstadosPaquetesConsolidadoDTO> r =
                service().construirResumenesEstados(List.of(1L, 2L, 3L));

        // Una única invocación al repositorio para toda la página.
        verify(paqueteRepository).resumenEstadosPaquetesPorConsolidado(List.of(1L, 2L, 3L));
        assertEquals(1, r.get(1L).getTotalPaquetes());
        assertEquals(1, r.get(2L).getTotalPaquetes());
        // El consolidado sin filas igual aparece con total 0 (no se omite).
        assertEquals(0, r.get(3L).getTotalPaquetes());
    }
}
