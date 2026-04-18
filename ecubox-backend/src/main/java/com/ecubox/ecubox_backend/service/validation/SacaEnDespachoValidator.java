package com.ecubox.ecubox_backend.service.validation;

import com.ecubox.ecubox_backend.entity.Saca;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import org.springframework.stereotype.Component;

/**
 * Valida que una saca no esté ya asignada a un despacho. Esta regla se
 * repetía en {@code PaqueteService} y {@code DespachoService} con mensajes
 * ligeramente distintos; se centraliza aquí para mantener consistencia.
 */
@Component
public class SacaEnDespachoValidator {

    /**
     * Lanza {@link BadRequestException} si la saca ya pertenece a un despacho.
     * Si {@code despachoIdActual} es no-null, la asignación al MISMO despacho
     * se considera válida (caso típico al editar un despacho ya existente).
     */
    public void requireSinDespacho(Saca saca, Long despachoIdActual) {
        if (saca == null || saca.getDespacho() == null) return;
        if (despachoIdActual != null && despachoIdActual.equals(saca.getDespacho().getId())) {
            return;
        }
        String numero = saca.getNumeroOrden();
        String prefijo = numero != null && !numero.isBlank() ? "La saca " + numero : "La saca";
        throw new BadRequestException(prefijo + " ya está asignada a un despacho");
    }
}
