package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.LoteRecepcionCreateRequest;
import com.ecubox.ecubox_backend.dto.LoteRecepcionDTO;
import com.ecubox.ecubox_backend.dto.LoteRecepcionResumenDTO;
import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import com.ecubox.ecubox_backend.entity.LoteRecepcion;
import com.ecubox.ecubox_backend.entity.LoteRecepcionGuia;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.enums.EstadoEnvioConsolidadoOperativo;
import com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado;
import com.ecubox.ecubox_backend.exception.BadRequestException;
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
import static org.junit.jupiter.api.Assertions.assertThrows;
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
    @Mock private GuiaMasterService guiaMasterService;

    private LoteRecepcionService service;

    @BeforeEach
    public void setUp() {
        service = new LoteRecepcionService(
                loteRecepcionRepository,
                loteRecepcionGuiaRepository,
                paqueteRepository,
                paqueteService,
                currentUserService,
                envioConsolidadoRepository,
                guiaMasterService);
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
        // Por defecto, los envíos de prueba se construyen ya ARRIBADO_ECUADOR
        // (estado anterior requerido para recibirse en bodega).
        return envio(id, codigo, cerrado, pago, EstadoEnvioConsolidadoOperativo.ARRIBADO_ECUADOR);
    }

    private EnvioConsolidado envio(long id, String codigo, boolean cerrado,
                                   EstadoPagoConsolidado pago,
                                   EstadoEnvioConsolidadoOperativo estadoOperativo) {
        return EnvioConsolidado.builder()
                .id(id)
                .codigo(codigo)
                .fechaCerrado(cerrado ? LocalDateTime.now().minusDays(2) : null)
                .estadoPago(pago)
                .estadoOperativo(estadoOperativo)
                .build();
    }

    @Test
    void resumen_agregaKpisYOperarios() {
        when(loteRecepcionRepository.count()).thenReturn(7L);
        when(loteRecepcionRepository.countPaquetesRecibidos()).thenReturn(42L);
        when(loteRecepcionRepository.countGuiasUnicas()).thenReturn(5L);
        when(loteRecepcionRepository.countByFechaRecepcionEntre(any(), any())).thenReturn(2L);
        when(loteRecepcionRepository.findDistinctOperarios()).thenReturn(List.of("ana", "luis"));

        LoteRecepcionResumenDTO resumen = service.resumen();

        assertEquals(7L, resumen.getTotal());
        assertEquals(42L, resumen.getPaquetes());
        assertEquals(5L, resumen.getGuiasUnicas());
        assertEquals(2L, resumen.getHoy());
        assertEquals(List.of("ana", "luis"), resumen.getOperarios());
    }

    @Test
    void create_admiteConsolidadoArribadoEcuador_loDejaRecibidoEnBodega() {
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
        assertEquals(List.of("ENV-1"), dto.getNumeroGuiasEnvio());
        // El consolidado admitido queda explícitamente en RECIBIDO_EN_BODEGA.
        assertEquals(EstadoEnvioConsolidadoOperativo.RECIBIDO_EN_BODEGA, e.getEstadoOperativo());
        verify(envioConsolidadoRepository).save(e);
        verify(paqueteService).aplicarEstadoEnLoteRecepcion(eq(List.of(100L)), any());
    }

    @Test
    void create_exponeResumenDeRecepcion_avanzadosYOmitidos() {
        EnvioConsolidado e = envio(10L, "ENV-2", true, EstadoPagoConsolidado.NO_PAGADO);
        Paquete p1 = Paquete.builder().id(100L).numeroGuia("ABC 1/2").envioConsolidado(e).build();
        Paquete p2 = Paquete.builder().id(101L).numeroGuia("ABC 2/2").envioConsolidado(e).build();
        when(envioConsolidadoRepository.findByCodigoIgnoreCase("ENV-2"))
                .thenReturn(Optional.of(e));
        when(paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(10L))
                .thenReturn(List.of(p1, p2));
        when(loteRecepcionGuiaRepository.existsByNumeroGuiaEnvioIgnoreCase("ENV-2"))
                .thenReturn(false);
        // Uno avanza a bodega, el otro ya estaba en un estado posterior (no se degrada).
        when(paqueteService.aplicarEstadoEnLoteRecepcion(anyList(), any()))
                .thenReturn(new PaqueteService.ResultadoEstadoPorPunto(2, 1, 0, 1, 0, 0));

        LoteRecepcionDTO dto = service.create(LoteRecepcionCreateRequest.builder()
                .numeroGuiasEnvio(List.of("ENV-2"))
                .build());

        assertNotNull(dto.getResumenRecepcion());
        assertEquals(2, dto.getResumenRecepcion().getTotal());
        assertEquals(1, dto.getResumenRecepcion().getAvanzados());
        assertEquals(1, dto.getResumenRecepcion().getOmitidosPosteriores());
    }

    @Test
    void create_rechazaConsolidadoNoArribado_yNoCambiaPaquetes() {
        EnvioConsolidado e = envio(10L, "ENV-USA", true, EstadoPagoConsolidado.NO_PAGADO,
                EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA);
        Paquete p = Paquete.builder().id(100L).numeroGuia("ABC 1/1").envioConsolidado(e).build();
        when(envioConsolidadoRepository.findByCodigoIgnoreCase("ENV-USA"))
                .thenReturn(Optional.of(e));
        when(paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(10L))
                .thenReturn(List.of(p));
        when(loteRecepcionGuiaRepository.existsByNumeroGuiaEnvioIgnoreCase("ENV-USA"))
                .thenReturn(false);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.create(LoteRecepcionCreateRequest.builder()
                        .numeroGuiasEnvio(List.of("ENV-USA"))
                        .build()));
        assertTrue(ex.getMessage().contains("Arribado a Ecuador"));
        assertEquals(EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA, e.getEstadoOperativo());
        verify(paqueteService, never()).aplicarEstadoEnLoteRecepcion(anyList(), any());
        verify(loteRecepcionGuiaRepository, never()).save(any());
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

    @Test
    void delete_recomputaGuiasMasterDePaquetesAfectados() {
        EnvioConsolidado e = envio(10L, "ENV-DEL", false, EstadoPagoConsolidado.NO_PAGADO);
        Paquete p = Paquete.builder().id(300L).numeroGuia("X 1/1").envioConsolidado(e).build();
        LoteRecepcion lote = LoteRecepcion.builder().id(5L)
                .guias(new ArrayList<>(List.of(
                        LoteRecepcionGuia.builder().numeroGuiaEnvio("ENV-DEL").build()
                )))
                .build();
        when(loteRecepcionRepository.findByIdWithGuias(5L)).thenReturn(Optional.of(lote));
        when(envioConsolidadoRepository.findByCodigoIgnoreCase("ENV-DEL")).thenReturn(Optional.of(e));
        when(paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(10L)).thenReturn(List.of(p));
        when(paqueteService.revertirEstadoSiUltimoEventoCoincide(anyList(), eq("LOTE_RECEPCION_AUTO")))
                .thenReturn(1);
        when(paqueteRepository.findGuiaMasterIdsByPaqueteIds(anyList())).thenReturn(List.of(77L));

        int n = service.delete(5L);

        assertEquals(1, n);
        verify(loteRecepcionRepository).delete(lote);
        verify(paqueteRepository).findGuiaMasterIdsByPaqueteIds(anyList());
        verify(guiaMasterService).recomputarEstado(77L);
    }
}
