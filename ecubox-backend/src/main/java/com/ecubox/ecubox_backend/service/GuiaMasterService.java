package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.dto.GuiaMasterDTO;
import com.ecubox.ecubox_backend.dto.GuiaMasterDashboardDTO;
import com.ecubox.ecubox_backend.dto.MiInicioDashboardDTO;
import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.dto.TrackingMasterEventoItem;
import com.ecubox.ecubox_backend.dto.TrackingDestinatarioDTO;
import com.ecubox.ecubox_backend.dto.TrackingMasterResponse;
import com.ecubox.ecubox_backend.dto.TrackingPiezaItem;
import com.ecubox.ecubox_backend.dto.GuiaMasterUpdateRequest;
import com.ecubox.ecubox_backend.entity.DestinatarioFinal;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.GuiaMaster;
import com.ecubox.ecubox_backend.entity.OutboxEvent;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.PaqueteEstadoEvento;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.enums.EstadoGuiaMaster;
import com.ecubox.ecubox_backend.enums.OutboxEventStatus;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ConflictException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.DestinatarioFinalRepository;
import com.ecubox.ecubox_backend.repository.GuiaMasterRepository;
import com.ecubox.ecubox_backend.repository.OutboxEventRepository;
import com.ecubox.ecubox_backend.repository.PaqueteEstadoEventoRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import com.ecubox.ecubox_backend.util.Strings;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
    private final EstadoRastreoService estadoRastreoService;
    private final OutboxEventRepository outboxEventRepository;
    private final DestinatarioFinalRepository destinatarioFinalRepository;
    private final UsuarioRepository usuarioRepository;
    private final PaqueteEstadoEventoRepository paqueteEstadoEventoRepository;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    public GuiaMasterService(GuiaMasterRepository guiaMasterRepository,
                             PaqueteRepository paqueteRepository,
                             ParametroSistemaService parametroSistemaService,
                             @Lazy EstadoRastreoService estadoRastreoService,
                             OutboxEventRepository outboxEventRepository,
                             DestinatarioFinalRepository destinatarioFinalRepository,
                             UsuarioRepository usuarioRepository,
                             PaqueteEstadoEventoRepository paqueteEstadoEventoRepository) {
        this.guiaMasterRepository = guiaMasterRepository;
        this.paqueteRepository = paqueteRepository;
        this.parametroSistemaService = parametroSistemaService;
        this.estadoRastreoService = estadoRastreoService;
        this.outboxEventRepository = outboxEventRepository;
        this.destinatarioFinalRepository = destinatarioFinalRepository;
        this.usuarioRepository = usuarioRepository;
        this.paqueteEstadoEventoRepository = paqueteEstadoEventoRepository;
    }

    /**
     * Creación realizada por un operario. Permite total y destinatario opcionales.
     */
    @Transactional
    public GuiaMaster create(String trackingBase,
                             Integer totalPiezasEsperadas,
                             Long destinatarioFinalId) {
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
        DestinatarioFinal dest = null;
        Usuario clienteUsuario = null;
        if (destinatarioFinalId != null) {
            dest = destinatarioFinalRepository.findById(destinatarioFinalId)
                    .orElseThrow(() -> new BadRequestException("El destinatario indicado no existe"));
            clienteUsuario = dest.getUsuario();
        }
        GuiaMaster gm = GuiaMaster.builder()
                .trackingBase(tb)
                .totalPiezasEsperadas(totalPiezasEsperadas)
                .destinatarioFinal(dest)
                .clienteUsuario(clienteUsuario)
                .estadoGlobal(EstadoGuiaMaster.INCOMPLETA)
                .createdAt(LocalDateTime.now())
                .build();
        return guiaMasterRepository.save(gm);
    }

    /**
     * Variante usada por el cliente final: trackingBase + destinatario propio.
     * El total queda NULL hasta que el operario lo complete.
     */
    @Transactional
    public GuiaMaster createForCliente(String trackingBase, Long destinatarioFinalId, Long clienteUsuarioId) {
        String tb = normalizarTrackingBase(trackingBase);
        if (tb == null) {
            throw new BadRequestException("El número de guía es obligatorio");
        }
        if (destinatarioFinalId == null) {
            throw new BadRequestException("Debes seleccionar un destinatario");
        }
        if (clienteUsuarioId == null) {
            throw new BadRequestException("Cliente no autenticado");
        }
        if (guiaMasterRepository.existsByTrackingBaseIgnoreCase(tb)) {
            throw new ConflictException("Ya existe una guía registrada con ese número. Contacta al operario si crees que es un error.");
        }
        DestinatarioFinal dest = destinatarioFinalRepository.findById(destinatarioFinalId)
                .orElseThrow(() -> new BadRequestException("El destinatario indicado no existe"));
        if (dest.getUsuario() == null || !clienteUsuarioId.equals(dest.getUsuario().getId())) {
            throw new BadRequestException("Solo puedes asociar destinatarios propios");
        }
        Usuario cliente = usuarioRepository.findById(clienteUsuarioId)
                .orElseThrow(() -> new BadRequestException("Cliente no encontrado"));
        GuiaMaster gm = GuiaMaster.builder()
                .trackingBase(tb)
                .totalPiezasEsperadas(null)
                .destinatarioFinal(dest)
                .clienteUsuario(cliente)
                .estadoGlobal(EstadoGuiaMaster.INCOMPLETA)
                .createdAt(LocalDateTime.now())
                .build();
        return guiaMasterRepository.save(gm);
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
        if (req.getDestinatarioFinalId() != null) {
            DestinatarioFinal dest = destinatarioFinalRepository.findById(req.getDestinatarioFinalId())
                    .orElseThrow(() -> new BadRequestException("El destinatario indicado no existe"));
            gm.setDestinatarioFinal(dest);
            gm.setClienteUsuario(dest.getUsuario());
        }
        GuiaMaster saved = guiaMasterRepository.save(gm);
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
     * Variante para que el cliente final pueda cambiar el destinatario de una de
     * sus propias guías. Solo permite reasignar a destinatarios que pertenezcan
     * al mismo cliente, y nunca cambiar el cliente propietario.
     */
    @Transactional
    public GuiaMaster updateDestinatarioForCliente(Long guiaId, Long destinatarioFinalId, Long clienteUsuarioId) {
        if (clienteUsuarioId == null) {
            throw new BadRequestException("Cliente no autenticado");
        }
        if (destinatarioFinalId == null) {
            throw new BadRequestException("Debes seleccionar un destinatario");
        }
        GuiaMaster gm = findByIdForCliente(guiaId, clienteUsuarioId);
        guardarSiEsEditablePorCliente(gm);
        DestinatarioFinal dest = destinatarioFinalRepository.findById(destinatarioFinalId)
                .orElseThrow(() -> new BadRequestException("El destinatario indicado no existe"));
        if (dest.getUsuario() == null || !clienteUsuarioId.equals(dest.getUsuario().getId())) {
            throw new BadRequestException("Solo puedes asociar destinatarios propios");
        }
        gm.setDestinatarioFinal(dest);
        return guiaMasterRepository.save(gm);
    }

    /**
     * Actualiza tracking base y/o destinatario de una guía propia del cliente.
     * Solo permitido mientras la guía esté en estado {@code INCOMPLETA} (i.e.,
     * ningún paquete recibido/despachado todavía).
     */
    @Transactional
    public GuiaMaster updateForCliente(Long guiaId, String nuevoTrackingBase, Long destinatarioFinalId, Long clienteUsuarioId) {
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

        if (destinatarioFinalId != null) {
            DestinatarioFinal dest = destinatarioFinalRepository.findById(destinatarioFinalId)
                    .orElseThrow(() -> new BadRequestException("El destinatario indicado no existe"));
            if (dest.getUsuario() == null || !clienteUsuarioId.equals(dest.getUsuario().getId())) {
                throw new BadRequestException("Solo puedes asociar destinatarios propios");
            }
            gm.setDestinatarioFinal(dest);
        }

        return guiaMasterRepository.save(gm);
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
        if (estado != null && estado != EstadoGuiaMaster.INCOMPLETA) {
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

        int registradas = piezas.size();
        int recibidas = (int) piezas.stream().filter(this::piezaRecibida).count();
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

        // Para la vista pública: si la guía master no tiene destinatarioFinal directo
        // (puede pasar en históricos o cuando aún no se ha asociado), hacer fallback
        // al destinatario de la primera pieza disponible. Las piezas SIEMPRE tienen
        // destinatarioFinal NOT NULL, así que el fallback nunca queda vacío si hay piezas.
        DestinatarioFinal dest = gm.getDestinatarioFinal();
        if (dest == null && !piezas.isEmpty()) {
            dest = piezas.stream()
                    .map(Paquete::getDestinatarioFinal)
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

        TrackingDestinatarioDTO destinatarioDto = dest == null ? null : TrackingDestinatarioDTO.builder()
                .id(dest.getId())
                .nombre(dest.getNombre())
                .provincia(dest.getProvincia())
                .canton(dest.getCanton())
                .build();

        return TrackingMasterResponse.builder()
                .trackingBase(gm.getTrackingBase())
                .estadoGlobal(gm.getEstadoGlobal())
                .totalPiezasEsperadas(gm.getTotalPiezasEsperadas())
                .piezasRegistradas(registradas)
                .piezasRecibidas(recibidas)
                .piezasDespachadas(despachadas)
                .destinatario(destinatarioDto)
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
        int total = gm.getTotalPiezasEsperadas() != null ? gm.getTotalPiezasEsperadas() : 0;
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

    /** Recalcula y persiste {@code estadoGlobal} de la guía en función del estado de cada pieza. */
    @Transactional
    public void recomputarEstado(Long guiaMasterId) {
        if (guiaMasterId == null) return;
        GuiaMaster gm = guiaMasterRepository.findById(guiaMasterId).orElse(null);
        if (gm == null) return;
        List<Paquete> piezas = paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(gm.getId());
        long recibidas = piezas.stream().filter(this::piezaRecibida).count();
        long despachadas = piezas.stream().filter(this::piezaDespachada).count();
        boolean cambios = false;
        if (recibidas > 0 && gm.getFechaPrimeraRecepcion() == null) {
            gm.setFechaPrimeraRecepcion(LocalDateTime.now());
            cambios = true;
        }
        if (despachadas > 0 && gm.getFechaPrimeraPiezaDespachada() == null) {
            gm.setFechaPrimeraPiezaDespachada(LocalDateTime.now());
            cambios = true;
        }
        EstadoGuiaMaster nuevo = calcularEstado(gm);
        if (nuevo != gm.getEstadoGlobal()) {
            gm.setEstadoGlobal(nuevo);
            cambios = true;
        }
        if (cambios) {
            guiaMasterRepository.save(gm);
        }
    }

    /**
     * Cierra manualmente la guía asumiendo que las piezas faltantes nunca llegarán.
     * Sólo aplica si al menos hay una pieza despachada y aún faltan piezas por llegar.
     */
    @Transactional
    public GuiaMaster cerrarConFaltante(Long guiaMasterId, String motivo) {
        GuiaMaster gm = findById(guiaMasterId);
        List<Paquete> piezas = paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(guiaMasterId);
        long despachadas = piezas.stream().filter(this::piezaDespachada).count();
        int total = gm.getTotalPiezasEsperadas() != null ? gm.getTotalPiezasEsperadas() : 0;
        if (despachadas == 0) {
            throw new BadRequestException("No se puede cerrar con faltante: ninguna pieza ha sido despachada");
        }
        if (piezas.size() >= total && piezas.stream().allMatch(this::piezaDespachada)) {
            throw new BadRequestException("La guía ya está completa y despachada; no requiere cierre con faltante");
        }
        gm.setEstadoGlobal(EstadoGuiaMaster.CERRADA_CON_FALTANTE);
        String obs = Strings.trimOrNull(motivo);
        if (obs != null) {
            log.info("GuiaMaster {} cerrada con faltante. Motivo: {}", gm.getId(), obs);
        }
        return guiaMasterRepository.save(gm);
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
        int total = gm.getTotalPiezasEsperadas() != null ? gm.getTotalPiezasEsperadas() : 0;
        List<Paquete> piezas = paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(gm.getId());
        long recibidas = piezas.stream().filter(this::piezaRecibida).count();
        long despachadas = piezas.stream().filter(this::piezaDespachada).count();
        int minPiezas = parametroSistemaService.getGuiaMasterMinPiezasDespachoParcial();
        boolean lista = recibidas >= minPiezas && despachadas < total;
        boolean enCurso = despachadas > 0 && despachadas < total;
        return new DespachoParcialResumen(recibidas, despachadas, total, minPiezas, lista, enCurso);
    }

    /** Calcula el estado global sin persistirlo. */
    EstadoGuiaMaster calcularEstado(GuiaMaster gm) {
        if (gm == null) return EstadoGuiaMaster.INCOMPLETA;
        if (gm.getEstadoGlobal() == EstadoGuiaMaster.CERRADA_CON_FALTANTE) {
            return EstadoGuiaMaster.CERRADA_CON_FALTANTE;
        }
        int total = gm.getTotalPiezasEsperadas() != null ? gm.getTotalPiezasEsperadas() : 0;
        List<Paquete> piezas = paqueteRepository.findByGuiaMasterIdOrderByPiezaNumeroAscIdAsc(gm.getId());
        long registradas = piezas.size();
        long recibidas = piezas.stream().filter(this::piezaRecibida).count();
        long despachadas = piezas.stream().filter(this::piezaDespachada).count();

        boolean todasRegistradas = registradas >= total;
        boolean todasRecibidas = todasRegistradas && recibidas >= total;
        boolean todasDespachadas = todasRegistradas && despachadas >= total;

        if (todasDespachadas) {
            return EstadoGuiaMaster.CERRADA;
        }
        if (despachadas > 0) {
            return EstadoGuiaMaster.PARCIAL_DESPACHADA;
        }
        if (todasRecibidas) {
            return EstadoGuiaMaster.COMPLETA_RECIBIDA;
        }
        if (recibidas > 0) {
            return EstadoGuiaMaster.PARCIAL_RECIBIDA;
        }
        return EstadoGuiaMaster.INCOMPLETA;
    }

    private boolean piezaRecibida(Paquete p) {
        return comparaEstadoMayorOIgualQue(p, getOrdenEstado(getIdEstadoEnLoteRecepcion()));
    }

    private boolean piezaDespachada(Paquete p) {
        return comparaEstadoMayorOIgualQue(p, getOrdenEstado(getIdEstadoEnDespacho()));
    }

    private boolean comparaEstadoMayorOIgualQue(Paquete p, Integer ordenReferencia) {
        if (ordenReferencia == null) return false;
        EstadoRastreo er = p.getEstadoRastreo();
        if (er == null || er.getOrden() == null) return false;
        return er.getOrden() >= ordenReferencia;
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

    private Long getIdEstadoEnDespacho() {
        EstadosRastreoPorPuntoDTO cfg = parametroSistemaService.getEstadosRastreoPorPunto();
        if (cfg == null) return null;
        return cfg.getEstadoRastreoEnDespachoId();
    }

    private Integer getOrdenEstado(Long estadoId) {
        return estadoRastreoService.getOrdenById(estadoId);
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

    public static List<EstadoGuiaMaster> estadosFinalizados() {
        return new ArrayList<>(List.of(EstadoGuiaMaster.CERRADA, EstadoGuiaMaster.CERRADA_CON_FALTANTE));
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
                int registradas = dto.getPiezasRegistradas() != null ? dto.getPiezasRegistradas() : 0;
                int despachadas = dto.getPiezasDespachadas() != null ? dto.getPiezasDespachadas() : 0;
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
                EstadoGuiaMaster.PARCIAL_RECIBIDA,
                EstadoGuiaMaster.COMPLETA_RECIBIDA);
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

        long totalDestinatarios = destinatarioFinalRepository.countByUsuarioId(clienteUsuarioId);

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
        long activas = conteos.entrySet().stream()
                .filter(e -> !e.getKey().equals(EstadoGuiaMaster.CERRADA.name())
                        && !e.getKey().equals(EstadoGuiaMaster.CERRADA_CON_FALTANTE.name()))
                .mapToLong(Map.Entry::getValue).sum();
        long cerradas = conteos.getOrDefault(EstadoGuiaMaster.CERRADA.name(), 0L);
        long cerradasFaltante = conteos.getOrDefault(EstadoGuiaMaster.CERRADA_CON_FALTANTE.name(), 0L);
        int top = Math.max(1, Math.min(50, topAntiguas));
        List<GuiaMaster> antiguas = guiaMasterRepository.findActivasMasAntiguas(PageRequest.of(0, top));
        List<GuiaMasterDTO> topDTO = antiguas.stream()
                .map(gm -> toDTO(gm, List.of()))
                .toList();
        return GuiaMasterDashboardDTO.builder()
                .conteosPorEstado(conteos)
                .totalActivas(activas)
                .totalCerradas(cerradas)
                .totalCerradasConFaltante(cerradasFaltante)
                .minPiezasParaDespachoParcial(parametroSistemaService.getGuiaMasterMinPiezasDespachoParcial())
                .diasParaAutoCierre(parametroSistemaService.getGuiaMasterDiasAutoCierre())
                .requiereConfirmacionDespachoParcial(parametroSistemaService.getGuiaMasterRequiereConfirmacionDespachoParcial())
                .topAntiguasSinCompletar(topDTO)
                .build();
    }

    /**
     * Cierra con faltante todas las guías PARCIAL_DESPACHADA cuya primera pieza
     * despachada superó el timeout configurado (días). Si los días son 0, no hace nada.
     */
    @Transactional
    public int ejecutarAutoCierrePorTimeout() {
        int dias = parametroSistemaService.getGuiaMasterDiasAutoCierre();
        if (dias <= 0) return 0;
        LocalDateTime limite = LocalDateTime.now().minusDays(dias);
        List<GuiaMaster> candidatas = guiaMasterRepository.findCandidatasAutoCierre(
                EstadoGuiaMaster.PARCIAL_DESPACHADA, limite);
        int cerradas = 0;
        for (GuiaMaster gm : candidatas) {
            try {
                cerrarConFaltante(gm.getId(), "Auto-cierre por timeout (" + dias + " días sin completar)");
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
        int registradas = piezas.size();
        int recibidas = (int) piezas.stream().filter(this::piezaRecibida).count();
        int despachadas = (int) piezas.stream().filter(this::piezaDespachada).count();
        int total = gm.getTotalPiezasEsperadas() != null ? gm.getTotalPiezasEsperadas() : 0;
        int minPiezas = parametroSistemaService.getGuiaMasterMinPiezasDespachoParcial();
        boolean lista = recibidas >= minPiezas && despachadas < total;
        boolean enCurso = despachadas > 0 && despachadas < total;
        DestinatarioFinal dest = gm.getDestinatarioFinal();
        Usuario cliente = gm.getClienteUsuario();
        return GuiaMasterDTO.builder()
                .id(gm.getId())
                .trackingBase(gm.getTrackingBase())
                .totalPiezasEsperadas(gm.getTotalPiezasEsperadas())
                .destinatarioFinalId(dest != null ? dest.getId() : null)
                .destinatarioNombre(dest != null ? dest.getNombre() : null)
                .destinatarioTelefono(dest != null ? dest.getTelefono() : null)
                .destinatarioDireccion(dest != null ? dest.getDireccion() : null)
                .destinatarioProvincia(dest != null ? dest.getProvincia() : null)
                .destinatarioCanton(dest != null ? dest.getCanton() : null)
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
                .piezas(piezasDTO)
                .build();
    }
}
