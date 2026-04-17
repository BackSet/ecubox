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
import com.ecubox.ecubox_backend.dto.TrackingOperadorEntregaDTO;
import com.ecubox.ecubox_backend.dto.TrackingPaqueteDespachoDTO;
import com.ecubox.ecubox_backend.dto.TrackingResponse;
import com.ecubox.ecubox_backend.dto.TrackingSacaDTO;
import com.ecubox.ecubox_backend.entity.DestinatarioFinal;
import com.ecubox.ecubox_backend.entity.Despacho;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.PaqueteEstadoEvento;
import com.ecubox.ecubox_backend.entity.Saca;
import com.ecubox.ecubox_backend.enums.TrackingEventType;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ConflictException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.DestinatarioFinalRepository;
import com.ecubox.ecubox_backend.repository.LoteRecepcionGuiaRepository;
import com.ecubox.ecubox_backend.repository.OutboxEventRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.PaqueteEstadoEventoRepository;
import com.ecubox.ecubox_backend.repository.SacaRepository;
import com.ecubox.ecubox_backend.util.WeightUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
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

    @Transactional
    public PaqueteDTO create(Long usuarioId, boolean contenidoObligatorio, PaqueteCreateRequest request) {
        if (contenidoObligatorio && (request.getContenido() == null || request.getContenido().isBlank())) {
            throw new BadRequestException("El contenido es obligatorio");
        }
        if (paqueteRepository.existsByNumeroGuia(request.getNumeroGuia())) {
            throw new ConflictException("Ya existe un paquete con ese número de guía");
        }
        DestinatarioFinal dest = destinatarioFinalRepository.findById(request.getDestinatarioFinalId())
                .orElseThrow(() -> new ResourceNotFoundException("Destinatario", request.getDestinatarioFinalId()));
        if (!dest.getUsuario().getId().equals(usuarioId)) {
            throw new ResourceNotFoundException("Destinatario", request.getDestinatarioFinalId());
        }
        String codigoBase = (dest.getCodigo() != null && !dest.getCodigo().isBlank())
                ? dest.getCodigo().trim()
                : ("D" + dest.getId());
        long next = paqueteRepository.countByDestinatarioFinalId(dest.getId()) + 1;
        String ref = codigoBase + "-" + next;
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
        Paquete p = Paquete.builder()
                .numeroGuia(request.getNumeroGuia())
                .numeroGuiaEnvio(omitOperarioFields ? null : trimOrNull(request.getNumeroGuiaEnvio()))
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
        return toDTO(p);
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
     * Si excludePaqueteId no es null, la ref actual de ese paquete se considera válida.
     */
    @Transactional(readOnly = true)
    public String sugerirRef(Long destinatarioFinalId, Long excludePaqueteId) {
        DestinatarioFinal dest = destinatarioFinalRepository.findById(destinatarioFinalId)
                .orElseThrow(() -> new ResourceNotFoundException("Destinatario", destinatarioFinalId));
        String codigoBase = (dest.getCodigo() != null && !dest.getCodigo().isBlank())
                ? dest.getCodigo().trim()
                : ("D" + dest.getId());
        for (long n = 1; n <= 10_000; n++) {
            String candidate = codigoBase + "-" + n;
            if (!paqueteRepository.existsByRef(candidate)) {
                return candidate;
            }
            if (excludePaqueteId != null) {
                var existing = paqueteRepository.findByRef(candidate);
                if (existing.isPresent() && existing.get().getId().equals(excludePaqueteId)) {
                    return candidate;
                }
            }
        }
        return codigoBase + "-" + System.currentTimeMillis();
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
            if (saca.getDespacho() != null) {
                throw new BadRequestException("La saca ya está asignada a un despacho");
            }
            p.setSaca(saca);
        } else {
            p.setSaca(null);
        }
        p = paqueteRepository.save(p);
        return toDTO(p);
    }

    @Transactional
    public List<PaqueteDTO> asignarPaquetesASaca(Long sacaId, List<Long> paqueteIds) {
        Saca saca = sacaRepository.findById(sacaId)
                .orElseThrow(() -> new ResourceNotFoundException("Saca", sacaId));
        if (saca.getDespacho() != null) {
            throw new BadRequestException("La saca ya está asignada a un despacho");
        }
        List<PaqueteDTO> result = new ArrayList<>();
        for (Long paqueteId : paqueteIds) {
            Paquete p = paqueteRepository.findById(paqueteId)
                    .orElseThrow(() -> new ResourceNotFoundException("Paquete", paqueteId));
            p.setSaca(saca);
            p = paqueteRepository.save(p);
            result.add(toDTO(p));
        }
        return result;
    }

    /** Aplica el estado configurado "en despacho" a los paquetes indicados. Usado desde DespachoService al crear despacho. */
    @Transactional
    public void aplicarEstadoEnDespacho(List<Long> paqueteIds) {
        if (paqueteIds == null || paqueteIds.isEmpty()) return;
        Long estadoId = parametroSistemaService.getEstadosRastreoPorPunto().getEstadoRastreoEnDespachoId();
        if (estadoId == null) return;
        EstadoRastreo estado = estadoRastreoService.findEntityById(estadoId);
        for (Long id : paqueteIds) {
            paqueteRepository.findById(id).ifPresent(p -> {
                EstadoRastreo origen = p.getEstadoRastreo();
                aplicarEstadoConReglas(p, estado, null);
                paqueteRepository.save(p);
                trackingEventService.registrarTransicion(
                        p,
                        origen,
                        estado,
                        TrackingEventType.ESTADO_APLICADO_DESPACHO,
                        "DESPACHO_AUTO",
                        p.getMotivoAlterno(),
                        null,
                        buildIdempotencyKey("despacho", p.getId(), origen != null ? origen.getId() : null, estado.getId())
                );
            });
        }
    }

    /** Aplica el estado configurado "en lote recepción" a los paquetes indicados. Usado desde LoteRecepcionService. */
    @Transactional
    public void aplicarEstadoEnLoteRecepcion(List<Long> paqueteIds) {
        if (paqueteIds == null || paqueteIds.isEmpty()) return;
        Long estadoId = parametroSistemaService.getEstadosRastreoPorPunto().getEstadoRastreoEnLoteRecepcionId();
        if (estadoId == null) return;
        EstadoRastreo estado = estadoRastreoService.findEntityById(estadoId);
        for (Long id : paqueteIds) {
            paqueteRepository.findById(id).ifPresent(p -> {
                EstadoRastreo origen = p.getEstadoRastreo();
                aplicarEstadoConReglas(p, estado, null);
                paqueteRepository.save(p);
                trackingEventService.registrarTransicion(
                        p,
                        origen,
                        estado,
                        TrackingEventType.ESTADO_APLICADO_LOTE_RECEPCION,
                        "LOTE_RECEPCION_AUTO",
                        p.getMotivoAlterno(),
                        null,
                        buildIdempotencyKey("lote-recepcion", p.getId(), origen != null ? origen.getId() : null, estado.getId())
                );
            });
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
        List<PaqueteDTO> result = new ArrayList<>();
        for (PaquetePesoItem item : items) {
            Paquete p = paqueteRepository.findById(item.getPaqueteId())
                    .orElseThrow(() -> new ResourceNotFoundException("Paquete", item.getPaqueteId()));
            BigDecimal lbs = item.getPesoLbs();
            BigDecimal kg = item.getPesoKg();
            if (lbs != null && lbs.compareTo(BigDecimal.ZERO) > 0) {
                p.setPesoLbs(lbs);
            } else if (kg != null && kg.compareTo(BigDecimal.ZERO) > 0) {
                p.setPesoLbs(WeightUtil.kgToLbs(kg));
            }
            p = paqueteRepository.save(p);
            result.add(toDTO(p));
        }
        return result;
    }

    @Transactional
    public PaqueteDTO update(Long paqueteId, Long currentUsuarioId, boolean canManageAny, boolean canEditPeso, PaqueteUpdateRequest request) {
        Paquete p = paqueteRepository.findById(paqueteId)
                .orElseThrow(() -> new ResourceNotFoundException("Paquete", paqueteId));
        if (!canManageAny) {
            Long ownerId = p.getDestinatarioFinal().getUsuario().getId();
            if (!ownerId.equals(currentUsuarioId)) {
                throw new ResourceNotFoundException("Paquete", paqueteId);
            }
        }
        String newNumeroGuia = request.getNumeroGuia() != null ? request.getNumeroGuia().trim() : null;
        if (newNumeroGuia != null && !newNumeroGuia.equals(p.getNumeroGuia())) {
            if (paqueteRepository.existsByNumeroGuiaAndIdNot(newNumeroGuia, paqueteId)) {
                throw new ConflictException("Ya existe otro paquete con ese número de guía");
            }
            p.setNumeroGuia(newNumeroGuia);
        }
        Long newDestId = request.getDestinatarioFinalId();
        if (newDestId != null && (p.getDestinatarioFinal() == null || !p.getDestinatarioFinal().getId().equals(newDestId))) {
            DestinatarioFinal newDest = destinatarioFinalRepository.findById(newDestId)
                    .orElseThrow(() -> new ResourceNotFoundException("Destinatario", newDestId));
            if (!canManageAny && !newDest.getUsuario().getId().equals(currentUsuarioId)) {
                throw new ResourceNotFoundException("Destinatario", newDestId);
            }
            p.setDestinatarioFinal(newDest);
            String codigoBase = (newDest.getCodigo() != null && !newDest.getCodigo().isBlank())
                    ? newDest.getCodigo().trim()
                    : ("D" + newDest.getId());
            long next = paqueteRepository.countByDestinatarioFinalId(newDest.getId()) + 1;
            p.setRef(codigoBase + "-" + next);
        }
        if (request.getContenido() != null) {
            p.setContenido(request.getContenido().trim().isEmpty() ? null : request.getContenido().trim());
        }
        if (!canEditPeso) {
            if (p.getContenido() == null || p.getContenido().isBlank()) {
                throw new BadRequestException("El contenido es obligatorio");
            }
        }
        if (canEditPeso) {
            if (request.getPesoLbs() != null) {
                p.setPesoLbs(request.getPesoLbs());
            } else if (request.getPesoKg() != null) {
                p.setPesoLbs(WeightUtil.kgToLbs(request.getPesoKg()));
            } else {
                p.setPesoLbs(null);
            }
            if (request.getNumeroGuiaEnvio() != null) {
                p.setNumeroGuiaEnvio(trimOrNull(request.getNumeroGuiaEnvio()));
            }
            String newRef = request.getRef() != null ? request.getRef().trim() : null;
            if (newRef != null && !newRef.isEmpty()) {
                if (paqueteRepository.existsByRefAndIdNot(newRef, paqueteId)) {
                    throw new ConflictException("Ya existe otro paquete con esa referencia");
                }
                p.setRef(newRef);
            }
        }
        p = paqueteRepository.save(p);
        return toDTO(p);
    }

    @Transactional
    public void delete(Long paqueteId, Long currentUsuarioId, boolean canManageAny) {
        Paquete p = paqueteRepository.findById(paqueteId)
                .orElseThrow(() -> new ResourceNotFoundException("Paquete", paqueteId));
        if (!canManageAny) {
            Long ownerId = p.getDestinatarioFinal().getUsuario().getId();
            if (!ownerId.equals(currentUsuarioId)) {
                throw new ResourceNotFoundException("Paquete", paqueteId);
            }
        }
        paqueteEstadoEventoRepository.deleteByPaqueteId(paqueteId);
        outboxEventRepository.deleteByAggregateTypeAndAggregateId("PAQUETE", String.valueOf(paqueteId));
        paqueteRepository.delete(p);
    }

    private static final ZoneId ZONA_ECUADOR = ZoneId.of("America/Guayaquil");
    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_DATE_TIME;
    private record PlazoRetiroInfo(Integer diasMaxRetiro,
                                   Integer diasTranscurridos,
                                   Integer diasRestantes,
                                   Integer diasAtrasoRetiro,
                                   boolean paqueteVencido,
                                   boolean cuentaRegresivaFinalizada) {}

    @Transactional(readOnly = true)
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
            estadosCatalogo.add(TrackingEstadoItemDTO.builder()
                    .id(e.getId())
                    .codigo(e.getCodigo())
                    .nombre(e.getNombre())
                    .orden(e.getOrdenTracking())
                    .tipoFlujo(e.getTipoFlujo())
                    .leyenda(leyenda)
                    .esActual(esActual)
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
        if (useEventTimeline) {
            List<PaqueteEstadoEvento> eventos = trackingEventService.listarEventosPorPaquete(p.getId());
            if (!eventos.isEmpty()) {
                alternosPorEventos = buildAlternoTimelineFromEventos(eventos, estadoActualId, diasTranscurridos);
            }
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
                .build();
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
                                                                        Integer diasTranscurridos) {
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
        Long estadoActualId = p.getEstadoRastreo() != null ? p.getEstadoRastreo().getId() : null;
        if (estadoFinalCuentaRegresivaId != null && Objects.equals(estadoFinalCuentaRegresivaId, estadoActualId)) {
            return new PlazoRetiroInfo(null, null, null, 0, false, true);
        }
        Integer diasMaxRetiro = chooseDiasMaxRetiroPorEntidad(p);
        if (diasMaxRetiro == null || p.getFechaEstadoActualDesde() == null) {
            return new PlazoRetiroInfo(diasMaxRetiro, null, null, 0, false, false);
        }
        LocalDate desde = p.getFechaEstadoActualDesde().atZone(ZONA_ECUADOR).toLocalDate();
        LocalDate hoy = LocalDate.now(ZONA_ECUADOR);
        long dias = java.time.temporal.ChronoUnit.DAYS.between(desde, hoy);
        int diasTranscurridos = (int) Math.max(0, dias);
        int diasRestantes = Math.max(0, diasMaxRetiro - diasTranscurridos);
        int diasAtrasoRetiro = Math.max(0, diasTranscurridos - diasMaxRetiro);
        boolean paqueteVencido = diasTranscurridos > diasMaxRetiro;
        return new PlazoRetiroInfo(diasMaxRetiro, diasTranscurridos, diasRestantes, diasAtrasoRetiro, paqueteVencido, false);
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
        return TrackingDestinatarioDTO.builder()
                .id(dest.getId())
                .nombre(dest.getNombre())
                .telefono(dest.getTelefono())
                .direccion(dest.getDireccion())
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
        int actualizados = 0;
        for (Long paqueteId : paqueteIds) {
            Paquete p = paqueteRepository.findById(paqueteId).orElse(null);
            if (p == null) {
                rechazados.add(new CambiarEstadoRastreoBulkResponse.RechazoBulk(paqueteId, "Paquete no encontrado"));
                continue;
            }
            if (p.getSaca() != null) {
                rechazados.add(new CambiarEstadoRastreoBulkResponse.RechazoBulk(paqueteId, "Tiene despacho/saca asociado"));
                continue;
            }
            String numeroGuiaEnvio = trimOrNull(p.getNumeroGuiaEnvio());
            if (numeroGuiaEnvio != null && loteRecepcionGuiaRepository.existsByNumeroGuiaEnvio(numeroGuiaEnvio)) {
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
            paqueteRepository.save(p);
            actualizados++;
        }
        return CambiarEstadoRastreoBulkResponse.builder()
                .actualizados(actualizados)
                .rechazados(rechazados)
                .build();
    }

    /** Aplica el mismo estado de rastreo a una lista de paquetes (sin validar elegibilidad). Usado desde DespachoService para aplicar estado por periodo. */
    @Transactional
    public void aplicarEstadoRastreoMasivo(List<Long> paqueteIds, Long estadoRastreoId) {
        if (paqueteIds == null || paqueteIds.isEmpty()) return;
        EstadoRastreo estado = estadoRastreoService.findEntityById(estadoRastreoId);
        for (Long paqueteId : paqueteIds) {
            paqueteRepository.findById(paqueteId).ifPresent(p -> {
                EstadoRastreo origen = p.getEstadoRastreo();
                aplicarEstadoConReglas(p, estado, null);
                paqueteRepository.save(p);
                trackingEventService.registrarTransicion(
                        p,
                        origen,
                        estado,
                        TrackingEventType.ESTADO_APLICADO_PERIODO,
                        "PERIODO_AUTO",
                        p.getMotivoAlterno(),
                        null,
                        buildIdempotencyKey("periodo", p.getId(), origen != null ? origen.getId() : null, estado.getId())
                );
            });
        }
    }

    @Transactional
    public PaqueteDTO asignarGuiaEnvio(Long paqueteId, String numeroGuiaEnvio) {
        Paquete p = paqueteRepository.findById(paqueteId)
                .orElseThrow(() -> new ResourceNotFoundException("Paquete", paqueteId));
        p.setNumeroGuiaEnvio(trimOrNull(numeroGuiaEnvio));
        p = paqueteRepository.save(p);
        return toDTO(p);
    }

    @Transactional
    public List<PaqueteDTO> asignarGuiaEnvioBulk(String numeroGuiaEnvio, List<Long> paqueteIds) {
        String value = trimOrNull(numeroGuiaEnvio);
        List<PaqueteDTO> result = new ArrayList<>();
        for (Long paqueteId : paqueteIds) {
            Paquete p = paqueteRepository.findById(paqueteId)
                    .orElseThrow(() -> new ResourceNotFoundException("Paquete", paqueteId));
            p.setNumeroGuiaEnvio(value);
            p = paqueteRepository.save(p);
            result.add(toDTO(p));
        }
        return result;
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

    private static String trimOrNull(String s) {
        if (s == null || s.isBlank()) return null;
        return s.trim();
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
            paquete.setMotivoAlterno(trimOrNull(motivoAlterno));
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
        return PaqueteDTO.builder()
                .id(p.getId())
                .numeroGuia(p.getNumeroGuia())
                .numeroGuiaEnvio(p.getNumeroGuiaEnvio())
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
