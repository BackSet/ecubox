package com.ecubox.ecubox_backend.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ecubox.ecubox_backend.dto.LoteRecepcionCreateRequest;
import com.ecubox.ecubox_backend.dto.LoteRecepcionDTO;
import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import com.ecubox.ecubox_backend.entity.LoteRecepcion;
import com.ecubox.ecubox_backend.entity.LoteRecepcionGuia;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.Usuario;
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

    public LoteRecepcionService(LoteRecepcionRepository loteRecepcionRepository,
                               LoteRecepcionGuiaRepository loteRecepcionGuiaRepository,
                               PaqueteRepository paqueteRepository,
                               PaqueteService paqueteService,
                               CurrentUserService currentUserService,
                               EnvioConsolidadoRepository envioConsolidadoRepository) {
        this.loteRecepcionRepository = loteRecepcionRepository;
        this.loteRecepcionGuiaRepository = loteRecepcionGuiaRepository;
        this.paqueteRepository = paqueteRepository;
        this.paqueteService = paqueteService;
        this.currentUserService = currentUserService;
        this.envioConsolidadoRepository = envioConsolidadoRepository;
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
            String canonico = resolverCodigoCanonico(codigo);
            if (canonico == null) continue;
            List<Paquete> paquetes = paquetesPorCodigoEnvio(canonico);
            if (paquetes.isEmpty()) continue;
            LoteRecepcionGuia guia = LoteRecepcionGuia.builder()
                    .loteRecepcion(lote)
                    .numeroGuiaEnvio(canonico)
                    .build();
            loteRecepcionGuiaRepository.save(guia);
            lote.getGuias().add(guia);
            paquetes.forEach(p -> paqueteIds.add(p.getId()));
        }

        if (!paqueteIds.isEmpty()) {
            paqueteService.aplicarEstadoEnLoteRecepcion(new ArrayList<>(paqueteIds));
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
            String canonico = resolverCodigoCanonico(codigo);
            if (canonico == null) continue;
            if (yaEnLote.contains(canonico.trim().toUpperCase())) continue;
            List<Paquete> paquetes = paquetesPorCodigoEnvio(canonico);
            if (paquetes.isEmpty()) continue;
            LoteRecepcionGuia guia = LoteRecepcionGuia.builder()
                    .loteRecepcion(lote)
                    .numeroGuiaEnvio(canonico)
                    .build();
            loteRecepcionGuiaRepository.save(guia);
            yaEnLote.add(canonico.trim().toUpperCase());
            paquetes.forEach(p -> paqueteIds.add(p.getId()));
        }
        if (!paqueteIds.isEmpty()) {
            paqueteService.aplicarEstadoEnLoteRecepcion(new ArrayList<>(paqueteIds));
        }

        loteRecepcionRepository.flush();
        lote = loteRecepcionRepository.findByIdWithGuiasAndOperario(loteId).orElseThrow(() -> new ResourceNotFoundException("Lote de recepción", loteId));
        return toDTO(lote, true);
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
        int paquetesRevertidos = paqueteService.revertirEstadoSiUltimoEventoCoincide(
                new ArrayList<>(paqueteIds),
                "LOTE_RECEPCION_AUTO"
        );
        loteRecepcionRepository.delete(lote);
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
