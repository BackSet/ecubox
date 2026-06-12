package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EnvioConsolidadoCreateResponse;
import com.ecubox.ecubox_backend.dto.EnvioConsolidadoDTO;
import com.ecubox.ecubox_backend.dto.EnvioConsolidadoResumenDTO;
import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.dto.AplicarEstadoEnConsolidadosResponse;
import com.ecubox.ecubox_backend.dto.AplicarTransicionConsolidadosResponse;
import com.ecubox.ecubox_backend.dto.EstadoRastreoDTO;
import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.dto.AvanceEstadosConsolidadosRequest;
import com.ecubox.ecubox_backend.dto.AvanceEstadosConsolidadosPreviewDTO;
import com.ecubox.ecubox_backend.dto.AvanceEstadosConsolidadosResponse;
import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.LiquidacionConsolidadoLinea;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.enums.EstadoEnvioConsolidadoOperativo;
import com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado;
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
import org.springframework.context.annotation.Lazy;
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
    private static final ZoneId ZONA_ECUADOR = ZoneId.of("America/Guayaquil");

    public EnvioConsolidadoService(EnvioConsolidadoRepository envioConsolidadoRepository,
                                   PaqueteRepository paqueteRepository,
                                   @Lazy PaqueteService paqueteService,
                                   LiquidacionConsolidadoLineaRepository liquidacionConsolidadoLineaRepository,
                                   LoteRecepcionGuiaRepository loteRecepcionGuiaRepository,
                                   EstadoConsolidadoOperativoResolver estadoConsolidadoOperativoResolver,
                                   EstadoRastreoService estadoRastreoService,
                                   ParametroSistemaService parametroSistemaService) {
        this.envioConsolidadoRepository = envioConsolidadoRepository;
        this.paqueteRepository = paqueteRepository;
        this.paqueteService = paqueteService;
        this.liquidacionConsolidadoLineaRepository = liquidacionConsolidadoLineaRepository;
        this.loteRecepcionGuiaRepository = loteRecepcionGuiaRepository;
        this.estadoConsolidadoOperativoResolver = estadoConsolidadoOperativoResolver;
        this.estadoRastreoService = estadoRastreoService;
        this.parametroSistemaService = parametroSistemaService;
    }

    @Transactional(readOnly = true)
    public EnvioConsolidado findById(Long id) {
        return envioConsolidadoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Envío consolidado", id));
    }

    /**
     * Lista los envios consolidados que pueden incluirse en un nuevo lote de
     * recepcion. Ortogonal a la salida USA y al {@code estadoPago}:
     * un consolidado liquidado y pagado sigue siendo recepcionable mientras
     * no haya sido recibido fisicamente.
     */
    @Transactional(readOnly = true)
    public Page<EnvioConsolidado> findDisponiblesParaRecepcion(String q, int page, int size) {
        Pageable pageable = Pageables.bounded(page, size, 200);
        String search = Strings.trimOrNull(q);
        return envioConsolidadoRepository.findDisponiblesParaRecepcion(
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
        return envioConsolidadoRepository.findAll(spec, pageable);
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
     * Crea un envio consolidado y, en la misma transaccion, asocia los paquetes
     * que existan para los numeros de guia indicados. Si alguna guia no existe
     * se reporta en {@code guiasNoEncontradas} sin abortar la creacion: el
     * envio queda creado y el operario puede agregar/quitar paquetes despues.
     */
    @Transactional
    public EnvioConsolidadoCreateResponse crearConGuias(String codigo, List<String> numerosGuia, Long actorUsuarioId) {
        EnvioConsolidado envio = crear(codigo, actorUsuarioId);
        List<String> noEncontradas = List.of();
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
                if (!paquetes.isEmpty()) {
                    agregarPaquetes(envio.getId(), paquetes.stream().map(Paquete::getId).toList());
                    envio = findById(envio.getId());
                }
            }
        }
        return EnvioConsolidadoCreateResponse.builder()
                .envio(toDTO(envio, true))
                .guiasNoEncontradas(noEncontradas)
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
        List<Paquete> paquetes = paqueteRepository.findAllById(ids);
        if (paquetes.size() != ids.size()) {
            throw new ResourceNotFoundException("Paquete", "uno o más ids no encontrados");
        }
        List<Long> idsAsociados = new ArrayList<>();
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
                idsAsociados.add(p.getId());
            }
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
        List<Paquete> paquetes = paqueteRepository.findAllById(new LinkedHashSet<>(paqueteIds));
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
                    return orden != null && orden > ordenBase && orden <= ordenLimite;
                })
                .sorted(Comparator.comparingInt(e -> e.getOrden() != null ? e.getOrden() : e.getOrdenTracking()))
                .toList();
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
        paqueteService.validarEstadoPosteriorAAsociacionConsolidado(estadoRastreoId);
        List<Long> paqueteIds = paqueteRepository.findIdsByEnvioConsolidadoIdIn(ids);
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
                    calculo.paquetes(), paso.estado(), paso.fecha(), operacionId);
        }
        return AvanceEstadosConsolidadosResponse.builder()
                .consolidadosProcesados(calculo.consolidados().size())
                .paquetesProcesados(calculo.paquetes().size())
                .pasosAplicados(calculo.pasos().size())
                .eventosCreados(calculo.paquetes().size() * calculo.pasos().size())
                .estadoFinalId(calculo.destino().getId())
                .estadoFinalNombre(calculo.destino().getNombre())
                .build();
    }

    private CalculoAvance calcularAvance(AvanceEstadosConsolidadosRequest request, boolean bloquear) {
        if (request == null || request.getConsolidadoIds() == null || request.getConsolidadoIds().isEmpty()) {
            throw new BadRequestException("Selecciona al menos un envío consolidado.");
        }
        if (request.getEstadoFinalId() == null) {
            throw new BadRequestException("Selecciona el estado final de la secuencia.");
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
        EstadoRastreo inicial = null;
        for (EnvioConsolidado consolidado : consolidados) {
            List<Paquete> propios = porConsolidado.getOrDefault(consolidado.getId(), List.of());
            if (propios.isEmpty()) {
                throw new ConflictException("El consolidado " + consolidado.getCodigo() + " no tiene paquetes.");
            }
            if (propios.stream().anyMatch(p -> p.getEstadoRastreo() == null)) {
                throw new ConflictException(
                        "El consolidado " + consolidado.getCodigo() + " contiene un paquete sin estado de rastreo.");
            }
            Set<Long> estados = propios.stream().map(p -> p.getEstadoRastreo().getId()).collect(Collectors.toSet());
            if (estados.size() != 1) {
                throw new ConflictException(
                        "El consolidado " + consolidado.getCodigo() + " tiene paquetes en estados mixtos.");
            }
            EstadoRastreo estado = propios.getFirst().getEstadoRastreo();
            if (inicial == null) inicial = estado;
            else if (!inicial.getId().equals(estado.getId())) {
                throw new ConflictException("Los consolidados seleccionados no comparten el mismo estado inicial.");
            }
        }
        EstadoRastreo destino = estadoRastreoService.findEntityById(request.getEstadoFinalId());
        if (!Boolean.TRUE.equals(destino.getActivo())) {
            throw new ConflictException("El estado final seleccionado no está activo.");
        }
        if (inicial.getTipoFlujo() != destino.getTipoFlujo()) {
            throw new ConflictException("El estado final pertenece a un flujo distinto al estado inicial.");
        }
        EstadoRastreo estadoInicial = inicial;
        int ordenInicial = ordenOrThrow(inicial);
        int ordenFinal = ordenOrThrow(destino);
        if (ordenFinal <= ordenInicial) {
            throw new ConflictException("El estado final debe ser posterior al estado inicial común.");
        }
        validarDestinoCompatibleConConsolidados(destino);
        List<EstadoRastreo> secuencia = estadoRastreoService.findActivosEntities().stream()
                .filter(e -> e.getTipoFlujo() == estadoInicial.getTipoFlujo())
                .filter(e -> {
                    int orden = ordenOrThrow(e);
                    return orden > ordenInicial && orden <= ordenFinal;
                })
                .sorted(Comparator.comparingInt(this::ordenOrThrow).thenComparing(EstadoRastreo::getId))
                .toList();
        if (secuencia.isEmpty() || !secuencia.getLast().getId().equals(destino.getId())) {
            throw new ConflictException("No existe una secuencia activa completa hasta el estado final.");
        }
        EstadosRastreoPorPuntoDTO config = parametroSistemaService.getEstadosRastreoPorPunto();
        List<PasoCalculado> pasos = secuencia.stream()
                .map(estado -> new PasoCalculado(
                        estado,
                        request.getFechasPorEstado() != null
                                ? request.getFechasPorEstado().getOrDefault(estado.getId(), request.getFechaPrincipal())
                                : request.getFechaPrincipal(),
                        efectoOperativo(estado.getId(), config)))
                .toList();
        validarCronologia(pasos);
        Map<Long, EstadoEnvioConsolidadoOperativo> finales = simularEfectos(consolidados, pasos);
        String token = construirToken(consolidados, paquetes, inicial, destino, pasos);
        List<AvanceEstadosConsolidadosPreviewDTO.Consolidado> detalles = consolidados.stream()
                .sorted(Comparator.comparing(EnvioConsolidado::getId))
                .map(e -> AvanceEstadosConsolidadosPreviewDTO.Consolidado.builder()
                        .id(e.getId()).codigo(e.getCodigo())
                        .totalPaquetes(porConsolidado.get(e.getId()).size())
                        .estadoOperativoActual(e.getEstadoOperativo())
                        .estadoOperativoFinal(finales.get(e.getId()))
                        .version(e.getVersion()).build())
                .toList();
        AvanceEstadosConsolidadosPreviewDTO preview = AvanceEstadosConsolidadosPreviewDTO.builder()
                .previewToken(token)
                .estadoInicial(estadoPaso(inicial))
                .estadoFinal(estadoPaso(destino))
                .pasos(pasos.stream().map(this::pasoDto).toList())
                .resumen(AvanceEstadosConsolidadosPreviewDTO.Resumen.builder()
                        .totalConsolidados(consolidados.size()).totalPaquetes(paquetes.size())
                        .totalPasos(pasos.size()).totalEventosPrevistos(paquetes.size() * pasos.size()).build())
                .consolidados(detalles).bloqueos(List.of())
                .advertencias(List.of("La operación es atómica: si falla un paso, no se aplicará ningún cambio."))
                .build();
        return new CalculoAvance(preview, consolidados, paquetes, pasos, destino);
    }

    private void validarFechas(AvanceEstadosConsolidadosRequest request) {
        LocalDateTime ahora = LocalDateTime.now(ZONA_ECUADOR);
        if (request.getFechaPrincipal().isAfter(ahora)) {
            throw new BadRequestException("La fecha principal no puede ser futura.");
        }
        if (request.getFechasPorEstado() != null
                && request.getFechasPorEstado().values().stream().anyMatch(f -> f == null || f.isAfter(ahora))) {
            throw new BadRequestException("Las fechas por estado no pueden estar vacías ni ser futuras.");
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
        if (orden <= ordenOrThrow(base) || orden > ordenOrThrow(limite)) {
            throw new ConflictException("El estado final no es compatible con el flujo de envíos consolidados.");
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
            if (paso.efectoOperativo() == null) continue;
            for (EnvioConsolidado envio : consolidados) {
                EstadoEnvioConsolidadoOperativo actual = estados.get(envio.getId());
                EstadoEnvioConsolidadoOperativo requerido = origenOperativo(paso.efectoOperativo());
                if (actual != requerido) {
                    throw new ConflictException(
                            "El consolidado " + envio.getCodigo() + " está en " + actual
                                    + " y el paso '" + paso.estado().getNombre() + "' requiere " + requerido + ".");
                }
                estados.put(envio.getId(), paso.efectoOperativo());
            }
        }
        return estados;
    }

    private void aplicarEfectoOperativo(List<EnvioConsolidado> consolidados, PasoCalculado paso) {
        if (paso.efectoOperativo() == null) return;
        for (EnvioConsolidado envio : consolidados) {
            EstadoEnvioConsolidadoOperativo requerido = origenOperativo(paso.efectoOperativo());
            if (envio.getEstadoOperativo() != requerido) {
                throw new ConflictException("El estado operativo del consolidado cambió durante la operación.");
            }
            envio.setEstadoOperativo(paso.efectoOperativo());
            if (paso.efectoOperativo() == EstadoEnvioConsolidadoOperativo.CERRADO) envio.setFechaCierre(paso.fecha());
            if (paso.efectoOperativo() == EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA) envio.setFechaCerrado(paso.fecha());
            if (paso.efectoOperativo() == EstadoEnvioConsolidadoOperativo.ARRIBADO_ECUADOR) envio.setFechaArriboEcuador(paso.fecha());
        }
        envioConsolidadoRepository.saveAll(consolidados);
    }

    private EstadoEnvioConsolidadoOperativo efectoOperativo(Long estadoId, EstadosRastreoPorPuntoDTO cfg) {
        if (Objects.equals(estadoId, cfg.getEstadoRastreoCierreConsolidadoId())) return EstadoEnvioConsolidadoOperativo.CERRADO;
        if (Objects.equals(estadoId, cfg.getEstadoRastreoEnviadoDesdeUsaId())) return EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA;
        if (Objects.equals(estadoId, cfg.getEstadoRastreoArriboEcuadorId())) return EstadoEnvioConsolidadoOperativo.ARRIBADO_ECUADOR;
        return null;
    }

    private EstadoEnvioConsolidadoOperativo origenOperativo(EstadoEnvioConsolidadoOperativo destino) {
        return switch (destino) {
            case CERRADO -> EstadoEnvioConsolidadoOperativo.EN_PREPARACION;
            case ENVIADO_DESDE_USA -> EstadoEnvioConsolidadoOperativo.CERRADO;
            case ARRIBADO_ECUADOR -> EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA;
            default -> throw new IllegalArgumentException("Efecto operativo no soportado: " + destino);
        };
    }

    private int ordenOrThrow(EstadoRastreo estado) {
        Integer orden = PaqueteService.ordenEfectivo(estado);
        if (orden == null) throw new BadRequestException("Un estado de la secuencia no tiene orden configurado.");
        return orden;
    }

    private AvanceEstadosConsolidadosPreviewDTO.EstadoPaso estadoPaso(EstadoRastreo estado) {
        return AvanceEstadosConsolidadosPreviewDTO.EstadoPaso.builder()
                .id(estado.getId()).nombre(estado.getNombre()).orden(ordenOrThrow(estado)).build();
    }

    private AvanceEstadosConsolidadosPreviewDTO.Paso pasoDto(PasoCalculado paso) {
        return AvanceEstadosConsolidadosPreviewDTO.Paso.builder()
                .estadoId(paso.estado().getId()).estadoNombre(paso.estado().getNombre())
                .orden(ordenOrThrow(paso.estado())).fecha(paso.fecha())
                .efectoOperativo(paso.efectoOperativo()).build();
    }

    private String construirToken(List<EnvioConsolidado> consolidados, List<Paquete> paquetes,
                                  EstadoRastreo inicial, EstadoRastreo destino, List<PasoCalculado> pasos) {
        String canonical = consolidados.stream().sorted(Comparator.comparing(EnvioConsolidado::getId))
                .map(e -> e.getId() + ":" + e.getVersion() + ":" + e.getEstadoOperativo())
                .collect(Collectors.joining("|"))
                + "#" + paquetes.stream().sorted(Comparator.comparing(Paquete::getId))
                .map(p -> p.getId() + ":" + p.getVersion() + ":" + p.getEstadoRastreo().getId())
                .collect(Collectors.joining("|"))
                + "#" + inicial.getId() + ">" + destino.getId()
                + "#" + pasos.stream().map(p -> p.estado().getId() + "@" + p.fecha()).collect(Collectors.joining("|"));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }

    private record PasoCalculado(EstadoRastreo estado, LocalDateTime fecha,
                                 EstadoEnvioConsolidadoOperativo efectoOperativo) {}
    private record CalculoAvance(AvanceEstadosConsolidadosPreviewDTO preview,
                                 List<EnvioConsolidado> consolidados, List<Paquete> paquetes,
                                 List<PasoCalculado> pasos, EstadoRastreo destino) {}

    /**
     * Aplica una transición de estado OPERATIVO a consolidados (por ids o por periodo
     * de creación). Solo admite los destinos con acción real: CERRADO (cerrar),
     * ENVIADO_DESDE_USA (enviar desde USA), ARRIBADO_ECUADOR (arribar a Ecuador),
     * EN_PREPARACION (reabrir) y CANCELADO (cancelar, desde cualquier estado salvo
     * LIQUIDADO o CANCELADO). Cada consolidado debe estar en el estado de origen
     * correspondiente; los que no, se devuelven como rechazados.
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
        }

        int procesados = 0;
        List<AplicarTransicionConsolidadosResponse.RechazoConsolidado> rechazados = new ArrayList<>();
        for (EnvioConsolidado envio : universo) {
            try {
                switch (destino) {
                    case CERRADO -> cerrarConsolidado(envio.getId());
                    case ENVIADO_DESDE_USA -> enviarDesdeUsa(envio.getId(), null);
                    case ARRIBADO_ECUADOR -> marcarArribadoEcuador(envio.getId(), null);
                    case EN_PREPARACION -> reabrir(envio.getId());
                    case CANCELADO -> cancelarConsolidado(envio.getId());
                    default -> throw new BadRequestException("Transición no soportada: " + destino);
                }
                procesados++;
            } catch (BadRequestException ex) {
                rechazados.add(AplicarTransicionConsolidadosResponse.RechazoConsolidado.builder()
                        .consolidadoId(envio.getId())
                        .codigo(envio.getCodigo())
                        .motivo(ex.getMessage())
                        .build());
            }
        }
        return AplicarTransicionConsolidadosResponse.builder()
                .consolidadosProcesados(procesados)
                .rechazados(rechazados)
                .build();
    }

    /**
     * Cierra el consolidado para registro (EN_PREPARACION → CERRADO). Aplica
     * el estado configurable "Manifestado" a todos los paquetes del consolidado.
     */
    @Transactional
    public EnvioConsolidado cerrarConsolidado(Long envioId) {
        EnvioConsolidado envio = findById(envioId);
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

}
