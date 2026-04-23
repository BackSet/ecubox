package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.dto.GuiaMasterDTO;
import com.ecubox.ecubox_backend.dto.GuiaMasterDashboardDTO;
import com.ecubox.ecubox_backend.dto.MiInicioDashboardDTO;
import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.dto.TrackingMasterEventoItem;
import com.ecubox.ecubox_backend.dto.TrackingConsignatarioDTO;
import com.ecubox.ecubox_backend.dto.TrackingMasterResponse;
import com.ecubox.ecubox_backend.dto.TrackingPiezaItem;
import com.ecubox.ecubox_backend.dto.GuiaMasterUpdateRequest;
import com.ecubox.ecubox_backend.entity.Consignatario;
import com.ecubox.ecubox_backend.entity.ConsignatarioVersion;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.GuiaMaster;
import com.ecubox.ecubox_backend.entity.GuiaMasterEstadoHistorial;
import com.ecubox.ecubox_backend.entity.OutboxEvent;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.PaqueteEstadoEvento;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.enums.EstadoGuiaMaster;
import com.ecubox.ecubox_backend.enums.OutboxEventStatus;
import com.ecubox.ecubox_backend.enums.TipoCambioEstadoGuiaMaster;
import com.ecubox.ecubox_backend.enums.TipoCierreGuiaMaster;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ConflictException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.ConsignatarioRepository;
import com.ecubox.ecubox_backend.repository.GuiaMasterEstadoHistorialRepository;
import com.ecubox.ecubox_backend.repository.GuiaMasterRepository;
import com.ecubox.ecubox_backend.repository.LoteRecepcionGuiaRepository;
import com.ecubox.ecubox_backend.repository.OutboxEventRepository;
import com.ecubox.ecubox_backend.repository.PaqueteEstadoEventoRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import com.ecubox.ecubox_backend.util.SearchSpecifications;
import com.ecubox.ecubox_backend.util.Strings;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Servicio de orquestación de {@link GuiaMaster} (guía del consolidador)
 * y su máquina de estados calculada a partir de las piezas (paquete).
 */
@Service
public class GuiaMasterService {

    private static final Logger log = LoggerFactory.getLogger(GuiaMasterService.class);

    private final GuiaMasterRepository guiaMasterRepository;
    private final PaqueteRepository paqueteRepository;
    private final ParametroSistemaService parametroSistemaService;
    private final OutboxEventRepository outboxEventRepository;
    private final ConsignatarioRepository consignatarioRepository;
    private final UsuarioRepository usuarioRepository;
    private final PaqueteEstadoEventoRepository paqueteEstadoEventoRepository;
    private final GuiaMasterEstadoHistorialRepository historialRepository;
    private final ConsignatarioVersionService consignatarioVersionService;
    private final CodigoSecuenciaService codigoSecuenciaService;
    private final LoteRecepcionGuiaRepository loteRecepcionGuiaRepository;
    private final PaqueteService paqueteService;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    public GuiaMasterService(GuiaMasterRepository guiaMasterRepository,
                             PaqueteRepository paqueteRepository,
                             ParametroSistemaService parametroSistemaService,
                             OutboxEventRepository outboxEventRepository,
                             ConsignatarioRepository consignatarioRepository,
                             UsuarioRepository usuarioRepository,
                             PaqueteEstadoEventoRepository paqueteEstadoEventoRepository,
                             GuiaMasterEstadoHistorialRepository historialRepository,
                             ConsignatarioVersionService consignatarioVersionService,
                             CodigoSecuenciaService codigoSecuenciaService,
                             LoteRecepcionGuiaRepository loteRecepcionGuiaRepository,
                             @Lazy PaqueteService paqueteService) {
        this.guiaMasterRepository = guiaMasterRepository;
        this.paqueteRepository = paqueteRepository;
        this.parametroSistemaService = parametroSistemaService;
        this.outboxEventRepository = outboxEventRepository;
        this.consignatarioRepository = consignatarioRepository;
        this.usuarioRepository = usuarioRepository;
        this.paqueteEstadoEventoRepository = paqueteEstadoEventoRepository;
        this.historialRepository = historialRepository;
        this.consignatarioVersionService = consignatarioVersionService;
        this.codigoSecuenciaService = codigoSecuenciaService;
        this.loteRecepcionGuiaRepository = loteRecepcionGuiaRepository;
        this.paqueteService = paqueteService;
    }

    /**
     * Creación realizada por un operario. Permite total y destinatario opcionales.
     */
    @Transactional
    public GuiaMaster create(String trackingBase,
                             Integer totalPiezasEsperadas,
                             Long consignatarioId) {
        String tb = normalizarTrackingBase(trackingBase);
        if (tb == null) {
            throw new BadRequestException("El tracking base es obligatorio");
        }
        if (totalPiezasEsperadas != null && totalPiezasEsperadas < 1) {
            throw new BadRequestException("El total de piezas esperadas debe ser al menos 1");
        }
        if (guiaMasterRepository.existsByTrackingBaseIgnoreCase(tb)) {
            throw new ConflictException("Ya existe una guía con ese número");
        }
        Consignatario dest = null;
        Usuario clienteUsuario = null;
        if (consignatarioId != null) {
            dest = consignatarioRepository.findById(consignatarioId)
                    .orElseThrow(() -> new BadRequestException("El destinatario indicado no existe"));
            clienteUsuario = dest.getUsuario();
        }
        GuiaMaster gm = GuiaMaster.builder()
                .trackingBase(tb)
                .totalPiezasEsperadas(totalPiezasEsperadas)
                .consignatario(dest)
                .clienteUsuario(clienteUsuario)
                .estadoGlobal(EstadoGuiaMaster.SIN_PIEZAS_REGISTRADAS)
                .createdAt(LocalDateTime.now())
                .build();
        GuiaMaster saved = guiaMasterRepository.save(gm);
        registrarHistorial(saved, null, saved.getEstadoGlobal(),
                TipoCambioEstadoGuiaMaster.CREACION,
                "Guia registrada por operario", null);
        return saved;
    }

    /**
     * Variante usada por el cliente final: trackingBase + destinatario propio.
     * El total queda NULL hasta que el operario lo complete.
     */
    @Transactional
    public GuiaMaster createForCliente(String trackingBase, Long consignatarioId, Long clienteUsuarioId) {
        String tb = normalizarTrackingBase(trackingBase);
        if (tb == null) {
            throw new BadRequestException("El número de guía es obligatorio");
        }
        if (consignatarioId == null) {
            throw new BadRequestException("Debes seleccionar un destinatario");
        }
        if (clienteUsuarioId == null) {
            throw new BadRequestException("Cliente no autenticado");
        }
        if (guiaMasterRepository.existsByTrackingBaseIgnoreCase(tb)) {
            throw new ConflictException("Ya existe una guía registrada con ese número. Contacta al operario si crees que es un error.");
        }
        Consignatario dest = consignatarioRepository.findById(consignatarioId)
                .orElseThrow(() -> new BadRequestException("El destinatario indicado no existe"));
        if (dest.getUsuario() == null || !clienteUsuarioId.equals(dest.getUsuario().getId())) {
            throw new BadRequestException("Solo puedes asociar destinatarios propios");
        }
        Usuario cliente = usuarioRepository.findById(clienteUsuarioId)
                .orElseThrow(() -> new BadRequestException("Cliente no encontrado"));
        GuiaMaster gm = GuiaMaster.builder()
                .trackingBase(tb)
                .totalPiezasEsperadas(null)
                .consignatario(dest)
                .clienteUsuario(cliente)
                .estadoGlobal(EstadoGuiaMaster.SIN_PIEZAS_REGISTRADAS)
                .createdAt(LocalDateTime.now())
                .build();
        GuiaMaster saved = guiaMasterRepository.save(gm);
        registrarHistorial(saved, null, saved.getEstadoGlobal(),
                TipoCambioEstadoGuiaMaster.CREACION,
                "Guia registrada por cliente", cliente);
        return saved;
    }

    /** Actualización parcial del operario sobre los metadatos de la guía. */
    @Transactional
    public GuiaMaster update(Long id, GuiaMasterUpdateRequest req) {
        GuiaMaster gm = findById(id);
        if (req == null) return gm;
        if (req.getTrackingBase() != null) {
            String nuevoTb = normalizarTrackingBase(req.getTrackingBase());
            if (nuevoTb == null) {
                throw new BadRequestException("El número de guía es obligatorio");
            }
            if (!nuevoTb.equalsIgnoreCase(gm.getTrackingBase())) {
                guiaMasterRepository.findByTrackingBaseIgnoreCase(nuevoTb).ifPresent(otra -> {
                    if (!otra.getId().equals(gm.getId())) {
                        throw new ConflictException("Ya existe otra guía con ese número");
                    }
                });
                gm.setTrackingBase(nuevoTb);
                renumerarPiezas(gm);
            }
        }
        if (req.getTotalPiezasEsperadas() != null) {
            int nuevoTotal = req.getTotalPiezasEsperadas();
            if (nuevoTotal < 1) {
                throw new BadRequestException("El total de piezas debe ser al menos 1");
            }
            long registradas = paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(gm.getId()).size();
            if (registradas > nuevoTotal) {
                throw new BadRequestException("Ya hay " + registradas + " piezas registradas; el total no puede ser menor");
            }
            gm.setTotalPiezasEsperadas(nuevoTotal);
        }
        if (req.getConsignatarioId() != null) {
            // SCD2: una vez que el destinatario quedo congelado (primer despacho),
            // ya no permitimos reasignarlo. La direccion impresa debe coincidir
            // con la que llevaba el envio cuando salio.
            Long actualId = gm.getConsignatario() != null ? gm.getConsignatario().getId() : null;
            if (gm.getConsignatarioVersion() != null
                    && !req.getConsignatarioId().equals(actualId)) {
                throw new BadRequestException(
                        "Esta guia ya tiene piezas despachadas con un destinatario congelado. "
                                + "No se puede cambiar el destinatario sin afectar la trazabilidad del envio.");
            }
            Consignatario dest = consignatarioRepository.findById(req.getConsignatarioId())
                    .orElseThrow(() -> new BadRequestException("El destinatario indicado no existe"));
            boolean cambioDestinatario = !req.getConsignatarioId().equals(actualId);
            gm.setConsignatario(dest);
            gm.setClienteUsuario(dest.getUsuario());
            if (cambioDestinatario) {
                propagarDestinatarioAPiezas(gm, dest);
            }
        }
        GuiaMaster saved = guiaMasterRepository.save(gm);
        sincronizarEstadoPaquetesSiLoteRecepcionAplica(saved.getId());
        recomputarEstado(saved.getId());
        return guiaMasterRepository.findById(saved.getId()).orElse(saved);
    }

    /**
     * Recompone el {@code numeroGuia} de todas las piezas de la guía cuando cambia
     * su {@code trackingBase}. Hace el cambio en dos fases (prefijo temporal seguido
     * del prefijo definitivo) para evitar colisiones intermedias con la unicidad
     * del índice {@code paquete.numero_guia} si otra guía ya tuviera ese tracking.
     */
    private void renumerarPiezas(GuiaMaster gm) {
        List<Paquete> piezas = paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(gm.getId());
        if (piezas.isEmpty()) return;
        String temp = "__renaming-" + gm.getId() + "-" + System.currentTimeMillis() + "__";
        for (Paquete p : piezas) {
            if (p.getPiezaNumero() == null || p.getPiezaTotal() == null) continue;
            p.setNumeroGuia(Paquete.componerNumeroGuia(temp, p.getPiezaNumero(), p.getPiezaTotal()));
        }
        paqueteRepository.saveAll(piezas);
        paqueteRepository.flush();
        for (Paquete p : piezas) {
            if (p.getPiezaNumero() == null || p.getPiezaTotal() == null) continue;
            String nuevo = Paquete.componerNumeroGuia(gm.getTrackingBase(), p.getPiezaNumero(), p.getPiezaTotal());
            if (paqueteRepository.existsByNumeroGuiaAndIdNot(nuevo, p.getId())) {
                throw new ConflictException(
                        "No se pudo renumerar la pieza " + p.getPiezaNumero() + "/" + p.getPiezaTotal()
                                + ": ya existe un paquete con número '" + nuevo + "'");
            }
            p.setNumeroGuia(nuevo);
        }
        paqueteRepository.saveAll(piezas);
    }

    /**
     * Si la guía (tracking) o el consolidado de alguna pieza figuran en un lote de
     * recepción, reaplica el estado de rastreo de recepción en bodega a las piezas
     * afectadas (p. ej. tras renumerar por cambio de tracking).
     */
    private void sincronizarEstadoPaquetesSiLoteRecepcionAplica(Long guiaMasterId) {
        if (guiaMasterId == null) {
            return;
        }
        GuiaMaster gm = guiaMasterRepository.findById(guiaMasterId).orElse(null);
        if (gm == null) {
            return;
        }
        List<Paquete> piezas = paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(guiaMasterId);
        if (piezas.isEmpty()) {
            return;
        }
        String tb = Strings.trimOrNull(gm.getTrackingBase());
        LocalDateTime fechaLote = null;
        List<Long> paqueteIds = new ArrayList<>();
        if (tb != null && loteRecepcionGuiaRepository.existsByNumeroGuiaEnvioIgnoreCase(tb)) {
            fechaLote = loteRecepcionGuiaRepository.findMinFechaRecepcionByNumeroGuiaEnvioIgnoreCase(tb)
                    .orElse(null);
            for (Paquete p : piezas) {
                paqueteIds.add(p.getId());
            }
        } else {
            for (Paquete p : piezas) {
                if (p.getEnvioConsolidado() == null) {
                    continue;
                }
                String cod = Strings.trimOrNull(p.getEnvioConsolidado().getCodigo());
                if (cod == null || !loteRecepcionGuiaRepository.existsByNumeroGuiaEnvioIgnoreCase(cod)) {
                    continue;
                }
                if (fechaLote == null) {
                    fechaLote = loteRecepcionGuiaRepository.findMinFechaRecepcionByNumeroGuiaEnvioIgnoreCase(cod)
                            .orElse(null);
                }
                paqueteIds.add(p.getId());
            }
        }
        if (!paqueteIds.isEmpty()) {
            paqueteService.aplicarEstadoEnLoteRecepcion(paqueteIds,
                    fechaLote != null ? fechaLote : LocalDateTime.now());
        }
    }

    /**
     * Variante para que el cliente final pueda cambiar el destinatario de una de
     * sus propias guías. Solo permite reasignar a destinatarios que pertenezcan
     * al mismo cliente, y nunca cambiar el cliente propietario.
     */
    @Transactional
    public GuiaMaster updateDestinatarioForCliente(Long guiaId, Long consignatarioId, Long clienteUsuarioId) {
        if (clienteUsuarioId == null) {
            throw new BadRequestException("Cliente no autenticado");
        }
        if (consignatarioId == null) {
            throw new BadRequestException("Debes seleccionar un destinatario");
        }
        GuiaMaster gm = findByIdForCliente(guiaId, clienteUsuarioId);
        guardarSiEsEditablePorCliente(gm);
        Consignatario dest = consignatarioRepository.findById(consignatarioId)
                .orElseThrow(() -> new BadRequestException("El destinatario indicado no existe"));
        if (dest.getUsuario() == null || !clienteUsuarioId.equals(dest.getUsuario().getId())) {
            throw new BadRequestException("Solo puedes asociar destinatarios propios");
        }
        Long actualId = gm.getConsignatario() != null ? gm.getConsignatario().getId() : null;
        boolean cambioDestinatario = !consignatarioId.equals(actualId);
        gm.setConsignatario(dest);
        GuiaMaster saved = guiaMasterRepository.save(gm);
        if (cambioDestinatario) {
            propagarDestinatarioAPiezas(saved, dest);
        }
        return saved;
    }

    /**
     * Actualiza tracking base y/o destinatario de una guía propia del cliente.
     * Solo permitido mientras la guía esté en estado {@code INCOMPLETA} (i.e.,
     * ningún paquete recibido/despachado todavía).
     */
    @Transactional
    public GuiaMaster updateForCliente(Long guiaId, String nuevoTrackingBase, Long consignatarioId, Long clienteUsuarioId) {
        if (clienteUsuarioId == null) {
            throw new BadRequestException("Cliente no autenticado");
        }
        GuiaMaster gm = findByIdForCliente(guiaId, clienteUsuarioId);
        guardarSiEsEditablePorCliente(gm);

        if (nuevoTrackingBase != null) {
            String nuevoTb = normalizarTrackingBase(nuevoTrackingBase);
            if (nuevoTb == null) {
                throw new BadRequestException("El número de guía es obligatorio");
            }
            if (!nuevoTb.equalsIgnoreCase(gm.getTrackingBase())) {
                guiaMasterRepository.findByTrackingBaseIgnoreCase(nuevoTb).ifPresent(otra -> {
                    if (!otra.getId().equals(gm.getId())) {
                        throw new ConflictException("Ya existe otra guía con ese número");
                    }
                });
                gm.setTrackingBase(nuevoTb);
                renumerarPiezas(gm);
            }
        }

        boolean cambioDestinatario = false;
        Consignatario nuevoDest = null;
        if (consignatarioId != null) {
            Consignatario dest = consignatarioRepository.findById(consignatarioId)
                    .orElseThrow(() -> new BadRequestException("El destinatario indicado no existe"));
            if (dest.getUsuario() == null || !clienteUsuarioId.equals(dest.getUsuario().getId())) {
                throw new BadRequestException("Solo puedes asociar destinatarios propios");
            }
            Long actualId = gm.getConsignatario() != null ? gm.getConsignatario().getId() : null;
            cambioDestinatario = !consignatarioId.equals(actualId);
            gm.setConsignatario(dest);
            nuevoDest = dest;
        }

        GuiaMaster saved = guiaMasterRepository.save(gm);
        if (cambioDestinatario && nuevoDest != null) {
            propagarDestinatarioAPiezas(saved, nuevoDest);
        }
        sincronizarEstadoPaquetesSiLoteRecepcionAplica(saved.getId());
        recomputarEstado(saved.getId());
        return saved;
    }

    /**
     * Elimina una guía propia del cliente. Solo permitido mientras esté en
     * estado {@code INCOMPLETA}. Reusa la lógica completa de {@link #delete}.
     */
    @Transactional
    public void deleteForCliente(Long guiaId, Long clienteUsuarioId) {
        if (clienteUsuarioId == null) {
            throw new BadRequestException("Cliente no autenticado");
        }
        GuiaMaster gm = findByIdForCliente(guiaId, clienteUsuarioId);
        guardarSiEsEditablePorCliente(gm);
        delete(gm.getId());
    }

    /**
     * El cliente solo puede modificar sus guías mientras estén en estado
     * {@code INCOMPLETA} (es decir, mientras no se haya recibido ni despachado
     * ninguna pieza). Una vez la guía progrese su estado, queda inmutable
     * para el cliente.
     */
    private void guardarSiEsEditablePorCliente(GuiaMaster gm) {
        EstadoGuiaMaster estado = gm.getEstadoGlobal();
        if (estado != null
                && estado != EstadoGuiaMaster.EN_ESPERA_RECEPCION
                && estado != EstadoGuiaMaster.SIN_PIEZAS_REGISTRADAS) {
            throw new ConflictException(
                    "Solo puedes editar la guía mientras esté en estado inicial de registro. "
                            + "Esta guía ya tiene piezas en proceso (estado: " + estado + ").");
        }
    }

    /**
     * Elimina una guía master junto con todas sus piezas (paquetes) asociadas.
     * Limpia también los eventos de tracking de cada pieza y los outbox events
     * tanto de las piezas como de la guía. Operación de operario/admin.
     */
    @Transactional
    public void delete(Long guiaMasterId) {
        GuiaMaster gm = guiaMasterRepository.findById(guiaMasterId)
                .orElseThrow(() -> new ResourceNotFoundException("Guía master", guiaMasterId));
        List<Paquete> piezas = paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(gm.getId());
        for (Paquete p : piezas) {
            Long pid = p.getId();
            paqueteEstadoEventoRepository.deleteByPaqueteId(pid);
            outboxEventRepository.deleteByAggregateTypeAndAggregateId("PAQUETE", String.valueOf(pid));
            paqueteRepository.delete(p);
        }
        outboxEventRepository.deleteByAggregateTypeAndAggregateId("GUIA_MASTER", String.valueOf(gm.getId()));
        guiaMasterRepository.delete(gm);
    }

    @Transactional(readOnly = true)
    public List<GuiaMaster> findAllByCliente(Long clienteUsuarioId) {
        if (clienteUsuarioId == null) return List.of();
        return guiaMasterRepository.findByClienteUsuarioId(clienteUsuarioId);
    }

    /**
     * Devuelve la guía si pertenece al cliente indicado; lanza 404 en caso contrario
     * (no exponemos la existencia de guías ajenas).
     */
    @Transactional(readOnly = true)
    public GuiaMaster findByIdForCliente(Long id, Long clienteUsuarioId) {
        GuiaMaster gm = guiaMasterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Guía", id));
        if (gm.getClienteUsuario() == null || !gm.getClienteUsuario().getId().equals(clienteUsuarioId)) {
            throw new ResourceNotFoundException("Guía", id);
        }
        return gm;
    }

    @Transactional(readOnly = true)
    public GuiaMaster findById(Long id) {
        return guiaMasterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Guía master", id));
    }

    @Transactional(readOnly = true)
    public GuiaMaster findByTrackingBase(String trackingBase) {
        String tb = normalizarTrackingBase(trackingBase);
        if (tb == null) {
            throw new BadRequestException("El tracking base es obligatorio");
        }
        return guiaMasterRepository.findByTrackingBaseIgnoreCase(tb)
                .orElseThrow(() -> new ResourceNotFoundException("Guía master", tb));
    }

    @Transactional(readOnly = true)
    public List<GuiaMaster> findAll() {
        return guiaMasterRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<GuiaMaster> findByEstados(java.util.Collection<EstadoGuiaMaster> estados) {
        if (estados == null || estados.isEmpty()) {
            return guiaMasterRepository.findAll();
        }
        return guiaMasterRepository.findByEstadoGlobalIn(estados);
    }

    /**
     * Variante paginada del listado de guías master con búsqueda libre.
     * <p>Campos contemplados por {@code q}: {@code trackingBase} (tracking),
     * {@code consignatario.nombre}, {@code consignatario.codigo},
     * {@code clienteUsuario.username}, {@code clienteUsuario.email}.</p>
     */
    @Transactional(readOnly = true)
    public Page<GuiaMaster> findAllPaginated(String q, java.util.Collection<EstadoGuiaMaster> estados,
                                             int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(200, size)),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<GuiaMaster> spec = SearchSpecifications.tokensLike(q,
                SearchSpecifications.field("trackingBase"),
                SearchSpecifications.path("consignatario", "nombre"),
                SearchSpecifications.path("consignatario", "codigo"),
                SearchSpecifications.path("clienteUsuario", "username"),
                SearchSpecifications.path("clienteUsuario", "email"));
        if (estados != null && !estados.isEmpty()) {
            final java.util.Collection<EstadoGuiaMaster> finalEstados = estados;
            spec = spec.and((root, query, cb) -> root.get("estadoGlobal").in(finalEstados));
        }
        return guiaMasterRepository.findAll(spec, pageable);
    }

    /** Variante paginada filtrada por cliente (rol cliente). */
    @Transactional(readOnly = true)
    public Page<GuiaMaster> findAllByClientePaginated(Long clienteUsuarioId, String q,
                                                      int page, int size) {
        if (clienteUsuarioId == null) {
            return Page.empty();
        }
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(200, size)),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<GuiaMaster> ownership = (root, query, cb) ->
                cb.equal(root.get("clienteUsuario").get("id"), clienteUsuarioId);
        Specification<GuiaMaster> textFilter = SearchSpecifications.tokensLike(q,
                SearchSpecifications.field("trackingBase"),
                SearchSpecifications.path("consignatario", "nombre"));
        return guiaMasterRepository.findAll(ownership.and(textFilter), pageable);
    }

    /**
     * Busca una guia master por su tracking_base y construye el DTO publico para tracking.
     * No expone PII del destinatario mas alla del nombre. Usado por el endpoint unificado
     * {@code GET /api/v1/tracking?codigo=...}.
     *
     * @return Optional vacio si no existe; el resolver decidira el fallback.
     */
    @Transactional(readOnly = true)
    public java.util.Optional<TrackingMasterResponse> findByTrackingBaseForTracking(String trackingBase) {
        String tb = normalizarTrackingBase(trackingBase);
        if (tb == null) {
            return java.util.Optional.empty();
        }
        java.util.Optional<GuiaMaster> opt = guiaMasterRepository.findByTrackingBaseIgnoreCase(tb);
        if (opt.isEmpty()) {
            return java.util.Optional.empty();
        }
        return java.util.Optional.of(buildTrackingMasterResponse(opt.get(), true));
    }

    /**
     * Construye el {@link TrackingMasterResponse} público (sin PII sensible) a partir
     * de una entidad {@link GuiaMaster} ya cargada. Reusable por:
     * <ul>
     *   <li>{@link #findByTrackingBaseForTracking(String)} — vista de la guía master.</li>
     *   <li>{@link PaqueteService} — para incluir el resumen + piezas hermanas dentro del
     *       tracking de una pieza individual.</li>
     * </ul>
     *
     * @param gm               guía master ya persistida.
     * @param incluirTimeline  si {@code true} incluye el feed agregado de eventos
     *                         ({@code timeline}); en la vista de pieza conviene pasar
     *                         {@code false} para no inflar la respuesta.
     */
    @Transactional(readOnly = true)
    public TrackingMasterResponse buildTrackingMasterResponse(GuiaMaster gm, boolean incluirTimeline) {
        List<Paquete> piezas = paqueteRepository.findByGuiaMasterTrackingBaseIgnoreCase(gm.getTrackingBase());
        Long enLoteRecepcionId = getIdEstadoEnLoteRecepcion();

        int registradas = piezas.size();
        int recibidas = (int) piezas.stream().filter(p -> piezaEnRecepcionBodega(p, enLoteRecepcionId)).count();
        int despachadas = (int) piezas.stream().filter(this::piezaDespachada).count();

        List<TrackingPiezaItem> piezasItems = piezas.stream()
                .map(p -> {
                    EstadoRastreo er = p.getEstadoRastreo();
                    return TrackingPiezaItem.builder()
                            .numeroGuia(p.getNumeroGuia())
                            .piezaNumero(p.getPiezaNumero())
                            .piezaTotal(p.getPiezaTotal())
                            .estadoActualCodigo(er != null ? er.getCodigo() : null)
                            .estadoActualNombre(er != null ? er.getNombre() : null)
                            .fechaEstadoDesde(p.getFechaEstadoActualDesde())
                            .enFlujoAlterno(Boolean.TRUE.equals(p.getEnFlujoAlterno()))
                            .bloqueado(Boolean.TRUE.equals(p.getBloqueado()))
                            .build();
                })
                .toList();

        LocalDateTime ultimaActualizacion = piezas.stream()
                .map(Paquete::getFechaEstadoActualDesde)
                .filter(java.util.Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(gm.getCreatedAt());

        // Para la vista pública: si la guía master no tiene consignatario directo
        // (puede pasar en históricos o cuando aún no se ha asociado), hacer fallback
        // al destinatario de la primera pieza disponible. Las piezas SIEMPRE tienen
        // consignatario NOT NULL, así que el fallback nunca queda vacío si hay piezas.
        // SCD2: si hay snapshot congelado en la guia, ese es la fuente de verdad
        // para el publico (id, nombre, provincia y canton historicos).
        ConsignatarioVersion destSnapshot = gm.getConsignatarioVersion();
        Consignatario dest = gm.getConsignatario();
        if (dest == null && !piezas.isEmpty()) {
            dest = piezas.stream()
                    .map(Paquete::getConsignatario)
                    .filter(java.util.Objects::nonNull)
                    .findFirst()
                    .orElse(null);
        }

        List<TrackingMasterEventoItem> timeline = List.of();
        if (incluirTimeline) {
            // Sprint 2: feed agregado de eventos de TODAS las piezas, ordenado por occurredAt.
            List<PaqueteEstadoEvento> eventos = paqueteEstadoEventoRepository
                    .findByGuiaMasterIdOrderByOccurredAtAsc(gm.getId());
            timeline = eventos.stream()
                    .filter(e -> e.getEstadoDestino() != null
                            && Boolean.TRUE.equals(e.getEstadoDestino().getPublicoTracking()))
                    .map(e -> {
                        Paquete pq = e.getPaquete();
                        EstadoRastreo destino = e.getEstadoDestino();
                        return TrackingMasterEventoItem.builder()
                                .numeroGuia(pq != null ? pq.getNumeroGuia() : null)
                                .piezaNumero(pq != null ? pq.getPiezaNumero() : null)
                                .piezaTotal(pq != null ? pq.getPiezaTotal() : gm.getTotalPiezasEsperadas())
                                .estadoCodigo(destino != null ? destino.getCodigo() : null)
                                .estadoNombre(destino != null ? destino.getNombre() : null)
                                .eventoTipo(e.getEventType() != null ? e.getEventType().name() : null)
                                .occurredAt(e.getOccurredAt())
                                .build();
                    })
                    .toList();
        }

        TrackingConsignatarioDTO consignatarioDto;
        if (destSnapshot != null) {
            consignatarioDto = TrackingConsignatarioDTO.builder()
                    .id(dest != null ? dest.getId() : null)
                    .nombre(destSnapshot.getNombre())
                    .provincia(destSnapshot.getProvincia())
                    .canton(destSnapshot.getCanton())
                    .build();
        } else if (dest != null) {
            consignatarioDto = TrackingConsignatarioDTO.builder()
                    .id(dest.getId())
                    .nombre(dest.getNombre())
                    .provincia(dest.getProvincia())
                    .canton(dest.getCanton())
                    .build();
        } else {
            consignatarioDto = null;
        }

        return TrackingMasterResponse.builder()
                .trackingBase(gm.getTrackingBase())
                .estadoGlobal(gm.getEstadoGlobal())
                .totalPiezasEsperadas(gm.getTotalPiezasEsperadas())
                .piezasRegistradas(registradas)
                .piezasRecibidas(recibidas)
                .piezasDespachadas(despachadas)
                .consignatario(consignatarioDto)
                .piezas(piezasItems)
                .fechaPrimeraRecepcion(gm.getFechaPrimeraRecepcion())
                .fechaPrimeraPiezaDespachada(gm.getFechaPrimeraPiezaDespachada())
                .ultimaActualizacion(ultimaActualizacion)
                .timeline(timeline)
                .build();
    }

    @Transactional(readOnly = true)
    public List<Paquete> listarPiezas(Long guiaMasterId) {
        findById(guiaMasterId);
        return paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(guiaMasterId);
    }

    /**
     * Valida que se pueda asignar la pieza con el {@code piezaNumero} indicado a la guía.
     * Si {@code piezaNumero} es null, asigna el siguiente disponible (siguiente al máximo + 1).
     * Retorna el número de pieza asignado junto con el total esperado.
     */
    @Transactional
    public int[] validarYAsignarPieza(GuiaMaster gm, Integer piezaNumero) {
        int total = Optional.ofNullable(gm.getTotalPiezasEsperadas()).orElse(0);
        if (total < 1) {
            throw new BadRequestException("La guía master no tiene total de piezas definido");
        }
        int numero;
        if (piezaNumero != null) {
            if (piezaNumero < 1 || piezaNumero > total) {
                throw new BadRequestException("Número de pieza fuera de rango 1.." + total);
            }
            if (paqueteRepository.existsByGuiaMasterIdAndPiezaNumero(gm.getId(), piezaNumero)) {
                throw new ConflictException("Ya existe una pieza " + piezaNumero + "/" + total + " para esta guía");
            }
            numero = piezaNumero;
        } else {
            List<Paquete> existentes = paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(gm.getId());
            if (existentes.size() >= total) {
                throw new ConflictException("La guía ya tiene todas las piezas asignadas (" + total + ")");
            }
            int next = existentes.stream()
                    .map(Paquete::getPiezaNumero)
                    .filter(n -> n != null)
                    .mapToInt(Integer::intValue)
                    .max()
                    .orElse(0) + 1;
            if (next > total) next = total;
            numero = next;
        }
        return new int[]{numero, total};
    }

    /**
     * Recalcula y persiste {@code estadoGlobal} de la guia en funcion del
     * estado de cada pieza. Si la guia esta congelada (estado terminal o
     * EN_REVISION), no se sobreescribe. Si el estado cambia, se registra
     * en el historial como {@link TipoCambioEstadoGuiaMaster#RECALCULO_AUTOMATICO}.
     */
    @Transactional
    public void recomputarEstado(Long guiaMasterId) {
        if (guiaMasterId == null) return;
        GuiaMaster gm = guiaMasterRepository.findById(guiaMasterId).orElse(null);
        if (gm == null) return;
        if (gm.getEstadoGlobal() != null && gm.getEstadoGlobal().estaCongeladoParaRecalculo()) {
            return;
        }
        List<Paquete> piezas = paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(gm.getId());
        Long enLoteRecepcionId = getIdEstadoEnLoteRecepcion();
        long enRecepcion = piezas.stream().filter(p -> piezaEnRecepcionBodega(p, enLoteRecepcionId)).count();
        long despachadas = piezas.stream().filter(this::piezaDespachada).count();
        boolean cambios = false;
        if (enRecepcion > 0 && gm.getFechaPrimeraRecepcion() == null) {
            gm.setFechaPrimeraRecepcion(LocalDateTime.now());
            cambios = true;
        }
        if (despachadas > 0 && gm.getFechaPrimeraPiezaDespachada() == null) {
            gm.setFechaPrimeraPiezaDespachada(LocalDateTime.now());
            cambios = true;
        }
        // SCD2: al primer despacho de pieza, congelamos el destinatario para
        // que cambios posteriores en el maestro no muten lo ya despachado.
        if (despachadas > 0 && gm.getConsignatarioVersion() == null && gm.getConsignatario() != null) {
            congelarDestinatarioVersion(gm);
            cambios = true;
        }
        EstadoGuiaMaster anterior = gm.getEstadoGlobal();
        EstadoGuiaMaster nuevo = calcularEstado(gm);
        if (nuevo != anterior) {
            gm.setEstadoGlobal(nuevo);
            // Si el recalculo desemboca en DESPACHO_COMPLETADO, dejamos
            // huella de auditoria de cierre (sin actor: lo provoca el flujo).
            if (nuevo == EstadoGuiaMaster.DESPACHO_COMPLETADO) {
                gm.setCerradaEn(LocalDateTime.now());
                gm.setTipoCierre(TipoCierreGuiaMaster.DESPACHO_COMPLETADO);
                gm.setMotivoCierre("Todas las piezas fueron despachadas");
            }
            cambios = true;
        }
        if (cambios) {
            GuiaMaster saved = guiaMasterRepository.save(gm);
            if (nuevo != anterior) {
                registrarHistorial(saved, anterior, nuevo,
                        TipoCambioEstadoGuiaMaster.RECALCULO_AUTOMATICO,
                        "Recalculo automatico segun avance de piezas", null);
            }
        }
    }

    /**
     * Congela el snapshot del destinatario en la guia. Idempotente: si la
     * guia ya tiene {@code destinatarioVersion}, no hace nada. Resuelve
     * la version vigente del destinatario maestro o, si por algun motivo
     * todavia no existiera (deberia, porque se crea junto al maestro),
     * la materializa en ese instante.
     */
    private void congelarDestinatarioVersion(GuiaMaster gm) {
        if (gm == null) return;
        if (gm.getConsignatarioVersion() != null) return;
        Consignatario dest = gm.getConsignatario();
        if (dest == null) return;
        ConsignatarioVersion vigente = consignatarioVersionService.getVersionVigente(dest.getId())
                .orElseGet(() -> consignatarioVersionService.crearNuevaVersion(dest, null));
        gm.setConsignatarioVersion(vigente);
        gm.setConsignatarioCongeladoEn(LocalDateTime.now());
    }

    /**
     * Cierra manualmente la guia asumiendo que las piezas faltantes nunca
     * llegaran. Solo aplica si al menos hay una pieza despachada y aun
     * faltan piezas por llegar. Persiste motivo, actor y tipo de cierre,
     * y registra el cambio en el historial.
     *
     * @param actorUsuarioId usuario operario que realiza la accion (puede ser
     *                       null cuando lo dispara el job de timeout).
     * @param tipoCierre     {@link TipoCierreGuiaMaster#DESPACHO_INCOMPLETO_MANUAL}
     *                       cuando es manual, o {@link TipoCierreGuiaMaster#DESPACHO_INCOMPLETO_TIMEOUT}
     *                       cuando lo dispara el scheduler.
     */
    @Transactional
    public GuiaMaster cerrarConFaltante(Long guiaMasterId, String motivo,
                                        Long actorUsuarioId,
                                        TipoCierreGuiaMaster tipoCierre) {
        GuiaMaster gm = findById(guiaMasterId);
        EstadoGuiaMaster anterior = gm.getEstadoGlobal();
        if (anterior != null && anterior.esTerminal()) {
            throw new BadRequestException("La guia ya esta cerrada (estado: " + anterior + ")");
        }
        List<Paquete> piezas = paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(guiaMasterId);
        long despachadas = piezas.stream().filter(this::piezaDespachada).count();
        int total = Optional.ofNullable(gm.getTotalPiezasEsperadas()).orElse(0);
        if (despachadas == 0) {
            throw new BadRequestException("No se puede cerrar con faltante: ninguna pieza ha sido despachada");
        }
        if (total > 0 && piezas.size() >= total && piezas.stream().allMatch(this::piezaDespachada)) {
            throw new BadRequestException("La guia ya esta completa y despachada; no requiere cierre con faltante");
        }
        gm.setEstadoGlobal(EstadoGuiaMaster.DESPACHO_INCOMPLETO);
        String motivoLimpio = Strings.trimOrNull(motivo);
        Usuario actor = resolverUsuario(actorUsuarioId);
        TipoCierreGuiaMaster tipoFinal = tipoCierre != null
                ? tipoCierre
                : TipoCierreGuiaMaster.DESPACHO_INCOMPLETO_MANUAL;
        gm.setCerradaEn(LocalDateTime.now());
        gm.setCerradaPorUsuario(actor);
        gm.setTipoCierre(tipoFinal);
        gm.setMotivoCierre(motivoLimpio);
        GuiaMaster saved = guiaMasterRepository.save(gm);
        TipoCambioEstadoGuiaMaster tipoCambio = (tipoFinal == TipoCierreGuiaMaster.DESPACHO_INCOMPLETO_TIMEOUT)
                ? TipoCambioEstadoGuiaMaster.AUTO_CIERRE_TIMEOUT
                : TipoCambioEstadoGuiaMaster.CIERRE_MANUAL_FALTANTE;
        registrarHistorial(saved, anterior, EstadoGuiaMaster.DESPACHO_INCOMPLETO,
                tipoCambio, motivoLimpio, actor);
        if (motivoLimpio != null) {
            log.info("GuiaMaster {} cerrada con faltante ({}). Motivo: {}", gm.getId(), tipoFinal, motivoLimpio);
        }
        return saved;
    }

    /**
     * Anula una guia antes de despachar. Solo permitido si NO hay piezas
     * despachadas todavia (de lo contrario, el operario debe usar
     * {@link #cerrarConFaltante}). Estado destino: {@link EstadoGuiaMaster#CANCELADA}.
     */
    @Transactional
    public GuiaMaster cancelar(Long guiaMasterId, String motivo, Long actorUsuarioId) {
        GuiaMaster gm = findById(guiaMasterId);
        EstadoGuiaMaster anterior = gm.getEstadoGlobal();
        if (anterior != null && anterior.esTerminal()) {
            throw new BadRequestException("La guia ya esta en estado terminal (" + anterior + ") y no se puede cancelar");
        }
        List<Paquete> piezas = paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(guiaMasterId);
        long despachadas = piezas.stream().filter(this::piezaDespachada).count();
        if (despachadas > 0) {
            throw new BadRequestException(
                    "No se puede cancelar: hay piezas ya despachadas. Usa 'Cerrar con faltante' en su lugar.");
        }
        String motivoLimpio = Strings.trimOrNull(motivo);
        if (motivoLimpio == null) {
            throw new BadRequestException("Debes indicar el motivo de la cancelacion");
        }
        Usuario actor = resolverUsuario(actorUsuarioId);
        gm.setEstadoGlobal(EstadoGuiaMaster.CANCELADA);
        gm.setCerradaEn(LocalDateTime.now());
        gm.setCerradaPorUsuario(actor);
        gm.setTipoCierre(TipoCierreGuiaMaster.CANCELACION);
        gm.setMotivoCierre(motivoLimpio);
        GuiaMaster saved = guiaMasterRepository.save(gm);
        registrarHistorial(saved, anterior, EstadoGuiaMaster.CANCELADA,
                TipoCambioEstadoGuiaMaster.CANCELACION, motivoLimpio, actor);
        return saved;
    }

    /**
     * Pausa administrativa: marca la guia como EN_REVISION para que el
     * recalculo automatico no la sobreescriba mientras un operario valida algo.
     * Solo permitido sobre guias que NO estan en estado terminal.
     */
    @Transactional
    public GuiaMaster marcarEnRevision(Long guiaMasterId, String motivo, Long actorUsuarioId) {
        GuiaMaster gm = findById(guiaMasterId);
        EstadoGuiaMaster anterior = gm.getEstadoGlobal();
        if (anterior == EstadoGuiaMaster.EN_REVISION) {
            throw new BadRequestException("La guia ya esta en revision");
        }
        if (anterior != null && anterior.esTerminal()) {
            throw new BadRequestException("No se puede revisar una guia ya cerrada (" + anterior + ")");
        }
        Usuario actor = resolverUsuario(actorUsuarioId);
        gm.setEstadoGlobal(EstadoGuiaMaster.EN_REVISION);
        GuiaMaster saved = guiaMasterRepository.save(gm);
        registrarHistorial(saved, anterior, EstadoGuiaMaster.EN_REVISION,
                TipoCambioEstadoGuiaMaster.MARCAR_REVISION,
                Strings.trimOrNull(motivo), actor);
        return saved;
    }

    /**
     * Saca la guia de EN_REVISION y vuelve al estado derivado por sus
     * piezas. Si la guia no esta en revision, no hace nada.
     */
    @Transactional
    public GuiaMaster salirDeRevision(Long guiaMasterId, String motivo, Long actorUsuarioId) {
        GuiaMaster gm = findById(guiaMasterId);
        EstadoGuiaMaster anterior = gm.getEstadoGlobal();
        if (anterior != EstadoGuiaMaster.EN_REVISION) {
            throw new BadRequestException("La guia no esta en revision");
        }
        Usuario actor = resolverUsuario(actorUsuarioId);
        // Cambiamos primero a un estado no terminal placeholder para que
        // el calculo derive correctamente desde piezas. Como EN_REVISION
        // no esta en "congelados" cuando lo vamos a recalcular aqui,
        // forzamos manualmente: ponemos un estado provisional y luego
        // calculamos.
        gm.setEstadoGlobal(EstadoGuiaMaster.EN_ESPERA_RECEPCION);
        EstadoGuiaMaster derivado = calcularEstado(gm);
        gm.setEstadoGlobal(derivado);
        GuiaMaster saved = guiaMasterRepository.save(gm);
        registrarHistorial(saved, anterior, derivado,
                TipoCambioEstadoGuiaMaster.SALIR_REVISION,
                Strings.trimOrNull(motivo), actor);
        return saved;
    }

    /**
     * Reabre una guia previamente terminal (DESPACHO_COMPLETADO,
     * DESPACHO_INCOMPLETO o CANCELADA). Limpia la auditoria de cierre y
     * vuelve al estado derivado por sus piezas.
     */
    @Transactional
    public GuiaMaster reabrir(Long guiaMasterId, String motivo, Long actorUsuarioId) {
        GuiaMaster gm = findById(guiaMasterId);
        EstadoGuiaMaster anterior = gm.getEstadoGlobal();
        if (anterior == null || !anterior.esTerminal()) {
            throw new BadRequestException("Solo se pueden reabrir guias en estado terminal");
        }
        String motivoLimpio = Strings.trimOrNull(motivo);
        if (motivoLimpio == null) {
            throw new BadRequestException("Debes indicar el motivo de la reapertura");
        }
        Usuario actor = resolverUsuario(actorUsuarioId);
        // Limpiamos auditoria de cierre y recalculamos a partir de piezas.
        gm.setCerradaEn(null);
        gm.setCerradaPorUsuario(null);
        gm.setTipoCierre(null);
        gm.setMotivoCierre(null);
        // Estado provisional para que calcularEstado no se cortocircuite
        gm.setEstadoGlobal(EstadoGuiaMaster.EN_ESPERA_RECEPCION);
        EstadoGuiaMaster derivado = calcularEstado(gm);
        gm.setEstadoGlobal(derivado);
        GuiaMaster saved = guiaMasterRepository.save(gm);
        registrarHistorial(saved, anterior, derivado,
                TipoCambioEstadoGuiaMaster.REAPERTURA, motivoLimpio, actor);
        return saved;
    }

    /** Obtiene el historial de cambios de estado mas reciente primero. */
    @Transactional(readOnly = true)
    public List<GuiaMasterEstadoHistorial> listarHistorial(Long guiaMasterId) {
        findById(guiaMasterId);
        return historialRepository.findByGuiaMasterIdOrderByCambiadoEnDescIdDesc(guiaMasterId);
    }

    /**
     * Convierte el historial a DTO. Se mantiene aqui (en vez de en el
     * controller) porque accede a usuarios via lazy loading dentro del
     * scope transaccional.
     */
    @Transactional(readOnly = true)
    public List<com.ecubox.ecubox_backend.dto.GuiaMasterEstadoHistorialDTO> listarHistorialDTO(Long guiaMasterId) {
        return listarHistorial(guiaMasterId).stream()
                .map(h -> com.ecubox.ecubox_backend.dto.GuiaMasterEstadoHistorialDTO.builder()
                        .id(h.getId())
                        .guiaMasterId(h.getGuiaMaster() != null ? h.getGuiaMaster().getId() : null)
                        .estadoAnterior(h.getEstadoAnterior() != null ? h.getEstadoAnterior().name() : null)
                        .estadoNuevo(h.getEstadoNuevo() != null ? h.getEstadoNuevo().name() : null)
                        .tipoCambio(h.getTipoCambio() != null ? h.getTipoCambio().name() : null)
                        .motivo(h.getMotivo())
                        .cambiadoPorUsuarioId(h.getCambiadoPorUsuario() != null ? h.getCambiadoPorUsuario().getId() : null)
                        .cambiadoPorUsuarioNombre(h.getCambiadoPorUsuario() != null ? h.getCambiadoPorUsuario().getUsername() : null)
                        .cambiadoEn(h.getCambiadoEn())
                        .build())
                .toList();
    }

    private void registrarHistorial(GuiaMaster gm,
                                    EstadoGuiaMaster anterior,
                                    EstadoGuiaMaster nuevo,
                                    TipoCambioEstadoGuiaMaster tipoCambio,
                                    String motivo,
                                    Usuario actor) {
        try {
            GuiaMasterEstadoHistorial h = GuiaMasterEstadoHistorial.builder()
                    .guiaMaster(gm)
                    .estadoAnterior(anterior)
                    .estadoNuevo(nuevo)
                    .tipoCambio(tipoCambio)
                    .motivo(motivo)
                    .cambiadoPorUsuario(actor)
                    .cambiadoEn(LocalDateTime.now())
                    .build();
            historialRepository.save(h);
        } catch (Exception ex) {
            // El historial es importante para auditoria pero no debe
            // bloquear la operacion principal si falla. Logueamos a ERROR
            // para que se detecte en monitoreo.
            log.error("No se pudo registrar historial de estado para GuiaMaster {} ({} -> {})",
                    gm != null ? gm.getId() : null, anterior, nuevo, ex);
        }
    }

    private Usuario resolverUsuario(Long usuarioId) {
        if (usuarioId == null) return null;
        return usuarioRepository.findById(usuarioId).orElse(null);
    }

    /**
     * Resumen para alertas/badges del despacho parcial.
     */
    public record DespachoParcialResumen(long recibidas, long despachadas, int total, int minPiezasParaDespacho,
                                         boolean listaParaDespachoParcial,
                                         boolean despachoParcialEnCurso) {
    }

    @Transactional(readOnly = true)
    public DespachoParcialResumen resumenDespachoParcial(Long guiaMasterId) {
        GuiaMaster gm = findById(guiaMasterId);
        int total = Optional.ofNullable(gm.getTotalPiezasEsperadas()).orElse(0);
        List<Paquete> piezas = paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(gm.getId());
        Long enLoteRecepcionId = getIdEstadoEnLoteRecepcion();
        long recibidas = piezas.stream().filter(p -> piezaEnRecepcionBodega(p, enLoteRecepcionId)).count();
        long despachadas = piezas.stream().filter(this::piezaDespachada).count();
        int minPiezas = parametroSistemaService.getGuiaMasterMinPiezasDespachoParcial();
        boolean lista = recibidas >= minPiezas && despachadas < total;
        boolean enCurso = despachadas > 0 && despachadas < total;
        return new DespachoParcialResumen(recibidas, despachadas, total, minPiezas, lista, enCurso);
    }

    /**
     * Calcula el estado global sin persistirlo. Si la guia ya esta en
     * un estado terminal o EN_REVISION, mantiene su estado (no se
     * sobreescribe por el calculo derivado).
     *
     * <p>Recepcion en bodega: pieza cuyo {@code estadoRastreo} coincide con el
     * id configurado como "en lote de recepcion" (mismo que aplica el flujo de
     * lote en {@link PaqueteService#aplicarEstadoEnLoteRecepcion}). Sin consultar
     * tablas de lote en cada calculo.</p>
     *
     * <p>Si {@code totalPiezasEsperadas} es null, el denominador para parcial/completo
     * es la cantidad de piezas ya registradas en la guia.</p>
     */
    EstadoGuiaMaster calcularEstado(GuiaMaster gm) {
        if (gm == null) return EstadoGuiaMaster.EN_ESPERA_RECEPCION;
        EstadoGuiaMaster actual = gm.getEstadoGlobal();
        if (actual != null && actual.estaCongeladoParaRecalculo()) {
            return actual;
        }
        Integer totalRaw = gm.getTotalPiezasEsperadas();
        List<Paquete> piezas = paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(gm.getId());
        if (piezas.isEmpty()) {
            return EstadoGuiaMaster.SIN_PIEZAS_REGISTRADAS;
        }
        int registradas = piezas.size();
        Long enLoteRecepcionId = getIdEstadoEnLoteRecepcion();
        long enRecepcion = piezas.stream().filter(p -> piezaEnRecepcionBodega(p, enLoteRecepcionId)).count();
        long despachadas = piezas.stream().filter(this::piezaDespachada).count();

        boolean despachoCompleto = (totalRaw != null && totalRaw >= 1)
                ? (registradas >= totalRaw && despachadas >= totalRaw)
                : (registradas > 0 && despachadas >= registradas);
        if (despachadas > 0) {
            if (despachoCompleto) {
                return EstadoGuiaMaster.DESPACHO_COMPLETADO;
            }
            return EstadoGuiaMaster.DESPACHO_PARCIAL;
        }

        boolean recepcionCompleta = (totalRaw != null && totalRaw >= 1)
                ? (registradas >= totalRaw && enRecepcion >= totalRaw)
                : (registradas > 0 && enRecepcion >= registradas);
        if (recepcionCompleta) {
            return EstadoGuiaMaster.RECEPCION_COMPLETA;
        }
        if (enRecepcion > 0) {
            return EstadoGuiaMaster.RECEPCION_PARCIAL;
        }
        return EstadoGuiaMaster.EN_ESPERA_RECEPCION;
    }

    /**
     * Propaga un cambio de destinatario de la guia master a TODAS sus piezas:
     * cambia {@code consignatario} y regenera {@code ref} con el codigoBase
     * del nuevo destinatario via {@link CodigoSecuenciaService}.
     *
     * <p>Se bloquea si alguna pieza ya fue recibida o despachada para no romper
     * la trazabilidad. La validacion SCD2 (snapshot congelado) la hace el
     * llamador antes de invocar este metodo.
     */
    private void propagarDestinatarioAPiezas(GuiaMaster gm, Consignatario nuevoDest) {
        if (gm == null || nuevoDest == null) return;
        List<Paquete> piezas = paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(gm.getId());
        if (piezas.isEmpty()) return;
        Long enLoteRecepcionId = getIdEstadoEnLoteRecepcion();
        for (Paquete p : piezas) {
            if (piezaEnRecepcionBodega(p, enLoteRecepcionId) || piezaDespachada(p)) {
                throw new ConflictException(
                        "No se puede cambiar el destinatario: la pieza " + p.getPiezaNumero()
                                + "/" + p.getPiezaTotal() + " ya fue recibida o despachada.");
            }
        }
        String codigoBase = PaqueteService.resolverCodigoBase(nuevoDest);
        for (Paquete p : piezas) {
            p.setConsignatario(nuevoDest);
            p.setRef(codigoSecuenciaService.nextRefPaquete(nuevoDest.getId(), codigoBase));
        }
        paqueteRepository.saveAll(piezas);
    }

    /**
     * Pieza en recepcion en bodega: coincide con el estado de rastreo configurado
     * como "en lote de recepcion" (asignado al registrar el consolidado en lote).
     */
    private boolean piezaEnRecepcionBodega(Paquete p, Long estadoEnLoteRecepcionId) {
        if (p == null || estadoEnLoteRecepcionId == null) return false;
        EstadoRastreo er = p.getEstadoRastreo();
        return er != null && estadoEnLoteRecepcionId.equals(er.getId());
    }

    /**
     * Una pieza se considera "despachada" cuando tiene una saca asignada a un
     * despacho (es decir, ya fue enrutada en un despacho concreto). Esto alinea
     * la semantica del backend con la del frontend, que muestra "Despachada"
     * cuando hay {@code despachoId}/{@code despachoNumeroGuia}.
     */
    private boolean piezaDespachada(Paquete p) {
        if (p == null) return false;
        return p.getSaca() != null && p.getSaca().getDespacho() != null;
    }

    private Long getIdEstadoEnLoteRecepcion() {
        EstadosRastreoPorPuntoDTO cfg = parametroSistemaService.getEstadosRastreoPorPunto();
        if (cfg == null) return null;
        Long id = cfg.getEstadoRastreoEnLoteRecepcionId();
        if (id != null && id.equals(cfg.getEstadoRastreoRegistroPaqueteId())) {
            return null;
        }
        return id;
    }

    private static String normalizarTrackingBase(String s) {
        if (s == null) return null;
        String trimmed = s.trim();
        if (trimmed.isEmpty()) return null;
        return trimmed;
    }

    /**
     * Compone el {@code numeroGuia} visible al usuario como {@code "<trackingBase> N/M"}.
     * Si la guía o el número de pieza son nulos, devuelve null.
     * Delega en {@link com.ecubox.ecubox_backend.entity.Paquete#componerNumeroGuia}
     * para mantener un único generador canónico.
     */
    public static String componerNumeroGuia(GuiaMaster gm, Integer piezaNumero) {
        if (gm == null || gm.getTrackingBase() == null || piezaNumero == null) return null;
        Integer total = gm.getTotalPiezasEsperadas();
        int piezaTotal = total != null ? total : piezaNumero;
        return com.ecubox.ecubox_backend.entity.Paquete.componerNumeroGuia(
                gm.getTrackingBase(), piezaNumero, piezaTotal);
    }

    /**
     * Estados en los que la guia ya no avanzara mas en el flujo
     * automatico (terminales). Equivale a {@link EstadoGuiaMaster#terminales()}
     * pero devuelve {@link List} mutable para retro-compatibilidad
     * con codigo antiguo que esperaba modificarla.
     */
    public static List<EstadoGuiaMaster> estadosFinalizados() {
        return new ArrayList<>(EstadoGuiaMaster.terminales());
    }

    /**
     * Registra en outbox la confirmación operario de despacho parcial con faltante.
     * Devuelve la guía actualizada (sin cambiar el estado, solo deja huella).
     */
    @Transactional
    public GuiaMaster confirmarDespachoParcial(Long guiaMasterId, Long piezaId, String motivo, Long actorUsuarioId) {
        GuiaMaster gm = findById(guiaMasterId);
        DespachoParcialResumen resumen = resumenDespachoParcial(guiaMasterId);
        Map<String, Object> payload = new LinkedHashMap<>();
        UUID eventId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        payload.put("eventId", eventId);
        payload.put("guiaMasterId", gm.getId());
        payload.put("trackingBase", gm.getTrackingBase());
        payload.put("piezaId", piezaId);
        payload.put("recibidas", resumen.recibidas());
        payload.put("despachadas", resumen.despachadas());
        payload.put("totalEsperadas", resumen.total());
        payload.put("minPiezasParaDespacho", resumen.minPiezasParaDespacho());
        payload.put("motivo", Strings.trimOrNull(motivo));
        payload.put("actorUsuarioId", actorUsuarioId);
        payload.put("occurredAt", now);

        OutboxEvent outboxEvent = OutboxEvent.builder()
                .eventId(eventId)
                .aggregateType("GUIA_MASTER")
                .aggregateId(String.valueOf(gm.getId()))
                .eventType("PIEZA_DESPACHADA_CON_FALTANTE")
                .payloadJson(toJson(payload))
                .status(OutboxEventStatus.PENDING)
                .attempts(0)
                .nextAttemptAt(now)
                .createdAt(now)
                .build();
        outboxEventRepository.save(outboxEvent);
        return gm;
    }

    /**
     * Resumen agregado para el "/inicio" del cliente final.
     * Calcula conteos por estado, totales, piezas en tránsito, recientes y
     * próximas a despacharse a partir de las guías propias del cliente.
     */
    @Transactional(readOnly = true)
    public MiInicioDashboardDTO dashboardForCliente(Long clienteUsuarioId) {
        Map<String, Long> conteos = new LinkedHashMap<>();
        for (EstadoGuiaMaster est : EstadoGuiaMaster.values()) {
            conteos.put(est.name(), 0L);
        }
        if (clienteUsuarioId == null) {
            return MiInicioDashboardDTO.builder()
                    .conteosPorEstado(conteos)
                    .guiasRecientes(List.of())
                    .guiasProximasACerrar(List.of())
                    .build();
        }

        List<GuiaMaster> guias = guiaMasterRepository.findByClienteUsuarioId(clienteUsuarioId);
        List<GuiaMasterDTO> dtos = guias.stream()
                .map(gm -> toDTO(gm, List.of()))
                .toList();

        long totalGuias = dtos.size();
        long sinTotal = 0;
        long piezasEnTransito = 0;
        Set<EstadoGuiaMaster> finalizados = EnumSet.copyOf(estadosFinalizados());

        for (GuiaMasterDTO dto : dtos) {
            String estado = dto.getEstadoGlobal();
            if (estado != null) {
                conteos.compute(estado, (k, v) -> v == null ? 1L : v + 1L);
            }
            if (dto.getTotalPiezasEsperadas() == null) {
                sinTotal++;
            }
            EstadoGuiaMaster est = estado != null ? EstadoGuiaMaster.valueOf(estado) : null;
            if (est == null || !finalizados.contains(est)) {
                int registradas = Optional.ofNullable(dto.getPiezasRegistradas()).orElse(0);
                int despachadas = Optional.ofNullable(dto.getPiezasDespachadas()).orElse(0);
                piezasEnTransito += Math.max(0, registradas - despachadas);
            }
        }

        long activas = conteos.entrySet().stream()
                .filter(e -> {
                    EstadoGuiaMaster est = EstadoGuiaMaster.valueOf(e.getKey());
                    return !finalizados.contains(est);
                })
                .mapToLong(Map.Entry::getValue).sum();
        long cerradas = totalGuias - activas;

        List<GuiaMasterDTO> recientes = dtos.stream()
                .sorted(Comparator.comparing(
                        GuiaMasterDTO::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(5)
                .toList();

        Set<EstadoGuiaMaster> proximas = EnumSet.of(
                EstadoGuiaMaster.RECEPCION_PARCIAL,
                EstadoGuiaMaster.RECEPCION_COMPLETA);
        List<GuiaMasterDTO> proximasACerrar = dtos.stream()
                .filter(d -> {
                    EstadoGuiaMaster est = d.getEstadoGlobal() != null
                            ? EstadoGuiaMaster.valueOf(d.getEstadoGlobal()) : null;
                    boolean estadoOk = est != null && proximas.contains(est);
                    boolean lista = Boolean.TRUE.equals(d.getListaParaDespachoParcial());
                    return estadoOk || lista;
                })
                .sorted(Comparator.comparing(
                        GuiaMasterDTO::getFechaPrimeraRecepcion,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(5)
                .toList();

        long totalDestinatarios = consignatarioRepository.countByUsuarioId(clienteUsuarioId);

        return MiInicioDashboardDTO.builder()
                .conteosPorEstado(conteos)
                .totalGuias(totalGuias)
                .totalGuiasActivas(activas)
                .totalGuiasCerradas(cerradas)
                .totalGuiasSinTotalDefinido(sinTotal)
                .totalDestinatarios(totalDestinatarios)
                .piezasEnTransito(piezasEnTransito)
                .guiasRecientes(recientes)
                .guiasProximasACerrar(proximasACerrar)
                .build();
    }

    @Transactional(readOnly = true)
    public GuiaMasterDashboardDTO buildDashboard(int topAntiguas) {
        Map<String, Long> conteos = new LinkedHashMap<>();
        for (EstadoGuiaMaster est : EstadoGuiaMaster.values()) {
            conteos.put(est.name(), 0L);
        }
        for (var row : guiaMasterRepository.countAgrupadoPorEstado()) {
            EstadoGuiaMaster estado = row.getEstado();
            Long total = row.getTotal();
            if (estado != null) {
                conteos.put(estado.name(), total != null ? total : 0L);
            }
        }
        Set<String> terminalesNames = EstadoGuiaMaster.terminales().stream()
                .map(Enum::name)
                .collect(java.util.stream.Collectors.toSet());
        long activas = conteos.entrySet().stream()
                .filter(e -> !terminalesNames.contains(e.getKey()))
                .mapToLong(Map.Entry::getValue).sum();
        long cerradas = conteos.getOrDefault(EstadoGuiaMaster.DESPACHO_COMPLETADO.name(), 0L);
        long cerradasFaltante = conteos.getOrDefault(EstadoGuiaMaster.DESPACHO_INCOMPLETO.name(), 0L);
        long canceladas = conteos.getOrDefault(EstadoGuiaMaster.CANCELADA.name(), 0L);
        int top = Math.max(1, Math.min(50, topAntiguas));
        List<GuiaMaster> antiguas = guiaMasterRepository.findActivasMasAntiguas(PageRequest.of(0, top));
        List<GuiaMasterDTO> topDTO = antiguas.stream()
                .map(gm -> toDTO(gm, List.of()))
                .toList();
        long enRevision = conteos.getOrDefault(EstadoGuiaMaster.EN_REVISION.name(), 0L);
        return GuiaMasterDashboardDTO.builder()
                .conteosPorEstado(conteos)
                .totalActivas(activas)
                .totalCerradas(cerradas)
                .totalCerradasConFaltante(cerradasFaltante)
                .totalCanceladas(canceladas)
                .totalEnRevision(enRevision)
                .minPiezasParaDespachoParcial(parametroSistemaService.getGuiaMasterMinPiezasDespachoParcial())
                .diasParaAutoCierre(parametroSistemaService.getGuiaMasterDiasAutoCierre())
                .requiereConfirmacionDespachoParcial(parametroSistemaService.getGuiaMasterRequiereConfirmacionDespachoParcial())
                .topAntiguasSinCompletar(topDTO)
                .build();
    }

    /**
     * Cierra automaticamente las guias DESPACHO_PARCIAL cuya primera pieza
     * despachada supero el timeout configurado (dias). Si los dias son 0,
     * el job no hace nada.
     */
    @Transactional
    public int ejecutarAutoCierrePorTimeout() {
        int dias = parametroSistemaService.getGuiaMasterDiasAutoCierre();
        if (dias <= 0) return 0;
        LocalDateTime limite = LocalDateTime.now().minusDays(dias);
        List<GuiaMaster> candidatas = guiaMasterRepository.findCandidatasAutoCierre(
                EstadoGuiaMaster.DESPACHO_PARCIAL, limite);
        int cerradas = 0;
        for (GuiaMaster gm : candidatas) {
            try {
                cerrarConFaltante(gm.getId(),
                        "Auto-cierre por timeout (" + dias + " dias sin completar)",
                        null,
                        TipoCierreGuiaMaster.DESPACHO_INCOMPLETO_TIMEOUT);
                cerradas++;
                Map<String, Object> payload = new LinkedHashMap<>();
                UUID eventId = UUID.randomUUID();
                LocalDateTime now = LocalDateTime.now();
                payload.put("eventId", eventId);
                payload.put("guiaMasterId", gm.getId());
                payload.put("trackingBase", gm.getTrackingBase());
                payload.put("diasTimeout", dias);
                payload.put("occurredAt", now);
                OutboxEvent outboxEvent = OutboxEvent.builder()
                        .eventId(eventId)
                        .aggregateType("GUIA_MASTER")
                        .aggregateId(String.valueOf(gm.getId()))
                        .eventType("GUIA_MASTER_AUTO_CERRADA_POR_TIMEOUT")
                        .payloadJson(toJson(payload))
                        .status(OutboxEventStatus.PENDING)
                        .attempts(0)
                        .nextAttemptAt(now)
                        .createdAt(now)
                        .build();
                outboxEventRepository.save(outboxEvent);
            } catch (BadRequestException ignored) {
                // saltar guías que no califican
            }
        }
        return cerradas;
    }

    private String toJson(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("No se pudo serializar payload de guía master", e);
        }
    }

    @Transactional(readOnly = true)
    public GuiaMasterDTO toDTO(GuiaMaster gm, List<PaqueteDTO> piezasDTO) {
        if (gm == null) return null;
        List<Paquete> piezas = paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(gm.getId());
        Long enLoteRecepcionId = getIdEstadoEnLoteRecepcion();
        int registradas = piezas.size();
        int recibidas = (int) piezas.stream().filter(p -> piezaEnRecepcionBodega(p, enLoteRecepcionId)).count();
        int despachadas = (int) piezas.stream().filter(this::piezaDespachada).count();
        int total = Optional.ofNullable(gm.getTotalPiezasEsperadas()).orElse(0);
        int minPiezas = parametroSistemaService.getGuiaMasterMinPiezasDespachoParcial();
        boolean lista = recibidas >= minPiezas && despachadas < total;
        boolean enCurso = despachadas > 0 && despachadas < total;
        Usuario cliente = gm.getClienteUsuario();
        Usuario cerro = gm.getCerradaPorUsuario();
        // SCD2: si la guia tiene snapshot del destinatario, leemos del snapshot
        // (datos historicos inmutables); si no, leemos del maestro vivo o,
        // como ultimo fallback, del destinatario de la primera pieza.
        DestinatarioView destView = resolveDestinatario(gm);
        ConsignatarioVersion destVer = gm.getConsignatarioVersion();
        return GuiaMasterDTO.builder()
                .id(gm.getId())
                .trackingBase(gm.getTrackingBase())
                .totalPiezasEsperadas(gm.getTotalPiezasEsperadas())
                .consignatarioId(destView.id())
                .consignatarioNombre(destView.nombre())
                .consignatarioTelefono(destView.telefono())
                .consignatarioDireccion(destView.direccion())
                .consignatarioProvincia(destView.provincia())
                .consignatarioCanton(destView.canton())
                .consignatarioInferido(destView.inferido())
                .consignatarioVersionId(destVer != null ? destVer.getId() : null)
                .consignatarioCongeladoEn(gm.getConsignatarioCongeladoEn())
                .clienteUsuarioId(cliente != null ? cliente.getId() : null)
                .clienteUsuarioNombre(cliente != null ? cliente.getUsername() : null)
                .piezasRegistradas(registradas)
                .piezasRecibidas(recibidas)
                .piezasDespachadas(despachadas)
                .estadoGlobal(gm.getEstadoGlobal() != null ? gm.getEstadoGlobal().name() : null)
                .createdAt(gm.getCreatedAt())
                .fechaPrimeraRecepcion(gm.getFechaPrimeraRecepcion())
                .fechaPrimeraPiezaDespachada(gm.getFechaPrimeraPiezaDespachada())
                .minPiezasParaDespachoParcial(minPiezas)
                .listaParaDespachoParcial(lista)
                .despachoParcialEnCurso(enCurso)
                .cerradaEn(gm.getCerradaEn())
                .cerradaPorUsuarioId(cerro != null ? cerro.getId() : null)
                .cerradaPorUsuarioNombre(cerro != null ? cerro.getUsername() : null)
                .tipoCierre(gm.getTipoCierre() != null ? gm.getTipoCierre().name() : null)
                .motivoCierre(gm.getMotivoCierre())
                .piezas(piezasDTO)
                .build();
    }

    /**
     * Vista resuelta de los datos de destinatario que se muestran en el DTO
     * o se imprimen en etiquetas. Encapsula la regla SCD2: si la guia
     * tiene snapshot congelado, ese es la fuente de verdad; si no, leemos
     * del destinatario maestro vivo.
     */
    private record DestinatarioView(Long id, String nombre, String telefono, String direccion,
                                    String provincia, String canton, String codigo,
                                    boolean inferido) {
        static DestinatarioView empty() {
            return new DestinatarioView(null, null, null, null, null, null, null, false);
        }
    }

    private DestinatarioView resolveDestinatario(GuiaMaster gm) {
        if (gm == null) return DestinatarioView.empty();
        ConsignatarioVersion v = gm.getConsignatarioVersion();
        if (v != null) {
            Consignatario liveForId = gm.getConsignatario();
            return new DestinatarioView(liveForId != null ? liveForId.getId() : null,
                    v.getNombre(), v.getTelefono(), v.getDireccion(),
                    v.getProvincia(), v.getCanton(), v.getCodigo(), false);
        }
        Consignatario d = gm.getConsignatario();
        boolean inferido = false;
        if (d == null) {
            // Fallback: la guia no tiene destinatario propio (suele pasar en
            // guias creadas via AUTO o cuando el cliente nunca asigno), pero
            // sus piezas si tienen. Mostramos los datos derivados de la
            // primera pieza para no presentar "Sin asignar" cuando hay info.
            d = paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(gm.getId()).stream()
                    .map(Paquete::getConsignatario)
                    .filter(java.util.Objects::nonNull)
                    .findFirst()
                    .orElse(null);
            inferido = d != null;
        }
        if (d == null) return DestinatarioView.empty();
        return new DestinatarioView(d.getId(), d.getNombre(), d.getTelefono(), d.getDireccion(),
                d.getProvincia(), d.getCanton(), d.getCodigo(), inferido);
    }
}
