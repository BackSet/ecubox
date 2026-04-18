package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.dto.GuiaMasterUpdateRequest;
import com.ecubox.ecubox_backend.dto.MiInicioDashboardDTO;
import com.ecubox.ecubox_backend.entity.DestinatarioFinal;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.GuiaMaster;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.PaqueteEstadoEvento;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.enums.TrackingEventType;
import com.ecubox.ecubox_backend.enums.EstadoGuiaMaster;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ConflictException;
import com.ecubox.ecubox_backend.repository.DestinatarioFinalRepository;
import com.ecubox.ecubox_backend.repository.GuiaMasterRepository;
import com.ecubox.ecubox_backend.repository.OutboxEventRepository;
import com.ecubox.ecubox_backend.repository.PaqueteEstadoEventoRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GuiaMasterServiceTest {

    @Mock
    private GuiaMasterRepository guiaMasterRepository;
    @Mock
    private PaqueteRepository paqueteRepository;
    @Mock
    private ParametroSistemaService parametroSistemaService;
    @Mock
    private EstadoRastreoService estadoRastreoService;
    @Mock
    private OutboxEventRepository outboxEventRepository;
    @Mock
    private DestinatarioFinalRepository destinatarioFinalRepository;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private PaqueteEstadoEventoRepository paqueteEstadoEventoRepository;

    private GuiaMasterService service;

    private EstadoRastreo registrado;
    private EstadoRastreo enLote;
    private EstadoRastreo enDespacho;

    @BeforeEach
    void setUp() {
        service = new GuiaMasterService(guiaMasterRepository, paqueteRepository, parametroSistemaService,
                estadoRastreoService, outboxEventRepository, destinatarioFinalRepository, usuarioRepository,
                paqueteEstadoEventoRepository);
        registrado = EstadoRastreo.builder().id(1L).codigo("REGISTRADO").orden(1).build();
        enLote = EstadoRastreo.builder().id(2L).codigo("EN_LOTE").orden(2).build();
        enDespacho = EstadoRastreo.builder().id(3L).codigo("EN_DESPACHO").orden(3).build();
    }

    private void stubConfigEstados() {
        lenient().when(parametroSistemaService.getEstadosRastreoPorPunto()).thenReturn(
                EstadosRastreoPorPuntoDTO.builder()
                        .estadoRastreoRegistroPaqueteId(1L)
                        .estadoRastreoEnLoteRecepcionId(2L)
                        .estadoRastreoEnDespachoId(3L)
                        .build()
        );
        lenient().when(estadoRastreoService.findEntityById(2L)).thenReturn(enLote);
        lenient().when(estadoRastreoService.findEntityById(3L)).thenReturn(enDespacho);
        lenient().when(estadoRastreoService.getOrdenById(2L)).thenReturn(enLote.getOrden());
        lenient().when(estadoRastreoService.getOrdenById(3L)).thenReturn(enDespacho.getOrden());
    }

    @Test
    void create_guardaGuiaMasterConEstadoIncompleta() {
        when(guiaMasterRepository.existsByTrackingBaseIgnoreCase("184718429")).thenReturn(false);
        when(guiaMasterRepository.save(any(GuiaMaster.class))).thenAnswer(inv -> inv.getArgument(0));

        GuiaMaster gm = service.create("184718429", 3, null);

        ArgumentCaptor<GuiaMaster> captor = ArgumentCaptor.forClass(GuiaMaster.class);
        verify(guiaMasterRepository).save(captor.capture());
        GuiaMaster saved = captor.getValue();
        assertEquals("184718429", saved.getTrackingBase());
        assertEquals(3, saved.getTotalPiezasEsperadas());
        assertEquals(EstadoGuiaMaster.INCOMPLETA, saved.getEstadoGlobal());
        assertSame(saved, gm);
    }

    @Test
    void create_fallaSiTrackingBaseDuplicado() {
        when(guiaMasterRepository.existsByTrackingBaseIgnoreCase("DUP")).thenReturn(true);
        assertThrows(ConflictException.class, () -> service.create("DUP", 2, null));
    }

    @Test
    void create_fallaSiTotalInvalido() {
        assertThrows(BadRequestException.class, () -> service.create("X", 0, null));
        assertThrows(BadRequestException.class, () -> service.create(" ", 2, null));
    }

    @Test
    void validarYAsignarPieza_asignaSiguienteCuandoPiezaNumeroEsNull() {
        GuiaMaster gm = GuiaMaster.builder().id(10L).totalPiezasEsperadas(3).build();
        Paquete p1 = Paquete.builder().id(1L).piezaNumero(1).build();
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(10L))
                .thenReturn(List.of(p1));

        int[] result = service.validarYAsignarPieza(gm, null);
        assertEquals(2, result[0]);
        assertEquals(3, result[1]);
    }

    @Test
    void validarYAsignarPieza_fallaSiNumeroExcedeTotal() {
        GuiaMaster gm = GuiaMaster.builder().id(10L).totalPiezasEsperadas(2).build();
        assertThrows(BadRequestException.class, () -> service.validarYAsignarPieza(gm, 5));
    }

    @Test
    void validarYAsignarPieza_fallaSiPiezaYaExiste() {
        GuiaMaster gm = GuiaMaster.builder().id(10L).totalPiezasEsperadas(3).build();
        when(paqueteRepository.existsByGuiaMasterIdAndPiezaNumero(10L, 2)).thenReturn(true);
        assertThrows(ConflictException.class, () -> service.validarYAsignarPieza(gm, 2));
    }

    @Test
    void calcularEstado_incompletaCuandoNoHayPiezasRegistradas() {
        stubConfigEstados();
        GuiaMaster gm = GuiaMaster.builder().id(1L).totalPiezasEsperadas(3).estadoGlobal(EstadoGuiaMaster.INCOMPLETA).build();
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L)).thenReturn(List.of());

        assertEquals(EstadoGuiaMaster.INCOMPLETA, service.calcularEstado(gm));
    }

    @Test
    void calcularEstado_parcialRecibidaCuandoSoloAlgunasRecibidas() {
        stubConfigEstados();
        GuiaMaster gm = GuiaMaster.builder().id(1L).totalPiezasEsperadas(3).estadoGlobal(EstadoGuiaMaster.INCOMPLETA).build();
        Paquete pRegistrada = Paquete.builder().id(1L).estadoRastreo(registrado).build();
        Paquete pRecibida = Paquete.builder().id(2L).estadoRastreo(enLote).build();
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L))
                .thenReturn(List.of(pRegistrada, pRecibida));

        assertEquals(EstadoGuiaMaster.PARCIAL_RECIBIDA, service.calcularEstado(gm));
    }

    @Test
    void calcularEstado_completaRecibidaCuandoTodasRegistradasYRecibidas() {
        stubConfigEstados();
        GuiaMaster gm = GuiaMaster.builder().id(1L).totalPiezasEsperadas(2).estadoGlobal(EstadoGuiaMaster.INCOMPLETA).build();
        Paquete p1 = Paquete.builder().id(1L).estadoRastreo(enLote).build();
        Paquete p2 = Paquete.builder().id(2L).estadoRastreo(enLote).build();
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L))
                .thenReturn(List.of(p1, p2));

        assertEquals(EstadoGuiaMaster.COMPLETA_RECIBIDA, service.calcularEstado(gm));
    }

    @Test
    void calcularEstado_parcialDespachadaCuandoAlMenosUnaDespachada() {
        stubConfigEstados();
        GuiaMaster gm = GuiaMaster.builder().id(1L).totalPiezasEsperadas(3).estadoGlobal(EstadoGuiaMaster.INCOMPLETA).build();
        Paquete p1 = Paquete.builder().id(1L).estadoRastreo(enDespacho).build();
        Paquete p2 = Paquete.builder().id(2L).estadoRastreo(enLote).build();
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L))
                .thenReturn(List.of(p1, p2));

        assertEquals(EstadoGuiaMaster.PARCIAL_DESPACHADA, service.calcularEstado(gm));
    }

    @Test
    void calcularEstado_cerradaCuandoTodasDespachadas() {
        stubConfigEstados();
        GuiaMaster gm = GuiaMaster.builder().id(1L).totalPiezasEsperadas(2).estadoGlobal(EstadoGuiaMaster.PARCIAL_DESPACHADA).build();
        Paquete p1 = Paquete.builder().id(1L).estadoRastreo(enDespacho).build();
        Paquete p2 = Paquete.builder().id(2L).estadoRastreo(enDespacho).build();
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L))
                .thenReturn(List.of(p1, p2));

        assertEquals(EstadoGuiaMaster.CERRADA, service.calcularEstado(gm));
    }

    @Test
    void calcularEstado_respetaCerradaConFaltante() {
        GuiaMaster gm = GuiaMaster.builder().id(1L).totalPiezasEsperadas(3).estadoGlobal(EstadoGuiaMaster.CERRADA_CON_FALTANTE).build();
        assertEquals(EstadoGuiaMaster.CERRADA_CON_FALTANTE, service.calcularEstado(gm));
    }

    @Test
    void recomputarEstado_actualizaSoloSiCambia() {
        stubConfigEstados();
        GuiaMaster gm = GuiaMaster.builder().id(1L).totalPiezasEsperadas(1).estadoGlobal(EstadoGuiaMaster.INCOMPLETA).build();
        Paquete p1 = Paquete.builder().id(1L).estadoRastreo(enDespacho).build();
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(gm));
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L)).thenReturn(List.of(p1));

        service.recomputarEstado(1L);

        verify(guiaMasterRepository).save(gm);
        assertEquals(EstadoGuiaMaster.CERRADA, gm.getEstadoGlobal());
    }

    @Test
    void cerrarConFaltante_fallaSiNoHayDespachadas() {
        stubConfigEstados();
        GuiaMaster gm = GuiaMaster.builder().id(1L).totalPiezasEsperadas(3).estadoGlobal(EstadoGuiaMaster.PARCIAL_RECIBIDA).build();
        Paquete p1 = Paquete.builder().id(1L).estadoRastreo(enLote).build();
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(gm));
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L)).thenReturn(List.of(p1));

        assertThrows(BadRequestException.class, () -> service.cerrarConFaltante(1L, "motivo"));
    }

    @Test
    void componerNumeroGuia_concatenaTrackingBaseConPiezaYTotal() {
        GuiaMaster gm = GuiaMaster.builder().trackingBase("1Z52159R0379385035").totalPiezasEsperadas(3).build();
        assertEquals("1Z52159R0379385035 1/3", GuiaMasterService.componerNumeroGuia(gm, 1));
        assertEquals("1Z52159R0379385035 2/3", GuiaMasterService.componerNumeroGuia(gm, 2));
        assertEquals("1Z52159R0379385035 3/3", GuiaMasterService.componerNumeroGuia(gm, 3));
    }

    @Test
    void componerNumeroGuia_devuelveNullSiFaltaInformacion() {
        assertEquals(null, GuiaMasterService.componerNumeroGuia(null, 1));
        GuiaMaster gm = GuiaMaster.builder().trackingBase("ABC").totalPiezasEsperadas(2).build();
        assertEquals(null, GuiaMasterService.componerNumeroGuia(gm, null));
        GuiaMaster gmSinBase = GuiaMaster.builder().totalPiezasEsperadas(2).build();
        assertEquals(null, GuiaMasterService.componerNumeroGuia(gmSinBase, 1));
    }

    @Test
    void createForCliente_guardaConClienteYDestinatarioPropio() {
        Usuario cliente = Usuario.builder().id(7L).username("ana").build();
        DestinatarioFinal dest = DestinatarioFinal.builder().id(20L).nombre("Maria").usuario(cliente).build();
        when(guiaMasterRepository.existsByTrackingBaseIgnoreCase("TRK-1")).thenReturn(false);
        when(destinatarioFinalRepository.findById(20L)).thenReturn(Optional.of(dest));
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(cliente));
        when(guiaMasterRepository.save(any(GuiaMaster.class))).thenAnswer(inv -> inv.getArgument(0));

        GuiaMaster gm = service.createForCliente("TRK-1", 20L, 7L);

        ArgumentCaptor<GuiaMaster> captor = ArgumentCaptor.forClass(GuiaMaster.class);
        verify(guiaMasterRepository).save(captor.capture());
        GuiaMaster saved = captor.getValue();
        assertEquals("TRK-1", saved.getTrackingBase());
        assertEquals(EstadoGuiaMaster.INCOMPLETA, saved.getEstadoGlobal());
        assertSame(dest, saved.getDestinatarioFinal());
        assertSame(cliente, saved.getClienteUsuario());
        assertEquals(null, saved.getTotalPiezasEsperadas());
        assertSame(saved, gm);
    }

    @Test
    void createForCliente_fallaSiDestinatarioEsAjeno() {
        Usuario otro = Usuario.builder().id(99L).username("otro").build();
        DestinatarioFinal dest = DestinatarioFinal.builder().id(20L).nombre("Maria").usuario(otro).build();
        when(guiaMasterRepository.existsByTrackingBaseIgnoreCase("TRK-1")).thenReturn(false);
        when(destinatarioFinalRepository.findById(20L)).thenReturn(Optional.of(dest));

        assertThrows(BadRequestException.class, () -> service.createForCliente("TRK-1", 20L, 7L));
    }

    @Test
    void createForCliente_fallaSiTrackingDuplicado() {
        when(guiaMasterRepository.existsByTrackingBaseIgnoreCase("DUP")).thenReturn(true);
        assertThrows(ConflictException.class, () -> service.createForCliente("DUP", 20L, 7L));
    }

    @Test
    void update_actualizaTotalYDestinatario() {
        Usuario cliente = Usuario.builder().id(5L).username("cli").build();
        DestinatarioFinal dest = DestinatarioFinal.builder().id(30L).nombre("Pedro").usuario(cliente).build();
        GuiaMaster gm = GuiaMaster.builder().id(1L).trackingBase("X").estadoGlobal(EstadoGuiaMaster.INCOMPLETA).build();
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(gm));
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L)).thenReturn(List.of());
        when(destinatarioFinalRepository.findById(30L)).thenReturn(Optional.of(dest));
        when(guiaMasterRepository.save(any(GuiaMaster.class))).thenAnswer(inv -> inv.getArgument(0));

        GuiaMasterUpdateRequest req = GuiaMasterUpdateRequest.builder()
                .totalPiezasEsperadas(4)
                .destinatarioFinalId(30L)
                .build();
        service.update(1L, req);

        assertEquals(4, gm.getTotalPiezasEsperadas());
        assertSame(dest, gm.getDestinatarioFinal());
        assertSame(cliente, gm.getClienteUsuario());
    }

    @Test
    void update_fallaSiTotalMenorQuePiezasRegistradas() {
        GuiaMaster gm = GuiaMaster.builder().id(1L).trackingBase("X").estadoGlobal(EstadoGuiaMaster.INCOMPLETA).build();
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(gm));
        Paquete p1 = Paquete.builder().id(1L).build();
        Paquete p2 = Paquete.builder().id(2L).build();
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L)).thenReturn(List.of(p1, p2));

        GuiaMasterUpdateRequest req = GuiaMasterUpdateRequest.builder().totalPiezasEsperadas(1).build();
        assertThrows(BadRequestException.class, () -> service.update(1L, req));
    }

    @Test
    void dashboardForCliente_conteosPorEstadoYTotales() {
        stubConfigEstados();
        Long clienteId = 7L;
        // 3 guías: una INCOMPLETA sin total, una PARCIAL_RECIBIDA, una CERRADA
        GuiaMaster g1 = GuiaMaster.builder()
                .id(1L).trackingBase("A").totalPiezasEsperadas(null)
                .estadoGlobal(EstadoGuiaMaster.INCOMPLETA)
                .createdAt(LocalDateTime.now().minusDays(1)).build();
        GuiaMaster g2 = GuiaMaster.builder()
                .id(2L).trackingBase("B").totalPiezasEsperadas(3)
                .estadoGlobal(EstadoGuiaMaster.PARCIAL_RECIBIDA)
                .createdAt(LocalDateTime.now().minusDays(3))
                .fechaPrimeraRecepcion(LocalDateTime.now().minusHours(5)).build();
        GuiaMaster g3 = GuiaMaster.builder()
                .id(3L).trackingBase("C").totalPiezasEsperadas(2)
                .estadoGlobal(EstadoGuiaMaster.CERRADA)
                .createdAt(LocalDateTime.now().minusDays(2)).build();
        when(guiaMasterRepository.findByClienteUsuarioId(clienteId)).thenReturn(List.of(g1, g2, g3));
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L)).thenReturn(List.of());
        Paquete p2a = Paquete.builder().id(20L).estadoRastreo(enLote).build();
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(2L)).thenReturn(List.of(p2a));
        Paquete p3a = Paquete.builder().id(30L).estadoRastreo(enDespacho).build();
        Paquete p3b = Paquete.builder().id(31L).estadoRastreo(enDespacho).build();
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(3L)).thenReturn(List.of(p3a, p3b));
        when(parametroSistemaService.getGuiaMasterMinPiezasDespachoParcial()).thenReturn(1);
        when(destinatarioFinalRepository.countByUsuarioId(clienteId)).thenReturn(4L);

        MiInicioDashboardDTO dto = service.dashboardForCliente(clienteId);

        assertEquals(3L, dto.getTotalGuias());
        assertEquals(2L, dto.getTotalGuiasActivas());
        assertEquals(1L, dto.getTotalGuiasCerradas());
        assertEquals(1L, dto.getTotalGuiasSinTotalDefinido());
        assertEquals(4L, dto.getTotalDestinatarios());
        assertEquals(1L, dto.getConteosPorEstado().get("INCOMPLETA"));
        assertEquals(1L, dto.getConteosPorEstado().get("PARCIAL_RECIBIDA"));
        assertEquals(1L, dto.getConteosPorEstado().get("CERRADA"));
        // piezas en transito = solo g2 contribuye (1 registrada - 0 despachadas)
        assertEquals(1L, dto.getPiezasEnTransito());
        // primera recientes ordenadas por createdAt desc
        assertEquals("A", dto.getGuiasRecientes().get(0).getTrackingBase());
        // proximas a despacharse: g2 (PARCIAL_RECIBIDA con lista=true por minPiezas=1)
        assertEquals(1, dto.getGuiasProximasACerrar().size());
        assertEquals("B", dto.getGuiasProximasACerrar().get(0).getTrackingBase());
    }

    @Test
    void dashboardForCliente_sinGuiasDevuelveCerosYConteosInicializados() {
        Long clienteId = 9L;
        when(guiaMasterRepository.findByClienteUsuarioId(clienteId)).thenReturn(List.of());
        when(destinatarioFinalRepository.countByUsuarioId(clienteId)).thenReturn(0L);

        MiInicioDashboardDTO dto = service.dashboardForCliente(clienteId);

        assertEquals(0L, dto.getTotalGuias());
        assertEquals(0L, dto.getTotalGuiasActivas());
        assertEquals(0L, dto.getTotalGuiasCerradas());
        assertEquals(0L, dto.getTotalGuiasSinTotalDefinido());
        assertEquals(0L, dto.getTotalDestinatarios());
        assertEquals(0L, dto.getPiezasEnTransito());
        // todos los estados inicializados a 0
        for (EstadoGuiaMaster e : EstadoGuiaMaster.values()) {
            assertEquals(0L, dto.getConteosPorEstado().get(e.name()));
        }
        assertEquals(0, dto.getGuiasRecientes().size());
        assertEquals(0, dto.getGuiasProximasACerrar().size());
    }

    @Test
    void cerrarConFaltante_marcaEstadoYGuardaMotivo() {
        stubConfigEstados();
        GuiaMaster gm = GuiaMaster.builder().id(1L).totalPiezasEsperadas(3).estadoGlobal(EstadoGuiaMaster.PARCIAL_DESPACHADA).build();
        Paquete p1 = Paquete.builder().id(1L).estadoRastreo(enDespacho).build();
        Paquete p2 = Paquete.builder().id(2L).estadoRastreo(enLote).build();
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(gm));
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L)).thenReturn(List.of(p1, p2));
        when(guiaMasterRepository.save(any(GuiaMaster.class))).thenAnswer(inv -> inv.getArgument(0));

        GuiaMaster result = service.cerrarConFaltante(1L, "Pieza 3 extraviada");

        assertNotNull(result);
        assertEquals(EstadoGuiaMaster.CERRADA_CON_FALTANTE, result.getEstadoGlobal());
    }

    @Test
    void findByTrackingBaseForTracking_devuelveContadoresYPiezasMapeadas() {
        stubConfigEstados();
        DestinatarioFinal dest = DestinatarioFinal.builder().id(50L).nombre("Maria").build();
        GuiaMaster gm = GuiaMaster.builder()
                .id(99L)
                .trackingBase("TRK-PUB-1")
                .totalPiezasEsperadas(3)
                .estadoGlobal(EstadoGuiaMaster.PARCIAL_DESPACHADA)
                .destinatarioFinal(dest)
                .createdAt(LocalDateTime.now().minusDays(2))
                .fechaPrimeraRecepcion(LocalDateTime.now().minusDays(1))
                .build();
        Paquete p1 = Paquete.builder().id(1L).numeroGuia("TRK-PUB-1 1/3").piezaNumero(1).piezaTotal(3)
                .estadoRastreo(enDespacho).fechaEstadoActualDesde(LocalDateTime.now().minusHours(2)).build();
        Paquete p2 = Paquete.builder().id(2L).numeroGuia("TRK-PUB-1 2/3").piezaNumero(2).piezaTotal(3)
                .estadoRastreo(enLote).fechaEstadoActualDesde(LocalDateTime.now().minusHours(6)).build();
        Paquete p3 = Paquete.builder().id(3L).numeroGuia("TRK-PUB-1 3/3").piezaNumero(3).piezaTotal(3)
                .estadoRastreo(registrado).fechaEstadoActualDesde(LocalDateTime.now().minusHours(8)).build();

        when(guiaMasterRepository.findByTrackingBaseIgnoreCase("TRK-PUB-1")).thenReturn(Optional.of(gm));
        when(paqueteRepository.findByGuiaMasterTrackingBaseIgnoreCase("TRK-PUB-1"))
                .thenReturn(List.of(p1, p2, p3));

        var result = service.findByTrackingBaseForTracking("TRK-PUB-1");

        assertEquals(true, result.isPresent());
        var dto = result.get();
        assertEquals("TRK-PUB-1", dto.getTrackingBase());
        assertEquals(3, dto.getTotalPiezasEsperadas());
        assertEquals(3, dto.getPiezasRegistradas());
        assertEquals(2, dto.getPiezasRecibidas()); // EN_LOTE + EN_DESPACHO
        assertEquals(1, dto.getPiezasDespachadas()); // EN_DESPACHO
        assertEquals(EstadoGuiaMaster.PARCIAL_DESPACHADA, dto.getEstadoGlobal());
        assertEquals("Maria", dto.getDestinatario().getNombre());
        assertEquals(3, dto.getPiezas().size());
        assertEquals("TRK-PUB-1 1/3", dto.getPiezas().get(0).getNumeroGuia());
        assertEquals("EN_DESPACHO", dto.getPiezas().get(0).getEstadoActualCodigo());
        assertNotNull(dto.getUltimaActualizacion());
    }

    @Test
    void findByTrackingBaseForTracking_devuelveEmptySiNoExiste() {
        when(guiaMasterRepository.findByTrackingBaseIgnoreCase("NOPE")).thenReturn(Optional.empty());
        var result = service.findByTrackingBaseForTracking("NOPE");
        assertEquals(true, result.isEmpty());
    }

    @Test
    void findByTrackingBaseForTracking_devuelveEmptySiCodigoVacio() {
        var result = service.findByTrackingBaseForTracking("   ");
        assertEquals(true, result.isEmpty());
    }

    @Test
    void findByTrackingBaseForTracking_pueblaTimelineAgregadoEnOrden() {
        stubConfigEstados();
        EstadoRastreo enLotePub = EstadoRastreo.builder()
                .id(2L).codigo("EN_LOTE").nombre("En lote")
                .orden(2).publicoTracking(true).build();
        EstadoRastreo enDespachoPub = EstadoRastreo.builder()
                .id(3L).codigo("EN_DESPACHO").nombre("En despacho")
                .orden(3).publicoTracking(true).build();
        GuiaMaster gm = GuiaMaster.builder()
                .id(7L).trackingBase("AGG-1").totalPiezasEsperadas(2)
                .estadoGlobal(EstadoGuiaMaster.PARCIAL_DESPACHADA)
                .createdAt(LocalDateTime.now().minusDays(5))
                .build();
        Paquete p1 = Paquete.builder().id(1L).numeroGuia("AGG-1 1/2").piezaNumero(1).piezaTotal(2)
                .estadoRastreo(enDespachoPub).build();
        Paquete p2 = Paquete.builder().id(2L).numeroGuia("AGG-1 2/2").piezaNumero(2).piezaTotal(2)
                .estadoRastreo(enLotePub).build();
        when(guiaMasterRepository.findByTrackingBaseIgnoreCase("AGG-1")).thenReturn(Optional.of(gm));
        when(paqueteRepository.findByGuiaMasterTrackingBaseIgnoreCase("AGG-1"))
                .thenReturn(List.of(p1, p2));

        LocalDateTime t1 = LocalDateTime.now().minusDays(2);
        LocalDateTime t2 = LocalDateTime.now().minusDays(1);
        // estado privado (publicoTracking=false) debe ser filtrado
        EstadoRastreo internoNoPublico = EstadoRastreo.builder()
                .id(99L).codigo("INTERNO").nombre("Interno")
                .publicoTracking(false).build();
        when(paqueteEstadoEventoRepository.findByGuiaMasterIdOrderByOccurredAtAsc(7L))
                .thenReturn(List.of(
                        PaqueteEstadoEvento.builder().id(10L).paquete(p1).estadoDestino(enLotePub)
                                .occurredAt(t1).eventType(TrackingEventType.ESTADO_CAMBIO_MANUAL).build(),
                        PaqueteEstadoEvento.builder().id(11L).paquete(p1).estadoDestino(enDespachoPub)
                                .occurredAt(t2).eventType(TrackingEventType.ESTADO_CAMBIO_MANUAL).build(),
                        PaqueteEstadoEvento.builder().id(12L).paquete(p2).estadoDestino(internoNoPublico)
                                .occurredAt(t2).eventType(TrackingEventType.ESTADO_CAMBIO_MANUAL).build()
                ));

        var result = service.findByTrackingBaseForTracking("AGG-1");

        assertEquals(true, result.isPresent());
        var dto = result.get();
        assertNotNull(dto.getTimeline());
        assertEquals(2, dto.getTimeline().size(), "evento de estado interno debe filtrarse");
        assertEquals("EN_LOTE", dto.getTimeline().get(0).getEstadoCodigo());
        assertEquals(t1, dto.getTimeline().get(0).getOccurredAt());
        assertEquals("EN_DESPACHO", dto.getTimeline().get(1).getEstadoCodigo());
        assertEquals(t2, dto.getTimeline().get(1).getOccurredAt());
        assertEquals("AGG-1 1/2", dto.getTimeline().get(0).getNumeroGuia());
        assertEquals(1, dto.getTimeline().get(0).getPiezaNumero());
    }
}
