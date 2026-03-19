package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadoRastreoTransicionDTO;
import com.ecubox.ecubox_backend.dto.EstadoRastreoTransicionUpsertItem;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.EstadoRastreoTransicion;
import com.ecubox.ecubox_backend.repository.EstadoRastreoTransicionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class EstadoRastreoTransicionService {

    private final EstadoRastreoTransicionRepository estadoRastreoTransicionRepository;
    private final EstadoRastreoService estadoRastreoService;

    public EstadoRastreoTransicionService(EstadoRastreoTransicionRepository estadoRastreoTransicionRepository,
                                          EstadoRastreoService estadoRastreoService) {
        this.estadoRastreoTransicionRepository = estadoRastreoTransicionRepository;
        this.estadoRastreoService = estadoRastreoService;
    }

    @Transactional(readOnly = true)
    public List<EstadoRastreoTransicionDTO> findByEstadoOrigen(Long estadoOrigenId) {
        return estadoRastreoTransicionRepository.findByEstadoOrigenId(estadoOrigenId).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional
    public List<EstadoRastreoTransicionDTO> replaceTransiciones(Long estadoOrigenId, List<EstadoRastreoTransicionUpsertItem> items) {
        EstadoRastreo origen = estadoRastreoService.findEntityById(estadoOrigenId);
        List<EstadoRastreoTransicion> existing = estadoRastreoTransicionRepository.findByEstadoOrigenId(estadoOrigenId);
        List<EstadoRastreoTransicion> updated = new ArrayList<>();
        List<EstadoRastreoTransicionUpsertItem> safeItems = items != null ? items : List.of();
        for (EstadoRastreoTransicionUpsertItem item : safeItems) {
            EstadoRastreo destino = estadoRastreoService.findEntityById(item.getEstadoDestinoId());
            EstadoRastreoTransicion transicion = EstadoRastreoTransicion.builder()
                    .estadoOrigen(origen)
                    .estadoDestino(destino)
                    .build();
            transicion.setRequiereResolucion(Boolean.TRUE.equals(item.getRequiereResolucion()));
            transicion.setActivo(Boolean.TRUE.equals(item.getActivo()));
            updated.add(transicion);
        }
        estadoRastreoTransicionRepository.deleteAllInBatch(existing);
        estadoRastreoTransicionRepository.flush();
        return estadoRastreoTransicionRepository.saveAll(updated).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean isTransicionPermitida(Long estadoOrigenId, Long estadoDestinoId) {
        return estadoRastreoTransicionRepository
                .findByEstadoOrigenIdAndEstadoDestinoIdAndActivoTrue(estadoOrigenId, estadoDestinoId)
                .isPresent();
    }

    @Transactional(readOnly = true)
    public boolean isTransicionResolucion(Long estadoOrigenId, Long estadoDestinoId) {
        return estadoRastreoTransicionRepository
                .findByEstadoOrigenIdAndEstadoDestinoIdAndActivoTrue(estadoOrigenId, estadoDestinoId)
                .map(EstadoRastreoTransicion::getRequiereResolucion)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public List<EstadoRastreo> findDestinosActivos(Long estadoOrigenId) {
        return estadoRastreoTransicionRepository
                .findByEstadoOrigenIdAndActivoTrueOrderByEstadoDestinoOrdenAscEstadoDestinoIdAsc(estadoOrigenId)
                .stream()
                .map(EstadoRastreoTransicion::getEstadoDestino)
                .toList();
    }

    private EstadoRastreoTransicionDTO toDTO(EstadoRastreoTransicion t) {
        return EstadoRastreoTransicionDTO.builder()
                .id(t.getId())
                .estadoOrigenId(t.getEstadoOrigen() != null ? t.getEstadoOrigen().getId() : null)
                .estadoDestinoId(t.getEstadoDestino() != null ? t.getEstadoDestino().getId() : null)
                .estadoDestinoCodigo(t.getEstadoDestino() != null ? t.getEstadoDestino().getCodigo() : null)
                .estadoDestinoNombre(t.getEstadoDestino() != null ? t.getEstadoDestino().getNombre() : null)
                .requiereResolucion(t.getRequiereResolucion())
                .activo(t.getActivo())
                .build();
    }

}

