package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.dto.TrackingConsignatarioDTO;
import com.ecubox.ecubox_backend.dto.TrackingEstadoItemDTO;
import com.ecubox.ecubox_backend.dto.TrackingExampleItemDTO;
import com.ecubox.ecubox_backend.dto.TrackingMasterEventoItem;
import com.ecubox.ecubox_backend.dto.TrackingMasterResponse;
import com.ecubox.ecubox_backend.dto.TrackingOperadorEntregaDTO;
import com.ecubox.ecubox_backend.dto.TrackingPiezaItem;
import com.ecubox.ecubox_backend.dto.TrackingResolveResponse;
import com.ecubox.ecubox_backend.dto.TrackingResponse;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.enums.EstadoGuiaMaster;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.enums.TrackingTipo;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/**
 * Construye demostraciones públicas exclusivamente con catálogo/configuración y
 * datos ficticios. No consulta paquetes, guías, consignatarios ni despachos.
 */
@Service
public class TrackingExampleService {

    public static final String CODIGO_MASTER = "DEMO-MASTER";
    public static final String CODIGO_NORMAL = "DEMO-PIEZA";
    public static final String CODIGO_OFICINA = "DEMO-OFICINA";
    public static final String CODIGO_ALTERNO = "DEMO-ALTERNO";

    private static final ZoneId ZONA_ECUADOR = ZoneId.of("America/Guayaquil");
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_DATE_TIME;

    private final EstadoRastreoService estadoRastreoService;
    private final ParametroSistemaService parametroSistemaService;

    public TrackingExampleService(EstadoRastreoService estadoRastreoService,
                                  ParametroSistemaService parametroSistemaService) {
        this.estadoRastreoService = estadoRastreoService;
        this.parametroSistemaService = parametroSistemaService;
    }

    @Transactional(readOnly = true)
    public List<TrackingExampleItemDTO> listar() {
        Catalogo catalogo = catalogo();
        if (catalogo.bases().isEmpty()) {
            return List.of();
        }
        List<TrackingExampleItemDTO> ejemplos = new ArrayList<>();
        ejemplos.add(item(CODIGO_MASTER, "Guía master", "Vista agregada de una guía ficticia con varias piezas.", TrackingTipo.GUIA_MASTER));
        ejemplos.add(item(CODIGO_NORMAL, "Pieza en flujo normal", "Recorrido construido con el catálogo público configurado.", TrackingTipo.PIEZA));
        ejemplos.add(item(CODIGO_OFICINA, "Pieza para retiro en oficina", "Modalidad de retiro presencial con plazo activo.", TrackingTipo.PIEZA));
        if (!catalogo.alternos().isEmpty()) {
            ejemplos.add(item(CODIGO_ALTERNO, "Pieza con flujo alterno", "Incidencia ficticia basada en un estado alterno público configurado.", TrackingTipo.PIEZA));
        }
        return ejemplos;
    }

    @Transactional(readOnly = true)
    public TrackingResolveResponse resolver(String codigoRaw) {
        String codigo = normalizar(codigoRaw);
        Catalogo catalogo = catalogo();
        if (catalogo.bases().isEmpty()) {
            throw new ResourceNotFoundException("Ejemplo de tracking", codigo);
        }
        return switch (codigo) {
            case CODIGO_MASTER -> TrackingResolveResponse.ofMaster(buildMaster(catalogo));
            case CODIGO_MASTER + " 1/2" ->
                    TrackingResolveResponse.ofPieza(buildNormal(catalogo, CODIGO_MASTER + " 1/2", false));
            case CODIGO_MASTER + " 2/2" ->
                    TrackingResolveResponse.ofPieza(buildNormal(catalogo, CODIGO_MASTER + " 2/2", true));
            case CODIGO_NORMAL -> TrackingResolveResponse.ofPieza(buildNormal(catalogo, CODIGO_NORMAL, false));
            case CODIGO_OFICINA -> TrackingResolveResponse.ofPieza(buildOficina(catalogo));
            case CODIGO_ALTERNO -> {
                if (catalogo.alternos().isEmpty()) {
                    throw new ResourceNotFoundException("Ejemplo de tracking", codigo);
                }
                yield TrackingResolveResponse.ofPieza(buildAlterno(catalogo));
            }
            default -> throw new ResourceNotFoundException("Ejemplo de tracking", codigo);
        };
    }

    private TrackingMasterResponse buildMaster(Catalogo catalogo) {
        TrackingResponse pieza1 = buildNormal(catalogo, CODIGO_MASTER + " 1/2", false);
        TrackingResponse pieza2 = buildNormal(catalogo, CODIGO_MASTER + " 2/2", true);
        LocalDateTime ahora = ahora();
        List<TrackingPiezaItem> piezas = List.of(toPiezaItem(pieza1, 1), toPiezaItem(pieza2, 2));
        List<TrackingMasterEventoItem> timeline = piezas.stream()
                .map(p -> TrackingMasterEventoItem.builder()
                        .numeroGuia(p.getNumeroGuia())
                        .piezaNumero(p.getPiezaNumero())
                        .piezaTotal(p.getPiezaTotal())
                        .estadoCodigo(p.getEstadoActualCodigo())
                        .estadoNombre(p.getEstadoActualNombre())
                        .eventoTipo("CAMBIO_ESTADO")
                        .occurredAt(p.getFechaEstadoDesde())
                        .build())
                .toList();
        TrackingConsignatarioDTO consignatario = consignatario();
        return TrackingMasterResponse.builder()
                .trackingBase(CODIGO_MASTER)
                .estadoGlobal(EstadoGuiaMaster.ENVIO_PARCIAL)
                .totalPiezasEsperadas(2)
                .piezasRegistradas(2)
                .piezasRecibidas(1)
                .piezasDespachadas(0)
                .consignatarioNombre(consignatario.getNombre())
                .consignatario(consignatario)
                .piezas(piezas)
                .fechaPrimeraRecepcion(ahora.minusDays(8))
                .ultimaActualizacion(ahora)
                .timeline(timeline)
                .build();
    }

    private TrackingResponse buildNormal(Catalogo catalogo, String codigo, boolean temprano) {
        int actualIndex = temprano ? 0 : Math.min(Math.max(0, catalogo.bases().size() / 2), catalogo.bases().size() - 1);
        EstadoRastreo actual = catalogo.bases().get(actualIndex);
        LocalDateTime ahora = ahora();
        return TrackingResponse.builder()
                .numeroGuia(codigo)
                .estadoRastreoId(actual.getId())
                .estadoRastreoNombre(actual.getNombre())
                .consignatarioNombre(consignatario().getNombre())
                .consignatario(consignatario())
                .estados(buildTimeline(catalogo, actual, actualIndex, null, ahora, null))
                .estadoActualId(actual.getId())
                .fechaEstadoDesde(ahora.minusDays(1).format(ISO))
                .leyenda(renderLeyenda(actual.getLeyenda(), 1))
                .flujoActual("NORMAL")
                .bloqueado(false)
                .build();
    }

    private TrackingResponse buildOficina(Catalogo catalogo) {
        EstadoRastreo actual = estadoInicioCuentaRegresiva(catalogo);
        int actualIndex = catalogo.bases().indexOf(actual);
        LocalDateTime ahora = ahora();
        int diasMax = 5;
        int transcurridos = 2;
        LocalDateTime fechaLimite = LocalDate.now(ZONA_ECUADOR)
                .plusDays(diasMax - transcurridos + 1L)
                .atStartOfDay();
        return TrackingResponse.builder()
                .numeroGuia(CODIGO_OFICINA)
                .estadoRastreoId(actual.getId())
                .estadoRastreoNombre(actual.getNombre())
                .consignatarioNombre(consignatario().getNombre())
                .consignatario(consignatario())
                .estados(buildTimeline(catalogo, actual, actualIndex, null, ahora, transcurridos))
                .estadoActualId(actual.getId())
                .fechaEstadoDesde(ahora.minusDays(transcurridos).format(ISO))
                .leyenda(renderLeyenda(actual.getLeyenda(), transcurridos))
                .diasMaxRetiro(diasMax)
                .diasTranscurridos(transcurridos)
                .diasRestantes(diasMax - transcurridos)
                .fechaLimiteRetiro(fechaLimite.format(ISO))
                .cuentaRegresivaFinalizada(false)
                .paqueteVencido(false)
                .flujoActual("NORMAL")
                .bloqueado(false)
                .operadorEntrega(TrackingOperadorEntregaDTO.builder()
                        .tipoEntrega("AGENCIA")
                        .agenciaNombre("Oficina ECUBOX Centro")
                        .agenciaCodigo("DEMO-OFICINA")
                        .agenciaDireccion("Av. Principal 123")
                        .agenciaProvincia("Pichincha")
                        .agenciaCanton("Quito")
                        .horarioAtencionAgencia("Lunes a viernes, 09:00 a 17:00")
                        .diasMaxRetiroAgencia(diasMax)
                        .build())
                .build();
    }

    private TrackingResponse buildAlterno(Catalogo catalogo) {
        EstadoRastreo alterno = catalogo.alternos().get(0);
        EstadoRastreo ancla = alterno.getAfterEstado();
        int baseIndex = ancla != null ? indexById(catalogo.bases(), ancla.getId()) : 0;
        if (baseIndex < 0) baseIndex = 0;
        LocalDateTime ahora = ahora();
        return TrackingResponse.builder()
                .numeroGuia(CODIGO_ALTERNO)
                .estadoRastreoId(alterno.getId())
                .estadoRastreoNombre(alterno.getNombre())
                .consignatarioNombre(consignatario().getNombre())
                .consignatario(consignatario())
                .estados(buildTimeline(catalogo, alterno, baseIndex, alterno, ahora, null))
                .estadoActualId(alterno.getId())
                .fechaEstadoDesde(ahora.minusHours(6).format(ISO))
                .leyenda(renderLeyenda(alterno.getLeyenda(), null))
                .flujoActual("ALTERNO")
                .bloqueado(true)
                .motivoAlterno("Incidencia ficticia para demostrar el flujo alterno configurado.")
                .build();
    }

    private List<TrackingEstadoItemDTO> buildTimeline(Catalogo catalogo,
                                                      EstadoRastreo actual,
                                                      int ultimoBaseAlcanzado,
                                                      EstadoRastreo alternoActual,
                                                      LocalDateTime ahora,
                                                      Integer dias) {
        List<TrackingEstadoItemDTO> items = new ArrayList<>();
        int baseIndex = -1;
        for (EstadoRastreo estado : catalogo.ordenados()) {
            boolean alterno = TipoFlujoEstado.ALTERNO.equals(estado.getTipoFlujo());
            if (alterno && !Objects.equals(estado.getId(), alternoActual != null ? alternoActual.getId() : null)) {
                continue;
            }
            if (!alterno) baseIndex++;
            boolean esActual = Objects.equals(estado.getId(), actual.getId());
            LocalDateTime ocurrencia = null;
            if ((!alterno && baseIndex <= ultimoBaseAlcanzado) || esActual) {
                ocurrencia = esActual ? ahora.minusHours(6) : ahora.minusDays(ultimoBaseAlcanzado - baseIndex + 2L);
            }
            items.add(toTimelineItem(estado, esActual, ocurrencia, dias));
        }
        return items;
    }

    private TrackingEstadoItemDTO toTimelineItem(EstadoRastreo estado,
                                                 boolean actual,
                                                 LocalDateTime ocurrencia,
                                                 Integer dias) {
        return TrackingEstadoItemDTO.builder()
                .id(estado.getId())
                .codigo(estado.getCodigo())
                .nombre(estado.getNombre())
                .orden(estado.getOrdenTracking())
                .tipoFlujo(estado.getTipoFlujo())
                .afterEstadoId(estado.getAfterEstado() != null ? estado.getAfterEstado().getId() : null)
                .leyenda(renderLeyenda(estado.getLeyenda(), dias))
                .esActual(actual)
                .fechaOcurrencia(ocurrencia)
                .build();
    }

    private EstadoRastreo estadoInicioCuentaRegresiva(Catalogo catalogo) {
        EstadosRastreoPorPuntoDTO config = parametroSistemaService.getEstadosRastreoPorPunto();
        Long inicioId = config != null ? config.getEstadoRastreoInicioCuentaRegresivaId() : null;
        return catalogo.bases().stream()
                .filter(e -> Objects.equals(e.getId(), inicioId))
                .findFirst()
                .orElse(catalogo.bases().get(Math.max(0, catalogo.bases().size() - 1)));
    }

    private Catalogo catalogo() {
        List<EstadoRastreo> ordenados = estadoRastreoService.findCatalogoPublicoEntities();
        List<EstadoRastreo> bases = ordenados.stream()
                .filter(e -> !TipoFlujoEstado.ALTERNO.equals(e.getTipoFlujo()))
                .toList();
        List<EstadoRastreo> alternos = ordenados.stream()
                .filter(e -> TipoFlujoEstado.ALTERNO.equals(e.getTipoFlujo()))
                .toList();
        return new Catalogo(ordenados, bases, alternos);
    }

    private TrackingPiezaItem toPiezaItem(TrackingResponse pieza, int numero) {
        return TrackingPiezaItem.builder()
                .numeroGuia(pieza.getNumeroGuia())
                .piezaNumero(numero)
                .piezaTotal(2)
                .estadoActualCodigo(pieza.getEstados().stream()
                        .filter(TrackingEstadoItemDTO::isEsActual)
                        .map(TrackingEstadoItemDTO::getCodigo)
                        .findFirst()
                        .orElse(null))
                .estadoActualNombre(pieza.getEstadoRastreoNombre())
                .fechaEstadoDesde(LocalDateTime.parse(pieza.getFechaEstadoDesde(), ISO))
                .enFlujoAlterno(false)
                .bloqueado(false)
                .build();
    }

    private static TrackingExampleItemDTO item(String codigo, String titulo, String descripcion, TrackingTipo tipo) {
        return TrackingExampleItemDTO.builder()
                .codigo(codigo)
                .titulo(titulo)
                .descripcion(descripcion)
                .tipo(tipo)
                .build();
    }

    private static TrackingConsignatarioDTO consignatario() {
        return TrackingConsignatarioDTO.builder()
                .nombre("Cliente de demostración")
                .provincia("Pichincha")
                .canton("Quito")
                .build();
    }

    private static String renderLeyenda(String leyenda, Integer dias) {
        if (leyenda == null || leyenda.isBlank()) return null;
        return dias == null ? leyenda : leyenda.replace("{dias}", String.valueOf(dias));
    }

    private static int indexById(List<EstadoRastreo> estados, Long id) {
        for (int i = 0; i < estados.size(); i++) {
            if (Objects.equals(estados.get(i).getId(), id)) return i;
        }
        return -1;
    }

    private static String normalizar(String codigo) {
        return codigo == null ? "" : codigo.trim().replaceAll("\\s+", " ").toUpperCase(Locale.ROOT);
    }

    private static LocalDateTime ahora() {
        return LocalDateTime.now(ZONA_ECUADOR).withNano(0);
    }

    private record Catalogo(List<EstadoRastreo> ordenados,
                            List<EstadoRastreo> bases,
                            List<EstadoRastreo> alternos) {}
}
