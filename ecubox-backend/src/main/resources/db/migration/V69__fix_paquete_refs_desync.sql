-- =====================================================================
-- V69: Backfill correctivo de paquete.ref desincronizado del destinatario.
--
-- Antes de los fixes en V68 + cambios de servicio, era posible que un
-- paquete terminara con un ref cuyo prefijo (codigoBase) NO correspondia
-- al destinatario actual del paquete. Causa raiz documentada:
--   1. PaqueteService.update regeneraba el ref al cambiar destinatario,
--      pero acto seguido lo sobreescribia con request.ref viejo enviado
--      por el form (PaqueteForm.tsx siempre reenviaba paquete.ref).
--   2. GuiaMasterService.update*Destinatario* cambiaba el destinatario
--      de la guia sin tocar las piezas, dejando refs huerfanos.
--
-- Esta migracion detecta paquetes con ref desincronizado y regenera el
-- ref usando codigo_secuencia (PAQUETE_REF, scope=destinatario_final_id),
-- preservando la garantia de unicidad y manteniendo continua la
-- secuencia atomica introducida en V68.
--
-- Reglas:
--   - codigoBase del destinatario = NULLIF(d.codigo,'') o 'D'||d.id.
--   - Se considera desincronizado todo paquete cuyo ref no inicie con
--     codigoBase || '-'.
--   - Se ignoran paquetes sin destinatario_final_id (no aplica) y
--     paquetes sin ref (no aplica).
-- =====================================================================
DO $$
DECLARE
    r RECORD;
    nuevo_n BIGINT;
    nuevo_ref TEXT;
    total_corregidos INT := 0;
BEGIN
    FOR r IN
        SELECT p.id,
               p.ref            AS ref_actual,
               d.id             AS dest_id,
               COALESCE(NULLIF(d.codigo, ''), 'D' || d.id) AS codigo_base
        FROM paquete p
        JOIN destinatario_final d ON d.id = p.destinatario_final_id
        WHERE p.ref IS NOT NULL
          AND p.ref <> ''
          AND p.ref NOT LIKE COALESCE(NULLIF(d.codigo, ''), 'D' || d.id) || '-%'
        ORDER BY p.id
    LOOP
        INSERT INTO codigo_secuencia (entity, scope_key, next_value, updated_at)
        VALUES ('PAQUETE_REF', r.dest_id::text, 1, now())
        ON CONFLICT (entity, scope_key) DO UPDATE
            SET next_value = codigo_secuencia.next_value + 1,
                updated_at = now()
        RETURNING next_value INTO nuevo_n;

        nuevo_ref := r.codigo_base || '-' || nuevo_n;

        UPDATE paquete
           SET ref = nuevo_ref
         WHERE id = r.id;

        total_corregidos := total_corregidos + 1;
        RAISE NOTICE 'V69 corrige paquete id=% : "%" -> "%"',
            r.id, r.ref_actual, nuevo_ref;
    END LOOP;

    RAISE NOTICE 'V69 finalizo: % paquetes con ref reasignado.', total_corregidos;
END $$;
