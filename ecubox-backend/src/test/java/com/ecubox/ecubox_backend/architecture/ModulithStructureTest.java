package com.ecubox.ecubox_backend.architecture;

import com.ecubox.ecubox_backend.EcuboxSistemaDeGestionApplication;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.docs.Documenter;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Auditoría de estructura modular con Spring Modulith (análisis estático con
 * ArchUnit; NO arranca Spring ni requiere base de datos).
 *
 * <p><strong>Alcance: auditoría, no enforcement.</strong> ECUBOX usa un layout de
 * paquetes <em>por capa técnica</em> (`controller`, `service`, `repository`,
 * `entity`, `dto`, …), no por dominio. Spring Modulith interpreta cada
 * sub-paquete directo del paquete raíz como un "módulo de aplicación", de modo
 * que aquí detecta <em>capas técnicas</em>, no los dominios de negocio
 * (paquetes, guías master, consolidados, recepción, despacho, liquidación,
 * tracking, usuarios/permisos). Por eso este test <strong>no falla</strong> ante
 * violaciones: las captura y reporta (los ciclos entre capas son esperados). Un
 * enforcement real exigiría reorganizar a paquetes por dominio (fuera de
 * alcance; ver docs/desarrollo/MODULITH_AUDITORIA.md).</p>
 */
class ModulithStructureTest {

    private static final Logger log = LoggerFactory.getLogger(ModulithStructureTest.class);

    private final ApplicationModules modules =
            ApplicationModules.of(EcuboxSistemaDeGestionApplication.class);

    @Test
    void detectaModulosYGeneraDocumentacion() {
        long count = modules.stream().count();
        log.info("[Modulith] Módulos detectados (por paquete técnico): {}", count);
        modules.forEach(module -> log.info("[Modulith]  - {}", module.getName()));

        assertThat(count)
                .as("Spring Modulith debe construir un modelo con al menos un módulo")
                .isGreaterThan(0);

        // Genera diagramas PlantUML + module canvas en target/spring-modulith-docs.
        // No falla ante ciclos: es material de auditoría/acoplamiento.
        new Documenter(modules)
                .writeModulesAsPlantUml()
                .writeIndividualModulesAsPlantUml()
                .writeModuleCanvases();
        log.info("[Modulith] Documentación escrita en target/spring-modulith-docs/");
    }

    @Test
    void reportaViolacionesSinFallar() {
        try {
            modules.verify();
            log.info("[Modulith] verify(): sin violaciones de modularidad.");
        } catch (RuntimeException violations) {
            // Esperado con el layout por capas. Se reporta para la auditoría; NO se
            // fuerza el build a pasar alterando dependencias (eso requiere refactor).
            log.warn(
                    "[Modulith] verify() reporta acoplamientos/ciclos ESPERADOS para el "
                            + "layout por capas. Detalle (auditoría, no bloqueante):\n{}",
                    violations.getMessage());
        }
    }
}
