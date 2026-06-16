-- Imagen de campaña por tema: una para modo claro y otra para modo oscuro
-- (ambas opcionales; el fallback bidireccional se resuelve en frontend). Se
-- mantiene un único texto alternativo. Migra el campo legado imagen_url a ambos.

ALTER TABLE campania_landing ADD COLUMN imagen_url_claro VARCHAR(500);
ALTER TABLE campania_landing ADD COLUMN imagen_url_oscuro VARCHAR(500);

-- Compatibilidad: copia la imagen existente a ambos campos para no perder datos.
UPDATE campania_landing
   SET imagen_url_claro = imagen_url,
       imagen_url_oscuro = imagen_url
 WHERE imagen_url IS NOT NULL;

-- La columna legada imagen_url se conserva temporalmente (la app deja de
-- escribirla y leerla). Se retirará en una migración futura tras verificar que
-- ninguna versión compatible la necesita.

-- Los borradores pueden guardarse incompletos: las reglas de CTA todo-o-nada y
-- de "texto alternativo obligatorio con imagen" pasan a validarse SOLO al
-- publicar (en el servicio). Se relajan los CHECK de nivel de tabla.
ALTER TABLE campania_landing DROP CONSTRAINT IF EXISTS ck_campania_landing_cta;
ALTER TABLE campania_landing DROP CONSTRAINT IF EXISTS ck_campania_landing_alt;
