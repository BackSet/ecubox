package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.TarifaCalculadoraDTO;
import com.ecubox.ecubox_backend.entity.ConfigCalculadora;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.repository.ConfigCalculadoraRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class ConfigCalculadoraService {

    private static final Long CONFIG_ID = 1L;

    private final ConfigCalculadoraRepository configCalculadoraRepository;

    public ConfigCalculadoraService(ConfigCalculadoraRepository configCalculadoraRepository) {
        this.configCalculadoraRepository = configCalculadoraRepository;
    }

    @Transactional(readOnly = true)
    public TarifaCalculadoraDTO getTarifa() {
        return configCalculadoraRepository.findById(CONFIG_ID)
                .map(this::toDTO)
                .orElse(TarifaCalculadoraDTO.builder().tarifaPorLibra(BigDecimal.ZERO).build());
    }

    @Transactional
    public TarifaCalculadoraDTO updateTarifa(BigDecimal tarifaPorLibra) {
        if (tarifaPorLibra != null && tarifaPorLibra.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("La tarifa debe ser mayor o igual a 0");
        }
        ConfigCalculadora config = configCalculadoraRepository.findById(CONFIG_ID)
                .orElse(ConfigCalculadora.builder().id(CONFIG_ID).tarifaPorLibra(BigDecimal.ZERO).build());
        config.setTarifaPorLibra(tarifaPorLibra != null ? tarifaPorLibra : BigDecimal.ZERO);
        config = configCalculadoraRepository.save(config);
        return toDTO(config);
    }

    private TarifaCalculadoraDTO toDTO(ConfigCalculadora c) {
        return TarifaCalculadoraDTO.builder()
                .tarifaPorLibra(c.getTarifaPorLibra() != null ? c.getTarifaPorLibra() : BigDecimal.ZERO)
                .build();
    }
}
