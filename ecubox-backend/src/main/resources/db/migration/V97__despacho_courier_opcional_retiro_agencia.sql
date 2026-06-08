-- Retiro presencial en agencia: el despacho se entrega en la agencia y el
-- cliente lo retira en persona, sin courier de entrega ni envío. Por eso el
-- courier de entrega deja de ser obligatorio. El número de guía se mantiene
-- NOT NULL: cuando no aplica (retiro en agencia) el backend autogenera un
-- código interno (RET-AG-xxxxx).
ALTER TABLE despacho ALTER COLUMN courier_entrega_id DROP NOT NULL;
