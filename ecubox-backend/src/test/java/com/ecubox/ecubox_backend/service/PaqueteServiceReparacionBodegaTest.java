package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
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
import com.ecubox.ecubox_backend.service.PaqueteService.ResultadoReparacion;
import com.ecubox.ecubox_backend.service.PaqueteService.ResultadoReparacionBodega;
import com.ecubox.ecubox_backend.service.validation.OwnershipValidator;
import com.ecubox.ecubox_backend.service.validation.SacaEnDespachoValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Matriz de {@link PaqueteService#repararEstadoBodega}: reutiliza la
 * clasificación central, no degrada, usa la fecha histórica del lote, es
 * idempotente y en dry-run no escribe.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PaqueteServiceReparacionBodegaTest {

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
    private static final LocalDateTime FECHA_LOTE = LocalDateTime.of(2025, 1, 10, 9, 0);

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
        return EstadoRastreo.builder().id(id).nombre("E" + id).orden(orden).activo(activo).tipoFlujo(flujo).build();
    }

    private EstadoRastreo bodega() {
        return estado(BODEGA_ID, BODEGA_ORDEN, true, TipoFlujoEstado.NORMAL);
    }

    private Paquete paquete(EstadoRastreo origen) {
        return Paquete.builder().id(1L).numeroGuia("GU-1")
                .estadoRastreo(origen).bloqueado(false).enFlujoAlterno(false)
                .envioConsolidado(EnvioConsolidado.builder().id(7L).codigo("ENV-1").build())
                .build();
    }

    private void stubBase(Long bodegaConfigId) {
        when(parametroSistemaService.getEstadosRastreoPorPunto())
                .thenReturn(EstadosRastreoPorPuntoDTO.builder()
                        .estadoRastreoEnLoteRecepcionId(bodegaConfigId).build());
        when(estadoRastreoService.findEntityById(BODEGA_ID)).thenReturn(bodega());
        when(loteRecepcionGuiaRepository.findMinFechaRecepcionByNumeroGuiaEnvioIgnoreCase(anyString()))
                .thenReturn(Optional.of(FECHA_LOTE));
        when(paqueteRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(paqueteRepository.save(any(Paquete.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void actualizable_ejecuta_avanzaConFechaHistoricaYRegistraEvento() {
        stubBase(BODEGA_ID);
        Paquete p = paquete(estado(10L, 3, true, TipoFlujoEstado.NORMAL));
        when(paqueteRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(p));
        when(paqueteEstadoEventoRepository.existsByIdempotencyKey("reparacion-bodega:1:50")).thenReturn(false);
        when(trackingEventService.registrarReparacionEstado(any(), any(), any(), anyString(),
                eq("reparacion-bodega:1:50"), eq(FECHA_LOTE))).thenReturn(true);

        ResultadoReparacion r = service().repararEstadoBodega(1L, "run-1", false);

        assertEquals(ResultadoReparacionBodega.REPARADO, r.resultado());
        assertTrue(r.eventoRegistrado());
        assertEquals(FECHA_LOTE, r.fechaHistorica());
        assertEquals(BODEGA_ID, p.getEstadoRastreo().getId());
        assertEquals(FECHA_LOTE, p.getFechaEstadoActualDesde());
        verify(paqueteRepository).save(p);
        verify(trackingEventService).registrarReparacionEstado(any(), any(), any(), anyString(),
                eq("reparacion-bodega:1:50"), eq(FECHA_LOTE));
    }

    @Test
    void dryRun_noEscribeNiRegistraEvento() {
        stubBase(BODEGA_ID);
        Paquete p = paquete(estado(10L, 3, true, TipoFlujoEstado.NORMAL));
        when(paqueteRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(p));
        when(paqueteEstadoEventoRepository.existsByIdempotencyKey(anyString())).thenReturn(false);

        ResultadoReparacion r = service().repararEstadoBodega(1L, "run-1", true);

        assertEquals(ResultadoReparacionBodega.REPARADO, r.resultado());
        assertFalse(r.eventoRegistrado());
        assertEquals(10L, p.getEstadoRastreo().getId()); // sin cambios
        verify(paqueteRepository, never()).save(any());
        verify(trackingEventService, never()).registrarReparacionEstado(any(), any(), any(), anyString(), anyString(), any());
    }

    @Test
    void yaCorrecto_mismoEstado() {
        stubBase(BODEGA_ID);
        Paquete p = paquete(estado(BODEGA_ID, BODEGA_ORDEN, true, TipoFlujoEstado.NORMAL));
        when(paqueteRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(p));

        ResultadoReparacion r = service().repararEstadoBodega(1L, "run-1", false);

        assertEquals(ResultadoReparacionBodega.YA_CORRECTO, r.resultado());
        verify(paqueteRepository, never()).save(any());
    }

    @Test
    void posterior_noSeDegrada() {
        stubBase(BODEGA_ID);
        Paquete p = paquete(estado(60L, 8, true, TipoFlujoEstado.NORMAL));
        when(paqueteRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(p));

        ResultadoReparacion r = service().repararEstadoBodega(1L, "run-1", false);

        assertEquals(ResultadoReparacionBodega.POSTERIOR, r.resultado());
        assertEquals(60L, p.getEstadoRastreo().getId());
        verify(paqueteRepository, never()).save(any());
    }

    @Test
    void alterno_seOmite() {
        stubBase(BODEGA_ID);
        Paquete p = paquete(estado(70L, 4, true, TipoFlujoEstado.ALTERNO));
        when(paqueteRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(p));

        ResultadoReparacion r = service().repararEstadoBodega(1L, "run-1", false);

        assertEquals(ResultadoReparacionBodega.ALTERNO, r.resultado());
        verify(paqueteRepository, never()).save(any());
    }

    @Test
    void bloqueado_seOmite() {
        stubBase(BODEGA_ID);
        Paquete p = paquete(estado(10L, 3, true, TipoFlujoEstado.NORMAL));
        p.setBloqueado(true);
        when(paqueteRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(p));

        ResultadoReparacion r = service().repararEstadoBodega(1L, "run-1", false);

        assertEquals(ResultadoReparacionBodega.BLOQUEADO, r.resultado());
        verify(paqueteRepository, never()).save(any());
    }

    @Test
    void sinFecha_seOmite_noInventaFecha() {
        stubBase(BODEGA_ID);
        Paquete p = paquete(estado(10L, 3, true, TipoFlujoEstado.NORMAL));
        when(paqueteRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(p));
        when(loteRecepcionGuiaRepository.findMinFechaRecepcionByNumeroGuiaEnvioIgnoreCase(anyString()))
                .thenReturn(Optional.empty());

        ResultadoReparacion r = service().repararEstadoBodega(1L, "run-1", false);

        assertEquals(ResultadoReparacionBodega.SIN_FECHA, r.resultado());
        assertEquals(10L, p.getEstadoRastreo().getId());
        verify(paqueteRepository, never()).save(any());
    }

    @Test
    void idempotente_yaReparado_noVuelveAEscribir() {
        stubBase(BODEGA_ID);
        Paquete p = paquete(estado(10L, 3, true, TipoFlujoEstado.NORMAL));
        when(paqueteRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(p));
        when(paqueteEstadoEventoRepository.existsByIdempotencyKey("reparacion-bodega:1:50")).thenReturn(true);

        ResultadoReparacion r = service().repararEstadoBodega(1L, "run-1", false);

        assertEquals(ResultadoReparacionBodega.YA_REPARADO, r.resultado());
        assertEquals(10L, p.getEstadoRastreo().getId());
        verify(paqueteRepository, never()).save(any());
        verify(trackingEventService, never()).registrarReparacionEstado(any(), any(), any(), anyString(), anyString(), any());
    }

    @Test
    void destinoNoConfigurado_cuandoNoHayEstadoBodega() {
        when(parametroSistemaService.getEstadosRastreoPorPunto())
                .thenReturn(EstadosRastreoPorPuntoDTO.builder().estadoRastreoEnLoteRecepcionId(null).build());

        ResultadoReparacion r = service().repararEstadoBodega(1L, "run-1", false);

        assertEquals(ResultadoReparacionBodega.DESTINO_NO_CONFIGURADO, r.resultado());
        verify(paqueteRepository, never()).save(any());
    }
}
