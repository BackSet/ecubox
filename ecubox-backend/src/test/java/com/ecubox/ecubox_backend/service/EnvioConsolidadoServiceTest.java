package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.AvanceEstadosConsolidadosPreviewDTO;
import com.ecubox.ecubox_backend.dto.AvanceEstadosConsolidadosRequest;
import com.ecubox.ecubox_backend.dto.AvanceEstadosConsolidadosResponse;
import com.ecubox.ecubox_backend.dto.EnvioConsolidadoCreateResponse;
import com.ecubox.ecubox_backend.dto.EnvioConsolidadoResumenDTO;
import com.ecubox.ecubox_backend.dto.EstadoRastreoDTO;
import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import com.ecubox.ecubox_backend.entity.GuiaMaster;
import com.ecubox.ecubox_backend.enums.EstadoEnvioConsolidadoOperativo;
import com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.entity.Liquidacion;
import com.ecubox.ecubox_backend.entity.LiquidacionConsolidadoLinea;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ConflictException;
import com.ecubox.ecubox_backend.repository.EnvioConsolidadoRepository;
import com.ecubox.ecubox_backend.repository.LiquidacionConsolidadoLineaRepository;
import com.ecubox.ecubox_backend.repository.LoteRecepcionGuiaRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EnvioConsolidadoServiceTest {

    @Mock private EnvioConsolidadoRepository envioRepository;
    @Mock private PaqueteRepository paqueteRepository;
    @Mock private PaqueteService paqueteService;
    @Mock private LiquidacionConsolidadoLineaRepository liquidacionConsolidadoLineaRepository;
    @Mock private LoteRecepcionGuiaRepository loteRecepcionGuiaRepository;
    @Mock private EstadoConsolidadoOperativoResolver estadoConsolidadoOperativoResolver;
    @Mock private EstadoRastreoService estadoRastreoService;
    @Mock private ParametroSistemaService parametroSistemaService;

    private EnvioConsolidadoService service;

    // public + nombre estandar JUnit: algunos analizadores estaticos no
    // detectan @BeforeEach en metodos package-private y reportan setUp()
    // como "unused". Hacerlo public satisface al inspector sin afectar
    // el comportamiento de JUnit.
    @BeforeEach
    public void setUp() {
        service = new EnvioConsolidadoService(
                envioRepository,
                paqueteRepository,
                paqueteService,
                liquidacionConsolidadoLineaRepository,
                loteRecepcionGuiaRepository,
                estadoConsolidadoOperativoResolver,
                estadoRastreoService,
                parametroSistemaService);
        lenient().when(envioRepository.save(any(EnvioConsolidado.class)))
                .thenAnswer(inv -> {
                    EnvioConsolidado e = inv.getArgument(0);
                    if (e.getId() == null) e.setId(99L);
                    return e;
                });
        lenient().when(paqueteRepository.countByEnvioConsolidadoId(anyLong())).thenReturn(1L);
        lenient().when(paqueteRepository.sumPesoLbsByEnvioConsolidadoId(anyLong())).thenReturn(BigDecimal.ZERO);
        lenient().when(paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(anyLong()))
                .thenReturn(List.of());
    }

    @Test
    void resumen_agrupaConteosPorEstadoOperativoYPago() {
        when(envioRepository.countAgrupadoPorEstadoOperativo()).thenReturn(List.of(
                new Object[]{EstadoEnvioConsolidadoOperativo.EN_PREPARACION, 3L},
                new Object[]{EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA, 2L}));
        when(envioRepository.countAgrupadoPorEstadoPago()).thenReturn(List.of(
                new Object[]{EstadoPagoConsolidado.PAGADO, 1L},
                new Object[]{EstadoPagoConsolidado.NO_PAGADO, 4L}));

        EnvioConsolidadoResumenDTO resumen = service.resumen();

        assertEquals(5L, resumen.getTotal());
        assertEquals(3L, resumen.getPorOperativo().get(EstadoEnvioConsolidadoOperativo.EN_PREPARACION));
        assertEquals(2L, resumen.getPorOperativo().get(EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA));
        // Los estados sin filas en el GROUP BY quedan en cero, no ausentes.
        assertEquals(0L, resumen.getPorOperativo().get(EstadoEnvioConsolidadoOperativo.VACIO));
        assertEquals(1L, resumen.getPagados());
        assertEquals(4L, resumen.getNoPagados());
    }

    @Test
    void crear_devuelveEnvioAbiertoSinFechaCerrado() {
        when(envioRepository.existsByCodigoIgnoreCase("ABC")).thenReturn(false);

        EnvioConsolidado res = service.crear("ABC", 1L);

        assertEquals("ABC", res.getCodigo());
        assertNull(res.getFechaCerrado(), "envio recien creado debe estar abierto");
        assertTrue(res.isAbierto());
        assertFalse(res.isCerrado());
    }

    @Test
    void crearConGuias_todasEncontradas_asociaPaquetesYNoEncontradasVacio() {
        when(envioRepository.existsByCodigoIgnoreCase("ENV-1")).thenReturn(false);
        Paquete p1 = Paquete.builder().id(10L).numeroGuia("ABC 1/2").build();
        Paquete p2 = Paquete.builder().id(11L).numeroGuia("ABC 2/2").build();
        when(paqueteRepository.findByNumeroGuiaInIgnoreCase(List.of("abc 1/2", "abc 2/2")))
                .thenReturn(List.of(p1, p2));
        when(paqueteRepository.findAllById(any())).thenReturn(List.of(p1, p2));
        when(envioRepository.findById(anyLong())).thenAnswer(inv -> Optional.of(EnvioConsolidado.builder()
                .id(inv.getArgument(0)).codigo("ENV-1").build()));

        EnvioConsolidadoCreateResponse res = service.crearConGuias(
                "ENV-1", List.of("ABC 1/2", "ABC 2/2"), 7L);

        assertNotNull(res.getEnvio());
        assertEquals("ENV-1", res.getEnvio().getCodigo());
        assertFalse(res.getEnvio().isCerrado(), "envio recien creado nunca esta cerrado");
        assertTrue(res.getGuiasNoEncontradas().isEmpty(), "todas deberian encontrarse");
    }

    @Test
    void crearConGuias_parcial_devuelveLasNoEncontradasYCreaIgual() {
        when(envioRepository.existsByCodigoIgnoreCase("ENV-2")).thenReturn(false);
        Paquete p1 = Paquete.builder().id(10L).numeroGuia("OK 1/1").build();
        when(paqueteRepository.findByNumeroGuiaInIgnoreCase(List.of("ok 1/1", "fantasma")))
                .thenReturn(List.of(p1));
        when(paqueteRepository.findAllById(any())).thenReturn(List.of(p1));
        when(envioRepository.findById(anyLong())).thenAnswer(inv -> Optional.of(EnvioConsolidado.builder()
                .id(inv.getArgument(0)).codigo("ENV-2").build()));

        EnvioConsolidadoCreateResponse res = service.crearConGuias(
                "ENV-2", List.of("OK 1/1", "FANTASMA"), 7L);

        assertEquals("ENV-2", res.getEnvio().getCodigo());
        assertEquals(List.of("FANTASMA"), res.getGuiasNoEncontradas());
    }

    @Test
    void crearConGuias_codigoDuplicado_lanzaConflictYNoBuscaPaquetes() {
        when(envioRepository.existsByCodigoIgnoreCase("DUP")).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class,
                () -> service.crearConGuias("DUP", List.of("X"), 1L));
        assertNotNull(ex);
        verify(paqueteRepository, never()).findByNumeroGuiaInIgnoreCase(anyList());
    }

    @Test
    void agregarPaquetes_envioCerrado_lanzaConflict() {
        // "Cerrado" se determina por el estado operativo persistido (no por fechaCerrado).
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("X")
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA).build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(envio));

        ConflictException ex = assertThrows(ConflictException.class,
                () -> service.agregarPaquetes(1L, List.of(10L)));
        // Mensaje-contrato: indica acción bloqueada, regla y estado actual.
        assertTrue(ex.getMessage().contains("No se pueden agregar paquetes"));
        assertTrue(ex.getMessage().contains("ENVIADO_DESDE_USA"));
        assertTrue(ex.getMessage().contains("solo los envíos en preparación"));
    }

    @Test
    void removerPaquetes_envioCerrado_lanzaConflict() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("X")
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA).build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(envio));

        ConflictException ex = assertThrows(ConflictException.class,
                () -> service.removerPaquetes(1L, List.of(10L)));
        assertNotNull(ex);
    }

    @Test
    void enviarDesdeUsa_envioCerrado_marcaEnviadoYFecha() {
        // enviarDesdeUsa solo opera desde CERRADO; marca ENVIADO_DESDE_USA y setea fechaCerrado.
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("X")
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.CERRADO).build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(envio));

        EnvioConsolidado res = service.enviarDesdeUsa(1L, null);

        assertEquals(EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA, res.getEstadoOperativo());
        assertNotNull(res.getFechaCerrado(), "enviar desde USA debe setear fechaCerrado");
        assertTrue(res.isCerrado());
        verify(envioRepository).save(envio);
    }

    @Test
    void enviarDesdeUsa_envioNoCerrado_lanzaBadRequest() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("X")
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.EN_PREPARACION).build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(envio));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.enviarDesdeUsa(1L, null));
        assertTrue(ex.getMessage().contains("no está cerrado"));
        assertTrue(ex.getMessage().contains("EN_PREPARACION"));
        verify(envioRepository, never()).save(any());
    }

    @Test
    void cerrarConsolidado_estadoIncorrecto_mensajeIndicaReglaYEstadoActual() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("X")
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA).build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(envio));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.cerrarConsolidado(1L));
        assertTrue(ex.getMessage().contains("No se puede cerrar"));
        assertTrue(ex.getMessage().contains("ENVIADO_DESDE_USA"));
    }

    @Test
    void cerrarConsolidado_sinPaquetes_rechazaConMensajeDeNegocio() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("VACIO")
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.EN_PREPARACION).build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(envio));
        when(paqueteRepository.countByEnvioConsolidadoId(1L)).thenReturn(0L);

        ConflictException ex = assertThrows(
                ConflictException.class,
                () -> service.cerrarConsolidado(1L));

        assertEquals(
                "El consolidado debe contener al menos un paquete para cambiar de estado.",
                ex.getMessage());
        verify(envioRepository, never()).save(any());
    }

    @Test
    void cerrarConsolidado_guiaMasterSinPiezas_noCuentaComoPaquete() {
        GuiaMaster guiaVacia = GuiaMaster.builder().id(50L).trackingBase("GM-VACIA").build();
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("GUIA-VACIA")
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.EN_PREPARACION).build();
        assertNotNull(guiaVacia);
        when(envioRepository.findById(1L)).thenReturn(Optional.of(envio));
        when(paqueteRepository.countByEnvioConsolidadoId(1L)).thenReturn(0L);

        assertThrows(ConflictException.class, () -> service.cerrarConsolidado(1L));

        verify(envioRepository, never()).save(any());
    }

    @Test
    void cerrarConsolidado_conPaquete_permiteAvanzar() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("CON-PAQUETE")
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.EN_PREPARACION).build();
        Paquete paquete = Paquete.builder().id(10L).envioConsolidado(envio).build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(envio));
        when(paqueteRepository.countByEnvioConsolidadoId(1L)).thenReturn(1L);
        when(paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(1L))
                .thenReturn(List.of(paquete));

        EnvioConsolidado resultado = service.cerrarConsolidado(1L);

        assertEquals(EstadoEnvioConsolidadoOperativo.CERRADO, resultado.getEstadoOperativo());
        verify(paqueteService).aplicarEstadoCierreConsolidado(List.of(10L), resultado.getFechaCierre());
    }

    @Test
    void cerrarConsolidado_estadoNulo_rechaza() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("SIN-ESTADO").estadoOperativo(null).build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(envio));
        when(paqueteRepository.countByEnvioConsolidadoId(1L)).thenReturn(1L);

        ConflictException ex = assertThrows(
                ConflictException.class,
                () -> service.cerrarConsolidado(1L));

        assertTrue(ex.getMessage().contains("estado operativo válido"));
        verify(envioRepository, never()).save(any());
    }

    @Test
    void cancelarConsolidado_liquidado_mensajeIndicaReglaYEstadoActual() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("X")
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.LIQUIDADO).build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(envio));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.cancelarConsolidado(1L));
        assertTrue(ex.getMessage().contains("No se puede cancelar"));
        assertTrue(ex.getMessage().contains("LIQUIDADO"));
        verify(envioRepository, never()).save(any());
    }

    @Test
    void reabrir_consolidadoEnLiquidacionPagada_bloqueaConMensajeAccionable() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("X")
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA)
                .fechaCerrado(LocalDateTime.now()).build();
        Liquidacion liq = Liquidacion.builder()
                .id(50L).codigo("LIQ-2026-0001")
                .estadoPago(EstadoPagoConsolidado.PAGADO).build();
        LiquidacionConsolidadoLinea linea = LiquidacionConsolidadoLinea.builder()
                .id(60L).liquidacion(liq).envioConsolidado(envio).build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(envio));
        when(liquidacionConsolidadoLineaRepository.findByEnvioConsolidadoId(1L))
                .thenReturn(Optional.of(linea));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.reabrir(1L));
        assertTrue(ex.getMessage().contains("No se puede reabrir"));
        assertTrue(ex.getMessage().contains("LIQ-2026-0001"));
        assertTrue(ex.getMessage().contains("Desmarca el pago"));
        verify(envioRepository, never()).save(any());
    }

    @Test
    void agregarPaquetes_sinSeleccion_mensajeAccionable() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("X")
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.EN_PREPARACION).build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(envio));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.agregarPaquetes(1L, List.of()));
        assertTrue(ex.getMessage().contains("no se seleccionó ninguno"));
        assertTrue(ex.getMessage().contains("Selecciona al menos un paquete"));
    }

    @Test
    void reabrir_envioEnviadoDesdeUsa_limpiaFechaCerradoYVuelveAPreparacion() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("X")
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA)
                .fechaCerrado(LocalDateTime.now()).build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(envio));

        EnvioConsolidado res = service.reabrir(1L);

        assertNull(res.getFechaCerrado());
        assertEquals(EstadoEnvioConsolidadoOperativo.EN_PREPARACION, res.getEstadoOperativo());
        assertTrue(res.isAbierto());
    }

    @Test
    void agregarPaquetes_paqueteEnEnvioYaCerrado_lanzaConflict() {
        EnvioConsolidado destino = EnvioConsolidado.builder().id(1L).codigo("DEST").build();
        EnvioConsolidado origenCerrado = EnvioConsolidado.builder()
                .id(2L).codigo("ORIG-CERRADO")
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA).build();
        Paquete p = Paquete.builder().id(10L).numeroGuia("ABC 1/1")
                .envioConsolidado(origenCerrado).build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(destino));
        when(paqueteRepository.findAllById(any())).thenReturn(List.of(p));

        ConflictException ex = assertThrows(ConflictException.class,
                () -> service.agregarPaquetes(1L, List.of(10L)));
        assertNotNull(ex);
    }

    @Test
    void findDisponiblesParaRecepcion_delegaAlRepositorioConPageableYTrim() {
        EnvioConsolidado a = EnvioConsolidado.builder().id(1L).codigo("ENV-A").build();
        EnvioConsolidado b = EnvioConsolidado.builder().id(2L).codigo("ENV-B")
                .fechaCerrado(LocalDateTime.now()).build();
        Pageable expectedPageable = PageRequest.of(0, 50);
        Page<EnvioConsolidado> page = new PageImpl<>(List.of(a, b), expectedPageable, 2L);
        when(envioRepository.findDisponiblesParaRecepcion("env", expectedPageable)).thenReturn(page);

        Page<EnvioConsolidado> res = service.findDisponiblesParaRecepcion("  env  ", 0, 50);

        assertEquals(2, res.getContent().size());
        assertSame(a, res.getContent().get(0));
        assertSame(b, res.getContent().get(1), "el filtro debe ser ortogonal a cerrado");
    }

    @Test
    void findDisponiblesParaRecepcion_qNuloOEnBlanco_pasaCadenaVacia() {
        Pageable expectedPageable = PageRequest.of(0, 50);
        when(envioRepository.findDisponiblesParaRecepcion("", expectedPageable))
                .thenReturn(new PageImpl<>(List.of(), expectedPageable, 0L));

        service.findDisponiblesParaRecepcion(null, 0, 50);
        service.findDisponiblesParaRecepcion("   ", 0, 50);

        verify(envioRepository, org.mockito.Mockito.times(2))
                .findDisponiblesParaRecepcion("", expectedPageable);
    }

    @Test
    void listarCandidatosAvanceEstados_usaEstadosDelFlujoYRepositorioSinDuplicados() {
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("CANDIDATO")
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.EN_PREPARACION).build();
        when(envioRepository.findCandidatosAvanceEstados(anyList())).thenReturn(List.of(envio));

        List<EnvioConsolidado> resultado = service.listarCandidatosAvanceEstados();

        assertEquals(List.of(envio), resultado);
        verify(envioRepository).findCandidatosAvanceEstados(argThat(estados ->
                estados.contains(EstadoEnvioConsolidadoOperativo.EN_PREPARACION)
                        && estados.contains(EstadoEnvioConsolidadoOperativo.CERRADO)
                        && !estados.contains(EstadoEnvioConsolidadoOperativo.VACIO)
                        && !estados.contains(EstadoEnvioConsolidadoOperativo.CANCELADO)
                        && !estados.contains(EstadoEnvioConsolidadoOperativo.LIQUIDADO)));
    }

    @Test
    void agregarPaquetes_paqueteEnEnvioAbierto_permiteReasignar() {
        EnvioConsolidado destino = EnvioConsolidado.builder().id(1L).codigo("DEST").build();
        EnvioConsolidado origenAbierto = EnvioConsolidado.builder().id(2L).codigo("ORIG").build();
        Paquete p = Paquete.builder().id(10L).numeroGuia("ABC 1/1")
                .envioConsolidado(origenAbierto).build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(destino));
        when(paqueteRepository.findAllById(any())).thenReturn(List.of(p));

        EnvioConsolidado res = service.agregarPaquetes(1L, List.of(10L));

        assertSame(destino, p.getEnvioConsolidado(), "paquete debe quedar reasignado al destino");
        assertEquals(1L, res.getId());
    }

    @Test
    void agregarPaquetes_consolidadoEnLoteRecepcion_aplicaEstadoEnPaquetes() {
        LocalDateTime fechaLote = LocalDateTime.now().minusDays(1);
        EnvioConsolidado destino = EnvioConsolidado.builder().id(1L).codigo("CONS-LOTE").build();
        Paquete p = Paquete.builder().id(10L).numeroGuia("ABC 1/1").build();
        when(envioRepository.findById(1L)).thenReturn(Optional.of(destino));
        when(paqueteRepository.findAllById(any())).thenReturn(List.of(p));
        when(loteRecepcionGuiaRepository.existsByNumeroGuiaEnvioIgnoreCase("CONS-LOTE")).thenReturn(true);
        when(loteRecepcionGuiaRepository.findMinFechaRecepcionByNumeroGuiaEnvioIgnoreCase("CONS-LOTE"))
                .thenReturn(Optional.of(fechaLote));

        service.agregarPaquetes(1L, List.of(10L));

        verify(paqueteService).aplicarEstadoEnLoteRecepcion(
                argThat(ids -> ids.size() == 1 && ids.contains(10L)),
                eq(fechaLote));
    }

    @Test
    void previewAvanceEstados_incluyeTodosLosPasosActivosYEfectosConfigurados() {
        EstadoRastreo inicial = estado(10L, "Asociado", 10);
        EstadoRastreo cierre = estado(20L, "Cierre", 20);
        EstadoRastreo intermedio = estado(30L, "Control", 30);
        EstadoRastreo salida = estado(40L, "Salida", 40);
        EstadoRastreo limite = estado(50L, "Recepción", 50);
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("CONS-1").version(3L)
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.EN_PREPARACION).build();
        Paquete paquete = Paquete.builder()
                .id(11L).numeroGuia("PK-1").version(4L)
                .envioConsolidado(envio).estadoRastreo(inicial).build();
        configurarSecuencia(inicial, cierre, intermedio, salida, limite);
        when(envioRepository.findAllById(List.of(1L))).thenReturn(List.of(envio));
        when(paqueteRepository.findByEnvioConsolidadoIdInWithEstado(List.of(1L)))
                .thenReturn(List.of(paquete));

        AvanceEstadosConsolidadosPreviewDTO preview = service.previewAvanceEstados(
                AvanceEstadosConsolidadosRequest.builder()
                        .consolidadoIds(List.of(1L))
                        .estadoFinalId(salida.getId())
                        .fechaPrincipal(LocalDateTime.now().minusHours(1))
                        .build());

        assertEquals(List.of(20L, 30L, 40L),
                preview.getPasos().stream().map(AvanceEstadosConsolidadosPreviewDTO.Paso::getEstadoId).toList());
        assertEquals(EstadoEnvioConsolidadoOperativo.CERRADO,
                preview.getPasos().get(0).getEfectoOperativo());
        assertNull(preview.getPasos().get(1).getEfectoOperativo());
        assertEquals(EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA,
                preview.getPasos().get(2).getEfectoOperativo());
        assertEquals(3, preview.getResumen().getTotalEventosPrevistos());
        assertEquals(EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA,
                preview.getConsolidados().getFirst().getEstadoOperativoFinal());
        assertNotNull(preview.getPreviewToken());
    }

    @Test
    void previewAvanceEstados_conEstadoFinalEnLoteRecepcion_seRechaza() {
        // "Recepción" (limite) es el estado de llegada a bodega: lo aplica el
        // flujo de lote de recepción, no el avance automático. No debe poder
        // seleccionarse como estado final.
        EstadoRastreo inicial = estado(10L, "Asociado", 10);
        EstadoRastreo limite = estado(50L, "Recepción", 50);
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("CONS-1").version(3L)
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.EN_PREPARACION).build();
        Paquete paquete = Paquete.builder()
                .id(11L).numeroGuia("PK-1").version(4L)
                .envioConsolidado(envio).estadoRastreo(inicial).build();
        EstadosRastreoPorPuntoDTO config = EstadosRastreoPorPuntoDTO.builder()
                .estadoRastreoAsociarEnvioConsolidadoId(inicial.getId())
                .estadoRastreoEnLoteRecepcionId(limite.getId())
                .build();
        when(parametroSistemaService.getEstadosRastreoPorPunto()).thenReturn(config);
        when(estadoRastreoService.findEntityById(inicial.getId())).thenReturn(inicial);
        when(estadoRastreoService.findEntityById(limite.getId())).thenReturn(limite);
        when(envioRepository.findAllById(List.of(1L))).thenReturn(List.of(envio));
        when(paqueteRepository.findByEnvioConsolidadoIdInWithEstado(List.of(1L)))
                .thenReturn(List.of(paquete));

        ConflictException ex = assertThrows(ConflictException.class, () -> service.previewAvanceEstados(
                AvanceEstadosConsolidadosRequest.builder()
                        .consolidadoIds(List.of(1L))
                        .estadoFinalId(limite.getId())
                        .fechaPrincipal(LocalDateTime.now().minusHours(1))
                        .build()));
        assertTrue(ex.getMessage().contains("lote de recepción"));
    }

    @Test
    void listarDestinosAvanceEstados_excluyeEstadoDeLlegadaABodega() {
        EstadoRastreo inicial = estado(10L, "Asociado", 10);
        EstadoRastreo cierre = estado(20L, "Cierre", 20);
        EstadoRastreo salida = estado(40L, "Salida", 40);
        EstadoRastreo limite = estado(50L, "Recepción", 50);
        EstadosRastreoPorPuntoDTO config = EstadosRastreoPorPuntoDTO.builder()
                .estadoRastreoAsociarEnvioConsolidadoId(inicial.getId())
                .estadoRastreoEnLoteRecepcionId(limite.getId())
                .build();
        when(parametroSistemaService.getEstadosRastreoPorPunto()).thenReturn(config);
        when(estadoRastreoService.findEntityById(inicial.getId())).thenReturn(inicial);
        when(estadoRastreoService.findEntityById(limite.getId())).thenReturn(limite);
        when(estadoRastreoService.findActivos()).thenReturn(List.of(
                dtoDe(inicial), dtoDe(cierre), dtoDe(salida), dtoDe(limite)));

        List<EstadoRastreoDTO> destinos = service.listarDestinosAvanceEstados();

        List<Long> ids = destinos.stream().map(EstadoRastreoDTO::getId).toList();
        assertTrue(ids.contains(20L) && ids.contains(40L), "incluye estados intermedios");
        assertFalse(ids.contains(50L), "excluye el estado de llegada a bodega (lote de recepción)");
        assertFalse(ids.contains(10L), "excluye el estado base de asociación");
    }

    @Test
    void aplicarAvanceEstados_conPreviewVigente_aplicaSecuenciaCompletaYEstadoOperativo() {
        EstadoRastreo inicial = estado(10L, "Asociado", 10);
        EstadoRastreo cierre = estado(20L, "Cierre", 20);
        EstadoRastreo intermedio = estado(30L, "Control", 30);
        EstadoRastreo salida = estado(40L, "Salida", 40);
        EstadoRastreo limite = estado(50L, "Recepción", 50);
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .id(1L).codigo("CONS-1").version(3L)
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.EN_PREPARACION).build();
        Paquete paquete = Paquete.builder()
                .id(11L).numeroGuia("PK-1").version(4L)
                .envioConsolidado(envio).estadoRastreo(inicial).build();
        configurarSecuencia(inicial, cierre, intermedio, salida, limite);
        when(envioRepository.findAllById(List.of(1L))).thenReturn(List.of(envio));
        when(paqueteRepository.findByEnvioConsolidadoIdInWithEstado(List.of(1L)))
                .thenReturn(List.of(paquete));
        when(envioRepository.findAllByIdForUpdate(List.of(1L))).thenReturn(List.of(envio));
        when(paqueteRepository.findByEnvioConsolidadoIdInWithEstadoForUpdate(List.of(1L)))
                .thenReturn(List.of(paquete));
        LocalDateTime fecha = LocalDateTime.now().minusHours(1);
        AvanceEstadosConsolidadosRequest request = AvanceEstadosConsolidadosRequest.builder()
                .consolidadoIds(List.of(1L)).estadoFinalId(salida.getId()).fechaPrincipal(fecha).build();
        String token = service.previewAvanceEstados(request).getPreviewToken();
        request.setPreviewToken(token);

        AvanceEstadosConsolidadosResponse response = service.aplicarAvanceEstados(request);

        assertEquals(3, response.getPasosAplicados());
        assertEquals(3, response.getEventosCreados());
        assertEquals(EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA, envio.getEstadoOperativo());
        assertEquals(fecha, envio.getFechaCierre());
        assertEquals(fecha, envio.getFechaCerrado());
        verify(paqueteService).aplicarEstadoSecuenciaConsolidados(anyList(), eq(cierre), eq(fecha), any());
        verify(paqueteService).aplicarEstadoSecuenciaConsolidados(anyList(), eq(intermedio), eq(fecha), any());
        verify(paqueteService).aplicarEstadoSecuenciaConsolidados(anyList(), eq(salida), eq(fecha), any());
    }

    @Test
    void previewAvanceEstados_rechazaConsolidadosConEstadoInicialDistinto() {
        EstadoRastreo inicialA = estado(10L, "Inicial A", 10);
        EstadoRastreo inicialB = estado(20L, "Inicial B", 20);
        EnvioConsolidado envioA = EnvioConsolidado.builder().id(1L).codigo("A").version(1L)
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.EN_PREPARACION).build();
        EnvioConsolidado envioB = EnvioConsolidado.builder().id(2L).codigo("B").version(1L)
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.EN_PREPARACION).build();
        Paquete paqueteA = Paquete.builder().id(11L).version(1L)
                .envioConsolidado(envioA).estadoRastreo(inicialA).build();
        Paquete paqueteB = Paquete.builder().id(22L).version(1L)
                .envioConsolidado(envioB).estadoRastreo(inicialB).build();
        when(envioRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(envioA, envioB));
        when(paqueteRepository.findByEnvioConsolidadoIdInWithEstado(List.of(1L, 2L)))
                .thenReturn(List.of(paqueteA, paqueteB));

        ConflictException ex = assertThrows(ConflictException.class, () -> service.previewAvanceEstados(
                AvanceEstadosConsolidadosRequest.builder()
                        .consolidadoIds(List.of(1L, 2L))
                        .estadoFinalId(30L)
                        .fechaPrincipal(LocalDateTime.now().minusHours(1))
                        .build()));

        assertTrue(ex.getMessage().contains("mismo estado inicial"));
        verify(estadoRastreoService, never()).findEntityById(anyLong());
    }

    @Test
    void aplicarTransicionOperativa_loteValido_actualizaTodos() {
        EnvioConsolidado envioA = EnvioConsolidado.builder()
                .id(1L).codigo("A")
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.EN_PREPARACION).build();
        EnvioConsolidado envioB = EnvioConsolidado.builder()
                .id(2L).codigo("B")
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.EN_PREPARACION).build();
        Paquete paqueteA = Paquete.builder().id(11L).envioConsolidado(envioA).build();
        Paquete paqueteB = Paquete.builder().id(22L).envioConsolidado(envioB).build();
        when(envioRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(envioA, envioB));
        when(paqueteRepository.findByEnvioConsolidadoIdInWithEstado(List.of(1L, 2L)))
                .thenReturn(List.of(paqueteA, paqueteB));
        when(envioRepository.findById(1L)).thenReturn(Optional.of(envioA));
        when(envioRepository.findById(2L)).thenReturn(Optional.of(envioB));
        when(paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(1L))
                .thenReturn(List.of(paqueteA));
        when(paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(2L))
                .thenReturn(List.of(paqueteB));

        var respuesta = service.aplicarTransicionOperativa(
                "CERRADO", List.of(1L, 2L), null, null);

        assertEquals(2, respuesta.getConsolidadosProcesados());
        assertTrue(respuesta.getRechazados().isEmpty());
        assertEquals(EstadoEnvioConsolidadoOperativo.CERRADO, envioA.getEstadoOperativo());
        assertEquals(EstadoEnvioConsolidadoOperativo.CERRADO, envioB.getEstadoOperativo());
        verify(envioRepository, times(2)).save(any(EnvioConsolidado.class));
    }

    @Test
    void aplicarTransicionOperativa_conUnConsolidadoVacio_noActualizaNinguno() {
        EnvioConsolidado valido = EnvioConsolidado.builder()
                .id(1L).codigo("VALIDO")
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.EN_PREPARACION).build();
        EnvioConsolidado vacio = EnvioConsolidado.builder()
                .id(2L).codigo("VACIO")
                .estadoOperativo(EstadoEnvioConsolidadoOperativo.EN_PREPARACION).build();
        Paquete paquete = Paquete.builder().id(11L).envioConsolidado(valido).build();
        when(envioRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(valido, vacio));
        when(paqueteRepository.findByEnvioConsolidadoIdInWithEstado(List.of(1L, 2L)))
                .thenReturn(List.of(paquete));

        ConflictException ex = assertThrows(
                ConflictException.class,
                () -> service.aplicarTransicionOperativa(
                        "CERRADO", List.of(1L, 2L), null, null));

        assertEquals(
                "El consolidado debe contener al menos un paquete para cambiar de estado.",
                ex.getMessage());
        assertEquals(EstadoEnvioConsolidadoOperativo.EN_PREPARACION, valido.getEstadoOperativo());
        verify(envioRepository, never()).save(any());
        verify(paqueteService, never()).aplicarEstadoCierreConsolidado(anyList(), any());
    }

    private void configurarSecuencia(
            EstadoRastreo inicial,
            EstadoRastreo cierre,
            EstadoRastreo intermedio,
            EstadoRastreo salida,
            EstadoRastreo limite) {
        EstadosRastreoPorPuntoDTO config = EstadosRastreoPorPuntoDTO.builder()
                .estadoRastreoAsociarEnvioConsolidadoId(inicial.getId())
                .estadoRastreoEnLoteRecepcionId(limite.getId())
                .estadoRastreoCierreConsolidadoId(cierre.getId())
                .estadoRastreoEnviadoDesdeUsaId(salida.getId())
                .build();
        when(parametroSistemaService.getEstadosRastreoPorPunto()).thenReturn(config);
        when(estadoRastreoService.findEntityById(anyLong())).thenAnswer(invocation -> {
            Long id = invocation.getArgument(0);
            return List.of(inicial, cierre, intermedio, salida, limite).stream()
                    .filter(estado -> estado.getId().equals(id))
                    .findFirst()
                    .orElseThrow();
        });
        when(estadoRastreoService.findActivosEntities())
                .thenReturn(List.of(salida, inicial, intermedio, cierre, limite));
    }

    private EstadoRastreo estado(Long id, String nombre, int orden) {
        return EstadoRastreo.builder()
                .id(id).codigo("EST-" + id).nombre(nombre)
                .orden(orden).ordenTracking(orden).activo(true)
                .tipoFlujo(TipoFlujoEstado.NORMAL).build();
    }

    private EstadoRastreoDTO dtoDe(EstadoRastreo e) {
        return EstadoRastreoDTO.builder()
                .id(e.getId()).codigo(e.getCodigo()).nombre(e.getNombre())
                .orden(e.getOrden()).ordenTracking(e.getOrdenTracking())
                .activo(e.getActivo()).tipoFlujo(e.getTipoFlujo()).build();
    }
}
