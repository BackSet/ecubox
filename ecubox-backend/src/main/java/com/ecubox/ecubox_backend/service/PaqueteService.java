package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.CambiarEstadoRastreoBulkResponse;
import com.ecubox.ecubox_backend.dto.EstadoRastreoDTO;
import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.dto.PaqueteCreateRequest;
import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.dto.PaqueteResumenDTO;
import com.ecubox.ecubox_backend.dto.PaquetePesoItem;
import com.ecubox.ecubox_backend.dto.PaqueteUpdateRequest;
import com.ecubox.ecubox_backend.dto.TrackingDespachoDTO;
import com.ecubox.ecubox_backend.dto.TrackingConsignatarioDTO;
import com.ecubox.ecubox_backend.dto.TrackingEstadoItemDTO;
import com.ecubox.ecubox_backend.dto.TrackingMasterResponse;
import com.ecubox.ecubox_backend.dto.TrackingOperadorEntregaDTO;
import com.ecubox.ecubox_backend.dto.TrackingPaqueteDespachoDTO;
import com.ecubox.ecubox_backend.dto.TrackingResponse;
import com.ecubox.ecubox_backend.dto.TrackingSacaDTO;
import com.ecubox.ecubox_backend.entity.Consignatario;
import com.ecubox.ecubox_backend.entity.Despacho;
import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.GuiaMaster;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.PaqueteEstadoEvento;
import com.ecubox.ecubox_backend.entity.Saca;
import com.ecubox.ecubox_backend.enums.EstadoEnvioConsolidadoOperativo;
import com.ecubox.ecubox_backend.enums.TrackingEventType;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ConflictException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.ConsignatarioRepository;
import com.ecubox.ecubox_backend.repository.GuiaMasterRepository;
import com.ecubox.ecubox_backend.repository.LoteRecepcionGuiaRepository;
import com.ecubox.ecubox_backend.repository.OutboxEventRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.PaqueteEstadoEventoRepository;
import com.ecubox.ecubox_backend.repository.SacaRepository;
import com.ecubox.ecubox_backend.service.validation.OwnershipValidator;
import com.ecubox.ecubox_backend.service.validation.SacaEnDespachoValidator;
import com.ecubox.ecubox_backend.util.SearchSpecifications;
import com.ecubox.ecubox_backend.util.Strings;
import com.ecubox.ecubox_backend.util.WeightUtil;
import com.ecubox.ecubox_backend.util.Pageables;
import org.springframework.context.annotation.Lazy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PaqueteService {

    private final PaqueteRepository paqueteRepository;
    private final ConsignatarioRepository consignatarioRepository;
    private final SacaRepository sacaRepository;
    private final LoteRecepcionGuiaRepository loteRecepcionGuiaRepository;
    private final PaqueteEstadoEventoRepository paqueteEstadoEventoRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final ParametroSistemaService parametroSistemaService;
    private final EstadoRastreoService estadoRastreoService;
    private final TrackingEventService trackingEventService;
    private final GuiaMasterRepository guiaMasterRepository;
    private final GuiaMasterService guiaMasterService;
    private final OwnershipValidator ownershipValidator;
    private final SacaEnDespachoValidator sacaEnDespachoValidator;
    private final CodigoSecuenciaService codigoSecuenciaService;
    private final EnvioConsolidadoService envioConsolidadoService;
    private final EstadoConsolidadoOperativoResolver estadoConsolidadoOperativoResolver;
    private final boolean useEventTimeline;

    public PaqueteService(PaqueteRepository paqueteRepository,
                          ConsignatarioRepository consignatarioRepository,
                          SacaRepository sacaRepository,
                          LoteRecepcionGuiaRepository loteRecepcionGuiaRepository,
                          PaqueteEstadoEventoRepository paqueteEstadoEventoRepository,
                          OutboxEventRepository outboxEventRepository,
                          ParametroSistemaService parametroSistemaService,
                          EstadoRastreoService estadoRastreoService,
                          TrackingEventService trackingEventService,
                          GuiaMasterRepository guiaMasterRepository,
                          GuiaMasterService guiaMasterService,
                          OwnershipValidator ownershipValidator,
                          SacaEnDespachoValidator sacaEnDespachoValidator,
                          CodigoSecuenciaService codigoSecuenciaService,
                          @Lazy EnvioConsolidadoService envioConsolidadoService,
                          EstadoConsolidadoOperativoResolver estadoConsolidadoOperativoResolver,
                          @Value("${tracking.timeline.use-events:true}") boolean useEventTimeline) {
        this.paqueteRepository = paqueteRepository;
        this.consignatarioRepository = consignatarioRepository;
        this.sacaRepository = sacaRepository;
        this.loteRecepcionGuiaRepository = loteRecepcionGuiaRepository;
        this.paqueteEstadoEventoRepository = paqueteEstadoEventoRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.parametroSistemaService = parametroSistemaService;
        this.estadoRastreoService = estadoRastreoService;
        this.trackingEventService = trackingEventService;
        this.guiaMasterRepository = guiaMasterRepository;
        this.guiaMasterService = guiaMasterService;
        this.ownershipValidator = ownershipValidator;
        this.sacaEnDespachoValidator = sacaEnDespachoValidator;
        this.codigoSecuenciaService = codigoSecuenciaService;
        this.envioConsolidadoService = envioConsolidadoService;
        this.estadoConsolidadoOperativoResolver = estadoConsolidadoOperativoResolver;
        this.useEventTimeline = useEventTimeline;
    }

    @Transactional(readOnly = true)
    public List<PaqueteDTO> findAllByUsuarioId(Long usuarioId) {
        return paqueteRepository.findByConsignatarioUsuarioIdOrderByEstadoRastreo_OrdenAscIdAsc(usuarioId).stream()
                .map(this::toDTO)
                .toList();
    }

    private Long envioConsolidadoId(Paquete paquete) {
        EnvioConsolidado envio = paquete != null ? paquete.getEnvioConsolidado() : null;
        return envio != null ? envio.getId() : null;
    }

    private void sincronizarTotalesEnvio(Long envioId) {
        if (envioId != null) {
            envioConsolidadoService.sincronizarTotales(envioId);
        }
    }

    /** Lista todos los paquetes (para Admin/Operario). Orden por estado e id. */
    @Transactional(readOnly = true)
    public List<PaqueteDTO> findAll() {
        return paqueteRepository.findAll(
                Sort.by(Sort.Direction.ASC, "estadoRastreo.orden").and(Sort.by(Sort.Direction.ASC, "id"))).stream()
                .map(this::toDTO)
                .toList();
    }

    /**
     * Filtros estructurales y de chips para la variante paginada del listado de paquetes.
     * Todos los campos son opcionales; si un campo es {@code null} no se aplica el filtro.
     */
    public record PaqueteListFilters(
            String estadoCodigo,
            Long consignatarioId,
            String envioCodigo,
            Long guiaMasterId,
            /** "sin_peso" | "con_peso" | "sin_guia_master" | "vencidos" | null */
            String chip
    ) {
        public static PaqueteListFilters empty() {
            return new PaqueteListFilters(null, null, null, null, null);
        }
    }

    /**
     * Variante paginada con búsqueda libre + filtros estructurales. Pensada para
     * listados de Admin/Operario.
     * <p>Campos contemplados por {@code q}: {@code numeroGuia} (pieza), {@code ref},
     * {@code contenido}, {@code guiaMaster.trackingBase} (guía master),
     * {@code envioConsolidado.codigo}, {@code consignatario.nombre},
     * {@code consignatario.codigo}.</p>
     */
    @Transactional(readOnly = true)
    public Page<PaqueteDTO> findAllPaginated(String q, PaqueteListFilters filters, int page, int size) {
        Pageable pageable = Pageables.bounded(page, size, 200,
                Sort.by(Sort.Direction.ASC, "estadoRastreo.orden").and(Sort.by(Sort.Direction.ASC, "id")));
        Specification<Paquete> spec = buildSpec(q, filters);
        return paqueteRepository.findAll(spec, pageable).map(this::toDTO);
    }

    /** Variante paginada filtrada por usuario (rol cliente). */
    @Transactional(readOnly = true)
    public Page<PaqueteDTO> findAllByUsuarioIdPaginated(Long usuarioId, String q,
                                                       PaqueteListFilters filters, int page, int size) {
        Pageable pageable = Pageables.bounded(page, size, 200,
                Sort.by(Sort.Direction.ASC, "estadoRastreo.orden").and(Sort.by(Sort.Direction.ASC, "id")));
        Specification<Paquete> ownership = (root, query, cb) ->
                cb.equal(root.get("consignatario").get("usuario").get("id"), usuarioId);
        Specification<Paquete> textAndFilters = buildSpec(q, filters);
        return paqueteRepository.findAll(ownership.and(textAndFilters), pageable).map(this::toDTO);
    }

    /**
     * Resumen liviano del listado de paquetes: KPIs del universo visible,
     * conteos por chip (respetando los filtros estructurales activos) y opciones
     * distintas de los comboboxes de filtro. Sustituye la descarga del dataset
     * completo en el cliente.
     *
     * @param usuarioIdOrNull {@code null} para la vista operario/admin (universo);
     *                        el id del usuario para acotar a la vista cliente.
     */
    @Transactional(readOnly = true)
    public PaqueteResumenDTO resumen(Long usuarioIdOrNull, String q, PaqueteListFilters filters) {
        LocalDateTime ahora = LocalDateTime.now(ZONA_ECUADOR);
        // En Spring Data JPA 4.0 Specification.where(null) lanza IllegalArgumentException
        // (antes se toleraba). Para la vista operario/admin no hay restriccion de
        // propietario, asi que partimos de Specification.unrestricted().
        Specification<Paquete> ownership = usuarioIdOrNull == null ? Specification.unrestricted()
                : (root, query, cb) -> cb.equal(root.get("consignatario").get("usuario").get("id"), usuarioIdOrNull);
        Specification<Paquete> pesoNotNull = (root, query, cb) -> cb.isNotNull(root.get("pesoLbs"));
        Specification<Paquete> pesoNull = (root, query, cb) -> cb.isNull(root.get("pesoLbs"));
        Specification<Paquete> sinGuia = (root, query, cb) -> cb.isNull(root.get("guiaMaster"));
        Specification<Paquete> vencido = (root, query, cb) -> cb.and(
                cb.isNotNull(root.get("fechaLimiteRetiro")),
                cb.lessThanOrEqualTo(root.get("fechaLimiteRetiro"), ahora));

        // KPIs del universo visible (solo ownership, sin filtros activos).
        Specification<Paquete> universe = ownership;
        long total = paqueteRepository.count(universe);
        long conPeso = paqueteRepository.count(universe.and(pesoNotNull));
        long vencidos = paqueteRepository.count(universe.and(vencido));
        long consignatariosDistintos = paqueteRepository.countDistinctConsignatarios(usuarioIdOrNull);

        // Conteos por chip respetando los filtros estructurales (sin chip).
        PaqueteListFilters f = filters == null ? PaqueteListFilters.empty() : filters;
        PaqueteListFilters estructurales = new PaqueteListFilters(
                f.estadoCodigo(), f.consignatarioId(), f.envioCodigo(), f.guiaMasterId(), null);
        Specification<Paquete> base = universe.and(buildSpec(q, estructurales));
        long chipTodos = paqueteRepository.count(base);
        long chipSinPeso = paqueteRepository.count(base.and(pesoNull));
        long chipConPeso = paqueteRepository.count(base.and(pesoNotNull));
        long chipSinGuia = paqueteRepository.count(base.and(sinGuia));
        long chipVencidos = paqueteRepository.count(base.and(vencido));

        // Opciones distintas para los comboboxes (universo visible).
        List<PaqueteResumenDTO.EstadoOption> estados = paqueteRepository.findDistinctEstados(usuarioIdOrNull).stream()
                .map(r -> PaqueteResumenDTO.EstadoOption.builder()
                        .codigo((String) r[0]).nombre((String) r[1]).build())
                .sorted(Comparator.comparing(PaqueteResumenDTO.EstadoOption::getNombre,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();
        List<PaqueteResumenDTO.ConsignatarioOption> consignatarios = paqueteRepository.findDistinctConsignatarios(usuarioIdOrNull).stream()
                .map(r -> PaqueteResumenDTO.ConsignatarioOption.builder()
                        .id((Long) r[0]).nombre((String) r[1]).build())
                .sorted(Comparator.comparing(PaqueteResumenDTO.ConsignatarioOption::getNombre,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();
        List<String> codigosEnvio = paqueteRepository.findDistinctEnvioCodigos(usuarioIdOrNull).stream()
                .filter(Objects::nonNull)
                .sorted()
                .toList();
        List<PaqueteResumenDTO.GuiaMasterOption> guiasMaster = paqueteRepository.findDistinctGuiasMaster(usuarioIdOrNull).stream()
                .map(r -> PaqueteResumenDTO.GuiaMasterOption.builder()
                        .id((Long) r[0]).trackingBase((String) r[1]).build())
                .sorted(Comparator.comparing(PaqueteResumenDTO.GuiaMasterOption::getTrackingBase,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();

        return PaqueteResumenDTO.builder()
                .total(total)
                .conPeso(conPeso)
                .sinPeso(total - conPeso)
                .vencidos(vencidos)
                .consignatariosDistintos(consignatariosDistintos)
                .chips(PaqueteResumenDTO.ChipCounts.builder()
                        .todos(chipTodos)
                        .sinPeso(chipSinPeso)
                        .conPeso(chipConPeso)
                        .sinGuiaMaster(chipSinGuia)
                        .vencidos(chipVencidos)
                        .build())
                .estados(estados)
                .consignatarios(consignatarios)
                .codigosEnvio(codigosEnvio)
                .guiasMaster(guiasMaster)
                .build();
    }

    /** Construye la {@link Specification} compuesta para el listado paginado. */
    private Specification<Paquete> buildSpec(String q, PaqueteListFilters filters) {
        PaqueteListFilters f = filters == null ? PaqueteListFilters.empty() : filters;
        Specification<Paquete> spec = SearchSpecifications.tokensLike(q,
                SearchSpecifications.field("numeroGuia"),
                SearchSpecifications.field("ref"),
                SearchSpecifications.field("contenido"),
                SearchSpecifications.path("guiaMaster", "trackingBase"),
                SearchSpecifications.path("envioConsolidado", "codigo"),
                SearchSpecifications.path("consignatario", "nombre"),
                SearchSpecifications.path("consignatario", "codigo"));
        if (f.estadoCodigo() != null && !f.estadoCodigo().isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("estadoRastreo").get("codigo"), f.estadoCodigo()));
        }
        if (f.consignatarioId() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("consignatario").get("id"), f.consignatarioId()));
        }
        if (f.envioCodigo() != null && !f.envioCodigo().isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("envioConsolidado").get("codigo"), f.envioCodigo()));
        }
        if (f.guiaMasterId() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("guiaMaster").get("id"), f.guiaMasterId()));
        }
        if (f.chip() != null && !f.chip().isBlank()) {
            String chip = f.chip().toLowerCase();
            spec = switch (chip) {
                case "sin_peso" -> spec.and((root, query, cb) -> cb.isNull(root.get("pesoLbs")));
                case "con_peso" -> spec.and((root, query, cb) -> cb.isNotNull(root.get("pesoLbs")));
                case "sin_guia_master" -> spec.and((root, query, cb) -> cb.isNull(root.get("guiaMaster")));
                // "vencidos" se resuelve server-side mediante la fecha límite de
                // retiro persistida (ver computeFechaLimiteRetiro): un paquete está
                // vencido cuando su fechaLimiteRetiro no es nula y ya pasó.
                case "vencidos" -> spec.and((root, query, cb) -> cb.and(
                        cb.isNotNull(root.get("fechaLimiteRetiro")),
                        cb.lessThanOrEqualTo(root.get("fechaLimiteRetiro"), LocalDateTime.now(ZONA_ECUADOR))));
                default -> spec;
            };
        }
        return spec;
    }

    /**
     * Resuelve el "codigo base" de un destinatario que se usa como prefijo en el
     * {@code ref} de los paquetes (formato {@code <codigoBase>-<n>}). Si el
     * destinatario tiene {@code codigo} no vacio, se usa ese; si no, se usa el
     * fallback {@code D<id>}. Centraliza la regla para evitar drift entre
     * create/update/sugerir y la propagacion desde guia master.
     */
    static String resolverCodigoBase(Consignatario dest) {
        if (dest == null) return null;
        return (dest.getCodigo() != null && !dest.getCodigo().isBlank())
                ? dest.getCodigo().trim()
                : ("D" + dest.getId());
    }

    @Transactional
    public PaqueteDTO create(Long usuarioId, boolean canManageAny, boolean contenidoObligatorio, PaqueteCreateRequest request) {
        if (contenidoObligatorio && (request.getContenido() == null || request.getContenido().isBlank())) {
            throw new BadRequestException(
                    "No se puede registrar el paquete porque falta el contenido. "
                            + "Regla: la descripción del contenido es obligatoria. Ingresa el contenido para continuar.");
        }
        Consignatario dest = consignatarioRepository.findById(request.getConsignatarioId())
                .orElseThrow(() -> new ResourceNotFoundException("Destinatario", request.getConsignatarioId()));
        ownershipValidator.requireDestinatarioOwnership(dest, usuarioId, canManageAny);
        String codigoBase = resolverCodigoBase(dest);
        String ref = codigoSecuenciaService.nextRefPaquete(dest.getId(), codigoBase);
        boolean omitOperarioFields = contenidoObligatorio;
        BigDecimal pesoLbs = null;
        if (!omitOperarioFields) {
            if (request.getPesoLbs() != null) {
                pesoLbs = request.getPesoLbs();
            } else if (request.getPesoKg() != null) {
                pesoLbs = WeightUtil.kgToLbs(request.getPesoKg());
            }
        }
        EstadoRastreo estadoInicial = getEstadoRegistroPaquete();
        GuiaMasterAsignacion asignacion = resolverGuiaMasterParaCreacion(
                omitOperarioFields ? null : request.getGuiaMasterId(),
                omitOperarioFields ? null : request.getPiezaNumero());
        String numeroGuiaCompuesto = GuiaMasterService.componerNumeroGuia(
                asignacion.guiaMaster(), asignacion.piezaNumero());
        if (numeroGuiaCompuesto == null || paqueteRepository.existsByNumeroGuia(numeroGuiaCompuesto)) {
            throw new ConflictException(
                    "No se puede registrar el paquete porque el número de guía resultante ya está usado por otro paquete. "
                            + "Regla: el número de guía (guía master + número de pieza) debe ser único. "
                            + "Verifica la guía master y el número de pieza seleccionados.");
        }
        Paquete p = Paquete.builder()
                .numeroGuia(numeroGuiaCompuesto)
                .guiaMaster(asignacion.guiaMaster())
                .piezaNumero(asignacion.piezaNumero())
                .piezaTotal(asignacion.piezaTotal())
                .ref(ref)
                .consignatario(dest)
                .contenido(request.getContenido())
                .pesoLbs(pesoLbs)
                .estadoRastreo(estadoInicial)
                .fechaEstadoActualDesde(LocalDateTime.now(ZONA_ECUADOR))
                .build();
        p = paqueteRepository.save(p);
        trackingEventService.registrarTransicion(
                p,
                null,
                estadoInicial,
                TrackingEventType.PAQUETE_REGISTRADO,
                "PAQUETE_CREATE",
                p.getMotivoAlterno(),
                null,
                buildIdempotencyKey("create", p.getId(), null, estadoInicial.getId())
        );
        guiaMasterService.recomputarEstado(asignacion.guiaMaster().getId());
        return toDTO(p);
    }

    private record GuiaMasterAsignacion(GuiaMaster guiaMaster, Integer piezaNumero, Integer piezaTotal) {}

    /**
     * Resuelve la guía master para crear un paquete:
     * - si viene guiaMasterId, valida y reserva el piezaNumero (o el siguiente disponible).
     * - si no viene, se crea una guía master individual (AUTO-...) con total 1 y pieza 1/1.
     */
    private GuiaMasterAsignacion resolverGuiaMasterParaCreacion(Long guiaMasterId, Integer piezaNumero) {
        if (guiaMasterId != null) {
            GuiaMaster gm = guiaMasterRepository.findById(guiaMasterId)
                    .orElseThrow(() -> new ResourceNotFoundException("Guía master", guiaMasterId));
            int[] asignado = guiaMasterService.validarYAsignarPieza(gm, piezaNumero);
            return new GuiaMasterAsignacion(gm, asignado[0], asignado[1]);
        }
        String trackingBase = codigoSecuenciaService.nextTrackingBaseAuto();
        GuiaMaster gm = guiaMasterService.create(trackingBase, 1, null);
        return new GuiaMasterAsignacion(gm, 1, 1);
    }

    @Transactional(readOnly = true)
    public List<PaqueteDTO> listarParaOperario(boolean sinPeso) {
        List<Paquete> list = sinPeso
                ? paqueteRepository.findByPesoLbsIsNullOrderByEstadoRastreo_OrdenAscIdAsc()
                : paqueteRepository.findAll(Sort.by(Sort.Direction.ASC, "estadoRastreo.orden").and(Sort.by(Sort.Direction.ASC, "id")));
        return list.stream().map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<PaqueteDTO> listarVencidosParaOperario() {
        return paqueteRepository.findAll(Sort.by(Sort.Direction.ASC, "estadoRastreo.orden").and(Sort.by(Sort.Direction.ASC, "id"))).stream()
                .map(this::toDTO)
                .filter(dto -> Boolean.TRUE.equals(dto.getPaqueteVencido()))
                .sorted(
                        Comparator.comparing(
                                (PaqueteDTO dto) -> Objects.requireNonNullElse(dto.getDiasAtrasoRetiro(), 0),
                                Comparator.<Integer>naturalOrder()
                        ).reversed().thenComparing(
                                dto -> Objects.requireNonNullElse(dto.getId(), Long.MAX_VALUE),
                                Comparator.<Long>naturalOrder()
                        )
                )
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PaqueteDTO> listarSinSaca() {
        return paqueteRepository.findBySacaIsNullOrderByIdAsc().stream().map(this::toDTO).toList();
    }

    /**
     * Sugiere una ref única para un destinatario (formato codigoBase-n).
     * Solo orientativo para la UI: el numero real se asigna al guardar
     * via {@link CodigoSecuenciaService#nextRefPaquete}. Si {@code
     * excludePaqueteId} corresponde a un paquete del mismo destinatario,
     * se devuelve la ref actual de ese paquete (sin avanzar el contador).
     */
    @Transactional(readOnly = true)
    public String sugerirRef(Long consignatarioId, Long excludePaqueteId) {
        Consignatario dest = consignatarioRepository.findById(consignatarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Destinatario", consignatarioId));
        String codigoBase = resolverCodigoBase(dest);
        if (excludePaqueteId != null) {
            var existing = paqueteRepository.findById(excludePaqueteId);
            if (existing.isPresent() && existing.get().getConsignatario() != null
                    && Objects.equals(existing.get().getConsignatario().getId(), consignatarioId)
                    && existing.get().getRef() != null) {
                return existing.get().getRef();
            }
        }
        long n = codigoSecuenciaService.peek(
                CodigoSecuenciaService.ENTITY_PAQUETE_REF,
                String.valueOf(consignatarioId),
                0L);
        return codigoBase + "-" + n;
    }

    /** Busca paquetes por lista de numeroGuia (trim, sin vacíos, sin duplicados). */
    @Transactional(readOnly = true)
    public List<PaqueteDTO> buscarPorNumeroGuias(List<String> numeroGuias) {
        if (numeroGuias == null || numeroGuias.isEmpty()) {
            return List.of();
        }
        List<String> guias = numeroGuias.stream()
                .map(s -> s != null ? s.trim() : "")
                .filter(s -> !s.isEmpty())
                .distinct()
                .toList();
        if (guias.isEmpty()) {
            return List.of();
        }
        return paqueteRepository.findByNumeroGuiaIn(guias).stream().map(this::toDTO).toList();
    }

    @Transactional
    public PaqueteDTO asignarSaca(Long paqueteId, Long sacaId) {
        Paquete p = paqueteRepository.findById(paqueteId)
                .orElseThrow(() -> new ResourceNotFoundException("Paquete", paqueteId));
        if (sacaId != null) {
            Saca saca = sacaRepository.findById(sacaId)
                    .orElseThrow(() -> new ResourceNotFoundException("Saca", sacaId));
            sacaEnDespachoValidator.requireSinDespacho(saca, null);
            p.setSaca(saca);
        } else {
            p.setSaca(null);
        }
        // La saca (vía su despacho) determina los días máximos de retiro.
        recomputarFechaLimiteRetiro(p);
        p = paqueteRepository.save(p);
        if (p.getGuiaMaster() != null) {
            guiaMasterService.recomputarEstado(p.getGuiaMaster().getId());
        }
        return toDTO(p);
    }

    @Transactional
    public List<PaqueteDTO> asignarPaquetesASaca(Long sacaId, List<Long> paqueteIds) {
        Saca saca = sacaRepository.findById(sacaId)
                .orElseThrow(() -> new ResourceNotFoundException("Saca", sacaId));
        sacaEnDespachoValidator.requireSinDespacho(saca, null);
        if (paqueteIds == null || paqueteIds.isEmpty()) {
            return List.of();
        }
        List<Paquete> paquetes = paqueteRepository.findAllById(paqueteIds);
        if (paquetes.size() != paqueteIds.size()) {
            Set<Long> encontrados = paquetes.stream().map(Paquete::getId).collect(Collectors.toSet());
            Long faltante = paqueteIds.stream().filter(id -> !encontrados.contains(id)).findFirst().orElse(null);
            throw new ResourceNotFoundException("Paquete", faltante);
        }
        Set<Long> guiasAfectadas = new HashSet<>();
        for (Paquete p : paquetes) {
            p.setSaca(saca);
            // La saca (vía su despacho) determina los días máximos de retiro.
            recomputarFechaLimiteRetiro(p);
            if (p.getGuiaMaster() != null) {
                guiasAfectadas.add(p.getGuiaMaster().getId());
            }
        }
        List<Paquete> guardados = paqueteRepository.saveAll(paquetes);
        for (Long gmId : guiasAfectadas) {
            guiaMasterService.recomputarEstado(gmId);
        }
        return guardados.stream().map(this::toDTO).toList();
    }

    /** Aplica el estado configurado "en despacho" a los paquetes indicados. Usado desde DespachoService al crear despacho. */
    @Transactional
    public void aplicarEstadoEnDespacho(List<Long> paqueteIds) {
        Long estadoId = parametroSistemaService.getEstadosRastreoPorPunto().getEstadoRastreoEnDespachoId();
        if (estadoId == null) return;
        aplicarEstadoEnDespacho(paqueteIds, estadoId);
    }

    /** Aplica el estado de entrada ya resuelto por el flujo transaccional del despacho. */
    @Transactional
    public void aplicarEstadoEnDespacho(List<Long> paqueteIds, Long estadoId) {
        aplicarEstadoEnConjunto(paqueteIds, estadoId,
                TrackingEventType.ESTADO_APLICADO_DESPACHO, "DESPACHO_AUTO", "despacho");
    }

    /**
     * Aplica el estado configurado "en lote recepción" a los paquetes indicados.
     *
     * @param fechaRecepcionLote fecha/hora de la recepción (la misma que el lote); si es {@code null}
     *                           se usa el instante actual (compatibilidad).
     */
    @Transactional
    public void aplicarEstadoEnLoteRecepcion(List<Long> paqueteIds, LocalDateTime fechaRecepcionLote) {
        Long estadoId = parametroSistemaService.getEstadosRastreoPorPunto().getEstadoRastreoEnLoteRecepcionId();
        if (estadoId == null) return;
        aplicarEstadoEnConjunto(paqueteIds, estadoId,
                TrackingEventType.ESTADO_APLICADO_LOTE_RECEPCION, "LOTE_RECEPCION_AUTO", "lote-recepcion",
                fechaRecepcionLote);
    }

    /** Aplica el estado configurado al asociar paquetes a un envío consolidado. */
    @Transactional
    public void aplicarEstadoAsociarEnvioConsolidado(List<Long> paqueteIds) {
        Long estadoId = parametroSistemaService.getEstadosRastreoPorPunto()
                .getEstadoRastreoAsociarEnvioConsolidadoId();
        if (estadoId == null) return;
        aplicarEstadoEnConjunto(paqueteIds, estadoId,
                TrackingEventType.ESTADO_APLICADO_ASOCIAR_ENVIO_CONSOLIDADO,
                "ASOCIAR_ENVIO_CONSOLIDADO_AUTO", "asociar-envio-consolidado");
    }

    @Transactional(readOnly = true)
    public List<EstadoRastreoDTO> listarEstadosPosterioresAAsociacionConsolidado() {
        Integer ordenBase = ordenEstadoAsociarEnvioConsolidado();
        Integer ordenLimite = ordenEstadoLoteRecepcion();
        Set<Long> reservados = parametroSistemaService.getIdsEstadosRastreoGestionadosAutomaticamente();
        return estadoRastreoService.findActivos().stream()
                .filter(e -> {
                    if (reservados.contains(e.getId())) {
                        return false;
                    }
                    Integer orden = e.getOrden() != null ? e.getOrden() : e.getOrdenTracking();
                    if (orden == null || orden <= ordenBase) {
                        return false;
                    }
                    if (e.getTipoFlujo() == TipoFlujoEstado.NORMAL) {
                        return orden <= ordenLimite;
                    }
                    if (e.getTipoFlujo() == TipoFlujoEstado.ALTERNO && e.getAfterEstadoId() != null) {
                        Integer ordenAfter = estadoRastreoService.getOrdenById(e.getAfterEstadoId());
                        return ordenAfter != null && ordenAfter <= ordenLimite;
                    }
                    return true;
                })
                .toList();
    }

    public void validarEstadoPosteriorAAsociacionConsolidado(Long estadoId) {
        if (estadoId == null) {
            throw new BadRequestException(
                    "No se puede continuar porque no se seleccionó el estado de rastreo a aplicar. "
                            + "Selecciona un estado para continuar.");
        }
        parametroSistemaService.validarEstadoRastreoAplicableManualmente(estadoId);
        EstadoRastreo estado = estadoRastreoService.findEntityById(estadoId);
        Integer ordenObjetivo = estado.getOrden() != null ? estado.getOrden() : estado.getOrdenTracking();
        Integer ordenBase = ordenEstadoAsociarEnvioConsolidado();
        Integer ordenLimite = ordenEstadoLoteRecepcion();

        if (ordenObjetivo == null || ordenObjetivo <= ordenBase) {
            throw new BadRequestException(
                    "No se puede aplicar el estado '" + estado.getNombre()
                            + "' porque su orden no es posterior al punto de asociación a consolidado. "
                            + "Regla: en este flujo solo se pueden aplicar estados posteriores a la asociación a consolidado.");
        }

        if (estado.getTipoFlujo() == TipoFlujoEstado.NORMAL) {
            if (ordenObjetivo > ordenLimite) {
                throw new BadRequestException(
                        "No se puede aplicar el estado '" + estado.getNombre()
                                + "' porque va más allá de la llegada a bodega. "
                                + "Regla: en este flujo solo se pueden aplicar estados hasta la llegada a bodega "
                                + "(lote de recepción) inclusive.");
            }
        } else if (estado.getTipoFlujo() == TipoFlujoEstado.ALTERNO && estado.getAfterEstado() != null) {
            EstadoRastreo after = estado.getAfterEstado();
            Integer ordenAfter = after.getOrden() != null ? after.getOrden() : after.getOrdenTracking();
            if (ordenAfter != null && ordenAfter > ordenLimite) {
                throw new BadRequestException(
                        "No se puede aplicar el estado '" + estado.getNombre()
                                + "' porque va más allá de la llegada a bodega. "
                                + "Regla: en este flujo solo se pueden aplicar estados hasta la llegada a bodega "
                                + "(lote de recepción) inclusive.");
            }
        }
    }

    /**
     * Resuelve, para un estado de rastreo {@code destinoId} seleccionado en el
     * bulk "Aplicar estado a consolidados", cuál es el estado de rastreo
     * "anterior" que deben tener los paquetes de un consolidado para que este
     * sea elegible (regla de "ir de 1 en 1").
     *
     * <p>Para estados NORMAL, el anterior es el estado NORMAL activo
     * inmediatamente previo según {@code orden}. Para estados ALTERNO (p.ej.
     * "Retenido en aduana"), el anterior es {@code afterEstado}.
     *
     * <p>Si el estado anterior coincide con el configurado para "Llega a aduana
     * destino" ({@link EstadosRastreoPorPuntoDTO#getEstadoRastreoArribadoEcId()}),
     * también se consideran elegibles los consolidados cuyo
     * {@code estadoOperativo} sea {@code ARRIBADO_ECUADOR}, ya que el estado de
     * los paquetes puede no haberse propagado aún.
     */
    @Transactional(readOnly = true)
    public EstadoOrigenConsolidado resolverEstadoOrigenParaEstadoRastreoConsolidado(Long destinoId) {
        EstadoRastreo destino = estadoRastreoService.findEntityById(destinoId);
        EstadoRastreo origen;
        if (destino.getTipoFlujo() == TipoFlujoEstado.ALTERNO) {
            origen = destino.getAfterEstado();
        } else {
            Integer ordenDestino = destino.getOrden() != null ? destino.getOrden() : destino.getOrdenTracking();
            origen = ordenDestino == null ? null : estadoRastreoService.findActivosEntities().stream()
                    .filter(e -> e.getTipoFlujo() == TipoFlujoEstado.NORMAL)
                    .filter(e -> {
                        Integer orden = e.getOrden() != null ? e.getOrden() : e.getOrdenTracking();
                        return orden != null && orden < ordenDestino;
                    })
                    .max(Comparator.comparingInt(e -> e.getOrden() != null ? e.getOrden() : e.getOrdenTracking()))
                    .orElse(null);
        }
        Long llegaAduanaDestinoId = parametroSistemaService.getEstadosRastreoPorPunto().getEstadoRastreoArribadoEcId();
        boolean incluirArribadosEcuador = origen != null && origen.getId().equals(llegaAduanaDestinoId);
        return new EstadoOrigenConsolidado(origen != null ? origen.getId() : null, incluirArribadosEcuador);
    }

    /** @param estadoOrigenId puede ser {@code null} si el destino no tiene un estado anterior identificable. */
    public record EstadoOrigenConsolidado(Long estadoOrigenId, boolean incluirArribadosEcuador) {
    }

    private Integer ordenEstadoAsociarEnvioConsolidado() {
        Long estadoId = parametroSistemaService.getEstadosRastreoPorPunto()
                .getEstadoRastreoAsociarEnvioConsolidadoId();
        if (estadoId == null) {
            throw new BadRequestException(
                    "No se puede continuar porque no hay un estado configurado para la asociación a consolidado. "
                            + "Configura este punto en los parámetros del sistema.");
        }
        Integer orden = estadoRastreoService.getOrdenById(estadoId);
        if (orden == null) {
            EstadoRastreo estado = estadoRastreoService.findEntityById(estadoId);
            orden = estado.getOrden() != null ? estado.getOrden() : estado.getOrdenTracking();
        }
        if (orden == null) {
            throw new BadRequestException(
                    "No se puede continuar porque el estado de asociación a consolidado no tiene orden de rastreo. "
                            + "Revisa el catálogo de estados de rastreo y asigna un orden a ese estado.");
        }
        return orden;
    }

    private Integer ordenEstadoLoteRecepcion() {
        Long estadoId = parametroSistemaService.getEstadosRastreoPorPunto()
                .getEstadoRastreoEnLoteRecepcionId();
        if (estadoId == null) {
            throw new BadRequestException(
                    "No se puede continuar porque no hay un estado configurado para el lote de recepción. "
                            + "Configura este punto en los parámetros del sistema.");
        }
        Integer orden = estadoRastreoService.getOrdenById(estadoId);
        if (orden == null) {
            EstadoRastreo estado = estadoRastreoService.findEntityById(estadoId);
            orden = estado.getOrden() != null ? estado.getOrden() : estado.getOrdenTracking();
        }
        if (orden == null) {
            throw new BadRequestException(
                    "No se puede continuar porque el estado de lote de recepción no tiene orden de rastreo. "
                            + "Revisa el catálogo de estados de rastreo y asigna un orden a ese estado.");
        }
        return orden;
    }

    /**
     * Aplica el estado configurado "enviado desde USA" a los paquetes indicados.
     */
    @Transactional
    public void aplicarEstadoEnviadoDesdeUsa(List<Long> paqueteIds, LocalDateTime fechaEvento) {
        Long estadoId = parametroSistemaService.getEstadosRastreoPorPunto().getEstadoRastreoEnviadoDesdeUsaId();
        if (estadoId == null) return;
        aplicarEstadoEnConjunto(paqueteIds, estadoId,
                TrackingEventType.ESTADO_APLICADO_ENVIADO_USA, "ENVIADO_USA_AUTO", "enviado-usa",
                fechaEvento);
    }

    /**
     * Aplica el estado configurado "arribado a Ecuador" a los paquetes indicados.
     */
    @Transactional
    public void aplicarEstadoArribadoEc(List<Long> paqueteIds, LocalDateTime fechaEvento) {
        Long estadoId = parametroSistemaService.getEstadosRastreoPorPunto().getEstadoRastreoArribadoEcId();
        if (estadoId == null) return;
        aplicarEstadoEnConjunto(paqueteIds, estadoId,
                TrackingEventType.ESTADO_APLICADO_ARRIBADO_EC, "ARRIBADO_EC_AUTO", "arribado-ec",
                fechaEvento);
    }

    /** Aplica el estado configurable "Manifestado" al cerrar el consolidado para registro. */
    @Transactional
    public void aplicarEstadoCierreConsolidado(List<Long> paqueteIds, LocalDateTime fechaEvento) {
        Long estadoId = parametroSistemaService.getEstadosRastreoPorPunto().getEstadoRastreoCierreConsolidadoId();
        if (estadoId == null) return;
        aplicarEstadoEnConjunto(paqueteIds, estadoId,
                TrackingEventType.ESTADO_APLICADO_CIERRE_CONSOLIDADO,
                "CIERRE_CONSOLIDADO_AUTO", "cierre-consolidado",
                fechaEvento);
    }

    /** Aplica el estado configurable "Llega a aduana destino" al marcar arribo a Ecuador. */
    @Transactional
    public void aplicarEstadoArriboEcuador(List<Long> paqueteIds, LocalDateTime fechaEvento) {
        Long estadoId = parametroSistemaService.getEstadosRastreoPorPunto().getEstadoRastreoArriboEcuadorId();
        if (estadoId == null) return;
        aplicarEstadoEnConjunto(paqueteIds, estadoId,
                TrackingEventType.ESTADO_APLICADO_ARRIBO_ECUADOR,
                "ARRIBO_ECUADOR_AUTO", "arribo-ecuador",
                fechaEvento);
    }

    /**
     * Aplica un mismo estado a un conjunto de paquetes en una sola unidad de trabajo
     * y registra el evento de tracking correspondiente.
     *
     * <p>Sustituye el bucle {@code findById}+{@code save} por {@code findAllById} +
     * {@code saveAll} para reducir round-trips y evitar el patron lost-update por
     * lecturas individuales fuera del mismo flush.
     */
    private void aplicarEstadoEnConjunto(List<Long> paqueteIds,
                                         Long estadoDestinoId,
                                         TrackingEventType eventType,
                                         String eventSource,
                                         String idempotencyPrefix) {
        aplicarEstadoEnConjunto(paqueteIds, estadoDestinoId, eventType, eventSource, idempotencyPrefix, null);
    }

    /**
     * @param fechaEfectivaOrNull instante único para todos los paquetes del lote (fecha del lote de recepción);
     *                            si es null se usa {@link LocalDateTime#now()} una sola vez por operación.
     */
    private void aplicarEstadoEnConjunto(List<Long> paqueteIds,
                                         Long estadoDestinoId,
                                         TrackingEventType eventType,
                                         String eventSource,
                                         String idempotencyPrefix,
                                         LocalDateTime fechaEfectivaOrNull) {
        if (paqueteIds == null || paqueteIds.isEmpty()) return;
        LocalDateTime fechaEfectiva = fechaEfectivaOrNull != null ? fechaEfectivaOrNull : LocalDateTime.now(ZONA_ECUADOR);
        EstadoRastreo estado = estadoRastreoService.findEntityById(estadoDestinoId);
        List<Paquete> paquetes = paqueteRepository.findAllById(paqueteIds);
        if (paquetes.isEmpty()) return;
        Set<Long> guiasAfectadas = new HashSet<>();
        List<TrackingEventService.PendingTransicion> pendientes = new ArrayList<>(paquetes.size());
        for (Paquete p : paquetes) {
            EstadoRastreo origen = p.getEstadoRastreo();
            aplicarEstadoConReglas(p, estado, null, fechaEfectiva);
            pendientes.add(new TrackingEventService.PendingTransicion(p, origen));
            if (p.getGuiaMaster() != null) {
                guiasAfectadas.add(p.getGuiaMaster().getId());
            }
        }
        paqueteRepository.saveAll(paquetes);
        for (TrackingEventService.PendingTransicion pt : pendientes) {
            Paquete p = pt.paquete();
            EstadoRastreo origen = pt.origen();
            trackingEventService.registrarTransicion(
                    p,
                    origen,
                    estado,
                    eventType,
                    eventSource,
                    p.getMotivoAlterno(),
                    null,
                    buildIdempotencyKey(idempotencyPrefix, p.getId(), origen != null ? origen.getId() : null, estado.getId()),
                    fechaEfectiva);
        }
        for (Long gmId : guiasAfectadas) {
            guiaMasterService.recomputarEstado(gmId);
        }
    }

    @Transactional
    public int revertirEstadoSiUltimoEventoCoincide(List<Long> paqueteIds, String expectedEventSource) {
        if (paqueteIds == null || paqueteIds.isEmpty()) return 0;
        int reverted = 0;
        for (Long paqueteId : paqueteIds) {
            if (paqueteId == null) {
                continue;
            }
            Paquete paquete = paqueteRepository.findById(paqueteId).orElse(null);
            if (paquete == null) {
                continue;
            }
            var ultimoEventoOpt = paqueteEstadoEventoRepository.findTopByPaqueteIdOrderByOccurredAtDescIdDesc(paqueteId);
            if (ultimoEventoOpt.isEmpty()) {
                continue;
            }
            PaqueteEstadoEvento ultimoEvento = ultimoEventoOpt.get();
            EstadoRastreo estadoOrigen = ultimoEvento.getEstadoOrigen();
            if (estadoOrigen == null) {
                continue;
            }
            if (expectedEventSource != null && !expectedEventSource.equals(ultimoEvento.getEventSource())) {
                continue;
            }
            EstadoRastreo estadoActual = paquete.getEstadoRastreo();
            if (estadoActual != null && Objects.equals(estadoActual.getId(), estadoOrigen.getId())) {
                continue;
            }
            paquete.setEstadoRastreo(estadoOrigen);
            paquete.setFechaEstadoActualDesde(LocalDateTime.now(ZONA_ECUADOR));
            paquete.setEnFlujoAlterno(TipoFlujoEstado.ALTERNO.equals(estadoOrigen.getTipoFlujo()));
            if (!TipoFlujoEstado.ALTERNO.equals(estadoOrigen.getTipoFlujo())) {
                paquete.setMotivoAlterno(null);
            }
            paquete.setBloqueado(false);
            paquete.setFechaBloqueoDesde(null);
            paqueteRepository.save(paquete);
            paqueteEstadoEventoRepository.delete(ultimoEvento);
            reverted++;
        }
        return reverted;
    }

    private EstadoRastreo getEstadoRegistroPaquete() {
        Long id = parametroSistemaService.getEstadosRastreoPorPunto().getEstadoRastreoRegistroPaqueteId();
        if (id != null) {
            return estadoRastreoService.findEntityById(id);
        }
        throw new BadRequestException(
                "No hay un estado configurado para registrar paquetes. Configure este punto en parámetros del sistema.");
    }

    @Transactional
    public List<PaqueteDTO> actualizarPesosBulk(List<PaquetePesoItem> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        List<Long> ids = items.stream().map(PaquetePesoItem::getPaqueteId).toList();
        Map<Long, Paquete> porId = paqueteRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Paquete::getId, p -> p));
        if (porId.size() != ids.stream().distinct().count()) {
            Long faltante = ids.stream().filter(id -> !porId.containsKey(id)).findFirst().orElse(null);
            throw new ResourceNotFoundException("Paquete", faltante);
        }
        List<Paquete> aGuardar = new ArrayList<>(items.size());
        Set<Long> guiasAfectadas = new HashSet<>();
        Set<Long> enviosAfectados = new HashSet<>();
        for (PaquetePesoItem item : items) {
            Paquete p = porId.get(item.getPaqueteId());
            BigDecimal lbs = item.getPesoLbs();
            BigDecimal kg = item.getPesoKg();
            BigDecimal pesoPrevio = p.getPesoLbs();
            if (lbs != null && lbs.compareTo(BigDecimal.ZERO) > 0) {
                p.setPesoLbs(lbs);
            } else if (kg != null && kg.compareTo(BigDecimal.ZERO) > 0) {
                p.setPesoLbs(WeightUtil.kgToLbs(kg));
            }
            if (pesoPrevio == null && p.getPesoLbs() != null && p.getGuiaMaster() != null) {
                guiasAfectadas.add(p.getGuiaMaster().getId());
            }
            if (!Objects.equals(pesoPrevio, p.getPesoLbs())) {
                Long envioId = envioConsolidadoId(p);
                if (envioId != null) enviosAfectados.add(envioId);
            }
            aGuardar.add(p);
        }
        List<PaqueteDTO> result = paqueteRepository.saveAll(aGuardar).stream().map(this::toDTO).toList();
        for (Long gmId : guiasAfectadas) {
            guiaMasterService.recomputarEstado(gmId);
        }
        for (Long envioId : enviosAfectados) {
            sincronizarTotalesEnvio(envioId);
        }
        return result;
    }

    @Transactional
    public PaqueteDTO update(Long paqueteId, Long currentUsuarioId, boolean canManageAny, boolean canEditPeso, PaqueteUpdateRequest request) {
        Paquete p = paqueteRepository.findById(paqueteId)
                .orElseThrow(() -> new ResourceNotFoundException("Paquete", paqueteId));
        ownershipValidator.requirePaqueteOwnership(p, currentUsuarioId, canManageAny);
        Long newDestId = request.getConsignatarioId();
        boolean destChanged = newDestId != null
                && (p.getConsignatario() == null || !p.getConsignatario().getId().equals(newDestId));
        if (destChanged) {
            Consignatario newDest = consignatarioRepository.findById(newDestId)
                    .orElseThrow(() -> new ResourceNotFoundException("Destinatario", newDestId));
            ownershipValidator.requireDestinatarioOwnership(newDest, currentUsuarioId, canManageAny);
            p.setConsignatario(newDest);
            String codigoBase = resolverCodigoBase(newDest);
            p.setRef(codigoSecuenciaService.nextRefPaquete(newDest.getId(), codigoBase));
        }
        if (request.getContenido() != null) {
            p.setContenido(request.getContenido().trim().isEmpty() ? null : request.getContenido().trim());
        }
        if (!canEditPeso) {
            if (p.getContenido() == null || p.getContenido().isBlank()) {
                throw new BadRequestException(
                        "No se puede guardar el paquete porque falta el contenido. "
                                + "Regla: la descripción del contenido es obligatoria. Ingresa el contenido para continuar.");
            }
        }
        boolean pesoCambioRecepcion = false;
        Long envioPesoAfectadoId = null;
        if (canEditPeso) {
            BigDecimal pesoPrevio = p.getPesoLbs();
            if (request.getPesoLbs() != null) {
                p.setPesoLbs(request.getPesoLbs());
            } else if (request.getPesoKg() != null) {
                p.setPesoLbs(WeightUtil.kgToLbs(request.getPesoKg()));
            } else {
                p.setPesoLbs(null);
            }
            // Si cambia el "tener peso vs no tener peso", afecta el conteo
            // de piezas recibidas en la guia master -> hay que recalcular.
            boolean teniaPeso = pesoPrevio != null;
            boolean tienePeso = p.getPesoLbs() != null;
            pesoCambioRecepcion = teniaPeso != tienePeso;
            if (!Objects.equals(pesoPrevio, p.getPesoLbs())) {
                envioPesoAfectadoId = envioConsolidadoId(p);
            }
            String newRef = request.getRef() != null ? request.getRef().trim() : null;
            // Si en la misma request se cambio el destinatario, ya regeneramos el
            // ref atomicamente con el codigoBase correcto: ignoramos cualquier ref
            // que mande el cliente para no machacarlo (bug que producia destId vs
            // ref desincronizados, p.ej. destId KEVIN con ref ECU-CV01-...).
            if (newRef != null && !newRef.isEmpty() && !destChanged) {
                String codigoBaseActual = resolverCodigoBase(p.getConsignatario());
                if (codigoBaseActual != null && !newRef.startsWith(codigoBaseActual + "-")) {
                    throw new BadRequestException(
                            "No se puede guardar la referencia '" + newRef
                                    + "' porque no corresponde al consignatario del paquete. "
                                    + "Regla: la referencia debe iniciar con el código del consignatario, en este caso '"
                                    + codigoBaseActual + "-'.");
                }
                if (paqueteRepository.existsByRefAndIdNot(newRef, paqueteId)) {
                    throw new ConflictException(
                            "No se puede guardar el paquete porque la referencia '" + newRef
                                    + "' ya está usada por otro paquete. "
                                    + "Regla: la referencia del paquete debe ser única.");
                }
                p.setRef(newRef);
            }
            if (request.getGuiaMasterId() != null
                    && (p.getGuiaMaster() == null || !p.getGuiaMaster().getId().equals(request.getGuiaMasterId()))) {
                Long previaId = p.getGuiaMaster() != null ? p.getGuiaMaster().getId() : null;
                reasignarPiezaAGuiaMaster(p, request.getGuiaMasterId(), request.getPiezaNumero());
                String nuevoNumeroGuia = GuiaMasterService.componerNumeroGuia(p.getGuiaMaster(), p.getPiezaNumero());
                if (nuevoNumeroGuia != null && !nuevoNumeroGuia.equals(p.getNumeroGuia())) {
                    if (paqueteRepository.existsByNumeroGuiaAndIdNot(nuevoNumeroGuia, paqueteId)) {
                        throw new ConflictException(
                                "No se puede cambiar la guía master porque el número de guía resultante ("
                                        + nuevoNumeroGuia + ") ya está usado por otro paquete. "
                                        + "Regla: el número de guía debe ser único. Elige otra pieza u otra guía master.");
                    }
                    p.setNumeroGuia(nuevoNumeroGuia);
                }
                if (previaId != null) {
                    guiaMasterService.recomputarEstado(previaId);
                }
                guiaMasterService.recomputarEstado(request.getGuiaMasterId());
                pesoCambioRecepcion = false;
            }
        }
        p = paqueteRepository.save(p);
        if (pesoCambioRecepcion && p.getGuiaMaster() != null) {
            guiaMasterService.recomputarEstado(p.getGuiaMaster().getId());
        }
        sincronizarTotalesEnvio(envioPesoAfectadoId);
        return toDTO(p);
    }

    private void reasignarPiezaAGuiaMaster(Paquete p, Long guiaMasterId, Integer piezaNumero) {
        GuiaMaster gm = guiaMasterRepository.findById(guiaMasterId)
                .orElseThrow(() -> new ResourceNotFoundException("Guía master", guiaMasterId));
        int[] asignado = guiaMasterService.validarYAsignarPieza(gm, piezaNumero);
        p.setGuiaMaster(gm);
        p.setPiezaNumero(asignado[0]);
        p.setPiezaTotal(asignado[1]);
        String nuevoNumeroGuia = GuiaMasterService.componerNumeroGuia(gm, asignado[0]);
        if (nuevoNumeroGuia != null && !nuevoNumeroGuia.equals(p.getNumeroGuia())) {
            if (paqueteRepository.existsByNumeroGuiaAndIdNot(nuevoNumeroGuia,
                    Optional.ofNullable(p.getId()).orElse(-1L))) {
                throw new ConflictException(
                        "No se puede asignar la pieza porque el número de guía resultante ("
                                + nuevoNumeroGuia + ") ya está usado por otro paquete. "
                                + "Regla: el número de guía debe ser único. Elige otra pieza u otra guía master.");
            }
            p.setNumeroGuia(nuevoNumeroGuia);
        }
    }

    @Transactional
    public void delete(Long paqueteId, Long currentUsuarioId, boolean canManageAny) {
        Paquete p = paqueteRepository.findById(paqueteId)
                .orElseThrow(() -> new ResourceNotFoundException("Paquete", paqueteId));
        ownershipValidator.requirePaqueteOwnership(p, currentUsuarioId, canManageAny);
        Long envioId = envioConsolidadoId(p);
        paqueteEstadoEventoRepository.deleteByPaqueteId(paqueteId);
        outboxEventRepository.deleteByAggregateTypeAndAggregateId("PAQUETE", String.valueOf(paqueteId));
        paqueteRepository.delete(p);
        sincronizarTotalesEnvio(envioId);
    }

    /**
     * Borra todos los paquetes pertenecientes a un envio consolidado, incluyendo
     * sus eventos de tracking ({@code paquete_estado_evento}) y los eventos
     * pendientes en el outbox. Pensado para ser invocado desde el flujo de
     * eliminacion de un envio consolidado cuando el operario decide
     * explicitamente borrar las piezas junto con el agrupador.
     *
     * @return cantidad de paquetes efectivamente eliminados.
     */
    @Transactional
    public int deleteAllByEnvioConsolidadoId(Long envioConsolidadoId) {
        List<Paquete> paquetes = paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(envioConsolidadoId);
        if (paquetes.isEmpty()) {
            return 0;
        }
        for (Paquete p : paquetes) {
            Long pid = p.getId();
            paqueteEstadoEventoRepository.deleteByPaqueteId(pid);
            outboxEventRepository.deleteByAggregateTypeAndAggregateId("PAQUETE", String.valueOf(pid));
        }
        paqueteRepository.deleteAll(paquetes);
        return paquetes.size();
    }

    private static final ZoneId ZONA_ECUADOR = ZoneId.of("America/Guayaquil");
    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_DATE_TIME;
    private record PlazoRetiroInfo(Integer diasMaxRetiro,
                                   Integer diasTranscurridos,
                                   Integer diasRestantes,
                                   Integer diasAtrasoRetiro,
                                   boolean paqueteVencido,
                                   boolean cuentaRegresivaFinalizada) {}

    /**
     * Lectura para tracking público. {@link ResourceNotFoundException} se usa como
     * señal de "no existe pieza con ese número" y es esperado en flujos donde el
     * llamador (ej. {@code TrackingResolverService.resolve}) prueba después con
     * guía master. Evitamos así marcar la transacción global como rollback-only
     * cuando esa excepción es atrapada por el caller.
     */
    @Transactional(readOnly = true, noRollbackFor = ResourceNotFoundException.class)
    public TrackingResponse findByNumeroGuiaForTracking(String numeroGuia) {
        String guia = numeroGuia != null ? numeroGuia.trim().toUpperCase() : null;
        Paquete p = paqueteRepository.findByNumeroGuiaWithSacaAndDespacho(guia)
                .orElseGet(() -> paqueteRepository.findByNumeroGuiaIgnoreCase(guia)
                        .orElseThrow(() -> new ResourceNotFoundException("Paquete", numeroGuia)));
        EstadoRastreo estadoActual = p.getEstadoRastreo();
        Long estadoActualId = estadoActual != null ? estadoActual.getId() : null;
        String estadoRastreoNombre = estadoActual != null ? estadoActual.getNombre() : null;

        List<TrackingEstadoItemDTO> estadosCatalogo = new ArrayList<>();
        String leyendaActual = null;
        PlazoRetiroInfo plazoRetiroInfo = calcularPlazoRetiro(p);
        Integer diasMaxRetiro = plazoRetiroInfo.diasMaxRetiro();
        Integer diasTranscurridos = plazoRetiroInfo.diasTranscurridos();
        Integer diasRestantes = plazoRetiroInfo.diasRestantes();

        // Sprint 2: cargar event log y construir mapa estadoId -> ultimo occurredAt
        // para enriquecer los items del timeline con fechas reales (auditables).
        List<PaqueteEstadoEvento> eventos = useEventTimeline
                ? trackingEventService.listarEventosPorPaquete(p.getId())
                : List.of();
        Map<Long, LocalDateTime> ocurrenciaPorEstado = new LinkedHashMap<>();
        for (PaqueteEstadoEvento evento : eventos) {
            EstadoRastreo destino = evento.getEstadoDestino();
            if (destino == null || destino.getId() == null) continue;
            LocalDateTime when = evento.getOccurredAt();
            if (when == null) continue;
            // Nos quedamos con la ultima ocurrencia por estado (refleja la transicion
            // mas reciente, util cuando hay reversiones o correcciones).
            LocalDateTime prev = ocurrenciaPorEstado.get(destino.getId());
            if (prev == null || when.isAfter(prev)) {
                ocurrenciaPorEstado.put(destino.getId(), when);
            }
        }

        List<EstadoRastreo> todosEstados = estadoRastreoService.findActivosEntities();
        for (EstadoRastreo e : todosEstados) {
            boolean esActual = estadoActualId != null && estadoActualId.equals(e.getId());
            boolean esAlterno = TipoFlujoEstado.ALTERNO.equals(e.getTipoFlujo());
            if (!Boolean.TRUE.equals(e.getPublicoTracking()) && !esActual) {
                continue;
            }
            // Los estados alternos solo se muestran si ocurrieron; en fallback sin eventos
            // solo permitimos el alterno si es el estado actual.
            if (esAlterno && !esActual) {
                continue;
            }
            String leyenda = renderLeyenda(e.getLeyenda(), diasTranscurridos);
            LocalDateTime fechaOcurrencia = ocurrenciaPorEstado.get(e.getId());
            // Para el estado actual, si no hay evento (caso fallback) usamos la fecha
            // denormalizada en el paquete para no mostrar el paso "vacio".
            if (fechaOcurrencia == null && esActual) {
                fechaOcurrencia = p.getFechaEstadoActualDesde();
            }
            estadosCatalogo.add(TrackingEstadoItemDTO.builder()
                    .id(e.getId())
                    .codigo(e.getCodigo())
                    .nombre(e.getNombre())
                    .orden(e.getOrdenTracking())
                    .tipoFlujo(e.getTipoFlujo())
                    .leyenda(leyenda)
                    .esActual(esActual)
                    .fechaOcurrencia(fechaOcurrencia)
                    .build());
            if (esActual) {
                leyendaActual = leyenda;
            }
        }
        List<TrackingEstadoItemDTO> estadosBase = estadosCatalogo.stream()
                .filter(item -> !TipoFlujoEstado.ALTERNO.equals(item.getTipoFlujo()))
                .toList();
        List<TrackingEstadoItemDTO> alternosActuales = estadosCatalogo.stream()
                .filter(item -> TipoFlujoEstado.ALTERNO.equals(item.getTipoFlujo()))
                .toList();
        List<TrackingEstadoItemDTO> alternosPorEventos = List.of();
        if (useEventTimeline && !eventos.isEmpty()) {
            alternosPorEventos = buildAlternoTimelineFromEventos(eventos, estadoActualId, diasTranscurridos, ocurrenciaPorEstado);
        }
        Set<Long> alternosPermitidos = alternosPorEventos.stream()
                .map(TrackingEstadoItemDTO::getId)
                .collect(Collectors.toSet());
        alternosActuales.stream()
                .filter(TrackingEstadoItemDTO::isEsActual)
                .map(TrackingEstadoItemDTO::getId)
                .forEach(alternosPermitidos::add);
        List<TrackingEstadoItemDTO> estados = mergeTimeline(estadosBase, alternosActuales, alternosPorEventos, alternosPermitidos);
        leyendaActual = renderLeyenda(leyendaActual, diasTranscurridos);

        return TrackingResponse.builder()
                .numeroGuia(p.getNumeroGuia())
                .estadoRastreoId(estadoActualId)
                .estadoRastreoNombre(estadoRastreoNombre)
                .consignatarioNombre(p.getConsignatario() != null ? p.getConsignatario().getNombre() : null)
                .consignatario(buildConsignatarioCard(p))
                .estados(estados)
                .estadoActualId(estadoActualId)
                .fechaEstadoDesde(p.getFechaEstadoActualDesde() != null ? p.getFechaEstadoActualDesde().format(ISO_FORMATTER) : null)
                .leyenda(leyendaActual)
                .diasMaxRetiro(diasMaxRetiro)
                .diasTranscurridos(diasTranscurridos)
                .diasRestantes(diasRestantes)
                .cuentaRegresivaFinalizada(plazoRetiroInfo.cuentaRegresivaFinalizada())
                .paqueteVencido(plazoRetiroInfo.paqueteVencido())
                .flujoActual(Boolean.TRUE.equals(p.getEnFlujoAlterno()) ? "ALTERNO" : "NORMAL")
                .bloqueado(p.getBloqueado())
                .motivoAlterno(p.getMotivoAlterno())
                .despacho(buildDespachoCard(p))
                .sacaActual(buildSacaActualCard(p))
                .paquetesDespacho(buildPaquetesDespachoCard(p))
                .operadorEntrega(buildOperadorEntregaCard(p))
                .master(buildMasterResumenForPieza(p))
                .build();
    }

    /**
     * Resumen de la guía master a la que pertenece esta pieza, para que el cliente
     * pueda ver — desde el tracking de una pieza individual — todas las piezas
     * hermanas con su estado y navegar al tracking de cada una.
     *
     * <p>Solo se incluye cuando la guía consolida más de una pieza (esperadas o
     * registradas). El feed agregado ({@code timeline}) se omite para mantener
     * la respuesta liviana; quien quiera el feed completo puede consultar el
     * tracking de la guía master por su {@code trackingBase}.</p>
     */
    private TrackingMasterResponse buildMasterResumenForPieza(Paquete p) {
        if (p == null) return null;
        GuiaMaster gm = p.getGuiaMaster();
        if (gm == null) return null;
        Integer total = gm.getTotalPiezasEsperadas();
        long registradas = paqueteRepository.countByGuiaMasterId(gm.getId());
        boolean masDeUna = (total != null && total > 1) || registradas > 1;
        if (!masDeUna) return null;
        return guiaMasterService.buildTrackingMasterResponse(gm, false);
    }

    private List<TrackingEstadoItemDTO> mergeTimeline(List<TrackingEstadoItemDTO> estadosBase,
                                                      List<TrackingEstadoItemDTO> alternosActuales,
                                                      List<TrackingEstadoItemDTO> alternosPorEventos,
                                                      Set<Long> alternosPermitidos) {
        Map<Long, TrackingEstadoItemDTO> uniqueTimeline = new LinkedHashMap<>();
        for (TrackingEstadoItemDTO estado : estadosBase) {
            uniqueTimeline.put(estado.getId(), estado);
        }
        for (TrackingEstadoItemDTO alternoActual : alternosActuales) {
            if (alternosPermitidos.contains(alternoActual.getId())) {
                uniqueTimeline.put(alternoActual.getId(), alternoActual);
            }
        }
        for (TrackingEstadoItemDTO alternoEvento : alternosPorEventos) {
            if (alternosPermitidos.contains(alternoEvento.getId())) {
                uniqueTimeline.put(alternoEvento.getId(), alternoEvento);
            }
        }
        return uniqueTimeline.values().stream()
                .sorted(Comparator.comparing(TrackingEstadoItemDTO::getOrden).thenComparing(TrackingEstadoItemDTO::getId))
                .toList();
    }

    private List<TrackingEstadoItemDTO> buildAlternoTimelineFromEventos(List<PaqueteEstadoEvento> eventos,
                                                                        Long estadoActualId,
                                                                        Integer diasTranscurridos,
                                                                        Map<Long, LocalDateTime> ocurrenciaPorEstado) {
        Map<Long, TrackingEstadoItemDTO> uniqueTimeline = new LinkedHashMap<>();
        for (PaqueteEstadoEvento evento : eventos) {
            EstadoRastreo destino = evento.getEstadoDestino();
            if (destino == null || destino.getId() == null) {
                continue;
            }
            if (!TipoFlujoEstado.ALTERNO.equals(destino.getTipoFlujo())) {
                continue;
            }
            if (!Boolean.TRUE.equals(destino.getPublicoTracking()) && !destino.getId().equals(estadoActualId)) {
                continue;
            }
            String leyenda = renderLeyenda(destino.getLeyenda(), diasTranscurridos);
            uniqueTimeline.put(destino.getId(), TrackingEstadoItemDTO.builder()
                    .id(destino.getId())
                    .codigo(destino.getCodigo())
                    .nombre(destino.getNombre())
                    .orden(destino.getOrdenTracking())
                    .tipoFlujo(destino.getTipoFlujo())
                    .leyenda(leyenda)
                    .esActual(estadoActualId != null && estadoActualId.equals(destino.getId()))
                    .fechaOcurrencia(ocurrenciaPorEstado.get(destino.getId()))
                    .build());
        }
        return uniqueTimeline.values().stream()
                .sorted(Comparator.comparing(TrackingEstadoItemDTO::getOrden).thenComparing(TrackingEstadoItemDTO::getId))
                .toList();
    }

    private Integer chooseDiasMaxRetiroPorEntidad(Paquete p) {
        Saca saca = p.getSaca();
        if (saca == null) {
            return null;
        }
        Despacho d = saca.getDespacho();
        if (d == null || d.getTipoEntrega() == null) {
            return null;
        }
        return switch (d.getTipoEntrega()) {
            case DOMICILIO -> d.getCourierEntrega() != null ? d.getCourierEntrega().getDiasMaxRetiroDomicilio() : null;
            case AGENCIA -> d.getAgencia() != null ? d.getAgencia().getDiasMaxRetiro() : null;
            case AGENCIA_COURIER_ENTREGA -> d.getAgenciaCourierEntrega() != null ? d.getAgenciaCourierEntrega().getDiasMaxRetiro() : null;
        };
    }

    private PlazoRetiroInfo calcularPlazoRetiro(Paquete p) {
        var estadosPorPunto = parametroSistemaService.getEstadosRastreoPorPunto();
        Long estadoFinalCuentaRegresivaId =
                estadosPorPunto != null ? estadosPorPunto.getEstadoRastreoFinCuentaRegresivaId() : null;
        Long estadoInicioCuentaRegresivaId =
                estadosPorPunto != null ? estadosPorPunto.getEstadoRastreoInicioCuentaRegresivaId() : null;
        Long estadoActualId = p.getEstadoRastreo() != null ? p.getEstadoRastreo().getId() : null;
        if (estadoFinalCuentaRegresivaId != null && Objects.equals(estadoFinalCuentaRegresivaId, estadoActualId)) {
            return new PlazoRetiroInfo(null, null, null, 0, false, true);
        }
        Integer diasMaxRetiro = chooseDiasMaxRetiroPorEntidad(p);
        LocalDateTime fechaAncla = resolverFechaAnclaCuentaRegresiva(p, estadoInicioCuentaRegresivaId, estadoActualId);
        if (diasMaxRetiro == null || fechaAncla == null) {
            return new PlazoRetiroInfo(diasMaxRetiro, null, null, 0, false, false);
        }
        LocalDate desde = fechaAncla.atZone(ZONA_ECUADOR).toLocalDate();
        LocalDate hoy = LocalDate.now(ZONA_ECUADOR);
        long dias = java.time.temporal.ChronoUnit.DAYS.between(desde, hoy);
        int diasTranscurridos = (int) Math.max(0, dias);
        int diasRestantes = Math.max(0, diasMaxRetiro - diasTranscurridos);
        int diasAtrasoRetiro = Math.max(0, diasTranscurridos - diasMaxRetiro);
        boolean paqueteVencido = diasTranscurridos > diasMaxRetiro;
        return new PlazoRetiroInfo(diasMaxRetiro, diasTranscurridos, diasRestantes, diasAtrasoRetiro, paqueteVencido, false);
    }

    /**
     * Calcula la fecha límite de retiro absoluta que se persiste en el paquete
     * ({@code fecha_limite_retiro}). Devuelve el instante —en hora local de
     * Ecuador— a partir del cual el paquete queda vencido, de modo que "vencido"
     * sea el predicado SQL {@code fecha_limite_retiro <= now()}.
     * <p>Es {@code null} en los mismos casos en que {@link #calcularPlazoRetiro}
     * marca {@code paqueteVencido=false} de forma permanente: estado de fin de
     * cuenta regresiva (entregado) o sin días máximos / fecha ancla resueltos.</p>
     * <p>Equivalencia con {@code calcularPlazoRetiro}: allí
     * {@code paqueteVencido = diasTranscurridos > diasMaxRetiro}, es decir el
     * paquete vence al iniciar el día {@code (diasMaxRetiro + 1)} contado desde la
     * fecha ancla. Ese inicio de día es el instante que persistimos.</p>
     */
    private LocalDateTime computeFechaLimiteRetiro(Paquete p) {
        var estadosPorPunto = parametroSistemaService.getEstadosRastreoPorPunto();
        Long estadoFinalCuentaRegresivaId =
                estadosPorPunto != null ? estadosPorPunto.getEstadoRastreoFinCuentaRegresivaId() : null;
        Long estadoInicioCuentaRegresivaId =
                estadosPorPunto != null ? estadosPorPunto.getEstadoRastreoInicioCuentaRegresivaId() : null;
        Long estadoActualId = p.getEstadoRastreo() != null ? p.getEstadoRastreo().getId() : null;
        if (estadoFinalCuentaRegresivaId != null && Objects.equals(estadoFinalCuentaRegresivaId, estadoActualId)) {
            return null;
        }
        Integer diasMaxRetiro = chooseDiasMaxRetiroPorEntidad(p);
        LocalDateTime fechaAncla = resolverFechaAnclaCuentaRegresiva(p, estadoInicioCuentaRegresivaId, estadoActualId);
        if (diasMaxRetiro == null || fechaAncla == null) {
            return null;
        }
        LocalDate desde = fechaAncla.atZone(ZONA_ECUADOR).toLocalDate();
        return desde.plusDays(diasMaxRetiro + 1L).atStartOfDay();
    }

    /** Recalcula y asigna {@code fechaLimiteRetiro} en el paquete (sin persistir). */
    private void recomputarFechaLimiteRetiro(Paquete p) {
        p.setFechaLimiteRetiro(computeFechaLimiteRetiro(p));
    }

    /**
     * Recalcula la fecha límite de retiro de un conjunto de paquetes y la
     * persiste. Pensado para backfill inicial y para los flujos que cambian los
     * insumos del plazo sin pasar por una transición de estado (p. ej. edición de
     * un despacho que altera el courier/agencia y por tanto los días máximos).
     *
     * @return cantidad de paquetes cuyo plazo cambió.
     */
    @Transactional
    public int recomputarFechaLimiteRetiroBatch(java.util.Collection<Long> paqueteIds) {
        if (paqueteIds == null || paqueteIds.isEmpty()) return 0;
        List<Paquete> paquetes = paqueteRepository.findAllById(paqueteIds);
        int cambiados = 0;
        for (Paquete p : paquetes) {
            LocalDateTime previo = p.getFechaLimiteRetiro();
            LocalDateTime nuevo = computeFechaLimiteRetiro(p);
            if (!Objects.equals(previo, nuevo)) {
                p.setFechaLimiteRetiro(nuevo);
                cambiados++;
            }
        }
        if (cambiados > 0) {
            paqueteRepository.saveAll(paquetes);
        }
        return cambiados;
    }

    /**
     * Devuelve el instante desde el cual debe contarse la cuenta regresiva.
     *
     * <ul>
     *   <li>Si NO hay estado de inicio configurado: usa {@code fechaEstadoActualDesde}
     *       (comportamiento histórico, se reinicia con cada cambio de estado).</li>
     *   <li>Si HAY estado de inicio configurado y el paquete está actualmente en ese
     *       estado: usa {@code fechaEstadoActualDesde}.</li>
     *   <li>Si HAY estado de inicio configurado: busca en el log de eventos la primera
     *       transición HACIA ese estado y usa su {@code occurredAt}. Si nunca pasó por
     *       ese estado, retorna {@code null} (no hay cuenta regresiva todavía).</li>
     * </ul>
     */
    private LocalDateTime resolverFechaAnclaCuentaRegresiva(Paquete p,
                                                            Long estadoInicioCuentaRegresivaId,
                                                            Long estadoActualId) {
        if (estadoInicioCuentaRegresivaId == null) {
            return p.getFechaEstadoActualDesde();
        }
        if (Objects.equals(estadoInicioCuentaRegresivaId, estadoActualId)) {
            return p.getFechaEstadoActualDesde();
        }
        if (p.getId() == null) {
            return null;
        }
        return paqueteEstadoEventoRepository
                .findTopByPaqueteIdAndEstadoDestino_IdOrderByOccurredAtAscIdAsc(
                        p.getId(), estadoInicioCuentaRegresivaId)
                .map(PaqueteEstadoEvento::getOccurredAt)
                .orElse(null);
    }

    private TrackingDespachoDTO buildDespachoCard(Paquete p) {
        Saca saca = p.getSaca();
        if (saca == null || saca.getDespacho() == null) return null;
        Despacho d = saca.getDespacho();
        List<Saca> sacas = d.getSacas() != null ? d.getSacas() : List.of();
        int totalPaquetes = 0;
        BigDecimal pesoTotalLbs = BigDecimal.ZERO;
        for (Saca item : sacas) {
            List<Paquete> paquetes = item.getPaquetes() != null ? item.getPaquetes() : List.of();
            totalPaquetes += paquetes.size();
            for (Paquete paquete : paquetes) {
                if (paquete.getPesoLbs() != null) {
                    pesoTotalLbs = pesoTotalLbs.add(paquete.getPesoLbs());
                }
            }
        }
        return TrackingDespachoDTO.builder()
                .id(d.getId())
                .numeroGuia(d.getNumeroGuia())
                .codigoPrecinto(d.getCodigoPrecinto())
                .tipoEntrega(d.getTipoEntrega() != null ? d.getTipoEntrega().name() : null)
                .totalSacas(sacas.size())
                .totalPaquetes(totalPaquetes)
                .pesoTotalLbs(pesoTotalLbs)
                .pesoTotalKg(WeightUtil.lbsToKg(pesoTotalLbs))
                .build();
    }

    private TrackingSacaDTO buildSacaActualCard(Paquete p) {
        Saca saca = p.getSaca();
        if (saca == null) return null;
        return TrackingSacaDTO.builder()
                .id(saca.getId())
                .numeroOrden(saca.getNumeroOrden())
                .tamanio(saca.getTamanio() != null ? saca.getTamanio().name() : null)
                .pesoKg(WeightUtil.lbsToKg(saca.getPesoLbs()))
                .pesoLbs(saca.getPesoLbs())
                .build();
    }

    private List<TrackingPaqueteDespachoDTO> buildPaquetesDespachoCard(Paquete p) {
        Saca saca = p.getSaca();
        if (saca == null || saca.getDespacho() == null) return List.of();
        Despacho d = saca.getDespacho();
        List<Saca> sacas = d.getSacas() != null ? d.getSacas() : List.of();
        List<TrackingPaqueteDespachoDTO> result = new ArrayList<>();
        for (Saca item : sacas) {
            List<Paquete> paquetes = item.getPaquetes() != null ? item.getPaquetes() : List.of();
            for (Paquete paquete : paquetes) {
                result.add(TrackingPaqueteDespachoDTO.builder()
                        .id(paquete.getId())
                        .numeroGuia(paquete.getNumeroGuia())
                        .estadoRastreoNombre(paquete.getEstadoRastreo() != null ? paquete.getEstadoRastreo().getNombre() : null)
                        .sacaNumeroOrden(item.getNumeroOrden())
                        .pesoKg(WeightUtil.lbsToKg(paquete.getPesoLbs()))
                        .pesoLbs(paquete.getPesoLbs())
                        .build());
            }
        }
        return result;
    }

    private TrackingConsignatarioDTO buildConsignatarioCard(Paquete p) {
        Consignatario dest = p.getConsignatario();
        if (dest == null) return null;
        // PII (telefono, direccion) se omite intencionalmente por ser endpoint publico.
        return TrackingConsignatarioDTO.builder()
                .id(dest.getId())
                .nombre(dest.getNombre())
                .provincia(dest.getProvincia())
                .canton(dest.getCanton())
                .build();
    }

    private TrackingOperadorEntregaDTO buildOperadorEntregaCard(Paquete p) {
        Saca saca = p.getSaca();
        if (saca == null || saca.getDespacho() == null) return null;
        Despacho d = saca.getDespacho();
        TrackingOperadorEntregaDTO.TrackingOperadorEntregaDTOBuilder builder = TrackingOperadorEntregaDTO.builder()
                .tipoEntrega(d.getTipoEntrega() != null ? d.getTipoEntrega().name() : null);
        if (d.getCourierEntrega() != null) {
            builder
                    .courierEntregaNombre(d.getCourierEntrega().getNombre())
                    .courierEntregaCodigo(d.getCourierEntrega().getCodigo())
                    .horarioRepartoCourierEntrega(d.getCourierEntrega().getHorarioReparto())
                    .paginaTrackingCourierEntrega(d.getCourierEntrega().getPaginaTracking())
                    .diasMaxRetiroDomicilio(d.getCourierEntrega().getDiasMaxRetiroDomicilio());
        }
        if (d.getAgencia() != null) {
            builder
                    .agenciaNombre(d.getAgencia().getNombre())
                    .agenciaCodigo(d.getAgencia().getCodigo())
                    .agenciaDireccion(d.getAgencia().getDireccion())
                    .agenciaProvincia(d.getAgencia().getProvincia())
                    .agenciaCanton(d.getAgencia().getCanton())
                    .agenciaEncargado(d.getAgencia().getEncargado())
                    .horarioAtencionAgencia(d.getAgencia().getHorarioAtencion())
                    .diasMaxRetiroAgencia(d.getAgencia().getDiasMaxRetiro());
        }
        if (d.getAgenciaCourierEntrega() != null) {
            builder
                    .agenciaCourierEntregaEtiqueta(AgenciaCourierEntregaService.etiquetaDe(d.getAgenciaCourierEntrega()))
                    .agenciaCourierEntregaCodigo(d.getAgenciaCourierEntrega().getCodigo())
                    .agenciaCourierEntregaDireccion(d.getAgenciaCourierEntrega().getDireccion())
                    .agenciaCourierEntregaProvincia(d.getAgenciaCourierEntrega().getProvincia())
                    .agenciaCourierEntregaCanton(d.getAgenciaCourierEntrega().getCanton())
                    .horarioAtencionAgenciaCourierEntrega(d.getAgenciaCourierEntrega().getHorarioAtencion())
                    .diasMaxRetiroAgenciaCourierEntrega(d.getAgenciaCourierEntrega().getDiasMaxRetiro());
        }
        return builder.build();
    }

    @Transactional
    public PaqueteDTO cambiarEstadoRastreo(Long paqueteId, Long estadoRastreoId, String motivoAlterno) {
        validarEstadoNoReservadoParaPuntosOperativos(estadoRastreoId);
        Paquete p = paqueteRepository.findById(paqueteId)
                .orElseThrow(() -> new ResourceNotFoundException("Paquete", paqueteId));
        EstadoRastreo estado = estadoRastreoService.findEntityById(estadoRastreoId);
        EstadoRastreo origen = p.getEstadoRastreo();
        validarEsSiguienteInmediato(origen, estado);
        aplicarEstadoConReglas(p, estado, motivoAlterno);
        p = paqueteRepository.save(p);
        trackingEventService.registrarTransicion(
                p,
                origen,
                estado,
                TrackingEventType.ESTADO_CAMBIO_MANUAL,
                "OPERARIO_MANUAL",
                p.getMotivoAlterno(),
                null,
                buildIdempotencyKey("manual", p.getId(), origen != null ? origen.getId() : null, estado.getId())
        );
        if (p.getGuiaMaster() != null) {
            guiaMasterService.recomputarEstado(p.getGuiaMaster().getId());
        }
        return toDTO(p);
    }

    @Transactional
    public CambiarEstadoRastreoBulkResponse cambiarEstadoRastreoBulk(List<Long> paqueteIds, Long estadoRastreoId) {
        validarEstadoNoReservadoParaPuntosOperativos(estadoRastreoId);
        EstadoRastreo estado = estadoRastreoService.findEntityById(estadoRastreoId);
        if (Boolean.FALSE.equals(estado.getActivo())) {
            throw new BadRequestException(
                    "No se puede aplicar el estado '" + estado.getNombre() + "' porque no está activo en el catálogo. "
                            + "Regla: solo se pueden aplicar estados de rastreo activos. "
                            + "Activa el estado en la configuración o elige otro.");
        }
        List<CambiarEstadoRastreoBulkResponse.RechazoBulk> rechazados = new ArrayList<>();
        Set<Long> guiasAfectadas = new HashSet<>();
        int actualizados = 0;
        List<Paquete> cargados = paqueteRepository.findAllById(paqueteIds);
        Map<Long, Paquete> porId = new LinkedHashMap<>();
        for (Paquete p : cargados) porId.put(p.getId(), p);
        List<Paquete> paraGuardar = new ArrayList<>();
        for (Long paqueteId : paqueteIds) {
            Paquete p = porId.get(paqueteId);
            if (p == null) {
                rechazados.add(new CambiarEstadoRastreoBulkResponse.RechazoBulk(paqueteId, "Paquete no encontrado"));
                continue;
            }
            if (p.getSaca() != null) {
                rechazados.add(new CambiarEstadoRastreoBulkResponse.RechazoBulk(paqueteId,
                        "El paquete ya está en una saca o despacho; su estado se gestiona desde el despacho"));
                continue;
            }
            String trackingBase = p.getGuiaMaster() != null ? Strings.trimOrNull(p.getGuiaMaster().getTrackingBase()) : null;
            if (trackingBase != null && loteRecepcionGuiaRepository.existsByNumeroGuiaEnvio(trackingBase)) {
                rechazados.add(new CambiarEstadoRastreoBulkResponse.RechazoBulk(paqueteId,
                        "La guía del paquete está en un lote de recepción; su estado se gestiona desde la recepción"));
                continue;
            }
            EstadoRastreo origenActual = p.getEstadoRastreo();
            if (origenActual != null && !origenActual.getId().equals(estado.getId())) {
                if (!Boolean.TRUE.equals(origenActual.getActivo())) {
                    rechazados.add(new CambiarEstadoRastreoBulkResponse.RechazoBulk(
                            paqueteId, "El estado actual del paquete no está activo en la configuración"));
                    continue;
                }
                Optional<EstadoRastreo> siguiente = estadoRastreoService.findSiguienteEstadoInmediato(origenActual);
                if (siguiente.isEmpty()) {
                    rechazados.add(new CambiarEstadoRastreoBulkResponse.RechazoBulk(
                            paqueteId, "El paquete ya está en el último estado del flujo configurado"));
                    continue;
                }
                if (!siguiente.get().getId().equals(estado.getId())) {
                    String motivo = esRetroceso(origenActual, estado)
                            ? "No se puede retroceder el estado de rastreo"
                            : "Solo se permite avanzar al siguiente estado inmediato: '" + siguiente.get().getNombre() + "'";
                    rechazados.add(new CambiarEstadoRastreoBulkResponse.RechazoBulk(paqueteId, motivo));
                    continue;
                }
            }
            try {
                EstadoRastreo origen = p.getEstadoRastreo();
                aplicarEstadoConReglas(p, estado, p.getMotivoAlterno());
                trackingEventService.registrarTransicion(
                        p,
                        origen,
                        estado,
                        TrackingEventType.ESTADO_CAMBIO_BULK,
                        "OPERARIO_BULK",
                        p.getMotivoAlterno(),
                        null,
                        buildIdempotencyKey("bulk", p.getId(), origen != null ? origen.getId() : null, estado.getId())
                );
            } catch (BadRequestException ex) {
                rechazados.add(new CambiarEstadoRastreoBulkResponse.RechazoBulk(paqueteId, ex.getMessage()));
                continue;
            }
            paraGuardar.add(p);
            if (p.getGuiaMaster() != null) {
                guiasAfectadas.add(p.getGuiaMaster().getId());
            }
            actualizados++;
        }
        if (!paraGuardar.isEmpty()) {
            paqueteRepository.saveAll(paraGuardar);
        }
        for (Long gmId : guiasAfectadas) {
            guiaMasterService.recomputarEstado(gmId);
        }
        return CambiarEstadoRastreoBulkResponse.builder()
                .actualizados(actualizados)
                .rechazados(rechazados)
                .build();
    }

    /** Aplica el mismo estado de rastreo a una lista de paquetes (sin validar elegibilidad). Usado desde DespachoService para aplicar estado por periodo. */
    @Transactional
    public void aplicarEstadoRastreoMasivo(List<Long> paqueteIds, Long estadoRastreoId) {
        aplicarEstadoEnConjunto(paqueteIds, estadoRastreoId,
                TrackingEventType.ESTADO_APLICADO_PERIODO, "PERIODO_AUTO", "periodo");
    }

    /** Aplica el estado de "entrega confirmada" a las piezas que el cliente confirmó como recibidas. */
    @Transactional
    public void aplicarEstadoEntregaConfirmadaCliente(List<Long> paqueteIds, Long estadoRastreoId) {
        aplicarEstadoEnConjunto(paqueteIds, estadoRastreoId,
                TrackingEventType.ESTADO_CONFIRMADO_CLIENTE, "CLIENTE_CONFIRMA", "entrega-cliente");
    }

    @Transactional
    public PaqueteDTO asignarAGuiaMaster(Long paqueteId, Long guiaMasterId, Integer piezaNumero) {
        Paquete p = paqueteRepository.findById(paqueteId)
                .orElseThrow(() -> new ResourceNotFoundException("Paquete", paqueteId));
        if (guiaMasterId == null) {
            throw new BadRequestException(
                    "No se puede asignar la pieza porque no se indicó la guía master. "
                            + "Selecciona una guía master para continuar.");
        }
        Long previaId = p.getGuiaMaster() != null ? p.getGuiaMaster().getId() : null;
        if (previaId != null && previaId.equals(guiaMasterId) && piezaNumero != null
                && piezaNumero.equals(p.getPiezaNumero())) {
            return toDTO(p);
        }
        reasignarPiezaAGuiaMaster(p, guiaMasterId, piezaNumero);
        aplicarEstadoAsociarGuiaMasterSiCorresponde(p);
        p = paqueteRepository.save(p);
        if (previaId != null && !previaId.equals(guiaMasterId)) {
            guiaMasterService.recomputarEstado(previaId);
        }
        guiaMasterService.recomputarEstado(guiaMasterId);
        return toDTO(p);
    }

    @Transactional
    public List<PaqueteDTO> asignarGuiaMasterBulk(Long guiaMasterId, List<Long> paqueteIds) {
        if (guiaMasterId == null) {
            throw new BadRequestException(
                    "No se pueden asignar las piezas porque no se indicó la guía master. "
                            + "Selecciona una guía master para continuar.");
        }
        List<PaqueteDTO> result = new ArrayList<>();
        Set<Long> guiasAfectadas = new HashSet<>();
        guiasAfectadas.add(guiaMasterId);
        for (Long paqueteId : paqueteIds) {
            Paquete p = paqueteRepository.findById(paqueteId)
                    .orElseThrow(() -> new ResourceNotFoundException("Paquete", paqueteId));
            Long previaId = p.getGuiaMaster() != null ? p.getGuiaMaster().getId() : null;
            if (previaId != null) guiasAfectadas.add(previaId);
            reasignarPiezaAGuiaMaster(p, guiaMasterId, null);
            aplicarEstadoAsociarGuiaMasterSiCorresponde(p);
            p = paqueteRepository.save(p);
            result.add(toDTO(p));
        }
        for (Long gmId : guiasAfectadas) {
            guiaMasterService.recomputarEstado(gmId);
        }
        return result;
    }

    /**
     * Si está configurado un estado para "Asociar guía master (consolidado)" y es distinto al estado
     * actual del paquete, lo aplica y registra la transición en tracking. Idempotente: no actúa si
     * el paquete ya está en ese estado.
     */
    private void aplicarEstadoAsociarGuiaMasterSiCorresponde(Paquete p) {
        Long estadoId = parametroSistemaService.getEstadosRastreoPorPunto().getEstadoRastreoAsociarGuiaMasterId();
        if (estadoId == null) return;
        EstadoRastreo origen = p.getEstadoRastreo();
        if (origen != null && estadoId.equals(origen.getId())) return;
        EstadoRastreo destino = estadoRastreoService.findEntityById(estadoId);
        aplicarEstadoConReglas(p, destino, null);
        trackingEventService.registrarTransicion(
                p,
                origen,
                destino,
                TrackingEventType.ESTADO_APLICADO_ASOCIAR_GUIA_MASTER,
                "ASOCIAR_GUIA_MASTER",
                p.getMotivoAlterno(),
                null,
                buildIdempotencyKey("asociar-gm", p.getId(), origen != null ? origen.getId() : null, destino.getId())
        );
    }

    @Transactional(readOnly = true)
    public List<EstadoRastreoDTO> estadosDestinoPermitidos(List<Long> paqueteIds) {
        if (paqueteIds == null || paqueteIds.isEmpty()) {
            return List.of();
        }
        List<Paquete> paquetes = paqueteIds.stream()
                .map(id -> paqueteRepository.findById(id).orElse(null))
                .filter(p -> p != null && p.getEstadoRastreo() != null)
                .toList();
        if (paquetes.isEmpty()) {
            return List.of();
        }
        Set<Long> excluirPorPunto = parametroSistemaService.getIdsEstadosRastreoGestionadosAutomaticamente();
        Set<Long> interseccion = null;
        for (Paquete paquete : paquetes) {
            Optional<EstadoRastreo> siguiente = estadoRastreoService.findSiguienteEstadoInmediato(paquete.getEstadoRastreo());
            Set<Long> siguienteSet = siguiente
                    .filter(e -> !excluirPorPunto.contains(e.getId()))
                    .map(e -> Set.of(e.getId()))
                    .orElse(Set.of());
            if (interseccion == null) {
                interseccion = new HashSet<>(siguienteSet);
            } else {
                interseccion.retainAll(siguienteSet);
            }
            if (interseccion.isEmpty()) break;
        }
        if (interseccion == null || interseccion.isEmpty()) {
            return List.of();
        }
        final Set<Long> ids = Set.copyOf(interseccion);
        return estadoRastreoService.findActivos().stream()
                .filter(e -> ids.contains(e.getId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EstadoRastreoDTO> getEstadosAplicablesPaquete() {
        Set<Long> reservados = parametroSistemaService.getIdsEstadosRastreoGestionadosAutomaticamente();
        return estadoRastreoService.findActivos().stream()
                .filter(e -> !reservados.contains(e.getId()))
                .toList();
    }

    @Transactional
    public CambiarEstadoRastreoBulkResponse aplicarEstadoPorPeriodoPaquetes(
            LocalDate fechaInicio, LocalDate fechaFin, Long estadoRastreoId) {
        List<Long> ids = paqueteRepository.findIdsByCreatedAtBetween(fechaInicio, fechaFin);
        if (ids.isEmpty()) {
            return CambiarEstadoRastreoBulkResponse.builder()
                    .actualizados(0)
                    .rechazados(List.of())
                    .build();
        }
        return cambiarEstadoRastreoBulk(ids, estadoRastreoId);
    }

    private void validarEstadoNoReservadoParaPuntosOperativos(Long estadoRastreoId) {
        parametroSistemaService.validarEstadoRastreoAplicableManualmente(estadoRastreoId);
    }

    /**
     * Valida que {@code estadoDestino} sea exactamente el siguiente inmediato en el orden del flujo
     * respecto a {@code estadoActual}. Lanza {@link BadRequestException} si se intenta un salto,
     * retroceso, o si el paquete ya está en el último estado configurado.
     * Solo se llama desde cambios manuales (individual y masivo); las aplicaciones automáticas del
     * sistema no pasan por esta validación.
     */
    private void validarEsSiguienteInmediato(EstadoRastreo estadoActual, EstadoRastreo estadoDestino) {
        if (estadoActual == null) return;
        if (estadoActual.getId().equals(estadoDestino.getId())) return;
        if (estadoActual.getOrden() == null) return;
        if (!Boolean.TRUE.equals(estadoActual.getActivo())) {
            throw new BadRequestException(
                    "No se puede cambiar el estado porque el estado actual del paquete ('" + estadoActual.getNombre()
                            + "') no está activo en la configuración. "
                            + "Activa ese estado en el catálogo o corrige el flujo desde la gestión de estados.");
        }
        Optional<EstadoRastreo> siguiente = estadoRastreoService.findSiguienteEstadoInmediato(estadoActual);
        if (siguiente.isEmpty()) {
            throw new BadRequestException(
                    "No se puede avanzar el estado porque el paquete ya está en el último estado del flujo configurado. "
                            + "Estado actual: '" + estadoActual.getNombre() + "'.");
        }
        if (!siguiente.get().getId().equals(estadoDestino.getId())) {
            Integer ordenDestino = estadoDestino.getOrden();
            Integer ordenActual = estadoActual.getOrden();
            if (ordenDestino != null && ordenActual != null && ordenDestino < ordenActual) {
                throw new BadRequestException(
                        "No se puede aplicar el estado '" + estadoDestino.getNombre()
                                + "' porque implicaría retroceder en el flujo. Estado actual: '"
                                + estadoActual.getNombre() + "'. Regla: el estado de rastreo solo puede avanzar.");
            }
            throw new BadRequestException(
                    "No se puede aplicar el estado '" + estadoDestino.getNombre()
                            + "' porque el flujo avanza de uno en uno. Estado actual: '" + estadoActual.getNombre()
                            + "'. Solo se permite avanzar al siguiente estado inmediato: '"
                            + siguiente.get().getNombre() + "'.");
        }
    }

    private String renderLeyenda(String leyenda, Integer diasTranscurridos) {
        if (leyenda == null) return null;
        if (diasTranscurridos == null) return leyenda;
        return leyenda.replace("{dias}", String.valueOf(diasTranscurridos));
    }

    private String buildIdempotencyKey(String operation, Long paqueteId, Long origenId, Long destinoId) {
        return operation + ":" + paqueteId + ":" + (origenId != null ? origenId : "null") + ":" + (destinoId != null ? destinoId : "null") + ":" + System.nanoTime();
    }

    private void aplicarEstadoConReglas(Paquete paquete, EstadoRastreo estadoDestino, String motivoAlterno) {
        aplicarEstadoConReglas(paquete, estadoDestino, motivoAlterno, LocalDateTime.now(ZONA_ECUADOR));
    }

    private void aplicarEstadoConReglas(Paquete paquete, EstadoRastreo estadoDestino, String motivoAlterno,
                                       LocalDateTime fechaEstadoDesde) {
        EstadoRastreo estadoOrigen = paquete.getEstadoRastreo();
        if (estadoOrigen != null) {
            validarTransicion(estadoOrigen, estadoDestino);
        }
        paquete.setEstadoRastreo(estadoDestino);
        paquete.setFechaEstadoActualDesde(fechaEstadoDesde);

        if (estadoDestino.getTipoFlujo() == TipoFlujoEstado.ALTERNO) {
            paquete.setEnFlujoAlterno(true);
            paquete.setMotivoAlterno(Strings.trimOrNull(motivoAlterno));
        } else {
            paquete.setEnFlujoAlterno(false);
            paquete.setMotivoAlterno(null);
        }
        paquete.setBloqueado(false);
        paquete.setFechaBloqueoDesde(null);
        // El cambio de estado altera los insumos del plazo de retiro (estado
        // actual, fecha del estado y, al llegar al fin de cuenta regresiva,
        // anula el vencimiento). Recalculamos la fecha límite persistida.
        recomputarFechaLimiteRetiro(paquete);
    }

    private void validarTransicion(EstadoRastreo origen, EstadoRastreo destino) {
        if (origen.getId().equals(destino.getId())) {
            return;
        }
        if (!Boolean.TRUE.equals(destino.getActivo())) {
            throw new BadRequestException(
                    "No se puede aplicar el estado '" + destino.getNombre() + "' porque no está activo en el catálogo. "
                            + "Regla: solo se pueden aplicar estados de rastreo activos. "
                            + "Activa el estado en la configuración o elige otro.");
        }
    }

    /** Orden efectivo del estado en el flujo: usa {@code orden} y cae a {@code ordenTracking}. */
    public static Integer ordenEfectivo(EstadoRastreo estado) {
        if (estado == null) return null;
        return estado.getOrden() != null ? estado.getOrden() : estado.getOrdenTracking();
    }

    /**
     * Indica si aplicar {@code destino} a un paquete en {@code origen} sería un retroceso en el flujo
     * (el orden del destino es estrictamente menor al del origen). Los estados no están quemados;
     * el orden proviene del catálogo configurado en producción.
     */
    public static boolean esRetroceso(EstadoRastreo origen, EstadoRastreo destino) {
        if (origen == null || destino == null) return false;
        if (origen.getId().equals(destino.getId())) return false;
        Integer ordenOrigen = ordenEfectivo(origen);
        Integer ordenDestino = ordenEfectivo(destino);
        return ordenOrigen != null && ordenDestino != null && ordenDestino < ordenOrigen;
    }

    /** Convierte entidad a DTO (público para uso desde SacaService al construir sacas con paquetes completos). */
    public PaqueteDTO toDTO(Paquete p) {
        EstadoRastreo er = p.getEstadoRastreo();
        PlazoRetiroInfo plazoRetiroInfo = calcularPlazoRetiro(p);
        GuiaMaster gm = p.getGuiaMaster();
        EnvioConsolidado ec = p.getEnvioConsolidado();
        EstadoEnvioConsolidadoOperativo estadoOperativoConsolidado = null;
        if (ec != null) {
            long totalEnConsolidado = paqueteRepository.countByEnvioConsolidadoId(ec.getId());
            estadoOperativoConsolidado = estadoConsolidadoOperativoResolver.resolve(ec, totalEnConsolidado);
        }
        return PaqueteDTO.builder()
                .id(p.getId())
                .numeroGuia(p.getNumeroGuia())
                .guiaMasterId(gm != null ? gm.getId() : null)
                .guiaMasterTrackingBase(gm != null ? gm.getTrackingBase() : null)
                .guiaMasterEstadoGlobal(gm != null && gm.getEstadoGlobal() != null ? gm.getEstadoGlobal().name() : null)
                .guiaMasterTotalPiezas(gm != null ? gm.getTotalPiezasEsperadas() : null)
                .piezaNumero(p.getPiezaNumero())
                .piezaTotal(p.getPiezaTotal())
                .envioConsolidadoId(ec != null ? ec.getId() : null)
                .envioConsolidadoCodigo(ec != null ? ec.getCodigo() : null)
                .envioConsolidadoCerrado(ec != null && ec.isCerrado())
                .envioConsolidadoEstadoOperativo(estadoOperativoConsolidado)
                .ref(p.getRef())
                .pesoLbs(p.getPesoLbs())
                .pesoKg(WeightUtil.lbsToKg(p.getPesoLbs()))
                .contenido(p.getContenido())
                .estadoRastreoId(er != null ? er.getId() : null)
                .estadoRastreoNombre(er != null ? er.getNombre() : null)
                .estadoRastreoCodigo(er != null ? er.getCodigo() : null)
                .estadoRastreoTipoFlujo(er != null && er.getTipoFlujo() != null ? er.getTipoFlujo().name() : null)
                .estadoRastreoOrden(er != null ? (er.getOrden() != null ? er.getOrden() : er.getOrdenTracking()) : null)
                .consignatarioId(p.getConsignatario() != null ? p.getConsignatario().getId() : null)
                .consignatarioNombre(p.getConsignatario() != null ? p.getConsignatario().getNombre() : null)
                .consignatarioDireccion(p.getConsignatario() != null ? p.getConsignatario().getDireccion() : null)
                .consignatarioProvincia(p.getConsignatario() != null ? p.getConsignatario().getProvincia() : null)
                .consignatarioCanton(p.getConsignatario() != null ? p.getConsignatario().getCanton() : null)
                .consignatarioTelefono(p.getConsignatario() != null ? p.getConsignatario().getTelefono() : null)
                .sacaId(p.getSaca() != null ? p.getSaca().getId() : null)
                .despachoId(p.getSaca() != null && p.getSaca().getDespacho() != null ? p.getSaca().getDespacho().getId() : null)
                .despachoNumeroGuia(p.getSaca() != null && p.getSaca().getDespacho() != null ? p.getSaca().getDespacho().getNumeroGuia() : null)
                .fechaEstadoDesde(p.getFechaEstadoActualDesde())
                .diasMaxRetiro(plazoRetiroInfo.diasMaxRetiro())
                .diasTranscurridos(plazoRetiroInfo.diasTranscurridos())
                .diasRestantes(plazoRetiroInfo.diasRestantes())
                .diasAtrasoRetiro(plazoRetiroInfo.diasAtrasoRetiro())
                .paqueteVencido(plazoRetiroInfo.paqueteVencido())
                .enFlujoAlterno(p.getEnFlujoAlterno())
                .motivoAlterno(p.getMotivoAlterno())
                .bloqueado(p.getBloqueado())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
