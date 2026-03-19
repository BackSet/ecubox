-- URL de tracking público por distribuidor (opcional para referencias operativas).
ALTER TABLE distribuidor
    ADD COLUMN IF NOT EXISTS pagina_tracking TEXT;
