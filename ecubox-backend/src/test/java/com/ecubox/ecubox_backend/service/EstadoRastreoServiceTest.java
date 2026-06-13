package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadoRastreoAlternoAfterItemRequest;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.mapper.EstadoRastreoMapper;
import com.ecubox.ecubox_backend.repository.EstadoRastreoRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EstadoRastreoServiceTest {

    @Mock
    private EstadoRastreoRepository estadoRastreoRepository;
    @Mock
    private PaqueteRepository paqueteRepository;
    @Mock
    private EntityManager entityManager;

    private EstadoRastreoService estadoRastreoService;

    @BeforeEach
    void setup() {
        EstadoRastreoMapper mapper = new com.ecubox.ecubox_backend.mapper.EstadoRastreoMapperImpl();
        estadoRastreoService = new EstadoRastreoService(estadoRastreoRepository, paqueteRepository, entityManager, mapper);
    }

    @Test
    void reorderTracking_reordenaEstadosActivos() {
        EstadoRastreo enUsa = EstadoRastreo.builder().id(1L).codigo("EN_USA").nombre("En USA").activo(true).ordenTracking(1).tipoFlujo(TipoFlujoEstado.NORMAL).build();
        EstadoRastreo retenido = EstadoRastreo.builder().id(2L).codigo("RETENIDO").nombre("Retenido").activo(true).ordenTracking(2).tipoFlujo(TipoFlujoEstado.ALTERNO).build();
        EstadoRastreo enEcuador = EstadoRastreo.builder().id(3L).codigo("EN_ECUADOR").nombre("En Ecuador").activo(true).ordenTracking(3).tipoFlujo(TipoFlujoEstado.NORMAL).build();

        when(estadoRastreoRepository.findByActivoTrueOrderByOrdenTrackingAscIdAsc())
                .thenReturn(List.of(enUsa, retenido, enEcuador));
        when(estadoRastreoRepository.saveAll(org.mockito.ArgumentMatchers.anyList()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = estadoRastreoService.reorderTracking(
                List.of(1L, 3L),
                List.of(EstadoRastreoAlternoAfterItemRequest.builder().estadoId(2L).afterEstadoId(1L).build())
        );

        assertEquals(List.of(1L, 2L, 3L), result.stream().map(item -> item.getId()).toList());
        assertEquals(List.of(1, 2, 3), result.stream().map(item -> item.getOrdenTracking()).toList());
    }

    @Test
    void reorderTracking_fallaSiHayIdsDuplicados() {
        EstadoRastreo a = EstadoRastreo.builder().id(1L).activo(true).ordenTracking(1).tipoFlujo(TipoFlujoEstado.NORMAL).build();
        EstadoRastreo b = EstadoRastreo.builder().id(2L).activo(true).ordenTracking(2).tipoFlujo(TipoFlujoEstado.NORMAL).build();
        when(estadoRastreoRepository.findByActivoTrueOrderByOrdenTrackingAscIdAsc())
                .thenReturn(List.of(a, b));

        var exDup = assertThrows(BadRequestException.class,
                () -> estadoRastreoService.reorderTracking(List.of(1L, 1L), List.of()));
        assertTrue(exDup.getMessage().contains("repetidos"));
    }

    @Test
    void reorderTracking_fallaSiAlternoNoTieneAfterEstado() {
        EstadoRastreo base = EstadoRastreo.builder().id(1L).activo(true).ordenTracking(1).tipoFlujo(TipoFlujoEstado.NORMAL).build();
        EstadoRastreo alterno = EstadoRastreo.builder().id(2L).activo(true).ordenTracking(2).tipoFlujo(TipoFlujoEstado.ALTERNO).build();
        when(estadoRastreoRepository.findByActivoTrueOrderByOrdenTrackingAscIdAsc())
                .thenReturn(List.of(base, alterno));

        var exAlt = assertThrows(BadRequestException.class,
                () -> estadoRastreoService.reorderTracking(List.of(1L), List.of()));
        assertTrue(exAlt.getMessage().contains("alternos"));
    }

    @Test
    void findCatalogoPublicoCliente_mapeaCamposYDevuelveLeyendaCruda() {
        EstadoRastreo registrado = EstadoRastreo.builder()
                .id(1L).codigo("REGISTRADO").nombre("Registrado")
                .leyenda("Recibimos tu paquete en nuestra bodega de USA.")
                .activo(true).publicoTracking(true).ordenTracking(1)
                .tipoFlujo(TipoFlujoEstado.NORMAL).build();
        EstadoRastreo retenido = EstadoRastreo.builder()
                .id(2L).codigo("RETENIDO").nombre("Retenido en aduana")
                .leyenda("Tu paquete lleva {dias} días en revisión de aduana.")
                .activo(true).publicoTracking(true).ordenTracking(2)
                .tipoFlujo(TipoFlujoEstado.ALTERNO).build();

        when(estadoRastreoRepository.findByActivoTrueAndPublicoTrackingTrueOrderByOrdenTrackingAscIdAsc())
                .thenReturn(List.of(registrado, retenido));

        var catalogo = estadoRastreoService.findCatalogoPublicoCliente();

        assertEquals(2, catalogo.size());
        assertEquals("Registrado", catalogo.get(0).getNombre());
        assertEquals("Recibimos tu paquete en nuestra bodega de USA.", catalogo.get(0).getLeyenda());
        assertEquals(1, catalogo.get(0).getOrdenTracking());
        assertEquals(TipoFlujoEstado.NORMAL, catalogo.get(0).getTipoFlujo());
        // La leyenda se devuelve cruda: el placeholder {dias} lo resuelve el frontend.
        assertEquals("Tu paquete lleva {dias} días en revisión de aduana.", catalogo.get(1).getLeyenda());
        assertEquals(TipoFlujoEstado.ALTERNO, catalogo.get(1).getTipoFlujo());
    }

    @Test
    void findCatalogoPublicoEntities_insertaAlternoDespuesDeSuAncla() {
        EstadoRastreo base1 = EstadoRastreo.builder()
                .id(1L).ordenTracking(1).tipoFlujo(TipoFlujoEstado.NORMAL).build();
        EstadoRastreo base2 = EstadoRastreo.builder()
                .id(2L).ordenTracking(2).tipoFlujo(TipoFlujoEstado.NORMAL).build();
        EstadoRastreo alterno = EstadoRastreo.builder()
                .id(3L).ordenTracking(99).tipoFlujo(TipoFlujoEstado.ALTERNO)
                .afterEstado(base1).build();
        when(estadoRastreoRepository.findByActivoTrueAndPublicoTrackingTrueOrderByOrdenTrackingAscIdAsc())
                .thenReturn(List.of(base1, base2, alterno));

        var result = estadoRastreoService.findCatalogoPublicoEntities();

        assertEquals(List.of(1L, 3L, 2L), result.stream().map(EstadoRastreo::getId).toList());
    }

    @Test
    void resolverTransicionInmediata_usaMayorOrdenAnteriorAunqueHayaHuecos() {
        EstadoRastreo destino = EstadoRastreo.builder()
                .id(30L).nombre("Destino").activo(true).orden(90).ordenTracking(90)
                .tipoFlujo(TipoFlujoEstado.NORMAL).build();
        EstadoRastreo anterior = EstadoRastreo.builder()
                .id(20L).nombre("Anterior").activo(true).orden(40).ordenTracking(40)
                .tipoFlujo(TipoFlujoEstado.NORMAL).build();
        when(estadoRastreoRepository.findById(30L)).thenReturn(java.util.Optional.of(destino));
        when(estadoRastreoRepository.findAnterioresActivosMismoFlujo(
                org.mockito.ArgumentMatchers.eq(TipoFlujoEstado.NORMAL),
                org.mockito.ArgumentMatchers.eq(90),
                any(Pageable.class)))
                .thenReturn(List.of(anterior));

        var transicion = estadoRastreoService.resolverTransicionInmediata(30L);

        assertEquals(30L, transicion.destino().getId());
        assertEquals(20L, transicion.anterior().getId());
    }

    @Test
    void resolverTransicionInmediata_fallaSiNoExisteEstadoAnterior() {
        EstadoRastreo destino = EstadoRastreo.builder()
                .id(30L).nombre("Destino").activo(true).orden(90).ordenTracking(90)
                .tipoFlujo(TipoFlujoEstado.NORMAL).build();
        when(estadoRastreoRepository.findById(30L)).thenReturn(java.util.Optional.of(destino));
        when(estadoRastreoRepository.findAnterioresActivosMismoFlujo(
                org.mockito.ArgumentMatchers.eq(TipoFlujoEstado.NORMAL),
                org.mockito.ArgumentMatchers.eq(90),
                any(Pageable.class)))
                .thenReturn(List.of());

        var ex = assertThrows(BadRequestException.class,
                () -> estadoRastreoService.resolverTransicionInmediata(30L));

        assertTrue(ex.getMessage().contains("estado activo anterior"));
    }
}
