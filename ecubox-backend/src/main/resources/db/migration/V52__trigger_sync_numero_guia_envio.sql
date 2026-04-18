-- Trigger BEFORE INSERT/UPDATE en paquete que mantiene paquete.numero_guia_envio
-- sincronizado con envio_consolidado.codigo cuando el FK envio_consolidado_id
-- esta definido. Permite seguir consultando la columna denormalizada por
-- compatibilidad mientras se migran las queries y la UI.

CREATE OR REPLACE FUNCTION sync_paquete_numero_guia_envio()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.envio_consolidado_id IS NOT NULL THEN
        SELECT ec.codigo
          INTO NEW.numero_guia_envio
          FROM envio_consolidado ec
         WHERE ec.id = NEW.envio_consolidado_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_paquete_numero_guia_envio ON paquete;

CREATE TRIGGER trg_sync_paquete_numero_guia_envio
    BEFORE INSERT OR UPDATE OF envio_consolidado_id ON paquete
    FOR EACH ROW
    EXECUTE FUNCTION sync_paquete_numero_guia_envio();

COMMENT ON FUNCTION sync_paquete_numero_guia_envio() IS
    'Sincroniza paquete.numero_guia_envio con envio_consolidado.codigo cuando se asigna FK envio_consolidado_id';
