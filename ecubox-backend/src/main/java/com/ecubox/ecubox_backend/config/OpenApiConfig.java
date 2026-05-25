package com.ecubox.ecubox_backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("ECUBOX Backend API")
                        .version("1.0")
                        .description("""
                                API REST del sistema de gestión logística ECUBOX.
                                Autenticación JWT Bearer. Endpoints públicos sin token en /api/health, /api/config y tracking.
                                Documentación interactiva: Scalar UI en /scalar (solo perfil dev).
                                """)
                        .contact(new Contact()
                                .name("ECUBOX")
                                .email("soporte@ecubox.com"))
                        .license(new License().name("Proprietary")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Desarrollo local")
                ))
                .tags(List.of(
                        new Tag().name("Público").description("Endpoints sin autenticación"),
                        new Tag().name("Autenticación").description("Login, registro y sesión"),
                        new Tag().name("Cliente").description("Casillero y envíos del cliente autenticado"),
                        new Tag().name("Operario").description("Operaciones de bodega y despacho"),
                        new Tag().name("Administración").description("Usuarios, roles, permisos y catálogos"),
                        new Tag().name("Sistema").description("Salud y monitoreo interno")
                ))
                .components(new Components()
                        .addSecuritySchemes(OpenApiConstants.BEARER_AUTH,
                                new SecurityScheme()
                                        .name(OpenApiConstants.BEARER_AUTH)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Token JWT obtenido en POST /api/auth/login")));
    }

    @Bean
    public GroupedOpenApi publicApi() {
        return GroupedOpenApi.builder()
                .group("public")
                .displayName("Público")
                .pathsToMatch("/api/health", "/api/config/**", "/api/v1/tracking/**")
                .build();
    }

    @Bean
    public GroupedOpenApi authApi() {
        return GroupedOpenApi.builder()
                .group("auth")
                .displayName("Autenticación")
                .pathsToMatch("/api/auth/**")
                .build();
    }

    @Bean
    public GroupedOpenApi clienteApi() {
        return GroupedOpenApi.builder()
                .group("cliente")
                .displayName("Cliente")
                .pathsToMatch(
                        "/api/mis-paquetes/**",
                        "/api/mis-consignatarios/**",
                        "/api/mis-guias/**",
                        "/api/envios-consolidados/**",
                        "/api/liquidaciones/**"
                )
                .build();
    }

    @Bean
    public GroupedOpenApi operarioApi() {
        return GroupedOpenApi.builder()
                .group("operario")
                .displayName("Operario")
                .pathsToMatch(
                        "/api/operario/**",
                        "/api/guias-master/**",
                        "/api/manifiestos/**"
                )
                .build();
    }

    @Bean
    public GroupedOpenApi adminApi() {
        return GroupedOpenApi.builder()
                .group("admin")
                .displayName("Administración")
                .pathsToMatch(
                        "/api/admin/**",
                        "/api/usuarios/**",
                        "/api/roles/**",
                        "/api/permisos/**",
                        "/api/agencias/**",
                        "/api/couriers-entrega/**",
                        "/api/puntos-entrega/**",
                        "/api/config/tarifa-distribucion/**"
                )
                .build();
    }

    @Bean
    public GroupedOpenApi allApi() {
        return GroupedOpenApi.builder()
                .group("all")
                .displayName("Todos")
                .pathsToMatch("/api/**")
                .build();
    }
}
