package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.ReparacionBodegaReporteDTO;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.service.PaqueteService.ResultadoReparacion;
import com.ecubox.ecubox_backend.service.PaqueteService.ResultadoReparacionBodega;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Herramienta controlada para auditar y reparar paquetes históricos cuyo
 * consolidado fue recibido en un lote de recepción pero que no recibieron el
 * estado configurado de "llegada a bodega" (inconsistencias previas al MVP 2).
 *
 * <p>Garantías de diseño:
 * <ul>
 *   <li><b>dry-run</b>: audita sin escribir; <b>execute</b>: aplica con confirmación.</li>
 *   <li><b>Lotes + checkpoint</b>: procesa por bloques ordenados por id; el último id
 *       permite reanudar. Cada paquete se repara en su propia transacción
 *       ({@link PaqueteService#repararEstadoBodega} es {@code @Transactional} y se
 *       invoca como bean), así un error intermedio omite solo ese paquete.</li>
 *   <li><b>Idempotencia</b>: clave de evento estable por paquete; una segunda corrida
 *       no duplica eventos ni vuelve a mover estados.</li>
 *   <li><b>Sin notificaciones</b>: el evento de reparación no genera outbox ni avisos.</li>
 *   <li><b>Sin degradar</b>: reutiliza la clasificación central (posteriores/terminales,
 *       alternos y bloqueados se omiten).</li>
 *   <li><b>Fecha histórica</b>: recepción del lote; nunca la fecha actual.</li>
 * </ul>
 */
@Service
public class ReparacionEstadoBodegaService {

    private static final Logger log = LoggerFactory.getLogger(ReparacionEstadoBodegaService.class);

    /** Confirmación requerida para ejecutar (no para dry-run). Documentada en el runbook. */
    public static final String CONFIRMACION_REQUERIDA = "EJECUTAR-REPARACION-BODEGA";

    private static final int BATCH_SIZE_DEFAULT = 100;
    private static final int BATCH_SIZE_MAX = 500;
    private static final int MUESTRA_MAX = 200;

    private final PaqueteRepository paqueteRepository;
    private final PaqueteService paqueteService;

    public ReparacionEstadoBodegaService(PaqueteRepository paqueteRepository,
                                         PaqueteService paqueteService) {
        this.paqueteRepository = paqueteRepository;
        this.paqueteService = paqueteService;
    }

    /**
     * Ejecuta la herramienta. En {@code dryRun} no escribe. En ejecución exige
     * {@code confirmacion == CONFIRMACION_REQUERIDA}.
     *
     * @param batchSize    tamaño de lote (acotado a [1, {@value #BATCH_SIZE_MAX}]).
     * @param maxPaquetes  tope opcional de paquetes a procesar (ejecución controlada); null = todos.
     * @param confirmacion token de confirmación (solo se valida cuando {@code !dryRun}).
     */
    public ReparacionBodegaReporteDTO ejecutar(boolean dryRun, Integer batchSize,
                                               Integer maxPaquetes, String confirmacion) {
        if (!dryRun && !CONFIRMACION_REQUERIDA.equals(confirmacion)) {
            throw new BadRequestException(
                    "No se puede ejecutar la reparación sin la confirmación exacta. "
                            + "Envía confirmacion=\"" + CONFIRMACION_REQUERIDA + "\" para ejecutar, "
                            + "o usa el modo dry-run para auditar sin escribir.");
        }
        int lote = batchSize == null ? BATCH_SIZE_DEFAULT : Math.max(1, Math.min(batchSize, BATCH_SIZE_MAX));
        String repairRunId = UUID.randomUUID().toString();

        Contadores c = new Contadores();
        List<ReparacionBodegaReporteDTO.DetalleReparacion> muestra = new ArrayList<>();
        long checkpoint = 0L;
        Long ultimoId = null;
        boolean completo = true;

        while (true) {
            List<Long> ids = paqueteRepository.findIdsEnConsolidadosRecibidosEnLote(
                    checkpoint, PageRequest.of(0, lote));
            if (ids.isEmpty()) break;

            for (Long id : ids) {
                if (maxPaquetes != null && c.total >= maxPaquetes) {
                    completo = false;
                    break;
                }
                ResultadoReparacion r;
                try {
                    r = paqueteService.repararEstadoBodega(id, repairRunId, dryRun);
                } catch (RuntimeException ex) {
                    // Un error de un paquete no detiene la corrida ni oculta el fallo.
                    log.warn("Reparación bodega: error en paquete {} (run {}): {}",
                            id, repairRunId, ex.getMessage());
                    c.total++;
                    c.errores++;
                    ultimoId = id;
                    checkpoint = id;
                    if (muestra.size() < MUESTRA_MAX) {
                        muestra.add(ReparacionBodegaReporteDTO.DetalleReparacion.builder()
                                .paqueteId(id).resultado("ERROR").build());
                    }
                    continue;
                }
                c.contar(r.resultado());
                ultimoId = id;
                checkpoint = id;
                if (muestra.size() < MUESTRA_MAX) {
                    muestra.add(toDetalle(r));
                }
            }

            if (!completo) break;
            if (ids.size() < lote) break;
        }

        return ReparacionBodegaReporteDTO.builder()
                .repairRunId(repairRunId)
                .dryRun(dryRun)
                .batchSize(lote)
                .maxPaquetes(maxPaquetes)
                .totalEvaluados(c.total)
                .reparados(c.reparados)
                .yaCorrectos(c.yaCorrectos)
                .yaReparados(c.yaReparados)
                .posteriores(c.posteriores)
                .alternos(c.alternos)
                .bloqueados(c.bloqueados)
                .sinFecha(c.sinFecha)
                .destinoNoConfigurado(c.destinoNoConfigurado)
                .noEncontrados(c.noEncontrados)
                .errores(c.errores)
                .ultimoIdProcesado(ultimoId)
                .completo(completo)
                .muestra(muestra)
                .generadoEn(LocalDateTime.now())
                .build();
    }

    private ReparacionBodegaReporteDTO.DetalleReparacion toDetalle(ResultadoReparacion r) {
        return ReparacionBodegaReporteDTO.DetalleReparacion.builder()
                .paqueteId(r.paqueteId())
                .resultado(r.resultado().name())
                .estadoAnteriorId(r.estadoAnteriorId())
                .estadoAnteriorNombre(r.estadoAnteriorNombre())
                .estadoNuevoId(r.estadoNuevoId())
                .estadoNuevoNombre(r.estadoNuevoNombre())
                .fechaHistorica(r.fechaHistorica())
                .eventoRegistrado(r.eventoRegistrado())
                .build();
    }

    private static final class Contadores {
        int total, reparados, yaCorrectos, yaReparados, posteriores, alternos,
                bloqueados, sinFecha, destinoNoConfigurado, noEncontrados, errores;

        void contar(ResultadoReparacionBodega r) {
            total++;
            switch (r) {
                case REPARADO -> reparados++;
                case YA_CORRECTO -> yaCorrectos++;
                case YA_REPARADO -> yaReparados++;
                case POSTERIOR -> posteriores++;
                case ALTERNO -> alternos++;
                case BLOQUEADO -> bloqueados++;
                case SIN_FECHA -> sinFecha++;
                case DESTINO_NO_CONFIGURADO -> destinoNoConfigurado++;
                case NO_ENCONTRADO -> noEncontrados++;
            }
        }
    }
}
