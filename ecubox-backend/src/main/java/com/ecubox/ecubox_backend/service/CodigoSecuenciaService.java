package com.ecubox.ecubox_backend.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.function.LongSupplier;

/**
 * Generador atomico de codigos/refs incrementales por (entity, scope_key).
 *
 * <p>Reemplaza los patrones {@code count + 1}, {@code random + reintento}
 * y {@code System.currentTimeMillis()} por un UPSERT con
 * {@code ON CONFLICT ... RETURNING} sobre la tabla {@code codigo_secuencia}.
 * PostgreSQL serializa los conflictos sobre la misma fila, por lo que
 * dos requests concurrentes obtienen valores distintos sin posibilidad
 * de colision.</p>
 *
 * <p>Cada incremento corre en una transaccion {@link Propagation#REQUIRES_NEW}
 * para que el numero quede "consumido" aunque la transaccion principal
 * haga rollback. Esto evita que el mismo numero se reasigne a otro intento.</p>
 */
@Service
public class CodigoSecuenciaService {

    public static final String ENTITY_PAQUETE_REF = "PAQUETE_REF";
    public static final String ENTITY_AGENCIA_DISTRIBUIDOR = "AGENCIA_DISTRIBUIDOR";
    public static final String ENTITY_DESTINATARIO_FINAL = "DESTINATARIO_FINAL";
    public static final String ENTITY_MANIFIESTO = "MANIFIESTO";
    public static final String ENTITY_GUIA_MASTER_AUTO = "GUIA_MASTER_AUTO";

    public static final String SCOPE_GLOBAL = "GLOBAL";

    private static final DateTimeFormatter MANIFIESTO_DAY_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");

    /**
     * Semilla por defecto para destinatarios. Mantiene los nuevos codigos
     * (ECU-NNNN) por encima del espacio random historico de 4 digitos
     * para evitar colisiones con codigos legacy.
     */
    private static final long DESTINATARIO_FINAL_SEED_DEFAULT = 10_000L;

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Devuelve el siguiente valor atomico para (entity, scope).
     *
     * <p>La primera vez que se accede a un scope nuevo, se inserta la fila
     * con valor {@code seedSiNoExiste + 1}. En accesos posteriores se hace
     * {@code next_value = next_value + 1}. La operacion es atomica: dos
     * requests concurrentes nunca obtienen el mismo numero.</p>
     *
     * @param entity            identificador logico (p. ej. "PAQUETE_REF")
     * @param scopeKey          clave de scope (p. ej. id de destinatario)
     * @param seedSiNoExiste    valor inicial si la fila no existe; el primer
     *                          numero entregado sera {@code seedSiNoExiste + 1}
     * @return numero asignado, garantizado unico para (entity, scopeKey)
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public long siguiente(String entity, String scopeKey, long seedSiNoExiste) {
        Number value = (Number) entityManager.createNativeQuery(
                "INSERT INTO codigo_secuencia (entity, scope_key, next_value, updated_at) " +
                "VALUES (:entity, :scope, :seed, now()) " +
                "ON CONFLICT (entity, scope_key) DO UPDATE " +
                "  SET next_value = codigo_secuencia.next_value + 1, " +
                "      updated_at = now() " +
                "RETURNING next_value")
                .setParameter("entity", entity)
                .setParameter("scope", scopeKey)
                .setParameter("seed", seedSiNoExiste + 1)
                .getSingleResult();
        return value.longValue();
    }

    /**
     * Variante con calculo perezoso de la semilla. El {@code LongSupplier}
     * solo se invoca cuando la fila no existe todavia; en accesos
     * posteriores se ahorra la consulta a la tabla destino.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public long siguiente(String entity, String scopeKey, LongSupplier seedSiNoExiste) {
        // No conocemos por adelantado si la fila existe; calculamos el seed
        // siempre. La sobrecarga es minima frente al hit de la query UPSERT.
        long seed = seedSiNoExiste != null ? seedSiNoExiste.getAsLong() : 0L;
        return siguiente(entity, scopeKey, seed);
    }

    /**
     * Devuelve el siguiente valor que se entregaria sin consumirlo.
     * Util para sugerir codigos en la UI sin reservar numero. Si la fila
     * aun no existe se asume {@code seedSiNoExiste + 1}.
     *
     * <p>El valor obtenido es solo orientativo: bajo concurrencia, el
     * numero real entregado por {@link #siguiente(String, String, long)}
     * podria ser distinto. NUNCA usar el peek para persistir.</p>
     */
    @Transactional(readOnly = true)
    public long peek(String entity, String scopeKey, long seedSiNoExiste) {
        @SuppressWarnings("unchecked")
        java.util.List<Number> rows = entityManager.createNativeQuery(
                "SELECT next_value FROM codigo_secuencia " +
                "WHERE entity = :entity AND scope_key = :scope")
                .setParameter("entity", entity)
                .setParameter("scope", scopeKey)
                .getResultList();
        if (rows.isEmpty()) {
            return seedSiNoExiste + 1;
        }
        return rows.get(0).longValue() + 1;
    }

    // ------------------------------------------------------------------
    // Helpers tipados por entidad
    // ------------------------------------------------------------------

    /**
     * Genera el siguiente {@code ref} unico para un paquete de un destinatario.
     * Formato: {@code <codigoBase>-<n>} sin padding (preserva formato historico).
     */
    public String nextRefPaquete(Long destinatarioFinalId, String codigoBase) {
        long n = siguiente(ENTITY_PAQUETE_REF, String.valueOf(destinatarioFinalId), 0L);
        return codigoBase + "-" + n;
    }

    /**
     * Genera el siguiente codigo unico para una agencia de un distribuidor.
     * Formato: {@code <distribuidorId>-AD-<NNN>} con padding a 3 digitos.
     */
    public String nextCodigoAgencia(Long distribuidorId) {
        long n = siguiente(ENTITY_AGENCIA_DISTRIBUIDOR, String.valueOf(distribuidorId), 0L);
        return distribuidorId + "-" + String.format("AD-%03d", n);
    }

    /**
     * Genera el siguiente codigo unico para un destinatario final.
     * Formato: {@code ECU-<NNNN>} con padding a 4 digitos. La semilla
     * inicial es 10000 para evitar colisiones con el espacio random
     * historico (ECU-XXXX de 4 digitos).
     */
    public String nextCodigoDestinatario() {
        long n = siguiente(ENTITY_DESTINATARIO_FINAL, SCOPE_GLOBAL, DESTINATARIO_FINAL_SEED_DEFAULT);
        return "ECU-" + String.format("%04d", n);
    }

    /**
     * Genera el siguiente codigo unico para un manifiesto del dia indicado.
     * Formato: {@code MAN-yyyyMMdd-<NNNN>} con padding a 4 digitos.
     */
    public String nextCodigoManifiesto(LocalDate dia) {
        String dayKey = (dia != null ? dia : LocalDate.now()).format(MANIFIESTO_DAY_FMT);
        long n = siguiente(ENTITY_MANIFIESTO, dayKey, 0L);
        return "MAN-" + dayKey + "-" + String.format("%04d", n);
    }

    /**
     * Genera el siguiente {@code trackingBase} unico para una guia master
     * AUTO (creada automaticamente cuando un paquete se registra sin guia).
     * Formato: {@code AUTO-<NNNNNNNN>} con padding a 8 digitos.
     */
    public String nextTrackingBaseAuto() {
        long n = siguiente(ENTITY_GUIA_MASTER_AUTO, SCOPE_GLOBAL, 0L);
        return "AUTO-" + String.format("%08d", n);
    }
}
