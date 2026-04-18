package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.ManifiestoDTO;
import com.ecubox.ecubox_backend.dto.ManifiestoDespachoCandidatoDTO;
import com.ecubox.ecubox_backend.dto.ManifiestoRequest;
import com.ecubox.ecubox_backend.entity.Despacho;
import com.ecubox.ecubox_backend.entity.Manifiesto;
import com.ecubox.ecubox_backend.enums.EstadoManifiesto;
import com.ecubox.ecubox_backend.enums.FiltroManifiesto;
import com.ecubox.ecubox_backend.enums.TipoEntrega;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.DespachoRepository;
import com.ecubox.ecubox_backend.repository.ManifiestoRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class ManifiestoService {

    private final ManifiestoRepository manifiestoRepository;
    private final DespachoRepository despachoRepository;

    public ManifiestoService(ManifiestoRepository manifiestoRepository, DespachoRepository despachoRepository) {
        this.manifiestoRepository = manifiestoRepository;
        this.despachoRepository = despachoRepository;
    }

    @Transactional(readOnly = true)
    public List<ManifiestoDTO> findAll() {
        return manifiestoRepository.findAll(Sort.by(Sort.Direction.DESC, "id")).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public ManifiestoDTO findById(Long id) {
        Manifiesto m = manifiestoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Manifiesto", id));
        return toDTOConDespachos(m, findDespachosAsignadosEntities(id));
    }

    @Transactional
    public ManifiestoDTO create(ManifiestoRequest request) {
        validateRequest(request);
        String codigo = generarCodigoManifiesto();
        Manifiesto entity = toEntity(request);
        entity.setCodigo(codigo);
        entity = manifiestoRepository.save(entity);
        List<Despacho> candidatos = findDespachosCandidatosEntities(entity);
        vincularDespachosAManifiesto(entity, candidatos);
        return recalcularTotales(entity.getId());
    }

    @Transactional
    public ManifiestoDTO update(Long id, ManifiestoRequest request) {
        validateRequest(request);
        Manifiesto entity = manifiestoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Manifiesto", id));
        updateEntityFromRequest(entity, request);
        entity = manifiestoRepository.save(entity);
        return toDTO(entity);
    }

    @Transactional
    public void delete(Long id) {
        Manifiesto m = manifiestoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Manifiesto", id));
        for (Despacho d : findDespachosAsignadosEntities(id)) {
            d.setManifiesto(null);
            despachoRepository.save(d);
        }
        manifiestoRepository.delete(m);
    }

    @Transactional
    public ManifiestoDTO asignarDespachos(Long manifiestoId, List<Long> despachoIds) {
        Manifiesto m = manifiestoRepository.findById(manifiestoId)
                .orElseThrow(() -> new ResourceNotFoundException("Manifiesto", manifiestoId));
        Set<Long> idsCandidatos = findDespachosCandidatosEntities(m).stream().map(Despacho::getId).collect(java.util.stream.Collectors.toSet());
        Set<Long> idsYaAsignados = findDespachosAsignadosEntities(manifiestoId).stream()
                .map(Despacho::getId)
                .collect(java.util.stream.Collectors.toSet());
        List<Despacho> despachosAVincular = new ArrayList<>();
        if (despachoIds != null) {
            for (Long despachoId : despachoIds) {
                if (!idsCandidatos.contains(despachoId) && !idsYaAsignados.contains(despachoId)) {
                    throw new BadRequestException("El despacho " + despachoId + " no cumple los filtros del manifiesto.");
                }
                Despacho d = despachoRepository.findById(despachoId)
                        .orElseThrow(() -> new ResourceNotFoundException("Despacho", despachoId));
                despachosAVincular.add(d);
            }
        }
        vincularDespachosAManifiesto(m, despachosAVincular);
        recalcularTotales(manifiestoId);
        return findById(manifiestoId);
    }

    @Transactional(readOnly = true)
    public List<ManifiestoDespachoCandidatoDTO> findDespachosCandidatos(Long manifiestoId) {
        Manifiesto m = manifiestoRepository.findById(manifiestoId)
                .orElseThrow(() -> new ResourceNotFoundException("Manifiesto", manifiestoId));
        return findDespachosCandidatosEntities(m).stream()
                .map(this::toDespachoCandidatoDTO)
                .toList();
    }

    @Transactional
    public ManifiestoDTO recalcularTotales(Long id) {
        Manifiesto m = manifiestoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Manifiesto", id));
        List<Despacho> despachos = findDespachosAsignadosEntities(id);
        BigDecimal subtotalDomicilio = BigDecimal.ZERO;
        BigDecimal subtotalAgenciaFlete = BigDecimal.ZERO;
        BigDecimal subtotalComisionAgencias = BigDecimal.ZERO;
        for (Despacho d : despachos) {
            if (d.getTipoEntrega() == TipoEntrega.DOMICILIO && d.getDistribuidor() != null) {
                subtotalDomicilio = subtotalDomicilio.add(
                        d.getDistribuidor().getTarifaEnvio() != null
                                ? d.getDistribuidor().getTarifaEnvio()
                                : BigDecimal.ZERO);
            } else if (d.getTipoEntrega() == TipoEntrega.AGENCIA) {
                if (d.getDistribuidor() != null && d.getDistribuidor().getTarifaEnvio() != null) {
                    subtotalAgenciaFlete = subtotalAgenciaFlete.add(d.getDistribuidor().getTarifaEnvio());
                }
                if (d.getAgencia() != null && d.getAgencia().getTarifaServicio() != null) {
                    subtotalComisionAgencias = subtotalComisionAgencias.add(d.getAgencia().getTarifaServicio());
                }
            } else if (d.getTipoEntrega() == TipoEntrega.AGENCIA_DISTRIBUIDOR) {
                if (d.getDistribuidor() != null && d.getDistribuidor().getTarifaEnvio() != null) {
                    subtotalAgenciaFlete = subtotalAgenciaFlete.add(d.getDistribuidor().getTarifaEnvio());
                }
                if (d.getAgenciaDistribuidor() != null && d.getAgenciaDistribuidor().getTarifa() != null) {
                    subtotalComisionAgencias = subtotalComisionAgencias.add(d.getAgenciaDistribuidor().getTarifa());
                }
            }
        }
        BigDecimal totalPagar = subtotalDomicilio.add(subtotalAgenciaFlete).add(subtotalComisionAgencias);
        m.setCantidadDespachos(despachos.size());
        m.setSubtotalDomicilio(subtotalDomicilio);
        m.setSubtotalAgenciaFlete(subtotalAgenciaFlete);
        m.setSubtotalComisionAgencias(subtotalComisionAgencias);
        m.setTotalPagar(totalPagar);
        manifiestoRepository.save(m);
        return findById(id);
    }

    @Transactional
    public ManifiestoDTO cambiarEstado(Long id, EstadoManifiesto estado) {
        Manifiesto m = manifiestoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Manifiesto", id));
        m.setEstado(estado);
        manifiestoRepository.save(m);
        return toDTO(m);
    }

    private void validateRequest(ManifiestoRequest request) {
        if (request.getFechaFin() != null && request.getFechaInicio() != null
                && !request.getFechaFin().isBefore(request.getFechaInicio())) {
            // fechaFin >= fechaInicio OK
        } else if (request.getFechaFin() != null && request.getFechaInicio() != null) {
            throw new BadRequestException("La fecha de fin debe ser mayor o igual a la fecha de inicio");
        }
    }

    private Manifiesto toEntity(ManifiestoRequest r) {
        return Manifiesto.builder()
                .codigo("")
                .fechaInicio(r.getFechaInicio())
                .fechaFin(r.getFechaFin())
                .filtroTipo(FiltroManifiesto.POR_PERIODO)
                .filtroDistribuidor(null)
                .filtroAgencia(null)
                .estado(EstadoManifiesto.PENDIENTE)
                .cantidadDespachos(0)
                .subtotalDomicilio(BigDecimal.ZERO)
                .subtotalAgenciaFlete(BigDecimal.ZERO)
                .subtotalComisionAgencias(BigDecimal.ZERO)
                .totalPagar(BigDecimal.ZERO)
                .build();
    }

    private void updateEntityFromRequest(Manifiesto entity, ManifiestoRequest r) {
        entity.setFechaInicio(r.getFechaInicio());
        entity.setFechaFin(r.getFechaFin());
        entity.setFiltroTipo(FiltroManifiesto.POR_PERIODO);
        entity.setFiltroDistribuidor(null);
        entity.setFiltroAgencia(null);
    }

    private String generarCodigoManifiesto() {
        String base = "MAN-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        for (int i = 0; i < 20; i++) {
            int sufijo = ThreadLocalRandom.current().nextInt(1000, 10000);
            String candidate = base + "-" + sufijo;
            if (!manifiestoRepository.existsByCodigo(candidate)) {
                return candidate;
            }
        }
        throw new BadRequestException("No fue posible generar un código único de manifiesto. Intente nuevamente.");
    }

    private List<Despacho> findDespachosCandidatosEntities(Manifiesto m) {
        LocalDateTime desde = m.getFechaInicio().atStartOfDay();
        LocalDateTime hastaExclusivo = m.getFechaFin().plusDays(1).atStartOfDay();
        Long distribuidorId = m.getFiltroDistribuidor() != null ? m.getFiltroDistribuidor().getId() : null;
        Long agenciaId = m.getFiltroAgencia() != null ? m.getFiltroAgencia().getId() : null;
        return despachoRepository.findCandidatosParaManifiesto(desde, hastaExclusivo, distribuidorId, agenciaId);
    }

    private void vincularDespachosAManifiesto(Manifiesto manifiesto, List<Despacho> despachos) {
        if (despachos == null || despachos.isEmpty()) return;
        Set<Long> idsEnMemoria = new java.util.HashSet<>();
        if (manifiesto.getDespachos() != null) {
            for (Despacho actual : manifiesto.getDespachos()) {
                if (actual.getId() != null) {
                    idsEnMemoria.add(actual.getId());
                }
            }
        }
        for (Despacho d : despachos) {
            d.setManifiesto(manifiesto);
            if (manifiesto.getDespachos() != null && d.getId() != null && !idsEnMemoria.contains(d.getId())) {
                manifiesto.getDespachos().add(d);
                idsEnMemoria.add(d.getId());
            }
        }
        despachoRepository.saveAll(despachos);
    }

    private List<Despacho> findDespachosAsignadosEntities(Long manifiestoId) {
        return despachoRepository.findByManifiestoId(manifiestoId).stream()
                .sorted(Comparator.comparing(Despacho::getId))
                .toList();
    }

    private ManifiestoDespachoCandidatoDTO toDespachoCandidatoDTO(Despacho d) {
        return ManifiestoDespachoCandidatoDTO.builder()
                .id(d.getId())
                .numeroGuia(d.getNumeroGuia())
                .distribuidorNombre(d.getDistribuidor() != null ? d.getDistribuidor().getNombre() : null)
                .tipoEntrega(d.getTipoEntrega() != null ? d.getTipoEntrega().name() : null)
                .agenciaNombre(d.getAgencia() != null ? d.getAgencia().getNombre() : null)
                .destinatarioNombre(d.getDestinatarioFinal() != null ? d.getDestinatarioFinal().getNombre() : null)
                .fechaHora(d.getFechaHora())
                .build();
    }

    private ManifiestoDTO toDTO(Manifiesto m) {
        return ManifiestoDTO.builder()
                .id(m.getId())
                .codigo(m.getCodigo())
                .fechaInicio(m.getFechaInicio())
                .fechaFin(m.getFechaFin())
                .filtroTipo(m.getFiltroTipo())
                .filtroDistribuidorId(m.getFiltroDistribuidor() != null ? m.getFiltroDistribuidor().getId() : null)
                .filtroDistribuidorNombre(m.getFiltroDistribuidor() != null ? m.getFiltroDistribuidor().getNombre() : null)
                .filtroAgenciaId(m.getFiltroAgencia() != null ? m.getFiltroAgencia().getId() : null)
                .filtroAgenciaNombre(m.getFiltroAgencia() != null ? m.getFiltroAgencia().getNombre() : null)
                .cantidadDespachos(m.getCantidadDespachos() != null ? m.getCantidadDespachos() : 0)
                .subtotalDomicilio(m.getSubtotalDomicilio() != null ? m.getSubtotalDomicilio() : BigDecimal.ZERO)
                .subtotalAgenciaFlete(m.getSubtotalAgenciaFlete() != null ? m.getSubtotalAgenciaFlete() : BigDecimal.ZERO)
                .subtotalComisionAgencias(m.getSubtotalComisionAgencias() != null ? m.getSubtotalComisionAgencias() : BigDecimal.ZERO)
                .totalDistribuidor((m.getSubtotalDomicilio() != null ? m.getSubtotalDomicilio() : BigDecimal.ZERO)
                        .add(m.getSubtotalAgenciaFlete() != null ? m.getSubtotalAgenciaFlete() : BigDecimal.ZERO))
                .totalAgencia(m.getSubtotalComisionAgencias() != null ? m.getSubtotalComisionAgencias() : BigDecimal.ZERO)
                .totalPagar(m.getTotalPagar() != null ? m.getTotalPagar() : BigDecimal.ZERO)
                .estado(m.getEstado() != null ? m.getEstado() : EstadoManifiesto.PENDIENTE)
                .despachos(List.of())
                .build();
    }

    private ManifiestoDTO toDTOConDespachos(Manifiesto m, List<Despacho> despachosAsignados) {
        List<ManifiestoDTO.DespachoEnManifiestoDTO> despachosList = new ArrayList<>();
        for (Despacho d : despachosAsignados) {
            despachosList.add(new ManifiestoDTO.DespachoEnManifiestoDTO(
                    d.getId(),
                    d.getNumeroGuia(),
                    d.getDistribuidor() != null ? d.getDistribuidor().getNombre() : null,
                    d.getTipoEntrega() != null ? d.getTipoEntrega().name() : null,
                    d.getAgencia() != null ? d.getAgencia().getNombre() : null,
                    d.getDestinatarioFinal() != null ? d.getDestinatarioFinal().getNombre() : null
            ));
        }
        return ManifiestoDTO.builder()
                .id(m.getId())
                .codigo(m.getCodigo())
                .fechaInicio(m.getFechaInicio())
                .fechaFin(m.getFechaFin())
                .filtroTipo(m.getFiltroTipo())
                .filtroDistribuidorId(m.getFiltroDistribuidor() != null ? m.getFiltroDistribuidor().getId() : null)
                .filtroDistribuidorNombre(m.getFiltroDistribuidor() != null ? m.getFiltroDistribuidor().getNombre() : null)
                .filtroAgenciaId(m.getFiltroAgencia() != null ? m.getFiltroAgencia().getId() : null)
                .filtroAgenciaNombre(m.getFiltroAgencia() != null ? m.getFiltroAgencia().getNombre() : null)
                .cantidadDespachos(m.getCantidadDespachos() != null ? m.getCantidadDespachos() : 0)
                .subtotalDomicilio(m.getSubtotalDomicilio() != null ? m.getSubtotalDomicilio() : BigDecimal.ZERO)
                .subtotalAgenciaFlete(m.getSubtotalAgenciaFlete() != null ? m.getSubtotalAgenciaFlete() : BigDecimal.ZERO)
                .subtotalComisionAgencias(m.getSubtotalComisionAgencias() != null ? m.getSubtotalComisionAgencias() : BigDecimal.ZERO)
                .totalDistribuidor((m.getSubtotalDomicilio() != null ? m.getSubtotalDomicilio() : BigDecimal.ZERO)
                        .add(m.getSubtotalAgenciaFlete() != null ? m.getSubtotalAgenciaFlete() : BigDecimal.ZERO))
                .totalAgencia(m.getSubtotalComisionAgencias() != null ? m.getSubtotalComisionAgencias() : BigDecimal.ZERO)
                .totalPagar(m.getTotalPagar() != null ? m.getTotalPagar() : BigDecimal.ZERO)
                .estado(m.getEstado() != null ? m.getEstado() : EstadoManifiesto.PENDIENTE)
                .despachos(despachosList)
                .build();
    }
}
