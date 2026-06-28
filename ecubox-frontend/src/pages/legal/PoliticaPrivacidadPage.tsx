import { Link } from '@tanstack/react-router';
import { LegalPageLayout, LegalSection } from '@/pages/legal/LegalPageLayout';
import { LegalContactBlock } from '@/pages/legal/LegalContactBlock';
import { usePublicCanalesDisponibles } from '@/hooks/useCanalesComunicacion';

export function PoliticaPrivacidadPage() {
  const { hasCanales, isLoading: loadingCanales } = usePublicCanalesDisponibles();
  const muestraCanales = !loadingCanales && hasCanales;

  return (
    <LegalPageLayout
      title="Política de privacidad"
      subtitle="Cómo ECUBOX trata datos personales al usar la plataforma, registrar destinatarios, operar envíos y consultar rastreo entre Estados Unidos y Ecuador."
    >
      <div className="space-y-10">
        <LegalSection title="1. Responsable">
          <p>
            El responsable del tratamiento es la empresa operadora del servicio
            comercializado bajo la marca <strong>ECUBOX</strong>, con domicilio en
            Ecuador. La razón social, RUC, domicilio completo y contacto legal definitivo
            deben ser confirmados por asesoría legal antes de publicación.
          </p>
        </LegalSection>

        <LegalSection title="2. Datos recolectados">
          <ul>
            <li>
              <strong>Cuenta:</strong> correo electrónico, usuario, contraseña cifrada,
              roles, permisos, estado de cuenta y fechas de creación.
            </li>
            <li>
              <strong>Destinatarios:</strong> nombre, teléfono, dirección, provincia,
              cantón, código y etiqueta opcional.
            </li>
            <li>
              <strong>Operación logística:</strong> números de guía, piezas, contenido
              declarado, peso, estados, fechas, incidencias, despachos, sacas, manifiestos,
              liquidaciones y confirmaciones.
            </li>
            <li>
              <strong>Rastreo público:</strong> código consultado, estado del envío,
              nombre y ubicación general del destinatario cuando aplique. No se muestran
              teléfonos ni direcciones exactas en el rastreo público.
            </li>
            <li>
              <strong>Técnicos:</strong> token de sesión en el navegador, preferencias
              locales, dirección IP usada para limitar abuso, datos de dispositivo,
              endpoint de Web Push, claves públicas de suscripción y user agent.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="3. Finalidades">
          <ul>
            <li>Crear y administrar cuentas de usuario.</li>
            <li>Gestionar casillero, guías, paquetes, despachos, entregas y rastreo.</li>
            <li>Comunicar avisos operativos, incidencias, confirmaciones y seguridad.</li>
            <li>Generar documentos, comprobantes, manifiestos, reportes y liquidaciones.</li>
            <li>Prevenir fraude, abuso, scraping, accesos no autorizados y errores operativos.</li>
            <li>Cumplir obligaciones legales, aduaneras, tributarias o requerimientos de autoridad.</li>
          </ul>
        </LegalSection>

        <LegalSection title="4. Base legal propuesta">
          <p>
            Según el flujo, el tratamiento puede apoyarse en ejecución contractual o
            medidas precontractuales, cumplimiento de obligaciones legales, interés
            legítimo en seguridad y operación, y consentimiento cuando sea requerido,
            por ejemplo para notificaciones Web Push o comunicaciones comerciales
            opcionales.
          </p>
        </LegalSection>

        <LegalSection title="5. Destinatarios y terceros">
          <p>
            ECUBOX puede comunicar datos necesarios a personal autorizado, operadores de
            bodega, couriers de entrega, agentes o aliados logísticos, autoridades,
            proveedores tecnológicos y canales externos usados por el usuario. El código
            revisado evidencia PostgreSQL, Railway, Google Fonts, Web Push y enlaces a
            WhatsApp; no evidencia pasarela de pagos, SMS, mapas ni analítica integrada.
          </p>
          <p>
            Los proveedores reales, países, contratos y encargos de tratamiento deben
            confirmarse antes de publicar la versión final.
          </p>
        </LegalSection>

        <LegalSection title="6. Transferencias internacionales">
          <p>
            El servicio opera con flujos entre Ecuador y Estados Unidos. Los datos pueden
            tratarse o comunicarse internacionalmente cuando sea necesario para recibir,
            clasificar, transportar, entregar, rastrear o documentar paquetes. ECUBOX debe
            confirmar las salvaguardas contractuales y proveedores involucrados antes de
            publicación definitiva.
          </p>
        </LegalSection>

        <LegalSection title="7. Conservación">
          <p>
            Conservamos datos durante el tiempo necesario para prestar el servicio,
            mantener trazabilidad, resolver incidencias y atender obligaciones legales,
            aduaneras, tributarias, contables o de defensa de reclamaciones. Algunos datos
            de destinatarios se conservan como copia histórica en guías o despachos ya
            generados. Los plazos exactos deben validarse con asesoría legal y operación.
          </p>
        </LegalSection>

        <LegalSection title="8. Seguridad real">
          <p>
            La plataforma usa autenticación con JWT, contraseñas cifradas, permisos por
            rol, CORS configurable, rate limit en login/rastreo, DTOs públicos limitados,
            caché controlada en rastreo y Service Worker que evita cachear la API. Ningún
            sistema es infalible; el usuario debe proteger sus credenciales y avisar si
            detecta uso indebido.
          </p>
        </LegalSection>

        <LegalSection title="9. Derechos y solicitudes">
          <p>
            Conforme a la normativa aplicable, puedes solicitar acceso, rectificación,
            actualización, eliminación, oposición, suspensión, portabilidad o revocatoria
            de consentimiento cuando proceda. ECUBOX podrá pedir información razonable
            para verificar identidad y evaluar la solicitud.
          </p>
          <p>
            {muestraCanales
              ? 'Envía tu solicitud por los canales oficiales publicados por ECUBOX e indica el derecho que deseas ejercer.'
              : 'El canal definitivo para ejercer derechos debe publicarse en el sitio antes de la versión final.'}
          </p>
          <LegalContactBlock />
        </LegalSection>

        <LegalSection title="10. Cookies y tecnologías similares">
          <p>
            En la versión revisada no se encontró uso de cookies propias ni analítica no
            esencial en el código. Sí se usan almacenamiento local, almacenamiento de
            sesión, caché PWA, Google Fonts y permisos de notificación Web Push. Revisa
            la{' '}
            <Link
              to="/politica-de-cookies"
              className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              política de cookies y tecnologías similares
            </Link>
            .
          </p>
        </LegalSection>

        <LegalSection title="11. Menores">
          <p>
            ECUBOX no está dirigido a menores de edad. Si se identifica tratamiento de
            datos de menores sin autorización válida, se evaluarán medidas de bloqueo,
            corrección o eliminación según corresponda.
          </p>
        </LegalSection>

        <LegalSection title="12. Cambios y contacto">
          <p>
            Esta política puede actualizarse para reflejar cambios legales, operativos o
            tecnológicos. La versión vigente se publicará en esta página. Los términos del
            servicio complementan esta política:{' '}
            <Link
              to="/terminos-y-condiciones"
              className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              leer términos y condiciones
            </Link>
            .
          </p>
        </LegalSection>
      </div>
    </LegalPageLayout>
  );
}
