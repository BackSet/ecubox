import { Link } from '@tanstack/react-router';
import { LegalPageLayout, LegalSection } from '@/pages/legal/LegalPageLayout';

export function PoliticaCookiesPage() {
  return (
    <LegalPageLayout
      title="Política de cookies y tecnologías similares"
      subtitle="Información sobre cookies, almacenamiento local, caché PWA, fuentes externas y permisos de notificación usados por ECUBOX."
    >
      <div className="space-y-10">
        <LegalSection title="1. Alcance">
          <p>
            Esta política explica las tecnologías que pueden guardar información en tu
            navegador o dispositivo cuando visitas el sitio o usas la PWA de ECUBOX.
          </p>
          <p>
            En el código revisado no se encontró uso de <strong>cookies propias</strong>,
            cookies publicitarias ni herramientas de analítica no esencial. Si esto cambia,
            ECUBOX deberá actualizar esta política y, cuando corresponda, pedir
            consentimiento previo.
          </p>
        </LegalSection>

        <LegalSection title="2. Tecnologías usadas">
          <ul>
            <li>
              <strong>LocalStorage:</strong> guarda token de sesión, perfil básico,
              tema visual, preferencias de interfaz y algunas banderas de experiencia.
            </li>
            <li>
              <strong>SessionStorage:</strong> puede guardar datos temporales de
              recuperación de pantalla o estado de sesión del navegador.
            </li>
            <li>
              <strong>Service Worker y caché PWA:</strong> conserva archivos de la app,
              imágenes, fuentes y recursos estáticos para estabilidad y carga más rápida.
              Las peticiones de API no se cachean por el Service Worker.
            </li>
            <li>
              <strong>Google Fonts:</strong> se cargan fuentes desde dominios de Google
              y el Service Worker puede cachear esos recursos.
            </li>
            <li>
              <strong>Web Push:</strong> si activas notificaciones, el navegador genera
              una suscripción técnica con endpoint, claves públicas de cifrado y user
              agent para enviar avisos operativos.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="3. Finalidad">
          <p>
            Estas tecnologías se usan para iniciar sesión, recordar preferencias,
            mantener una experiencia PWA estable, mejorar tiempos de carga, proteger la
            plataforma y enviar avisos operativos cuando el usuario activa notificaciones.
          </p>
        </LegalSection>

        <LegalSection title="4. Cookies no esenciales y analítica">
          <p>
            No se detectaron cookies no esenciales, publicidad comportamental, píxeles de
            marketing ni analítica integrada en esta versión del repositorio. Si ECUBOX
            incorpora esas herramientas, deberá informar proveedor, finalidad, duración,
            país, base legal y mecanismo de consentimiento o rechazo.
          </p>
        </LegalSection>

        <LegalSection title="5. Cómo gestionar estas tecnologías">
          <ul>
            <li>Puedes cerrar sesión para eliminar el token de acceso desde la app.</li>
            <li>Puedes borrar almacenamiento local, datos del sitio y caché desde tu navegador.</li>
            <li>Puedes revocar notificaciones desde la configuración del sitio o del sistema operativo.</li>
            <li>Si desactivas almacenamiento o Service Worker, algunas funciones PWA pueden dejar de funcionar.</li>
          </ul>
        </LegalSection>

        <LegalSection title="6. Relación con privacidad">
          <p>
            Para conocer qué datos personales trata ECUBOX, revisa la{' '}
            <Link
              to="/politica-de-privacidad"
              className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              política de privacidad
            </Link>
            .
          </p>
        </LegalSection>
      </div>
    </LegalPageLayout>
  );
}

