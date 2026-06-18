package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.entity.Despacho;
import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.GuiaMaster;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.PaqueteEstadoEvento;
import com.ecubox.ecubox_backend.entity.RevisionPaquete;
import com.ecubox.ecubox_backend.entity.Saca;
import com.ecubox.ecubox_backend.enums.EstadoEnvioConsolidadoOperativo;
import com.ecubox.ecubox_backend.enums.EstadoRevisionPaquete;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.repository.ConsignatarioRepository;
import com.ecubox.ecubox_backend.repository.GuiaMasterRepository;
import com.ecubox.ecubox_backend.repository.LoteRecepcionGuiaRepository;
import com.ecubox.ecubox_backend.repository.OutboxEventRepository;
import com.ecubox.ecubox_backend.repository.PaqueteEstadoEventoRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.RevisionPaqueteRepository;
import com.ecubox.ecubox_backend.repository.SacaRepository;
import com.ecubox.ecubox_backend.service.validation.OwnershipValidator;
import com.ecubox.ecubox_backend.service.validation.SacaEnDespachoValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PaqueteServiceCalcularEstadoMinimoTest {

    @Mock private PaqueteRepository paqueteRepository;
    @Mock private ConsignatarioRepository consignatarioRepository;
    @Mock private SacaRepository sacaRepository;
    @Mock private LoteRecepcionGuiaRepository loteRecepcionGuiaRepository;
    @Mock private PaqueteEstadoEventoRepository paqueteEstadoEventoRepository;
    @Mock private OutboxEventRepository outboxEventRepository;
    @Mock private ParametroSistemaService parametroSistemaService;
    @Mock private EstadoRastreoService estadoRastreoService;
    @Mock private TrackingEventService trackingEventService;
    @Mock private GuiaMasterRepository guiaMasterRepository;
    @Mock private GuiaMasterService guiaMasterService;
    @Mock private CodigoSecuenciaService codigoSecuenciaService;
    @Mock private EnvioConsolidadoService envioConsolidadoService;
    @Mock private EstadoConsolidadoOperativoResolver estadoConsolidadoOperativoResolver;
    @Mock private RevisionPaqueteRepository revisionPaqueteRepository;

    private PaqueteService service;

    private static final Long REGISTRO_ID = 10L;
    private static final Long BODEGA_ID = 20L;
    private static final Long ASOCIAR_ID = 30L;
    private static final Long DESPACHO_ID = 40L;
    private static final Long ENTREGA_ID = 50L;
    private static final Long VIAS_USA_ID = 60L;
    private static final Long MANIFESTADO_ID = 70L;
    private static final Long ADUANA_ID = 80L;

    private EstadoRastreo stRegistro;
    private EstadoRastreo stAsociar;
    private EstadoRastreo stManifestado;
    private EstadoRastreo stVuelo;
    private EstadoRastreo stAduana;
    private EstadoRastreo stBodega;
    private EstadoRastreo stDespacho;
    private EstadoRastreo stEntrega;

    @BeforeEach
    void setUp() {
        service = new PaqueteService(
                paqueteRepository, consignatarioRepository, sacaRepository,
                loteRecepcionGuiaRepository, paqueteEstadoEventoRepository, outboxEventRepository,
                parametroSistemaService, estadoRastreoService, trackingEventService,
                guiaMasterRepository, guiaMasterService, new OwnershipValidator(),
                new SacaEnDespachoValidator(), codigoSecuenciaService, envioConsolidadoService,
                estadoConsolidadoOperativoResolver, revisionPaqueteRepository, null,
                null, false);

        stRegistro = EstadoRastreo.builder().id(REGISTRO_ID).codigo("REGISTRADO").orden(1).ordenTracking(1).activo(true).build();
        stAsociar = EstadoRastreo.builder().id(ASOCIAR_ID).codigo("EN_PLANILLA").orden(2).ordenTracking(2).activo(true).build();
        stManifestado = EstadoRastreo.builder().id(MANIFESTADO_ID).codigo("MANIFESTADO").orden(3).ordenTracking(3).activo(true).build();
        stVuelo = EstadoRastreo.builder().id(VIAS_USA_ID).codigo("VUELO").orden(4).ordenTracking(4).activo(true).build();
        stAduana = EstadoRastreo.builder().id(ADUANA_ID).codigo("ADUANA").orden(5).ordenTracking(5).activo(true).build();
        stBodega = EstadoRastreo.builder().id(BODEGA_ID).codigo("BODEGA").orden(6).ordenTracking(6).activo(true).build();
        stDespacho = EstadoRastreo.builder().id(DESPACHO_ID).codigo("DESPACHO").orden(7).ordenTracking(7).activo(true).build();
        stEntrega = EstadoRastreo.builder().id(ENTREGA_ID).codigo("ENTREGADO").orden(8).ordenTracking(8).activo(true).build();

        when(estadoRastreoService.findEntityById(REGISTRO_ID)).thenReturn(stRegistro);
        when(estadoRastreoService.findEntityById(ASOCIAR_ID)).thenReturn(stAsociar);
        when(estadoRastreoService.findEntityById(MANIFESTADO_ID)).thenReturn(stManifestado);
        when(estadoRastreoService.findEntityById(VIAS_USA_ID)).thenReturn(stVuelo);
        when(estadoRastreoService.findEntityById(ADUANA_ID)).thenReturn(stAduana);
        when(estadoRastreoService.findEntityById(BODEGA_ID)).thenReturn(stBodega);
        when(estadoRastreoService.findEntityById(DESPACHO_ID)).thenReturn(stDespacho);
        when(estadoRastreoService.findEntityById(ENTREGA_ID)).thenReturn(stEntrega);

        EstadosRastreoPorPuntoDTO config = EstadosRastreoPorPuntoDTO.builder()
                .estadoRastreoRegistroPaqueteId(REGISTRO_ID)
                .estadoRastreoAsociarEnvioConsolidadoId(ASOCIAR_ID)
                .estadoRastreoCierreConsolidadoId(MANIFESTADO_ID)
                .estadoRastreoEnviadoDesdeUsaId(VIAS_USA_ID)
                .estadoRastreoArriboEcuadorId(ADUANA_ID)
                .estadoRastreoEnLoteRecepcionId(BODEGA_ID)
                .estadoRastreoEnDespachoId(DESPACHO_ID)
                .estadoRastreoEntregaConfirmadaClienteId(ENTREGA_ID)
                .build();
        when(parametroSistemaService.getEstadosRastreoPorPunto()).thenReturn(config);
    }

    @Test
    void testCalcularEstadoMinimo_RegistroDefault() {
        Paquete paquete = Paquete.builder().id(100L).numeroGuia("GU-1").build();
        EstadoRastreo min = service.calcularEstadoMinimoPaquete(paquete);
        assertEquals(REGISTRO_ID, min.getId());
    }

    @Test
    void testCalcularEstadoMinimo_AsociadoConsolidado() {
        EnvioConsolidado ec = EnvioConsolidado.builder().id(200L).codigo("CONS-1").estadoOperativo(EstadoEnvioConsolidadoOperativo.EN_PREPARACION).build();
        Paquete paquete = Paquete.builder().id(100L).numeroGuia("GU-1").envioConsolidado(ec).build();

        EstadoRastreo min = service.calcularEstadoMinimoPaquete(paquete);
        assertEquals(ASOCIAR_ID, min.getId());
    }

    @Test
    void testCalcularEstadoMinimo_ConsolidadoCerrado() {
        EnvioConsolidado ec = EnvioConsolidado.builder().id(200L).codigo("CONS-1").estadoOperativo(EstadoEnvioConsolidadoOperativo.CERRADO).build();
        Paquete paquete = Paquete.builder().id(100L).numeroGuia("GU-1").envioConsolidado(ec).build();

        EstadoRastreo min = service.calcularEstadoMinimoPaquete(paquete);
        assertEquals(MANIFESTADO_ID, min.getId());
    }

    @Test
    void testCalcularEstadoMinimo_ConsolidadoEnviado() {
        EnvioConsolidado ec = EnvioConsolidado.builder().id(200L).codigo("CONS-1").estadoOperativo(EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA).build();
        Paquete paquete = Paquete.builder().id(100L).numeroGuia("GU-1").envioConsolidado(ec).build();

        EstadoRastreo min = service.calcularEstadoMinimoPaquete(paquete);
        assertEquals(VIAS_USA_ID, min.getId());
    }

    @Test
    void testCalcularEstadoMinimo_ConsolidadoArribado() {
        EnvioConsolidado ec = EnvioConsolidado.builder().id(200L).codigo("CONS-1").estadoOperativo(EstadoEnvioConsolidadoOperativo.ARRIBADO_ECUADOR).build();
        Paquete paquete = Paquete.builder().id(100L).numeroGuia("GU-1").envioConsolidado(ec).build();

        EstadoRastreo min = service.calcularEstadoMinimoPaquete(paquete);
        assertEquals(ADUANA_ID, min.getId());
    }

    @Test
    void testCalcularEstadoMinimo_LoteRecepcion() {
        GuiaMaster gm = GuiaMaster.builder().id(300L).trackingBase("BASE-1").build();
        Paquete paquete = Paquete.builder().id(100L).numeroGuia("GU-1").guiaMaster(gm).build();
        when(loteRecepcionGuiaRepository.existsByNumeroGuiaEnvioIgnoreCase("BASE-1")).thenReturn(true);

        EstadoRastreo min = service.calcularEstadoMinimoPaquete(paquete);
        assertEquals(BODEGA_ID, min.getId());
    }

    @Test
    void testCalcularEstadoMinimo_Despacho() {
        Despacho d = Despacho.builder().id(400L).numeroGuia("DESP-1").build();
        Saca s = Saca.builder().id(500L).despacho(d).build();
        Paquete paquete = Paquete.builder().id(100L).numeroGuia("GU-1").saca(s).build();

        EstadoRastreo min = service.calcularEstadoMinimoPaquete(paquete);
        assertEquals(DESPACHO_ID, min.getId());
    }

    @Test
    void testCalcularEstadoMinimo_Entrega() {
        Paquete paquete = Paquete.builder().id(100L).numeroGuia("GU-1").build();
        when(paqueteEstadoEventoRepository.findTopByPaqueteIdAndEstadoDestino_IdOrderByOccurredAtAscIdAsc(100L, ENTREGA_ID))
                .thenReturn(Optional.of(PaqueteEstadoEvento.builder().build()));

        EstadoRastreo min = service.calcularEstadoMinimoPaquete(paquete);
        assertEquals(ENTREGA_ID, min.getId());
    }

    @Test
    void testCalcularEstadoMinimo_ExclusionRevision() {
        Paquete paquete = Paquete.builder().id(100L).numeroGuia("GU-1").estadoRastreo(stAsociar).build();
        when(revisionPaqueteRepository.findActiva(100L, EstadoRevisionPaquete.EN_REVISION))
                .thenReturn(Optional.of(RevisionPaquete.builder().build()));

        // Sin revisión, mínimo sería REGISTRO_ID. Pero al estar en revisión, debe retornar su estado actual stAsociar.
        EstadoRastreo min = service.calcularEstadoMinimoPaquete(paquete);
        assertEquals(ASOCIAR_ID, min.getId());
    }

    @Test
    void testCalcularEstadoMinimo_ExclusionBloqueado() {
        Paquete paquete = Paquete.builder().id(100L).numeroGuia("GU-1").estadoRastreo(stAsociar).bloqueado(true).build();

        EstadoRastreo min = service.calcularEstadoMinimoPaquete(paquete);
        assertEquals(ASOCIAR_ID, min.getId());
    }

    @Test
    void testCalcularEstadoMinimo_ExclusionAlterno() {
        EstadoRastreo stAlterno = EstadoRastreo.builder().id(90L).codigo("RETENIDO_ADUANA").orden(5).ordenTracking(5).tipoFlujo(TipoFlujoEstado.ALTERNO).build();
        Paquete paquete = Paquete.builder().id(100L).numeroGuia("GU-1").estadoRastreo(stAlterno).build();

        EstadoRastreo min = service.calcularEstadoMinimoPaquete(paquete);
        assertEquals(stAlterno.getId(), min.getId());
    }

    @Test
    void testCalcularEstadoMinimo_NoDegradacion() {
        // Estado actual es BODEGA (6). target es ASOCIAR (2). Debe mantener BODEGA.
        EnvioConsolidado ec = EnvioConsolidado.builder().id(200L).codigo("CONS-1").estadoOperativo(EstadoEnvioConsolidadoOperativo.EN_PREPARACION).build();
        Paquete paquete = Paquete.builder().id(100L).numeroGuia("GU-1").envioConsolidado(ec).estadoRastreo(stBodega).build();

        EstadoRastreo min = service.calcularEstadoMinimoPaquete(paquete);
        assertEquals(BODEGA_ID, min.getId());
    }
}
