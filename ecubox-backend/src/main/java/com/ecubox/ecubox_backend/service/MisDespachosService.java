package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.dto.MiDespachoDTO;
import com.ecubox.ecubox_backend.dto.MiDespachoDetalleDTO;
import com.ecubox.ecubox_backend.dto.MiDespachoPiezaDTO;
import com.ecubox.ecubox_backend.entity.AgenciaCourierEntregaVersion;
import com.ecubox.ecubox_backend.entity.Despacho;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.enums.TipoEntrega;
import com.ecubox.ecubox_backend.util.WeightUtil;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.security.AccesoSessionResolver;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Vista de cliente sobre los despachos que contienen SUS piezas, con la acción de
 * "confirmar entrega" (por despacho, sobre su parte). El alcance se resuelve por
 * la sesión: cliente con cuenta (por su consignatario) o sesión de enlace (scope
 * de consignatarios). El estado que se aplica y el que habilita la confirmación
 * son configurables en Parámetros (no están quemados).
 */
@Service
public class MisDespachosService {

    private final PaqueteRepository paqueteRepository;
    private final PaqueteService paqueteService;
    private final EstadoRastreoService estadoRastreoService;
    private final ParametroSistemaService parametroSistemaService;
    private final AccesoSessionResolver accesoSessionResolver;
    private final CurrentUserService currentUserService;

    public MisDespachosService(PaqueteRepository paqueteRepository,
                               PaqueteService paqueteService,
                               EstadoRastreoService estadoRastreoService,
                               ParametroSistemaService parametroSistemaService,
                               AccesoSessionResolver accesoSessionResolver,
                               CurrentUserService currentUserService) {
        this.paqueteRepository = paqueteRepository;
        this.paqueteService = paqueteService;
        this.estadoRastreoService = estadoRastreoService;
        this.parametroSistemaService = parametroSistemaService;
        this.accesoSessionResolver = accesoSessionResolver;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<MiDespachoDTO> listar() {
        ReglaConfirmacion regla = cargarRegla();
        return agruparPorDespacho(paquetesDelCliente(), regla).stream()
                .sorted(Comparator.comparing(MiDespachoDTO::getFecha,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @Transactional
    public MiDespachoDTO confirmarEntrega(Long despachoId) {
        ReglaConfirmacion regla = cargarRegla();
        if (regla.entregaEstadoId() == null) {
            throw new BadRequestException(
                    "No se puede confirmar la entrega porque la confirmación de entrega no está configurada "
                            + "en el sistema. Contacta al operario para que la habilite.");
        }
        List<Paquete> delDespacho = paquetesDelCliente().stream()
                .filter(p -> p.getSaca() != null
                        && p.getSaca().getDespacho() != null
                        && despachoId.equals(p.getSaca().getDespacho().getId()))
                .toList();
        if (delDespacho.isEmpty()) {
            throw new ResourceNotFoundException("Despacho", despachoId);
        }
        List<Long> confirmables = delDespacho.stream()
                .filter(p -> esConfirmable(p, regla))
                .map(Paquete::getId)
                .toList();
        if (confirmables.isEmpty()) {
            throw new BadRequestException(
                    "No hay piezas por confirmar en este despacho (aún no están en reparto o ya fueron confirmadas).");
        }
        paqueteService.aplicarEstadoEntregaConfirmadaCliente(confirmables, regla.entregaEstadoId());

        // Reconstruir la vista del despacho con los estados ya actualizados.
        return agruparPorDespacho(paquetesDelCliente(), cargarRegla()).stream()
                .filter(d -> despachoId.equals(d.getDespachoId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Despacho", despachoId));
    }

    private List<Paquete> paquetesDelCliente() {
        if (accesoSessionResolver.isEnlaceSession()) {
            Set<Long> scope = accesoSessionResolver.consignatarioScope();
            if (scope.isEmpty()) {
                return List.of();
            }
            return paqueteRepository.findEnDespachoByConsignatarioIdIn(scope);
        }
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        return paqueteRepository.findEnDespachoByConsignatarioUsuarioId(usuarioId);
    }

    private List<MiDespachoDTO> agruparPorDespacho(List<Paquete> paquetes, ReglaConfirmacion regla) {
        Map<Long, List<Paquete>> porDespacho = new LinkedHashMap<>();
        for (Paquete p : paquetes) {
            if (p.getSaca() == null || p.getSaca().getDespacho() == null) {
                continue;
            }
            porDespacho.computeIfAbsent(p.getSaca().getDespacho().getId(), k -> new ArrayList<>()).add(p);
        }
        List<MiDespachoDTO> result = new ArrayList<>();
        for (Map.Entry<Long, List<Paquete>> entry : porDespacho.entrySet()) {
            List<Paquete> piezas = entry.getValue();
            Despacho d = piezas.get(0).getSaca().getDespacho();
            List<MiDespachoPiezaDTO> piezasDTO = piezas.stream()
                    .map(p -> piezaDTO(p, regla))
                    .toList();
            boolean confirmable = piezasDTO.stream().anyMatch(MiDespachoPiezaDTO::isConfirmable);
            boolean entregaConfirmada = regla.entregaOrden() != null
                    && piezas.stream().allMatch(p -> ordenDe(p) != null && ordenDe(p) >= regla.entregaOrden());
            BigDecimal pesoLbs = sumarPesoLbs(piezas);
            result.add(MiDespachoDTO.builder()
                    .despachoId(d.getId())
                    .numeroGuia(d.getNumeroGuia())
                    .fecha(d.getFechaHora())
                    .tipoEntrega(d.getTipoEntrega() != null ? d.getTipoEntrega().name() : null)
                    .destinoNombre(resolverDestino(d))
                    .operadorEntregaNombre(resolverOperador(d))
                    .totalPiezas(piezas.size())
                    .pesoLbsTotal(pesoLbs)
                    .pesoKgTotal(WeightUtil.lbsToKg(pesoLbs))
                    .confirmable(confirmable)
                    .entregaConfirmada(entregaConfirmada)
                    .piezas(piezasDTO)
                    .build());
        }
        return result;
    }

    @Transactional(readOnly = true)
    public MiDespachoDetalleDTO detalle(Long despachoId) {
        ReglaConfirmacion regla = cargarRegla();
        List<Paquete> piezas = paquetesDelCliente().stream()
                .filter(p -> p.getSaca() != null
                        && p.getSaca().getDespacho() != null
                        && despachoId.equals(p.getSaca().getDespacho().getId()))
                .toList();
        if (piezas.isEmpty()) {
            throw new ResourceNotFoundException("Despacho", despachoId);
        }
        Despacho d = piezas.get(0).getSaca().getDespacho();
        List<MiDespachoPiezaDTO> piezasDTO = piezas.stream().map(p -> piezaDTO(p, regla)).toList();
        BigDecimal pesoLbs = sumarPesoLbs(piezas);
        boolean confirmable = piezasDTO.stream().anyMatch(MiDespachoPiezaDTO::isConfirmable);
        boolean entregaConfirmada = regla.entregaOrden() != null
                && piezas.stream().allMatch(p -> ordenDe(p) != null && ordenDe(p) >= regla.entregaOrden());
        return MiDespachoDetalleDTO.builder()
                .despachoId(d.getId())
                .numeroGuia(d.getNumeroGuia())
                .codigoPrecinto(d.getCodigoPrecinto())
                .fecha(d.getFechaHora())
                .tipoEntrega(d.getTipoEntrega() != null ? d.getTipoEntrega().name() : null)
                .destinoNombre(resolverDestino(d))
                .operadorEntregaNombre(resolverOperador(d))
                .observaciones(d.getObservaciones())
                .totalPiezas(piezas.size())
                .pesoLbsTotal(pesoLbs)
                .pesoKgTotal(WeightUtil.lbsToKg(pesoLbs))
                .confirmable(confirmable)
                .entregaConfirmada(entregaConfirmada)
                .piezas(piezasDTO)
                .build();
    }

    /**
     * Destino de la entrega del cliente según la modalidad. Usa la misma fuente
     * histórica que el resto del módulo de despacho (snapshot SCD2 V67): si el
     * despacho ya congeló su destino, se lee de la versión inmutable para no
     * mostrar datos del maestro vivo que pudieron cambiar después.
     *
     * - DOMICILIO -> nombre del destinatario (consignatario)
     * - AGENCIA -> nombre de la oficina/agencia ECUBOX
     * - AGENCIA_COURIER_ENTREGA -> etiqueta del punto de entrega del courier
     */
    private String resolverDestino(Despacho d) {
        TipoEntrega tipo = d.getTipoEntrega();
        if (tipo == null) {
            return null;
        }
        return switch (tipo) {
            case DOMICILIO -> nombreConsignatario(d);
            case AGENCIA -> nombreAgencia(d);
            case AGENCIA_COURIER_ENTREGA -> nombrePuntoEntrega(d);
        };
    }

    /**
     * Operador u oficina que realiza la entrega. En domicilio y punto de entrega
     * es el courier de entrega; en retiro en oficina es la propia agencia ECUBOX.
     * El courier de entrega no tiene snapshot SCD2 (igual que en el módulo admin,
     * se lee del maestro vivo).
     */
    private String resolverOperador(Despacho d) {
        if (d.getCourierEntrega() != null && d.getCourierEntrega().getNombre() != null) {
            return d.getCourierEntrega().getNombre();
        }
        if (d.getTipoEntrega() == TipoEntrega.AGENCIA) {
            return nombreAgencia(d);
        }
        return null;
    }

    private String nombreConsignatario(Despacho d) {
        if (d.getConsignatarioVersion() != null) {
            return d.getConsignatarioVersion().getNombre();
        }
        return d.getConsignatario() != null ? d.getConsignatario().getNombre() : null;
    }

    private String nombreAgencia(Despacho d) {
        if (d.getAgenciaVersion() != null) {
            return d.getAgenciaVersion().getNombre();
        }
        return d.getAgencia() != null ? d.getAgencia().getNombre() : null;
    }

    private String nombrePuntoEntrega(Despacho d) {
        if (d.getAgenciaCourierEntregaVersion() != null) {
            return etiquetaDeVersion(d.getAgenciaCourierEntregaVersion());
        }
        if (d.getAgenciaCourierEntrega() != null) {
            return AgenciaCourierEntregaService.etiquetaDe(d.getAgenciaCourierEntrega());
        }
        return null;
    }

    /**
     * Reconstruye la etiqueta "Provincia, Canton (CODIGO)" desde un snapshot
     * inmutable de punto de entrega, igual que {@code DespachoService} para
     * mantener consistencia visual con el resto del módulo.
     */
    private static String etiquetaDeVersion(AgenciaCourierEntregaVersion a) {
        if (a == null) {
            return null;
        }
        String prov = a.getProvincia() != null ? a.getProvincia().trim() : "";
        String cant = a.getCanton() != null ? a.getCanton().trim() : "";
        String cod = a.getCodigo() != null ? a.getCodigo().trim() : "";
        List<String> parts = new ArrayList<>();
        if (!prov.isEmpty()) parts.add(prov);
        if (!cant.isEmpty()) parts.add(cant);
        String loc = String.join(", ", parts);
        if (!loc.isEmpty()) {
            return cod.isEmpty() ? loc : loc + " (" + cod + ")";
        }
        return cod.isEmpty() ? null : cod;
    }

    private static BigDecimal sumarPesoLbs(List<Paquete> piezas) {
        return piezas.stream()
                .map(Paquete::getPesoLbs)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private MiDespachoPiezaDTO piezaDTO(Paquete p, ReglaConfirmacion regla) {
        return MiDespachoPiezaDTO.builder()
                .paqueteId(p.getId())
                .numeroGuia(p.getNumeroGuia())
                .ref(p.getRef())
                .contenido(p.getContenido())
                .pesoLbs(p.getPesoLbs())
                .pesoKg(WeightUtil.lbsToKg(p.getPesoLbs()))
                .estadoNombre(p.getEstadoRastreo() != null ? p.getEstadoRastreo().getNombre() : null)
                .estadoCodigo(p.getEstadoRastreo() != null ? p.getEstadoRastreo().getCodigo() : null)
                .confirmable(esConfirmable(p, regla))
                .build();
    }

    /**
     * Una pieza es confirmable si ya alcanzó el estado que habilita la confirmación
     * (aviso) y todavía no llegó al estado de entrega confirmada.
     */
    private boolean esConfirmable(Paquete p, ReglaConfirmacion regla) {
        if (regla.entregaEstadoId() == null || regla.avisoOrden() == null || regla.entregaOrden() == null) {
            return false;
        }
        Integer orden = ordenDe(p);
        return orden != null && orden >= regla.avisoOrden() && orden < regla.entregaOrden();
    }

    private Integer ordenDe(Paquete p) {
        EstadoRastreo e = p.getEstadoRastreo();
        if (e == null) {
            return null;
        }
        return e.getOrden() != null ? e.getOrden() : e.getOrdenTracking();
    }

    private ReglaConfirmacion cargarRegla() {
        EstadosRastreoPorPuntoDTO cfg = parametroSistemaService.getEstadosRastreoPorPunto();
        Long entregaId = cfg.getEstadoRastreoEntregaConfirmadaClienteId();
        Long avisoId = cfg.getEstadoRastreoAvisoConfirmacionEntregaId();
        Integer entregaOrden = entregaId != null ? estadoRastreoService.getOrdenById(entregaId) : null;
        Integer avisoOrden = avisoId != null ? estadoRastreoService.getOrdenById(avisoId) : null;
        return new ReglaConfirmacion(entregaId, entregaOrden, avisoOrden);
    }

    private record ReglaConfirmacion(Long entregaEstadoId, Integer entregaOrden, Integer avisoOrden) {
    }
}
