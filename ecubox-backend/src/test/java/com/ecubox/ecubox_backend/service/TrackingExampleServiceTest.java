package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.dto.TrackingResolveResponse;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.enums.TrackingTipo;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TrackingExampleServiceTest {

    @Mock private EstadoRastreoService estadoRastreoService;
    @Mock private ParametroSistemaService parametroSistemaService;

    private TrackingExampleService service;
    private EstadoRastreo recibido;
    private EstadoRastreo disponible;
    private EstadoRastreo retenido;

    @BeforeEach
    void setUp() {
        service = new TrackingExampleService(estadoRastreoService, parametroSistemaService);
        recibido = estado(10L, "RECIBIDO_CFG", "Recibido configurado", 1, TipoFlujoEstado.NORMAL, "Leyenda recibida");
        disponible = estado(20L, "LISTO_CFG", "Listo configurado", 2, TipoFlujoEstado.NORMAL, "Disponible hace {dias} días");
        retenido = estado(30L, "ALTERNO_CFG", "Incidencia configurada", 3, TipoFlujoEstado.ALTERNO, "Revisión configurada");
        retenido.setAfterEstado(recibido);
    }

    @Test
    void listar_yResolver_usandoCatalogoSinEstadosQuemados() {
        when(estadoRastreoService.findCatalogoPublicoEntities())
                .thenReturn(List.of(recibido, retenido, disponible));

        var ejemplos = service.listar();
        assertEquals(4, ejemplos.size());
        assertTrue(ejemplos.stream().anyMatch(e -> e.getCodigo().equals(TrackingExampleService.CODIGO_ALTERNO)));

        TrackingResolveResponse normal = service.resolver(TrackingExampleService.CODIGO_NORMAL);
        assertEquals(TrackingTipo.PIEZA, normal.getTipo());
        assertTrue(normal.getPieza().getEstados().stream()
                .anyMatch(e -> e.getCodigo().equals("RECIBIDO_CFG") && e.getNombre().equals("Recibido configurado")));
        assertFalse(normal.getPieza().getEstados().stream()
                .anyMatch(e -> e.getTipoFlujo() == TipoFlujoEstado.ALTERNO));
    }

    @Test
    void resolverOficina_derivaModalidadPlazoYLeyendaConfigurada() {
        when(estadoRastreoService.findCatalogoPublicoEntities())
                .thenReturn(List.of(recibido, disponible));
        when(parametroSistemaService.getEstadosRastreoPorPunto())
                .thenReturn(EstadosRastreoPorPuntoDTO.builder()
                        .estadoRastreoInicioCuentaRegresivaId(20L)
                        .build());

        var pieza = service.resolver(TrackingExampleService.CODIGO_OFICINA).getPieza();
        assertEquals("AGENCIA", pieza.getOperadorEntrega().getTipoEntrega());
        assertEquals(20L, pieza.getEstadoActualId());
        assertEquals("Disponible hace 2 días", pieza.getLeyenda());
        assertEquals(3, pieza.getDiasRestantes());
        assertNotNull(pieza.getFechaLimiteRetiro());
    }

    @Test
    void resolverAlterno_respetaAfterYNoCuentaAlternosComoBase() {
        when(estadoRastreoService.findCatalogoPublicoEntities())
                .thenReturn(List.of(recibido, retenido, disponible));

        var pieza = service.resolver(TrackingExampleService.CODIGO_ALTERNO).getPieza();
        assertEquals("ALTERNO", pieza.getFlujoActual());
        assertTrue(pieza.getBloqueado());
        var alterno = pieza.getEstados().stream().filter(e -> e.isEsActual()).findFirst().orElseThrow();
        assertEquals(10L, alterno.getAfterEstadoId());
        assertEquals(1, pieza.getEstados().stream()
                .filter(e -> e.getTipoFlujo() != TipoFlujoEstado.ALTERNO)
                .filter(e -> e.getFechaOcurrencia() != null)
                .count());
    }

    @Test
    void sinAlternos_omiteEscenarioExcepcion() {
        when(estadoRastreoService.findCatalogoPublicoEntities())
                .thenReturn(List.of(recibido, disponible));

        assertEquals(3, service.listar().size());
        assertThrows(ResourceNotFoundException.class,
                () -> service.resolver(TrackingExampleService.CODIGO_ALTERNO));
    }

    @Test
    void sinEstados_devuelveListaVaciaYNoInventaEjemplo() {
        when(estadoRastreoService.findCatalogoPublicoEntities()).thenReturn(List.of());

        assertTrue(service.listar().isEmpty());
        assertThrows(ResourceNotFoundException.class,
                () -> service.resolver(TrackingExampleService.CODIGO_NORMAL));
    }

    @Test
    void master_resuelvePiezasSinteticasSinRepositoriosDeNegocio() {
        when(estadoRastreoService.findCatalogoPublicoEntities())
                .thenReturn(List.of(recibido, disponible));

        var master = service.resolver(TrackingExampleService.CODIGO_MASTER).getMaster();
        assertEquals(2, master.getPiezas().size());
        assertEquals("DEMO-MASTER 1/2", master.getPiezas().get(0).getNumeroGuia());
        assertEquals("Cliente de demostración", master.getConsignatario().getNombre());
    }

    private static EstadoRastreo estado(Long id,
                                        String codigo,
                                        String nombre,
                                        int orden,
                                        TipoFlujoEstado flujo,
                                        String leyenda) {
        return EstadoRastreo.builder()
                .id(id)
                .codigo(codigo)
                .nombre(nombre)
                .orden(orden)
                .ordenTracking(orden)
                .activo(true)
                .publicoTracking(true)
                .tipoFlujo(flujo)
                .leyenda(leyenda)
                .build();
    }
}
