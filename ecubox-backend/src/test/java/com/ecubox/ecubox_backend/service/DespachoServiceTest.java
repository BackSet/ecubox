package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.DespachoCreateRequest;
import com.ecubox.ecubox_backend.dto.DespachoResumenDTO;
import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.dto.SacaDTO;
import com.ecubox.ecubox_backend.entity.Consignatario;
import com.ecubox.ecubox_backend.entity.CourierEntrega;
import com.ecubox.ecubox_backend.entity.Despacho;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.Saca;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.enums.TipoEntrega;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.repository.AgenciaRepository;
import com.ecubox.ecubox_backend.repository.ConsignatarioRepository;
import com.ecubox.ecubox_backend.repository.CourierEntregaRepository;
import com.ecubox.ecubox_backend.repository.DespachoRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.SacaRepository;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.validation.SacaEnDespachoValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regresión del resumen liviano de despachos: KPIs del universo + conteos por
 * tipo (que respetan courier/período) + opciones de filtro.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DespachoServiceTest {

    @Mock private DespachoRepository despachoRepository;
    @Mock private CourierEntregaRepository courierEntregaRepository;
    @Mock private ConsignatarioRepository consignatarioRepository;
    @Mock private AgenciaRepository agenciaRepository;
    @Mock private SacaRepository sacaRepository;
    @Mock private SacaService sacaService;
    @Mock private CurrentUserService currentUserService;
    @Mock private PaqueteService paqueteService;
    @Mock private PaqueteRepository paqueteRepository;
    @Mock private ParametroSistemaService parametroSistemaService;
    @Mock private AgenciaCourierEntregaService agenciaCourierEntregaService;
    @Mock private SacaEnDespachoValidator sacaEnDespachoValidator;
    @Mock private EstadoRastreoService estadoRastreoService;
    @Mock private GuiaMasterService guiaMasterService;
    @Mock private ConsignatarioVersionService consignatarioVersionService;
    @Mock private AgenciaVersionService agenciaVersionService;
    @Mock private AgenciaCourierEntregaVersionService agenciaCourierEntregaVersionService;
    @Mock private CodigoSecuenciaService codigoSecuenciaService;

    private DespachoService createService() {
        return new DespachoService(
                despachoRepository, courierEntregaRepository, consignatarioRepository,
                agenciaRepository, sacaRepository, sacaService, currentUserService,
                paqueteService, paqueteRepository, parametroSistemaService,
                agenciaCourierEntregaService, sacaEnDespachoValidator, estadoRastreoService,
                guiaMasterService, consignatarioVersionService, agenciaVersionService,
                agenciaCourierEntregaVersionService, codigoSecuenciaService);
    }

    @Test
    @SuppressWarnings("unchecked")
    void resumen_agregaKpisYConteosPorTipo() {
        when(despachoRepository.count()).thenReturn(10L);
        when(despachoRepository.count(any(Specification.class))).thenReturn(4L);
        when(despachoRepository.countByFechaHoraEntre(any(), any())).thenReturn(2L);
        when(despachoRepository.countSacasEnDespachos()).thenReturn(5L);
        when(despachoRepository.countDistinctCouriers()).thenReturn(3L);
        when(despachoRepository.findDistinctCouriers()).thenReturn(List.of("DHL", "Servientrega"));
        when(despachoRepository.findDistinctTipos())
                .thenReturn(List.of(TipoEntrega.DOMICILIO, TipoEntrega.AGENCIA));

        DespachoResumenDTO resumen = createService().resumen(null, null, null);

        assertEquals(10L, resumen.getTotal());
        assertEquals(2L, resumen.getHoy());
        assertEquals(2L, resumen.getUltimos7d());
        assertEquals(5L, resumen.getSacas());
        assertEquals(3L, resumen.getCouriersEntrega());
        assertEquals(4L, resumen.getTipoCountsTotal());
        // Todos los tipos del enum aparecen en el mapa de conteos.
        assertEquals(TipoEntrega.values().length, resumen.getTipoCounts().size());
        assertTrue(resumen.getTipoCounts().containsKey(TipoEntrega.DOMICILIO));
        assertEquals(List.of("DHL", "Servientrega"), resumen.getCouriers());
        assertEquals(List.of(TipoEntrega.DOMICILIO, TipoEntrega.AGENCIA), resumen.getTipos());
    }

    @Test
    void create_aceptaListaDeSacasVaciaSinAplicarEstados() {
        CourierEntrega courier = CourierEntrega.builder().id(7L).nombre("Courier").build();
        Consignatario consignatario = Consignatario.builder().id(8L).nombre("Destino").build();
        Usuario operario = Usuario.builder().id(9L).username("operario").build();
        DespachoCreateRequest request = DespachoCreateRequest.builder()
                .numeroGuia("DES-001")
                .courierEntregaId(7L)
                .tipoEntrega(TipoEntrega.DOMICILIO)
                .consignatarioId(8L)
                .sacaIds(List.of())
                .build();
        when(courierEntregaRepository.findById(7L)).thenReturn(java.util.Optional.of(courier));
        when(consignatarioRepository.findById(8L)).thenReturn(java.util.Optional.of(consignatario));
        when(currentUserService.getCurrentUsuario()).thenReturn(operario);
        when(despachoRepository.save(any(Despacho.class))).thenAnswer(invocation -> {
            Despacho despacho = invocation.getArgument(0);
            despacho.setId(1L);
            return despacho;
        });

        var creado = createService().create(request);

        assertEquals(List.of(), creado.getSacaIds());
        verify(parametroSistemaService, never()).getEstadosRastreoPorPunto();
        verify(paqueteService, never()).aplicarEstadoEnDespacho(any(), any());
    }

    @Test
    void create_aceptaSacaIdsNuloSinAplicarEstados() {
        CourierEntrega courier = CourierEntrega.builder().id(7L).nombre("Courier").build();
        Consignatario consignatario = Consignatario.builder().id(8L).nombre("Destino").build();
        Usuario operario = Usuario.builder().id(9L).username("operario").build();
        DespachoCreateRequest request = DespachoCreateRequest.builder()
                .numeroGuia("DES-002")
                .courierEntregaId(7L)
                .tipoEntrega(TipoEntrega.DOMICILIO)
                .consignatarioId(8L)
                .sacaIds(null)
                .build();
        when(courierEntregaRepository.findById(7L)).thenReturn(java.util.Optional.of(courier));
        when(consignatarioRepository.findById(8L)).thenReturn(java.util.Optional.of(consignatario));
        when(currentUserService.getCurrentUsuario()).thenReturn(operario);
        when(despachoRepository.save(any(Despacho.class))).thenAnswer(invocation -> {
            Despacho despacho = invocation.getArgument(0);
            despacho.setId(2L);
            return despacho;
        });

        var creado = createService().create(request);

        assertEquals(List.of(), creado.getSacaIds());
        verify(parametroSistemaService, never()).getEstadosRastreoPorPunto();
        verify(paqueteService, never()).aplicarEstadoEnDespacho(any(), any());
    }

    @Test
    void listarSacasElegibles_filtraEstadosMixtosYSinEstado() {
        EstadoRastreo destino = EstadoRastreo.builder()
                .id(30L).nombre("Destino").orden(90).tipoFlujo(TipoFlujoEstado.NORMAL).build();
        EstadoRastreo requerido = EstadoRastreo.builder()
                .id(20L).nombre("Estado requerido").orden(40).tipoFlujo(TipoFlujoEstado.NORMAL).build();
        EstadoRastreo otro = EstadoRastreo.builder()
                .id(10L).nombre("Anterior antiguo").orden(10).tipoFlujo(TipoFlujoEstado.NORMAL).build();
        Saca elegible = Saca.builder().id(1L).numeroOrden("S-1").build();
        Saca mixta = Saca.builder().id(2L).numeroOrden("S-2").build();
        Saca sinEstado = Saca.builder().id(3L).numeroOrden("S-3").build();
        Paquete p1 = Paquete.builder().id(101L).saca(elegible).estadoRastreo(requerido).build();
        Paquete p2 = Paquete.builder().id(201L).saca(mixta).estadoRastreo(requerido).build();
        Paquete p3 = Paquete.builder().id(202L).saca(mixta).estadoRastreo(otro).build();
        Paquete p4 = Paquete.builder().id(301L).saca(sinEstado).estadoRastreo(null).build();
        when(parametroSistemaService.getEstadosRastreoPorPunto())
                .thenReturn(EstadosRastreoPorPuntoDTO.builder().estadoRastreoEnDespachoId(30L).build());
        when(estadoRastreoService.resolverTransicionInmediata(30L))
                .thenReturn(new EstadoRastreoService.TransicionInmediata(destino, requerido));
        when(sacaRepository.findByDespachoIdIsNullOrderByIdAsc())
                .thenReturn(List.of(elegible, mixta, sinEstado));
        when(paqueteRepository.findBySacaIdInWithEstado(List.of(1L, 2L, 3L)))
                .thenReturn(List.of(p1, p2, p3, p4));
        when(sacaService.toDTO(elegible))
                .thenReturn(SacaDTO.builder().id(1L).numeroOrden("S-1").build());

        var respuesta = createService().listarSacasElegibles();

        assertEquals("Estado requerido", respuesta.getEstadoRequeridoNombre());
        assertEquals(List.of(1L), respuesta.getSacas().stream().map(SacaDTO::getId).toList());
    }
}
