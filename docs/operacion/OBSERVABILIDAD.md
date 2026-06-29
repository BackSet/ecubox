# Observabilidad (ECUBOX backend)

Base mínima de observabilidad: **health/metrics** vía Spring Boot Actuator y
**trazas** vía OpenTelemetry **Java agent** (sin instrumentación manual ni
dependencias OTEL en el `pom.xml`). Todo es opt-in y no afecta el arranque local.

> Los valores de hosts/endpoints en este documento son **ficticios**.

---

## 1. Actuator (health / info / metrics)

Dependencia: `spring-boot-starter-actuator` (ya en `pom.xml`). Configuración en
`application.properties` (defaults seguros) y `application-dev.properties`
(cómodo en local).

| Endpoint | Acceso | Notas |
|----------|--------|-------|
| `GET /actuator/health` | **Público** (permitido en `SecurityConfig`) | Para sondas liveness/readiness. Sin detalle por defecto (`show-details=never`): responde `{"status":"UP"}`. |
| `GET /actuator/health/liveness`, `/actuator/health/readiness` | Público | Sondas separadas (`probes.enabled=true`). |
| `GET /actuator/info` | **Autenticado** (JWT) | `info.env` deshabilitado: no vuelca variables de entorno. |
| `GET /actuator/metrics`, `/actuator/metrics/{name}` | **Autenticado** | Expuesto solo si se incluye en `MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE`. Incluye las métricas de negocio del proyector de tracking. |

- El `/api/health` previo (público) se mantiene; Actuator añade las sondas y las
  métricas, sin reemplazarlo.
- **Exposición segura:** por defecto solo `health,info`. Cualquier endpoint
  distinto de `/actuator/health*` exige autenticación (regla `anyRequest().authenticated()`).
  No expongas `metrics`/`prometheus` a Internet sin una capa de red protegida.
- **Prometheus:** si se necesita scraping, añadir la dependencia
  `micrometer-registry-prometheus` e incluir `prometheus` en la variable de
  exposición; protegerlo por red/credenciales (no se incluye en este MVP).

Variables: ver [VARIABLES_ENTORNO.md](../despliegue/VARIABLES_ENTORNO.md)
(`MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE`, `MANAGEMENT_HEALTH_SHOW_DETAILS`,
`MANAGEMENT_HEALTH_SHOW_COMPONENTS`).

---

## 2. Trazas con OpenTelemetry (Java agent)

**Decisión:** se usa el **Java agent** (no el starter de Spring) porque el
despliegue (Railway/Docker) permite pasar `-javaagent` y variables `OTEL_*`. El
agente auto-instrumenta Spring MVC, JDBC, clientes HTTP, etc., e **inyecta
`trace_id`/`span_id` en el MDC** de los logs, sin tocar código ni añadir
dependencias al `pom.xml`.

### 2.1 Incrustar el agente en la imagen (build)

El `Dockerfile` acepta un `ARG OTEL_AGENT_VERSION` **vacío por defecto** (no
descarga nada; el build local/`docker compose` queda intacto). Para incrustarlo:

```bash
docker build \
  --build-arg OTEL_AGENT_VERSION=2.29.0 \
  -t ecubox-backend:otel ./ecubox-backend
```

Queda en `/app/opentelemetry-javaagent.jar` pero **inactivo** hasta activarlo por
entorno (siguiente paso). Así se habilita/deshabilita **sin recompilar**.

### 2.2 Activar en runtime (variables de entorno)

```bash
JAVA_TOOL_OPTIONS=-javaagent:/app/opentelemetry-javaagent.jar
OTEL_SERVICE_NAME=ecubox-backend
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector-ejemplo.invalid:4317
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=none   # las métricas de negocio se sirven por Actuator
OTEL_LOGS_EXPORTER=none
```

- **Desactivar sin recompilar:** quitar `JAVA_TOOL_OPTIONS` (agente no se carga) o
  dejar `OTEL_TRACES_EXPORTER=none` (agente cargado pero no exporta).
- **Sin collector:** no definas `OTEL_EXPORTER_OTLP_ENDPOINT` y/o usa
  `OTEL_TRACES_EXPORTER=none`. El tracing **no es obligatorio**; nada falla si no
  hay collector.

### 2.3 Arranque local con/sin OTEL

```bash
# Sin OTEL (por defecto): no se necesita agente ni collector.
cd ecubox-backend && ./mvnw spring-boot:run

# Con OTEL en local (agente descargado manualmente a ./otel-agent.jar):
JAVA_TOOL_OPTIONS="-javaagent:$(pwd)/otel-agent.jar" \
OTEL_SERVICE_NAME=ecubox-backend \
OTEL_TRACES_EXPORTER=none \
  ./mvnw spring-boot:run
```

---

## 3. Logs con traceId/spanId

`application.properties` define:

```
logging.pattern.level=%5p [${spring.application.name:-},%X{trace_id:-},%X{span_id:-}]
```

- Cuando el agente OTEL está activo y hay una traza, los logs incluyen
  `[ecubox-backend,<trace_id>,<span_id>]`.
- Sin agente/traza, los campos quedan vacíos (`[ecubox-backend,,]`): **no rompe
  nada**.
- **No se loguean tokens ni PII**; el patrón solo añade IDs de correlación.

---

## 4. Comandos de verificación

```bash
# Tests backend (incluye arranque de contexto con Actuator en la prueba Testcontainers).
cd ecubox-backend && ./mvnw test

# Health público (no requiere token):
curl -s http://localhost:8080/actuator/health        # {"status":"UP"}
curl -s http://localhost:8080/actuator/health/readiness

# Métricas (requiere JWT; en dev están expuestas):
curl -s -H "Authorization: Bearer <token>" http://localhost:8080/actuator/metrics
```

---

## 5. Riesgos / pendientes

- Exponer `metrics`/`prometheus` sin protección de red filtraría telemetría: por
  eso quedan **autenticados** y fuera de la exposición por defecto.
- El stack de collector (OTLP → Tempo/Jaeger/Grafana) está **fuera de alcance**;
  aquí solo se deja el backend listo para emitir.
- El agente añade ~25 MB a la imagen y overhead de runtime; por eso es opt-in.
