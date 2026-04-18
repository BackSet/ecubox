package com.ecubox.ecubox_backend.scheduler;

import com.ecubox.ecubox_backend.service.GuiaMasterService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Job que cierra con faltante las guías master que llevan más de N días con
 * piezas despachadas pero aún incompletas (PARCIAL_DESPACHADA).
 *
 * El timeout (en días) se configura via parametro_sistema
 * 'guia_master.dias_para_auto_cierre_con_faltante'.
 * Si vale 0, el job no hace nada.
 */
@Component
public class GuiaMasterAutoCierreJob {

    private static final Logger log = LoggerFactory.getLogger(GuiaMasterAutoCierreJob.class);

    private final GuiaMasterService guiaMasterService;

    public GuiaMasterAutoCierreJob(GuiaMasterService guiaMasterService) {
        this.guiaMasterService = guiaMasterService;
    }

    /** Cada 15 minutos. */
    @Scheduled(cron = "0 */15 * * * *")
    public void ejecutar() {
        try {
            int cerradas = guiaMasterService.ejecutarAutoCierrePorTimeout();
            if (cerradas > 0) {
                log.info("Auto-cierre por timeout cerró {} guías master con faltante", cerradas);
            }
        } catch (Exception ex) {
            log.error("Error ejecutando auto-cierre de guías master", ex);
        }
    }
}
