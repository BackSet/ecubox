package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadoRastreoAlternoAfterItemRequest;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.repository.EstadoRastreoRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EstadoRastreoServiceTest {

    @Mock
    private EstadoRastreoRepository estadoRastreoRepository;
    @Mock
    private PaqueteRepository paqueteRepository;

    private EstadoRastreoService estadoRastreoService;

    @BeforeEach
    void setup() {
        estadoRastreoService = new EstadoRastreoService(estadoRastreoRepository, paqueteRepository);
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

        assertThrows(BadRequestException.class, () -> estadoRastreoService.reorderTracking(List.of(1L, 1L), List.of()));
    }

    @Test
    void reorderTracking_fallaSiAlternoNoTieneAfterEstado() {
        EstadoRastreo base = EstadoRastreo.builder().id(1L).activo(true).ordenTracking(1).tipoFlujo(TipoFlujoEstado.NORMAL).build();
        EstadoRastreo alterno = EstadoRastreo.builder().id(2L).activo(true).ordenTracking(2).tipoFlujo(TipoFlujoEstado.ALTERNO).build();
        when(estadoRastreoRepository.findByActivoTrueOrderByOrdenTrackingAscIdAsc())
                .thenReturn(List.of(base, alterno));

        assertThrows(BadRequestException.class, () -> estadoRastreoService.reorderTracking(List.of(1L), List.of()));
    }
}
