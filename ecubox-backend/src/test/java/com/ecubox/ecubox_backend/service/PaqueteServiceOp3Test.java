package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.dto.PaqueteCreateRequest;
import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.entity.Despacho;
import com.ecubox.ecubox_backend.entity.DestinatarioFinal;
import com.ecubox.ecubox_backend.entity.Distribuidor;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.GuiaMaster;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.PaqueteEstadoEvento;
import com.ecubox.ecubox_backend.entity.Saca;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.enums.TipoEntrega;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.repository.DestinatarioFinalRepository;
import com.ecubox.ecubox_backend.repository.GuiaMasterRepository;
import com.ecubox.ecubox_backend.repository.LoteRecepcionGuiaRepository;
import com.ecubox.ecubox_backend.repository.OutboxEventRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.PaqueteEstadoEventoRepository;
import com.ecubox.ecubox_backend.repository.SacaRepository;
import com.ecubox.ecubox_backend.service.validation.OwnershipValidator;
import com.ecubox.ecubox_backend.service.validation.SacaEnDespachoValidator;
import org.springframework.data.domain.Sort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
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
    private PaqueteEstadoEventoRepository paqueteEstadoEventoRepository;
    @Mock
    private OutboxEventRepository outboxEventRepository;
    @Mock
    private ParametroSistemaService parametroSistemaService;
    @Mock
    private EstadoRastreoService estadoRastreoService;
    @Mock
    private TrackingEventService trackingEventService;
    @Mock
    private GuiaMasterRepository guiaMasterRepository;
    @Mock
    private GuiaMasterService guiaMasterService;

    private PaqueteService createPaqueteService(boolean useEventTimeline) {
        return new PaqueteService(
                paqueteRepository,
                destinatarioFinalRepository,
                sacaRepository,
                loteRecepcionGuiaRepository,
                paqueteEstadoEventoRepository,
                outboxEventRepository,
                parametroSistemaService,
                estadoRastreoService,
                trackingEventService,
                guiaMasterRepository,
                guiaMasterService,
                new OwnershipValidator(),
                new SacaEnDespachoValidator(),
                useEventTimeline
        );
    }

    @Test
    void marcaFlujoAlternoAlEntrarEstadoAlterno() {
        PaqueteService paqueteService = createPaqueteService(false);
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
        PaqueteService paqueteService = createPaqueteService(false);
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
        PaqueteService paqueteService = createPaqueteService(false);
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

    @Test
    void trackingEventos_mantieneFlujoBaseCompletoAunqueSoloHayaEventosParciales() {
        PaqueteService serviceWithEvents = createPaqueteService(true);
        EstadoRastreo base1 = EstadoRastreo.builder().id(1L).codigo("REGISTRADO").nombre("Registrado").ordenTracking(1).publicoTracking(true).build();
        EstadoRastreo base2 = EstadoRastreo.builder().id(2L).codigo("EN_USA").nombre("En USA").ordenTracking(2).publicoTracking(true).build();
        EstadoRastreo base3 = EstadoRastreo.builder().id(3L).codigo("EN_TRANSITO").nombre("En tránsito").ordenTracking(3).publicoTracking(true).build();
        EstadoRastreo base4 = EstadoRastreo.builder().id(4L).codigo("EN_REPARTO").nombre("En reparto").ordenTracking(4).publicoTracking(true).build();
        EstadoRastreo base5 = EstadoRastreo.builder().id(5L).codigo("EN_AGENCIA").nombre("En agencia").ordenTracking(5).publicoTracking(true).build();
        EstadoRastreo base6 = EstadoRastreo.builder().id(6L).codigo("ENTREGADO").nombre("Entregado").ordenTracking(6).publicoTracking(true).build();
        EstadoRastreo alterno = EstadoRastreo.builder()
                .id(7L)
                .codigo("RETENIDO")
                .nombre("Retenido")
                .ordenTracking(4)
                .publicoTracking(true)
                .tipoFlujo(TipoFlujoEstado.ALTERNO)
                .build();

        Paquete p = Paquete.builder()
                .id(102L)
                .numeroGuia("GUIA-102")
                .estadoRastreo(base3)
                .build();

        PaqueteEstadoEvento ev1 = PaqueteEstadoEvento.builder().estadoDestino(base1).build();
        PaqueteEstadoEvento ev2 = PaqueteEstadoEvento.builder().estadoDestino(base2).build();
        PaqueteEstadoEvento ev3 = PaqueteEstadoEvento.builder().estadoDestino(base3).build();

        when(paqueteRepository.findByNumeroGuiaWithSacaAndDespacho("GUIA-102")).thenReturn(Optional.of(p));
        when(estadoRastreoService.findActivosEntities()).thenReturn(List.of(base1, base2, base3, base4, base5, base6, alterno));
        when(trackingEventService.listarEventosPorPaquete(102L)).thenReturn(List.of(ev1, ev2, ev3));

        var response = serviceWithEvents.findByNumeroGuiaForTracking("guia-102");

        long totalBase = response.getEstados().stream().filter(item -> item.getTipoFlujo() != TipoFlujoEstado.ALTERNO).count();
        assertEquals(6L, totalBase);
        assertTrue(response.getEstados().stream().anyMatch(item -> "EN_TRANSITO".equals(item.getCodigo()) && item.isEsActual()));
        assertFalse(response.getEstados().stream().anyMatch(item -> "RETENIDO".equals(item.getCodigo())));
    }

    @Test
    void trackingEventos_muestraAlternoSoloSiOcurrio() {
        PaqueteService serviceWithEvents = createPaqueteService(true);
        EstadoRastreo base1 = EstadoRastreo.builder().id(1L).codigo("REGISTRADO").nombre("Registrado").ordenTracking(1).publicoTracking(true).build();
        EstadoRastreo base2 = EstadoRastreo.builder().id(2L).codigo("EN_USA").nombre("En USA").ordenTracking(2).publicoTracking(true).build();
        EstadoRastreo alterno = EstadoRastreo.builder()
                .id(7L)
                .codigo("RETENIDO")
                .nombre("Retenido")
                .ordenTracking(3)
                .publicoTracking(true)
                .tipoFlujo(TipoFlujoEstado.ALTERNO)
                .build();

        Paquete p = Paquete.builder()
                .id(103L)
                .numeroGuia("GUIA-103")
                .estadoRastreo(base2)
                .build();

        PaqueteEstadoEvento ev1 = PaqueteEstadoEvento.builder().estadoDestino(base1).build();
        PaqueteEstadoEvento ev2 = PaqueteEstadoEvento.builder().estadoDestino(base2).build();
        PaqueteEstadoEvento evAlterno = PaqueteEstadoEvento.builder().estadoDestino(alterno).build();

        when(paqueteRepository.findByNumeroGuiaWithSacaAndDespacho("GUIA-103")).thenReturn(Optional.of(p));
        when(estadoRastreoService.findActivosEntities()).thenReturn(List.of(base1, base2, alterno));
        when(trackingEventService.listarEventosPorPaquete(103L)).thenReturn(List.of(ev1, ev2, evAlterno));

        var response = serviceWithEvents.findByNumeroGuiaForTracking("guia-103");

        assertTrue(response.getEstados().stream().anyMatch(item -> "RETENIDO".equals(item.getCodigo())));
    }

    @Test
    void trackingEventos_conMultiplesAlternosSoloMuestraLosQueOcurrieron() {
        PaqueteService serviceWithEvents = createPaqueteService(true);
        EstadoRastreo base1 = EstadoRastreo.builder().id(1L).codigo("REGISTRADO").nombre("Registrado").ordenTracking(1).publicoTracking(true).build();
        EstadoRastreo base2 = EstadoRastreo.builder().id(2L).codigo("EN_USA").nombre("En USA").ordenTracking(2).publicoTracking(true).build();
        EstadoRastreo retenido = EstadoRastreo.builder()
                .id(7L)
                .codigo("RETENIDO")
                .nombre("Retenido en aduana")
                .ordenTracking(3)
                .publicoTracking(true)
                .tipoFlujo(TipoFlujoEstado.ALTERNO)
                .build();
        EstadoRastreo direccionIncompleta = EstadoRastreo.builder()
                .id(8L)
                .codigo("DIRECCION_INCOMPLETA")
                .nombre("Dirección incompleta")
                .ordenTracking(4)
                .publicoTracking(true)
                .tipoFlujo(TipoFlujoEstado.ALTERNO)
                .build();

        Paquete p = Paquete.builder()
                .id(110L)
                .numeroGuia("GUIA-110")
                .estadoRastreo(base2)
                .build();

        PaqueteEstadoEvento ev1 = PaqueteEstadoEvento.builder().estadoDestino(base1).build();
        PaqueteEstadoEvento ev2 = PaqueteEstadoEvento.builder().estadoDestino(base2).build();
        PaqueteEstadoEvento evAlternoRetenido = PaqueteEstadoEvento.builder().estadoDestino(retenido).build();

        when(paqueteRepository.findByNumeroGuiaWithSacaAndDespacho("GUIA-110")).thenReturn(Optional.of(p));
        when(estadoRastreoService.findActivosEntities()).thenReturn(List.of(base1, base2, retenido, direccionIncompleta));
        when(trackingEventService.listarEventosPorPaquete(110L)).thenReturn(List.of(ev1, ev2, evAlternoRetenido));

        var response = serviceWithEvents.findByNumeroGuiaForTracking("guia-110");

        assertTrue(response.getEstados().stream().anyMatch(item -> "RETENIDO".equals(item.getCodigo())));
        assertFalse(response.getEstados().stream().anyMatch(item -> "DIRECCION_INCOMPLETA".equals(item.getCodigo())));
    }

    @Test
    void trackingMarcaPaqueteVencidoCuandoSuperaMaximoRetiro() {
        PaqueteService paqueteService = createPaqueteService(false);
        EstadoRastreo enAgencia = EstadoRastreo.builder().id(20L).codigo("EN_AGENCIA").nombre("En agencia").ordenTracking(2).publicoTracking(true).build();
        Distribuidor distribuidor = Distribuidor.builder().id(1L).nombre("Distribuidor").diasMaxRetiroDomicilio(3).build();
        Despacho despacho = Despacho.builder().id(1L).tipoEntrega(TipoEntrega.DOMICILIO).distribuidor(distribuidor).build();
        Saca saca = Saca.builder().id(1L).despacho(despacho).build();
        Paquete p = Paquete.builder()
                .id(104L)
                .numeroGuia("GUIA-104")
                .estadoRastreo(enAgencia)
                .saca(saca)
                .fechaEstadoActualDesde(LocalDateTime.now().minusDays(5))
                .build();

        when(paqueteRepository.findByNumeroGuiaWithSacaAndDespacho("GUIA-104")).thenReturn(Optional.of(p));
        when(estadoRastreoService.findActivosEntities()).thenReturn(List.of(enAgencia));

        var response = paqueteService.findByNumeroGuiaForTracking("guia-104");

        assertTrue(Boolean.TRUE.equals(response.getPaqueteVencido()));
        assertEquals(3, response.getDiasMaxRetiro());
        assertEquals(0, response.getDiasRestantes());
        assertTrue(response.getDiasTranscurridos() > response.getDiasMaxRetiro());
    }

    @Test
    void listarVencidosParaOperario_filtraYOrdenaPorDiasAtrasoDesc() {
        PaqueteService paqueteService = createPaqueteService(false);
        EstadoRastreo enAgencia = EstadoRastreo.builder().id(30L).codigo("EN_AGENCIA").nombre("En agencia").build();
        Distribuidor distribuidor = Distribuidor.builder().id(2L).nombre("Distribuidor").diasMaxRetiroDomicilio(3).build();
        Despacho despacho = Despacho.builder().id(2L).tipoEntrega(TipoEntrega.DOMICILIO).distribuidor(distribuidor).build();
        Saca saca = Saca.builder().id(2L).despacho(despacho).build();
        Paquete vencidoAtraso1 = Paquete.builder()
                .id(201L)
                .numeroGuia("GUIA-201")
                .estadoRastreo(enAgencia)
                .saca(saca)
                .fechaEstadoActualDesde(LocalDateTime.now().minusDays(4))
                .build();
        Paquete vencidoAtraso4 = Paquete.builder()
                .id(202L)
                .numeroGuia("GUIA-202")
                .estadoRastreo(enAgencia)
                .saca(saca)
                .fechaEstadoActualDesde(LocalDateTime.now().minusDays(7))
                .build();
        Paquete vigente = Paquete.builder()
                .id(203L)
                .numeroGuia("GUIA-203")
                .estadoRastreo(enAgencia)
                .saca(saca)
                .fechaEstadoActualDesde(LocalDateTime.now().minusDays(2))
                .build();

        when(paqueteRepository.findAll(any(Sort.class))).thenReturn(List.of(vencidoAtraso1, vencidoAtraso4, vigente));

        var response = paqueteService.listarVencidosParaOperario();

        assertEquals(2, response.size());
        assertEquals("GUIA-202", response.get(0).getNumeroGuia());
        assertEquals("GUIA-201", response.get(1).getNumeroGuia());
        assertTrue(Boolean.TRUE.equals(response.get(0).getPaqueteVencido()));
        assertTrue(response.get(0).getDiasAtrasoRetiro() > response.get(1).getDiasAtrasoRetiro());
    }

    @Test
    void delete_eliminaEventosOutboxYPaquete() {
        PaqueteService paqueteService = createPaqueteService(false);
        com.ecubox.ecubox_backend.entity.Usuario owner = com.ecubox.ecubox_backend.entity.Usuario.builder().id(10L).build();
        com.ecubox.ecubox_backend.entity.DestinatarioFinal destinatario =
                com.ecubox.ecubox_backend.entity.DestinatarioFinal.builder().id(30L).usuario(owner).build();
        Paquete paquete = Paquete.builder().id(99L).destinatarioFinal(destinatario).build();
        when(paqueteRepository.findById(99L)).thenReturn(Optional.of(paquete));

        paqueteService.delete(99L, 10L, false);

        verify(paqueteEstadoEventoRepository).deleteByPaqueteId(99L);
        verify(outboxEventRepository).deleteByAggregateTypeAndAggregateId("PAQUETE", "99");
        verify(paqueteRepository).delete(paquete);
    }

    @Test
    void revertirEstadoSiUltimoEventoCoincide_restauraEstadoOrigen() {
        PaqueteService paqueteService = createPaqueteService(false);
        EstadoRastreo origen = EstadoRastreo.builder().id(1L).tipoFlujo(TipoFlujoEstado.NORMAL).build();
        EstadoRastreo destino = EstadoRastreo.builder().id(2L).tipoFlujo(TipoFlujoEstado.NORMAL).build();
        Paquete paquete = Paquete.builder().id(77L).estadoRastreo(destino).build();
        PaqueteEstadoEvento ultimo = PaqueteEstadoEvento.builder()
                .paquete(paquete)
                .estadoOrigen(origen)
                .estadoDestino(destino)
                .eventSource("DESPACHO_AUTO")
                .build();
        when(paqueteRepository.findById(77L)).thenReturn(Optional.of(paquete));
        when(paqueteEstadoEventoRepository.findTopByPaqueteIdOrderByOccurredAtDescIdDesc(77L))
                .thenReturn(Optional.of(ultimo));
        when(paqueteRepository.save(any(Paquete.class))).thenAnswer(inv -> inv.getArgument(0));

        int reverted = paqueteService.revertirEstadoSiUltimoEventoCoincide(List.of(77L), "DESPACHO_AUTO");

        assertEquals(1, reverted);
        verify(paqueteRepository).save(any(Paquete.class));
    }

    @Test
    void create_autogeneraNumeroGuiaCompuestoConGuiaMasterYPieza() {
        PaqueteService paqueteService = createPaqueteService(false);
        Usuario usuario = Usuario.builder().id(7L).build();
        DestinatarioFinal destinatario = DestinatarioFinal.builder()
                .id(50L).codigo("D50").usuario(usuario).build();
        EstadoRastreo registrado = EstadoRastreo.builder().id(1L).codigo("REGISTRADO").orden(1).build();
        GuiaMaster gm = GuiaMaster.builder()
                .id(99L).trackingBase("1Z52159R0379385035").totalPiezasEsperadas(3).build();

        when(destinatarioFinalRepository.findById(50L)).thenReturn(Optional.of(destinatario));
        when(paqueteRepository.countByDestinatarioFinalId(50L)).thenReturn(0L);
        when(parametroSistemaService.getEstadosRastreoPorPunto())
                .thenReturn(EstadosRastreoPorPuntoDTO.builder().estadoRastreoRegistroPaqueteId(1L).build());
        when(estadoRastreoService.findEntityById(1L)).thenReturn(registrado);
        when(guiaMasterRepository.findById(99L)).thenReturn(Optional.of(gm));
        when(guiaMasterService.validarYAsignarPieza(gm, 2)).thenReturn(new int[]{2, 3});
        when(paqueteRepository.existsByNumeroGuia("1Z52159R0379385035 2/3")).thenReturn(false);
        when(paqueteRepository.save(any(Paquete.class))).thenAnswer(inv -> inv.getArgument(0));

        PaqueteCreateRequest req = PaqueteCreateRequest.builder()
                .destinatarioFinalId(50L)
                .guiaMasterId(99L)
                .piezaNumero(2)
                .contenido("Ropa")
                .build();

        PaqueteDTO dto = paqueteService.create(7L, false, false, req);

        ArgumentCaptor<Paquete> captor = ArgumentCaptor.forClass(Paquete.class);
        verify(paqueteRepository).save(captor.capture());
        Paquete saved = captor.getValue();
        assertEquals("1Z52159R0379385035 2/3", saved.getNumeroGuia());
        assertEquals(2, saved.getPiezaNumero());
        assertEquals(3, saved.getPiezaTotal());
        assertNull(saved.getEnvioConsolidado(),
                "Crear paquete no debe asignar envio consolidado; eso lo hace el flujo de EnvioConsolidado");
        assertEquals("1Z52159R0379385035 2/3", dto.getNumeroGuia());
        assertNull(dto.getEnvioConsolidadoCodigo());
    }

    @Test
    void revertirEstadoSiUltimoEventoCoincide_noRevierteCuandoFuenteNoCoincide() {
        PaqueteService paqueteService = createPaqueteService(false);
        EstadoRastreo origen = EstadoRastreo.builder().id(1L).tipoFlujo(TipoFlujoEstado.NORMAL).build();
        EstadoRastreo destino = EstadoRastreo.builder().id(2L).tipoFlujo(TipoFlujoEstado.NORMAL).build();
        Paquete paquete = Paquete.builder().id(88L).estadoRastreo(destino).build();
        PaqueteEstadoEvento ultimo = PaqueteEstadoEvento.builder()
                .paquete(paquete)
                .estadoOrigen(origen)
                .estadoDestino(destino)
                .eventSource("LOTE_RECEPCION_AUTO")
                .build();
        when(paqueteRepository.findById(88L)).thenReturn(Optional.of(paquete));
        when(paqueteEstadoEventoRepository.findTopByPaqueteIdOrderByOccurredAtDescIdDesc(88L))
                .thenReturn(Optional.of(ultimo));

        int reverted = paqueteService.revertirEstadoSiUltimoEventoCoincide(List.of(88L), "DESPACHO_AUTO");

        assertEquals(0, reverted);
        verifyNoInteractions(outboxEventRepository);
    }
}
