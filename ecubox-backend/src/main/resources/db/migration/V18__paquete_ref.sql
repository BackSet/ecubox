-- Referencia del paquete: código del destinatario + número secuencial (ej. ECU-CE80-0001)
ALTER TABLE paquete ADD COLUMN ref VARCHAR(100) NULL;

-- Rellenar paquetes existentes: ref = codigo_destinatario + '-' + número de 4 dígitos por destinatario
UPDATE paquete p
SET ref = sub.ref
FROM (
    SELECT p2.id,
           (COALESCE(TRIM(d.codigo), 'D' || d.id::text)) || '-' || LPAD((ROW_NUMBER() OVER (PARTITION BY p2.destinatario_final_id ORDER BY p2.id))::text, 4, '0') AS ref
    FROM paquete p2
    JOIN destinatario_final d ON d.id = p2.destinatario_final_id
) sub
WHERE p.id = sub.id;

ALTER TABLE paquete ALTER COLUMN ref SET NOT NULL;
CREATE UNIQUE INDEX idx_paquete_ref ON paquete(ref);

COMMENT ON COLUMN paquete.ref IS 'Referencia única: código destinatario + número de paquete (ej. ECU-CE80-0001)';
