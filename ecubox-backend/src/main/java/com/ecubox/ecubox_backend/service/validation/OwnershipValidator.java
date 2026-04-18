package com.ecubox.ecubox_backend.service.validation;

import com.ecubox.ecubox_backend.entity.DestinatarioFinal;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import org.springframework.stereotype.Component;

/**
 * Validador de propiedad ("ownership") sobre recursos por usuario.
 *
 * <p>Centraliza la regla "si el usuario actual no es admin/operario y el
 * recurso no le pertenece, lanzar 404 (no 403) para no filtrar existencia".
 * Esta regla se duplicaba en varios métodos de {@code PaqueteService}.
 */
@Component
public class OwnershipValidator {

    /**
     * Valida que un paquete pertenezca al usuario indicado, salvo que el
     * caller tenga permiso global ({@code canManageAny=true}).
     *
     * @throws ResourceNotFoundException si el paquete no pertenece al usuario;
     *         se usa {@link ResourceNotFoundException} en lugar de 403 para
     *         no revelar existencia del recurso a usuarios no autorizados.
     */
    public void requirePaqueteOwnership(Paquete paquete, Long currentUsuarioId, boolean canManageAny) {
        if (canManageAny) return;
        if (paquete == null || paquete.getDestinatarioFinal() == null
                || paquete.getDestinatarioFinal().getUsuario() == null) {
            throw new ResourceNotFoundException("Paquete", paquete != null ? paquete.getId() : null);
        }
        Long ownerId = paquete.getDestinatarioFinal().getUsuario().getId();
        if (!ownerId.equals(currentUsuarioId)) {
            throw new ResourceNotFoundException("Paquete", paquete.getId());
        }
    }

    /**
     * Valida que un destinatario final pertenezca al usuario indicado.
     */
    public void requireDestinatarioOwnership(DestinatarioFinal destinatario, Long currentUsuarioId, boolean canManageAny) {
        if (canManageAny) return;
        if (destinatario == null || destinatario.getUsuario() == null
                || !destinatario.getUsuario().getId().equals(currentUsuarioId)) {
            Long id = destinatario != null ? destinatario.getId() : null;
            throw new ResourceNotFoundException("Destinatario", id);
        }
    }
}
