-- V57: Eliminar la columna observaciones de guia_master.
-- El campo se removió del modelo (entidad, DTOs, UI). El motivo de cierre con
-- faltante ahora solo se registra en logs para auditoría, no se persiste.

ALTER TABLE guia_master DROP COLUMN IF EXISTS observaciones;
