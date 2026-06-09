package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EnvioConsolidadoCreateResponse;
import com.ecubox.ecubox_backend.dto.EnvioConsolidadoDTO;
import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.dto.AplicarEstadoEnConsolidadosResponse;
import com.ecubox.ecubox_backend.dto.AplicarTransicionConsolidadosResponse;
import com.ecubox.ecubox_backend.dto.EstadoRastreoDTO;
import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
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
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
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

    public EnvioConsolidadoService(EnvioConsolidadoRepository envioConsolidadoRepository,
                                   PaqueteRepository paqueteRepository,
                                   @Lazy PaqueteService paqueteService,
                                   LiquidacionConsolidadoLineaRepository liquidacionConsolidadoLineaRepository,
                                   LoteRecepcionGuiaRepository loteRecepcionGuiaRepository,
                                   EstadoConsolidadoOperativoResolver estadoConsolidadoOperativoResolver) {
        this.envioConsolidadoRepository = envioConsolidadoRepository;
        this.paqueteRepository = paqueteRepository;
        this.paqueteService = paqueteService;
        this.liquidacionConsolidadoLineaRepository = liquidacionConsolidadoLineaRepository;
        this.loteRecepcionGuiaRepository = loteRecepcionGuiaRepository;
        this.estadoConsolidadoOperativoResolver = estadoConsolidadoOperativoResolver;
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
            throw new ConflictException("Solo se pueden agregar paquetes a un envío en preparación");
        }
        if (paqueteIds == null || paqueteIds.isEmpty()) {
            throw new BadRequestException("Debe indicar al menos un paquete");
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
                throw new ConflictException("El paquete " + p.getNumeroGuia()
                        + " pertenece a un envío ya enviado desde USA (" + actual.getCodigo() + ")");
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
            throw new ConflictException("Solo se pueden quitar paquetes de un envío en preparación");
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

    @Transactional(readOnly = true)
    public List<EstadoRastreoDTO> listarEstadosAplicables() {
        return paqueteService.listarEstadosPosterioresAAsociacionConsolidado();
    }

    @Transactional
    public AplicarEstadoEnConsolidadosResponse aplicarEstadoRastreo(
            List<Long> consolidadoIds,
            Long estadoRastreoId) {
        if (consolidadoIds == null || consolidadoIds.isEmpty()) {
            throw new BadRequestException("Debe indicar al menos un consolidado");
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

    /**
     * Aplica una transición de estado OPERATIVO a consolidados (por ids o por periodo
     * de creación). Solo admite los destinos con acción real: ENVIADO_DESDE_USA
     * (enviar desde USA) y EN_PREPARACION (reabrir). Cada consolidado debe estar en
     * el estado de origen correspondiente; los que no, se devuelven como rechazados.
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
            throw new BadRequestException("Estado operativo destino no válido");
        }
        EstadoEnvioConsolidadoOperativo fuente;
        if (destino == EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA) {
            fuente = EstadoEnvioConsolidadoOperativo.EN_PREPARACION;
        } else if (destino == EstadoEnvioConsolidadoOperativo.EN_PREPARACION) {
            fuente = EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA;
        } else {
            throw new BadRequestException(
                    "Solo se puede aplicar 'Enviado desde USA' o 'En preparación' como transición manual");
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
                throw new BadRequestException("Debe indicar al menos un consolidado o un periodo");
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
            long total = paqueteRepository.countByEnvioConsolidadoId(envio.getId());
            EstadoEnvioConsolidadoOperativo actual = estadoConsolidadoOperativoResolver.resolve(envio, total);
            if (actual != fuente) {
                rechazados.add(AplicarTransicionConsolidadosResponse.RechazoConsolidado.builder()
                        .consolidadoId(envio.getId())
                        .codigo(envio.getCodigo())
                        .motivo("No está en estado '" + fuente.name() + "'")
                        .build());
                continue;
            }
            try {
                if (destino == EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA) {
                    enviarDesdeUsa(envio.getId(), null);
                } else {
                    reabrir(envio.getId());
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

    /** Marca el envio como enviado desde USA y bloquea cambios de paquetes. */
    @Transactional
    public EnvioConsolidado enviarDesdeUsa(Long envioId, LocalDateTime fechaEvento) {
        EnvioConsolidado envio = findById(envioId);
        if (envio.isCerrado()) {
            return envio;
        }
        LocalDateTime fechaSalidaUsa = fechaEvento != null ? fechaEvento : LocalDateTime.now();
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

    /** @deprecated Usar {@link #enviarDesdeUsa(Long, LocalDateTime)}. */
    @Deprecated
    @Transactional
    public EnvioConsolidado cerrar(Long envioId, LocalDateTime fechaEvento) {
        return enviarDesdeUsa(envioId, fechaEvento);
    }

    /**
     * Revierte la salida USA. Util para correcciones del operario; no hay validacion
     * de "ya pasado mucho tiempo" porque no hay maquina de estados.
     *
     * <p>Reglas de negocio asociadas:
     * <ul>
     *   <li>Si el consolidado pertenece a una liquidacion <strong>pagada</strong>
     *       no se permite reabrir: el operario debe primero desmarcar el pago
     *       de esa liquidacion (que es el documento maestro). Esto evita
     *       inconsistencias del tipo "consolidado en preparacion pero su liquidacion
     *       sigue pagada".</li>
     *   <li>Reabrir es la operacion simetrica de "marcar liquidacion como
     *       pagada" (que marca salida USA y pagado). Por simetria, al reabrir
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
        // Si esta dentro de una liquidacion pagada, bloquear la reapertura operativa.
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
        EnvioConsolidado guardado = envioConsolidadoRepository.save(envio);
        List<Paquete> paquetes = paqueteRepository.findByEnvioConsolidadoIdOrderByIdAsc(envio.getId());
        if (!paquetes.isEmpty()) {
            List<Long> ids = paquetes.stream().map(Paquete::getId).toList();
            paqueteService.revertirEstadoSiUltimoEventoCoincide(ids, "ENVIADO_USA_AUTO");
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
                    "No se puede eliminar un envío consolidado enviado desde USA. Reábrelo primero si necesitas borrarlo.");
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
                .fechaCerrado(envio.getFechaCerrado())
                .pesoTotalLbs(pesoTotal != null ? pesoTotal : BigDecimal.ZERO)
                .totalPaquetes((int) totalPaquetes)
                .estadoPago(envio.getEstadoPago())
                .createdAt(envio.getCreatedAt())
                .updatedAt(envio.getUpdatedAt())
                .paquetes(paquetesDTO)
                .build();
    }

}
