package com.ecubox.ecubox_backend.exception;

/**
 * Exception for conflict situations (e.g. duplicate email or cédula on registration).
 * Mapped to HTTP 409 Conflict in GlobalExceptionHandler.
 */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }

    public ConflictException(String message, Throwable cause) {
        super(message, cause);
    }
}
