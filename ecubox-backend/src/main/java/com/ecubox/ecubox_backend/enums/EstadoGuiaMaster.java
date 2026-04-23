package com.ecubox.ecubox_backend.enums;

import java.util.EnumSet;
import java.util.Set;

/**
 * Estado agregado de la guia del consolidador (guia_master).
 *
 * <p>La mayoria de las transiciones se derivan de los conteos de piezas
 * (ver {@code GuiaMasterService.calcularEstado}), salvo
 * {@link #SIN_PIEZAS_REGISTRADAS} cuando aun no hay piezas. Tres estados son
 * <em>terminales</em> y deben ser establecidos manualmente o por un job:
 * {@link #DESPACHO_COMPLETADO}, {@link #DESPACHO_INCOMPLETO} y
 * {@link #CANCELADA}. El estado {@link #EN_REVISION} es una pausa
 * administrativa: mientras este activo, el recalculo automatico no se
 * sobreescribe (la guia se "congela" hasta que el operario la libere).
 */
public enum EstadoGuiaMaster {
    /**
     * La guia existe pero aun no tiene piezas (paquetes) asociadas en el sistema.
     * Distinto de {@link #EN_ESPERA_RECEPCION}, donde ya hay piezas y ninguna
     * entro a recepcion en bodega.
     */
    SIN_PIEZAS_REGISTRADAS,
    /** Hay piezas registradas pero ninguna en recepcion bodega ni despachada. */
    EN_ESPERA_RECEPCION,
    /** Al menos una pieza recibida en bodega; otras siguen en camino. */
    RECEPCION_PARCIAL,
    /** Todas las piezas esperadas estan recibidas en bodega; ninguna despachada todavia. */
    RECEPCION_COMPLETA,
    /** Al menos una pieza ha sido despachada hacia el destino; faltan piezas. */
    DESPACHO_PARCIAL,
    /** Todas las piezas esperadas fueron despachadas. Estado terminal exitoso. */
    DESPACHO_COMPLETADO,
    /** Cerrada manualmente o por timeout aceptando que faltaron piezas por llegar. Estado terminal. */
    DESPACHO_INCOMPLETO,
    /** Anulada por el operario antes de despachar (error de registro, cliente la cancelo, etc.). Estado terminal. */
    CANCELADA,
    /** Pausa administrativa: el operario marco la guia para revision; el recalculo automatico no la sobreescribe. */
    EN_REVISION;

    /** Estados que indican que la guia ya no avanzara mas en el flujo automatico. */
    public static Set<EstadoGuiaMaster> terminales() {
        return EnumSet.of(DESPACHO_COMPLETADO, DESPACHO_INCOMPLETO, CANCELADA);
    }

    /** Estados que requieren auditoria de cierre (cerrada_en, tipo_cierre, etc.). */
    public static Set<EstadoGuiaMaster> requierenAuditoriaCierre() {
        return terminales();
    }

    /**
     * Estados en los que el recalculo automatico no debe sobreescribir
     * el estado actual: terminales (porque ya estan finalizados) y
     * EN_REVISION (porque es una pausa explicita).
     */
    public static Set<EstadoGuiaMaster> congeladosParaRecalculo() {
        EnumSet<EstadoGuiaMaster> s = EnumSet.copyOf(terminales());
        s.add(EN_REVISION);
        return s;
    }

    public boolean esTerminal() {
        return terminales().contains(this);
    }

    public boolean estaCongeladoParaRecalculo() {
        return congeladosParaRecalculo().contains(this);
    }
}
