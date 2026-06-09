package com.ecubox.ecubox_backend.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class EstadisticasExcepcionRepository {

    private final EntityManager entityManager;

    public EstadisticasExcepcionRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> findExcepciones(int ordenDespacho, int ordenTerminal, int limite) {
        Query query = entityManager.createNativeQuery("""
                SELECT * FROM (
                    SELECT 'ALTA' severidad, 'Paquetes' modulo, 'PAQUETE' entidad_tipo,
                           p.id entidad_id, p.numero_guia referencia,
                           'PAQUETE_ESTADO_AVANZADO_SIN_DESPACHO' codigo,
                           'Estado avanzado sin despacho' titulo,
                           CONCAT('Estado actual: ', er.nombre,
                                  '. No existe un despacho asociado.') detalle,
                           CONCAT('/tracking?codigo=', p.numero_guia) ruta
                    FROM paquete p
                    JOIN estado_rastreo er ON er.id = p.estado_rastreo_id
                    LEFT JOIN saca s ON s.id = p.saca_id
                    LEFT JOIN despacho d ON d.id = s.despacho_id
                    WHERE d.id IS NULL
                      AND er.orden_tracking >= :ordenDespacho
                      AND er.orden_tracking < :ordenTerminal

                    UNION ALL

                    SELECT 'ALTA', 'Paquetes', 'PAQUETE', p.id, p.numero_guia,
                           'PAQUETE_DESPACHADO_ESTADO_ANTERIOR',
                           'Despachado con estado anterior',
                           CONCAT('Pertenece al despacho ', d.numero_guia,
                                  ', pero su estado actual es ', er.nombre, '.'),
                           CONCAT('/tracking?codigo=', p.numero_guia)
                    FROM paquete p
                    JOIN estado_rastreo er ON er.id = p.estado_rastreo_id
                    JOIN saca s ON s.id = p.saca_id
                    JOIN despacho d ON d.id = s.despacho_id
                    WHERE er.orden_tracking < :ordenDespacho

                    UNION ALL

                    SELECT 'MEDIA', 'Paquetes', 'PAQUETE', p.id, p.numero_guia,
                           'PAQUETE_DESPACHADO_SIN_PESO',
                           'Paquete despachado sin peso',
                           CONCAT('Pertenece al despacho ', d.numero_guia,
                                  ' y no tiene peso registrado.'),
                           CONCAT('/tracking?codigo=', p.numero_guia)
                    FROM paquete p
                    JOIN saca s ON s.id = p.saca_id
                    JOIN despacho d ON d.id = s.despacho_id
                    WHERE p.peso_lbs IS NULL

                    UNION ALL

                    SELECT 'MEDIA', 'Envíos consolidados', 'ENVIO_CONSOLIDADO',
                           e.id, e.codigo,
                           'ENVIO_TOTAL_DESINCRONIZADO',
                           'Total de paquetes desincronizado',
                           CONCAT('Total guardado: ', COALESCE(e.total_paquetes, 0),
                                  '. Total real: ', COUNT(p.id), '.'),
                           CONCAT('/envios-consolidados/', e.id)
                    FROM envio_consolidado e
                    LEFT JOIN paquete p ON p.envio_consolidado_id = e.id
                    GROUP BY e.id, e.codigo, e.total_paquetes
                    HAVING COALESCE(e.total_paquetes, 0) <> COUNT(p.id)

                    UNION ALL

                    SELECT 'MEDIA', 'Manifiestos', 'MANIFIESTO',
                           m.id, m.codigo,
                           'MANIFIESTO_TOTAL_DESINCRONIZADO',
                           'Total de despachos desincronizado',
                           CONCAT('Total guardado: ', COALESCE(m.cantidad_despachos, 0),
                                  '. Total real: ', COUNT(d.id), '.'),
                           CONCAT('/manifiestos/', m.id)
                    FROM manifiesto m
                    LEFT JOIN despacho d ON d.manifiesto_id = m.id
                    GROUP BY m.id, m.codigo, m.cantidad_despachos
                    HAVING COALESCE(m.cantidad_despachos, 0) <> COUNT(d.id)

                    UNION ALL

                    SELECT 'ALTA', 'Liquidaciones', 'LIQUIDACION',
                           l.id, l.codigo,
                           'LIQUIDACION_PAGO_INCONSISTENTE',
                           'Auditoría de pago inconsistente',
                           CASE
                             WHEN l.estado_pago = 'PAGADO' AND l.fecha_pago IS NULL
                               THEN 'Está pagada, pero no registra fecha de pago.'
                             ELSE 'No está pagada, pero conserva una fecha de pago.'
                           END,
                           CONCAT('/liquidaciones/', l.id)
                    FROM liquidacion l
                    WHERE (l.estado_pago = 'PAGADO' AND l.fecha_pago IS NULL)
                       OR (l.estado_pago = 'NO_PAGADO' AND l.fecha_pago IS NOT NULL)

                    UNION ALL

                    SELECT 'ALTA', 'Guías master', 'GUIA_MASTER',
                           gm.id, gm.tracking_base,
                           'GUIA_CIERRE_INCONSISTENTE',
                           'Auditoría de cierre inconsistente',
                           CASE
                             WHEN gm.estado_global IN ('DESPACHO_COMPLETADO', 'CANCELADA')
                               THEN 'La guía está en estado terminal sin fecha de cierre.'
                             ELSE 'La guía sigue activa, pero conserva una fecha de cierre.'
                           END,
                           CONCAT('/guias-master/', gm.id)
                    FROM guia_master gm
                    WHERE (gm.estado_global IN ('DESPACHO_COMPLETADO', 'CANCELADA')
                           AND gm.cerrada_en IS NULL)
                       OR (gm.estado_global NOT IN ('DESPACHO_COMPLETADO', 'CANCELADA')
                           AND gm.cerrada_en IS NOT NULL)
                ) excepciones
                ORDER BY CASE severidad WHEN 'ALTA' THEN 1 WHEN 'MEDIA' THEN 2 ELSE 3 END,
                         modulo, entidad_id
                LIMIT :limite
                """);
        query.setParameter("ordenDespacho", ordenDespacho);
        query.setParameter("ordenTerminal", ordenTerminal);
        query.setParameter("limite", limite);
        return query.getResultList();
    }

    public long countExcepciones(int ordenDespacho, int ordenTerminal) {
        Query query = entityManager.createNativeQuery("""
                SELECT
                    (SELECT COUNT(*)
                     FROM paquete p
                     JOIN estado_rastreo er ON er.id = p.estado_rastreo_id
                     LEFT JOIN saca s ON s.id = p.saca_id
                     LEFT JOIN despacho d ON d.id = s.despacho_id
                     WHERE d.id IS NULL
                       AND er.orden_tracking >= :ordenDespacho
                       AND er.orden_tracking < :ordenTerminal)
                  + (SELECT COUNT(*)
                     FROM paquete p
                     JOIN estado_rastreo er ON er.id = p.estado_rastreo_id
                     JOIN saca s ON s.id = p.saca_id
                     JOIN despacho d ON d.id = s.despacho_id
                     WHERE er.orden_tracking < :ordenDespacho)
                  + (SELECT COUNT(*)
                     FROM paquete p
                     JOIN saca s ON s.id = p.saca_id
                     JOIN despacho d ON d.id = s.despacho_id
                     WHERE p.peso_lbs IS NULL)
                  + (SELECT COUNT(*) FROM (
                        SELECT e.id
                        FROM envio_consolidado e
                        LEFT JOIN paquete p ON p.envio_consolidado_id = e.id
                        GROUP BY e.id, e.total_paquetes
                        HAVING COALESCE(e.total_paquetes, 0) <> COUNT(p.id)
                     ) x)
                  + (SELECT COUNT(*) FROM (
                        SELECT m.id
                        FROM manifiesto m
                        LEFT JOIN despacho d ON d.manifiesto_id = m.id
                        GROUP BY m.id, m.cantidad_despachos
                        HAVING COALESCE(m.cantidad_despachos, 0) <> COUNT(d.id)
                     ) x)
                  + (SELECT COUNT(*)
                     FROM liquidacion l
                     WHERE (l.estado_pago = 'PAGADO' AND l.fecha_pago IS NULL)
                        OR (l.estado_pago = 'NO_PAGADO' AND l.fecha_pago IS NOT NULL))
                  + (SELECT COUNT(*)
                     FROM guia_master gm
                     WHERE (gm.estado_global IN ('DESPACHO_COMPLETADO', 'CANCELADA')
                            AND gm.cerrada_en IS NULL)
                        OR (gm.estado_global NOT IN ('DESPACHO_COMPLETADO', 'CANCELADA')
                            AND gm.cerrada_en IS NOT NULL))
                """);
        query.setParameter("ordenDespacho", ordenDespacho);
        query.setParameter("ordenTerminal", ordenTerminal);
        return ((Number) query.getSingleResult()).longValue();
    }
}
