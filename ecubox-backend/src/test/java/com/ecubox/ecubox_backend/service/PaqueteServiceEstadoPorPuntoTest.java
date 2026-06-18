package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.repository.ConsignatarioRepository;
import com.ecubox.ecubox_backend.repository.GuiaMasterRepository;
import com.ecubox.ecubox_backend.repository.LoteRecepcionGuiaRepository;
import com.ecubox.ecubox_backend.repository.OutboxEventRepository;
import com.ecubox.ecubox_backend.repository.PaqueteEstadoEventoRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.SacaRepository;
import com.ecubox.ecubox_backend.service.PaqueteService.ResultadoEstadoPorPunto;
import com.ecubox.ecubox_backend.service.validation.OwnershipValidator;
import com.ecubox.ecubox_backend.service.validation.SacaEnDespachoValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Verifica el comportamiento central de la aplicación de estados por punto a
 * través de {@code aplicarEstadoEnLoteRecepcion} (llegada a bodega): solo avanza
 * los paquetes anteriores al hito, no degrada posteriores/terminales, omite
 * alternos/bloqueados, es idempotente, no depende del peso y maneja la
 * configuración ausente/inactiva sin lanzar.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PaqueteServiceEstadoPorPuntoTest {

    @Mock private PaqueteRepository paqueteRepository;
    @Mock private ConsignatarioRepository consignatarioRepository;
    @Mock private SacaRepository sacaRepository;
    @Mock private LoteRecepcionGuiaRepository loteRecepcionGuiaRepository;
    @Mock private PaqueteEstadoEventoRepository paqueteEstadoEventoRepository;
    @Mock private OutboxEventRepository outboxEventRepository;
    @Mock private ParametroSistemaService parametroSistemaService;
    @Mock private EstadoRastreoService estadoRastreoService;
    @Mock private TrackingEventService trackingEventService;
    @Mock private GuiaMasterRepository guiaMasterRepository;
    @Mock private GuiaMasterService guiaMasterService;
    @Mock private CodigoSecuenciaService codigoSecuenciaService;
    @Mock private EnvioConsolidadoService envioConsolidadoService;
    @Mock private EstadoConsolidadoOperativoResolver estadoConsolidadoOperativoResolver;

    private static final long BODEGA_ID = 50L;
    private static final int BODEGA_ORDEN = 5;

    private PaqueteService service() {
        return new PaqueteService(
                paqueteRepository, consignatarioRepository, sacaRepository,
                loteRecepcionGuiaRepository, paqueteEstadoEventoRepository, outboxEventRepository,
                parametroSistemaService, estadoRastreoService, trackingEventService,
                guiaMasterRepository, guiaMasterService, new OwnershipValidator(),
                new SacaEnDespachoValidator(), codigoSecuenciaService, envioConsolidadoService,
                estadoConsolidadoOperativoResolver, false);
    }

    private EstadoRastreo estado(long id, int orden, boolean activo, TipoFlujoEstado flujo) {
        return EstadoRastreo.builder()
                .id(id).nombre("E" + id).orden(orden).activo(activo).tipoFlujo(flujo).build();
    }

    private EstadoRastreo bodega(boolean activo) {
        return estado(BODEGA_ID, BODEGA_ORDEN, activo, TipoFlujoEstado.NORMAL);
    }

    private Paquete paquete(long id, EstadoRastreo origen) {
        return Paquete.builder().id(id).numeroGuia("GU-" + id)
                .estadoRastreo(origen).bloqueado(false).enFlujoAlterno(false).build();
    }

    private void stubConfig(Long bodegaConfigId) {
        when(parametroSistemaService.getEstadosRastreoPorPunto())
                .thenReturn(EstadosRastreoPorPuntoDTO.builder()
                        .estadoRastreoEnLoteRecepcionId(bodegaConfigId).build());
    }

    @Test
    void avanzaAnteriores_yNoDegradaPosteriorAlternoNiMismo() {
        stubConfig(BODEGA_ID);
        when(estadoRastreoService.findEntityById(BODEGA_ID)).thenReturn(bodega(true));

        Paquete anterior = paquete(1L, estado(10L, 3, true, TipoFlujoEstado.NORMAL));
        Paquete posterior = paquete(2L, estado(60L, 8, true, TipoFlujoEstado.NORMAL));
        Paquete alterno = paquete(3L, estado(70L, 4, true, TipoFlujoEstado.ALTERNO));
        Paquete mismo = paquete(4L, estado(BODEGA_ID, BODEGA_ORDEN, true, TipoFlujoEstado.NORMAL));
        List<Paquete> todos = List.of(anterior, posterior, alterno, mismo);
        when(paqueteRepository.findAllByIdForUpdate(anyList())).thenReturn(todos);
        when(paqueteRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        ResultadoEstadoPorPunto r = service().aplicarEstadoEnLoteRecepcion(
                List.of(1L, 2L, 3L, 4L), LocalDateTime.now());

        // Solo el anterior avanza al hito.
        assertEquals(4, r.total());
        assertEquals(1, r.actualizados());
        assertEquals(1, r.mismoEstado());
        assertEquals(1, r.posteriores());
        assertEquals(1, r.alternos());
        assertEquals(BODEGA_ID, anterior.getEstadoRastreo().getId());
        // No se degradan los demás.
        assertEquals(60L, posterior.getEstadoRastreo().getId());
        assertEquals(70L, alterno.getEstadoRastreo().getId());
        assertEquals(BODEGA_ID, mismo.getEstadoRastreo().getId());
        // Un único evento (el del paquete que avanzó).
        verify(trackingEventService, times(1)).registrarTransicion(
                any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void idempotente_segundaAplicacionNoAvanzaNiRegistraEvento() {
        stubConfig(BODEGA_ID);
        when(estadoRastreoService.findEntityById(BODEGA_ID)).thenReturn(bodega(true));
        // El paquete ya está en bodega (como tras una primera corrida).
        Paquete yaEnBodega = paquete(1L, estado(BODEGA_ID, BODEGA_ORDEN, true, TipoFlujoEstado.NORMAL));
        when(paqueteRepository.findAllByIdForUpdate(anyList())).thenReturn(List.of(yaEnBodega));

        ResultadoEstadoPorPunto r = service().aplicarEstadoEnLoteRecepcion(List.of(1L), LocalDateTime.now());

        assertEquals(1, r.total());
        assertEquals(0, r.actualizados());
        assertEquals(1, r.mismoEstado());
        verify(paqueteRepository, never()).saveAll(anyList());
        verifyNoInteractions(trackingEventService);
    }

    @Test
    void configuracionAusente_noHaceNada() {
        stubConfig(null);

        ResultadoEstadoPorPunto r = service().aplicarEstadoEnLoteRecepcion(List.of(1L), LocalDateTime.now());

        assertEquals(0, r.total());
        verify(estadoRastreoService, never()).findEntityById(any());
        verify(paqueteRepository, never()).saveAll(anyList());
        verifyNoInteractions(trackingEventService);
    }

    @Test
    void configuracionInactiva_noAplicaNiDegrada() {
        stubConfig(BODEGA_ID);
        when(estadoRastreoService.findEntityById(BODEGA_ID)).thenReturn(bodega(false));
        Paquete anterior = paquete(1L, estado(10L, 3, true, TipoFlujoEstado.NORMAL));
        when(paqueteRepository.findAllByIdForUpdate(anyList())).thenReturn(List.of(anterior));

        ResultadoEstadoPorPunto r = service().aplicarEstadoEnLoteRecepcion(List.of(1L), LocalDateTime.now());

        assertEquals(1, r.total());
        assertEquals(0, r.actualizados());
        assertEquals(10L, anterior.getEstadoRastreo().getId());
        verify(paqueteRepository, never()).saveAll(anyList());
        verifyNoInteractions(trackingEventService);
    }

    @Test
    void pesoNulo_noImpideElAvance() {
        stubConfig(BODEGA_ID);
        when(estadoRastreoService.findEntityById(BODEGA_ID)).thenReturn(bodega(true));
        Paquete sinPeso = paquete(1L, estado(10L, 3, true, TipoFlujoEstado.NORMAL));
        sinPeso.setPesoLbs(null);
        when(paqueteRepository.findAllByIdForUpdate(anyList())).thenReturn(List.of(sinPeso));
        when(paqueteRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        ResultadoEstadoPorPunto r = service().aplicarEstadoEnLoteRecepcion(List.of(1L), LocalDateTime.now());

        assertEquals(1, r.actualizados());
        assertEquals(BODEGA_ID, sinPeso.getEstadoRastreo().getId());
        verify(trackingEventService, times(1)).registrarTransicion(
                any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void bloqueado_seOmiteSinDegradar() {
        stubConfig(BODEGA_ID);
        when(estadoRastreoService.findEntityById(BODEGA_ID)).thenReturn(bodega(true));
        Paquete bloqueado = paquete(1L, estado(10L, 3, true, TipoFlujoEstado.NORMAL));
        bloqueado.setBloqueado(true);
        when(paqueteRepository.findAllByIdForUpdate(anyList())).thenReturn(List.of(bloqueado));

        ResultadoEstadoPorPunto r = service().aplicarEstadoEnLoteRecepcion(List.of(1L), LocalDateTime.now());

        assertEquals(0, r.actualizados());
        assertEquals(1, r.bloqueados());
        assertEquals(10L, bloqueado.getEstadoRastreo().getId());
        verify(paqueteRepository, never()).saveAll(anyList());
    }

    @Test
    void resultado_vacioCuandoListaVacia() {
        stubConfig(BODEGA_ID);
        ResultadoEstadoPorPunto r = service().aplicarEstadoEnLoteRecepcion(List.of(), LocalDateTime.now());
        assertEquals(0, r.total());
        verifyNoInteractions(trackingEventService);
    }
}
