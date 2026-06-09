-- Los estados de guia master y consolidado son enums/reglas internas del
-- sistema. Ya no forman parte de la configuracion editable por ambiente.
DELETE FROM parametro_sistema
WHERE clave LIKE 'estado_guia_master_%'
   OR clave LIKE 'estado_consolidado_%';
