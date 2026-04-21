package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.*;
import com.ecubox.ecubox_backend.entity.*;
import com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.*;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.util.WeightUtil;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Servicio del módulo de liquidaciones periódicas.
 *
 * <p>Gestiona el documento {@link Liquidacion} con sus dos secciones
 * independientes (consolidados y despachos), el cálculo de totales, el código
 * autogenerado {@code LIQ-YYYY-NNNN} y la sincronización del estado de pago
 * a {@code envio_consolidado.estado_pago} para los consolidados de la sección A.
 */
@Service
public class LiquidacionService {

    private final LiquidacionRepository liquidacionRepository;
    private final LiquidacionConsolidadoLineaRepository consolidadoLineaRepository;
    private final LiquidacionDespachoLineaRepository despachoLineaRepository;
    private final EnvioConsolidadoRepository envioConsolidadoRepository;
    private final DespachoRepository despachoRepository;
    private final UsuarioRepository usuarioRepository;
    private final ConfigTarifaDistribucionService configTarifaDistribucionService;
    private final CurrentUserService currentUserService;

    public LiquidacionService(LiquidacionRepository liquidacionRepository,
                              LiquidacionConsolidadoLineaRepository consolidadoLineaRepository,
                              LiquidacionDespachoLineaRepository despachoLineaRepository,
                              EnvioConsolidadoRepository envioConsolidadoRepository,
                              DespachoRepository despachoRepository,
                              UsuarioRepository usuarioRepository,
                              ConfigTarifaDistribucionService configTarifaDistribucionService,
                              CurrentUserService currentUserService) {
        this.liquidacionRepository = liquidacionRepository;
        this.consolidadoLineaRepository = consolidadoLineaRepository;
        this.despachoLineaRepository = despachoLineaRepository;
        this.envioConsolidadoRepository = envioConsolidadoRepository;
        this.despachoRepository = despachoRepository;
        this.usuarioRepository = usuarioRepository;
        this.configTarifaDistribucionService = configTarifaDistribucionService;
        this.currentUserService = currentUserService;
    }

    // ------------------------------------------------------------------
    // Lectura
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Page<LiquidacionResumenDTO> listar(LocalDate desdeDocumento,
                                              LocalDate hastaDocumento,
                                              LocalDate desdePago,
                                              LocalDate hastaPago,
                                              EstadoPagoConsolidado estadoPago,
                                              String q,
                                              Pageable pageable) {
        Specification<Liquidacion> spec = (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (desdeDocumento != null) {
                ps.add(cb.greaterThanOrEqualTo(root.get("fechaDocumento"), desdeDocumento));
            }
            if (hastaDocumento != null) {
                ps.add(cb.lessThanOrEqualTo(root.get("fechaDocumento"), hastaDocumento));
            }
            if (desdePago != null) {
                ps.add(cb.greaterThanOrEqualTo(
                        root.get("fechaPago"), desdePago.atStartOfDay()));
            }
            if (hastaPago != null) {
                ps.add(cb.lessThan(
                        root.get("fechaPago"), hastaPago.plusDays(1).atStartOfDay()));
            }
            if (estadoPago != null) {
                ps.add(cb.equal(root.get("estadoPago"), estadoPago));
            }
            if (q != null && !q.isBlank()) {
                ps.add(cb.like(cb.lower(root.get("codigo")),
                        "%" + q.toLowerCase() + "%"));
            }
            return cb.and(ps.toArray(new Predicate[0]));
        };
        Page<Liquidacion> page = liquidacionRepository.findAll(spec, pageable);
        return page.map(this::toResumenDTO);
    }

    @Transactional(readOnly = true)
    public LiquidacionDTO obtener(Long id) {
        Liquidacion liq = liquidacionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Liquidacion", id));
        return toDTO(liq, true);
    }

    @Transactional(readOnly = true)
    public Page<EnvioConsolidadoDisponibleDTO> listarConsolidadosDisponibles(
            String q, Pageable pageable) {
        String search = (q != null && !q.isBlank()) ? q.trim() : "";
        return envioConsolidadoRepository
                .findDisponiblesParaLiquidacion(search, pageable)
                .map(this::toEnvioDisponibleDTO);
    }

    @Transactional(readOnly = true)
    public Page<DespachoDisponibleDTO> listarDespachosDisponibles(
            String q, Pageable pageable) {
        String search = (q != null && !q.isBlank()) ? q.trim() : "";
        return despachoRepository
                .findDisponiblesParaLiquidacion(search, pageable)
                .map(this::toDespachoDisponibleDTO);
    }

    // ------------------------------------------------------------------
    // Mutaciones - header
    // ------------------------------------------------------------------

    @Transactional
    public LiquidacionDTO crear(LiquidacionCrearRequest req) {
        validarPeriodo(req.getPeriodoDesde(), req.getPeriodoHasta());

        Liquidacion liq = Liquidacion.builder()
                .codigo(generarCodigo())
                .fechaDocumento(req.getFechaDocumento() != null
                        ? req.getFechaDocumento() : LocalDate.now())
                .periodoDesde(req.getPeriodoDesde())
                .periodoHasta(req.getPeriodoHasta())
                .notas(req.getNotas())
                .build();
        liq = liquidacionRepository.save(liq);
        return toDTO(liq, true);
    }

    @Transactional
    public LiquidacionDTO actualizarHeader(Long id, LiquidacionHeaderRequest req) {
        Liquidacion liq = obtenerEntidad(id);
        validarNoPagada(liq, "modificar el documento");
        validarPeriodo(req.getPeriodoDesde(), req.getPeriodoHasta());

        liq.setFechaDocumento(req.getFechaDocumento());
        liq.setPeriodoDesde(req.getPeriodoDesde());
        liq.setPeriodoHasta(req.getPeriodoHasta());
        liq.setNotas(req.getNotas());
        return toDTO(liquidacionRepository.save(liq), true);
    }

    @Transactional
    public void eliminar(Long id) {
        Liquidacion liq = obtenerEntidad(id);
        validarNoPagada(liq, "eliminar la liquidacion");
        liquidacionRepository.delete(liq);
    }

    // ------------------------------------------------------------------
    // Mutaciones - seccion A (consolidados)
    // ------------------------------------------------------------------

    @Transactional
    public LiquidacionDTO agregarConsolidado(Long liquidacionId,
                                             LiquidacionConsolidadoLineaRequest req) {
        Liquidacion liq = obtenerEntidad(liquidacionId);
        validarNoPagada(liq, "agregar lineas");

        EnvioConsolidado envio = resolverOCrearEnvioConsolidado(req, liq);

        if (consolidadoLineaRepository.existsByEnvioConsolidadoId(envio.getId())) {
            throw new BadRequestException(
                    "El envio consolidado " + envio.getCodigo()
                            + " ya esta incluido en otra liquidacion");
        }

        LiquidacionConsolidadoLinea linea = LiquidacionConsolidadoLinea.builder()
                .liquidacion(liq)
                .envioConsolidado(envio)
                .costoProveedor(redondear(req.getCostoProveedor()))
                .ingresoCliente(redondear(req.getIngresoCliente()))
                .notas(req.getNotas())
                .build();
        linea.setMargenLinea(linea.getIngresoCliente().subtract(linea.getCostoProveedor()));
        liq.getConsolidados().add(linea);
        consolidadoLineaRepository.save(linea);

        recalcularTotales(liq);
        return toDTO(liquidacionRepository.save(liq), true);
    }

    /**
     * Resuelve el {@link EnvioConsolidado} a usar en la linea, segun el request:
     * <ul>
     *   <li>Si viene {@code envioConsolidadoId}, se busca por id.</li>
     *   <li>Si no viene id pero viene {@code envioConsolidadoCodigo}, se busca
     *       por codigo (case-insensitive). Si no existe, se crea un nuevo
     *       envio consolidado vacio (sin paquetes), heredando el estado de
     *       pago de la liquidacion (PAGADO si la liquidacion ya esta pagada).</li>
     * </ul>
     */
    private EnvioConsolidado resolverOCrearEnvioConsolidado(
            LiquidacionConsolidadoLineaRequest req, Liquidacion liq) {
        if (req.getEnvioConsolidadoId() != null && req.getEnvioConsolidadoId() > 0) {
            return envioConsolidadoRepository.findById(req.getEnvioConsolidadoId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "EnvioConsolidado", req.getEnvioConsolidadoId()));
        }
        String codigo = req.getEnvioConsolidadoCodigo() != null
                ? req.getEnvioConsolidadoCodigo().trim() : "";
        if (codigo.isBlank()) {
            throw new BadRequestException(
                    "Debes indicar el consolidado por id o por codigo");
        }
        return envioConsolidadoRepository.findByCodigoIgnoreCase(codigo)
                .orElseGet(() -> crearEnvioConsolidadoVacio(codigo, liq));
    }

    /**
     * Crea un envio consolidado nuevo sin paquetes, usado cuando el operario
     * tipea un codigo que aun no existe en el sistema. Hereda el estado de
     * pago del documento de liquidacion (regla de negocio: si la liquidacion
     * esta marcada como pagada el consolidado tambien debe quedar pagado).
     */
    private EnvioConsolidado crearEnvioConsolidadoVacio(String codigo, Liquidacion liq) {
        EnvioConsolidado nuevo = EnvioConsolidado.builder()
                .codigo(codigo)
                .totalPaquetes(0)
                .estadoPago(liq.getEstadoPago() != null
                        ? liq.getEstadoPago() : EstadoPagoConsolidado.NO_PAGADO)
                .createdBy(currentUserService.getCurrentUsuarioIdOrNull())
                .build();
        return envioConsolidadoRepository.save(nuevo);
    }

    @Transactional
    public LiquidacionDTO actualizarConsolidado(Long liquidacionId,
                                                Long lineaId,
                                                LiquidacionConsolidadoLineaRequest req) {
        Liquidacion liq = obtenerEntidad(liquidacionId);
        validarNoPagada(liq, "modificar lineas");

        LiquidacionConsolidadoLinea linea = consolidadoLineaRepository.findById(lineaId)
                .orElseThrow(() -> new ResourceNotFoundException("Linea (consolidado)", lineaId));
        if (!linea.getLiquidacion().getId().equals(liquidacionId)) {
            throw new BadRequestException("La linea no pertenece a esta liquidacion");
        }

        linea.setCostoProveedor(redondear(req.getCostoProveedor()));
        linea.setIngresoCliente(redondear(req.getIngresoCliente()));
        linea.setMargenLinea(linea.getIngresoCliente().subtract(linea.getCostoProveedor()));
        linea.setNotas(req.getNotas());
        consolidadoLineaRepository.save(linea);

        recalcularTotales(liq);
        return toDTO(liquidacionRepository.save(liq), true);
    }

    @Transactional
    public LiquidacionDTO eliminarConsolidado(Long liquidacionId, Long lineaId) {
        Liquidacion liq = obtenerEntidad(liquidacionId);
        validarNoPagada(liq, "eliminar lineas");

        LiquidacionConsolidadoLinea linea = consolidadoLineaRepository.findById(lineaId)
                .orElseThrow(() -> new ResourceNotFoundException("Linea (consolidado)", lineaId));
        if (!linea.getLiquidacion().getId().equals(liquidacionId)) {
            throw new BadRequestException("La linea no pertenece a esta liquidacion");
        }
        liq.getConsolidados().removeIf(l -> l.getId().equals(lineaId));
        consolidadoLineaRepository.delete(linea);

        recalcularTotales(liq);
        return toDTO(liquidacionRepository.save(liq), true);
    }

    // ------------------------------------------------------------------
    // Mutaciones - seccion B (despachos)
    // ------------------------------------------------------------------

    @Transactional
    public LiquidacionDTO agregarDespacho(Long liquidacionId,
                                          LiquidacionDespachoLineaRequest req) {
        Liquidacion liq = obtenerEntidad(liquidacionId);
        validarNoPagada(liq, "agregar lineas");

        if (despachoLineaRepository.existsByDespachoId(req.getDespachoId())) {
            throw new BadRequestException(
                    "El despacho ya esta incluido en otra liquidacion");
        }
        Despacho despacho = despachoRepository.findById(req.getDespachoId())
                .orElseThrow(() -> new ResourceNotFoundException("Despacho", req.getDespachoId()));

        BigDecimal pesoKg = redondear(req.getPesoKg());
        BigDecimal kgIncluidos = redondear(req.getKgIncluidos());
        BigDecimal precioFijo = redondear(req.getPrecioFijo());
        BigDecimal precioKgAdicional = redondear(req.getPrecioKgAdicional());

        LiquidacionDespachoLinea linea = LiquidacionDespachoLinea.builder()
                .liquidacion(liq)
                .despacho(despacho)
                .pesoKg(pesoKg)
                .pesoLbs(WeightUtil.kgToLbs(pesoKg))
                .kgIncluidos(kgIncluidos)
                .precioFijo(precioFijo)
                .precioKgAdicional(precioKgAdicional)
                .notas(req.getNotas())
                .build();
        linea.setCostoCalculado(calcularCosto(pesoKg, kgIncluidos, precioFijo, precioKgAdicional));

        liq.getDespachos().add(linea);
        despachoLineaRepository.save(linea);

        configTarifaDistribucionService.writeBackSiCambia(
                kgIncluidos, precioFijo, precioKgAdicional,
                currentUserService.getCurrentUsuarioIdOrNull());

        recalcularTotales(liq);
        return toDTO(liquidacionRepository.save(liq), true);
    }

    @Transactional
    public LiquidacionDTO actualizarDespacho(Long liquidacionId,
                                             Long lineaId,
                                             LiquidacionDespachoLineaRequest req) {
        Liquidacion liq = obtenerEntidad(liquidacionId);
        validarNoPagada(liq, "modificar lineas");

        LiquidacionDespachoLinea linea = despachoLineaRepository.findById(lineaId)
                .orElseThrow(() -> new ResourceNotFoundException("Linea (despacho)", lineaId));
        if (!linea.getLiquidacion().getId().equals(liquidacionId)) {
            throw new BadRequestException("La linea no pertenece a esta liquidacion");
        }

        BigDecimal pesoKg = redondear(req.getPesoKg());
        BigDecimal kgIncluidos = redondear(req.getKgIncluidos());
        BigDecimal precioFijo = redondear(req.getPrecioFijo());
        BigDecimal precioKgAdicional = redondear(req.getPrecioKgAdicional());

        linea.setPesoKg(pesoKg);
        linea.setPesoLbs(WeightUtil.kgToLbs(pesoKg));
        linea.setKgIncluidos(kgIncluidos);
        linea.setPrecioFijo(precioFijo);
        linea.setPrecioKgAdicional(precioKgAdicional);
        linea.setCostoCalculado(calcularCosto(pesoKg, kgIncluidos, precioFijo, precioKgAdicional));
        linea.setNotas(req.getNotas());
        despachoLineaRepository.save(linea);

        configTarifaDistribucionService.writeBackSiCambia(
                kgIncluidos, precioFijo, precioKgAdicional,
                currentUserService.getCurrentUsuarioIdOrNull());

        recalcularTotales(liq);
        return toDTO(liquidacionRepository.save(liq), true);
    }

    @Transactional
    public LiquidacionDTO eliminarDespacho(Long liquidacionId, Long lineaId) {
        Liquidacion liq = obtenerEntidad(liquidacionId);
        validarNoPagada(liq, "eliminar lineas");

        LiquidacionDespachoLinea linea = despachoLineaRepository.findById(lineaId)
                .orElseThrow(() -> new ResourceNotFoundException("Linea (despacho)", lineaId));
        if (!linea.getLiquidacion().getId().equals(liquidacionId)) {
            throw new BadRequestException("La linea no pertenece a esta liquidacion");
        }
        liq.getDespachos().removeIf(l -> l.getId().equals(lineaId));
        despachoLineaRepository.delete(linea);

        recalcularTotales(liq);
        return toDTO(liquidacionRepository.save(liq), true);
    }

    // ------------------------------------------------------------------
    // Mutaciones - estado de pago
    // ------------------------------------------------------------------

    @Transactional
    public LiquidacionDTO marcarPagada(Long id) {
        Liquidacion liq = obtenerEntidad(id);
        if (liq.getEstadoPago() == EstadoPagoConsolidado.PAGADO) {
            return toDTO(liq, true);
        }
        liq.setEstadoPago(EstadoPagoConsolidado.PAGADO);
        liq.setFechaPago(LocalDateTime.now());
        Long userId = currentUserService.getCurrentUsuarioIdOrNull();
        if (userId != null) {
            usuarioRepository.findById(userId).ifPresent(liq::setPagadoPor);
        }
        sincronizarEstadoPagoConsolidados(liq, EstadoPagoConsolidado.PAGADO);
        return toDTO(liquidacionRepository.save(liq), true);
    }

    @Transactional
    public LiquidacionDTO marcarNoPagada(Long id) {
        Liquidacion liq = obtenerEntidad(id);
        if (liq.getEstadoPago() == EstadoPagoConsolidado.NO_PAGADO) {
            return toDTO(liq, true);
        }
        liq.setEstadoPago(EstadoPagoConsolidado.NO_PAGADO);
        liq.setFechaPago(null);
        liq.setPagadoPor(null);
        sincronizarEstadoPagoConsolidados(liq, EstadoPagoConsolidado.NO_PAGADO);
        return toDTO(liquidacionRepository.save(liq), true);
    }

    // ------------------------------------------------------------------
    // Helpers internos
    // ------------------------------------------------------------------

    private Liquidacion obtenerEntidad(Long id) {
        return liquidacionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Liquidacion", id));
    }

    private void validarPeriodo(LocalDate desde, LocalDate hasta) {
        if (desde != null && hasta != null && desde.isAfter(hasta)) {
            throw new BadRequestException(
                    "El periodo desde no puede ser posterior al periodo hasta");
        }
    }

    private void validarNoPagada(Liquidacion liq, String accion) {
        if (liq.getEstadoPago() == EstadoPagoConsolidado.PAGADO) {
            throw new BadRequestException(
                    "No se puede " + accion + " porque la liquidacion ya esta marcada como pagada. "
                            + "Desmarca el pago primero.");
        }
    }

    private String generarCodigo() {
        long secuencia = liquidacionRepository.nextCodigoSequence();
        return String.format("LIQ-%d-%04d", Year.now().getValue(), secuencia);
    }

    private BigDecimal redondear(BigDecimal value) {
        if (value == null) return BigDecimal.ZERO;
        return value.setScale(4, RoundingMode.HALF_UP);
    }

    /** {@code costo = precioFijo + max(0, pesoKg - kgIncluidos) * precioKgAdicional}. */
    private BigDecimal calcularCosto(BigDecimal pesoKg, BigDecimal kgIncluidos,
                                     BigDecimal precioFijo, BigDecimal precioKgAdicional) {
        BigDecimal exceso = pesoKg.subtract(kgIncluidos);
        if (exceso.signum() <= 0) {
            return precioFijo.setScale(4, RoundingMode.HALF_UP);
        }
        return precioFijo.add(exceso.multiply(precioKgAdicional))
                .setScale(4, RoundingMode.HALF_UP);
    }

    private void recalcularTotales(Liquidacion liq) {
        BigDecimal margen = liq.getConsolidados().stream()
                .map(LiquidacionConsolidadoLinea::getMargenLinea)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(4, RoundingMode.HALF_UP);
        BigDecimal distribucion = liq.getDespachos().stream()
                .map(LiquidacionDespachoLinea::getCostoCalculado)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(4, RoundingMode.HALF_UP);
        liq.setMargenBruto(margen);
        liq.setTotalCostoDistribucion(distribucion);
        liq.setIngresoNeto(margen.subtract(distribucion).setScale(4, RoundingMode.HALF_UP));
    }

    /**
     * Propaga el estado de pago del documento a {@code envio_consolidado.estado_pago}
     * para todos los consolidados de la sección A. Como un consolidado solo
     * puede aparecer en UNA liquidación (UNIQUE global), no hay riesgo de
     * sobrescribir el estado decidido por otra liquidación.
     *
     * <p>Adicionalmente, cuando la liquidación pasa a {@code PAGADO} los
     * consolidados que aún esten abiertos se cierran automaticamente
     * (regla de negocio: un consolidado pagado no admite mas cambios). Al
     * desmarcar el pago no se reabren — el cierre es una decision
     * deliberada que solo el operario puede revertir.
     */
    private void sincronizarEstadoPagoConsolidados(Liquidacion liq,
                                                   EstadoPagoConsolidado estado) {
        LocalDateTime now = LocalDateTime.now();
        boolean cerrarSiAbierto = (estado == EstadoPagoConsolidado.PAGADO);
        for (LiquidacionConsolidadoLinea l : liq.getConsolidados()) {
            EnvioConsolidado e = l.getEnvioConsolidado();
            boolean cambio = false;
            if (e.getEstadoPago() != estado) {
                e.setEstadoPago(estado);
                cambio = true;
            }
            if (cerrarSiAbierto && e.getFechaCerrado() == null) {
                e.setFechaCerrado(now);
                cambio = true;
            }
            if (cambio) {
                envioConsolidadoRepository.save(e);
            }
        }
    }

    // ------------------------------------------------------------------
    // Mappers a DTO
    // ------------------------------------------------------------------

    private LiquidacionDTO toDTO(Liquidacion liq, boolean incluirTarifaDefault) {
        List<LiquidacionConsolidadoLineaDTO> consolidados = liq.getConsolidados().stream()
                .map(this::toConsolidadoLineaDTO)
                .toList();
        List<LiquidacionDespachoLineaDTO> despachos = liq.getDespachos().stream()
                .map(this::toDespachoLineaDTO)
                .toList();
        return LiquidacionDTO.builder()
                .id(liq.getId())
                .codigo(liq.getCodigo())
                .fechaDocumento(liq.getFechaDocumento())
                .periodoDesde(liq.getPeriodoDesde())
                .periodoHasta(liq.getPeriodoHasta())
                .notas(liq.getNotas())
                .margenBruto(liq.getMargenBruto())
                .totalCostoDistribucion(liq.getTotalCostoDistribucion())
                .ingresoNeto(liq.getIngresoNeto())
                .estadoPago(liq.getEstadoPago())
                .fechaPago(liq.getFechaPago())
                .pagadoPorUsername(liq.getPagadoPor() != null
                        ? liq.getPagadoPor().getUsername() : null)
                .createdAt(liq.getCreatedAt())
                .updatedAt(liq.getUpdatedAt())
                .consolidados(consolidados)
                .despachos(despachos)
                .tarifaDefault(incluirTarifaDefault
                        ? configTarifaDistribucionService.getActual() : null)
                .build();
    }

    private LiquidacionResumenDTO toResumenDTO(Liquidacion liq) {
        // Las listas son LAZY; usar repos para no forzar fetch.
        long totalConsolidados = consolidadoLineaRepository.countByLiquidacionId(liq.getId());
        long totalDespachos = despachoLineaRepository.countByLiquidacionId(liq.getId());
        return LiquidacionResumenDTO.builder()
                .id(liq.getId())
                .codigo(liq.getCodigo())
                .fechaDocumento(liq.getFechaDocumento())
                .periodoDesde(liq.getPeriodoDesde())
                .periodoHasta(liq.getPeriodoHasta())
                .margenBruto(liq.getMargenBruto())
                .totalCostoDistribucion(liq.getTotalCostoDistribucion())
                .ingresoNeto(liq.getIngresoNeto())
                .estadoPago(liq.getEstadoPago())
                .fechaPago(liq.getFechaPago())
                .totalConsolidados((int) totalConsolidados)
                .totalDespachos((int) totalDespachos)
                .createdAt(liq.getCreatedAt())
                .updatedAt(liq.getUpdatedAt())
                .build();
    }

    private LiquidacionConsolidadoLineaDTO toConsolidadoLineaDTO(LiquidacionConsolidadoLinea l) {
        EnvioConsolidado e = l.getEnvioConsolidado();
        return LiquidacionConsolidadoLineaDTO.builder()
                .id(l.getId())
                .envioConsolidadoId(e != null ? e.getId() : null)
                .envioConsolidadoCodigo(e != null ? e.getCodigo() : null)
                .envioConsolidadoCerrado(e != null ? e.isCerrado() : null)
                .envioConsolidadoTotalPaquetes(e != null ? e.getTotalPaquetes() : null)
                .envioConsolidadoPesoTotalLbs(e != null ? e.getPesoTotalLbs() : null)
                .costoProveedor(l.getCostoProveedor())
                .ingresoCliente(l.getIngresoCliente())
                .margenLinea(l.getMargenLinea())
                .notas(l.getNotas())
                .createdAt(l.getCreatedAt())
                .updatedAt(l.getUpdatedAt())
                .build();
    }

    private LiquidacionDespachoLineaDTO toDespachoLineaDTO(LiquidacionDespachoLinea l) {
        Despacho d = l.getDespacho();
        String courier = (d != null && d.getCourierEntrega() != null)
                ? d.getCourierEntrega().getNombre() : null;
        return LiquidacionDespachoLineaDTO.builder()
                .id(l.getId())
                .despachoId(d != null ? d.getId() : null)
                .despachoNumeroGuia(d != null ? d.getNumeroGuia() : null)
                .despachoCourierEntregaNombre(courier)
                .despachoFechaHora(d != null ? d.getFechaHora() : null)
                .pesoKg(l.getPesoKg())
                .pesoLbs(l.getPesoLbs())
                .kgIncluidos(l.getKgIncluidos())
                .precioFijo(l.getPrecioFijo())
                .precioKgAdicional(l.getPrecioKgAdicional())
                .costoCalculado(l.getCostoCalculado())
                .notas(l.getNotas())
                .createdAt(l.getCreatedAt())
                .updatedAt(l.getUpdatedAt())
                .build();
    }

    private EnvioConsolidadoDisponibleDTO toEnvioDisponibleDTO(EnvioConsolidado e) {
        return EnvioConsolidadoDisponibleDTO.builder()
                .id(e.getId())
                .codigo(e.getCodigo())
                .cerrado(e.isCerrado())
                .fechaCerrado(e.getFechaCerrado())
                .totalPaquetes(e.getTotalPaquetes())
                .pesoTotalLbs(e.getPesoTotalLbs())
                .createdAt(e.getCreatedAt())
                .build();
    }

    private DespachoDisponibleDTO toDespachoDisponibleDTO(Despacho d) {
        BigDecimal lbs = despachoRepository.sumPesoLbsPorDespacho(d.getId());
        BigDecimal kg = lbs != null ? WeightUtil.lbsToKg(lbs) : BigDecimal.ZERO;
        return DespachoDisponibleDTO.builder()
                .id(d.getId())
                .numeroGuia(d.getNumeroGuia())
                .courierEntregaNombre(d.getCourierEntrega() != null
                        ? d.getCourierEntrega().getNombre() : null)
                .fechaHora(d.getFechaHora())
                .pesoSugeridoLbs(lbs != null ? lbs : BigDecimal.ZERO)
                .pesoSugeridoKg(kg != null ? kg : BigDecimal.ZERO)
                .build();
    }

    @SuppressWarnings("unused")
    private Set<Long> placeholderUsoUtil() { return Set.of(); }
}
