package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.AplicarEstadoPorPeriodoResponse;
import com.ecubox.ecubox_backend.dto.DespachoCreateRequest;
import com.ecubox.ecubox_backend.dto.DespachoDTO;
import com.ecubox.ecubox_backend.dto.MensajeWhatsAppDespachoGeneradoDTO;
import com.ecubox.ecubox_backend.dto.SacaDTO;
import com.ecubox.ecubox_backend.entity.*;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.enums.TipoEntrega;
import com.ecubox.ecubox_backend.repository.*;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.validation.SacaEnDespachoValidator;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class DespachoService {

    private final DespachoRepository despachoRepository;
    private final DistribuidorRepository distribuidorRepository;
    private final DestinatarioFinalRepository destinatarioFinalRepository;
    private final AgenciaRepository agenciaRepository;
    private final SacaRepository sacaRepository;
    private final SacaService sacaService;
    private final CurrentUserService currentUserService;
    private final PaqueteService paqueteService;
    private final PaqueteRepository paqueteRepository;
    private final ParametroSistemaService parametroSistemaService;
    private final AgenciaDistribuidorService agenciaDistribuidorService;
    private final SacaEnDespachoValidator sacaEnDespachoValidator;

    public DespachoService(DespachoRepository despachoRepository,
                          DistribuidorRepository distribuidorRepository,
                          DestinatarioFinalRepository destinatarioFinalRepository,
                          AgenciaRepository agenciaRepository,
                          SacaRepository sacaRepository,
                          SacaService sacaService,
                          CurrentUserService currentUserService,
                          PaqueteService paqueteService,
                          PaqueteRepository paqueteRepository,
                          ParametroSistemaService parametroSistemaService,
                          AgenciaDistribuidorService agenciaDistribuidorService,
                          SacaEnDespachoValidator sacaEnDespachoValidator) {
        this.despachoRepository = despachoRepository;
        this.distribuidorRepository = distribuidorRepository;
        this.destinatarioFinalRepository = destinatarioFinalRepository;
        this.agenciaRepository = agenciaRepository;
        this.sacaRepository = sacaRepository;
        this.sacaService = sacaService;
        this.currentUserService = currentUserService;
        this.paqueteService = paqueteService;
        this.paqueteRepository = paqueteRepository;
        this.sacaEnDespachoValidator = sacaEnDespachoValidator;
        this.parametroSistemaService = parametroSistemaService;
        this.agenciaDistribuidorService = agenciaDistribuidorService;
    }

    @Transactional(readOnly = true)
    public List<DespachoDTO> findAll() {
        return despachoRepository.findAll(Sort.by(Sort.Direction.DESC, "id")).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional
    public DespachoDTO create(DespachoCreateRequest request) {
        Distribuidor distribuidor = distribuidorRepository.findById(request.getDistribuidorId())
                .orElseThrow(() -> new ResourceNotFoundException("Distribuidor", request.getDistribuidorId()));
        EntregaResuelta entrega = resolveEntrega(request);

        List<Long> sacaIds = request.getSacaIds() != null ? request.getSacaIds() : new ArrayList<>();
        validarSacasParaTipoEntrega(request.getTipoEntrega(), sacaIds);

        Usuario operario = currentUserService.getCurrentUsuario();
        LocalDateTime fechaHora = request.getFechaHora() != null ? request.getFechaHora() : LocalDateTime.now();

        Despacho d = Despacho.builder()
                .numeroGuia(request.getNumeroGuia().trim())
                .observaciones(request.getObservaciones() != null ? request.getObservaciones().trim() : null)
                .codigoPrecinto(request.getCodigoPrecinto() != null ? request.getCodigoPrecinto().trim() : null)
                .operario(operario)
                .fechaHora(fechaHora)
                .distribuidor(distribuidor)
                .tipoEntrega(request.getTipoEntrega())
                .destinatarioFinal(entrega.destinatarioFinal())
                .agencia(entrega.agencia())
                .agenciaDistribuidor(entrega.agenciaDistribuidor())
                .build();
        d = despachoRepository.save(d);

        if (!sacaIds.isEmpty()) {
            List<Saca> sacasACambiar = sacaRepository.findAllById(sacaIds);
            if (sacasACambiar.size() != sacaIds.size()) {
                Set<Long> encontradas = sacasACambiar.stream().map(Saca::getId).collect(Collectors.toSet());
                Long faltante = sacaIds.stream().filter(sid -> !encontradas.contains(sid)).findFirst().orElse(null);
                throw new ResourceNotFoundException("Saca", faltante);
            }
            for (Saca saca : sacasACambiar) {
                sacaEnDespachoValidator.requireSinDespacho(saca, null);
                saca.setDespacho(d);
            }
            sacaRepository.saveAll(sacasACambiar);
            List<Long> paqueteIds = paqueteRepository.findIdsBySacaIdIn(sacaIds);
            if (!paqueteIds.isEmpty()) {
                paqueteService.aplicarEstadoEnDespacho(paqueteIds);
            }
            d = despachoRepository.findById(d.getId()).orElse(d);
        }

        return toDTO(d);
    }

    @Transactional(readOnly = true)
    public DespachoDTO findById(Long id) {
        Despacho d = despachoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Despacho", id));
        DespachoDTO dto = toDTO(d);
        if (d.getSacas() != null && !d.getSacas().isEmpty()) {
            List<SacaDTO> sacaDTOs = d.getSacas().stream().map(sacaService::toDTO).toList();
            dto.setSacas(sacaDTOs);
        }
        return dto;
    }

    @Transactional
    public DespachoDTO update(Long id, DespachoCreateRequest request) {
        Despacho d = despachoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Despacho", id));

        Distribuidor distribuidor = distribuidorRepository.findById(request.getDistribuidorId())
                .orElseThrow(() -> new ResourceNotFoundException("Distribuidor", request.getDistribuidorId()));
        EntregaResuelta entrega = resolveEntrega(request);

        List<Long> requestedSacaIdsForValidation = request.getSacaIds() != null ? request.getSacaIds() : new ArrayList<>();
        validarSacasParaTipoEntrega(request.getTipoEntrega(), requestedSacaIdsForValidation);

        LocalDateTime fechaHora = request.getFechaHora() != null ? request.getFechaHora() : d.getFechaHora();

        d.setNumeroGuia(request.getNumeroGuia().trim());
        d.setObservaciones(request.getObservaciones() != null ? request.getObservaciones().trim() : null);
        d.setCodigoPrecinto(request.getCodigoPrecinto() != null ? request.getCodigoPrecinto().trim() : null);
        d.setFechaHora(fechaHora);
        d.setDistribuidor(distribuidor);
        d.setTipoEntrega(request.getTipoEntrega());
        d.setDestinatarioFinal(entrega.destinatarioFinal());
        d.setAgencia(entrega.agencia());
        d.setAgenciaDistribuidor(entrega.agenciaDistribuidor());
        despachoRepository.save(d);

        List<Long> requestedSacaIds = request.getSacaIds() != null ? request.getSacaIds() : new ArrayList<>();
        Set<Long> requestedSet = Set.copyOf(requestedSacaIds);

        List<Saca> currentSacas = d.getSacas() != null ? d.getSacas() : new ArrayList<>();
        for (Saca saca : currentSacas) {
            if (!requestedSet.contains(saca.getId())) {
                saca.setDespacho(null);
                sacaRepository.save(saca);
            }
        }

        List<Long> currentSacaIds = currentSacas.stream().map(Saca::getId).toList();
        Set<Long> currentSet = Set.copyOf(currentSacaIds);
        List<Long> nuevasSacaIds = new ArrayList<>();
        if (!requestedSacaIds.isEmpty()) {
            List<Saca> sacasReq = sacaRepository.findAllById(requestedSacaIds);
            if (sacasReq.size() != requestedSacaIds.size()) {
                Set<Long> encontradas = sacasReq.stream().map(Saca::getId).collect(Collectors.toSet());
                Long faltante = requestedSacaIds.stream().filter(sid -> !encontradas.contains(sid)).findFirst().orElse(null);
                throw new ResourceNotFoundException("Saca", faltante);
            }
            for (Saca saca : sacasReq) {
                sacaEnDespachoValidator.requireSinDespacho(saca, id);
                if (!currentSet.contains(saca.getId())) {
                    nuevasSacaIds.add(saca.getId());
                }
                saca.setDespacho(d);
            }
            sacaRepository.saveAll(sacasReq);
        }
        if (!nuevasSacaIds.isEmpty()) {
            List<Long> paqueteIdsToApply = paqueteRepository.findIdsBySacaIdIn(nuevasSacaIds);
            if (!paqueteIdsToApply.isEmpty()) {
                paqueteService.aplicarEstadoEnDespacho(paqueteIdsToApply);
            }
        }

        d = despachoRepository.findById(d.getId()).orElse(d);
        return toDTO(d);
    }

    @Transactional
    public void delete(Long id) {
        Despacho d = despachoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Despacho", id));
        List<Saca> sacas = d.getSacas() != null ? d.getSacas() : new ArrayList<>();
        if (!sacas.isEmpty()) {
            List<Long> sacaIds = sacas.stream().map(Saca::getId).toList();
            List<Long> paqueteIds = paqueteRepository.findIdsBySacaIdIn(sacaIds);
            if (!paqueteIds.isEmpty()) {
                paqueteService.revertirEstadoSiUltimoEventoCoincide(paqueteIds, "DESPACHO_AUTO");
            }
            for (Saca saca : sacas) {
                saca.setDespacho(null);
            }
            sacaRepository.saveAll(sacas);
        }
        despachoRepository.delete(d);
    }

    @Transactional(readOnly = true)
    public MensajeWhatsAppDespachoGeneradoDTO getMensajeWhatsAppParaDespacho(Long id) {
        String plantilla = parametroSistemaService.getMensajeWhatsAppDespacho().getPlantilla();
        if (plantilla == null) {
            plantilla = "";
        }
        Despacho d = despachoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Despacho", id));

        List<Saca> sacas = sacaRepository.findByDespachoIdOrderByIdAsc(id);
        int cantidadSacas = sacas.size();
        long totalPaquetes = 0;
        List<String> numerosSacaList = new ArrayList<>();
        List<String> paquetesPorSacaList = new ArrayList<>();
        for (Saca saca : sacas) {
            long count = paqueteRepository.countBySacaId(saca.getId());
            totalPaquetes += count;
            numerosSacaList.add(saca.getNumeroOrden() != null ? saca.getNumeroOrden() : "");
            paquetesPorSacaList.add(String.valueOf(count));
        }
        String codigoPrecinto = d.getCodigoPrecinto() != null ? d.getCodigoPrecinto() : "";
        String cantidadSacasStr = String.valueOf(cantidadSacas);
        String totalPaquetesStr = String.valueOf(totalPaquetes);
        String numerosSaca = String.join(", ", numerosSacaList);
        String paquetesPorSaca = String.join(", ", paquetesPorSacaList);

        String numeroGuia = d.getNumeroGuia() != null ? d.getNumeroGuia() : "";
        String destinatarioNombre = d.getDestinatarioFinal() != null && d.getDestinatarioFinal().getNombre() != null
                ? d.getDestinatarioFinal().getNombre() : "";
        String distribuidorNombre = d.getDistribuidor() != null && d.getDistribuidor().getNombre() != null
                ? d.getDistribuidor().getNombre() : "";
        String agenciaNombre = d.getAgencia() != null && d.getAgencia().getNombre() != null
                ? d.getAgencia().getNombre() : "";
        if (d.getAgenciaDistribuidor() != null) {
            agenciaNombre = com.ecubox.ecubox_backend.service.AgenciaDistribuidorService.etiquetaDe(d.getAgenciaDistribuidor());
        }
        String observaciones = d.getObservaciones() != null ? d.getObservaciones() : "";

        String mensaje = plantilla
                .replace("{{numeroGuia}}", numeroGuia)
                .replace("{{destinatarioNombre}}", destinatarioNombre)
                .replace("{{distribuidorNombre}}", distribuidorNombre)
                .replace("{{agenciaNombre}}", agenciaNombre)
                .replace("{{observaciones}}", observaciones)
                .replace("{{codigoPrecinto}}", codigoPrecinto)
                .replace("{{cantidadSacas}}", cantidadSacasStr)
                .replace("{{totalPaquetes}}", totalPaquetesStr)
                .replace("{{numerosSaca}}", numerosSaca)
                .replace("{{paquetesPorSaca}}", paquetesPorSaca);

        return MensajeWhatsAppDespachoGeneradoDTO.builder()
                .mensaje(mensaje)
                .build();
    }

    @Transactional
    public AplicarEstadoPorPeriodoResponse aplicarEstadoRastreoPorPeriodo(LocalDate fechaInicio, LocalDate fechaFin, Long estadoRastreoIdOpcional) {
        Long estadoId = resolverEstadoIdParaTransito(estadoRastreoIdOpcional);
        LocalDateTime desde = fechaInicio.atStartOfDay();
        LocalDateTime hasta = fechaFin.atTime(LocalTime.MAX);
        List<Despacho> despachos = despachoRepository.findByFechaHoraBetweenOrderByFechaHoraAscIdAsc(desde, hasta);
        return aplicarEstadoEnDespachos(despachos, estadoId);
    }

    /**
     * Aplica el estado a todos los paquetes de los despachos indicados (uno o varios).
     * Si {@code estadoRastreoIdOpcional} es null se usa el estado "en tránsito" configurado.
     */
    @Transactional
    public AplicarEstadoPorPeriodoResponse aplicarEstadoRastreoEnDespachos(List<Long> despachoIds,
                                                                           Long estadoRastreoIdOpcional) {
        if (despachoIds == null || despachoIds.isEmpty()) {
            throw new BadRequestException("Debe indicar al menos un despacho");
        }
        Long estadoId = resolverEstadoIdParaTransito(estadoRastreoIdOpcional);
        List<Long> idsUnicos = despachoIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        List<Despacho> despachos = despachoRepository.findAllById(idsUnicos);
        if (despachos.size() != idsUnicos.size()) {
            Set<Long> encontrados = despachos.stream().map(Despacho::getId).collect(Collectors.toSet());
            Long faltante = idsUnicos.stream().filter(id -> !encontrados.contains(id)).findFirst().orElse(null);
            if (faltante != null) {
                throw new ResourceNotFoundException("Despacho", faltante);
            }
        }
        return aplicarEstadoEnDespachos(despachos, estadoId);
    }

    private Long resolverEstadoIdParaTransito(Long estadoRastreoIdOpcional) {
        Long estadoId = estadoRastreoIdOpcional != null
                ? estadoRastreoIdOpcional
                : parametroSistemaService.getEstadosRastreoPorPunto().getEstadoRastreoEnTransitoId();
        if (estadoId == null) {
            throw new BadRequestException("No hay estado de rastreo configurado para en tránsito");
        }
        return estadoId;
    }

    private AplicarEstadoPorPeriodoResponse aplicarEstadoEnDespachos(List<Despacho> despachos, Long estadoId) {
        if (despachos.isEmpty()) {
            return AplicarEstadoPorPeriodoResponse.builder().despachosProcesados(0).paquetesActualizados(0).build();
        }
        List<Long> despachoIds = despachos.stream().map(Despacho::getId).toList();
        List<Saca> sacas = sacaRepository.findByDespachoIdIn(despachoIds);
        List<Long> sacaIds = sacas.stream().map(Saca::getId).toList();
        List<Long> paqueteIds = sacaIds.isEmpty() ? List.of() : paqueteRepository.findIdsBySacaIdIn(sacaIds);
        paqueteService.aplicarEstadoRastreoMasivo(paqueteIds, estadoId);
        return AplicarEstadoPorPeriodoResponse.builder()
                .despachosProcesados(despachos.size())
                .paquetesActualizados(paqueteIds.size())
                .build();
    }

    private DespachoDTO toDTO(Despacho d) {
        List<Long> sacaIds = d.getSacas() != null
                ? d.getSacas().stream().map(Saca::getId).collect(Collectors.toList())
                : new ArrayList<>();
        return DespachoDTO.builder()
                .id(d.getId())
                .numeroGuia(d.getNumeroGuia())
                .observaciones(d.getObservaciones())
                .codigoPrecinto(d.getCodigoPrecinto())
                .operarioId(d.getOperario() != null ? d.getOperario().getId() : null)
                .operarioNombre(d.getOperario() != null ? d.getOperario().getUsername() : null)
                .fechaHora(d.getFechaHora())
                .distribuidorId(d.getDistribuidor() != null ? d.getDistribuidor().getId() : null)
                .distribuidorNombre(d.getDistribuidor() != null ? d.getDistribuidor().getNombre() : null)
                .tipoEntrega(d.getTipoEntrega())
                .destinatarioFinalId(d.getDestinatarioFinal() != null ? d.getDestinatarioFinal().getId() : null)
                .destinatarioNombre(d.getDestinatarioFinal() != null ? d.getDestinatarioFinal().getNombre() : null)
                .destinatarioDireccion(d.getDestinatarioFinal() != null ? d.getDestinatarioFinal().getDireccion() : null)
                .destinatarioTelefono(d.getDestinatarioFinal() != null ? d.getDestinatarioFinal().getTelefono() : null)
                .agenciaId(d.getAgencia() != null ? d.getAgencia().getId() : null)
                .agenciaNombre(d.getAgencia() != null ? d.getAgencia().getNombre() : null)
                .agenciaDistribuidorId(d.getAgenciaDistribuidor() != null ? d.getAgenciaDistribuidor().getId() : null)
                .agenciaDistribuidorNombre(d.getAgenciaDistribuidor() != null ? com.ecubox.ecubox_backend.service.AgenciaDistribuidorService.etiquetaDe(d.getAgenciaDistribuidor()) : null)
                .sacaIds(sacaIds)
                .build();
    }

    /**
     * Para tipo AGENCIA_DISTRIBUIDOR (y DOMICILIO): todos los paquetes de las sacas deben tener el mismo destinatario final.
     */
    private void validarSacasParaTipoEntrega(TipoEntrega tipoEntrega, List<Long> sacaIds) {
        if (tipoEntrega == TipoEntrega.AGENCIA_DISTRIBUIDOR && !sacaIds.isEmpty()) {
            validarMismoDestinatarioEnSacas(sacaIds);
        }
    }

    private EntregaResuelta resolveEntrega(DespachoCreateRequest request) {
        DestinatarioFinal destinatarioFinal = null;
        Agencia agencia = null;
        AgenciaDistribuidor agenciaDistribuidor = null;

        if (request.getTipoEntrega() == TipoEntrega.DOMICILIO) {
            if (request.getDestinatarioFinalId() == null) {
                throw new BadRequestException("Domicilio requiere destinatario final");
            }
            destinatarioFinal = destinatarioFinalRepository.findById(request.getDestinatarioFinalId())
                    .orElseThrow(() -> new ResourceNotFoundException("Destinatario", request.getDestinatarioFinalId()));
        } else if (request.getTipoEntrega() == TipoEntrega.AGENCIA) {
            if (request.getAgenciaId() == null) {
                throw new BadRequestException("Agencia requiere agencia seleccionada");
            }
            agencia = agenciaRepository.findById(request.getAgenciaId())
                    .orElseThrow(() -> new ResourceNotFoundException("Agencia", request.getAgenciaId()));
        } else if (request.getTipoEntrega() == TipoEntrega.AGENCIA_DISTRIBUIDOR) {
            if (request.getAgenciaDistribuidorId() == null) {
                throw new BadRequestException("Agencia de distribuidor requiere agencia del distribuidor seleccionada");
            }
            agenciaDistribuidor = agenciaDistribuidorService.findEntityById(request.getAgenciaDistribuidorId());
        }

        return new EntregaResuelta(destinatarioFinal, agencia, agenciaDistribuidor);
    }

    private record EntregaResuelta(
            DestinatarioFinal destinatarioFinal,
            Agencia agencia,
            AgenciaDistribuidor agenciaDistribuidor
    ) {}

    private void validarMismoDestinatarioEnSacas(List<Long> sacaIds) {
        Long refDestinatarioId = null;
        for (Long sacaId : sacaIds) {
            List<Paquete> paquetes = paqueteRepository.findBySacaId(sacaId);
            for (Paquete p : paquetes) {
                Long destId = p.getDestinatarioFinal() != null ? p.getDestinatarioFinal().getId() : null;
                if (refDestinatarioId == null) {
                    refDestinatarioId = destId;
                } else if (!java.util.Objects.equals(refDestinatarioId, destId)) {
                    throw new BadRequestException("En despacho a agencia de distribuidor todos los paquetes deben tener el mismo destinatario. Revise los paquetes seleccionados.");
                }
            }
        }
    }
}
