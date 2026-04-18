package com.ecubox.ecubox_backend.exception;

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
        String message = cause != null ? cause.getMessage() : ex.getMessage();
        if (message != null && message.length() > 200) {
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

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGeneric(Exception ex) {
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
