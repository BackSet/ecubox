package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EnvioConsolidadoCreateResponse;
import com.ecubox.ecubox_backend.dto.EnvioConsolidadoDTO;
import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import com.ecubox.ecubox_backend.entity.LiquidacionConsolidadoLinea;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ConflictException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.EnvioConsolidadoRepository;
import com.ecubox.ecubox_backend.repository.LiquidacionConsolidadoLineaRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.util.SearchSpecifications;
import com.ecubox.ecubox_backend.util.Strings;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Orquesta el ciclo de vida minimo de un {@link EnvioConsolidado} (uso INTERNO del operario):
 * <ul>
 *   <li>Crear el envio con o sin guias asociadas en la misma transaccion.</li>
 *   <li>Agregar / quitar paquetes mientras este abierto ({@code fecha_cerrado IS NULL}).</li>
 *   <li>Cerrar / reabrir el envio para indicar que ya no admite cambios.</li>
 * </ul>
 *
 * <p>Sin maquina de estados ni propagacion automatica al estado de rastreo de
 * los paquetes; el envio consolidado es un agrupador logico para emisiones de
 * manifiesto y referencia interna, no una entidad de tracking publico.
 */
@Service
public class EnvioConsolidadoService {

    private final EnvioConsolidadoRepository envioConsolidadoRepository;
    private final PaqueteRepository paqueteRepository;
    private final PaqueteService paqueteService;
    private final LiquidacionConsolidadoLineaRepository liquidacionConsolidadoLineaRepository;

    public EnvioConsolidadoService(EnvioConsolidadoRepository envioConsolidadoRepository,
                                   PaqueteRepository paqueteRepository,
                                   @Lazy PaqueteService paqueteService,
                                   LiquidacionConsolidadoLineaRepository liquidacionConsolidadoLineaRepository) {
        this.envioConsolidadoRepository = envioConsolidadoRepository;
        this.paqueteRepository = paqueteRepository;
        this.paqueteService = paqueteService;
        this.liquidacionConsolidadoLineaRepository = liquidacionConsolidadoLineaRepository;
    }

    @Transactional(readOnly = true)
    public EnvioConsolidado findById(Long id) {
        return envioConsolidadoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Envío consolidado", id));
    }

    /**
     * Lista los envios consolidados que pueden incluirse en un nuevo lote de
     * recepcion. Ortogonal a los flags {@code cerrado} / {@code estadoPago}:
     * un consolidado liquidado y pagado sigue siendo recepcionable mientras
     * no haya sido recibido fisicamente.
     */
    @Transactional(readOnly = true)
    public Page<EnvioConsolidado> findDisponiblesParaRecepcion(String q, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(200, size)));
        String search = Strings.trimOrNull(q);
        return envioConsolidadoRepository.findDisponiblesParaRecepcion(
                search != null ? search : "",
                pageable);
    }

    /**
     * Lista envios paginados con búsqueda libre opcional sobre el código.
     *
     * @param cerrado    {@code null} -> todos; {@code true} -> solo cerrados; {@code false} -> solo abiertos.
     * @param estadoPago {@code null} -> todos; valor del enum -> filtra por estado de pago.
     * @param q          texto libre (LIKE multi-token sobre {@code codigo}); ignorado si vacío.
     */
    @Transactional(readOnly = true)
    public Page<EnvioConsolidado> findAll(Boolean cerrado,
                                          com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado estadoPago,
                                          String q, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(100, size)),
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));

        Specification<EnvioConsolidado> spec = (root, query, cb) -> cb.conjunction();
        if (cerrado != null) {
            Specification<EnvioConsolidado> estadoSpec = (root, query, cb) ->
                    cerrado ? cb.isNotNull(root.get("fechaCerrado")) : cb.isNull(root.get("fechaCerrado"));
            spec = spec.and(estadoSpec);
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

    /** @deprecated Compat retro: usar la sobrecarga con estadoPago. */
    @Deprecated
    @Transactional(readOnly = true)
    public Page<EnvioConsolidado> findAll(Boolean cerrado, String q, int page, int size) {
        return findAll(cerrado, null, q, page, size);
    }

    @Transactional
    public EnvioConsolidado crear(String codigo, Long actorUsuarioId) {
        String c = Strings.trimOrNull(codigo);
        if (c == null) {
            throw new BadRequestException("El código del envío es obligatorio");
        }
        if (envioConsolidadoRepository.existsByCodigoIgnoreCase(c)) {
            throw new ConflictException("Ya existe un envío consolidado con código " + c);
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
            throw new ConflictException("Solo se pueden agregar paquetes a un envío abierto");
        }
        if (paqueteIds == null || paqueteIds.isEmpty()) {
            throw new BadRequestException("Debe indicar al menos un paquete");
        }
        Set<Long> ids = new LinkedHashSet<>(paqueteIds);
        List<Paquete> paquetes = paqueteRepository.findAllById(ids);
        if (paquetes.size() != ids.size()) {
            throw new ResourceNotFoundException("Paquete", "uno o más ids no encontrados");
        }
        for (Paquete p : paquetes) {
            EnvioConsolidado actual = p.getEnvioConsolidado();
            if (actual != null && actual.getId() != null && !actual.getId().equals(envio.getId())
                    && actual.isCerrado()) {
                throw new ConflictException("El paquete " + p.getNumeroGuia()
                        + " pertenece a un envío ya cerrado (" + actual.getCodigo() + ")");
            }
            p.setEnvioConsolidado(envio);
        }
        paqueteRepository.saveAll(paquetes);
        recalcularTotales(envio);
        return envioConsolidadoRepository.save(envio);
    }

    @Transactional
    public EnvioConsolidado removerPaquetes(Long envioId, List<Long> paqueteIds) {
        EnvioConsolidado envio = findById(envioId);
        if (envio.isCerrado()) {
            throw new ConflictException("Solo se pueden quitar paquetes de un envío abierto");
        }
        if (paqueteIds == null || paqueteIds.isEmpty()) {
            throw new BadRequestException("Debe indicar al menos un paquete");
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
        return envioConsolidadoRepository.save(envio);
    }

    /**
     * Marca el envio como cerrado historicamente. Operacion idempotente: si ya
     * estaba cerrado, no lo modifica.
     */
    @Transactional
    public EnvioConsolidado cerrar(Long envioId, LocalDateTime fechaEvento) {
        EnvioConsolidado envio = findById(envioId);
        if (envio.isCerrado()) {
            return envio;
        }
        envio.setFechaCerrado(fechaEvento != null ? fechaEvento : LocalDateTime.now());
        recalcularTotales(envio);
        return envioConsolidadoRepository.save(envio);
    }

    /**
     * Revierte el cierre. Util para correcciones del operario; no hay validacion
     * de "ya pasado mucho tiempo" porque no hay maquina de estados.
     *
     * <p>Reglas de negocio asociadas:
     * <ul>
     *   <li>Si el consolidado pertenece a una liquidacion <strong>pagada</strong>
     *       no se permite reabrir: el operario debe primero desmarcar el pago
     *       de esa liquidacion (que es el documento maestro). Esto evita
     *       inconsistencias del tipo "consolidado abierto pero su liquidacion
     *       sigue pagada".</li>
     *   <li>Reabrir es la operacion simetrica de "marcar liquidacion como
     *       pagada" (que cierra y marca pagado). Por simetria, al reabrir
     *       tambien se vuelve {@code estadoPago = NO_PAGADO} para dejar al
     *       consolidado en su estado original.</li>
     * </ul>
     */
    @Transactional
    public EnvioConsolidado reabrir(Long envioId) {
        EnvioConsolidado envio = findById(envioId);
        if (envio.isAbierto()) {
            return envio;
        }
        // Si esta dentro de una liquidacion pagada, bloquear el reabrir.
        liquidacionConsolidadoLineaRepository.findByEnvioConsolidadoId(envioId)
                .map(LiquidacionConsolidadoLinea::getLiquidacion)
                .filter(liq -> liq.getEstadoPago() == EstadoPagoConsolidado.PAGADO)
                .ifPresent(liq -> {
                    throw new BadRequestException(
                            "No se puede reabrir el consolidado porque pertenece a la "
                                    + "liquidacion " + liq.getCodigo()
                                    + " que esta marcada como pagada. "
                                    + "Desmarca el pago de esa liquidacion primero.");
                });
        envio.setFechaCerrado(null);
        if (envio.getEstadoPago() != EstadoPagoConsolidado.NO_PAGADO) {
            envio.setEstadoPago(EstadoPagoConsolidado.NO_PAGADO);
        }
        return envioConsolidadoRepository.save(envio);
    }

    /**
     * Elimina definitivamente un envio consolidado. Solo permitido si el envio
     * esta <em>abierto</em>: un envio cerrado se considera historico y debe
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
                    "No se puede eliminar un envío consolidado cerrado. Reábrelo primero si necesitas borrarlo.");
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

    @Transactional(readOnly = true)
    public EnvioConsolidadoDTO toDTO(EnvioConsolidado envio, boolean incluirPaquetes) {
        if (envio == null) return null;
        List<PaqueteDTO> paquetesDTO = List.of();
        if (incluirPaquetes) {
            paquetesDTO = paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(envio.getId()).stream()
                    .map(paqueteService::toDTO)
                    .toList();
        }
        return EnvioConsolidadoDTO.builder()
                .id(envio.getId())
                .codigo(envio.getCodigo())
                .cerrado(envio.isCerrado())
                .fechaCerrado(envio.getFechaCerrado())
                .pesoTotalLbs(envio.getPesoTotalLbs())
                .totalPaquetes(envio.getTotalPaquetes())
                .estadoPago(envio.getEstadoPago())
                .createdAt(envio.getCreatedAt())
                .updatedAt(envio.getUpdatedAt())
                .paquetes(paquetesDTO)
                .build();
    }
}
