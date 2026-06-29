# ---- Stage 1: Build ----
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

COPY src src
RUN ./mvnw package -DskipTests -B && \
    mv target/ecubox-backend-*.jar target/app.jar

# ---- Stage 2: Runtime ----
FROM eclipse-temurin:25-jre
WORKDIR /app

# Zona horaria del sistema y de la JVM: Ecuador. El cálculo de vencimiento /
# fecha límite de retiro depende de que now() coincida con America/Guayaquil.
ENV TZ=America/Guayaquil

RUN addgroup --system app && adduser --system --ingroup app app
COPY --from=build /app/target/app.jar app.jar
RUN chown app:app app.jar

# OTEL Java agent (observabilidad) OPCIONAL. Por defecto el ARG está vacío: no se
# descarga nada y la imagen local/compose queda intacta (no rompe el build).
# Para habilitar tracing en prod: construir con
#   --build-arg OTEL_AGENT_VERSION=2.29.0
# El agente queda incrustado pero NO se activa hasta pasar -javaagent vía
# JAVA_TOOL_OPTIONS en runtime; así se alterna/exporta por entorno sin recompilar.
ARG OTEL_AGENT_VERSION=
RUN if [ -n "$OTEL_AGENT_VERSION" ]; then \
      (command -v curl >/dev/null 2>&1 || (apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*)) && \
      curl -fsSL -o /app/opentelemetry-javaagent.jar \
        "https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v${OTEL_AGENT_VERSION}/opentelemetry-javaagent.jar" && \
      chown app:app /app/opentelemetry-javaagent.jar ; \
    fi

USER app

EXPOSE 8080

# Tracing OFF por defecto (sin -javaagent). Para activarlo en runtime, definir en
# el entorno: JAVA_TOOL_OPTIONS=-javaagent:/app/opentelemetry-javaagent.jar
# junto con OTEL_SERVICE_NAME y OTEL_EXPORTER_OTLP_ENDPOINT (ver docs/operacion).
ENTRYPOINT ["java", "-Duser.timezone=America/Guayaquil", "-Dspring.profiles.active=prod", "-jar", "app.jar"]
