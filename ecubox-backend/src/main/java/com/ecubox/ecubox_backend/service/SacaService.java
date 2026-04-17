package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.dto.SacaCreateRequest;
import com.ecubox.ecubox_backend.dto.SacaDTO;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.Saca;
import com.ecubox.ecubox_backend.enums.TamanioSaca;
import com.ecubox.ecubox_backend.exception.ConflictException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.SacaRepository;
import com.ecubox.ecubox_backend.util.WeightUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class SacaService {

    private final SacaRepository sacaRepository;
    private final PaqueteRepository paqueteRepository;
    private final PaqueteService paqueteService;

    public SacaService(SacaRepository sacaRepository, PaqueteRepository paqueteRepository, PaqueteService paqueteService) {
        this.sacaRepository = sacaRepository;
        this.paqueteRepository = paqueteRepository;
        this.paqueteService = paqueteService;
    }

    @Transactional(readOnly = true)
    public List<SacaDTO> findBySinDespacho(boolean sinDespacho) {
        if (sinDespacho) {
            return sacaRepository.findByDespachoIdIsNullOrderByIdAsc().stream()
                    .map(this::toDTO)
                    .toList();
        }
        return sacaRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional
    public SacaDTO create(SacaCreateRequest request) {
        if (sacaRepository.existsByNumeroOrden(request.getNumeroOrden().trim())) {
            throw new ConflictException("Ya existe una saca con ese número de orden");
        }
        BigDecimal pesoLbs = request.getPesoLbs() != null
                ? request.getPesoLbs()
                : WeightUtil.kgToLbs(request.getPesoKg());
        Saca s = Saca.builder()
                .numeroOrden(request.getNumeroOrden().trim())
                .pesoLbs(pesoLbs)
                .tamanio(request.getTamanio())
                .build();
        s = sacaRepository.save(s);
        return toDTO(s);
    }

    @Transactional
    public SacaDTO actualizarTamanio(Long id, TamanioSaca tamanio) {
        Saca s = sacaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Saca", id));
        s.setTamanio(tamanio);
        s = sacaRepository.save(s);
        return toDTO(s);
    }

    /** Convierte entidad a DTO (público para DespachoService al construir detalle con sacas). */
    public SacaDTO toDTO(Saca s) {
        List<Paquete> paquetes = paqueteRepository.findBySacaIdOrderByIdAsc(s.getId());
        List<PaqueteDTO> paqueteDTOs = paquetes.stream().map(paqueteService::toDTO).toList();
        BigDecimal pesoTotalLbs = paquetes.stream()
                .map(Paquete::getPesoLbs)
                .filter(p -> p != null && p.compareTo(BigDecimal.ZERO) > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal pesoTotalKg = WeightUtil.lbsToKg(pesoTotalLbs);
        return SacaDTO.builder()
                .id(s.getId())
                .numeroOrden(s.getNumeroOrden())
                .pesoLbs(s.getPesoLbs())
                .pesoKg(WeightUtil.lbsToKg(s.getPesoLbs()))
                .tamanio(s.getTamanio())
                .despachoId(s.getDespacho() != null ? s.getDespacho().getId() : null)
                .paquetes(paqueteDTOs)
                .pesoTotalLbs(pesoTotalLbs.compareTo(BigDecimal.ZERO) > 0 ? pesoTotalLbs : null)
                .pesoTotalKg(pesoTotalKg.compareTo(BigDecimal.ZERO) > 0 ? pesoTotalKg : null)
                .build();
    }
}
