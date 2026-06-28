-- Plantilla por defecto para mensajes WhatsApp de despacho.
-- No pisa plantillas operativas ya configuradas por el administrador.

UPDATE parametro_sistema
SET valor = 'Hola {{consignatarioNombre}}, tu envío ECUBOX {{numeroGuia}} fue preparado para {{destinoNombre}}. Modalidad: {{tipoEntregaEtiqueta}}. Sacas: {{cantidadSacas}}. Peso: {{pesoTotalLbs}} lbs / {{pesoTotalKg}} kg. Gracias por confiar en ECUBOX.'
WHERE clave = 'mensaje_whatsapp_despacho'
  AND (valor IS NULL OR btrim(valor) = '');
