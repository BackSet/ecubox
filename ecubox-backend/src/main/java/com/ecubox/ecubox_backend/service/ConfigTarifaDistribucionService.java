package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.ConfigTarifaDistribucionDTO;
import com.ecubox.ecubox_backend.entity.ConfigTarifaDistribucion;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.repository.ConfigTarifaDistribucionRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Mantiene la fila singleton {@link ConfigTarifaDistribucion} con la tarifa por
 * defecto que se precarga en cada nueva línea de liquidación. La fila se siembra
 * en Flyway; se hace lazy-init defensiva por si la base nunca recibió la
 * migración inicial.
 */
@Service
public class ConfigTarifaDistribucionService {

    private final ConfigTarifaDistribucionRepository repository;
    private final UsuarioRepository usuarioRepository;

    public ConfigTarifaDistribucionService(ConfigTarifaDistribucionRepository repository,
                                           UsuarioRepository usuarioRepository) {
        this.repository = repository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional(readOnly = true)
    public ConfigTarifaDistribucion getEntidad() {
        return repository.findById(ConfigTarifaDistribucion.SINGLETON_ID)
                .orElseGet(this::seedDefault);
    }

    @Transactional(readOnly = true)
    public ConfigTarifaDistribucionDTO getActual() {
        return toDTO(getEntidad());
    }

    @Transactional
    public ConfigTarifaDistribucionDTO actualizar(BigDecimal kgIncluidos,
                                                  BigDecimal precioFijo,
                                                  BigDecimal precioKgAdicional,
                                                  Long actorUsuarioId) {
        validar(kgIncluidos, precioFijo, precioKgAdicional);
        ConfigTarifaDistribucion config = repository.findById(ConfigTarifaDistribucion.SINGLETON_ID)
                .orElseGet(this::seedDefault);
        config.setKgIncluidos(kgIncluidos);
        config.setPrecioFijo(precioFijo);
        config.setPrecioKgAdicional(precioKgAdicional);
        config.setUpdatedAt(LocalDateTime.now());
        config.setUpdatedBy(resolverUsuario(actorUsuarioId));
        config = repository.save(config);
        return toDTO(config);
    }

    /**
     * Si los valores entrantes difieren de los actuales del singleton los promueve
     * (write-back). Devuelve {@code true} si hubo promoción, {@code false} si los
     * valores eran idénticos.
     */
    @Transactional
    public boolean writeBackSiCambia(BigDecimal kgIncluidos,
                                     BigDecimal precioFijo,
                                     BigDecimal precioKgAdicional,
                                     Long actorUsuarioId) {
        ConfigTarifaDistribucion actual = getEntidad();
        if (igual(actual.getKgIncluidos(), kgIncluidos)
                && igual(actual.getPrecioFijo(), precioFijo)
                && igual(actual.getPrecioKgAdicional(), precioKgAdicional)) {
            return false;
        }
        actualizar(kgIncluidos, precioFijo, precioKgAdicional, actorUsuarioId);
        return true;
    }

    private ConfigTarifaDistribucion seedDefault() {
        ConfigTarifaDistribucion config = ConfigTarifaDistribucion.builder()
                .id(ConfigTarifaDistribucion.SINGLETON_ID)
                .kgIncluidos(new BigDecimal("2.0000"))
                .precioFijo(new BigDecimal("2.7500"))
                .precioKgAdicional(new BigDecimal("0.5000"))
                .updatedAt(LocalDateTime.now())
                .build();
        return repository.save(config);
    }

    private Usuario resolverUsuario(Long usuarioId) {
        if (usuarioId == null) return null;
        return usuarioRepository.findById(usuarioId).orElse(null);
    }

    private void validar(BigDecimal kgIncluidos, BigDecimal precioFijo, BigDecimal precioKgAdicional) {
        if (kgIncluidos == null || kgIncluidos.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Los kg incluidos deben ser mayores o iguales a 0");
        }
        if (precioFijo == null || precioFijo.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("El precio fijo debe ser mayor o igual a 0");
        }
        if (precioKgAdicional == null || precioKgAdicional.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("El precio por kg adicional debe ser mayor o igual a 0");
        }
    }

    private boolean igual(BigDecimal a, BigDecimal b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        return a.compareTo(b) == 0;
    }

    private ConfigTarifaDistribucionDTO toDTO(ConfigTarifaDistribucion c) {
        return ConfigTarifaDistribucionDTO.builder()
                .kgIncluidos(c.getKgIncluidos() != null ? c.getKgIncluidos() : BigDecimal.ZERO)
                .precioFijo(c.getPrecioFijo() != null ? c.getPrecioFijo() : BigDecimal.ZERO)
                .precioKgAdicional(c.getPrecioKgAdicional() != null ? c.getPrecioKgAdicional() : BigDecimal.ZERO)
                .updatedAt(c.getUpdatedAt())
                .updatedByUsername(c.getUpdatedBy() != null ? c.getUpdatedBy().getUsername() : null)
                .build();
    }
}
