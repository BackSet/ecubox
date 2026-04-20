package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.CambiarEstadoRastreoBulkResponse;
import com.ecubox.ecubox_backend.dto.EstadoRastreoDTO;
import com.ecubox.ecubox_backend.dto.PaqueteCreateRequest;
import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.dto.PaquetePesoItem;
import com.ecubox.ecubox_backend.dto.PaqueteUpdateRequest;
import com.ecubox.ecubox_backend.dto.TrackingDespachoDTO;
import com.ecubox.ecubox_backend.dto.TrackingDestinatarioDTO;
import com.ecubox.ecubox_backend.dto.TrackingEstadoItemDTO;
import com.ecubox.ecubox_backend.dto.TrackingMasterResponse;
import com.ecubox.ecubox_backend.dto.TrackingOperadorEntregaDTO;
import com.ecubox.ecubox_backend.dto.TrackingPaqueteDespachoDTO;
import com.ecubox.ecubox_backend.dto.TrackingResponse;
import com.ecubox.ecubox_backend.dto.TrackingSacaDTO;
import com.ecubox.ecubox_backend.entity.DestinatarioFinal;
import com.ecubox.ecubox_backend.entity.Despacho;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.GuiaMaster;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.PaqueteEstadoEvento;
import com.ecubox.ecubox_backend.entity.Saca;
import com.ecubox.ecubox_backend.enums.TrackingEventType;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ConflictException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.DestinatarioFinalRepository;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
    private final DestinatarioFinalRepository destinatarioFinalRepository;
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
    private final boolean useEventTimeline;

    public PaqueteService(PaqueteRepository paqueteRepository,
                          DestinatarioFinalRepository destinatarioFinalRepository,
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
                          @Value("${tracking.timeline.use-events:true}") boolean useEventTimeline) {
        this.paqueteRepository = paqueteRepository;
        this.destinatarioFinalRepository = destinatarioFinalRepository;
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
        this.useEventTimeline = useEventTimeline;
    }

    @Transactional(readOnly = true)
    public List<PaqueteDTO> findAllByUsuarioId(Long usuarioId) {
        return paqueteRepository.findByDestinatarioFinalUsuarioIdOrderByEstadoRastreo_OrdenAscIdAsc(usuarioId).stream()
                .map(this::toDTO)
                .toList();
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
            Long destinatarioFinalId,
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
     * {@code envioConsolidado.codigo}, {@code destinatarioFinal.nombre},
     * {@code destinatarioFinal.codigo}.</p>
     */
    @Transactional(readOnly = true)
    public Page<PaqueteDTO> findAllPaginated(String q, PaqueteListFilters filters, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(200, size)),
                Sort.by(Sort.Direction.ASC, "estadoRastreo.orden").and(Sort.by(Sort.Direction.ASC, "id")));
        Specification<Paquete> spec = buildSpec(q, filters);
        return paqueteRepository.findAll(spec, pageable).map(this::toDTO);
    }

    /** Variante paginada filtrada por usuario (rol cliente). */
    @Transactional(readOnly = true)
    public Page<PaqueteDTO> findAllByUsuarioIdPaginated(Long usuarioId, String q,
                                                       PaqueteListFilters filters, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(200, size)),
                Sort.by(Sort.Direction.ASC, "estadoRastreo.orden").and(Sort.by(Sort.Direction.ASC, "id")));
        Specification<Paquete> ownership = (root, query, cb) ->
                cb.equal(root.get("destinatarioFinal").get("usuario").get("id"), usuarioId);
        Specification<Paquete> textAndFilters = buildSpec(q, filters);
        return paqueteRepository.findAll(ownership.and(textAndFilters), pageable).map(this::toDTO);
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
                SearchSpecifications.path("destinatarioFinal", "nombre"),
                SearchSpecifications.path("destinatarioFinal", "codigo"));
        if (f.estadoCodigo() != null && !f.estadoCodigo().isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("estadoRastreo").get("codigo"), f.estadoCodigo()));
        }
        if (f.destinatarioFinalId() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("destinatarioFinal").get("id"), f.destinatarioFinalId()));
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
                // El chip "vencidos" no se aplica server-side: la lógica de
                // vencimiento es compleja (depende de tipo de entidad y estados
                // de inicio de cuenta regresiva). El frontend filtra ese chip
                // sobre el dataset completo cuando aplica.
                default -> spec;
            };
        }
        return spec;
    }

    @Transactional
    public PaqueteDTO create(Long usuarioId, boolean canManageAny, boolean contenidoObligatorio, PaqueteCreateRequest request) {
        if (contenidoObligatorio && (request.getContenido() == null || request.getContenido().isBlank())) {
            throw new BadRequestException("El contenido es obligatorio");
        }
        DestinatarioFinal dest = destinatarioFinalRepository.findById(request.getDestinatarioFinalId())
                .orElseThrow(() -> new ResourceNotFoundException("Destinatario", request.getDestinatarioFinalId()));
        ownershipValidator.requireDestinatarioOwnership(dest, usuarioId, canManageAny);
        String codigoBase = (dest.getCodigo() != null && !dest.getCodigo().isBlank())
                ? dest.getCodigo().trim()
                : ("D" + dest.getId());
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
            throw new ConflictException("No se pudo generar un número de guía único; verifique la guía master y la pieza");
        }
        Paquete p = Paquete.builder()
                .numeroGuia(numeroGuiaCompuesto)
                .guiaMaster(asignacion.guiaMaster())
                .piezaNumero(asignacion.piezaNumero())
                .piezaTotal(asignacion.piezaTotal())
                .ref(ref)
                .destinatarioFinal(dest)
                .contenido(request.getContenido())
                .pesoLbs(pesoLbs)
                .estadoRastreo(estadoInicial)
                .fechaEstadoActualDesde(LocalDateTime.now())
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
    public String sugerirRef(Long destinatarioFinalId, Long excludePaqueteId) {
        DestinatarioFinal dest = destinatarioFinalRepository.findById(destinatarioFinalId)
                .orElseThrow(() -> new ResourceNotFoundException("Destinatario", destinatarioFinalId));
        String codigoBase = (dest.getCodigo() != null && !dest.getCodigo().isBlank())
                ? dest.getCodigo().trim()
                : ("D" + dest.getId());
        if (excludePaqueteId != null) {
            var existing = paqueteRepository.findById(excludePaqueteId);
            if (existing.isPresent() && existing.get().getDestinatarioFinal() != null
                    && Objects.equals(existing.get().getDestinatarioFinal().getId(), destinatarioFinalId)
                    && existing.get().getRef() != null) {
                return existing.get().getRef();
            }
        }
        long n = codigoSecuenciaService.peek(
                CodigoSecuenciaService.ENTITY_PAQUETE_REF,
                String.valueOf(destinatarioFinalId),
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
        aplicarEstadoEnConjunto(paqueteIds, estadoId,
                TrackingEventType.ESTADO_APLICADO_DESPACHO, "DESPACHO_AUTO", "despacho");
    }

    /** Aplica el estado configurado "en lote recepción" a los paquetes indicados. Usado desde LoteRecepcionService. */
    @Transactional
    public void aplicarEstadoEnLoteRecepcion(List<Long> paqueteIds) {
        Long estadoId = parametroSistemaService.getEstadosRastreoPorPunto().getEstadoRastreoEnLoteRecepcionId();
        if (estadoId == null) return;
        aplicarEstadoEnConjunto(paqueteIds, estadoId,
                TrackingEventType.ESTADO_APLICADO_LOTE_RECEPCION, "LOTE_RECEPCION_AUTO", "lote-recepcion");
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
        if (paqueteIds == null || paqueteIds.isEmpty()) return;
        EstadoRastreo estado = estadoRastreoService.findEntityById(estadoDestinoId);
        List<Paquete> paquetes = paqueteRepository.findAllById(paqueteIds);
        if (paquetes.isEmpty()) return;
        Set<Long> guiasAfectadas = new HashSet<>();
        List<TrackingEventService.PendingTransicion> pendientes = new ArrayList<>(paquetes.size());
        for (Paquete p : paquetes) {
            EstadoRastreo origen = p.getEstadoRastreo();
            aplicarEstadoConReglas(p, estado, null);
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
                    buildIdempotencyKey(idempotencyPrefix, p.getId(), origen != null ? origen.getId() : null, estado.getId())
            );
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
            paquete.setFechaEstadoActualDesde(LocalDateTime.now());
            paquete.setEnFlujoAlterno(TipoFlujoEstado.ALTERNO.equals(estadoOrigen.getTipoFlujo()));
            if (!TipoFlujoEstado.ALTERNO.equals(estadoOrigen.getTipoFlujo())) {
                paquete.setMotivoAlterno(null);
            }
            paquete.setBloqueado(false);
            paquete.setFechaBloqueoDesde(null);
            paqueteRepository.save(paquete);
            reverted++;
        }
        return reverted;
    }

    private EstadoRastreo getEstadoRegistroPaquete() {
        Long id = parametroSistemaService.getEstadosRastreoPorPunto().getEstadoRastreoRegistroPaqueteId();
        if (id != null) {
            return estadoRastreoService.findEntityById(id);
        }
        return estadoRastreoService.findEntityByCodigo("REGISTRADO");
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
            aGuardar.add(p);
        }
        List<PaqueteDTO> result = paqueteRepository.saveAll(aGuardar).stream().map(this::toDTO).toList();
        for (Long gmId : guiasAfectadas) {
            guiaMasterService.recomputarEstado(gmId);
        }
        return result;
    }

    @Transactional
    public PaqueteDTO update(Long paqueteId, Long currentUsuarioId, boolean canManageAny, boolean canEditPeso, PaqueteUpdateRequest request) {
        Paquete p = paqueteRepository.findById(paqueteId)
                .orElseThrow(() -> new ResourceNotFoundException("Paquete", paqueteId));
        ownershipValidator.requirePaqueteOwnership(p, currentUsuarioId, canManageAny);
        Long newDestId = request.getDestinatarioFinalId();
        if (newDestId != null && (p.getDestinatarioFinal() == null || !p.getDestinatarioFinal().getId().equals(newDestId))) {
            DestinatarioFinal newDest = destinatarioFinalRepository.findById(newDestId)
                    .orElseThrow(() -> new ResourceNotFoundException("Destinatario", newDestId));
            ownershipValidator.requireDestinatarioOwnership(newDest, currentUsuarioId, canManageAny);
            p.setDestinatarioFinal(newDest);
            String codigoBase = (newDest.getCodigo() != null && !newDest.getCodigo().isBlank())
                    ? newDest.getCodigo().trim()
                    : ("D" + newDest.getId());
            p.setRef(codigoSecuenciaService.nextRefPaquete(newDest.getId(), codigoBase));
        }
        if (request.getContenido() != null) {
            p.setContenido(request.getContenido().trim().isEmpty() ? null : request.getContenido().trim());
        }
        if (!canEditPeso) {
            if (p.getContenido() == null || p.getContenido().isBlank()) {
                throw new BadRequestException("El contenido es obligatorio");
            }
        }
        boolean pesoCambioRecepcion = false;
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
            String newRef = request.getRef() != null ? request.getRef().trim() : null;
            if (newRef != null && !newRef.isEmpty()) {
                if (paqueteRepository.existsByRefAndIdNot(newRef, paqueteId)) {
                    throw new ConflictException("Ya existe otro paquete con esa referencia");
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
                        throw new ConflictException("Ya existe otro paquete con ese número de guía");
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
                throw new ConflictException("Ya existe otro paquete con ese número de guía");
            }
            p.setNumeroGuia(nuevoNumeroGuia);
        }
    }

    @Transactional
    public void delete(Long paqueteId, Long currentUsuarioId, boolean canManageAny) {
        Paquete p = paqueteRepository.findById(paqueteId)
                .orElseThrow(() -> new ResourceNotFoundException("Paquete", paqueteId));
        ownershipValidator.requirePaqueteOwnership(p, currentUsuarioId, canManageAny);
        paqueteEstadoEventoRepository.deleteByPaqueteId(paqueteId);
        outboxEventRepository.deleteByAggregateTypeAndAggregateId("PAQUETE", String.valueOf(paqueteId));
        paqueteRepository.delete(p);
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
                .destinatarioNombre(p.getDestinatarioFinal() != null ? p.getDestinatarioFinal().getNombre() : null)
                .destinatario(buildDestinatarioCard(p))
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
            case DOMICILIO -> d.getDistribuidor() != null ? d.getDistribuidor().getDiasMaxRetiroDomicilio() : null;
            case AGENCIA -> d.getAgencia() != null ? d.getAgencia().getDiasMaxRetiro() : null;
            case AGENCIA_DISTRIBUIDOR -> d.getAgenciaDistribuidor() != null ? d.getAgenciaDistribuidor().getDiasMaxRetiro() : null;
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

    private TrackingDestinatarioDTO buildDestinatarioCard(Paquete p) {
        DestinatarioFinal dest = p.getDestinatarioFinal();
        if (dest == null) return null;
        // PII (telefono, direccion) se omite intencionalmente por ser endpoint publico.
        return TrackingDestinatarioDTO.builder()
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
        if (d.getDistribuidor() != null) {
            builder
                    .distribuidorNombre(d.getDistribuidor().getNombre())
                    .distribuidorCodigo(d.getDistribuidor().getCodigo())
                    .horarioRepartoDistribuidor(d.getDistribuidor().getHorarioReparto())
                    .paginaTrackingDistribuidor(d.getDistribuidor().getPaginaTracking())
                    .diasMaxRetiroDomicilio(d.getDistribuidor().getDiasMaxRetiroDomicilio());
        }
        if (d.getAgencia() != null) {
            builder
                    .agenciaNombre(d.getAgencia().getNombre())
                    .agenciaCodigo(d.getAgencia().getCodigo())
                    .agenciaDireccion(d.getAgencia().getDireccion())
                    .agenciaProvincia(d.getAgencia().getProvincia())
                    .agenciaCanton(d.getAgencia().getCanton())
                    .horarioAtencionAgencia(d.getAgencia().getHorarioAtencion())
                    .diasMaxRetiroAgencia(d.getAgencia().getDiasMaxRetiro());
        }
        if (d.getAgenciaDistribuidor() != null) {
            builder
                    .agenciaDistribuidorEtiqueta(AgenciaDistribuidorService.etiquetaDe(d.getAgenciaDistribuidor()))
                    .agenciaDistribuidorCodigo(d.getAgenciaDistribuidor().getCodigo())
                    .agenciaDistribuidorDireccion(d.getAgenciaDistribuidor().getDireccion())
                    .agenciaDistribuidorProvincia(d.getAgenciaDistribuidor().getProvincia())
                    .agenciaDistribuidorCanton(d.getAgenciaDistribuidor().getCanton())
                    .horarioAtencionAgenciaDistribuidor(d.getAgenciaDistribuidor().getHorarioAtencion())
                    .diasMaxRetiroAgenciaDistribuidor(d.getAgenciaDistribuidor().getDiasMaxRetiro());
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
            throw new BadRequestException("El estado de rastreo seleccionado no está activo");
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
                rechazados.add(new CambiarEstadoRastreoBulkResponse.RechazoBulk(paqueteId, "Tiene despacho/saca asociado"));
                continue;
            }
            String trackingBase = p.getGuiaMaster() != null ? Strings.trimOrNull(p.getGuiaMaster().getTrackingBase()) : null;
            if (trackingBase != null && loteRecepcionGuiaRepository.existsByNumeroGuiaEnvio(trackingBase)) {
                rechazados.add(new CambiarEstadoRastreoBulkResponse.RechazoBulk(paqueteId, "Está en lote de recepción"));
                continue;
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

    @Transactional
    public PaqueteDTO asignarAGuiaMaster(Long paqueteId, Long guiaMasterId, Integer piezaNumero) {
        Paquete p = paqueteRepository.findById(paqueteId)
                .orElseThrow(() -> new ResourceNotFoundException("Paquete", paqueteId));
        if (guiaMasterId == null) {
            throw new BadRequestException("Debe indicar la guía master");
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
            throw new BadRequestException("Debe indicar la guía master");
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
        Set<Long> interseccion = null;
        for (Paquete paquete : paquetes) {
            List<EstadoRastreo> destinos = estadoRastreoService.findDestinosActivosExcluyendoOrigen(paquete.getEstadoRastreo().getId());
            Set<Long> destinosIds = destinos.stream().map(EstadoRastreo::getId).collect(Collectors.toSet());
            if (interseccion == null) {
                interseccion = destinosIds;
            } else {
                interseccion.retainAll(destinosIds);
            }
        }
        if (interseccion == null || interseccion.isEmpty()) {
            return List.of();
        }
        final Set<Long> idsPermitidos = Set.copyOf(interseccion);
        Set<Long> excluirPorPunto = idsEstadosRastreoGestionadosPorPunto();
        return estadoRastreoService.findActivos().stream()
                .filter(e -> idsPermitidos.contains(e.getId()) && !excluirPorPunto.contains(e.getId()))
                .toList();
    }

    /** Registro, lote, despacho y tránsito: solo se asignan en sus flujos automáticos. */
    private Set<Long> idsEstadosRastreoGestionadosPorPunto() {
        var cfg = parametroSistemaService.getEstadosRastreoPorPunto();
        if (cfg == null) {
            return Set.of();
        }
        Set<Long> ids = new HashSet<>();
        if (cfg.getEstadoRastreoRegistroPaqueteId() != null) {
            ids.add(cfg.getEstadoRastreoRegistroPaqueteId());
        }
        if (cfg.getEstadoRastreoEnLoteRecepcionId() != null) {
            ids.add(cfg.getEstadoRastreoEnLoteRecepcionId());
        }
        if (cfg.getEstadoRastreoEnDespachoId() != null) {
            ids.add(cfg.getEstadoRastreoEnDespachoId());
        }
        if (cfg.getEstadoRastreoEnTransitoId() != null) {
            ids.add(cfg.getEstadoRastreoEnTransitoId());
        }
        return ids;
    }

    private void validarEstadoNoReservadoParaPuntosOperativos(Long estadoRastreoId) {
        if (estadoRastreoId != null && idsEstadosRastreoGestionadosPorPunto().contains(estadoRastreoId)) {
            throw new BadRequestException(
                    "Ese estado lo asignan el registro de paquete, el lote de recepción, el despacho o el tránsito; no puede aplicarse manualmente.");
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
        EstadoRastreo estadoOrigen = paquete.getEstadoRastreo();
        if (estadoOrigen != null) {
            validarTransicion(estadoOrigen, estadoDestino);
        }
        paquete.setEstadoRastreo(estadoDestino);
        paquete.setFechaEstadoActualDesde(LocalDateTime.now());

        if (estadoDestino.getTipoFlujo() == TipoFlujoEstado.ALTERNO) {
            paquete.setEnFlujoAlterno(true);
            paquete.setMotivoAlterno(Strings.trimOrNull(motivoAlterno));
        } else {
            paquete.setEnFlujoAlterno(false);
            paquete.setMotivoAlterno(null);
        }
        paquete.setBloqueado(false);
        paquete.setFechaBloqueoDesde(null);
    }

    private void validarTransicion(EstadoRastreo origen, EstadoRastreo destino) {
        if (origen.getId().equals(destino.getId())) {
            return;
        }
        if (!Boolean.TRUE.equals(destino.getActivo())) {
            throw new BadRequestException("El estado destino no está activo");
        }
    }

    /** Convierte entidad a DTO (público para uso desde SacaService al construir sacas con paquetes completos). */
    public PaqueteDTO toDTO(Paquete p) {
        EstadoRastreo er = p.getEstadoRastreo();
        PlazoRetiroInfo plazoRetiroInfo = calcularPlazoRetiro(p);
        GuiaMaster gm = p.getGuiaMaster();
        return PaqueteDTO.builder()
                .id(p.getId())
                .numeroGuia(p.getNumeroGuia())
                .guiaMasterId(gm != null ? gm.getId() : null)
                .guiaMasterTrackingBase(gm != null ? gm.getTrackingBase() : null)
                .guiaMasterEstadoGlobal(gm != null && gm.getEstadoGlobal() != null ? gm.getEstadoGlobal().name() : null)
                .guiaMasterTotalPiezas(gm != null ? gm.getTotalPiezasEsperadas() : null)
                .piezaNumero(p.getPiezaNumero())
                .piezaTotal(p.getPiezaTotal())
                .envioConsolidadoId(p.getEnvioConsolidado() != null ? p.getEnvioConsolidado().getId() : null)
                .envioConsolidadoCodigo(p.getEnvioConsolidado() != null ? p.getEnvioConsolidado().getCodigo() : null)
                .envioConsolidadoCerrado(p.getEnvioConsolidado() != null && p.getEnvioConsolidado().isCerrado())
                .ref(p.getRef())
                .pesoLbs(p.getPesoLbs())
                .pesoKg(WeightUtil.lbsToKg(p.getPesoLbs()))
                .contenido(p.getContenido())
                .estadoRastreoId(er != null ? er.getId() : null)
                .estadoRastreoNombre(er != null ? er.getNombre() : null)
                .estadoRastreoCodigo(er != null ? er.getCodigo() : null)
                .destinatarioFinalId(p.getDestinatarioFinal() != null ? p.getDestinatarioFinal().getId() : null)
                .destinatarioNombre(p.getDestinatarioFinal() != null ? p.getDestinatarioFinal().getNombre() : null)
                .destinatarioDireccion(p.getDestinatarioFinal() != null ? p.getDestinatarioFinal().getDireccion() : null)
                .destinatarioProvincia(p.getDestinatarioFinal() != null ? p.getDestinatarioFinal().getProvincia() : null)
                .destinatarioCanton(p.getDestinatarioFinal() != null ? p.getDestinatarioFinal().getCanton() : null)
                .destinatarioTelefono(p.getDestinatarioFinal() != null ? p.getDestinatarioFinal().getTelefono() : null)
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
                .build();
    }
}
