package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.entity.ParametroSistema;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.repository.EstadoRastreoRepository;
import com.ecubox.ecubox_backend.repository.ParametroSistemaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ParametroSistemaServiceEstadosManualesTest {

    @Mock private ParametroSistemaRepository parametroRepository;
    @Mock private EstadoRastreoRepository estadoRepository;

    private ParametroSistemaService service;

    @BeforeEach
    void setUp() {
        service = new ParametroSistemaService(parametroRepository, estadoRepository);
    }

    @Test
    void estadosAutomaticosIncluyenDetonantesPeroNoMarcadoresDeTracking() {
        Map<String, String> values = Map.ofEntries(
                Map.entry(ParametroSistemaService.CLAVE_ESTADO_RASTREO_REGISTRO_PAQUETE, "1"),
                Map.entry(ParametroSistemaService.CLAVE_ESTADO_RASTREO_EN_LOTE_RECEPCION, "2"),
                Map.entry(ParametroSistemaService.CLAVE_ESTADO_RASTREO_ASOCIAR_ENVIO_CONSOLIDADO, "3"),
                Map.entry(ParametroSistemaService.CLAVE_ESTADO_RASTREO_ASOCIAR_GUIA_MASTER, "4"),
                Map.entry(ParametroSistemaService.CLAVE_ESTADO_RASTREO_EN_DESPACHO, "5"),
                Map.entry(ParametroSistemaService.CLAVE_ESTADO_RASTREO_EN_TRANSITO, "6"),
                Map.entry(ParametroSistemaService.CLAVE_ESTADO_RASTREO_ENVIADO_DESDE_USA, "7"),
                Map.entry(ParametroSistemaService.CLAVE_ESTADO_RASTREO_ARRIBADO_EC, "8"),
                Map.entry(ParametroSistemaService.CLAVE_ESTADO_RASTREO_ENTREGA_CONFIRMADA_CLIENTE, "9"),
                Map.entry(ParametroSistemaService.CLAVE_ESTADO_RASTREO_AVISO_CONFIRMACION_ENTREGA, "10"),
                Map.entry(ParametroSistemaService.CLAVE_ESTADO_RASTREO_INICIO_CUENTA_REGRESIVA, "11"),
                Map.entry(ParametroSistemaService.CLAVE_ESTADO_RASTREO_FIN_CUENTA_REGRESIVA, "12"));
        when(parametroRepository.findById(anyString())).thenAnswer(invocation -> {
            String key = invocation.getArgument(0);
            String value = values.get(key);
            return value == null
                    ? Optional.empty()
                    : Optional.of(ParametroSistema.builder().clave(key).valor(value).build());
        });

        Set<Long> reservados = service.getIdsEstadosRastreoGestionadosAutomaticamente();

        assertEquals(Set.of(1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L, 9L), reservados);
        assertThrows(BadRequestException.class,
                () -> service.validarEstadoRastreoAplicableManualmente(6L));
        assertDoesNotThrow(() -> service.validarEstadoRastreoAplicableManualmente(10L));
        assertDoesNotThrow(() -> service.validarEstadoRastreoAplicableManualmente(11L));
    }
}
