package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.dto.MiDespachoDTO;
import com.ecubox.ecubox_backend.dto.MiDespachoDetalleDTO;
import com.ecubox.ecubox_backend.entity.Agencia;
import com.ecubox.ecubox_backend.entity.AgenciaCourierEntrega;
import com.ecubox.ecubox_backend.entity.AgenciaCourierEntregaVersion;
import com.ecubox.ecubox_backend.entity.AgenciaVersion;
import com.ecubox.ecubox_backend.entity.Consignatario;
import com.ecubox.ecubox_backend.entity.ConsignatarioVersion;
import com.ecubox.ecubox_backend.entity.CourierEntrega;
import com.ecubox.ecubox_backend.entity.Despacho;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.Saca;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.enums.TipoEntrega;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.security.AccesoSessionResolver;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Cubre la proyección de cliente de "Mis entregas": número de guía, destino por
 * modalidad con snapshot SCD2, operador, peso acotado al cliente, estado de
 * confirmación, aislamiento por scope de enlace y ausencia de filtración de
 * totales globales del despacho.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MisDespachosServiceTest {

    @Mock private PaqueteRepository paqueteRepository;
    @Mock private PaqueteService paqueteService;
    @Mock private EstadoRastreoService estadoRastreoService;
    @Mock private ParametroSistemaService parametroSistemaService;
    @Mock private AccesoSessionResolver accesoSessionResolver;
    @Mock private CurrentUserService currentUserService;

    // Configuración de confirmación: aviso en orden 50, entrega confirmada en orden 90.
    private static final Long AVISO_ID = 10L;
    private static final Long ENTREGA_ID = 20L;

    private MisDespachosService service() {
        MisDespachosService s = new MisDespachosService(paqueteRepository, paqueteService,
                estadoRastreoService, parametroSistemaService, accesoSessionResolver, currentUserService);
        EstadosRastreoPorPuntoDTO cfg = EstadosRastreoPorPuntoDTO.builder()
                .estadoRastreoEntregaConfirmadaClienteId(ENTREGA_ID)
                .estadoRastreoAvisoConfirmacionEntregaId(AVISO_ID)
                .build();
        when(parametroSistemaService.getEstadosRastreoPorPunto()).thenReturn(cfg);
        when(estadoRastreoService.getOrdenById(ENTREGA_ID)).thenReturn(90);
        when(estadoRastreoService.getOrdenById(AVISO_ID)).thenReturn(50);
        // Por defecto: cuenta de usuario con consignatario (no enlace).
        when(accesoSessionResolver.isEnlaceSession()).thenReturn(false);
        Usuario u = Usuario.builder().id(7L).build();
        lenient().when(currentUserService.getCurrentUsuario()).thenReturn(u);
        return s;
    }

    // ----------------------------------------------------------------- helpers

    private EstadoRastreo estado(int orden) {
        return EstadoRastreo.builder().id((long) orden).nombre("Estado " + orden)
                .codigo("E" + orden).orden(orden).ordenTracking(orden).build();
    }

    private Paquete paquete(long id, String guia, String pesoLbs, int orden, Despacho d) {
        Saca saca = Saca.builder().id(id * 100).despacho(d).build();
        return Paquete.builder()
                .id(id)
                .numeroGuia(guia)
                .pesoLbs(pesoLbs == null ? null : new BigDecimal(pesoLbs))
                .estadoRastreo(estado(orden))
                .saca(saca)
                .build();
    }

    private Despacho despachoBase(long id, TipoEntrega tipo) {
        return Despacho.builder().id(id).numeroGuia("DSP-" + id).tipoEntrega(tipo).build();
    }

    // ------------------------------------------------------------------- tests

    @Test
    void listar_domicilio_resuelveGuiaDestinatarioOperadorYPesoDelCliente() {
        MisDespachosService s = service();
        Despacho d = despachoBase(1L, TipoEntrega.DOMICILIO);
        d.setConsignatario(Consignatario.builder().id(3L).nombre("Ana Pérez").build());
        d.setCourierEntrega(CourierEntrega.builder().id(4L).nombre("Servientrega").build());
        when(paqueteRepository.findEnDespachoByConsignatarioUsuarioId(7L)).thenReturn(List.of(
                paquete(1, "GUIA-1", "10.00", 60, d),
                paquete(2, "GUIA-2", "8.40", 60, d)));

        List<MiDespachoDTO> out = s.listar();

        assertEquals(1, out.size());
        MiDespachoDTO dto = out.get(0);
        assertEquals("DSP-1", dto.getNumeroGuia());
        assertEquals("Ana Pérez", dto.getDestinoNombre());
        assertEquals("Servientrega", dto.getOperadorEntregaNombre());
        assertEquals(2, dto.getTotalPiezas());
        assertEquals(0, new BigDecimal("18.40").compareTo(dto.getPesoLbsTotal()));
        assertTrue(dto.isConfirmable());
        assertFalse(dto.isEntregaConfirmada());
    }

    @Test
    void listar_retiroEnOficina_destinoYOperadorSonLaAgencia() {
        MisDespachosService s = service();
        Despacho d = despachoBase(2L, TipoEntrega.AGENCIA);
        d.setAgencia(Agencia.builder().id(5L).nombre("Oficina Quito Centro").build());
        when(paqueteRepository.findEnDespachoByConsignatarioUsuarioId(7L)).thenReturn(List.of(
                paquete(1, "GUIA-1", "5.00", 60, d)));

        MiDespachoDTO dto = s.listar().get(0);

        assertEquals("Oficina Quito Centro", dto.getDestinoNombre());
        assertEquals("Oficina Quito Centro", dto.getOperadorEntregaNombre());
    }

    @Test
    void listar_puntoEntrega_destinoEsEtiquetaDelPuntoYOperadorElCourier() {
        MisDespachosService s = service();
        Despacho d = despachoBase(3L, TipoEntrega.AGENCIA_COURIER_ENTREGA);
        d.setCourierEntrega(CourierEntrega.builder().id(4L).nombre("Laar Courier").build());
        d.setAgenciaCourierEntrega(AgenciaCourierEntrega.builder()
                .id(6L).provincia("Guayas").canton("Guayaquil").codigo("GYE01").build());
        when(paqueteRepository.findEnDespachoByConsignatarioUsuarioId(7L)).thenReturn(List.of(
                paquete(1, "GUIA-1", "3.00", 60, d)));

        MiDespachoDTO dto = s.listar().get(0);

        assertEquals("Guayas, Guayaquil (GYE01)", dto.getDestinoNombre());
        assertEquals("Laar Courier", dto.getOperadorEntregaNombre());
    }

    @Test
    void listar_destinoCongelado_usaSnapshotNoElMaestroVivo() {
        MisDespachosService s = service();
        Despacho d = despachoBase(4L, TipoEntrega.DOMICILIO);
        // Maestro vivo cambió el nombre después de despachar:
        d.setConsignatario(Consignatario.builder().id(3L).nombre("Nombre Actual").build());
        // ... pero el snapshot inmutable conserva el nombre histórico:
        d.setConsignatarioVersion(ConsignatarioVersion.builder().id(30L).nombre("Nombre Histórico").build());
        when(paqueteRepository.findEnDespachoByConsignatarioUsuarioId(7L)).thenReturn(List.of(
                paquete(1, "GUIA-1", "1.00", 60, d)));

        MiDespachoDTO dto = s.listar().get(0);

        assertEquals("Nombre Histórico", dto.getDestinoNombre());
    }

    @Test
    void listar_dosClientesEnUnDespacho_soloCuentaLasPiezasDelClienteDelScope() {
        MisDespachosService s = service();
        when(accesoSessionResolver.isEnlaceSession()).thenReturn(true);
        when(accesoSessionResolver.consignatarioScope()).thenReturn(Set.of(3L));

        Despacho d = despachoBase(5L, TipoEntrega.DOMICILIO);
        d.setConsignatario(Consignatario.builder().id(3L).nombre("Cliente A").build());
        // El repositorio ya filtra por scope: solo devuelve las piezas del cliente A,
        // aunque el despacho contenga piezas de otros consignatarios.
        when(paqueteRepository.findEnDespachoByConsignatarioIdIn(Set.of(3L))).thenReturn(List.of(
                paquete(1, "A-1", "4.00", 60, d),
                paquete(2, "A-2", "6.00", 60, d)));

        MiDespachoDTO dto = s.listar().get(0);

        // Totales acotados al cliente, nunca globales del despacho.
        assertEquals(2, dto.getTotalPiezas());
        assertEquals(0, new BigDecimal("10.00").compareTo(dto.getPesoLbsTotal()));
        assertEquals("Cliente A", dto.getDestinoNombre());
    }

    @Test
    void listar_scopeDeEnlaceVacio_noDevuelveNadaNiConsultaElMaestro() {
        MisDespachosService s = service();
        when(accesoSessionResolver.isEnlaceSession()).thenReturn(true);
        when(accesoSessionResolver.consignatarioScope()).thenReturn(Set.of());

        assertTrue(s.listar().isEmpty());
    }

    @Test
    void listar_entregaConfirmada_cuandoTodasLasPiezasAlcanzanElEstadoDeEntrega() {
        MisDespachosService s = service();
        Despacho d = despachoBase(6L, TipoEntrega.DOMICILIO);
        d.setConsignatario(Consignatario.builder().id(3L).nombre("Ana").build());
        when(paqueteRepository.findEnDespachoByConsignatarioUsuarioId(7L)).thenReturn(List.of(
                paquete(1, "GUIA-1", "2.00", 90, d),
                paquete(2, "GUIA-2", "2.00", 95, d)));

        MiDespachoDTO dto = s.listar().get(0);

        assertTrue(dto.isEntregaConfirmada());
        assertFalse(dto.isConfirmable());
    }

    @Test
    void detalle_exponeGuiaDestinoOperadorYPesoTotalDelCliente() {
        MisDespachosService s = service();
        Despacho d = despachoBase(7L, TipoEntrega.DOMICILIO);
        d.setConsignatario(Consignatario.builder().id(3L).nombre("Ana Pérez").build());
        d.setCourierEntrega(CourierEntrega.builder().id(4L).nombre("Servientrega").build());
        when(paqueteRepository.findEnDespachoByConsignatarioUsuarioId(7L)).thenReturn(List.of(
                paquete(1, "GUIA-1", "10.00", 60, d),
                paquete(2, "GUIA-2", "5.00", 60, d)));

        MiDespachoDetalleDTO dto = s.detalle(7L);

        assertEquals("DSP-7", dto.getNumeroGuia());
        assertEquals("Ana Pérez", dto.getDestinoNombre());
        assertEquals("Servientrega", dto.getOperadorEntregaNombre());
        assertEquals(2, dto.getTotalPiezas());
        assertEquals(0, new BigDecimal("15.00").compareTo(dto.getPesoLbsTotal()));
    }

    @Test
    void detalle_puntoEntregaCongelado_usaEtiquetaDelSnapshot() {
        MisDespachosService s = service();
        Despacho d = despachoBase(8L, TipoEntrega.AGENCIA_COURIER_ENTREGA);
        d.setCourierEntrega(CourierEntrega.builder().id(4L).nombre("Laar").build());
        // Maestro vivo distinto del snapshot:
        d.setAgenciaCourierEntrega(AgenciaCourierEntrega.builder()
                .id(6L).provincia("Pichincha").canton("Quito").codigo("UIO99").build());
        d.setAgenciaCourierEntregaVersion(AgenciaCourierEntregaVersion.builder()
                .id(60L).provincia("Guayas").canton("Guayaquil").codigo("GYE01").build());
        when(paqueteRepository.findEnDespachoByConsignatarioUsuarioId(7L)).thenReturn(List.of(
                paquete(1, "GUIA-1", "3.00", 60, d)));

        MiDespachoDetalleDTO dto = s.detalle(8L);

        assertEquals("Guayas, Guayaquil (GYE01)", dto.getDestinoNombre());
    }

    @Test
    void detalle_agenciaCongelada_usaSnapshotYOperadorEsLaAgencia() {
        MisDespachosService s = service();
        Despacho d = despachoBase(9L, TipoEntrega.AGENCIA);
        d.setAgencia(Agencia.builder().id(5L).nombre("Agencia Actual").build());
        d.setAgenciaVersion(AgenciaVersion.builder().id(50L).nombre("Agencia Histórica").build());
        when(paqueteRepository.findEnDespachoByConsignatarioUsuarioId(7L)).thenReturn(List.of(
                paquete(1, "GUIA-1", "1.00", 60, d)));

        MiDespachoDetalleDTO dto = s.detalle(9L);

        assertEquals("Agencia Histórica", dto.getDestinoNombre());
        assertEquals("Agencia Histórica", dto.getOperadorEntregaNombre());
    }

    @Test
    void listar_pesoNuloEnAlgunaPieza_noRompeElTotal() {
        MisDespachosService s = service();
        Despacho d = despachoBase(10L, TipoEntrega.DOMICILIO);
        d.setConsignatario(Consignatario.builder().id(3L).nombre("Ana").build());
        when(paqueteRepository.findEnDespachoByConsignatarioUsuarioId(7L)).thenReturn(List.of(
                paquete(1, "GUIA-1", null, 60, d),
                paquete(2, "GUIA-2", "7.00", 60, d)));

        MiDespachoDTO dto = s.listar().get(0);

        assertEquals(0, new BigDecimal("7.00").compareTo(dto.getPesoLbsTotal()));
    }

    @Test
    void getOrdenById_noSeInvocaParaCamposNoDeConfirmacion_yOperadorNuloEnRetiroSinAgencia() {
        // Defensa: punto de entrega sin courier ni agencia => operador null, sin NPE.
        MisDespachosService s = service();
        Despacho d = despachoBase(11L, TipoEntrega.AGENCIA_COURIER_ENTREGA);
        when(paqueteRepository.findEnDespachoByConsignatarioUsuarioId(7L)).thenReturn(List.of(
                paquete(1, "GUIA-1", "1.00", 60, d)));
        lenient().when(estadoRastreoService.getOrdenById(anyLong())).thenReturn(50, 90);

        MiDespachoDTO dto = s.listar().get(0);

        assertNull(dto.getOperadorEntregaNombre());
        assertNull(dto.getDestinoNombre());
    }
}
