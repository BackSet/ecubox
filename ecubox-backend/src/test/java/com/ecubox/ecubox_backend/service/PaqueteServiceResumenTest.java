package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.PaqueteResumenDTO;
import com.ecubox.ecubox_backend.repository.ConsignatarioRepository;
import com.ecubox.ecubox_backend.repository.GuiaMasterRepository;
import com.ecubox.ecubox_backend.repository.LoteRecepcionGuiaRepository;
import com.ecubox.ecubox_backend.repository.OutboxEventRepository;
import com.ecubox.ecubox_backend.repository.PaqueteEstadoEventoRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.SacaRepository;
import com.ecubox.ecubox_backend.service.validation.OwnershipValidator;
import com.ecubox.ecubox_backend.service.validation.SacaEnDespachoValidator;
import org.springframework.data.jpa.domain.Specification;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Regresion: el resumen de la vista operario/admin se invoca con
 * {@code usuarioIdOrNull == null}. En Spring Data JPA 4.0 {@code Specification.where(null)}
 * lanza {@link IllegalArgumentException} (antes se toleraba), lo que producia un
 * 400 en {@code GET /api/mis-paquetes/resumen}. El universo debe partir de
 * {@code Specification.unrestricted()} cuando no hay restriccion de propietario.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PaqueteServiceResumenTest {

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

    private void stubVacio() {
        when(paqueteRepository.count(any(Specification.class))).thenReturn(0L);
        when(paqueteRepository.countDistinctConsignatarios(any())).thenReturn(0L);
        when(paqueteRepository.findDistinctEstados(any())).thenReturn(List.of());
        when(paqueteRepository.findDistinctConsignatarios(any())).thenReturn(List.of());
        when(paqueteRepository.findDistinctEnvioCodigos(any())).thenReturn(List.of());
        when(paqueteRepository.findDistinctGuiasMaster(any())).thenReturn(List.of());
    }

    @Test
    void resumen_vistaOperarioAdmin_sinUsuario_noLanza() {
        PaqueteService svc = createService();
        stubVacio();

        PaqueteResumenDTO dto = assertDoesNotThrow(
                () -> svc.resumen(null, null, PaqueteService.PaqueteListFilters.empty()));
        assertNotNull(dto);
    }

    @Test
    void resumen_vistaCliente_conUsuario_noLanza() {
        PaqueteService svc = createService();
        stubVacio();

        PaqueteResumenDTO dto = assertDoesNotThrow(
                () -> svc.resumen(7L, null, PaqueteService.PaqueteListFilters.empty()));
        assertNotNull(dto);
    }

    @Test
    void resumen_gateRevision_ocultaContadorSinPermiso() {
        PaqueteService svc = createService();
        when(paqueteRepository.count(any(Specification.class))).thenReturn(5L);
        when(paqueteRepository.countDistinctConsignatarios(any())).thenReturn(0L);
        when(paqueteRepository.findDistinctEstados(any())).thenReturn(List.of());
        when(paqueteRepository.findDistinctConsignatarios(any())).thenReturn(List.of());
        when(paqueteRepository.findDistinctEnvioCodigos(any())).thenReturn(List.of());
        when(paqueteRepository.findDistinctGuiasMaster(any())).thenReturn(List.of());

        // Sin permiso de revisión: el contador "en revisión" se omite (0).
        var sinPermiso = svc.resumen(null, null, PaqueteService.PaqueteListFilters.empty(), false);
        assertEquals(0L, sinPermiso.getBandejas().getEnRevision());

        // Con permiso: contador real.
        var conPermiso = svc.resumen(null, null, PaqueteService.PaqueteListFilters.empty(), true);
        assertEquals(5L, conPermiso.getBandejas().getEnRevision());
    }
}
