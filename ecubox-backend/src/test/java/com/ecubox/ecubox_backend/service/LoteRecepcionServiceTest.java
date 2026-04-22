package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.LoteRecepcionCreateRequest;
import com.ecubox.ecubox_backend.dto.LoteRecepcionDTO;
import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import com.ecubox.ecubox_backend.entity.LoteRecepcion;
import com.ecubox.ecubox_backend.entity.LoteRecepcionGuia;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado;
import com.ecubox.ecubox_backend.repository.EnvioConsolidadoRepository;
import com.ecubox.ecubox_backend.repository.LoteRecepcionGuiaRepository;
import com.ecubox.ecubox_backend.repository.LoteRecepcionRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests del flujo de recepcion centrados en la regla de negocio:
 * "Un envio consolidado puede recibirse fisicamente aunque ya este cerrado
 * y/o pagado (liquidado), porque el flujo fisico USA -> Ecuador es ortogonal
 * al flujo administrativo de cierre/pago".
 *
 * <p>Tambien valida que un mismo envio no se pueda registrar dos veces en
 * lotes distintos.
 */
@ExtendWith(MockitoExtension.class)
class LoteRecepcionServiceTest {

    @Mock private LoteRecepcionRepository loteRecepcionRepository;
    @Mock private LoteRecepcionGuiaRepository loteRecepcionGuiaRepository;
    @Mock private PaqueteRepository paqueteRepository;
    @Mock private PaqueteService paqueteService;
    @Mock private CurrentUserService currentUserService;
    @Mock private EnvioConsolidadoRepository envioConsolidadoRepository;

    private LoteRecepcionService service;

    @BeforeEach
    public void setUp() {
        service = new LoteRecepcionService(
                loteRecepcionRepository,
                loteRecepcionGuiaRepository,
                paqueteRepository,
                paqueteService,
                currentUserService,
                envioConsolidadoRepository);
        lenient().when(loteRecepcionRepository.save(any(LoteRecepcion.class)))
                .thenAnswer(inv -> {
                    LoteRecepcion l = inv.getArgument(0);
                    if (l.getId() == null) l.setId(1L);
                    return l;
                });
        lenient().when(currentUserService.getCurrentUsuario())
                .thenReturn(Usuario.builder().id(99L).username("operario").build());
    }

    private EnvioConsolidado envio(long id, String codigo, boolean cerrado, EstadoPagoConsolidado pago) {
        return EnvioConsolidado.builder()
                .id(id)
                .codigo(codigo)
                .fechaCerrado(cerrado ? LocalDateTime.now().minusDays(2) : null)
                .estadoPago(pago)
                .build();
    }

    @Test
    void create_admiteEnvioCerradoYPagado_yMarcaPaquetesEnLoteRecepcion() {
        EnvioConsolidado e = envio(10L, "ENV-1", true, EstadoPagoConsolidado.PAGADO);
        Paquete p = Paquete.builder().id(100L).numeroGuia("ABC 1/1").envioConsolidado(e).build();
        when(envioConsolidadoRepository.findByCodigoIgnoreCase("ENV-1"))
                .thenReturn(Optional.of(e));
        when(paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(10L))
                .thenReturn(List.of(p));
        when(loteRecepcionGuiaRepository.existsByNumeroGuiaEnvioIgnoreCase("ENV-1"))
                .thenReturn(false);

        LoteRecepcionDTO dto = service.create(LoteRecepcionCreateRequest.builder()
                .numeroGuiasEnvio(List.of("ENV-1"))
                .build());

        assertNotNull(dto);
        assertEquals(List.of("ENV-1"), dto.getNumeroGuiasEnvio(),
                "el envio cerrado y pagado debe registrarse igual en el lote");
        verify(paqueteService).aplicarEstadoEnLoteRecepcion(eq(List.of(100L)), any());
    }

    @Test
    void create_omiteEnvioYaPresenteEnOtroLote() {
        EnvioConsolidado e = envio(10L, "ENV-DUP", false, EstadoPagoConsolidado.NO_PAGADO);
        when(envioConsolidadoRepository.findByCodigoIgnoreCase("ENV-DUP"))
                .thenReturn(Optional.of(e));
        when(loteRecepcionGuiaRepository.existsByNumeroGuiaEnvioIgnoreCase("ENV-DUP"))
                .thenReturn(true);

        LoteRecepcionDTO dto = service.create(LoteRecepcionCreateRequest.builder()
                .numeroGuiasEnvio(List.of("ENV-DUP"))
                .build());

        assertTrue(dto.getNumeroGuiasEnvio() == null || dto.getNumeroGuiasEnvio().isEmpty(),
                "no debe registrarse un envio que ya esta en otro lote");
        verify(loteRecepcionGuiaRepository, never()).save(any());
        verify(paqueteService, never()).aplicarEstadoEnLoteRecepcion(anyList(), any());
    }

    @Test
    void agregarGuias_admiteEnvioCerradoYPagado_yOmiteDuplicados() {
        LoteRecepcion lote = LoteRecepcion.builder().id(7L).guias(new ArrayList<>(List.of(
                LoteRecepcionGuia.builder().numeroGuiaEnvio("YA-EN-LOTE").build()
        ))).build();
        when(loteRecepcionRepository.findByIdWithGuias(7L)).thenReturn(Optional.of(lote));
        when(loteRecepcionRepository.findByIdWithGuiasAndOperario(7L)).thenReturn(Optional.of(lote));

        EnvioConsolidado pagado = envio(20L, "ENV-PAGADO", true, EstadoPagoConsolidado.PAGADO);
        Paquete p = Paquete.builder().id(200L).numeroGuia("X 1/1").envioConsolidado(pagado).build();
        when(envioConsolidadoRepository.findByCodigoIgnoreCase("ENV-PAGADO"))
                .thenReturn(Optional.of(pagado));
        when(paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(20L))
                .thenReturn(List.of(p));
        when(loteRecepcionGuiaRepository.existsByNumeroGuiaEnvioIgnoreCase("ENV-PAGADO"))
                .thenReturn(false);

        EnvioConsolidado yaEnOtro = envio(21L, "ENV-OTRO", false, EstadoPagoConsolidado.NO_PAGADO);
        when(envioConsolidadoRepository.findByCodigoIgnoreCase("ENV-OTRO"))
                .thenReturn(Optional.of(yaEnOtro));
        when(loteRecepcionGuiaRepository.existsByNumeroGuiaEnvioIgnoreCase("ENV-OTRO"))
                .thenReturn(true);
        // El service resuelve el codigo canonico antes de validar duplicados
        // dentro del lote, por eso "YA-EN-LOTE" tambien necesita un stub.
        EnvioConsolidado yaEnEsteLote = envio(22L, "YA-EN-LOTE", false, EstadoPagoConsolidado.NO_PAGADO);
        when(envioConsolidadoRepository.findByCodigoIgnoreCase("YA-EN-LOTE"))
                .thenReturn(Optional.of(yaEnEsteLote));

        service.agregarGuias(7L, List.of("ENV-PAGADO", "YA-EN-LOTE", "ENV-OTRO"));

        verify(loteRecepcionGuiaRepository, times(1)).save(any(LoteRecepcionGuia.class));
        verify(paqueteService).aplicarEstadoEnLoteRecepcion(eq(List.of(200L)), any());
    }
}
