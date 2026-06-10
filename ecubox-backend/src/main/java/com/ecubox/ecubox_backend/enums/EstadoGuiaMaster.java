package com.ecubox.ecubox_backend.enums;

import java.util.EnumSet;
import java.util.Set;

/**
 * Estado agregado de la guía master.
 *
 * <p>Flujo principal: PENDIENTE_VERIFICACION → (admin aprueba) → VERIFICADA →
 * SIN_PAQUETES_REGISTRADOS / CON_PAQUETES_REGISTRADOS → ENVIO_PARCIAL / ENVIO_COMPLETO
 * → RECEPCION_PARCIAL / RECEPCION_COMPLETA → DESPACHO_PARCIAL → DESPACHO_COMPLETADO.
 *
 * <p>Las guías creadas por admin/operario inician directamente en SIN_PAQUETES_REGISTRADOS
 * (sin pasar por PENDIENTE_VERIFICACION). Las creadas por el cliente inician en
 * PENDIENTE_VERIFICACION hasta que un admin las apruebe.
 *
 * <p>PENDIENTE_VERIFICACION y EN_REVISION son estados congelados: el recálculo automático
 * no los sobreescribe. VERIFICADA NO es congelado; la aprobación desencadena recálculo
 * inmediato hacia SIN_PAQUETES_REGISTRADOS o CON_PAQUETES_REGISTRADOS.
 */
public enum EstadoGuiaMaster {

    /** Registrada por cliente; pendiente de aprobación por admin/operario. Estado congelado. */
    PENDIENTE_VERIFICACION,

    /**
     * Aprobada por admin/operario. Estado transitorio: el recálculo inmediato la lleva
     * a SIN_PAQUETES_REGISTRADOS o CON_PAQUETES_REGISTRADOS según paquetes existentes.
     */
    VERIFICADA,

    /** Pausa administrativa: el operario marcó la guía para revisión; recálculo congelado. */
    EN_REVISION,

    /** Verificada/aprobada pero sin paquetes registrados aún. */
    SIN_PAQUETES_REGISTRADOS,

    /** Tiene paquetes registrados, ninguno asignado a un envío consolidado. */
    CON_PAQUETES_REGISTRADOS,

    /** Algunos paquetes de la guía están en un envío consolidado. */
    ENVIO_PARCIAL,

    /** Todos los paquetes registrados de la guía están en un envío consolidado. */
    ENVIO_COMPLETO,

    /** Al menos un paquete recibido en bodega; otros siguen en camino. */
    RECEPCION_PARCIAL,

    /** Todos los paquetes esperados están recibidos en bodega. */
    RECEPCION_COMPLETA,

    /** Al menos un paquete despachado; faltan paquetes. */
    DESPACHO_PARCIAL,

    /** Todos los paquetes fueron despachados. Estado terminal exitoso. */
    DESPACHO_COMPLETADO,

    /** Anulada por el operario. Estado terminal. */
    CANCELADA;

    /** Estados que indican que la guía ya no avanzará más en el flujo automático. */
    public static Set<EstadoGuiaMaster> terminales() {
        return EnumSet.of(DESPACHO_COMPLETADO, CANCELADA);
    }

    /** Estados que requieren auditoría de cierre (cerrada_en, tipo_cierre, etc.). */
    public static Set<EstadoGuiaMaster> requierenAuditoriaCierre() {
        return terminales();
    }

    /**
     * Estados en los que el recálculo automático no debe sobreescribir el estado actual.
     * Incluye terminales (ya finalizados), EN_REVISION (pausa explícita) y
     * PENDIENTE_VERIFICACION (requiere acción manual de admin/operario).
     */
    public static Set<EstadoGuiaMaster> congeladosParaRecalculo() {
        EnumSet<EstadoGuiaMaster> s = EnumSet.copyOf(terminales());
        s.add(EN_REVISION);
        s.add(PENDIENTE_VERIFICACION);
        return s;
    }

    public boolean esTerminal() {
        return terminales().contains(this);
    }

    public boolean estaCongeladoParaRecalculo() {
        return congeladosParaRecalculo().contains(this);
    }
}
