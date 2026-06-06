# Seguridad

## Reportar una vulnerabilidad

No publiques vulnerabilidades, credenciales ni datos sensibles en issues públicos.
Repórtalos de forma privada al responsable del repositorio o mediante el canal de
seguridad configurado en GitHub.

Incluye:

- Componente y versión afectada.
- Pasos mínimos para reproducir el problema.
- Impacto estimado.
- Mitigación conocida, si existe.

## Prácticas del proyecto

- Los secretos se suministran mediante variables de entorno.
- OpenAPI y Scalar están desactivados en producción.
- La API usa JWT Bearer, CORS restringido y límites por IP en endpoints públicos sensibles.
- Las dependencias se revisan con `npm audit` y las pruebas automatizadas.

Los ejemplos del repositorio usan valores ficticios. Nunca reutilices esos valores en producción.
