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

RUN addgroup --system app && adduser --system --ingroup app app
COPY --from=build /app/target/app.jar app.jar
RUN chown app:app app.jar
USER app

EXPOSE 8080

ENTRYPOINT ["java", "-Dspring.profiles.active=prod", "-jar", "app.jar"]
