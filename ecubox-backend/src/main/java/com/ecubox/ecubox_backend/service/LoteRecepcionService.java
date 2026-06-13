package com.ecubox.ecubox_backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ecubox.ecubox_backend.dto.LoteRecepcionCreateRequest;
import com.ecubox.ecubox_backend.dto.LoteRecepcionDTO;
import com.ecubox.ecubox_backend.dto.LoteRecepcionResumenDTO;
import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.util.Pageables;
import com.ecubox.ecubox_backend.util.Strings;
import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import com.ecubox.ecubox_backend.entity.LoteRecepcion;
import com.ecubox.ecubox_backend.entity.LoteRecepcionGuia;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.enums.EstadoEnvioConsolidadoOperativo;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.EnvioConsolidadoRepository;
import com.ecubox.ecubox_backend.repository.LoteRecepcionGuiaRepository;
import com.ecubox.ecubox_backend.repository.LoteRecepcionRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.security.CurrentUserService;

@Service
public class LoteRecepcionService {

    private final LoteRecepcionRepository loteRecepcionRepository;
    private final LoteRecepcionGuiaRepository loteRecepcionGuiaRepository;
    private final PaqueteRepository paqueteRepository;
    private final PaqueteService paqueteService;
    private final CurrentUserService currentUserService;
    private final EnvioConsolidadoRepository envioConsolidadoRepository;
    private final GuiaMasterService guiaMasterService;

    public LoteRecepcionService(LoteRecepcionRepository loteRecepcionRepository,
                               LoteRecepcionGuiaRepository loteRecepcionGuiaRepository,
                               PaqueteRepository paqueteRepository,
                               PaqueteService paqueteService,
                               CurrentUserService currentUserService,
                               EnvioConsolidadoRepository envioConsolidadoRepository,
                               GuiaMasterService guiaMasterService) {
        this.loteRecepcionRepository = loteRecepcionRepository;
        this.loteRecepcionGuiaRepository = loteRecepcionGuiaRepository;
        this.paqueteRepository = paqueteRepository;
        this.paqueteService = paqueteService;
        this.currentUserService = currentUserService;
        this.envioConsolidadoRepository = envioConsolidadoRepository;
        this.guiaMasterService = guiaMasterService;
    }

    /**
     * Resuelve los paquetes de un código de envío consolidado.
     * <p>El campo {@code numeroGuiaEnvio} en {@link LoteRecepcionGuia} representa
     * el {@code codigo} de un {@link EnvioConsolidado}; los lotes de recepción se
     * arman a partir de los envíos consolidados que llegan físicamente al centro.
     * Devuelve lista vacía si el código no existe.
     */
    private List<Paquete> paquetesPorCodigoEnvio(String codigo) {
        if (codigo == null || codigo.isBlank()) return List.of();
        return envioConsolidadoRepository.findByCodigoIgnoreCase(codigo.trim())
                .map(envio -> paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(envio.getId()))
                .orElse(List.of());
    }

    /**
     * Devuelve el código canónico (con la capitalización original) si existe el
     * envío consolidado; en caso contrario devuelve {@code null}.
     */
    private String resolverCodigoCanonico(String codigo) {
        if (codigo == null || codigo.isBlank()) return null;
        return envioConsolidadoRepository.findByCodigoIgnoreCase(codigo.trim())
                .map(EnvioConsolidado::getCodigo)
                .orElse(null);
    }

    @Transactional
    public LoteRecepcionDTO create(LoteRecepcionCreateRequest request) {
        Usuario operario = currentUserService.getCurrentUsuario();
        LocalDateTime fechaRecepcion = request.getFechaRecepcion() != null ? request.getFechaRecepcion() : LocalDateTime.now();
        String observaciones = request.getObservaciones() != null && !request.getObservaciones().isBlank()
                ? request.getObservaciones().trim() : null;

        LoteRecepcion lote = LoteRecepcion.builder()
                .fechaRecepcion(fechaRecepcion)
                .observaciones(observaciones)
                .operario(operario)
                .guias(new ArrayList<>())
                .build();
        lote = loteRecepcionRepository.save(lote);

        List<String> codigosInput = request.getNumeroGuiasEnvio() != null ? request.getNumeroGuiasEnvio() : List.of();
        Set<String> dedup = new LinkedHashSet<>();
        for (String g : codigosInput) {
            if (g != null && !g.trim().isBlank()) {
                dedup.add(g.trim());
            }
        }

        Set<Long> paqueteIds = new LinkedHashSet<>();
        for (String codigo : dedup) {
            EnvioConsolidado envio = resolverEnvio(codigo);
            String canonico = envio != null ? envio.getCodigo() : null;
            if (canonico == null) continue;
            // Un envio consolidado solo puede recibirse fisicamente una vez.
            // Si ya existe en cualquier otro lote, se omite silenciosamente
            // para no duplicar el registro de recepcion.
            if (loteRecepcionGuiaRepository.existsByNumeroGuiaEnvioIgnoreCase(canonico)) continue;
            List<Paquete> paquetes = paquetesPorCodigoEnvio(canonico);
            if (paquetes.isEmpty()) continue;
            // Admisión por estado anterior: solo un consolidado ARRIBADO_ECUADOR
            // puede recibirse en bodega. Al admitirlo queda RECIBIDO_EN_BODEGA.
            validarYMarcarRecibido(envio);
            LoteRecepcionGuia guia = LoteRecepcionGuia.builder()
                    .loteRecepcion(lote)
                    .numeroGuiaEnvio(canonico)
                    .build();
            loteRecepcionGuiaRepository.save(guia);
            lote.getGuias().add(guia);
            paquetes.forEach(p -> paqueteIds.add(p.getId()));
        }

        if (!paqueteIds.isEmpty()) {
            List<Long> pIds = new ArrayList<>(paqueteIds);
            paqueteService.aplicarEstadoArribadoEc(pIds, fechaRecepcion);
            paqueteService.aplicarEstadoEnLoteRecepcion(pIds, fechaRecepcion);
        }

        return toDTO(lote, false);
    }

    /** Agrega guías de envío a un lote existente. Solo se agregan guías que tengan paquetes y que no estén ya en el lote. */
    @Transactional
    public LoteRecepcionDTO agregarGuias(Long loteId, List<String> numeroGuiasEnvio) {
        LoteRecepcion lote = loteRecepcionRepository.findByIdWithGuias(loteId)
                .orElseThrow(() -> new ResourceNotFoundException("Lote de recepción", loteId));

        Set<String> yaEnLote = new HashSet<>();
        if (lote.getGuias() != null) {
            for (LoteRecepcionGuia g : lote.getGuias()) {
                String n = g.getNumeroGuiaEnvio();
                if (n != null) yaEnLote.add(n.trim().toUpperCase());
            }
        }

        Set<String> dedup = new LinkedHashSet<>();
        List<String> inputCodigos = numeroGuiasEnvio != null ? numeroGuiasEnvio : List.of();
        for (String g : inputCodigos) {
            if (g != null && !g.trim().isBlank()) {
                dedup.add(g.trim());
            }
        }

        Set<Long> paqueteIds = new LinkedHashSet<>();
        for (String codigo : dedup) {
            EnvioConsolidado envio = resolverEnvio(codigo);
            String canonico = envio != null ? envio.getCodigo() : null;
            if (canonico == null) continue;
            if (yaEnLote.contains(canonico.trim().toUpperCase())) continue;
            // Si el envio ya esta en cualquier otro lote (no solo en este), se
            // omite. La recepcion fisica ocurre una sola vez por envio.
            if (loteRecepcionGuiaRepository.existsByNumeroGuiaEnvioIgnoreCase(canonico)) continue;
            List<Paquete> paquetes = paquetesPorCodigoEnvio(canonico);
            if (paquetes.isEmpty()) continue;
            // Admisión por estado anterior: solo un consolidado ARRIBADO_ECUADOR
            // puede recibirse en bodega. Al admitirlo queda RECIBIDO_EN_BODEGA.
            validarYMarcarRecibido(envio);
            LoteRecepcionGuia guia = LoteRecepcionGuia.builder()
                    .loteRecepcion(lote)
                    .numeroGuiaEnvio(canonico)
                    .build();
            loteRecepcionGuiaRepository.save(guia);
            yaEnLote.add(canonico.trim().toUpperCase());
            paquetes.forEach(p -> paqueteIds.add(p.getId()));
        }
        if (!paqueteIds.isEmpty()) {
            List<Long> pIds = new ArrayList<>(paqueteIds);
            paqueteService.aplicarEstadoArribadoEc(pIds, lote.getFechaRecepcion());
            paqueteService.aplicarEstadoEnLoteRecepcion(pIds, lote.getFechaRecepcion());
        }

        loteRecepcionRepository.flush();
        lote = loteRecepcionRepository.findByIdWithGuiasAndOperario(loteId).orElseThrow(() -> new ResourceNotFoundException("Lote de recepción", loteId));
        return toDTO(lote, true);
    }

    private EnvioConsolidado resolverEnvio(String codigo) {
        if (codigo == null || codigo.isBlank()) return null;
        return envioConsolidadoRepository.findByCodigoIgnoreCase(codigo.trim()).orElse(null);
    }

    /**
     * Valida que el consolidado esté EXACTAMENTE en {@code ARRIBADO_ECUADOR}
     * (estado anterior requerido para la recepción en bodega) y, si lo está, lo
     * transiciona explícitamente a {@code RECIBIDO_EN_BODEGA} dentro de la misma
     * transacción. Rechaza con error claro cualquier otro estado, sin tocar paquetes.
     */
    private void validarYMarcarRecibido(EnvioConsolidado envio) {
        if (envio.getEstadoOperativo() != EstadoEnvioConsolidadoOperativo.ARRIBADO_ECUADOR) {
            throw new BadRequestException(
                    "No se puede recibir el envío consolidado " + envio.getCodigo()
                            + " en bodega porque no está en 'Arribado a Ecuador'. Estado actual: "
                            + envio.getEstadoOperativo()
                            + ". Regla: solo un consolidado que ya arribó a Ecuador puede recibirse en bodega.");
        }
        envio.setEstadoOperativo(EstadoEnvioConsolidadoOperativo.RECIBIDO_EN_BODEGA);
        envioConsolidadoRepository.save(envio);
    }

    @Transactional(readOnly = true)
    public LoteRecepcionDTO findById(Long id) {
        LoteRecepcion lote = loteRecepcionRepository.findByIdWithGuiasAndOperario(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lote de recepción", id));
        return toDTO(lote, true);
    }

    @Transactional(readOnly = true)
    public List<LoteRecepcionDTO> findAll() {
        return loteRecepcionRepository.findAllByOrderByFechaRecepcionDesc().stream()
                .map(l -> toDTO(l, false))
                .toList();
    }

    private static final ZoneId ZONA_ECUADOR = ZoneId.of("America/Guayaquil");

    private static Long parseLongOrNull(String s) {
        if (s == null) return null;
        try {
            return Long.valueOf(s.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Listado paginado server-side con búsqueda libre, filtro por operario y
     * rango de fechas. Se usa una {@link Specification} (predicados solo cuando el
     * parámetro no es nulo) para evitar el problema de inferencia de tipo de
     * Postgres con {@code :param IS NULL OR ...} sobre binds nulos. La búsqueda en
     * guías usa un subquery EXISTS (sin JOIN) para no duplicar filas.
     */
    @Transactional(readOnly = true)
    public Page<LoteRecepcionDTO> findAllPaginated(String q, String operario,
                                                   LocalDateTime desde, LocalDateTime hasta,
                                                   int page, int size) {
        String operarioTrim = Strings.trimOrNull(operario);
        String trimmed = Strings.trimOrNull(q);
        String qLike = trimmed != null ? "%" + trimmed.toLowerCase() + "%" : null;

        Specification<LoteRecepcion> spec = (root, query, cb) -> {
            Join<LoteRecepcion, Usuario> operarioJoin = root.join("operario", JoinType.LEFT);
            List<Predicate> preds = new ArrayList<>();
            if (operarioTrim != null) {
                preds.add(cb.equal(operarioJoin.get("username"), operarioTrim));
            }
            if (desde != null) {
                preds.add(cb.greaterThanOrEqualTo(root.get("fechaRecepcion"), desde));
            }
            if (hasta != null) {
                preds.add(cb.lessThan(root.get("fechaRecepcion"), hasta));
            }
            if (qLike != null) {
                Subquery<Long> sub = query.subquery(Long.class);
                Root<LoteRecepcionGuia> g = sub.from(LoteRecepcionGuia.class);
                sub.select(cb.literal(1L)).where(
                        cb.equal(g.get("loteRecepcion"), root),
                        cb.like(cb.lower(g.get("numeroGuiaEnvio")), qLike));
                List<Predicate> orPreds = new ArrayList<>();
                orPreds.add(cb.like(cb.lower(root.get("observaciones")), qLike));
                orPreds.add(cb.like(cb.lower(operarioJoin.get("username")), qLike));
                orPreds.add(cb.exists(sub));
                // Búsqueda por # de lote: coincidencia exacta si el término es numérico.
                Long idBuscado = parseLongOrNull(trimmed);
                if (idBuscado != null) {
                    orPreds.add(cb.equal(root.get("id"), idBuscado));
                }
                preds.add(cb.or(orPreds.toArray(new Predicate[0])));
            }
            return cb.and(preds.toArray(new Predicate[0]));
        };

        Pageable pageable = Pageables.bounded(page, size, 100,
                Sort.by(Sort.Direction.DESC, "fechaRecepcion").and(Sort.by(Sort.Direction.DESC, "id")));
        return loteRecepcionRepository.findAll(spec, pageable).map(l -> toDTO(l, false));
    }

    /**
     * Resumen liviano del listado: KPIs (total, paquetes recibidos, guías únicas,
     * lotes de hoy) y operarios distintos para el filtro. Se calcula con consultas
     * de agregación, sin materializar todos los lotes.
     */
    @Transactional(readOnly = true)
    public LoteRecepcionResumenDTO resumen() {
        LocalDate hoy = LocalDate.now(ZONA_ECUADOR);
        long lotesHoy = loteRecepcionRepository.countByFechaRecepcionEntre(
                hoy.atStartOfDay(), hoy.plusDays(1).atStartOfDay());
        return LoteRecepcionResumenDTO.builder()
                .total(loteRecepcionRepository.count())
                .paquetes(loteRecepcionRepository.countPaquetesRecibidos())
                .guiasUnicas(loteRecepcionRepository.countGuiasUnicas())
                .hoy(lotesHoy)
                .operarios(loteRecepcionRepository.findDistinctOperarios())
                .build();
    }

    @Transactional
    public int delete(Long id) {
        LoteRecepcion lote = loteRecepcionRepository.findByIdWithGuias(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lote de recepción", id));
        Set<Long> paqueteIds = new LinkedHashSet<>();
        if (lote.getGuias() != null) {
            for (LoteRecepcionGuia guia : lote.getGuias()) {
                if (guia.getNumeroGuiaEnvio() == null || guia.getNumeroGuiaEnvio().isBlank()) {
                    continue;
                }
                paquetesPorCodigoEnvio(guia.getNumeroGuiaEnvio())
                        .forEach(p -> paqueteIds.add(p.getId()));
            }
        }
        List<Long> pIds = new ArrayList<>(paqueteIds);
        int paquetesRevertidos = paqueteService.revertirEstadoSiUltimoEventoCoincide(
                pIds,
                "LOTE_RECEPCION_AUTO"
        );
        paqueteService.revertirEstadoSiUltimoEventoCoincide(
                pIds,
                "ARRIBADO_EC_AUTO"
        );
        loteRecepcionRepository.delete(lote);
        if (!paqueteIds.isEmpty()) {
            List<Long> gmIds = paqueteRepository.findGuiaMasterIdsByPaqueteIds(new ArrayList<>(paqueteIds))
                    .stream()
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList();
            for (Long gmId : gmIds) {
                guiaMasterService.recomputarEstado(gmId);
            }
        }
        return paquetesRevertidos;
    }

    private LoteRecepcionDTO toDTO(LoteRecepcion lote, boolean conPaquetes) {
        List<String> numeroGuiasEnvio = lote.getGuias() != null
                ? lote.getGuias().stream().map(LoteRecepcionGuia::getNumeroGuiaEnvio).toList()
                : List.of();

        List<PaqueteDTO> paquetes = null;
        Integer totalPaquetes = null;
        if (lote.getGuias() != null && !lote.getGuias().isEmpty()) {
            if (conPaquetes) {
                Set<Long> idsVistos = new HashSet<>();
                List<PaqueteDTO> lista = new ArrayList<>();
                for (LoteRecepcionGuia guia : lote.getGuias()) {
                    for (Paquete p : paquetesPorCodigoEnvio(guia.getNumeroGuiaEnvio())) {
                        if (idsVistos.add(p.getId())) {
                            lista.add(paqueteService.toDTO(p));
                        }
                    }
                }
                paquetes = lista;
                totalPaquetes = lista.size();
            } else {
                Set<Long> idsParaCount = new HashSet<>();
                for (LoteRecepcionGuia guia : lote.getGuias()) {
                    for (Paquete p : paquetesPorCodigoEnvio(guia.getNumeroGuiaEnvio())) {
                        idsParaCount.add(p.getId());
                    }
                }
                totalPaquetes = idsParaCount.size();
            }
        }

        return LoteRecepcionDTO.builder()
                .id(lote.getId())
                .fechaRecepcion(lote.getFechaRecepcion())
                .observaciones(lote.getObservaciones())
                .operarioId(lote.getOperario() != null ? lote.getOperario().getId() : null)
                .operarioNombre(lote.getOperario() != null ? lote.getOperario().getUsername() : null)
                .numeroGuiasEnvio(numeroGuiasEnvio)
                .paquetes(paquetes)
                .totalPaquetes(totalPaquetes)
                .build();
    }
}
