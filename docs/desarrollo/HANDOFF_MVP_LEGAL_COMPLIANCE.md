# Handoff — MVP 3/3: Integración Legal y Cumplimiento (Compliance)

Documento de traspaso y especificación técnica de los cambios correspondientes a la iteración de **Legal, Privacidad y Cookies** (MVP 3/3).

- **Rama:** `dev` (pushed con todos los cambios validados).
- **Versión Legal Aplicable:** `ECUBOX-LEGAL-2026-06-28`
- **Fecha Efectiva:** `28 de junio de 2026`
- **Validación Frontend:**
  * `npx tsc --noEmit` -> ✅ 0 errores.
  * `npm run lint:nomenclatura` -> ✅ Sin violaciones al glosario.
  * `npm test -- --run` -> ✅ 384 tests pasados.
  * `npm run build` -> ✅ Build de producción exitoso (Vite + Rolldown + PWA sw.js).

---

## 1. Cambios Entregados (No Rehacer)

Se completaron las tareas de integración visual, funcional y contractual:

1.  **Módulo Legal y Layout ([LegalPageLayout.tsx](file:///c:/Users/crist/OneDrive/Documents/proyects/ECUBOX/ecubox-frontend/src/pages/legal/LegalPageLayout.tsx)):**
    *   Diseño responsivo (`mobile-safe-inline py-6 sm:py-10`), soporte para modo oscuro mediante variables CSS nativas (`var(--color-...)`) y barra superior con botón de retorno al inicio.
    *   Inyección centralizada de la versión, fecha efectiva y el **banner de revisión obligatorio** definido en [legal.ts](file:///c:/Users/crist/OneDrive/Documents/proyects/ECUBOX/ecubox-frontend/src/lib/legal.ts).
2.  **Páginas Contractuales:**
    *   **Términos y Condiciones ([TerminosCondicionesPage.tsx](file:///c:/Users/crist/OneDrive/Documents/proyects/ECUBOX/ecubox-frontend/src/pages/legal/TerminosCondicionesPage.tsx)):** Regula casillero en USA, destinatarios, aduanas, tributos, pesos, tarifas en `lbs`, entrega e incidencias, limitación de responsabilidad y jurisdicción (Ecuador).
    *   **Política de Privacidad ([PoliticaPrivacidadPage.tsx](file:///c:/Users/crist/OneDrive/Documents/proyects/ECUBOX/ecubox-frontend/src/pages/legal/PoliticaPrivacidadPage.tsx)):** Detalla los datos tratados (cuenta, destinatarios, logística, técnicos), finalidades, base legal propuesta, transferencias internacionales (Ecuador-USA) y derechos ARCO.
    *   **Política de Cookies ([PoliticaCookiesPage.tsx](file:///c:/Users/crist/OneDrive/Documents/proyects/ECUBOX/ecubox-frontend/src/pages/legal/PoliticaCookiesPage.tsx)):** Explica técnicamente el uso de `LocalStorage`, `SessionStorage`, caché de la PWA, Web Push y Google Fonts. Aclara explícitamente que no se utilizan cookies propias ni analítica comercial.
3.  **Rutas y Redirecciones ([router.tsx](file:///c:/Users/crist/OneDrive/Documents/proyects/ECUBOX/ecubox-frontend/src/routes/router.tsx)):**
    *   Rutas públicas registradas: `/terminos-y-condiciones`, `/politica-de-privacidad` y `/politica-de-cookies`.
    *   Redirecciones automáticas para compatibilidad histórica: `/terminos` -> `/terminos-y-condiciones` y `/privacidad` -> `/politica-de-privacidad`.
4.  **Puntos de Consentimiento e Información:**
    *   **Registro ([RegistroSimplePage.tsx](file:///c:/Users/crist/OneDrive/Documents/proyects/ECUBOX/ecubox-frontend/src/pages/registro/RegistroSimplePage.tsx)):** Checkbox obligatorio (`acceptTerms`) con validación en esquema Zod. Enlaces con `target="_blank"` y nota de descargo sobre versión aplicable.
    *   **Login ([LoginPage.tsx](file:///c:/Users/crist/OneDrive/Documents/proyects/ECUBOX/ecubox-frontend/src/pages/login/LoginPage.tsx)):** Consentimiento implícito por uso de cuenta al pie del formulario.
    *   **Footer ([SiteFooter.tsx](file:///c:/Users/crist/OneDrive/Documents/proyects/ECUBOX/ecubox-frontend/src/components/SiteFooter.tsx)):** Enlaces directos a las tres políticas en la sección "Legal".
    *   **Rastreo Público ([TrackingSearchPanel.tsx](file:///c:/Users/crist/OneDrive/Documents/proyects/ECUBOX/ecubox-frontend/src/pages/tracking/components/TrackingSearchPanel.tsx)):** Enlace a la política de privacidad aclarando que el rastreo muestra datos limitados para proteger la privacidad.
    *   **Formulario de Destinatarios ([ConsignatarioForm.tsx](file:///c:/Users/crist/OneDrive/Documents/proyects/ECUBOX/ecubox-frontend/src/pages/dashboard/consignatarios/ConsignatarioForm.tsx)):** Banner informativo para clientes que registran datos de terceros, enlazando a la política de privacidad.

---

## 2. Nomenclatura y Glosario (Coherencia)

Se garantizó la consistencia de los textos legales integrados con la fuente de verdad ([nomenclatura.md](file:///c:/Users/crist/OneDrive/Documents/proyects/ECUBOX/docs/nomenclatura.md)):
*   Se evitó el uso de anglicismos ("tracking", "delivery") en los textos de cara al usuario, usando en su lugar **Rastreo** y **Entrega** (según modalidad).
*   Se utilizó **Destinatario** en las vistas del cliente final e interfaces públicas (registro, tracking, listados de casillero), reservando **Consignatario** para los paneles logísticos y de back-office.
*   Se usaron de forma consistente los términos **Casillero**, **Guía master**, **Pieza**, **Courier de entrega** y **Punto de entrega**.
*   Toda referencia a unidades de peso se rotuló en **lbs**.

---

## 3. Tareas Pendientes (Próximos Pasos en Producción)

Para la puesta en marcha definitiva, se deben coordinar los siguientes aspectos:

### A. Aprobación Jurídica (Fuera de Código)
Los documentos integrados contienen *placeholders* y notas de borrador. El asesor legal o DPO (Oficial de Protección de Datos) de la empresa debe definir:
1.  **Razón Social y RUC:** Datos exactos de la persona jurídica que opera ECUBOX en Ecuador para la Sección 1 de la Política de Privacidad.
2.  **Dirección y Contacto:** Domicilio legal físico y correo oficial para la atención de incidentes legales.
3.  **Correo de Derechos ARCO:** Dirección de correo dedicada (ej. `privacidad@ecubox.com`) para que los usuarios ejerzan sus derechos de acceso, rectificación, eliminación u oposición.
4.  **Aliados Comerciales:** Lista de couriers locales (ej. Servientrega, Laar) y pasarelas de pago externas que deban ser formalmente enunciadas en el mapa de terceros.

Una vez definidos, se deben actualizar en [TerminosCondicionesPage.tsx](file:///c:/Users/crist/OneDrive/Documents/proyects/ECUBOX/ecubox-frontend/src/pages/legal/TerminosCondicionesPage.tsx) and [PoliticaPrivacidadPage.tsx](file:///c:/Users/crist/OneDrive/Documents/proyects/ECUBOX/ecubox-frontend/src/pages/legal/PoliticaPrivacidadPage.tsx), y retirar el aviso de revisión en [legal.ts](file:///c:/Users/crist/OneDrive/Documents/proyects/ECUBOX/ecubox-frontend/src/lib/legal.ts) cambiando `LEGAL_REVIEW_NOTICE` a una cadena vacía o retirando el banner del layout.

### B. Persistencia de Aceptación de Términos (Mejora Técnica Futura)
*   **Alcance Actual:** El frontend valida de forma obligatoria la aceptación del checkbox en el formulario antes de procesar el registro del cliente.
*   **Recomendación Backlog:** Para robustez probatoria (compliance estricto), se sugiere en una fase posterior:
    1. Agregar las columnas `terminos_aceptados_version` (varchar), `terminos_aceptados_at` (timestamp) y `terminos_aceptados_ip` (varchar) en la tabla `usuario`.
    2. Modificar el endpoint `POST /api/auth/register` (o un endpoint dedicado `/api/usuarios/aceptar-terminos`) para persistir esta información en la base de datos al momento del registro.

---

## 4. Verificación del Despliegue

Tras desplegar en el ambiente de staging o producción, se deben realizar las siguientes pruebas manuales de QA:
1.  **Navegación Móvil:** Verificar que las páginas legales se leean correctamente en pantallas de smartphone (ancho de lectura óptimo y sin desbordamientos).
2.  **Modo Oscuro:** Cambiar el tema en el panel y constatar que los fondos, textos y el banner de aviso de las páginas legales adapten sus contrastes automáticamente.
3.  **Flujo de Registro:**
    *   Intentar registrarse sin marcar el checkbox de términos -> Debe mostrar el mensaje de error de validación.
    *   Marcar el checkbox y enviar -> Debe permitir la creación de la cuenta y la posterior redirección al login.
4.  **Acceso a Enlaces:** Confirmar que al pulsar los enlaces en el footer, en el login y en el formulario de destinatarios se carguen las páginas legales correspondientes de forma instantánea.
5.  **Caché PWA:** Validar que los recursos estáticos de las páginas legales y el layout queden cacheados por el Service Worker para permitir su lectura offline si el usuario los visitó previamente.
