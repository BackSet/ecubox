package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.CambiarEstadoRastreoBulkResponse;
import com.ecubox.ecubox_backend.dto.EstadoRastreoDTO;
import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.repository.ConsignatarioRepository;
import com.ecubox.ecubox_backend.repository.GuiaMasterRepository;
import com.ecubox.ecubox_backend.repository.LoteRecepcionGuiaRepository;
import com.ecubox.ecubox_backend.repository.OutboxEventRepository;
import com.ecubox.ecubox_backend.repository.PaqueteEstadoEventoRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.SacaRepository;
import com.ecubox.ecubox_backend.service.validation.OwnershipValidator;
import com.ecubox.ecubox_backend.service.validation.SacaEnDespachoValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Valida las reglas de transición de estado de rastreo de Paquete:
 * solo se permite avanzar al siguiente estado inmediato en el orden configurado;
 * se rechazan saltos, retrocesos, estados inactivos y estados no configurados.
 * El cambio masivo y estadosDestinoPermitidos aplican las mismas reglas.
 */
@ExtendWith(MockitoExtension.class)
class PaqueteServiceTransicionTest {

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

    private PaqueteService createService() {
        return new PaqueteService(
                paqueteRepository, consignatarioRepository, sacaRepository,
                loteRecepcionGuiaRepository, paqueteEstadoEventoRepository, outboxEventRepository,
                parametroSistemaService, estadoRastreoService, trackingEventService,
                guiaMasterRepository, guiaMasterService,
                new OwnershipValidator(), new SacaEnDespachoValidator(),
                codigoSecuenciaService, envioConsolidadoService, estadoConsolidadoOperativoResolver,
                false
        );
    }

    private EstadoRastreo estado(long id, int orden, boolean activo) {
        return EstadoRastreo.builder()
                .id(id).nombre("Estado-" + id).orden(orden).activo(activo)
                .tipoFlujo(TipoFlujoEstado.NORMAL).build();
    }

    private Paquete paqueteEn(long paqueteId, EstadoRastreo estadoActual) {
        return Paquete.builder().id(paqueteId).estadoRastreo(estadoActual).build();
    }

    // ── 1. Transición válida al siguiente estado inmediato ─────────────────────

    @Test
    void transicionValida_alSiguienteInmediato_individual() {
        PaqueteService svc = createService();
        EstadoRastreo e1 = estado(1L, 1, true);
        EstadoRastreo e2 = estado(2L, 2, true);
        Paquete p = paqueteEn(10L, e1);

        // getEstadosRastreoPorPunto se invoca internamente al construir el DTO de retorno
        when(parametroSistemaService.getEstadosRastreoPorPunto())
                .thenReturn(EstadosRastreoPorPuntoDTO.builder().build());
        when(paqueteRepository.findById(10L)).thenReturn(Optional.of(p));
        when(estadoRastreoService.findEntityById(2L)).thenReturn(e2);
        when(estadoRastreoService.findSiguienteEstadoInmediato(e1)).thenReturn(Optional.of(e2));
        when(paqueteRepository.save(any(Paquete.class))).thenAnswer(inv -> inv.getArgument(0));

        svc.cambiarEstadoRastreo(10L, 2L, null);
    }

    // ── 2. Salto rechazado ─────────────────────────────────────────────────────

    @Test
    void saltoRechazado_individual() {
        PaqueteService svc = createService();
        EstadoRastreo e1 = estado(1L, 1, true);
        EstadoRastreo e2 = estado(2L, 2, true);
        EstadoRastreo e3 = estado(3L, 3, true);
        Paquete p = paqueteEn(11L, e1);

        when(paqueteRepository.findById(11L)).thenReturn(Optional.of(p));
        when(estadoRastreoService.findEntityById(3L)).thenReturn(e3);
        when(estadoRastreoService.findSiguienteEstadoInmediato(e1)).thenReturn(Optional.of(e2));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> svc.cambiarEstadoRastreo(11L, 3L, null));
        assertTrue(ex.getMessage().contains("siguiente estado inmediato"));
    }

    // ── 3. Retroceso rechazado ─────────────────────────────────────────────────

    @Test
    void retrocesoRechazado_individual() {
        PaqueteService svc = createService();
        EstadoRastreo e1 = estado(1L, 1, true);
        EstadoRastreo e3 = estado(3L, 3, true);
        EstadoRastreo e4 = estado(4L, 4, true);
        Paquete p = paqueteEn(12L, e3);

        when(paqueteRepository.findById(12L)).thenReturn(Optional.of(p));
        when(estadoRastreoService.findEntityById(1L)).thenReturn(e1);
        when(estadoRastreoService.findSiguienteEstadoInmediato(e3)).thenReturn(Optional.of(e4));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> svc.cambiarEstadoRastreo(12L, 1L, null));
        assertTrue(ex.getMessage().contains("retroceder") || ex.getMessage().contains("siguiente estado inmediato"));
    }

    // ── 4. Destino no configurado como siguiente → rechazado ──────────────────

    @Test
    void destinoNoEsSiguiente_rechazado_individual() {
        PaqueteService svc = createService();
        EstadoRastreo e1 = estado(1L, 1, true);
        EstadoRastreo e2 = estado(2L, 2, true);
        EstadoRastreo e5 = estado(5L, 5, true);
        Paquete p = paqueteEn(13L, e1);

        when(paqueteRepository.findById(13L)).thenReturn(Optional.of(p));
        when(estadoRastreoService.findEntityById(5L)).thenReturn(e5);
        // siguiente de e1 es e2, no e5
        when(estadoRastreoService.findSiguienteEstadoInmediato(e1)).thenReturn(Optional.of(e2));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> svc.cambiarEstadoRastreo(13L, 5L, null));
        assertTrue(ex.getMessage().contains("siguiente estado inmediato"));
    }

    // ── 5. Estado actual inactivo → error controlado ──────────────────────────

    @Test
    void estadoActualInactivo_rechazado_individual() {
        PaqueteService svc = createService();
        EstadoRastreo eActualInactivo = estado(1L, 1, false);
        EstadoRastreo e2 = estado(2L, 2, true);
        Paquete p = paqueteEn(14L, eActualInactivo);

        when(paqueteRepository.findById(14L)).thenReturn(Optional.of(p));
        when(estadoRastreoService.findEntityById(2L)).thenReturn(e2);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> svc.cambiarEstadoRastreo(14L, 2L, null));
        assertTrue(ex.getMessage().contains("no está activo"));
    }

    // ── 6. Cambio masivo: mezcla de válidos e inválidos ───────────────────────

    @Test
    void cambioMasivo_mezclaValidosEInvalidos() {
        PaqueteService svc = createService();

        EstadoRastreo e1 = estado(1L, 1, true);
        EstadoRastreo e2 = estado(2L, 2, true);
        EstadoRastreo e3 = estado(3L, 3, true);
        EstadoRastreo e4 = estado(4L, 4, true);

        // paquete 100: estado e1, siguiente es e2 → válido
        Paquete p100 = paqueteEn(100L, e1);
        // paquete 101: estado e3, siguiente es e4 (no e2) → rechazado
        Paquete p101 = paqueteEn(101L, e3);

        when(estadoRastreoService.findEntityById(2L)).thenReturn(e2);
        when(paqueteRepository.findAllById(List.of(100L, 101L))).thenReturn(List.of(p100, p101));
        when(estadoRastreoService.findSiguienteEstadoInmediato(e1)).thenReturn(Optional.of(e2));
        when(estadoRastreoService.findSiguienteEstadoInmediato(e3)).thenReturn(Optional.of(e4));
        when(paqueteRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        CambiarEstadoRastreoBulkResponse resp =
                svc.cambiarEstadoRastreoBulk(List.of(100L, 101L), 2L);

        assertEquals(1, resp.getActualizados());
        assertEquals(1, resp.getRechazados().size());
        assertEquals(101L, resp.getRechazados().get(0).getPaqueteId());
    }

    // ── 6b. Cambio masivo: paquete en saca/despacho → rechazado con motivo claro ─

    @Test
    void cambioMasivo_paqueteEnSacaODespacho_rechazadoConMotivoClaro() {
        PaqueteService svc = createService();
        EstadoRastreo e1 = estado(1L, 1, true);
        EstadoRastreo e2 = estado(2L, 2, true);
        Paquete enSaca = Paquete.builder().id(100L).estadoRastreo(e1)
                .saca(com.ecubox.ecubox_backend.entity.Saca.builder().id(7L).build())
                .build();

        when(estadoRastreoService.findEntityById(2L)).thenReturn(e2);
        when(paqueteRepository.findAllById(List.of(100L))).thenReturn(List.of(enSaca));

        CambiarEstadoRastreoBulkResponse resp = svc.cambiarEstadoRastreoBulk(List.of(100L), 2L);

        assertEquals(0, resp.getActualizados());
        assertEquals(1, resp.getRechazados().size());
        assertTrue(resp.getRechazados().get(0).getMotivo().contains("saca o despacho"));
    }

    // ── 6c. Cambio masivo: estado destino desactivado → error con regla ────────

    @Test
    void cambioMasivo_estadoDestinoDesactivado_lanzaBadRequestConRegla() {
        PaqueteService svc = createService();
        EstadoRastreo inactivo = estado(2L, 2, false);
        when(estadoRastreoService.findEntityById(2L)).thenReturn(inactivo);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> svc.cambiarEstadoRastreoBulk(List.of(1L), 2L));
        assertTrue(ex.getMessage().contains("Estado-2"));
        assertTrue(ex.getMessage().contains("no está activo"));
        assertTrue(ex.getMessage().contains("estados de rastreo activos"));
    }

    // ── 7. estadosDestinoPermitidos devuelve solo el siguiente inmediato ───────

    @Test
    void estadosDestinoPermitidos_soloDevuelveSiguienteInmediato() {
        PaqueteService svc = createService();

        EstadoRastreo e1 = estado(1L, 1, true);
        EstadoRastreo e2 = estado(2L, 2, true);
        Paquete p = paqueteEn(20L, e1);

        EstadoRastreoDTO e2dto = EstadoRastreoDTO.builder()
                .id(2L).nombre("Estado-2").orden(2).activo(true)
                .tipoFlujo(TipoFlujoEstado.NORMAL).build();

        when(paqueteRepository.findById(20L)).thenReturn(Optional.of(p));
        when(estadoRastreoService.findSiguienteEstadoInmediato(e1)).thenReturn(Optional.of(e2));
        when(parametroSistemaService.getIdsEstadosRastreoGestionadosAutomaticamente())
                .thenReturn(Set.of());
        when(estadoRastreoService.findActivos()).thenReturn(List.of(e2dto));

        List<EstadoRastreoDTO> result = svc.estadosDestinoPermitidos(List.of(20L));

        assertEquals(1, result.size());
        assertEquals(2L, result.get(0).getId());
    }

    // ── 7b. estadosDestinoPermitidos vacío si paquetes tienen distintos siguientes ─

    @Test
    void estadosDestinoPermitidos_vacioSiPaquetesTienenDistintaSiguiente() {
        PaqueteService svc = createService();

        EstadoRastreo e1 = estado(1L, 1, true);
        EstadoRastreo e2 = estado(2L, 2, true);
        EstadoRastreo e3 = estado(3L, 3, true);
        EstadoRastreo e4 = estado(4L, 4, true);

        Paquete p20 = paqueteEn(20L, e1);  // siguiente: e2
        Paquete p21 = paqueteEn(21L, e3);  // siguiente: e4

        when(paqueteRepository.findById(20L)).thenReturn(Optional.of(p20));
        when(paqueteRepository.findById(21L)).thenReturn(Optional.of(p21));
        when(estadoRastreoService.findSiguienteEstadoInmediato(e1)).thenReturn(Optional.of(e2));
        when(estadoRastreoService.findSiguienteEstadoInmediato(e3)).thenReturn(Optional.of(e4));
        when(parametroSistemaService.getIdsEstadosRastreoGestionadosAutomaticamente())
                .thenReturn(Set.of());

        List<EstadoRastreoDTO> result = svc.estadosDestinoPermitidos(List.of(20L, 21L));

        assertTrue(result.isEmpty());
    }
}
