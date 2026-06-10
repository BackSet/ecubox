package com.ecubox.ecubox_backend.config;

import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.service.PaqueteService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Backfill idempotente de {@code paquete.fecha_limite_retiro} (introducida en
 * V107). La fecha límite no puede calcularse en SQL puro porque la fecha ancla
 * proviene del historial de estados, así que se recalcula desde la aplicación.
 *
 * <p>En cada arranque procesa únicamente los paquetes con la columna en
 * {@code NULL}: tras el primer arranque posterior al deploy de V107, los
 * paquetes con plazo activo quedan poblados y dejan de reprocesarse; los que
 * legítimamente no tienen plazo (entregados / sin días máximos) permanecen en
 * {@code NULL} y su recálculo no produce cambios. El flujo normal
 * (transiciones de estado, asignación de saca) mantiene la columna al día.</p>
 */
@Component
@Order(20)
public class PaqueteVencimientoBackfillRunner implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(PaqueteVencimientoBackfillRunner.class);

    private final PaqueteRepository paqueteRepository;
    private final PaqueteService paqueteService;

    public PaqueteVencimientoBackfillRunner(PaqueteRepository paqueteRepository,
                                            PaqueteService paqueteService) {
        this.paqueteRepository = paqueteRepository;
        this.paqueteService = paqueteService;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<Long> pendientes = paqueteRepository.findIdsByFechaLimiteRetiroIsNull();
        if (pendientes.isEmpty()) {
            return;
        }
        int cambiados = paqueteService.recomputarFechaLimiteRetiroBatch(pendientes);
        if (cambiados > 0) {
            log.info("Backfill fecha_limite_retiro: {} de {} paquetes con plazo de retiro recalculado.",
                    cambiados, pendientes.size());
        }
    }
}
