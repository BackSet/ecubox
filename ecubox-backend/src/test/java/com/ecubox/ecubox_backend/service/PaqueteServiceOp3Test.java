package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.repository.DestinatarioFinalRepository;
import com.ecubox.ecubox_backend.repository.LoteRecepcionGuiaRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.SacaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaqueteServiceOp3Test {

    @Mock
    private PaqueteRepository paqueteRepository;
    @Mock
    private DestinatarioFinalRepository destinatarioFinalRepository;
    @Mock
    private SacaRepository sacaRepository;
    @Mock
    private LoteRecepcionGuiaRepository loteRecepcionGuiaRepository;
    @Mock
    private ParametroSistemaService parametroSistemaService;
    @Mock
    private EstadoRastreoService estadoRastreoService;
    @Mock
    private TrackingEventService trackingEventService;

    private PaqueteService paqueteService;

    @BeforeEach
    void setup() {
        paqueteService = new PaqueteService(
                paqueteRepository,
                destinatarioFinalRepository,
                sacaRepository,
                loteRecepcionGuiaRepository,
                parametroSistemaService,
                estadoRastreoService,
                trackingEventService,
                false
        );
    }

    @Test
    void marcaFlujoAlternoAlEntrarEstadoAlterno() {
        EstadoRastreo origen = EstadoRastreo.builder().id(1L).nombre("En ruta").build();
        EstadoRastreo destinoAlterno = EstadoRastreo.builder()
                .id(3L)
                .nombre("Retenido en aduana")
                .activo(true)
                .tipoFlujo(TipoFlujoEstado.ALTERNO)
                .build();
        Paquete p = Paquete.builder()
                .id(20L)
                .estadoRastreo(origen)
                .bloqueado(false)
                .enFlujoAlterno(false)
                .build();

        when(parametroSistemaService.getEstadosRastreoPorPunto())
                .thenReturn(EstadosRastreoPorPuntoDTO.builder().build());
        when(paqueteRepository.findById(20L)).thenReturn(Optional.of(p));
        when(estadoRastreoService.findEntityById(3L)).thenReturn(destinoAlterno);
        when(paqueteRepository.save(any(Paquete.class))).thenAnswer(inv -> inv.getArgument(0));

        paqueteService.cambiarEstadoRastreo(20L, 3L, "Retenido para revisión");

        ArgumentCaptor<Paquete> captor = ArgumentCaptor.forClass(Paquete.class);
        verify(paqueteRepository).save(captor.capture());
        Paquete saved = captor.getValue();
        assertTrue(Boolean.TRUE.equals(saved.getEnFlujoAlterno()));
        assertFalse(Boolean.TRUE.equals(saved.getBloqueado()));
        assertEquals("Retenido para revisión", saved.getMotivoAlterno());
        assertNull(saved.getFechaBloqueoDesde());
    }

    @Test
    void trackingFallback_ocultaAlternoSiNoEsEstadoActual() {
        EstadoRastreo registrado = EstadoRastreo.builder().id(1L).codigo("REGISTRADO").nombre("Registrado").ordenTracking(1).publicoTracking(true).build();
        EstadoRastreo enUsa = EstadoRastreo.builder().id(2L).codigo("EN_USA").nombre("En USA").ordenTracking(2).publicoTracking(true).build();
        EstadoRastreo retenido = EstadoRastreo.builder()
                .id(3L)
                .codigo("RETENIDO")
                .nombre("Retenido")
                .ordenTracking(3)
                .publicoTracking(true)
                .tipoFlujo(TipoFlujoEstado.ALTERNO)
                .build();

        Paquete p = Paquete.builder()
                .id(100L)
                .numeroGuia("ABC123")
                .estadoRastreo(enUsa)
                .build();

        when(paqueteRepository.findByNumeroGuiaWithSacaAndDespacho("ABC123")).thenReturn(Optional.of(p));
        when(estadoRastreoService.findActivosEntities()).thenReturn(List.of(registrado, enUsa, retenido));

        var response = paqueteService.findByNumeroGuiaForTracking("abc123");

        assertEquals(2, response.getEstados().size());
        assertFalse(response.getEstados().stream().anyMatch(item -> "RETENIDO".equals(item.getCodigo())));
    }

    @Test
    void trackingFallback_muestraAlternoSiEsEstadoActual() {
        EstadoRastreo registrado = EstadoRastreo.builder().id(1L).codigo("REGISTRADO").nombre("Registrado").ordenTracking(1).publicoTracking(true).build();
        EstadoRastreo retenido = EstadoRastreo.builder()
                .id(3L)
                .codigo("RETENIDO")
                .nombre("Retenido")
                .ordenTracking(3)
                .publicoTracking(true)
                .tipoFlujo(TipoFlujoEstado.ALTERNO)
                .build();

        Paquete p = Paquete.builder()
                .id(101L)
                .numeroGuia("XYZ999")
                .estadoRastreo(retenido)
                .build();

        when(paqueteRepository.findByNumeroGuiaWithSacaAndDespacho("XYZ999")).thenReturn(Optional.of(p));
        when(estadoRastreoService.findActivosEntities()).thenReturn(List.of(registrado, retenido));

        var response = paqueteService.findByNumeroGuiaForTracking("xyz999");

        assertTrue(response.getEstados().stream().anyMatch(item -> "RETENIDO".equals(item.getCodigo()) && item.isEsActual()));
    }
}
