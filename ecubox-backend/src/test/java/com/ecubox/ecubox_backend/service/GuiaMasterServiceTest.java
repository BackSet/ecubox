package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.dto.GuiaMasterDTO;
import com.ecubox.ecubox_backend.dto.GuiaMasterUpdateRequest;
import com.ecubox.ecubox_backend.dto.MiInicioDashboardDTO;
import com.ecubox.ecubox_backend.entity.GuiaMasterEstadoHistorial;
import com.ecubox.ecubox_backend.enums.TipoCambioEstadoGuiaMaster;
import com.ecubox.ecubox_backend.entity.Despacho;
import com.ecubox.ecubox_backend.entity.Consignatario;
import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.GuiaMaster;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.PaqueteEstadoEvento;
import com.ecubox.ecubox_backend.entity.Saca;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.enums.TrackingEventType;
import com.ecubox.ecubox_backend.enums.EstadoGuiaMaster;
import com.ecubox.ecubox_backend.enums.TipoCierreGuiaMaster;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ConflictException;
import com.ecubox.ecubox_backend.repository.ConsignatarioRepository;
import com.ecubox.ecubox_backend.repository.GuiaMasterEstadoHistorialRepository;
import com.ecubox.ecubox_backend.repository.GuiaMasterRepository;
import com.ecubox.ecubox_backend.repository.LoteRecepcionGuiaRepository;
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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
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
    private OutboxEventRepository outboxEventRepository;
    @Mock
    private ConsignatarioRepository consignatarioRepository;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private PaqueteEstadoEventoRepository paqueteEstadoEventoRepository;
    @Mock
    private GuiaMasterEstadoHistorialRepository historialRepository;
    @Mock
    private ConsignatarioVersionService consignatarioVersionService;
    @Mock
    private CodigoSecuenciaService codigoSecuenciaService;
    @Mock
    private LoteRecepcionGuiaRepository loteRecepcionGuiaRepository;
    @Mock
    private PaqueteService paqueteService;

    private GuiaMasterService service;

    private EstadoRastreo registrado;
    private EstadoRastreo enLote;
    private EstadoRastreo enDespacho;

    @BeforeEach
    public void setUp() {
        service = new GuiaMasterService(guiaMasterRepository, paqueteRepository, parametroSistemaService,
                outboxEventRepository, consignatarioRepository, usuarioRepository,
                paqueteEstadoEventoRepository, historialRepository, consignatarioVersionService,
                codigoSecuenciaService, loteRecepcionGuiaRepository, paqueteService);
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
    }

    /**
     * Helper para construir una pieza "despachada" (con Saca asignada a un Despacho real).
     * Necesario porque {@code piezaDespachada} ahora exige {@code paquete.saca.despacho != null},
     * no se basa solo en el estado de rastreo.
     */
    private Saca sacaConDespacho() {
        return Saca.builder().id(100L).despacho(Despacho.builder().id(200L).build()).build();
    }

    @Test
    void create_guardaGuiaMasterSinPiezasRegistradas() {
        when(guiaMasterRepository.existsByTrackingBaseIgnoreCase("184718429")).thenReturn(false);
        when(guiaMasterRepository.save(any(GuiaMaster.class))).thenAnswer(inv -> inv.getArgument(0));

        GuiaMaster gm = service.create("184718429", 3, null);

        ArgumentCaptor<GuiaMaster> captor = ArgumentCaptor.forClass(GuiaMaster.class);
        verify(guiaMasterRepository).save(captor.capture());
        GuiaMaster saved = captor.getValue();
        assertEquals("184718429", saved.getTrackingBase());
        assertEquals(3, saved.getTotalPiezasEsperadas());
        assertEquals(EstadoGuiaMaster.SIN_PAQUETES_REGISTRADOS, saved.getEstadoGlobal());
        assertSame(saved, gm);
    }

    @Test
    void create_fallaSiTrackingBaseDuplicado() {
        when(guiaMasterRepository.existsByTrackingBaseIgnoreCase("DUP")).thenReturn(true);
        var ex = assertThrows(ConflictException.class, () -> service.create("DUP", 2, null));
        assertNotNull(ex);
    }

    @Test
    void create_fallaSiTotalInvalido() {
        var ex1 = assertThrows(BadRequestException.class, () -> service.create("X", 0, null));
        var ex2 = assertThrows(BadRequestException.class, () -> service.create(" ", 2, null));
        assertNotNull(ex1);
        assertNotNull(ex2);
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
        var ex = assertThrows(BadRequestException.class, () -> service.validarYAsignarPieza(gm, 5));
        // Mensaje-contrato: incluye la pieza pedida y el rango permitido.
        assertTrue(ex.getMessage().contains("pieza 5"));
        assertTrue(ex.getMessage().contains("entre 1 y 2"));
    }

    @Test
    void validarYAsignarPieza_fallaSiPiezaYaExiste() {
        GuiaMaster gm = GuiaMaster.builder().id(10L).totalPiezasEsperadas(3).build();
        when(paqueteRepository.existsByGuiaMasterIdAndPiezaNumero(10L, 2)).thenReturn(true);
        var ex = assertThrows(ConflictException.class, () -> service.validarYAsignarPieza(gm, 2));
        assertTrue(ex.getMessage().contains("pieza 2/3"));
        assertTrue(ex.getMessage().contains("ya está registrada"));
    }

    @Test
    void validarYAsignarPieza_bloqueaSiGuiaPendienteVerificacion() {
        GuiaMaster gm = GuiaMaster.builder().id(10L).totalPiezasEsperadas(3)
                .estadoGlobal(EstadoGuiaMaster.PENDIENTE_VERIFICACION).build();
        var ex = assertThrows(ConflictException.class, () -> service.validarYAsignarPieza(gm, 1));
        assertTrue(ex.getMessage().contains("PENDIENTE_VERIFICACION"));
        assertTrue(ex.getMessage().contains("pendiente de aprobación"));
    }

    @Test
    void validarYAsignarPieza_bloqueaSiGuiaEnRevision() {
        GuiaMaster gm = GuiaMaster.builder().id(10L).totalPiezasEsperadas(3)
                .estadoGlobal(EstadoGuiaMaster.EN_REVISION).build();
        var ex = assertThrows(ConflictException.class, () -> service.validarYAsignarPieza(gm, 1));
        assertTrue(ex.getMessage().contains("EN_REVISION"));
        assertTrue(ex.getMessage().contains("en revisión"));
    }

    @Test
    void update_totalMenorQuePiezasRegistradas_mensajeIndicaReglaYDatos() {
        GuiaMaster gm = GuiaMaster.builder().id(10L).trackingBase("TB-1")
                .totalPiezasEsperadas(5).build();
        when(guiaMasterRepository.findById(10L)).thenReturn(Optional.of(gm));
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(10L))
                .thenReturn(List.of(
                        Paquete.builder().id(1L).piezaNumero(1).build(),
                        Paquete.builder().id(2L).piezaNumero(2).build(),
                        Paquete.builder().id(3L).piezaNumero(3).build()));

        GuiaMasterUpdateRequest req = GuiaMasterUpdateRequest.builder()
                .totalPiezasEsperadas(2).build();

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.update(10L, req));
        assertTrue(ex.getMessage().contains("No se puede reducir el total de piezas a 2"));
        assertTrue(ex.getMessage().contains("3 piezas registradas"));
        verify(guiaMasterRepository, never()).save(any());
    }

    @Test
    void update_consignatarioCongeladoPorDespacho_mensajeExplicaRegla() {
        Consignatario actual = Consignatario.builder().id(1L).codigo("ECU-A").build();
        GuiaMaster gm = GuiaMaster.builder().id(10L).trackingBase("TB-1")
                .consignatario(actual)
                .consignatarioVersion(com.ecubox.ecubox_backend.entity.ConsignatarioVersion.builder()
                        .id(77L).build())
                .build();
        when(guiaMasterRepository.findById(10L)).thenReturn(Optional.of(gm));

        GuiaMasterUpdateRequest req = GuiaMasterUpdateRequest.builder()
                .consignatarioId(2L).build();

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.update(10L, req));
        assertTrue(ex.getMessage().contains("No se puede cambiar el consignatario"));
        assertTrue(ex.getMessage().contains("piezas despachadas"));
        verify(guiaMasterRepository, never()).save(any());
    }

    @Test
    void updateDestinatarioForCliente_guiaEnProceso_mensajeIndicaEstadoActual() {
        Usuario cliente = Usuario.builder().id(5L).build();
        GuiaMaster gm = GuiaMaster.builder().id(10L).trackingBase("TB-1")
                .clienteUsuario(cliente)
                .estadoGlobal(EstadoGuiaMaster.RECEPCION_PARCIAL).build();
        when(guiaMasterRepository.findById(10L)).thenReturn(Optional.of(gm));

        ConflictException ex = assertThrows(ConflictException.class,
                () -> service.updateDestinatarioForCliente(10L, 2L, 5L));
        assertTrue(ex.getMessage().contains("estado inicial de registro"));
        assertTrue(ex.getMessage().contains("RECEPCION_PARCIAL"));
        verify(guiaMasterRepository, never()).save(any());
    }

    @Test
    void calcularEstado_sinPiezasRegistradas() {
        stubConfigEstados();
        GuiaMaster gm = GuiaMaster.builder().id(1L).totalPiezasEsperadas(3).estadoGlobal(EstadoGuiaMaster.CON_PAQUETES_REGISTRADOS).build();
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L)).thenReturn(List.of());

        assertEquals(EstadoGuiaMaster.SIN_PAQUETES_REGISTRADOS, service.calcularEstado(gm));
    }

    @Test
    void calcularEstado_totalNull_todasLasPiezasRegistradasEnRecepcion_esRecepcionCompleta() {
        stubConfigEstados();
        GuiaMaster gm = GuiaMaster.builder().id(1L).totalPiezasEsperadas(null).estadoGlobal(EstadoGuiaMaster.RECEPCION_PARCIAL).build();
        Paquete p1 = Paquete.builder().id(1L).estadoRastreo(enLote).build();
        Paquete p2 = Paquete.builder().id(2L).estadoRastreo(enLote).build();
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L))
                .thenReturn(List.of(p1, p2));

        assertEquals(EstadoGuiaMaster.RECEPCION_COMPLETA, service.calcularEstado(gm));
    }

    @Test
    void calcularEstado_recepcionParcialCuandoSoloAlgunasRecibidas() {
        stubConfigEstados();
        GuiaMaster gm = GuiaMaster.builder().id(1L).totalPiezasEsperadas(3).estadoGlobal(EstadoGuiaMaster.CON_PAQUETES_REGISTRADOS).build();
        Paquete pRegistrada = Paquete.builder().id(1L).estadoRastreo(registrado).build();
        Paquete pRecibida = Paquete.builder().id(2L).estadoRastreo(enLote).build();
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L))
                .thenReturn(List.of(pRegistrada, pRecibida));

        assertEquals(EstadoGuiaMaster.RECEPCION_PARCIAL, service.calcularEstado(gm));
    }

    @Test
    void calcularEstado_recepcionCompletaCuandoTodasRegistradasYRecibidas() {
        stubConfigEstados();
        GuiaMaster gm = GuiaMaster.builder().id(1L).totalPiezasEsperadas(2).estadoGlobal(EstadoGuiaMaster.CON_PAQUETES_REGISTRADOS).build();
        Paquete p1 = Paquete.builder().id(1L).estadoRastreo(enLote).build();
        Paquete p2 = Paquete.builder().id(2L).estadoRastreo(enLote).build();
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L))
                .thenReturn(List.of(p1, p2));

        assertEquals(EstadoGuiaMaster.RECEPCION_COMPLETA, service.calcularEstado(gm));
    }

    @Test
    void calcularEstado_despachoParcialCuandoAlMenosUnaDespachada() {
        stubConfigEstados();
        GuiaMaster gm = GuiaMaster.builder().id(1L).totalPiezasEsperadas(3).estadoGlobal(EstadoGuiaMaster.CON_PAQUETES_REGISTRADOS).build();
        Paquete p1 = Paquete.builder().id(1L).estadoRastreo(enDespacho).saca(sacaConDespacho()).build();
        Paquete p2 = Paquete.builder().id(2L).estadoRastreo(enLote).build();
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L))
                .thenReturn(List.of(p1, p2));

        assertEquals(EstadoGuiaMaster.DESPACHO_PARCIAL, service.calcularEstado(gm));
    }

    @Test
    void calcularEstado_despachoCompletadoCuandoTodasDespachadas() {
        stubConfigEstados();
        GuiaMaster gm = GuiaMaster.builder().id(1L).totalPiezasEsperadas(2).estadoGlobal(EstadoGuiaMaster.DESPACHO_PARCIAL).build();
        Paquete p1 = Paquete.builder().id(1L).estadoRastreo(enDespacho).saca(sacaConDespacho()).build();
        Paquete p2 = Paquete.builder().id(2L).estadoRastreo(enDespacho).saca(sacaConDespacho()).build();
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L))
                .thenReturn(List.of(p1, p2));

        assertEquals(EstadoGuiaMaster.DESPACHO_COMPLETADO, service.calcularEstado(gm));
    }

    @Test
    void calcularEstado_respetaCanceladaComoTerminal() {
        GuiaMaster gm = GuiaMaster.builder().id(1L).totalPiezasEsperadas(3).estadoGlobal(EstadoGuiaMaster.CANCELADA).build();
        assertEquals(EstadoGuiaMaster.CANCELADA, service.calcularEstado(gm));
    }

    @Test
    void recomputarEstado_actualizaSoloSiCambia() {
        stubConfigEstados();
        GuiaMaster gm = GuiaMaster.builder().id(1L).totalPiezasEsperadas(1).estadoGlobal(EstadoGuiaMaster.CON_PAQUETES_REGISTRADOS).build();
        Paquete p1 = Paquete.builder().id(1L).estadoRastreo(enDespacho).saca(sacaConDespacho()).build();
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(gm));
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L)).thenReturn(List.of(p1));

        service.recomputarEstado(1L);

        verify(guiaMasterRepository).save(gm);
        assertEquals(EstadoGuiaMaster.DESPACHO_COMPLETADO, gm.getEstadoGlobal());
    }

    @Test
    void cerrarConFaltante_fallaSiNoHayDespachadas() {
        stubConfigEstados();
        GuiaMaster gm = GuiaMaster.builder().id(1L).totalPiezasEsperadas(3).estadoGlobal(EstadoGuiaMaster.RECEPCION_PARCIAL).build();
        Paquete p1 = Paquete.builder().id(1L).estadoRastreo(enLote).build();
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(gm));
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L)).thenReturn(List.of(p1));

        var ex = assertThrows(BadRequestException.class,
                () -> service.cerrarConFaltante(1L, "motivo", null, TipoCierreGuiaMaster.DESPACHO_INCOMPLETO_MANUAL));
        assertNotNull(ex);
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
        Consignatario dest = Consignatario.builder().id(20L).nombre("Maria").usuario(cliente).build();
        when(guiaMasterRepository.existsByTrackingBaseIgnoreCase("TRK-1")).thenReturn(false);
        when(consignatarioRepository.findById(20L)).thenReturn(Optional.of(dest));
        when(usuarioRepository.findById(7L)).thenReturn(Optional.of(cliente));
        when(guiaMasterRepository.save(any(GuiaMaster.class))).thenAnswer(inv -> inv.getArgument(0));

        GuiaMaster gm = service.createForCliente("TRK-1", 20L, 7L);

        ArgumentCaptor<GuiaMaster> captor = ArgumentCaptor.forClass(GuiaMaster.class);
        verify(guiaMasterRepository).save(captor.capture());
        GuiaMaster saved = captor.getValue();
        assertEquals("TRK-1", saved.getTrackingBase());
        // Las guías creadas por el cliente nacen PENDIENTE_VERIFICACION (requieren
        // verificación del operario); las del operario nacen SIN_PAQUETES_REGISTRADOS.
        assertEquals(EstadoGuiaMaster.PENDIENTE_VERIFICACION, saved.getEstadoGlobal());
        assertSame(dest, saved.getConsignatario());
        assertSame(cliente, saved.getClienteUsuario());
        assertEquals(null, saved.getTotalPiezasEsperadas());
        assertSame(saved, gm);
    }

    @Test
    void createForCliente_fallaSiDestinatarioEsAjeno() {
        Usuario otro = Usuario.builder().id(99L).username("otro").build();
        Consignatario dest = Consignatario.builder().id(20L).nombre("Maria").usuario(otro).build();
        when(guiaMasterRepository.existsByTrackingBaseIgnoreCase("TRK-1")).thenReturn(false);
        when(consignatarioRepository.findById(20L)).thenReturn(Optional.of(dest));

        var ex = assertThrows(BadRequestException.class, () -> service.createForCliente("TRK-1", 20L, 7L));
        assertNotNull(ex);
    }

    @Test
    void createForCliente_fallaSiTrackingDuplicado() {
        when(guiaMasterRepository.existsByTrackingBaseIgnoreCase("DUP")).thenReturn(true);
        var ex = assertThrows(ConflictException.class, () -> service.createForCliente("DUP", 20L, 7L));
        assertNotNull(ex);
    }

    @Test
    void update_actualizaTotalYDestinatario() {
        Usuario cliente = Usuario.builder().id(5L).username("cli").build();
        Consignatario dest = Consignatario.builder().id(30L).nombre("Pedro").usuario(cliente).build();
        GuiaMaster gm = GuiaMaster.builder().id(1L).trackingBase("X").estadoGlobal(EstadoGuiaMaster.CON_PAQUETES_REGISTRADOS).build();
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(gm));
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L)).thenReturn(List.of());
        when(consignatarioRepository.findById(30L)).thenReturn(Optional.of(dest));
        when(guiaMasterRepository.save(any(GuiaMaster.class))).thenAnswer(inv -> inv.getArgument(0));

        GuiaMasterUpdateRequest req = GuiaMasterUpdateRequest.builder()
                .totalPiezasEsperadas(4)
                .consignatarioId(30L)
                .build();
        service.update(1L, req);

        assertEquals(4, gm.getTotalPiezasEsperadas());
        assertSame(dest, gm.getConsignatario());
        assertSame(cliente, gm.getClienteUsuario());
    }

    @Test
    void update_fallaSiTotalMenorQuePiezasRegistradas() {
        GuiaMaster gm = GuiaMaster.builder().id(1L).trackingBase("X").estadoGlobal(EstadoGuiaMaster.CON_PAQUETES_REGISTRADOS).build();
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(gm));
        Paquete p1 = Paquete.builder().id(1L).build();
        Paquete p2 = Paquete.builder().id(2L).build();
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L)).thenReturn(List.of(p1, p2));

        GuiaMasterUpdateRequest req = GuiaMasterUpdateRequest.builder().totalPiezasEsperadas(1).build();
        var ex = assertThrows(BadRequestException.class, () -> service.update(1L, req));
        assertNotNull(ex);
    }

    @Test
    void update_trackingRegistradoEnLote_sincronizaPaquetes() {
        stubConfigEstados();
        LocalDateTime fechaLote = LocalDateTime.now().minusHours(3);
        GuiaMaster gm = GuiaMaster.builder().id(1L).trackingBase("OLD-TBK")
                .estadoGlobal(EstadoGuiaMaster.CON_PAQUETES_REGISTRADOS).build();
        Paquete p = Paquete.builder().id(100L).piezaNumero(1).piezaTotal(1).guiaMaster(gm).numeroGuia("OLD-TBK 1/1").build();
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(gm));
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L)).thenReturn(List.of(p));
        when(guiaMasterRepository.findByTrackingBaseIgnoreCase("NEW-TBK")).thenReturn(Optional.empty());
        when(paqueteRepository.existsByNumeroGuiaAndIdNot(any(), anyLong())).thenReturn(false);
        when(guiaMasterRepository.save(any(GuiaMaster.class))).thenAnswer(inv -> inv.getArgument(0));
        when(paqueteRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(loteRecepcionGuiaRepository.existsByNumeroGuiaEnvioIgnoreCase("NEW-TBK")).thenReturn(true);
        when(loteRecepcionGuiaRepository.findMinFechaRecepcionByNumeroGuiaEnvioIgnoreCase("NEW-TBK"))
                .thenReturn(Optional.of(fechaLote));

        service.update(1L, GuiaMasterUpdateRequest.builder().trackingBase("NEW-TBK").build());

        assertEquals("NEW-TBK", gm.getTrackingBase());
        verify(paqueteService).aplicarEstadoEnLoteRecepcion(
                argThat(ids -> ids.size() == 1 && ids.contains(100L)),
                eq(fechaLote));
    }

    @Test
    void update_consolidadoEnLoteRecepcionSinTrackingEnLote_sincronizaPiezasAfectadas() {
        stubConfigEstados();
        LocalDateTime fechaLote = LocalDateTime.now().minusHours(1);
        GuiaMaster gm = GuiaMaster.builder().id(1L).trackingBase("OLD2")
                .estadoGlobal(EstadoGuiaMaster.CON_PAQUETES_REGISTRADOS).build();
        EnvioConsolidado ec = EnvioConsolidado.builder().id(5L).codigo("CONS-X").build();
        Paquete p = Paquete.builder().id(200L).piezaNumero(1).piezaTotal(1).guiaMaster(gm).envioConsolidado(ec)
                .numeroGuia("OLD2 1/1").build();
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(gm));
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L)).thenReturn(List.of(p));
        when(guiaMasterRepository.findByTrackingBaseIgnoreCase("TRACK-NEW")).thenReturn(Optional.empty());
        when(paqueteRepository.existsByNumeroGuiaAndIdNot(any(), anyLong())).thenReturn(false);
        when(guiaMasterRepository.save(any(GuiaMaster.class))).thenAnswer(inv -> inv.getArgument(0));
        when(paqueteRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(loteRecepcionGuiaRepository.existsByNumeroGuiaEnvioIgnoreCase("TRACK-NEW")).thenReturn(false);
        when(loteRecepcionGuiaRepository.existsByNumeroGuiaEnvioIgnoreCase("CONS-X")).thenReturn(true);
        when(loteRecepcionGuiaRepository.findMinFechaRecepcionByNumeroGuiaEnvioIgnoreCase("CONS-X"))
                .thenReturn(Optional.of(fechaLote));

        service.update(1L, GuiaMasterUpdateRequest.builder().trackingBase("TRACK-NEW").build());

        verify(paqueteService).aplicarEstadoEnLoteRecepcion(
                argThat(ids -> ids.size() == 1 && ids.contains(200L)),
                eq(fechaLote));
    }

    @Test
    void dashboardForCliente_conteosPorEstadoYTotales() {
        stubConfigEstados();
        Long clienteId = 7L;
        // 3 guias: una SIN_PIEZAS sin total, una RECEPCION_PARCIAL, una DESPACHO_COMPLETADO
        GuiaMaster g1 = GuiaMaster.builder()
                .id(1L).trackingBase("A").totalPiezasEsperadas(null)
                .estadoGlobal(EstadoGuiaMaster.SIN_PAQUETES_REGISTRADOS)
                .createdAt(LocalDateTime.now().minusDays(1)).build();
        GuiaMaster g2 = GuiaMaster.builder()
                .id(2L).trackingBase("B").totalPiezasEsperadas(3)
                .estadoGlobal(EstadoGuiaMaster.RECEPCION_PARCIAL)
                .createdAt(LocalDateTime.now().minusDays(3))
                .fechaPrimeraRecepcion(LocalDateTime.now().minusHours(5)).build();
        GuiaMaster g3 = GuiaMaster.builder()
                .id(3L).trackingBase("C").totalPiezasEsperadas(2)
                .estadoGlobal(EstadoGuiaMaster.DESPACHO_COMPLETADO)
                .createdAt(LocalDateTime.now().minusDays(2)).build();
        when(guiaMasterRepository.findByClienteUsuarioId(clienteId)).thenReturn(List.of(g1, g2, g3));
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L)).thenReturn(List.of());
        Paquete p2a = Paquete.builder().id(20L).estadoRastreo(enLote).build();
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(2L)).thenReturn(List.of(p2a));
        Paquete p3a = Paquete.builder().id(30L).estadoRastreo(enDespacho).saca(sacaConDespacho()).build();
        Paquete p3b = Paquete.builder().id(31L).estadoRastreo(enDespacho).saca(sacaConDespacho()).build();
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(3L)).thenReturn(List.of(p3a, p3b));
        when(parametroSistemaService.getGuiaMasterMinPiezasDespachoParcial()).thenReturn(1);
        when(consignatarioRepository.countByUsuarioId(clienteId)).thenReturn(4L);

        MiInicioDashboardDTO dto = service.dashboardForCliente(clienteId);

        assertEquals(3L, dto.getTotalGuias());
        assertEquals(2L, dto.getTotalGuiasActivas());
        assertEquals(1L, dto.getTotalGuiasCerradas());
        assertEquals(1L, dto.getTotalGuiasSinTotalDefinido());
        assertEquals(4L, dto.getTotalDestinatarios());
        assertEquals(1L, dto.getConteosPorEstado().get("SIN_PAQUETES_REGISTRADOS"));
        assertEquals(1L, dto.getConteosPorEstado().get("RECEPCION_PARCIAL"));
        assertEquals(1L, dto.getConteosPorEstado().get("DESPACHO_COMPLETADO"));
        // piezas en transito = solo g2 contribuye (1 registrada - 0 despachadas)
        assertEquals(1L, dto.getPiezasEnTransito());
        // primera recientes ordenadas por createdAt desc
        assertEquals("A", dto.getGuiasRecientes().get(0).getTrackingBase());
        // proximas a despacharse: g2 (RECEPCION_PARCIAL con lista=true por minPiezas=1)
        assertEquals(1, dto.getGuiasProximasACerrar().size());
        assertEquals("B", dto.getGuiasProximasACerrar().get(0).getTrackingBase());
    }

    @Test
    void dashboardForCliente_sinGuiasDevuelveCerosYConteosInicializados() {
        Long clienteId = 9L;
        when(guiaMasterRepository.findByClienteUsuarioId(clienteId)).thenReturn(List.of());
        when(consignatarioRepository.countByUsuarioId(clienteId)).thenReturn(0L);

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
        GuiaMaster gm = GuiaMaster.builder().id(1L).totalPiezasEsperadas(3).estadoGlobal(EstadoGuiaMaster.DESPACHO_PARCIAL).build();
        Paquete p1 = Paquete.builder().id(1L).estadoRastreo(enDespacho).saca(sacaConDespacho()).build();
        Paquete p2 = Paquete.builder().id(2L).estadoRastreo(enLote).build();
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(gm));
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L)).thenReturn(List.of(p1, p2));
        when(guiaMasterRepository.save(any(GuiaMaster.class))).thenAnswer(inv -> inv.getArgument(0));

        GuiaMaster result = service.cerrarConFaltante(1L, "Pieza 3 extraviada",
                null, TipoCierreGuiaMaster.DESPACHO_INCOMPLETO_MANUAL);

        assertNotNull(result);
        assertEquals(EstadoGuiaMaster.CANCELADA, result.getEstadoGlobal());
        assertEquals("Pieza 3 extraviada", result.getMotivoCierre());
        assertEquals(TipoCierreGuiaMaster.CANCELACION, result.getTipoCierre());
    }

    @Test
    void findByTrackingBaseForTracking_devuelveContadoresYPiezasMapeadas() {
        stubConfigEstados();
        Consignatario dest = Consignatario.builder().id(50L).nombre("Maria").build();
        GuiaMaster gm = GuiaMaster.builder()
                .id(99L)
                .trackingBase("TRK-PUB-1")
                .totalPiezasEsperadas(3)
                .estadoGlobal(EstadoGuiaMaster.DESPACHO_PARCIAL)
                .consignatario(dest)
                .createdAt(LocalDateTime.now().minusDays(2))
                .fechaPrimeraRecepcion(LocalDateTime.now().minusDays(1))
                .build();
        Paquete p1 = Paquete.builder().id(1L).numeroGuia("TRK-PUB-1 1/3").piezaNumero(1).piezaTotal(3)
                .estadoRastreo(enDespacho).saca(sacaConDespacho())
                .fechaEstadoActualDesde(LocalDateTime.now().minusHours(2)).build();
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
        assertEquals(1, dto.getPiezasRecibidas()); // solo estado id "en lote recepcion"
        assertEquals(1, dto.getPiezasDespachadas()); // p1 con saca/despacho
        assertEquals(EstadoGuiaMaster.DESPACHO_PARCIAL, dto.getEstadoGlobal());
        assertEquals("Maria", dto.getConsignatario().getNombre());
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
    void update_cambioDeDestinatario_propagaACadaPiezaConRefRegenerado() {
        Usuario cliente = Usuario.builder().id(5L).username("cli").build();
        Consignatario destAnterior = Consignatario.builder()
                .id(18L).codigo("ECU-CV01").usuario(cliente).build();
        Consignatario destNuevo = Consignatario.builder()
                .id(20L).codigo("ECU-KZ66").usuario(cliente).build();
        GuiaMaster gm = GuiaMaster.builder()
                .id(99L).trackingBase("X")
                .consignatario(destAnterior)
                .estadoGlobal(EstadoGuiaMaster.CON_PAQUETES_REGISTRADOS)
                .build();
        Paquete p1 = Paquete.builder().id(1L).piezaNumero(1).piezaTotal(2)
                .consignatario(destAnterior).ref("ECU-CV01-17")
                .estadoRastreo(registrado).build();
        Paquete p2 = Paquete.builder().id(2L).piezaNumero(2).piezaTotal(2)
                .consignatario(destAnterior).ref("ECU-CV01-18")
                .estadoRastreo(registrado).build();

        stubConfigEstados();
        when(guiaMasterRepository.findById(99L)).thenReturn(Optional.of(gm));
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(99L))
                .thenReturn(List.of(p1, p2));
        when(consignatarioRepository.findById(20L)).thenReturn(Optional.of(destNuevo));
        when(guiaMasterRepository.save(any(GuiaMaster.class))).thenAnswer(inv -> inv.getArgument(0));
        when(codigoSecuenciaService.nextRefPaquete(eq(20L), eq("ECU-KZ66")))
                .thenReturn("ECU-KZ66-1", "ECU-KZ66-2");

        GuiaMasterUpdateRequest req = GuiaMasterUpdateRequest.builder()
                .consignatarioId(20L)
                .build();
        service.update(99L, req);

        assertSame(destNuevo, gm.getConsignatario());
        assertSame(destNuevo, p1.getConsignatario());
        assertSame(destNuevo, p2.getConsignatario());
        assertEquals("ECU-KZ66-1", p1.getRef());
        assertEquals("ECU-KZ66-2", p2.getRef());
        verify(paqueteRepository).saveAll(org.mockito.ArgumentMatchers.<Iterable<Paquete>>any());
    }

    @Test
    void update_cambioDeDestinatario_bloqueaSiAlgunaPiezaYaRecibida() {
        Usuario cliente = Usuario.builder().id(5L).username("cli").build();
        Consignatario destAnterior = Consignatario.builder()
                .id(18L).codigo("ECU-CV01").usuario(cliente).build();
        Consignatario destNuevo = Consignatario.builder()
                .id(20L).codigo("ECU-KZ66").usuario(cliente).build();
        GuiaMaster gm = GuiaMaster.builder()
                .id(99L).trackingBase("X")
                .consignatario(destAnterior)
                .estadoGlobal(EstadoGuiaMaster.RECEPCION_PARCIAL)
                .build();
        Paquete recibida = Paquete.builder().id(1L).piezaNumero(1).piezaTotal(2)
                .consignatario(destAnterior).ref("ECU-CV01-17")
                .estadoRastreo(enLote).build();
        Paquete pendiente = Paquete.builder().id(2L).piezaNumero(2).piezaTotal(2)
                .consignatario(destAnterior).ref("ECU-CV01-18")
                .estadoRastreo(registrado).build();

        stubConfigEstados();
        when(guiaMasterRepository.findById(99L)).thenReturn(Optional.of(gm));
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(99L))
                .thenReturn(List.of(recibida, pendiente));
        when(consignatarioRepository.findById(20L)).thenReturn(Optional.of(destNuevo));
        lenient().when(guiaMasterRepository.save(any(GuiaMaster.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        GuiaMasterUpdateRequest req = GuiaMasterUpdateRequest.builder()
                .consignatarioId(20L)
                .build();

        var ex = assertThrows(ConflictException.class, () -> service.update(99L, req));
        assertNotNull(ex);
        verify(codigoSecuenciaService, never()).nextRefPaquete(anyLong(), anyString());
    }

    @Test
    void toDTO_fallbackAlDestinatarioDeLaPrimeraPiezaCuandoGuiaNoTieneDestinatario() {
        Usuario cliente = Usuario.builder().id(5L).username("cli").build();
        Consignatario kevin = Consignatario.builder()
                .id(20L).codigo("ECU-KZ66").nombre("Kevin Zuniga")
                .telefono("0999")
                .direccion("Av X")
                .provincia("Pichincha").canton("Quito")
                .usuario(cliente).build();
        GuiaMaster gm = GuiaMaster.builder()
                .id(99L).trackingBase("AUTO-1")
                .consignatario(null)
                .estadoGlobal(EstadoGuiaMaster.CON_PAQUETES_REGISTRADOS)
                .build();
        Paquete pieza = Paquete.builder().id(1L).piezaNumero(1).piezaTotal(1)
                .consignatario(kevin).ref("ECU-KZ66-1").build();

        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(99L))
                .thenReturn(List.of(pieza));
        when(parametroSistemaService.getGuiaMasterMinPiezasDespachoParcial()).thenReturn(1);

        var dto = service.toDTO(gm, List.of());

        assertEquals("Kevin Zuniga", dto.getConsignatarioNombre());
        assertEquals("0999", dto.getConsignatarioTelefono());
        assertEquals("Av X", dto.getConsignatarioDireccion());
        assertEquals(20L, dto.getConsignatarioId());
        assertTrue(Boolean.TRUE.equals(dto.getConsignatarioInferido()),
                "consignatarioInferido debe quedar TRUE cuando los datos vienen del fallback");
    }

    @Test
    void toDTO_noMarcaInferidoCuandoElDestinatarioVienePropioDeLaGuia() {
        Usuario cliente = Usuario.builder().id(5L).username("cli").build();
        Consignatario kevin = Consignatario.builder()
                .id(20L).codigo("ECU-KZ66").nombre("Kevin Zuniga")
                .usuario(cliente).build();
        GuiaMaster gm = GuiaMaster.builder()
                .id(99L).trackingBase("X")
                .consignatario(kevin)
                .estadoGlobal(EstadoGuiaMaster.CON_PAQUETES_REGISTRADOS)
                .build();

        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(99L))
                .thenReturn(List.of());
        when(parametroSistemaService.getGuiaMasterMinPiezasDespachoParcial()).thenReturn(1);

        var dto = service.toDTO(gm, List.of());

        assertEquals("Kevin Zuniga", dto.getConsignatarioNombre());
        assertEquals(20L, dto.getConsignatarioId());
        assertFalse(Boolean.TRUE.equals(dto.getConsignatarioInferido()));
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
                .estadoGlobal(EstadoGuiaMaster.DESPACHO_PARCIAL)
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

    // ------------------------------------------------------------------
    // aplicarAccionBulk (accion masiva sobre guias master)
    // ------------------------------------------------------------------

    @Test
    void aplicarAccionBulk_cancelar_procesaElegiblesYRechazaTerminales() {
        GuiaMaster activa = GuiaMaster.builder().id(1L).trackingBase("TB-OK")
                .estadoGlobal(EstadoGuiaMaster.CON_PAQUETES_REGISTRADOS).build();
        GuiaMaster cancelada = GuiaMaster.builder().id(2L).trackingBase("TB-TERMINAL")
                .estadoGlobal(EstadoGuiaMaster.CANCELADA).build();
        when(guiaMasterRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(activa, cancelada));
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(activa));
        when(guiaMasterRepository.findById(2L)).thenReturn(Optional.of(cancelada));
        when(guiaMasterRepository.save(any(GuiaMaster.class))).thenAnswer(inv -> inv.getArgument(0));

        var res = service.aplicarAccionBulk("CANCELAR", List.of(1L, 2L), "error de registro", null);

        assertEquals(1, res.getProcesadas());
        assertEquals(1, res.getRechazados().size());
        var rechazo = res.getRechazados().get(0);
        assertEquals(2L, rechazo.getGuiaMasterId());
        assertEquals("TB-TERMINAL", rechazo.getTrackingBase());
        assertTrue(rechazo.getMotivo().contains("estado terminal"));
    }

    @Test
    void aplicarAccionBulk_accionDesconocida_lanzaBadRequest() {
        var ex = assertThrows(BadRequestException.class,
                () -> service.aplicarAccionBulk("EXPLOTAR", List.of(1L), null, null));
        assertTrue(ex.getMessage().contains("no es válida"));
        assertTrue(ex.getMessage().contains("EXPLOTAR"));
    }

    @Test
    void aplicarAccionBulk_cancelarSinMotivo_lanzaBadRequest() {
        var ex = assertThrows(BadRequestException.class,
                () -> service.aplicarAccionBulk("CANCELAR", List.of(1L), "   ", null));
        assertTrue(ex.getMessage().contains("falta el motivo"));
        verify(guiaMasterRepository, never()).findAllById(anyList());
    }

    @Test
    void aplicarAccionBulk_recalcular_guiaCongelada_seRechazaConMotivo() {
        GuiaMaster enRevision = GuiaMaster.builder().id(3L).trackingBase("TB-REV")
                .estadoGlobal(EstadoGuiaMaster.EN_REVISION).build();
        when(guiaMasterRepository.findAllById(List.of(3L))).thenReturn(List.of(enRevision));

        var res = service.aplicarAccionBulk("RECALCULAR", List.of(3L), null, null);

        assertEquals(0, res.getProcesadas());
        assertEquals(1, res.getRechazados().size());
        assertTrue(res.getRechazados().get(0).getMotivo().contains("revisión"));
        verify(guiaMasterRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // Aprobación y revisión (bandejas de aprobación / en revisión)
    // -------------------------------------------------------------------------

    @Test
    void marcarEnRevision_conMotivo_cambiaEstadoYRegistraHistorialConActor() {
        GuiaMaster gm = GuiaMaster.builder().id(1L).estadoGlobal(EstadoGuiaMaster.CON_PAQUETES_REGISTRADOS).build();
        Usuario actor = Usuario.builder().id(9L).username("op").build();
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(gm));
        when(usuarioRepository.findById(9L)).thenReturn(Optional.of(actor));
        when(guiaMasterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        GuiaMaster saved = service.marcarEnRevision(1L, "  DATOS_INCONSISTENTES: revisar  ", 9L);

        assertEquals(EstadoGuiaMaster.EN_REVISION, saved.getEstadoGlobal());
        ArgumentCaptor<GuiaMasterEstadoHistorial> cap = ArgumentCaptor.forClass(GuiaMasterEstadoHistorial.class);
        verify(historialRepository).save(cap.capture());
        GuiaMasterEstadoHistorial h = cap.getValue();
        assertEquals(TipoCambioEstadoGuiaMaster.MARCAR_REVISION, h.getTipoCambio());
        assertEquals("DATOS_INCONSISTENTES: revisar", h.getMotivo());
        assertSame(actor, h.getCambiadoPorUsuario());
    }

    @Test
    void marcarEnRevision_sinMotivo_fallaYNoGuarda() {
        GuiaMaster gm = GuiaMaster.builder().id(1L).estadoGlobal(EstadoGuiaMaster.CON_PAQUETES_REGISTRADOS).build();
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(gm));

        assertThrows(BadRequestException.class, () -> service.marcarEnRevision(1L, "   ", 9L));
        verify(guiaMasterRepository, never()).save(any());
    }

    @Test
    void marcarEnRevision_yaEnRevision_falla() {
        GuiaMaster gm = GuiaMaster.builder().id(1L).estadoGlobal(EstadoGuiaMaster.EN_REVISION).build();
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(gm));

        assertThrows(BadRequestException.class, () -> service.marcarEnRevision(1L, "motivo", 9L));
    }

    @Test
    void aprobar_pendienteSinPiezas_quedaSinPaquetesYRegistraAprobacion() {
        stubConfigEstados();
        GuiaMaster gm = GuiaMaster.builder().id(1L).estadoGlobal(EstadoGuiaMaster.PENDIENTE_VERIFICACION).build();
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(gm));
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L)).thenReturn(List.of());
        when(guiaMasterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        GuiaMaster saved = service.aprobar(1L, 9L);

        assertEquals(EstadoGuiaMaster.SIN_PAQUETES_REGISTRADOS, saved.getEstadoGlobal());
        verify(historialRepository).save(argThat(h -> h.getTipoCambio() == TipoCambioEstadoGuiaMaster.APROBACION));
    }

    @Test
    void aprobar_enRevision_recalculaEstadoDerivado() {
        stubConfigEstados();
        GuiaMaster gm = GuiaMaster.builder().id(1L).estadoGlobal(EstadoGuiaMaster.EN_REVISION).build();
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(gm));
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L)).thenReturn(List.of());
        when(guiaMasterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        GuiaMaster saved = service.aprobar(1L, null);

        assertEquals(EstadoGuiaMaster.SIN_PAQUETES_REGISTRADOS, saved.getEstadoGlobal());
    }

    @Test
    void aprobar_estadoNoElegible_fallaYNoGuarda() {
        GuiaMaster gm = GuiaMaster.builder().id(1L).estadoGlobal(EstadoGuiaMaster.RECEPCION_PARCIAL).build();
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(gm));

        assertThrows(BadRequestException.class, () -> service.aprobar(1L, null));
        verify(guiaMasterRepository, never()).save(any());
    }

    @Test
    void salirDeRevision_derivaEstadoYRegistraHistorial() {
        stubConfigEstados();
        GuiaMaster gm = GuiaMaster.builder().id(1L).estadoGlobal(EstadoGuiaMaster.EN_REVISION).build();
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(gm));
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L)).thenReturn(List.of());
        when(guiaMasterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        GuiaMaster saved = service.salirDeRevision(1L, "validado", 9L);

        assertEquals(EstadoGuiaMaster.SIN_PAQUETES_REGISTRADOS, saved.getEstadoGlobal());
        verify(historialRepository).save(argThat(h -> h.getTipoCambio() == TipoCambioEstadoGuiaMaster.SALIR_REVISION));
    }

    @Test
    void salirDeRevision_siNoEstaEnRevision_falla() {
        GuiaMaster gm = GuiaMaster.builder().id(1L).estadoGlobal(EstadoGuiaMaster.VERIFICADA).build();
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(gm));

        assertThrows(BadRequestException.class, () -> service.salirDeRevision(1L, null, 9L));
    }

    @Test
    void aplicarAccionBulk_marcarRevisionSinMotivo_falla() {
        assertThrows(BadRequestException.class,
                () -> service.aplicarAccionBulk("MARCAR_REVISION", List.of(1L), null, 9L));
        verify(guiaMasterRepository, never()).save(any());
    }

    @Test
    void aplicarAccionBulk_aprobar_procesaElegibleYRechazaNoElegible() {
        stubConfigEstados();
        GuiaMaster pendiente = GuiaMaster.builder().id(1L).trackingBase("TB-1")
                .estadoGlobal(EstadoGuiaMaster.PENDIENTE_VERIFICACION).build();
        GuiaMaster operativa = GuiaMaster.builder().id(2L).trackingBase("TB-2")
                .estadoGlobal(EstadoGuiaMaster.RECEPCION_PARCIAL).build();
        when(guiaMasterRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(pendiente, operativa));
        when(guiaMasterRepository.findById(1L)).thenReturn(Optional.of(pendiente));
        when(guiaMasterRepository.findById(2L)).thenReturn(Optional.of(operativa));
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(1L)).thenReturn(List.of());
        when(guiaMasterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var res = service.aplicarAccionBulk("APROBAR", List.of(1L, 2L), null, 9L);

        assertEquals(1, res.getProcesadas());
        assertEquals(1, res.getRechazados().size());
        assertEquals(2L, res.getRechazados().get(0).getGuiaMasterId());
    }

    @Test
    void toDTO_enRevision_exponeMotivoActorYFechaDesdeHistorial() {
        stubConfigEstados();
        when(parametroSistemaService.getGuiaMasterMinPiezasDespachoParcial()).thenReturn(2);
        GuiaMaster gm = GuiaMaster.builder().id(5L).trackingBase("TB-5")
                .estadoGlobal(EstadoGuiaMaster.EN_REVISION).build();
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(5L)).thenReturn(List.of());
        Usuario revisor = Usuario.builder().id(3L).username("op2").build();
        LocalDateTime cuando = LocalDateTime.now().minusHours(2);
        GuiaMasterEstadoHistorial h = GuiaMasterEstadoHistorial.builder()
                .id(50L).estadoNuevo("EN_REVISION").tipoCambio(TipoCambioEstadoGuiaMaster.MARCAR_REVISION)
                .motivo("TOTAL_PAQUETES_INCORRECTO: faltan 2").cambiadoPorUsuario(revisor).cambiadoEn(cuando).build();
        when(historialRepository.findFirstByGuiaMasterIdAndTipoCambioOrderByCambiadoEnDescIdDesc(
                5L, TipoCambioEstadoGuiaMaster.MARCAR_REVISION)).thenReturn(Optional.of(h));

        GuiaMasterDTO dto = service.toDTO(gm, List.of());

        assertEquals("TOTAL_PAQUETES_INCORRECTO: faltan 2", dto.getRevisionMotivo());
        assertEquals(cuando, dto.getRevisionEn());
        assertEquals(3L, dto.getRevisionPorUsuarioId());
        assertEquals("op2", dto.getRevisionPorUsuarioNombre());
    }

    @Test
    void toDTO_noEnRevision_noConsultaHistorialDeRevision() {
        stubConfigEstados();
        when(parametroSistemaService.getGuiaMasterMinPiezasDespachoParcial()).thenReturn(2);
        GuiaMaster gm = GuiaMaster.builder().id(6L).trackingBase("TB-6")
                .estadoGlobal(EstadoGuiaMaster.CON_PAQUETES_REGISTRADOS).build();
        when(paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(6L)).thenReturn(List.of());

        GuiaMasterDTO dto = service.toDTO(gm, List.of());

        assertEquals(null, dto.getRevisionMotivo());
        verify(historialRepository, never())
                .findFirstByGuiaMasterIdAndTipoCambioOrderByCambiadoEnDescIdDesc(anyLong(), any());
    }
}
