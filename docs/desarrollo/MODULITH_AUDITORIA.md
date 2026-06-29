# Auditoría de estructura modular (Spring Modulith)

MVP 8/8. Introduce **Spring Modulith** como herramienta de **auditoría** de la
estructura del backend y generación de documentación/diagramas de acoplamiento.
No reestructura paquetes ni cambia comportamiento: es análisis estático
(ArchUnit) en `scope test`.

## Versión y compatibilidad

- **Spring Modulith 2.0.7** (propiedad `spring-modulith.version` + `spring-modulith-bom`).
- Elegida porque la línea **2.0.x apunta a Spring Boot 4.0.x** (depende de Boot
  4.0.7/4.0.6, spring-core 7.0.8); **2.1.x apunta a Boot 4.1**. El proyecto usa
  Boot 4.0.7.
- Dependencias solo de test: `spring-modulith-starter-test`, `spring-modulith-docs`.
  **Nada se añade al runtime de producción.**

## Cómo ejecutarlo

```bash
cd ecubox-backend
./mvnw test -Dtest=ModulithStructureTest
```

- Test: `src/test/java/.../architecture/ModulithStructureTest.java` (no arranca
  Spring ni necesita base de datos).
- Diagramas/canvas generados en `target/spring-modulith-docs/` (`components.puml`
  + `module-*.puml`/`.adoc`; artefactos de build, no versionados).

## Hallazgo principal

ECUBOX usa un **layout de paquetes por capa técnica**, no por dominio:

```
com.ecubox.ecubox_backend
├── config  ├── controller ├── dto      ├── entity ├── enums
├── event   ├── exception   ├── mapper   ├── projection
├── repository ├── scheduler ├── security ├── service ├── util
```

Spring Modulith toma cada **sub-paquete directo del paquete raíz como un módulo
de aplicación**. Por eso detecta **14 "módulos" = 14 capas técnicas**, no los
dominios de negocio. Los dominios de ECUBOX (paquetes, guías master,
consolidados, recepción, despacho, liquidación, tracking,
usuarios/permisos/configuración) existen como **prefijos de nombre de clase
dentro de cada capa** (p. ej. `service/PaqueteService`, `service/GuiaMasterService`,
`controller/LiquidacionController`), no como paquetes; Modulith no puede
inferirlos automáticamente con este layout.

### Módulos detectados (capas técnicas)

`config`, `controller`, `dto`, `entity`, `enums`, `event`, `exception`,
`mapper`, `projection`, `repository`, `scheduler`, `security`, `service`, `util`.

### Ciclos reportados por `verify()`

Esperados al analizar capas como si fueran módulos (no son acoplamientos de
dominio, sino el ir y venir natural entre capas):

| Ciclo | Lectura |
|-------|---------|
| `config → security → service → config` | La config de seguridad referencia servicios; servicios usan beans de config. |
| `config → service → config` | Servicios consumen configuración; config crea/inyecta servicios. |
| `projection → repository → projection` | El proyector de tracking y los repositorios se referencian entre sí. |
| `security → service → security` | El filtro/seguridad usa servicios (p. ej. usuarios) que a su vez tocan seguridad. |

El test **reporta** estos ciclos pero **no falla el build** (`reportaViolacionesSinFallar`):
la consigna es *auditar primero, refactorizar después*. Forzar un `verify()`
verde exigiría reorganizar paquetes (fuera de alcance).

## Recomendaciones (futuros MVPs, no vinculantes)

1. **Si se busca modularidad por dominio:** migrar gradualmente a paquetes por
   dominio (`paquete/`, `guiamaster/`, `consolidado/`, `recepcion/`, `despacho/`,
   `liquidacion/`, `tracking/`, `acceso/`, `usuario/`), cada uno con sus capas
   internas. Entonces `verify()` pasa a ser enforcement útil (sin ciclos
   cruzados de dominio) y los diagramas reflejan el negocio. Es un refactor
   grande: hacerlo por dominio y por fases, con tests verdes en cada paso.
2. **Alternativa sin mover paquetes:** declarar módulos explícitos vía
   `package-info.java` con `@ApplicationModule`, o configurar Modulith para
   agrupar por convención de nombre. Aporta poco mientras el código siga
   organizado por capa.
3. **Mientras tanto:** usar este test como **snapshot de arquitectura** y los
   diagramas generados para revisar acoplamientos en PRs; mantener Modulith en
   modo auditoría (sin enforcement) para no introducir falsos bloqueos.

## Restricciones respetadas

- Sin mover clases ni cambiar paquetes de dominio, eventos/outbox, endpoints ni
  lógica de negocio. Sin tocar frontend. Dependencias solo en `test`.
