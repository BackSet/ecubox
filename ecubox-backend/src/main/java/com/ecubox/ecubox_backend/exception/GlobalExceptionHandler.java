package com.ecubox.ecubox_backend.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleResourceNotFound(ResourceNotFoundException ex) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(new ApiErrorResponse(
                        LocalDateTime.now(),
                        404,
                        "Not Found",
                        ex.getMessage(),
                        null
                ));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiErrorResponse> handleConflict(ConflictException ex) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(new ApiErrorResponse(
                        LocalDateTime.now(),
                        409,
                        "Conflict",
                        ex.getMessage(),
                        null
                ));
    }

    @ExceptionHandler({BadRequestException.class, IllegalArgumentException.class})
    public ResponseEntity<ApiErrorResponse> handleBadRequest(Exception ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiErrorResponse(
                        LocalDateTime.now(),
                        400,
                        "Bad Request",
                        ex.getMessage(),
                        null
                ));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(new ApiErrorResponse(
                        LocalDateTime.now(),
                        401,
                        "Unauthorized",
                        "Usuario o contraseña incorrectos",
                        null
                ));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiErrorResponse> handleAuthentication(AuthenticationException ex) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(new ApiErrorResponse(
                        LocalDateTime.now(),
                        401,
                        "Unauthorized",
                        ex.getMessage(),
                        null
                ));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleNotReadable(HttpMessageNotReadableException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiErrorResponse(
                        LocalDateTime.now(),
                        400,
                        "Bad Request",
                        "Cuerpo de la petición inválido o mal formado",
                        null
                ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(FieldError::getField, e -> e.getDefaultMessage() != null ? e.getDefaultMessage() : "Invalid"));
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiErrorResponse(
                        LocalDateTime.now(),
                        400,
                        "Validation Error",
                        "Error de validación",
                        errors
                ));
    }

    /**
     * Concurrencia optimista: dos transacciones intentaron modificar la misma fila
     * simultaneamente y la segunda quedo con una version desactualizada. Devolvemos
     * 409 con un mensaje accionable para que el cliente reintente con datos frescos.
     * Capturamos tanto la API JPA ({@code OptimisticLockException}) como su wrapper
     * de Spring ({@code ObjectOptimisticLockingFailureException}).
     */
    @ExceptionHandler({
            jakarta.persistence.OptimisticLockException.class,
            org.springframework.orm.ObjectOptimisticLockingFailureException.class
    })
    public ResponseEntity<ApiErrorResponse> handleOptimisticLock(Exception ex) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(new ApiErrorResponse(
                        LocalDateTime.now(),
                        409,
                        "Conflict",
                        "El recurso fue modificado por otro usuario; recargue e intente de nuevo",
                        null
                ));
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrity(org.springframework.dao.DataIntegrityViolationException ex) {
        Throwable cause = ex.getCause();
        String rawMessage = cause != null ? cause.getMessage() : ex.getMessage();
        String constraint = extractConstraintName(rawMessage);
        String friendly = friendlyMessageForConstraint(constraint);
        String message;
        if (friendly != null) {
            message = friendly;
        } else if (rawMessage != null && rawMessage.length() <= 200) {
            message = rawMessage;
        } else {
            message = "Conflicto de datos (duplicado o restricción de integridad)";
        }
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(new ApiErrorResponse(
                        LocalDateTime.now(),
                        409,
                        "Conflict",
                        message,
                        null
                ));
    }

    /**
     * Extrae el nombre del constraint del mensaje crudo de PostgreSQL,
     * que tiene la forma {@code ... violates unique constraint "<nombre>" ...}.
     * Devuelve {@code null} si no se reconoce el patrón.
     */
    private static String extractConstraintName(String rawMessage) {
        if (rawMessage == null) return null;
        java.util.regex.Matcher m = CONSTRAINT_NAME_PATTERN.matcher(rawMessage);
        return m.find() ? m.group(1) : null;
    }

    private static final java.util.regex.Pattern CONSTRAINT_NAME_PATTERN =
            java.util.regex.Pattern.compile("constraint \"([^\"]+)\"");

    /**
     * Mapea constraints conocidos a mensajes accionables para el usuario.
     * Devuelve {@code null} si el constraint no esta mapeado, en cuyo caso
     * el handler devolvera el mensaje crudo (si es razonablemente corto).
     */
    private static String friendlyMessageForConstraint(String constraint) {
        if (constraint == null) return null;
        return switch (constraint) {
            case "idx_paquete_ref" ->
                    "Ya existe otro paquete con esa referencia";
            case "paquete_numero_guia_key" ->
                    "Ya existe otro paquete con ese número de guía";
            case "idx_paquete_guia_master_pieza_uk", "idx_paquete_master_pieza_uk" ->
                    "Esa pieza ya está asignada en la guía master";
            case "guia_master_tracking_base_key" ->
                    "Ya existe una guía master con ese tracking base";
            case "manifiesto_codigo_key" ->
                    "Ya existe un manifiesto con ese código";
            case "uq_agencia_distribuidor_distribuidor_codigo",
                 "uq_agencia_distribuidor_distribuidor_codigo_vivos" ->
                    "Ya existe una agencia con ese código para el distribuidor";
            case "uq_destinatario_final_codigo_vivos" ->
                    "Ya existe un destinatario con ese código";
            case "uq_agencia_codigo_vivos" ->
                    "Ya existe una agencia con ese código";
            case "distribuidor_codigo_key" ->
                    "Ya existe un distribuidor con ese código";
            case "agencia_codigo_key" ->
                    "Ya existe una agencia con ese código";
            case "destinatario_final_codigo_key" ->
                    "Ya existe un destinatario con ese código";
            case "idx_lote_recepcion_guia_uk" ->
                    "Ese número de guía ya está en el lote de recepción";
            case "ux_tracking_view_paquete_numero_guia" ->
                    "Conflicto en la vista de tracking del paquete";
            default -> null;
        };
    }

    /**
     * Captura denegaciones de acceso lanzadas por @PreAuthorize en métodos de
     * controlador (incluye AuthorizationDeniedException, subclase de
     * AccessDeniedException). Sin este handler, el catch-all genérico convertía
     * la denegación en HTTP 500 en vez del 403 esperado.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(new ApiErrorResponse(
                        LocalDateTime.now(),
                        403,
                        "Forbidden",
                        "No tiene permisos para acceder a este recurso",
                        null
                ));
    }

    /**
     * Captura genérico para cualquier excepción no mapeada explícitamente.
     * Loguea el stacktrace completo para que el operador pueda diagnosticar
     * la causa raíz; al cliente solo se le devuelve un mensaje neutro.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGeneric(Exception ex) {
        log.error("unexpected_exception type={} message={}",
                ex.getClass().getName(), ex.getMessage(), ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiErrorResponse(
                        LocalDateTime.now(),
                        500,
                        "Internal Server Error",
                        "Error interno del servidor",
                        null
                ));
    }
}
