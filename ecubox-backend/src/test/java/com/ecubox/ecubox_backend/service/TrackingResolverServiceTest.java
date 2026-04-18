package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.TrackingMasterResponse;
import com.ecubox.ecubox_backend.dto.TrackingResolveResponse;
import com.ecubox.ecubox_backend.dto.TrackingResponse;
import com.ecubox.ecubox_backend.entity.TrackingViewPaquete;
import com.ecubox.ecubox_backend.enums.TrackingTipo;
import com.ecubox.ecubox_backend.repository.TrackingViewPaqueteRepository;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TrackingResolverServiceTest {

    @Mock private PaqueteService paqueteService;
    @Mock private GuiaMasterService guiaMasterService;

    private TrackingResolverService resolver;

    @BeforeEach
    void setUp() {
        resolver = new TrackingResolverService(
                paqueteService, guiaMasterService, /*viewRepo*/ null);
    }

    @Test
    void resolve_priorizaPiezaCuandoCoincideConNumeroGuia() {
        TrackingResponse pieza = TrackingResponse.builder().numeroGuia("ABC 1/2").build();
        when(paqueteService.findByNumeroGuiaForTracking("ABC 1/2")).thenReturn(pieza);

        TrackingResolveResponse out = resolver.resolve("ABC 1/2");

        assertEquals(TrackingTipo.PIEZA, out.getTipo());
        assertSame(pieza, out.getPieza());
        verify(guiaMasterService, never()).findByTrackingBaseForTracking("ABC 1/2");
    }

    @Test
    void resolve_caeAGuiaMasterCuandoNoHayPieza() {
        when(paqueteService.findByNumeroGuiaForTracking("TRK-1"))
                .thenThrow(new ResourceNotFoundException("Paquete", "TRK-1"));
        TrackingMasterResponse master = TrackingMasterResponse.builder().trackingBase("TRK-1").build();
        when(guiaMasterService.findByTrackingBaseForTracking("TRK-1")).thenReturn(Optional.of(master));

        TrackingResolveResponse out = resolver.resolve("TRK-1");

        assertEquals(TrackingTipo.GUIA_MASTER, out.getTipo());
        assertSame(master, out.getMaster());
    }

    @Test
    void resolve_lanza404SiNingunaCoincidencia() {
        when(paqueteService.findByNumeroGuiaForTracking("MISS"))
                .thenThrow(new ResourceNotFoundException("Paquete", "MISS"));
        when(guiaMasterService.findByTrackingBaseForTracking("MISS")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> resolver.resolve("MISS"));
    }

    @Test
    void resolve_envioConsolidadoNoSeResuelve_devuelve404() {
        // El envio consolidado es interno; aunque su codigo exista, NO debe resolverse aqui.
        when(paqueteService.findByNumeroGuiaForTracking("ENVIO-1"))
                .thenThrow(new ResourceNotFoundException("Paquete", "ENVIO-1"));
        when(guiaMasterService.findByTrackingBaseForTracking("ENVIO-1")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> resolver.resolve("ENVIO-1"));
    }

    @Test
    void resolve_lanzaBadRequestSiCodigoVacio() {
        assertThrows(BadRequestException.class, () -> resolver.resolve("   "));
        assertThrows(BadRequestException.class, () -> resolver.resolve(null));
    }

    @Test
    void resolve_trimeaCodigoYDelegaConValorLimpio() {
        TrackingResponse pieza = TrackingResponse.builder().numeroGuia("ABC").build();
        when(paqueteService.findByNumeroGuiaForTracking("ABC")).thenReturn(pieza);

        TrackingResolveResponse out = resolver.resolve("  ABC  ");

        assertNotNull(out);
        assertEquals(TrackingTipo.PIEZA, out.getTipo());
        verify(paqueteService).findByNumeroGuiaForTracking("ABC");
        lenient().when(guiaMasterService.findByTrackingBaseForTracking("  ABC  ")).thenReturn(Optional.empty());
    }

    @Test
    void resolve_conProyeccion_usaHintParaSaltarMaster() {
        TrackingViewPaqueteRepository viewRepo = org.mockito.Mockito.mock(TrackingViewPaqueteRepository.class);
        TrackingResolverService r = new TrackingResolverService(
                paqueteService, guiaMasterService, viewRepo);
        TrackingViewPaquete view = TrackingViewPaquete.builder()
                .paqueteId(1L).numeroGuia("ABC 1/2").build();
        when(viewRepo.findByNumeroGuiaIgnoreCase("ABC 1/2")).thenReturn(Optional.of(view));
        TrackingResponse pieza = TrackingResponse.builder().numeroGuia("ABC 1/2").build();
        when(paqueteService.findByNumeroGuiaForTracking("ABC 1/2")).thenReturn(pieza);

        TrackingResolveResponse out = r.resolve("ABC 1/2");

        assertEquals(TrackingTipo.PIEZA, out.getTipo());
        verify(viewRepo).findByNumeroGuiaIgnoreCase("ABC 1/2");
        verify(guiaMasterService, never()).findByTrackingBaseForTracking("ABC 1/2");
    }

    @Test
    void resolve_conProyeccionStale_caeAFallbackCompleto() {
        TrackingViewPaqueteRepository viewRepo = org.mockito.Mockito.mock(TrackingViewPaqueteRepository.class);
        TrackingResolverService r = new TrackingResolverService(
                paqueteService, guiaMasterService, viewRepo);
        TrackingViewPaquete stale = TrackingViewPaquete.builder()
                .paqueteId(1L).numeroGuia("STALE-1").build();
        when(viewRepo.findByNumeroGuiaIgnoreCase("STALE-1")).thenReturn(Optional.of(stale));
        when(paqueteService.findByNumeroGuiaForTracking("STALE-1"))
                .thenThrow(new ResourceNotFoundException("Paquete", "STALE-1"));
        TrackingMasterResponse master = TrackingMasterResponse.builder().trackingBase("STALE-1").build();
        when(guiaMasterService.findByTrackingBaseForTracking("STALE-1")).thenReturn(Optional.of(master));

        TrackingResolveResponse out = r.resolve("STALE-1");

        assertEquals(TrackingTipo.GUIA_MASTER, out.getTipo());
        assertSame(master, out.getMaster());
    }
}
