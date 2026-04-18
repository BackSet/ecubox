package com.ecubox.ecubox_backend.config;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Provee un {@link MeterRegistry} basico cuando no esta presente otro
 * (p.ej. cuando no se incluye Spring Boot Actuator). Habilita las metricas
 * del proyector de tracking sin acoplar el modulo a actuator.
 */
@Configuration
public class MetricsConfig {

    @Bean
    @ConditionalOnMissingBean(MeterRegistry.class)
    public MeterRegistry simpleMeterRegistry() {
        return new SimpleMeterRegistry();
    }
}
