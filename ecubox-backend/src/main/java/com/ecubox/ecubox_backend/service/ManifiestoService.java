package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.ManifiestoDTO;
import com.ecubox.ecubox_backend.dto.ManifiestoDespachoCandidatoDTO;
import com.ecubox.ecubox_backend.dto.ManifiestoRequest;
import com.ecubox.ecubox_backend.entity.Despacho;
import com.ecubox.ecubox_backend.entity.Manifiesto;
import com.ecubox.ecubox_backend.enums.FiltroManifiesto;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.DespachoRepository;
import com.ecubox.ecubox_backend.repository.ManifiestoRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Maneja el manifiesto como un <strong>agrupador logistico</strong> de
 * despachos enviados en un periodo (a domicilio, agencia o punto de
 * entrega). Soporta CRUD basico, asignacion/desasignacion de despachos y
 * busqueda de candidatos por rango de fechas.
 *
 * <p>No realiza ningun calculo monetario ni mantiene estado de pago: esa
 * responsabilidad pertenece al modulo de Liquidaciones. La unica
 * "denormalizacion" que mantiene es {@code cantidadDespachos} para que los
 * listados rapidos no tengan que consultar la tabla de despachos.
 */
@Service
public class ManifiestoService {

    private final ManifiestoRepository manifiestoRepository;
    private final DespachoRepository despachoRepository;
    private final CodigoSecuenciaService codigoSecuenciaService;

    public ManifiestoService(ManifiestoRepository manifiestoRepository,
                             DespachoRepository despachoRepository,
                             CodigoSecuenciaService codigoSecuenciaService) {
        this.manifiestoRepository = manifiestoRepository;
        this.despachoRepository = despachoRepository;
        this.codigoSecuenciaService = codigoSecuenciaService;
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
        Manifiesto entity = toEntity(request);
        entity.setCodigo(generarCodigoManifiesto());
        entity = manifiestoRepository.save(entity);
        List<Despacho> candidatos = findDespachosCandidatosEntities(entity);
        vincularDespachosAManifiesto(entity, candidatos);
        actualizarCantidadDespachos(entity);
        manifiestoRepository.save(entity);
        return findById(entity.getId());
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
        Set<Long> idsCandidatos = findDespachosCandidatosEntities(m).stream()
                .map(Despacho::getId)
                .collect(Collectors.toSet());
        Set<Long> idsYaAsignados = findDespachosAsignadosEntities(manifiestoId).stream()
                .map(Despacho::getId)
                .collect(Collectors.toSet());
        List<Despacho> despachosAVincular = new ArrayList<>();
        if (despachoIds != null) {
            for (Long despachoId : despachoIds) {
                if (!idsCandidatos.contains(despachoId) && !idsYaAsignados.contains(despachoId)) {
                    throw new BadRequestException(
                            "El despacho " + despachoId + " no cumple los filtros del manifiesto.");
                }
                Despacho d = despachoRepository.findById(despachoId)
                        .orElseThrow(() -> new ResourceNotFoundException("Despacho", despachoId));
                despachosAVincular.add(d);
            }
        }
        vincularDespachosAManifiesto(m, despachosAVincular);
        actualizarCantidadDespachos(m);
        manifiestoRepository.save(m);
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

    private void validateRequest(ManifiestoRequest request) {
        LocalDate inicio = request.getFechaInicio();
        LocalDate fin = request.getFechaFin();
        if (inicio != null && fin != null && fin.isBefore(inicio)) {
            throw new BadRequestException(
                    "La fecha de fin debe ser mayor o igual a la fecha de inicio");
        }
    }

    private Manifiesto toEntity(ManifiestoRequest r) {
        return Manifiesto.builder()
                .codigo("")
                .fechaInicio(r.getFechaInicio())
                .fechaFin(r.getFechaFin())
                .filtroTipo(FiltroManifiesto.POR_PERIODO)
                .filtroCourierEntrega(null)
                .filtroAgencia(null)
                .cantidadDespachos(0)
                .build();
    }

    private void updateEntityFromRequest(Manifiesto entity, ManifiestoRequest r) {
        entity.setFechaInicio(r.getFechaInicio());
        entity.setFechaFin(r.getFechaFin());
        entity.setFiltroTipo(FiltroManifiesto.POR_PERIODO);
        entity.setFiltroCourierEntrega(null);
        entity.setFiltroAgencia(null);
    }

    private String generarCodigoManifiesto() {
        return codigoSecuenciaService.nextCodigoManifiesto(LocalDate.now());
    }

    private List<Despacho> findDespachosCandidatosEntities(Manifiesto m) {
        LocalDateTime desde = m.getFechaInicio().atStartOfDay();
        LocalDateTime hastaExclusivo = m.getFechaFin().plusDays(1).atStartOfDay();
        Long courierEntregaId = m.getFiltroCourierEntrega() != null
                ? m.getFiltroCourierEntrega().getId() : null;
        Long agenciaId = m.getFiltroAgencia() != null ? m.getFiltroAgencia().getId() : null;
        return despachoRepository.findCandidatosParaManifiesto(
                desde, hastaExclusivo, courierEntregaId, agenciaId);
    }

    private void vincularDespachosAManifiesto(Manifiesto manifiesto, List<Despacho> despachos) {
        if (despachos == null || despachos.isEmpty()) return;
        Set<Long> idsEnMemoria = new HashSet<>();
        if (manifiesto.getDespachos() != null) {
            for (Despacho actual : manifiesto.getDespachos()) {
                if (actual.getId() != null) {
                    idsEnMemoria.add(actual.getId());
                }
            }
        }
        for (Despacho d : despachos) {
            d.setManifiesto(manifiesto);
            if (manifiesto.getDespachos() != null && d.getId() != null
                    && !idsEnMemoria.contains(d.getId())) {
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

    /**
     * Recalcula y persiste el contador denormalizado a partir de los despachos
     * efectivamente asignados al manifiesto. Es la unica "operacion derivada"
     * que conserva el manifiesto tras desacoplarse de la liquidacion.
     */
    private void actualizarCantidadDespachos(Manifiesto m) {
        long total = despachoRepository.findByManifiestoId(m.getId()).size();
        m.setCantidadDespachos((int) total);
    }

    private ManifiestoDespachoCandidatoDTO toDespachoCandidatoDTO(Despacho d) {
        return ManifiestoDespachoCandidatoDTO.builder()
                .id(d.getId())
                .numeroGuia(d.getNumeroGuia())
                .courierEntregaNombre(d.getCourierEntrega() != null
                        ? d.getCourierEntrega().getNombre() : null)
                .tipoEntrega(d.getTipoEntrega() != null ? d.getTipoEntrega().name() : null)
                .agenciaNombre(d.getAgencia() != null ? d.getAgencia().getNombre() : null)
                .consignatarioNombre(d.getConsignatario() != null
                        ? d.getConsignatario().getNombre() : null)
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
                .filtroCourierEntregaId(m.getFiltroCourierEntrega() != null
                        ? m.getFiltroCourierEntrega().getId() : null)
                .filtroCourierEntregaNombre(m.getFiltroCourierEntrega() != null
                        ? m.getFiltroCourierEntrega().getNombre() : null)
                .filtroAgenciaId(m.getFiltroAgencia() != null ? m.getFiltroAgencia().getId() : null)
                .filtroAgenciaNombre(m.getFiltroAgencia() != null
                        ? m.getFiltroAgencia().getNombre() : null)
                .cantidadDespachos(m.getCantidadDespachos() != null ? m.getCantidadDespachos() : 0)
                .despachos(List.of())
                .build();
    }

    private ManifiestoDTO toDTOConDespachos(Manifiesto m, List<Despacho> despachosAsignados) {
        List<ManifiestoDTO.DespachoEnManifiestoDTO> despachosList = new ArrayList<>();
        for (Despacho d : despachosAsignados) {
            despachosList.add(new ManifiestoDTO.DespachoEnManifiestoDTO(
                    d.getId(),
                    d.getNumeroGuia(),
                    d.getCourierEntrega() != null ? d.getCourierEntrega().getNombre() : null,
                    d.getTipoEntrega() != null ? d.getTipoEntrega().name() : null,
                    d.getAgencia() != null ? d.getAgencia().getNombre() : null,
                    d.getConsignatario() != null ? d.getConsignatario().getNombre() : null
            ));
        }
        ManifiestoDTO dto = toDTO(m);
        dto.setDespachos(despachosList);
        return dto;
    }
}
