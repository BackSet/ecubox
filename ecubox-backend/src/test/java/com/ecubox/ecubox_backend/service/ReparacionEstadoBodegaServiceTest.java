package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.ReparacionBodegaReporteDTO;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.service.PaqueteService.ResultadoReparacion;
import com.ecubox.ecubox_backend.service.PaqueteService.ResultadoReparacionBodega;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ReparacionEstadoBodegaServiceTest {

    @Mock private PaqueteRepository paqueteRepository;
    @Mock private PaqueteService paqueteService;

    private ReparacionEstadoBodegaService service() {
        return new ReparacionEstadoBodegaService(paqueteRepository, paqueteService);
    }

    private ResultadoReparacion res(Long id, ResultadoReparacionBodega r) {
        return new ResultadoReparacion(id, r, null, null, null, null, null,
                r == ResultadoReparacionBodega.REPARADO);
    }

    @Test
    void execute_sinConfirmacion_lanza_yNoToca() {
        assertThrows(BadRequestException.class,
                () -> service().ejecutar(false, 100, null, "incorrecto"));
        verify(paqueteService, never()).repararEstadoBodega(any(), anyString(), anyBoolean());
    }

    @Test
    void dryRun_noRequiereConfirmacion_yAgregaConteos() {
        when(paqueteRepository.findIdsEnConsolidadosRecibidosEnLote(eq(0L), any()))
                .thenReturn(List.of(1L, 2L, 3L));
        when(paqueteService.repararEstadoBodega(eq(1L), anyString(), eq(true)))
                .thenReturn(res(1L, ResultadoReparacionBodega.REPARADO));
        when(paqueteService.repararEstadoBodega(eq(2L), anyString(), eq(true)))
                .thenReturn(res(2L, ResultadoReparacionBodega.POSTERIOR));
        when(paqueteService.repararEstadoBodega(eq(3L), anyString(), eq(true)))
                .thenReturn(res(3L, ResultadoReparacionBodega.SIN_FECHA));

        ReparacionBodegaReporteDTO rep = service().ejecutar(true, 100, null, null);

        assertTrue(rep.isDryRun());
        assertNotNull(rep.getRepairRunId());
        assertEquals(3, rep.getTotalEvaluados());
        assertEquals(1, rep.getReparados());
        assertEquals(1, rep.getPosteriores());
        assertEquals(1, rep.getSinFecha());
        assertEquals(3L, rep.getUltimoIdProcesado());
        assertTrue(rep.isCompleto());
    }

    @Test
    void execute_conConfirmacion_reparaEnModoNoDryRun() {
        when(paqueteRepository.findIdsEnConsolidadosRecibidosEnLote(eq(0L), any()))
                .thenReturn(List.of(1L));
        when(paqueteService.repararEstadoBodega(eq(1L), anyString(), eq(false)))
                .thenReturn(res(1L, ResultadoReparacionBodega.REPARADO));

        ReparacionBodegaReporteDTO rep = service().ejecutar(
                false, 100, null, ReparacionEstadoBodegaService.CONFIRMACION_REQUERIDA);

        assertFalse(rep.isDryRun());
        assertEquals(1, rep.getReparados());
        verify(paqueteService).repararEstadoBodega(eq(1L), anyString(), eq(false));
    }

    @Test
    void lotes_avanzaCheckpointEntreBloques() {
        // batchSize=2 fuerza un segundo bloque resuelto por checkpoint (id > último).
        when(paqueteRepository.findIdsEnConsolidadosRecibidosEnLote(eq(0L), any()))
                .thenReturn(List.of(1L, 2L));
        when(paqueteRepository.findIdsEnConsolidadosRecibidosEnLote(eq(2L), any()))
                .thenReturn(List.of(3L));
        when(paqueteService.repararEstadoBodega(any(), anyString(), anyBoolean()))
                .thenAnswer(inv -> res(inv.getArgument(0), ResultadoReparacionBodega.REPARADO));

        ReparacionBodegaReporteDTO rep = service().ejecutar(true, 2, null, null);

        assertEquals(3, rep.getTotalEvaluados());
        verify(paqueteRepository).findIdsEnConsolidadosRecibidosEnLote(eq(0L), any());
        verify(paqueteRepository).findIdsEnConsolidadosRecibidosEnLote(eq(2L), any());
    }

    @Test
    void errorIntermedio_seCuentaYContinua() {
        when(paqueteRepository.findIdsEnConsolidadosRecibidosEnLote(eq(0L), any()))
                .thenReturn(List.of(1L, 2L, 3L));
        when(paqueteService.repararEstadoBodega(eq(1L), anyString(), anyBoolean()))
                .thenReturn(res(1L, ResultadoReparacionBodega.REPARADO));
        when(paqueteService.repararEstadoBodega(eq(2L), anyString(), anyBoolean()))
                .thenThrow(new RuntimeException("boom"));
        when(paqueteService.repararEstadoBodega(eq(3L), anyString(), anyBoolean()))
                .thenReturn(res(3L, ResultadoReparacionBodega.REPARADO));

        ReparacionBodegaReporteDTO rep = service().ejecutar(true, 100, null, null);

        assertEquals(3, rep.getTotalEvaluados());
        assertEquals(2, rep.getReparados());
        assertEquals(1, rep.getErrores());
        assertEquals(3L, rep.getUltimoIdProcesado()); // continuó tras el error
    }

    @Test
    void maxPaquetes_cortaYReportaIncompleto() {
        when(paqueteRepository.findIdsEnConsolidadosRecibidosEnLote(eq(0L), any()))
                .thenReturn(List.of(1L, 2L, 3L));
        when(paqueteService.repararEstadoBodega(any(), anyString(), anyBoolean()))
                .thenAnswer(inv -> res(inv.getArgument(0), ResultadoReparacionBodega.REPARADO));

        ReparacionBodegaReporteDTO rep = service().ejecutar(true, 100, 2, null);

        assertEquals(2, rep.getTotalEvaluados());
        assertFalse(rep.isCompleto());
    }
}
