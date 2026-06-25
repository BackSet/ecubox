package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EnvioConsolidadoCreateResponse;
import com.ecubox.ecubox_backend.dto.EnvioConsolidadoDTO;
import com.ecubox.ecubox_backend.dto.EnvioConsolidadoResumenDTO;
import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.dto.PaqueteElegibleConsolidadoDTO;
import com.ecubox.ecubox_backend.dto.AplicarEstadoEnConsolidadosResponse;
import com.ecubox.ecubox_backend.dto.AplicarTransicionConsolidadosResponse;
import com.ecubox.ecubox_backend.dto.EstadoRastreoDTO;
import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.dto.AvanceEstadosConsolidadosRequest;
import com.ecubox.ecubox_backend.dto.AvanceEstadosConsolidadosPreviewDTO;
import com.ecubox.ecubox_backend.dto.AvanceEstadosConsolidadosResponse;
import com.ecubox.ecubox_backend.dto.AvanceOperativoConsolidadosRequest;
import com.ecubox.ecubox_backend.dto.AvanceOperativoConsolidadosPreviewDTO;
import com.ecubox.ecubox_backend.dto.AvanceOperativoConsolidadosResponse;
import com.ecubox.ecubox_backend.dto.DestinoAvanceOperativoDTO;
import com.ecubox.ecubox_backend.dto.TransicionOperativaConsolidadoDTO;
import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.LiquidacionConsolidadoLinea;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.dto.ResumenEstadosPaquetesConsolidadoDTO;
import com.ecubox.ecubox_backend.enums.EstadoEnvioConsolidadoOperativo;
import com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ConflictException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.EnvioConsolidadoRepository;
import com.ecubox.ecubox_backend.repository.LiquidacionConsolidadoLineaRepository;
import com.ecubox.ecubox_backend.repository.LoteRecepcionGuiaRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.util.SearchSpecifications;
import com.ecubox.ecubox_backend.util.Strings;
import com.ecubox.ecubox_backend.util.Pageables;
import com.ecubox.ecubox_backend.service.validation.PaqueteOperacionValidator;
import org.springframework.context.annotation.Lazy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Orquesta el ciclo de vida minimo de un {@link EnvioConsolidado} (uso INTERNO del operario):
 * <ul>
 *   <li>Crear el envio con o sin guias asociadas en la misma transaccion.</li>
 *   <li>Agregar / quitar paquetes mientras este en preparacion ({@code fecha_cerrado IS NULL}).</li>
 *   <li>Marcar salida desde USA / revertir salida para indicar si admite cambios.</li>
 * </ul>
 *
 * <p>Si el consolidado ya figura en un lote de recepción, al agregar paquetes se
 * vuelve a aplicar el estado de rastreo “en lote recepción” a esas piezas para
 * mantener coherencia con el flujo de recepción en bodega.
 */
@Service
public class EnvioConsolidadoService {

    private final EnvioConsolidadoRepository envioConsolidadoRepository;
    private final PaqueteRepository paqueteRepository;
    private final PaqueteService paqueteService;
    private final LiquidacionConsolidadoLineaRepository liquidacionConsolidadoLineaRepository;
    private final LoteRecepcionGuiaRepository loteRecepcionGuiaRepository;
    private final EstadoConsolidadoOperativoResolver estadoConsolidadoOperativoResolver;
    private final EstadoRastreoService estadoRastreoService;
    private final ParametroSistemaService parametroSistemaService;
    private final PaqueteOperacionValidator paqueteOperacionValidator;
    private static final ZoneId ZONA_ECUADOR = ZoneId.of("America/Guayaquil");
    private static final String MENSAJE_REQUIERE_PAQUETE =
            "El consolidado debe contener al menos un paquete para cambiar de estado.";
    private static final int PAQUETES_PREVIEW_POR_ESTADO = 3;
    private static final List<EstadoEnvioConsolidadoOperativo> ESTADOS_OPERATIVOS_AVANCE = List.of(
            EstadoEnvioConsolidadoOperativo.EN_PREPARACION,
            EstadoEnvioConsolidadoOperativo.CERRADO,
            EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA);
    public EnvioConsolidadoService(EnvioConsolidadoRepository envioConsolidadoRepository,
                                   PaqueteRepository paqueteRepository,
                                   PaqueteService paqueteService,
                                   LiquidacionConsolidadoLineaRepository liquidacionConsolidadoLineaRepository,
                                   LoteRecepcionGuiaRepository loteRecepcionGuiaRepository,
                                   EstadoConsolidadoOperativoResolver estadoConsolidadoOperativoResolver,
                                   EstadoRastreoService estadoRastreoService,
                                   ParametroSistemaService parametroSistemaService) {
        this(envioConsolidadoRepository, paqueteRepository, paqueteService,
                liquidacionConsolidadoLineaRepository, loteRecepcionGuiaRepository,
                estadoConsolidadoOperativoResolver, estadoRastreoService, parametroSistemaService,
                new PaqueteOperacionValidator(null));
    }

    @Autowired
    public EnvioConsolidadoService(EnvioConsolidadoRepository envioConsolidadoRepository,
                                   PaqueteRepository paqueteRepository,
                                   @Lazy PaqueteService paqueteService,
                                   LiquidacionConsolidadoLineaRepository liquidacionConsolidadoLineaRepository,
                                   LoteRecepcionGuiaRepository loteRecepcionGuiaRepository,
                                   EstadoConsolidadoOperativoResolver estadoConsolidadoOperativoResolver,
                                   EstadoRastreoService estadoRastreoService,
                                   ParametroSistemaService parametroSistemaService,
                                   PaqueteOperacionValidator paqueteOperacionValidator) {
        this.envioConsolidadoRepository = envioConsolidadoRepository;
        this.paqueteRepository = paqueteRepository;
        this.paqueteService = paqueteService;
        this.liquidacionConsolidadoLineaRepository = liquidacionConsolidadoLineaRepository;
        this.loteRecepcionGuiaRepository = loteRecepcionGuiaRepository;
        this.estadoConsolidadoOperativoResolver = estadoConsolidadoOperativoResolver;
        this.estadoRastreoService = estadoRastreoService;
        this.parametroSistemaService = parametroSistemaService;
        this.paqueteOperacionValidator = paqueteOperacionValidator;
    }

    @Transactional(readOnly = true)
    public EnvioConsolidado findById(Long id) {
        return envioConsolidadoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Envío consolidado", id));
    }

    /**
     * Lista los envios consolidados que pueden incluirse en un nuevo lote de
     * recepcion: SOLO los que están en {@code ARRIBADO_ECUADOR} (ya arribaron a
     * Ecuador) y aún no fueron recibidos en bodega. Ortogonal al {@code estadoPago}.
     */
    @Transactional(readOnly = true)
    public Page<EnvioConsolidado> findDisponiblesParaRecepcion(String q, int page, int size) {
        Pageable pageable = Pageables.bounded(page, size, 200);
        String search = Strings.trimOrNull(q);
        return envioConsolidadoRepository.findDisponiblesParaRecepcion(
                EstadoEnvioConsolidadoOperativo.ARRIBADO_ECUADOR,
                search != null ? search : "",
                pageable);
    }

    /**
     * Lista envios paginados con búsqueda libre opcional sobre el código.
     *
     * @param estadoOperativo {@code null} -> todos; valor del enum -> filtra por estado operativo derivado.
     * @param estadoPago      {@code null} -> todos; valor del enum -> filtra por estado de pago.
     * @param q               texto libre (LIKE multi-token sobre {@code codigo}); ignorado si vacío.
     */
    @Transactional(readOnly = true)
    public Page<EnvioConsolidado> findAll(EstadoEnvioConsolidadoOperativo estadoOperativo,
                                          com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado estadoPago,
                                          String q, int page, int size) {
        return findAll(estadoOperativo, estadoPago, q, false, false, page, size);
    }

    /**
     * Variante con los filtros derivados del resumen de paquetes:
     * {@code requiereAtencion} (al menos un paquete en flujo alterno o sin
     * estado) y {@code estadosMixtos} (más de un estado actual distinto). Ambos
     * se resuelven con subconsultas dentro de la misma consulta paginada, por lo
     * que se aplican <b>antes</b> de paginar y son combinables.
     */
    @Transactional(readOnly = true)
    public Page<EnvioConsolidado> findAll(EstadoEnvioConsolidadoOperativo estadoOperativo,
                                          com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado estadoPago,
                                          String q, boolean requiereAtencion, boolean estadosMixtos,
                                          int page, int size) {
        Pageable pageable = Pageables.bounded(page, size, 100,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));

        Specification<EnvioConsolidado> spec = (root, query, cb) -> cb.conjunction();
        if (estadoOperativo != null) {
            spec = spec.and(estadoConsolidadoOperativoResolver.specificationFor(estadoOperativo));
        }
        if (estadoPago != null) {
            Specification<EnvioConsolidado> pagoSpec = (root, query, cb) ->
                    cb.equal(root.get("estadoPago"), estadoPago);
            spec = spec.and(pagoSpec);
        }
        String trimmed = Strings.trimOrNull(q);
        if (trimmed != null) {
            spec = spec.and(SearchSpecifications.tokensLike(trimmed,
                    SearchSpecifications.field("codigo")));
        }
        if (requiereAtencion) {
            spec = spec.and(specRequiereAtencion());
        }
        if (estadosMixtos) {
            spec = spec.and(specEstadosMixtos());
        }
        return envioConsolidadoRepository.findAll(spec, pageable);
    }

    /** Consolidados con al menos un paquete que requiere atención (flujo alterno o sin estado). */
    private Specification<EnvioConsolidado> specRequiereAtencion() {
        return (root, query, cb) -> {
            jakarta.persistence.criteria.Subquery<Long> sub = query.subquery(Long.class);
            jakarta.persistence.criteria.Root<Paquete> p = sub.from(Paquete.class);
            jakarta.persistence.criteria.Join<Paquete, EstadoRastreo> er =
                    p.join("estadoRastreo", jakarta.persistence.criteria.JoinType.LEFT);
            sub.select(cb.literal(1L)).where(
                    cb.equal(p.get("envioConsolidado"), root),
                    cb.or(
                            er.get("id").isNull(),
                            cb.equal(er.get("tipoFlujo"), com.ecubox.ecubox_backend.enums.TipoFlujoEstado.ALTERNO)));
            return cb.exists(sub);
        };
    }

    /** Consolidados cuyos paquetes tienen más de un estado actual distinto. */
    private Specification<EnvioConsolidado> specEstadosMixtos() {
        return (root, query, cb) -> {
            jakarta.persistence.criteria.Subquery<Long> sub = query.subquery(Long.class);
            jakarta.persistence.criteria.Root<Paquete> p = sub.from(Paquete.class);
            sub.select(cb.countDistinct(p.get("estadoRastreo").get("id")))
                    .where(cb.equal(p.get("envioConsolidado"), root));
            return cb.greaterThan(sub, 1L);
        };
    }

    /**
     * Resumen liviano del listado: conteo por estado operativo (KPIs/chips) y por
     * estado de pago, sin descargar el dataset completo. Se cuenta por la columna
     * {@code estado_operativo} (la misma que usa el filtro paginado), de modo que
     * los conteos sean coherentes con la tabla.
     */
    @Transactional(readOnly = true)
    public EnvioConsolidadoResumenDTO resumen() {
        java.util.Map<EstadoEnvioConsolidadoOperativo, Long> porOperativo =
                new java.util.EnumMap<>(EstadoEnvioConsolidadoOperativo.class);
        for (EstadoEnvioConsolidadoOperativo estado : EstadoEnvioConsolidadoOperativo.values()) {
            porOperativo.put(estado, 0L);
        }
        long total = 0;
        for (Object[] fila : envioConsolidadoRepository.countAgrupadoPorEstadoOperativo()) {
            EstadoEnvioConsolidadoOperativo estado = (EstadoEnvioConsolidadoOperativo) fila[0];
            long count = ((Number) fila[1]).longValue();
            total += count;
            if (estado != null) porOperativo.put(estado, count);
        }
        long pagados = 0;
        long noPagados = 0;
        for (Object[] fila : envioConsolidadoRepository.countAgrupadoPorEstadoPago()) {
            EstadoPagoConsolidado pago = (EstadoPagoConsolidado) fila[0];
            long count = ((Number) fila[1]).longValue();
            if (pago == EstadoPagoConsolidado.PAGADO) pagados = count;
            else if (pago == EstadoPagoConsolidado.NO_PAGADO) noPagados = count;
        }
        return EnvioConsolidadoResumenDTO.builder()
                .total(total)
                .porOperativo(porOperativo)
                .pagados(pagados)
                .noPagados(noPagados)
                .build();
    }

    @Transactional
    public EnvioConsolidado crear(String codigo, Long actorUsuarioId) {
        String c = Strings.trimOrNull(codigo);
        if (c == null) {
            throw new BadRequestException(
                    "No se puede crear el envío consolidado porque falta el código. Ingresa un código para continuar.");
        }
        if (envioConsolidadoRepository.existsByCodigoIgnoreCase(c)) {
            throw new ConflictException(
                    "No se puede crear el envío consolidado porque ya existe otro con el código " + c
                            + ". Regla: el código del envío consolidado debe ser único. Usa un código distinto.");
        }
        EnvioConsolidado envio = EnvioConsolidado.builder()
                .codigo(c)
                .totalPaquetes(0)
                .createdBy(actorUsuarioId)
                .build();
        return envioConsolidadoRepository.save(envio);
    }

    /**
     * Compatibilidad: crea un consolidado solo con carga por lista de guías.
     * Delega en {@link #crearConGuias(String, List, List, Long)} sin ids.
     */
    @Transactional
    public EnvioConsolidadoCreateResponse crearConGuias(String codigo, List<String> numerosGuia, Long actorUsuarioId) {
        return crearConGuias(codigo, numerosGuia, null, actorUsuarioId);
    }

    /**
     * Crea un envio consolidado y, en la misma transaccion, asocia los paquetes
     * indicados por dos vias combinables:
     * <ul>
     *   <li>{@code numerosGuia}: carga por lista pegada por el operario. Las guias
     *       que no resuelven a ningun paquete se reportan en
     *       {@code guiasNoEncontradas} sin abortar la creacion.</li>
     *   <li>{@code paqueteIds}: ids seleccionados desde la busqueda interactiva.</li>
     * </ul>
     * Los paquetes resueltos por ambas vias se unen por id (sin duplicados) y se
     * asocian con {@link #agregarPaquetes(Long, List)}, que valida elegibilidad,
     * estado anterior requerido y reasignacion. El envio queda creado aunque no
     * se asocie ningun paquete; el operario puede agregar/quitar despues.
     */
    @Transactional
    public EnvioConsolidadoCreateResponse crearConGuias(String codigo, List<String> numerosGuia,
                                                        List<Long> paqueteIds, Long actorUsuarioId) {
        EnvioConsolidado envio = crear(codigo, actorUsuarioId);
        List<String> noEncontradas = List.of();
        // Union por id preservando el orden de aparicion: primero los resueltos
        // por lista, luego los seleccionados por busqueda. El LinkedHashSet
        // deduplica los paquetes que llegan por ambas vias.
        Set<Long> idsAUnir = new LinkedHashSet<>();
        if (numerosGuia != null && !numerosGuia.isEmpty()) {
            List<String> normalizadas = numerosGuia.stream()
                    .filter(s -> s != null && !s.isBlank())
                    .map(String::trim)
                    .distinct()
                    .toList();
            if (!normalizadas.isEmpty()) {
                List<String> normalizadasLower = normalizadas.stream()
                        .map(s -> s.toLowerCase(Locale.ROOT))
                        .toList();
                List<Paquete> paquetes = paqueteRepository.findByNumeroGuiaInIgnoreCase(normalizadasLower);
                Set<String> encontradosLower = paquetes.stream()
                        .map(p -> p.getNumeroGuia().toLowerCase(Locale.ROOT))
                        .collect(Collectors.toSet());
                noEncontradas = normalizadas.stream()
                        .filter(g -> !encontradosLower.contains(g.toLowerCase(Locale.ROOT)))
                        .toList();
                paquetes.forEach(p -> idsAUnir.add(p.getId()));
            }
        }
        if (paqueteIds != null) {
            paqueteIds.stream().filter(Objects::nonNull).forEach(idsAUnir::add);
        }
        if (!idsAUnir.isEmpty()) {
            agregarPaquetes(envio.getId(), new ArrayList<>(idsAUnir));
            envio = findById(envio.getId());
        }
        return EnvioConsolidadoCreateResponse.builder()
                .envio(toDTO(envio, true))
                .guiasNoEncontradas(noEncontradas)
                .build();
    }

    /**
     * Busca paquetes (por guia, ref, contenido, guia master, consignatario o
     * codigo de consolidado) para agregarlos a un envio consolidado y calcula su
     * elegibilidad con la misma regla que {@link #agregarPaquetes(Long, List)}.
     *
     * <p>Devuelve todos los resultados de la busqueda (no solo los elegibles) con
     * el motivo cuando un paquete no puede asociarse, para que la UI lo muestre
     * sin reimplementar la regla. La elegibilidad se computa sobre el
     * {@link PaqueteDTO} ya materializado (estado, revision activa y consolidado
     * actual), por lo que no hay consultas adicionales por fila.
     */
    @Transactional(readOnly = true)
    public Page<PaqueteElegibleConsolidadoDTO> buscarPaquetesElegibles(String q, int page, int size) {
        EstadoRastreo requerido = resolverEstadoRequeridoAsociacion();
        Page<PaqueteDTO> paquetes = paqueteService.findAllPaginated(
                Strings.trimOrNull(q), PaqueteService.PaqueteListFilters.empty(), page, size);
        return paquetes.map(dto -> evaluarElegibilidad(dto, requerido));
    }

    private PaqueteElegibleConsolidadoDTO evaluarElegibilidad(PaqueteDTO dto, EstadoRastreo requerido) {
        String motivo = null;
        if (dto.getRevisionActiva() != null) {
            motivo = "El paquete está en revisión y no se puede asociar hasta resolverla.";
        } else if (dto.isEnvioConsolidadoCerrado()) {
            motivo = "Pertenece al envío " + dto.getEnvioConsolidadoCodigo()
                    + ", que ya fue cerrado o enviado desde USA, y no se puede reasignar.";
        } else if (requerido == null || !requerido.getId().equals(dto.getEstadoRastreoId())) {
            motivo = "Debe estar en el estado '" + (requerido != null ? requerido.getNombre() : "configurado")
                    + "' para asociarse. Estado actual: "
                    + (dto.getEstadoRastreoNombre() != null ? dto.getEstadoRastreoNombre() : "sin estado") + ".";
        }
        return PaqueteElegibleConsolidadoDTO.builder()
                .paquete(dto)
                .elegible(motivo == null)
                .motivoNoElegible(motivo)
                .build();
    }

    @Transactional
    public EnvioConsolidado agregarPaquetes(Long envioId, List<Long> paqueteIds) {
        EnvioConsolidado envio = findById(envioId);
        if (envio.isCerrado()) {
            throw new ConflictException(
                    "No se pueden agregar paquetes porque el envío consolidado ya no está en preparación. "
                            + "Estado actual: " + envio.getEstadoOperativo()
                            + ". Regla: solo los envíos en preparación admiten cambios de paquetes. "
                            + "Reabre el envío si necesitas modificarlo.");
        }
        if (paqueteIds == null || paqueteIds.isEmpty()) {
            throw new BadRequestException(
                    "No se pueden agregar paquetes porque no se seleccionó ninguno. "
                            + "Selecciona al menos un paquete para continuar.");
        }
        Set<Long> ids = new LinkedHashSet<>(paqueteIds);
        List<Paquete> paquetes = paqueteRepository.findAllByIdForUpdate(ids);
        if (paquetes.isEmpty()) {
            paquetes = paqueteRepository.findAllById(ids);
        }
        if (paquetes.size() != ids.size()) {
            throw new ResourceNotFoundException("Paquete", "uno o más ids no encontrados");
        }
        paqueteOperacionValidator.requireOperativos(paquetes);
        List<Long> idsAsociados = new ArrayList<>();
        List<Paquete> nuevos = new ArrayList<>();
        for (Paquete p : paquetes) {
            EnvioConsolidado actual = p.getEnvioConsolidado();
            if (actual != null && actual.getId() != null && !actual.getId().equals(envio.getId())
                    && actual.isCerrado()) {
                throw new ConflictException("No se puede agregar el paquete " + p.getNumeroGuia()
                        + " porque ya pertenece al envío consolidado " + actual.getCodigo()
                        + ", que ya fue cerrado o enviado desde USA. "
                        + "Regla: los paquetes de un envío cerrado no se pueden reasignar. "
                        + "Reabre ese envío primero si necesitas moverlo.");
            }
            if (actual == null || !envio.getId().equals(actual.getId())) {
                nuevos.add(p);
                idsAsociados.add(p.getId());
            }
        }
        // Admisión por estado anterior inmediato: un paquete solo puede asociarse
        // a un consolidado si está EXACTAMENTE en el estado de rastreo previo al
        // de "asociar a envío consolidado" (configurado por punto). No se hardcodea.
        validarPaquetesEnEstadoAnteriorAsociacion(nuevos);
        for (Paquete p : paquetes) {
            p.setEnvioConsolidado(envio);
        }
        paqueteRepository.saveAll(paquetes);
        if (!idsAsociados.isEmpty()) {
            paqueteService.aplicarEstadoAsociarEnvioConsolidado(idsAsociados);
        }
        recalcularTotales(envio);
        if (envio.getEstadoOperativo() == EstadoEnvioConsolidadoOperativo.VACIO) {
            envio.setEstadoOperativo(EstadoEnvioConsolidadoOperativo.EN_PREPARACION);
        }
        EnvioConsolidado guardado = envioConsolidadoRepository.save(envio);
        String codigoConsolidado = Strings.trimOrNull(guardado.getCodigo());
        if (codigoConsolidado != null
                && loteRecepcionGuiaRepository.existsByNumeroGuiaEnvioIgnoreCase(codigoConsolidado)) {
            LocalDateTime fechaLote = loteRecepcionGuiaRepository
                    .findMinFechaRecepcionByNumeroGuiaEnvioIgnoreCase(codigoConsolidado)
                    .orElse(LocalDateTime.now());
            paqueteService.aplicarEstadoEnLoteRecepcion(new ArrayList<>(ids), fechaLote);
        }
        return guardado;
    }

    /**
     * Exige que cada paquete recién asociado esté EXACTAMENTE en el estado de
     * rastreo inmediatamente anterior al configurado para "asociar a envío
     * consolidado" ({@code estadoRastreoAsociarEnvioConsolidadoId} en
     * /parametros-sistema/por-punto). Reusa {@link EstadoRastreoService#resolverTransicionInmediata}.
     */
    private void validarPaquetesEnEstadoAnteriorAsociacion(List<Paquete> nuevos) {
        if (nuevos == null || nuevos.isEmpty()) {
            return;
        }
        EstadoRastreo requerido = resolverEstadoRequeridoAsociacion();
        for (Paquete p : nuevos) {
            EstadoRastreo actual = p.getEstadoRastreo();
            if (actual == null || !requerido.getId().equals(actual.getId())) {
                throw new BadRequestException(
                        "No se puede agregar el paquete " + p.getNumeroGuia()
                                + " al envío consolidado porque debe estar exactamente en el estado '"
                                + requerido.getNombre() + "' para poder asociarse. "
                                + "Estado actual: "
                                + (actual != null ? actual.getNombre() : "sin estado") + ".");
            }
        }
    }

    /**
     * Estado de rastreo en el que debe estar EXACTAMENTE un paquete para poder
     * asociarse a un envío consolidado: el inmediatamente anterior al configurado
     * para "asociar a envío consolidado" ({@code estadoRastreoAsociarEnvioConsolidadoId}
     * en /parametros-sistema/por-punto). No se hardcodea ningún código de estado.
     */
    private EstadoRastreo resolverEstadoRequeridoAsociacion() {
        Long asociarId = parametroSistemaService.getEstadosRastreoPorPunto()
                .getEstadoRastreoAsociarEnvioConsolidadoId();
        if (asociarId == null) {
            throw new BadRequestException(
                    "No se pueden asociar paquetes porque no hay un estado configurado para la "
                            + "asociación a envío consolidado. Configúralo en /parametros-sistema/por-punto.");
        }
        return estadoRastreoService.resolverTransicionInmediata(asociarId).anterior();
    }

    @Transactional
    public EnvioConsolidado removerPaquetes(Long envioId, List<Long> paqueteIds) {
        EnvioConsolidado envio = findById(envioId);
        if (envio.isCerrado()) {
            throw new ConflictException(
                    "No se pueden quitar paquetes porque el envío consolidado ya no está en preparación. "
                            + "Estado actual: " + envio.getEstadoOperativo()
                            + ". Regla: solo los envíos en preparación admiten cambios de paquetes. "
                            + "Reabre el envío si necesitas modificarlo.");
        }
        if (paqueteIds == null || paqueteIds.isEmpty()) {
            throw new BadRequestException(
                    "No se pueden quitar paquetes porque no se seleccionó ninguno. "
                            + "Selecciona al menos un paquete para continuar.");
        }
        Set<Long> ids = new LinkedHashSet<>(paqueteIds);
        List<Paquete> paquetes = paqueteRepository.findAllByIdForUpdate(ids);
        if (paquetes.isEmpty()) {
            paquetes = paqueteRepository.findAllById(ids);
        }
        paqueteOperacionValidator.requireOperativos(paquetes);
        for (Paquete p : paquetes) {
            if (p.getEnvioConsolidado() != null
                    && envio.getId().equals(p.getEnvioConsolidado().getId())) {
                p.setEnvioConsolidado(null);
            }
        }
        paqueteRepository.saveAll(paquetes);
        recalcularTotales(envio);
        if (envio.getEstadoOperativo() == EstadoEnvioConsolidadoOperativo.EN_PREPARACION
                && (envio.getTotalPaquetes() == null || envio.getTotalPaquetes() == 0)) {
            envio.setEstadoOperativo(EstadoEnvioConsolidadoOperativo.VACIO);
        }
        return envioConsolidadoRepository.save(envio);
    }

    @Transactional(readOnly = true)
    public List<EstadoRastreoDTO> listarEstadosAplicables() {
        return paqueteService.listarEstadosPosterioresAAsociacionConsolidado();
    }

    @Transactional(readOnly = true)
    public List<EstadoRastreoDTO> listarDestinosAvanceEstados() {
        EstadosRastreoPorPuntoDTO cfg = parametroSistemaService.getEstadosRastreoPorPunto();
        validarConfiguracionRangoConsolidados(cfg);
        EstadoRastreo base = estadoRastreoService.findEntityById(cfg.getEstadoRastreoAsociarEnvioConsolidadoId());
        EstadoRastreo limite = estadoRastreoService.findEntityById(cfg.getEstadoRastreoEnLoteRecepcionId());
        int ordenBase = ordenOrThrow(base);
        int ordenLimite = ordenOrThrow(limite);
        return estadoRastreoService.findActivos().stream()
                .filter(e -> e.getTipoFlujo() == base.getTipoFlujo())
                .filter(e -> {
                    Integer orden = e.getOrden() != null ? e.getOrden() : e.getOrdenTracking();
                    // Cota superior EXCLUSIVA: el estado de "llega a bodega"
                    // (en lote de recepción) no es un destino del avance
                    // automático; ese estado solo se alcanza cuando el operario
                    // ingresa el consolidado a un lote de recepción. El avance
                    // llega como máximo al estado inmediatamente anterior.
                    return orden != null && orden > ordenBase && orden < ordenLimite;
                })
                .sorted(Comparator.comparingInt(e -> e.getOrden() != null ? e.getOrden() : e.getOrdenTracking()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TransicionOperativaConsolidadoDTO> listarTransicionesOperativas() {
        return catalogoTransiciones().stream()
                .map(TransicionOperativaDef::dto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EnvioConsolidado> listarCandidatosAvanceEstados() {
        return envioConsolidadoRepository.findCandidatosAvanceEstados(
                ESTADOS_OPERATIVOS_AVANCE);
    }

    /**
     * Ids de los consolidados elegibles para aplicar el estado de rastreo
     * {@code estadoRastreoId} a sus paquetes, aplicando la regla de "ir de 1
     * en 1": solo se listan consolidados con paquetes en el estado de
     * rastreo inmediatamente anterior (ver {@link PaqueteService#resolverEstadoOrigenParaEstadoRastreoConsolidado}).
     */
    @Transactional(readOnly = true)
    public List<Long> listarElegiblesParaEstadoRastreo(Long estadoRastreoId) {
        if (estadoRastreoId == null) {
            throw new BadRequestException(
                    "No se puede continuar porque no se seleccionó el estado de rastreo a aplicar. "
                            + "Selecciona un estado para continuar.");
        }
        PaqueteService.EstadoOrigenConsolidado origen =
                paqueteService.resolverEstadoOrigenParaEstadoRastreoConsolidado(estadoRastreoId);
        if (origen.estadoOrigenId() == null && !origen.incluirArribadosEcuador()) {
            return envioConsolidadoRepository.findAllIdsConPaquetes();
        }
        return envioConsolidadoRepository.findIdsElegiblesParaEstadoRastreo(
                origen.estadoOrigenId(),
                origen.incluirArribadosEcuador() ? EstadoEnvioConsolidadoOperativo.ARRIBADO_ECUADOR : null);
    }

    @Transactional
    public AplicarEstadoEnConsolidadosResponse aplicarEstadoRastreo(
            List<Long> consolidadoIds,
            Long estadoRastreoId) {
        if (consolidadoIds == null || consolidadoIds.isEmpty()) {
            throw new BadRequestException(
                    "No se puede aplicar el estado porque no se seleccionó ningún envío consolidado. "
                            + "Selecciona al menos uno para continuar.");
        }
        List<Long> ids = consolidadoIds.stream()
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        List<EnvioConsolidado> consolidados = envioConsolidadoRepository.findAllById(ids);
        if (consolidados.size() != ids.size()) {
            Set<Long> encontrados = consolidados.stream()
                    .map(EnvioConsolidado::getId)
                    .collect(Collectors.toSet());
            Long faltante = ids.stream().filter(id -> !encontrados.contains(id)).findFirst().orElse(null);
            throw new ResourceNotFoundException("Envío consolidado", faltante);
        }
        List<Paquete> paquetes = paqueteRepository.findByEnvioConsolidadoIdInWithEstado(ids);
        Map<Long, Long> totales = paquetes.stream()
                .collect(Collectors.groupingBy(
                        paquete -> paquete.getEnvioConsolidado().getId(),
                        Collectors.counting()));
        for (EnvioConsolidado consolidado : consolidados) {
            validarPuedeCambiarEstado(
                    consolidado,
                    totales.getOrDefault(consolidado.getId(), 0L));
        }
        paqueteService.validarEstadoPosteriorAAsociacionConsolidado(estadoRastreoId);
        List<Long> paqueteIds = paquetes.stream().map(Paquete::getId).toList();
        paqueteService.aplicarEstadoRastreoMasivo(paqueteIds, estadoRastreoId);
        return AplicarEstadoEnConsolidadosResponse.builder()
                .consolidadosProcesados(consolidados.size())
                .paquetesActualizados(paqueteIds.size())
                .build();
    }

    @Transactional(readOnly = true)
    public AvanceEstadosConsolidadosPreviewDTO previewAvanceEstados(
            AvanceEstadosConsolidadosRequest request) {
        return calcularAvance(request, false).preview();
    }

    @Transactional
    public AvanceEstadosConsolidadosResponse aplicarAvanceEstados(
            AvanceEstadosConsolidadosRequest request) {
        if (request.getPreviewToken() == null || request.getPreviewToken().isBlank()) {
            throw new BadRequestException("Actualiza la vista previa antes de aplicar la secuencia.");
        }
        CalculoAvance calculo = calcularAvance(request, true);
        if (!request.getPreviewToken().equals(calculo.preview().getPreviewToken())) {
            throw new ConflictException(
                    "Los consolidados o sus paquetes cambiaron después de la vista previa. "
                            + "Actualiza la vista previa antes de reintentar.");
        }
        String operacionId = "avance-consolidados:" + calculo.preview().getPreviewToken();
        for (PasoCalculado paso : calculo.pasos()) {
            aplicarEfectoOperativo(calculo.consolidados(), paso);
            paqueteService.aplicarEstadoSecuenciaConsolidados(
                    calculo.paquetes(), paso.transicion().estadoPaquete(), paso.fecha(), operacionId);
        }
        return AvanceEstadosConsolidadosResponse.builder()
                .consolidadosProcesados(calculo.consolidados().size())
                .paquetesProcesados(calculo.paquetes().size())
                .transicionesAplicadas(calculo.pasos().size())
                .eventosCreados(calculo.paquetes().size() * calculo.pasos().size())
                .transicionFinalCodigo(calculo.destino().codigo())
                .consolidados(calculo.consolidados().stream()
                        .map(envio -> AvanceEstadosConsolidadosResponse.ConsolidadoResultado.builder()
                                .id(envio.getId())
                                .codigo(envio.getCodigo())
                                .estadoFinal(envio.getEstadoOperativo())
                                .build())
                        .toList())
                .build();
    }

    private CalculoAvance calcularAvance(AvanceEstadosConsolidadosRequest request, boolean bloquear) {
        if (request == null || request.getConsolidadoIds() == null || request.getConsolidadoIds().isEmpty()) {
            throw new BadRequestException("Selecciona al menos un envío consolidado.");
        }
        if (request.getTransicionFinalCodigo() == null || request.getTransicionFinalCodigo().isBlank()) {
            throw new BadRequestException("Selecciona la transición final de la secuencia.");
        }
        if (request.getFechaPrincipal() == null) {
            throw new BadRequestException("Selecciona la fecha principal de la secuencia.");
        }
        List<Long> ids = request.getConsolidadoIds().stream()
                .filter(Objects::nonNull).distinct().sorted().toList();
        if (ids.size() != request.getConsolidadoIds().size()) {
            throw new BadRequestException("La selección contiene IDs nulos o repetidos.");
        }
        validarFechas(request);
        List<EnvioConsolidado> consolidados = bloquear
                ? envioConsolidadoRepository.findAllByIdForUpdate(ids)
                : envioConsolidadoRepository.findAllById(ids);
        if (consolidados.size() != ids.size()) {
            Set<Long> encontrados = consolidados.stream().map(EnvioConsolidado::getId).collect(Collectors.toSet());
            Long faltante = ids.stream().filter(id -> !encontrados.contains(id)).findFirst().orElse(null);
            throw new ResourceNotFoundException("Envío consolidado", faltante);
        }
        List<Paquete> paquetes = bloquear
                ? paqueteRepository.findByEnvioConsolidadoIdInWithEstadoForUpdate(ids)
                : paqueteRepository.findByEnvioConsolidadoIdInWithEstado(ids);
        Map<Long, List<Paquete>> porConsolidado = paquetes.stream()
                .collect(Collectors.groupingBy(p -> p.getEnvioConsolidado().getId()));
        EstadoEnvioConsolidadoOperativo estadoOperativoComun = null;
        for (EnvioConsolidado consolidado : consolidados) {
            List<Paquete> propios = porConsolidado.getOrDefault(consolidado.getId(), List.of());
            validarPuedeCambiarEstado(consolidado, propios.size());
            if (estadoOperativoComun == null) {
                estadoOperativoComun = consolidado.getEstadoOperativo();
            } else if (estadoOperativoComun != consolidado.getEstadoOperativo()) {
                throw new ConflictException(
                        "Los consolidados seleccionados no comparten el mismo estado operativo inicial.");
            }
        }
        List<TransicionOperativaDef> catalogo = catalogoTransiciones();
        EstadoEnvioConsolidadoOperativo estadoInicialOperativo = estadoOperativoComun;
        TransicionOperativaDef origen = catalogo.stream()
                .filter(transicion -> transicion.estadoPrevio() == estadoInicialOperativo)
                .findFirst()
                .orElseThrow(() -> new ConflictException(
                        "El estado operativo inicial no tiene una transición de avance disponible."));
        TransicionOperativaDef destino = buscarTransicion(
                catalogo, request.getTransicionFinalCodigo());
        validarTransicionDisponible(origen);
        validarTransicionDisponible(destino);
        if (destino.orden() < origen.orden()) {
            throw new BadRequestException("La transición final no puede ser anterior a la transición inicial.");
        }
        List<TransicionOperativaDef> secuencia = catalogo.stream()
                .filter(t -> t.orden() >= origen.orden() && t.orden() <= destino.orden())
                .sorted(Comparator.comparingInt(TransicionOperativaDef::orden))
                .toList();
        if (secuencia.isEmpty()
                || !secuencia.getFirst().codigo().equals(origen.codigo())
                || !secuencia.getLast().codigo().equals(destino.codigo())) {
            throw new ConflictException("No existe una secuencia operativa activa completa para el rango seleccionado.");
        }
        secuencia.forEach(this::validarTransicionDisponible);
        List<PasoCalculado> pasos = secuencia.stream()
                .map(transicion -> new PasoCalculado(
                        transicion,
                        request.getFechasPorTransicion() != null
                                ? request.getFechasPorTransicion().getOrDefault(
                                        transicion.codigo(), request.getFechaPrincipal())
                                : request.getFechaPrincipal()))
                .toList();
        validarCronologia(pasos);
        Map<Long, EstadoEnvioConsolidadoOperativo> finales = simularEfectos(consolidados, pasos);
        String token = construirToken(consolidados, paquetes, origen, destino, pasos);
        List<AvanceEstadosConsolidadosPreviewDTO.Consolidado> detalles = consolidados.stream()
                .sorted(Comparator.comparing(EnvioConsolidado::getId))
                .map(e -> AvanceEstadosConsolidadosPreviewDTO.Consolidado.builder()
                        .id(e.getId()).codigo(e.getCodigo())
                        .totalPaquetes(porConsolidado.get(e.getId()).size())
                        .estadoOperativoActual(e.getEstadoOperativo())
                        .estadoOperativoFinal(finales.get(e.getId()))
                        .version(e.getVersion())
                        .bloqueos(List.of())
                        .build())
                .toList();
        AvanceEstadosConsolidadosPreviewDTO preview = AvanceEstadosConsolidadosPreviewDTO.builder()
                .previewToken(token)
                .transicionInicial(origen.dto())
                .transicionFinal(destino.dto())
                .pasos(pasos.stream().map(this::pasoDto).toList())
                .resumen(AvanceEstadosConsolidadosPreviewDTO.Resumen.builder()
                        .totalConsolidados(consolidados.size()).totalPaquetes(paquetes.size())
                        .totalPasos(pasos.size()).totalEventosPrevistos(paquetes.size() * pasos.size()).build())
                .consolidados(detalles).bloqueos(List.of())
                .advertencias(List.of("La operación es atómica: si falla un paso, no se aplicará ningún cambio."))
                .valida(true)
                .build();
        return new CalculoAvance(preview, consolidados, paquetes, pasos, destino);
    }

    private void validarFechas(AvanceEstadosConsolidadosRequest request) {
        LocalDateTime ahora = LocalDateTime.now(ZONA_ECUADOR);
        if (request.getFechaPrincipal().isAfter(ahora)) {
            throw new BadRequestException("La fecha principal no puede ser futura.");
        }
        if (request.getFechasPorTransicion() != null
                && request.getFechasPorTransicion().values().stream().anyMatch(f -> f == null || f.isAfter(ahora))) {
            throw new BadRequestException("Las fechas por transición no pueden estar vacías ni ser futuras.");
        }
    }

    private void validarCronologia(List<PasoCalculado> pasos) {
        LocalDateTime anterior = null;
        for (PasoCalculado paso : pasos) {
            if (anterior != null && paso.fecha().isBefore(anterior)) {
                throw new BadRequestException("Las fechas de la secuencia deben ser cronológicamente no decrecientes.");
            }
            anterior = paso.fecha();
        }
    }

    private void validarDestinoCompatibleConConsolidados(EstadoRastreo destino) {
        EstadosRastreoPorPuntoDTO cfg = parametroSistemaService.getEstadosRastreoPorPunto();
        validarConfiguracionRangoConsolidados(cfg);
        EstadoRastreo base = estadoRastreoService.findEntityById(cfg.getEstadoRastreoAsociarEnvioConsolidadoId());
        EstadoRastreo limite = estadoRastreoService.findEntityById(cfg.getEstadoRastreoEnLoteRecepcionId());
        int orden = ordenOrThrow(destino);
        // El destino debe ser posterior a la asociación a consolidado y
        // ANTERIOR a "llega a bodega" (en lote de recepción): ese estado lo
        // produce el flujo de lote de recepción, no el avance automático.
        if (orden <= ordenOrThrow(base) || orden >= ordenOrThrow(limite)) {
            throw new ConflictException(
                    "El estado final no es compatible con el flujo de envíos consolidados. "
                            + "El estado de llegada a bodega se aplica al ingresar el consolidado a un lote de recepción.");
        }
    }

    private void validarConfiguracionRangoConsolidados(EstadosRastreoPorPuntoDTO cfg) {
        if (cfg == null
                || cfg.getEstadoRastreoAsociarEnvioConsolidadoId() == null
                || cfg.getEstadoRastreoEnLoteRecepcionId() == null) {
            throw new ConflictException(
                    "La configuración de estados para envíos consolidados está incompleta.");
        }
    }

    private Map<Long, EstadoEnvioConsolidadoOperativo> simularEfectos(
            List<EnvioConsolidado> consolidados, List<PasoCalculado> pasos) {
        Map<Long, EstadoEnvioConsolidadoOperativo> estados = new HashMap<>();
        for (EnvioConsolidado envio : consolidados) estados.put(envio.getId(), envio.getEstadoOperativo());
        for (PasoCalculado paso : pasos) {
            for (EnvioConsolidado envio : consolidados) {
                EstadoEnvioConsolidadoOperativo actual = estados.get(envio.getId());
                EstadoEnvioConsolidadoOperativo requerido = paso.transicion().estadoPrevio();
                if (actual != requerido) {
                    throw new ConflictException(
                            "El consolidado " + envio.getCodigo() + " está en " + actual
                                    + " y la transición '" + paso.transicion().etiqueta()
                                    + "' requiere " + requerido + ".");
                }
                estados.put(envio.getId(), paso.transicion().estadoResultante());
            }
        }
        return estados;
    }

    private void aplicarEfectoOperativo(List<EnvioConsolidado> consolidados, PasoCalculado paso) {
        for (EnvioConsolidado envio : consolidados) {
            EstadoEnvioConsolidadoOperativo requerido = paso.transicion().estadoPrevio();
            if (envio.getEstadoOperativo() != requerido) {
                throw new ConflictException("El estado operativo del consolidado cambió durante la operación.");
            }
            EstadoEnvioConsolidadoOperativo resultante = paso.transicion().estadoResultante();
            envio.setEstadoOperativo(resultante);
            if (resultante == EstadoEnvioConsolidadoOperativo.CERRADO) envio.setFechaCierre(paso.fecha());
            if (resultante == EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA) envio.setFechaCerrado(paso.fecha());
            if (resultante == EstadoEnvioConsolidadoOperativo.ARRIBADO_ECUADOR) envio.setFechaArriboEcuador(paso.fecha());
        }
        envioConsolidadoRepository.saveAll(consolidados);
    }

    private int ordenOrThrow(EstadoRastreo estado) {
        Integer orden = PaqueteService.ordenEfectivo(estado);
        if (orden == null) throw new BadRequestException("Un estado de la secuencia no tiene orden configurado.");
        return orden;
    }

    private AvanceEstadosConsolidadosPreviewDTO.Paso pasoDto(PasoCalculado paso) {
        return AvanceEstadosConsolidadosPreviewDTO.Paso.builder()
                .transicionCodigo(paso.transicion().codigo())
                .transicionEtiqueta(paso.transicion().etiqueta())
                .orden(paso.transicion().orden()).fecha(paso.fecha())
                .estadoResultante(paso.transicion().estadoResultante())
                .estadoAplicadoPaquetes(estadoPaqueteDto(paso.transicion().estadoPaquete()))
                .tipo("REQUERIDA")
                .build();
    }

    private List<TransicionOperativaDef> catalogoTransiciones() {
        EstadosRastreoPorPuntoDTO config = parametroSistemaService.getEstadosRastreoPorPunto();
        if (config == null) {
            throw new ConflictException("La configuración de estados para envíos consolidados está incompleta.");
        }
        return List.of(
                        crearTransicion(
                                EstadoEnvioConsolidadoOperativo.CERRADO,
                                EstadoEnvioConsolidadoOperativo.EN_PREPARACION,
                                config.getEstadoRastreoCierreConsolidadoId(),
                                1),
                        crearTransicion(
                                EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA,
                                EstadoEnvioConsolidadoOperativo.CERRADO,
                                config.getEstadoRastreoEnviadoDesdeUsaId(),
                                2),
                        crearTransicion(
                                EstadoEnvioConsolidadoOperativo.ARRIBADO_ECUADOR,
                                EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA,
                                config.getEstadoRastreoArriboEcuadorId(),
                                3))
                .stream()
                .sorted(Comparator.comparingInt(TransicionOperativaDef::orden))
                .toList();
    }

    private TransicionOperativaDef crearTransicion(
            EstadoEnvioConsolidadoOperativo resultante,
            EstadoEnvioConsolidadoOperativo previo,
            Long estadoPaqueteId,
            int ordenOperativo) {
        String codigo = resultante.name();
        String etiqueta = formatearEstadoOperativo(resultante);
        if (estadoPaqueteId == null) {
            return new TransicionOperativaDef(
                    codigo, etiqueta, previo, resultante, null, ordenOperativo, false,
                    "No hay un estado de rastreo configurado para esta transición.");
        }
        EstadoRastreo estadoPaquete = estadoRastreoService.findEntityById(estadoPaqueteId);
        boolean disponible = Boolean.TRUE.equals(estadoPaquete.getActivo());
        String problema = disponible
                ? null
                : "El estado de rastreo configurado está inactivo.";
        return new TransicionOperativaDef(
                codigo, etiqueta, previo, resultante, estadoPaquete, ordenOperativo, disponible, problema);
    }

    private String formatearEstadoOperativo(EstadoEnvioConsolidadoOperativo estado) {
        String texto = estado.name().toLowerCase(Locale.ROOT).replace('_', ' ');
        return texto.substring(0, 1).toUpperCase(Locale.ROOT) + texto.substring(1);
    }

    private TransicionOperativaDef buscarTransicion(
            List<TransicionOperativaDef> catalogo,
            String codigo) {
        String normalizado = codigo != null ? codigo.trim().toUpperCase(Locale.ROOT) : "";
        return catalogo.stream()
                .filter(transicion -> transicion.codigo().equals(normalizado))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Transición operativa no encontrada: " + codigo));
    }

    private void validarTransicionDisponible(TransicionOperativaDef transicion) {
        if (!transicion.disponible() || transicion.estadoPaquete() == null) {
            throw new ConflictException(
                    transicion.problemaConfiguracion() != null
                            ? transicion.problemaConfiguracion()
                            : "La transición operativa tiene una configuración incompleta.");
        }
    }

    private TransicionOperativaConsolidadoDTO.EstadoPaquete estadoPaqueteDto(EstadoRastreo estado) {
        if (estado == null) return null;
        return TransicionOperativaConsolidadoDTO.EstadoPaquete.builder()
                .id(estado.getId())
                .codigo(estado.getCodigo())
                .nombre(estado.getNombre())
                .orden(PaqueteService.ordenEfectivo(estado))
                .build();
    }

    private String construirToken(List<EnvioConsolidado> consolidados, List<Paquete> paquetes,
                                  TransicionOperativaDef inicial, TransicionOperativaDef destino,
                                  List<PasoCalculado> pasos) {
        String canonical = consolidados.stream().sorted(Comparator.comparing(EnvioConsolidado::getId))
                .map(e -> e.getId() + ":" + e.getVersion() + ":" + e.getEstadoOperativo())
                .collect(Collectors.joining("|"))
                + "#" + paquetes.stream().sorted(Comparator.comparing(Paquete::getId))
                .map(p -> p.getId() + ":" + p.getVersion() + ":"
                        + p.getEnvioConsolidado().getId() + ":"
                        + (p.getEstadoRastreo() != null ? p.getEstadoRastreo().getId() : "null"))
                .collect(Collectors.joining("|"))
                + "#" + inicial.codigo() + ">" + destino.codigo()
                + "#" + pasos.stream().map(p -> p.transicion().codigo() + "@" + p.fecha())
                        .collect(Collectors.joining("|"));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }

    private record PasoCalculado(TransicionOperativaDef transicion, LocalDateTime fecha) {}

    private record TransicionOperativaDef(
            String codigo,
            String etiqueta,
            EstadoEnvioConsolidadoOperativo estadoPrevio,
            EstadoEnvioConsolidadoOperativo estadoResultante,
            EstadoRastreo estadoPaquete,
            Integer orden,
            boolean disponible,
            String problemaConfiguracion) {

        private TransicionOperativaConsolidadoDTO dto() {
            return TransicionOperativaConsolidadoDTO.builder()
                    .id(codigo)
                    .codigo(codigo)
                    .etiqueta(etiqueta)
                    .orden(orden)
                    .estadoPrevioRequerido(estadoPrevio)
                    .estadoResultante(estadoResultante)
                    .estadoAplicadoPaquetes(estadoPaquete != null
                            ? TransicionOperativaConsolidadoDTO.EstadoPaquete.builder()
                                    .id(estadoPaquete.getId())
                                    .codigo(estadoPaquete.getCodigo())
                                    .nombre(estadoPaquete.getNombre())
                                    .orden(PaqueteService.ordenEfectivo(estadoPaquete))
                                    .build()
                            : null)
                    .disponible(disponible)
                    .tipo("REQUERIDA")
                    .requisitos(List.of("Estado operativo previo: " + estadoPrevio))
                    .permiso("ENVIOS_CONSOLIDADOS_UPDATE")
                    .problemaConfiguracion(problemaConfiguracion)
                    .build();
        }
    }

    private record CalculoAvance(AvanceEstadosConsolidadosPreviewDTO preview,
                                 List<EnvioConsolidado> consolidados, List<Paquete> paquetes,
                                 List<PasoCalculado> pasos, TransicionOperativaDef destino) {}

    /**
     * Aplica una transición de estado OPERATIVO a consolidados (por ids o por periodo
     * de creación). Solo admite los destinos con acción real: CERRADO (cerrar),
     * ENVIADO_DESDE_USA (enviar desde USA), ARRIBADO_ECUADOR (arribar a Ecuador),
     * EN_PREPARACION (reabrir) y CANCELADO (cancelar, desde cualquier estado salvo
     * LIQUIDADO o CANCELADO). Cada consolidado debe estar en el estado de origen
     * correspondiente. El lote completo se valida antes de aplicar cambios.
     */
    @Transactional
    public AplicarTransicionConsolidadosResponse aplicarTransicionOperativa(
            String estadoOperativoDestino,
            List<Long> consolidadoIds,
            LocalDate fechaInicio,
            LocalDate fechaFin) {
        EstadoEnvioConsolidadoOperativo destino;
        try {
            destino = EstadoEnvioConsolidadoOperativo.valueOf(
                    estadoOperativoDestino != null ? estadoOperativoDestino.trim() : "");
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(
                    "No se puede aplicar la transición porque el estado operativo destino no es válido. "
                            + "Usa uno de los estados permitidos para envíos consolidados.");
        }
        boolean destinoValido = switch (destino) {
            case CERRADO, ENVIADO_DESDE_USA, ARRIBADO_ECUADOR, EN_PREPARACION, CANCELADO -> true;
            default -> false;
        };
        if (!destinoValido) {
            throw new BadRequestException(
                    "No se puede aplicar la transición manual al estado " + destino.name()
                            + " porque ese estado se deriva automáticamente. "
                            + "Estados destino permitidos: CERRADO, ENVIADO_DESDE_USA, ARRIBADO_ECUADOR, "
                            + "EN_PREPARACION o CANCELADO.");
        }

        boolean periodo = fechaInicio != null && fechaFin != null;
        List<EnvioConsolidado> universo;
        if (periodo) {
            LocalDateTime desde = fechaInicio.atStartOfDay();
            LocalDateTime hasta = fechaFin.atTime(LocalTime.MAX);
            universo = envioConsolidadoRepository.findAll(
                    (root, query, cb) -> cb.between(root.get("createdAt"), desde, hasta));
        } else {
            if (consolidadoIds == null || consolidadoIds.isEmpty()) {
                throw new BadRequestException(
                        "No se puede aplicar la transición porque no se indicó ningún envío consolidado "
                                + "ni un periodo de fechas. Selecciona consolidados o define un periodo para continuar.");
            }
            List<Long> ids = consolidadoIds.stream()
                    .filter(java.util.Objects::nonNull)
                    .distinct()
                    .toList();
            universo = envioConsolidadoRepository.findAllById(ids);
            if (universo.size() != ids.size()) {
                Set<Long> encontrados = universo.stream()
                        .map(EnvioConsolidado::getId)
                        .collect(Collectors.toSet());
                Long faltante = ids.stream()
                        .filter(id -> !encontrados.contains(id))
                        .findFirst()
                        .orElse(null);
                throw new ResourceNotFoundException("Envío consolidado", faltante);
            }
        }

        List<Long> idsUniverso = universo.stream().map(EnvioConsolidado::getId).toList();
        List<Paquete> paquetes = idsUniverso.isEmpty()
                ? List.of()
                : paqueteRepository.findByEnvioConsolidadoIdInWithEstado(idsUniverso);
        Map<Long, Long> totales = paquetes.stream()
                .collect(Collectors.groupingBy(
                        paquete -> paquete.getEnvioConsolidado().getId(),
                        Collectors.counting()));
        for (EnvioConsolidado envio : universo) {
            validarPuedeCambiarEstado(envio, totales.getOrDefault(envio.getId(), 0L));
            validarTransicionOperativa(envio, destino);
        }
        for (EnvioConsolidado envio : universo) {
            switch (destino) {
                case CERRADO -> cerrarConsolidado(envio.getId());
                case ENVIADO_DESDE_USA -> enviarDesdeUsa(envio.getId(), null);
                case ARRIBADO_ECUADOR -> marcarArribadoEcuador(envio.getId(), null);
                case EN_PREPARACION -> reabrir(envio.getId());
                case CANCELADO -> cancelarConsolidado(envio.getId());
                default -> throw new BadRequestException("Transición no soportada: " + destino);
            }
        }
        return AplicarTransicionConsolidadosResponse.builder()
                .consolidadosProcesados(universo.size())
                .rechazados(List.of())
                .build();
    }

    // ------------------------------------------------------------------
    // Avance automático OPERATIVO (estados del consolidado, NO de rastreo)
    // ------------------------------------------------------------------

    /**
     * Destinos seleccionables del avance automático operativo: CERRADO,
     * ENVIADO_DESDE_USA y ARRIBADO_ECUADOR. No incluye RECIBIDO_EN_BODEGA (se
     * asigna al ingresar el consolidado a un lote de recepción) ni estados
     * terminales o de preparación.
     */
    @Transactional(readOnly = true)
    public List<DestinoAvanceOperativoDTO> listarDestinosAvanceOperativo() {
        return EstadoEnvioConsolidadoOperativo.destinosAvanceOperativo().stream()
                .map(e -> DestinoAvanceOperativoDTO.builder()
                        .codigo(e.name())
                        .nombre(nombreOperativo(e))
                        .build())
                .toList();
    }

    /**
     * Candidatos para el avance operativo: consolidados con paquetes cuyo estado
     * operativo es un origen válido (EN_PREPARACION, CERRADO o ENVIADO_DESDE_USA).
     */
    @Transactional(readOnly = true)
    public List<EnvioConsolidado> listarCandidatosAvanceOperativo() {
        return envioConsolidadoRepository.findCandidatosAvanceEstados(List.of(
                EstadoEnvioConsolidadoOperativo.EN_PREPARACION,
                EstadoEnvioConsolidadoOperativo.CERRADO,
                EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA));
    }

    @Transactional(readOnly = true)
    public AvanceOperativoConsolidadosPreviewDTO previewAvanceOperativo(
            AvanceOperativoConsolidadosRequest request) {
        return calcularAvanceOperativo(request, false).preview();
    }

    /**
     * Aplica el avance operativo de forma atómica: para cada consolidado ejecuta
     * en secuencia las transiciones operativas existentes (cerrar, enviar desde
     * USA, arribar a Ecuador) hasta el destino. NO conduce el flujo por estados
     * de rastreo; cada transición operativa ya aplica sus propios efectos.
     */
    @Transactional
    public AvanceOperativoConsolidadosResponse aplicarAvanceOperativo(
            AvanceOperativoConsolidadosRequest request) {
        if (request.getPreviewToken() == null || request.getPreviewToken().isBlank()) {
            throw new BadRequestException("Actualiza la vista previa antes de aplicar el avance.");
        }
        CalculoAvanceOperativo calculo = calcularAvanceOperativo(request, true);
        if (!request.getPreviewToken().equals(calculo.preview().getPreviewToken())) {
            throw new ConflictException(
                    "Los consolidados cambiaron después de la vista previa. "
                            + "Actualiza la vista previa antes de reintentar.");
        }
        int pasosAplicados = 0;
        for (PlanConsolidado plan : calculo.planes()) {
            for (EstadoEnvioConsolidadoOperativo paso : plan.pasos()) {
                switch (paso) {
                    case CERRADO -> cerrarConsolidado(plan.id());
                    case ENVIADO_DESDE_USA -> enviarDesdeUsa(plan.id(), null);
                    case ARRIBADO_ECUADOR -> marcarArribadoEcuador(plan.id(), null);
                    default -> throw new BadRequestException(
                            "Paso operativo no soportado en el avance automático: " + paso);
                }
                pasosAplicados++;
            }
        }
        return AvanceOperativoConsolidadosResponse.builder()
                .consolidadosProcesados(calculo.planes().size())
                .pasosAplicados(pasosAplicados)
                .estadoFinal(calculo.destino().name())
                .estadoFinalNombre(nombreOperativo(calculo.destino()))
                .build();
    }

    private CalculoAvanceOperativo calcularAvanceOperativo(
            AvanceOperativoConsolidadosRequest request, boolean bloquear) {
        if (request == null || request.getConsolidadoIds() == null
                || request.getConsolidadoIds().isEmpty()) {
            throw new BadRequestException("Selecciona al menos un envío consolidado.");
        }
        EstadoEnvioConsolidadoOperativo destino = parseDestinoOperativo(request.getEstadoOperativoDestino());
        validarDestinoAvanceOperativo(destino);

        List<Long> ids = request.getConsolidadoIds().stream()
                .filter(Objects::nonNull).distinct().sorted().toList();
        if (ids.size() != request.getConsolidadoIds().size()) {
            throw new BadRequestException("La selección contiene IDs nulos o repetidos.");
        }
        List<EnvioConsolidado> consolidados = bloquear
                ? envioConsolidadoRepository.findAllByIdForUpdate(ids)
                : envioConsolidadoRepository.findAllById(ids);
        if (consolidados.size() != ids.size()) {
            Set<Long> encontrados = consolidados.stream()
                    .map(EnvioConsolidado::getId).collect(Collectors.toSet());
            Long faltante = ids.stream().filter(id -> !encontrados.contains(id)).findFirst().orElse(null);
            throw new ResourceNotFoundException("Envío consolidado", faltante);
        }

        List<PlanConsolidado> planes = new ArrayList<>();
        for (EnvioConsolidado envio : consolidados) {
            validarPuedeCambiarEstado(envio);
            EstadoEnvioConsolidadoOperativo actual = envio.getEstadoOperativo();
            validarOrigenAvanceOperativo(envio, actual, destino);
            planes.add(new PlanConsolidado(
                    envio.getId(), envio.getCodigo(), actual, pasosOperativos(actual, destino)));
        }

        // Unión ordenada de pasos para mostrar el camino en el preview.
        java.util.LinkedHashSet<EstadoEnvioConsolidadoOperativo> pasosUnion = new java.util.LinkedHashSet<>();
        for (EstadoEnvioConsolidadoOperativo e : EstadoEnvioConsolidadoOperativo.secuenciaAvanceOperativo()) {
            if (planes.stream().anyMatch(p -> p.pasos().contains(e))) pasosUnion.add(e);
        }

        String token = construirTokenOperativo(consolidados, destino);
        List<AvanceOperativoConsolidadosPreviewDTO.Consolidado> detalles = consolidados.stream()
                .sorted(Comparator.comparing(EnvioConsolidado::getId))
                .map(e -> {
                    PlanConsolidado plan = planes.stream()
                            .filter(p -> p.id().equals(e.getId())).findFirst().orElseThrow();
                    return AvanceOperativoConsolidadosPreviewDTO.Consolidado.builder()
                            .id(e.getId()).codigo(e.getCodigo())
                            .estadoOperativoActual(plan.actual())
                            .estadoOperativoFinal(destino)
                            .pasos(plan.pasos().stream().map(this::pasoOperativoDto).toList())
                            .version(e.getVersion())
                            .build();
                })
                .toList();
        AvanceOperativoConsolidadosPreviewDTO preview = AvanceOperativoConsolidadosPreviewDTO.builder()
                .previewToken(token)
                .estadoDestino(pasoOperativoDto(destino))
                .pasos(pasosUnion.stream().map(this::pasoOperativoDto).toList())
                .consolidados(detalles)
                .resumen(AvanceOperativoConsolidadosPreviewDTO.Resumen.builder()
                        .totalConsolidados(consolidados.size())
                        .totalPasos(planes.stream().mapToInt(p -> p.pasos().size()).sum())
                        .build())
                .advertencias(List.of(
                        "La operación es atómica: si falla un paso, no se aplicará ningún cambio.",
                        "El estado 'Recibido en bodega' no se asigna aquí; se registra al ingresar el "
                                + "consolidado a un lote de recepción."))
                .build();
        return new CalculoAvanceOperativo(preview, planes, destino);
    }

    private EstadoEnvioConsolidadoOperativo parseDestinoOperativo(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BadRequestException("Selecciona el estado operativo destino del avance.");
        }
        try {
            return EstadoEnvioConsolidadoOperativo.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(
                    "El estado operativo destino '" + raw + "' no es válido.");
        }
    }

    private void validarDestinoAvanceOperativo(EstadoEnvioConsolidadoOperativo destino) {
        if (destino == EstadoEnvioConsolidadoOperativo.RECIBIDO_EN_BODEGA) {
            throw new BadRequestException(
                    "El estado 'Recibido en bodega' no es un destino del avance automático. "
                            + "Se asigna al registrar el consolidado en un lote de recepción.");
        }
        if (!destino.esDestinoAvanceOperativo()) {
            throw new BadRequestException(
                    "El destino " + destino + " no es válido para el avance automático operativo. "
                            + "Destinos permitidos: CERRADO, ENVIADO_DESDE_USA, ARRIBADO_ECUADOR.");
        }
    }

    private void validarOrigenAvanceOperativo(EnvioConsolidado envio,
                                              EstadoEnvioConsolidadoOperativo actual,
                                              EstadoEnvioConsolidadoOperativo destino) {
        if (actual == EstadoEnvioConsolidadoOperativo.RECIBIDO_EN_BODEGA) {
            throw new ConflictException(
                    "El consolidado " + envio.getCodigo() + " ya fue recibido en bodega; "
                            + "ese estado no participa del avance automático.");
        }
        if (actual == EstadoEnvioConsolidadoOperativo.LIQUIDADO
                || actual == EstadoEnvioConsolidadoOperativo.CANCELADO) {
            throw new ConflictException(
                    "El consolidado " + envio.getCodigo() + " está " + actual
                            + " y no admite avance operativo.");
        }
        int ordenActual = actual.ordenAvanceOperativo();
        if (ordenActual < 0) {
            throw new ConflictException(
                    "El consolidado " + envio.getCodigo()
                            + " no está en un estado que admita avance operativo (estado actual: "
                            + actual + ").");
        }
        if (ordenActual >= destino.ordenAvanceOperativo()) {
            throw new ConflictException(
                    "El consolidado " + envio.getCodigo() + " ya está en " + actual
                            + " y no puede avanzar a " + destino + ".");
        }
    }

    /** Pasos operativos en (actual, destino], en orden progresivo. */
    private List<EstadoEnvioConsolidadoOperativo> pasosOperativos(
            EstadoEnvioConsolidadoOperativo actual, EstadoEnvioConsolidadoOperativo destino) {
        int ordenActual = actual.ordenAvanceOperativo();
        int ordenDestino = destino.ordenAvanceOperativo();
        List<EstadoEnvioConsolidadoOperativo> pasos = new ArrayList<>();
        for (EstadoEnvioConsolidadoOperativo e : EstadoEnvioConsolidadoOperativo.secuenciaAvanceOperativo()) {
            int orden = e.ordenAvanceOperativo();
            if (orden > ordenActual && orden <= ordenDestino) pasos.add(e);
        }
        return pasos;
    }

    private AvanceOperativoConsolidadosPreviewDTO.Paso pasoOperativoDto(EstadoEnvioConsolidadoOperativo estado) {
        return AvanceOperativoConsolidadosPreviewDTO.Paso.builder()
                .codigo(estado.name()).nombre(nombreOperativo(estado)).build();
    }

    private String construirTokenOperativo(List<EnvioConsolidado> consolidados,
                                           EstadoEnvioConsolidadoOperativo destino) {
        String canonical = consolidados.stream().sorted(Comparator.comparing(EnvioConsolidado::getId))
                .map(e -> e.getId() + ":" + e.getVersion() + ":" + e.getEstadoOperativo())
                .collect(Collectors.joining("|"))
                + "#" + destino.name();
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }

    private String nombreOperativo(EstadoEnvioConsolidadoOperativo estado) {
        return switch (estado) {
            case VACIO -> "Vacío";
            case EN_PREPARACION -> "En preparación";
            case CERRADO -> "Cerrado";
            case ENVIADO_DESDE_USA -> "Enviado desde USA";
            case ARRIBADO_ECUADOR -> "Arribado a Ecuador";
            case RECIBIDO_EN_BODEGA -> "Recibido en bodega";
            case LIQUIDADO -> "Liquidado";
            case CANCELADO -> "Cancelado";
        };
    }

    private record PlanConsolidado(Long id, String codigo,
                                   EstadoEnvioConsolidadoOperativo actual,
                                   List<EstadoEnvioConsolidadoOperativo> pasos) {}

    private record CalculoAvanceOperativo(AvanceOperativoConsolidadosPreviewDTO preview,
                                          List<PlanConsolidado> planes,
                                          EstadoEnvioConsolidadoOperativo destino) {}

    /**
     * Cierra el consolidado para registro (EN_PREPARACION → CERRADO). Aplica
     * el estado configurable "Manifestado" a todos los paquetes del consolidado.
     */
    @Transactional
    public EnvioConsolidado cerrarConsolidado(Long envioId) {
        EnvioConsolidado envio = findById(envioId);
        validarPuedeCambiarEstado(envio);
        if (envio.getEstadoOperativo() == EstadoEnvioConsolidadoOperativo.CERRADO) {
            return envio;
        }
        if (envio.getEstadoOperativo() != EstadoEnvioConsolidadoOperativo.EN_PREPARACION) {
            throw new BadRequestException(
                    "No se puede cerrar el envío consolidado porque no está en preparación. "
                            + "Estado actual: " + envio.getEstadoOperativo()
                            + ". Regla: solo los envíos en preparación se pueden cerrar.");
        }
        LocalDateTime ahora = LocalDateTime.now();
        envio.setEstadoOperativo(EstadoEnvioConsolidadoOperativo.CERRADO);
        envio.setFechaCierre(ahora);
        recalcularTotales(envio);
        EnvioConsolidado guardado = envioConsolidadoRepository.save(envio);
        List<Paquete> paquetes = paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(envio.getId());
        if (!paquetes.isEmpty()) {
            List<Long> ids = paquetes.stream().map(Paquete::getId).toList();
            paqueteService.aplicarEstadoCierreConsolidado(ids, ahora);
        }
        return guardado;
    }

    /** Marca el envío como enviado desde USA (CERRADO → ENVIADO_DESDE_USA). */
    @Transactional
    public EnvioConsolidado enviarDesdeUsa(Long envioId, LocalDateTime fechaEvento) {
        EnvioConsolidado envio = findById(envioId);
        validarPuedeCambiarEstado(envio);
        if (envio.getEstadoOperativo() == EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA) {
            return envio;
        }
        if (envio.getEstadoOperativo() != EstadoEnvioConsolidadoOperativo.CERRADO) {
            throw new BadRequestException(
                    "No se puede marcar el envío consolidado como enviado desde USA porque no está cerrado. "
                            + "Estado actual: " + envio.getEstadoOperativo()
                            + ". Regla: solo un envío cerrado se puede enviar desde USA. Ciérralo primero.");
        }
        LocalDateTime fechaSalidaUsa = fechaEvento != null ? fechaEvento : LocalDateTime.now();
        envio.setEstadoOperativo(EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA);
        envio.setFechaCerrado(fechaSalidaUsa);
        recalcularTotales(envio);
        EnvioConsolidado guardado = envioConsolidadoRepository.save(envio);
        List<Paquete> paquetes = paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(envio.getId());
        if (!paquetes.isEmpty()) {
            List<Long> ids = paquetes.stream().map(Paquete::getId).toList();
            paqueteService.aplicarEstadoEnviadoDesdeUsa(ids, fechaSalidaUsa);
        }
        return guardado;
    }

    /** Registra el arribo a Ecuador / aduana destino (ENVIADO_DESDE_USA → ARRIBADO_ECUADOR). */
    @Transactional
    public EnvioConsolidado marcarArribadoEcuador(Long envioId, LocalDateTime fechaEvento) {
        EnvioConsolidado envio = findById(envioId);
        validarPuedeCambiarEstado(envio);
        if (envio.getEstadoOperativo() == EstadoEnvioConsolidadoOperativo.ARRIBADO_ECUADOR) {
            return envio;
        }
        if (envio.getEstadoOperativo() != EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA) {
            throw new BadRequestException(
                    "No se puede registrar el arribo a Ecuador porque el envío consolidado no está enviado desde USA. "
                            + "Estado actual: " + envio.getEstadoOperativo()
                            + ". Regla: solo un envío enviado desde USA puede arribar a Ecuador. "
                            + "Márcalo como enviado primero.");
        }
        LocalDateTime fechaArribo = fechaEvento != null ? fechaEvento : LocalDateTime.now();
        envio.setEstadoOperativo(EstadoEnvioConsolidadoOperativo.ARRIBADO_ECUADOR);
        envio.setFechaArriboEcuador(fechaArribo);
        EnvioConsolidado guardado = envioConsolidadoRepository.save(envio);
        List<Paquete> paquetes = paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(envio.getId());
        if (!paquetes.isEmpty()) {
            List<Long> ids = paquetes.stream().map(Paquete::getId).toList();
            paqueteService.aplicarEstadoArriboEcuador(ids, fechaArribo);
        }
        return guardado;
    }

    /** Cancela el consolidado desde cualquier estado, salvo LIQUIDADO o CANCELADO. */
    @Transactional
    public EnvioConsolidado cancelarConsolidado(Long envioId) {
        EnvioConsolidado envio = findById(envioId);
        validarPuedeCambiarEstado(envio);
        EstadoEnvioConsolidadoOperativo actual = envio.getEstadoOperativo();
        if (actual == EstadoEnvioConsolidadoOperativo.LIQUIDADO
                || actual == EstadoEnvioConsolidadoOperativo.CANCELADO) {
            throw new BadRequestException(
                    "No se puede cancelar el envío consolidado porque ya está liquidado o cancelado. "
                            + "Estado actual: " + actual
                            + ". Regla: un envío liquidado o cancelado no admite cancelación.");
        }
        envio.setEstadoOperativo(EstadoEnvioConsolidadoOperativo.CANCELADO);
        return envioConsolidadoRepository.save(envio);
    }

    /** @deprecated Usar {@link #enviarDesdeUsa(Long, LocalDateTime)}. */
    @Deprecated
    @Transactional
    public EnvioConsolidado cerrar(Long envioId, LocalDateTime fechaEvento) {
        return enviarDesdeUsa(envioId, fechaEvento);
    }

    /**
     * Revierte el envío a EN_PREPARACION desde CERRADO o ENVIADO_DESDE_USA.
     *
     * <p>Reglas:
     * <ul>
     *   <li>Si pertenece a una liquidación pagada, no se puede reabrir desde
     *       ENVIADO_DESDE_USA (el operario debe desmarcar el pago primero).</li>
     *   <li>Al reabrir desde ENVIADO_DESDE_USA también se revierte estadoPago a
     *       NO_PAGADO por simetría con la operación de marcar pagado.</li>
     * </ul>
     */
    @Transactional
    public EnvioConsolidado reabrir(Long envioId) {
        EnvioConsolidado envio = findById(envioId);
        validarPuedeCambiarEstado(envio);
        EstadoEnvioConsolidadoOperativo actual = envio.getEstadoOperativo();
        if (actual == EstadoEnvioConsolidadoOperativo.EN_PREPARACION
                || actual == EstadoEnvioConsolidadoOperativo.VACIO) {
            return envio;
        }
        if (actual != EstadoEnvioConsolidadoOperativo.CERRADO
                && actual != EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA) {
            throw new BadRequestException(
                    "No se puede reabrir el envío consolidado desde su estado actual: " + actual
                            + ". Regla: solo se puede reabrir un envío cerrado o enviado desde USA.");
        }
        boolean veniaDeEnviado = actual == EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA;
        if (veniaDeEnviado) {
            // Si esta dentro de una liquidacion pagada, bloquear la reapertura.
            liquidacionConsolidadoLineaRepository.findByEnvioConsolidadoId(envioId)
                    .map(LiquidacionConsolidadoLinea::getLiquidacion)
                    .filter(liq -> liq.getEstadoPago() == EstadoPagoConsolidado.PAGADO)
                    .ifPresent(liq -> {
                        throw new BadRequestException(
                                "No se puede reabrir el envío consolidado porque pertenece a la "
                                        + "liquidación " + liq.getCodigo()
                                        + ", que está marcada como pagada. "
                                        + "Regla: un envío de una liquidación pagada no se puede reabrir. "
                                        + "Desmarca el pago de esa liquidación primero.");
                    });
            envio.setFechaCerrado(null);
            if (envio.getEstadoPago() != EstadoPagoConsolidado.NO_PAGADO) {
                envio.setEstadoPago(EstadoPagoConsolidado.NO_PAGADO);
            }
        }
        envio.setEstadoOperativo(EstadoEnvioConsolidadoOperativo.EN_PREPARACION);
        envio.setFechaCierre(null);
        EnvioConsolidado guardado = envioConsolidadoRepository.save(envio);
        List<Paquete> paquetes = paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(envio.getId());
        if (!paquetes.isEmpty()) {
            List<Long> ids = paquetes.stream().map(Paquete::getId).toList();
            if (veniaDeEnviado) {
                paqueteService.revertirEstadoSiUltimoEventoCoincide(ids, "ENVIADO_USA_AUTO");
            }
            paqueteService.revertirEstadoSiUltimoEventoCoincide(ids, "CIERRE_CONSOLIDADO_AUTO");
        }
        return guardado;
    }

    private void validarPuedeCambiarEstado(EnvioConsolidado envio) {
        validarPuedeCambiarEstado(
                envio,
                paqueteRepository.countByEnvioConsolidadoId(envio.getId()));
    }

    private void validarPuedeCambiarEstado(EnvioConsolidado envio, long totalPaquetes) {
        if (totalPaquetes <= 0) {
            throw new ConflictException(MENSAJE_REQUIERE_PAQUETE);
        }
        if (envio.getEstadoOperativo() == null
                || envio.getEstadoOperativo() == EstadoEnvioConsolidadoOperativo.VACIO) {
            throw new ConflictException(
                    "El consolidado no tiene un estado operativo válido para cambiar de estado.");
        }
    }

    private void validarTransicionOperativa(
            EnvioConsolidado envio,
            EstadoEnvioConsolidadoOperativo destino) {
        EstadoEnvioConsolidadoOperativo actual = envio.getEstadoOperativo();
        boolean permitida = switch (destino) {
            case CERRADO -> actual == EstadoEnvioConsolidadoOperativo.EN_PREPARACION
                    || actual == EstadoEnvioConsolidadoOperativo.CERRADO;
            case ENVIADO_DESDE_USA -> actual == EstadoEnvioConsolidadoOperativo.CERRADO
                    || actual == EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA;
            case ARRIBADO_ECUADOR -> actual == EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA
                    || actual == EstadoEnvioConsolidadoOperativo.ARRIBADO_ECUADOR;
            case EN_PREPARACION -> actual == EstadoEnvioConsolidadoOperativo.CERRADO
                    || actual == EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA
                    || actual == EstadoEnvioConsolidadoOperativo.EN_PREPARACION;
            case CANCELADO -> actual != EstadoEnvioConsolidadoOperativo.LIQUIDADO
                    && actual != EstadoEnvioConsolidadoOperativo.CANCELADO;
            default -> false;
        };
        if (!permitida) {
            throw new BadRequestException(
                    "El consolidado " + envio.getCodigo() + " no puede pasar de "
                            + actual + " a " + destino + ".");
        }
    }

    /**
     * Elimina definitivamente un envio consolidado. Solo permitido si el envio
     * esta <em>en preparacion</em>: un envio ya enviado desde USA se considera historico y debe
     * reabrirse antes de poder borrarse.
     *
     * <p>El parametro {@code eliminarPaquetes} controla que pasa con las
     * piezas asociadas:
     * <ul>
     *   <li>{@code false} (default seguro): se desasocian (set FK = null) y
     *       siguen existiendo en el sistema, listas para reasignarse a otro
     *       envio.</li>
     *   <li>{@code true}: se eliminan tambien los paquetes (incluyendo sus
     *       eventos de tracking y outbox). Operacion irreversible.</li>
     * </ul>
     */
    @Transactional
    public void eliminar(Long envioId, boolean eliminarPaquetes) {
        EnvioConsolidado envio = findById(envioId);
        if (envio.isCerrado()) {
            throw new ConflictException(
                    "No se puede eliminar el envío consolidado porque ya está cerrado o enviado desde USA. "
                            + "Estado actual: " + envio.getEstadoOperativo()
                            + ". Regla: un envío cerrado es histórico y no se puede borrar. "
                            + "Reábrelo primero si necesitas eliminarlo.");
        }
        long totalPaquetes = paqueteRepository.countByEnvioConsolidadoId(envio.getId());
        if (totalPaquetes > 0) {
            if (eliminarPaquetes) {
                paqueteService.deleteAllByEnvioConsolidadoId(envio.getId());
            } else {
                List<Paquete> paquetes = paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(envio.getId());
                for (Paquete p : paquetes) {
                    p.setEnvioConsolidado(null);
                }
                paqueteRepository.saveAll(paquetes);
            }
        }
        envioConsolidadoRepository.delete(envio);
    }

    private void recalcularTotales(EnvioConsolidado envio) {
        long total = paqueteRepository.countByEnvioConsolidadoId(envio.getId());
        BigDecimal pesoTotal = paqueteRepository.sumPesoLbsByEnvioConsolidadoId(envio.getId());
        envio.setTotalPaquetes((int) total);
        envio.setPesoTotalLbs(pesoTotal != null ? pesoTotal : BigDecimal.ZERO);
    }

    @Transactional
    public void sincronizarTotales(Long envioId) {
        if (envioId == null) return;
        EnvioConsolidado envio = envioConsolidadoRepository.findById(envioId).orElse(null);
        if (envio == null) return;
        recalcularTotales(envio);
        envioConsolidadoRepository.save(envio);
    }

    @Transactional(readOnly = true)
    public EnvioConsolidadoDTO toDTO(EnvioConsolidado envio, boolean incluirPaquetes) {
        if (envio == null) return null;
        List<PaqueteDTO> paquetesDTO = List.of();
        if (incluirPaquetes) {
            paquetesDTO = paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(envio.getId()).stream()
                    .map(paqueteService::toDTO)
                    .toList();
        }
        long totalPaquetes = paqueteRepository.countByEnvioConsolidadoId(envio.getId());
        BigDecimal pesoTotal = paqueteRepository.sumPesoLbsByEnvioConsolidadoId(envio.getId());
        return EnvioConsolidadoDTO.builder()
                .id(envio.getId())
                .codigo(envio.getCodigo())
                .cerrado(envio.isCerrado())
                .estadoOperativo(estadoConsolidadoOperativoResolver.resolve(envio, totalPaquetes))
                .fechaCierre(envio.getFechaCierre())
                .fechaCerrado(envio.getFechaCerrado())
                .fechaArriboEcuador(envio.getFechaArriboEcuador())
                .pesoTotalLbs(pesoTotal != null ? pesoTotal : BigDecimal.ZERO)
                .totalPaquetes((int) totalPaquetes)
                .estadoPago(envio.getEstadoPago())
                .createdAt(envio.getCreatedAt())
                .updatedAt(envio.getUpdatedAt())
                .paquetes(paquetesDTO)
                .build();
    }

    /**
     * Regla canónica de "requiere atención" para un estado de un paquete:
     * <b>sin estado</b> (defensivo; el estado de la pieza es NOT NULL) o estado
     * en <b>flujo alterno</b> (excepción). Centralizada aquí para no duplicarla
     * en el frontend.
     */
    public static boolean requiereAtencionEstado(Long estadoId, TipoFlujoEstado tipoFlujo) {
        return estadoId == null || tipoFlujo == TipoFlujoEstado.ALTERNO;
    }

    private record EstadoResumenKey(Long consolidadoId, Long estadoId) {}

    /**
     * Construye, en <b>una sola consulta agregada</b>, el resumen de estados de
     * paquetes de varios consolidados (para el listado paginado, sin N+1). Los
     * estados de cada consolidado se ordenan por el orden canónico del tracking
     * ({@code ordenTracking} asc, sin orden al final) y luego por nombre; nunca
     * por cantidad.
     */
    @Transactional(readOnly = true)
    public java.util.Map<Long, ResumenEstadosPaquetesConsolidadoDTO> construirResumenesEstados(
            java.util.List<Long> consolidadoIds) {
        if (consolidadoIds == null || consolidadoIds.isEmpty()) return java.util.Map.of();
        java.util.Map<Long, java.util.List<ResumenEstadosPaquetesConsolidadoDTO.EstadoPaqueteResumenItemDTO>>
                porConsolidado = new java.util.HashMap<>();
        for (Object[] fila : paqueteRepository.resumenEstadosPaquetesPorConsolidado(consolidadoIds)) {
            Long consolidadoId = (Long) fila[0];
            Long estadoId = (Long) fila[1];
            String codigo = (String) fila[2];
            String nombre = (String) fila[3];
            Integer ordenTracking = (Integer) fila[4];
            TipoFlujoEstado tipoFlujo = (TipoFlujoEstado) fila[5];
            int cantidad = ((Number) fila[6]).intValue();
            ResumenEstadosPaquetesConsolidadoDTO.EstadoPaqueteResumenItemDTO item =
                    ResumenEstadosPaquetesConsolidadoDTO.EstadoPaqueteResumenItemDTO.builder()
                            .estadoId(estadoId)
                            .codigo(codigo)
                            .nombre(nombre != null ? nombre : "Sin estado")
                            .cantidad(cantidad)
                            .ordenTracking(ordenTracking)
                            .tipoFlujo(tipoFlujo != null ? tipoFlujo.name() : null)
                            .requiereAtencion(requiereAtencionEstado(estadoId, tipoFlujo))
                            .paquetesPreview(List.of())
                            .hayMas(false)
                            .build();
            porConsolidado.computeIfAbsent(consolidadoId, k -> new java.util.ArrayList<>()).add(item);
        }
        java.util.Map<EstadoResumenKey, java.util.List<ResumenEstadosPaquetesConsolidadoDTO.PaquetePreviewDTO>>
                previewsPorEstado = new java.util.HashMap<>();
        java.util.List<Object[]> previewRows = paqueteRepository.previewPaquetesPorEstadoConsolidado(
                consolidadoIds, PAQUETES_PREVIEW_POR_ESTADO);
        for (Object[] fila : previewRows != null ? previewRows : List.<Object[]>of()) {
            Long consolidadoId = ((Number) fila[0]).longValue();
            Long estadoId = fila[1] != null ? ((Number) fila[1]).longValue() : null;
            Long paqueteId = ((Number) fila[2]).longValue();
            String numeroGuia = (String) fila[3];
            Long guiaId = fila[4] != null ? ((Number) fila[4]).longValue() : null;
            String guiaCodigo = (String) fila[5];
            Integer piezaNumero = fila[6] != null ? ((Number) fila[6]).intValue() : null;
            Integer piezaTotal = fila[7] != null ? ((Number) fila[7]).intValue() : null;
            String piezaLabel = piezaNumero != null && piezaTotal != null
                    ? piezaNumero + "/" + piezaTotal
                    : piezaNumero != null ? String.valueOf(piezaNumero) : null;

            previewsPorEstado
                    .computeIfAbsent(new EstadoResumenKey(consolidadoId, estadoId),
                            k -> new java.util.ArrayList<>())
                    .add(ResumenEstadosPaquetesConsolidadoDTO.PaquetePreviewDTO.builder()
                            .paqueteId(paqueteId)
                            .codigo(numeroGuia)
                            .guiaId(guiaId)
                            .guiaCodigo(guiaCodigo)
                            .piezaLabel(piezaLabel)
                            .build());
        }
        java.util.Map<Long, ResumenEstadosPaquetesConsolidadoDTO> resultado = new java.util.HashMap<>();
        for (Long id : consolidadoIds) {
            java.util.List<ResumenEstadosPaquetesConsolidadoDTO.EstadoPaqueteResumenItemDTO> items =
                    porConsolidado.getOrDefault(id, new java.util.ArrayList<>());
            for (ResumenEstadosPaquetesConsolidadoDTO.EstadoPaqueteResumenItemDTO item : items) {
                java.util.List<ResumenEstadosPaquetesConsolidadoDTO.PaquetePreviewDTO> preview =
                        previewsPorEstado.getOrDefault(
                                new EstadoResumenKey(id, item.getEstadoId()), List.of());
                item.setPaquetesPreview(preview);
                item.setHayMas(item.getCantidad() > preview.size());
            }
            items.sort(java.util.Comparator
                    .comparing((ResumenEstadosPaquetesConsolidadoDTO.EstadoPaqueteResumenItemDTO it) ->
                            it.getOrdenTracking() == null ? Integer.MAX_VALUE : it.getOrdenTracking())
                    .thenComparing(it -> it.getNombre() != null ? it.getNombre() : ""));
            int total = items.stream()
                    .mapToInt(ResumenEstadosPaquetesConsolidadoDTO.EstadoPaqueteResumenItemDTO::getCantidad).sum();
            int atencion = items.stream()
                    .filter(ResumenEstadosPaquetesConsolidadoDTO.EstadoPaqueteResumenItemDTO::isRequiereAtencion)
                    .mapToInt(ResumenEstadosPaquetesConsolidadoDTO.EstadoPaqueteResumenItemDTO::getCantidad).sum();
            resultado.put(id, ResumenEstadosPaquetesConsolidadoDTO.builder()
                    .totalPaquetes(total)
                    .estados(items)
                    .cantidadRequiereAtencion(atencion)
                    .estadosMixtos(items.size() > 1)
                    .build());
        }
        return resultado;
    }

}
