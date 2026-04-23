import { Link } from '@tanstack/react-router';
import { LegalPageLayout, LegalSection } from '@/pages/legal/LegalPageLayout';

export function PoliticaPrivacidadPage() {
  return (
    <LegalPageLayout
      title="Política de privacidad"
      subtitle="Información sobre cómo ECUBOX trata los datos personales cuando usas el sitio, te registras o contratas servicios de casillero y envíos."
    >
      <div className="space-y-10">
        <LegalSection title="1. Responsable del tratamiento">
          <p>
            El responsable del tratamiento de los datos personales recogidos a través de
            los canales ECUBOX es la empresa operadora del servicio comercializado bajo
            la marca <strong>ECUBOX</strong>, con domicilio en Ecuador. Los datos de
            contacto para ejercer derechos se publicarán en el sitio o en el panel de
            cuenta.
          </p>
        </LegalSection>

        <LegalSection title="2. Datos que podemos tratar">
          <ul>
            <li>
              <strong>Identificación y cuenta:</strong> nombre, correo electrónico,
              teléfono, documento de identidad cuando sea requerido, credenciales
              cifradas.
            </li>
            <li>
              <strong>Operación logística:</strong> direcciones de envío y recepción,
              datos de consignatarios, descripciones de mercancía, pesos, valores
              declarados, guías, estados de rastreo, prueba de entrega.
            </li>
            <li>
              <strong>Técnicos:</strong> dirección IP, tipo de navegador, registros de
              seguridad y diagnóstico, cookies necesarias para sesión o preferencias.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="3. Finalidades">
          <ul>
            <li>Crear y administrar tu cuenta y el casillero asignado.</li>
            <li>
              Ejecutar el contrato de servicios: recepción, transporte, aduanas,
              notificaciones de estado y cobro.
            </li>
            <li>Cumplir obligaciones legales (fiscal, aduanera, auditoría).</li>
            <li>
              Seguridad, prevención de fraude y mejora del servicio, con base en interés
              legítimo cuando corresponda.
            </li>
            <li>
              Comunicaciones comerciales solo si has dado tu consentimiento o la ley lo
              permite, pudiendo oponerte en cualquier momento.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="4. Base legal">
          <p>
            El tratamiento se fundamenta en la ejecución del contrato o medidas
            precontractuales (registro, cotización), el cumplimiento de obligaciones
            legales, el consentimiento cuando sea necesario (p. ej. marketing opcional) y
            el interés legítimo en la seguridad de la plataforma, siempre respetando tus
            derechos y la normativa ecuatoriana de protección de datos personales.
          </p>
        </LegalSection>

        <LegalSection title="5. Conservación">
          <p>
            Conservamos los datos el tiempo necesario para la finalidad y los plazos
            legales de prescripción (por ejemplo, documentación aduanera o tributaria).
            Posteriormente se suprimen o anonimizan cuando sea posible.
          </p>
        </LegalSection>

        <LegalSection title="6. Destinatarios y encargados">
          <p>
            Podemos comunicar datos a transportistas, agentes de aduana, couriers de última
            milla, proveedores de hosting y soporte TI, y autoridades cuando la ley lo
            exija. Exigimos a terceros medidas adecuadas de confidencialidad y seguridad.
            Transferencias internacionales (p. ej. hacia EE. UU. para operar el
            casillero) se realizan en el marco del contrato de servicio y salvaguardas
            aplicables.
          </p>
        </LegalSection>

        <LegalSection title="7. Tus derechos">
          <p>
            Puedes solicitar acceso, rectificación, cancelación, oposición, portabilidad
            cuando proceda, y revocar el consentimiento otorgado, según la Ley Orgánica de
            Protección de Datos Personales del Ecuador y reglamentos relacionados. Para
            ejercerlos, escribe al contacto indicado en el sitio adjuntando identificación
            razonable.
          </p>
        </LegalSection>

        <LegalSection title="8. Seguridad">
          <p>
            Aplicamos medidas técnicas y organizativas razonables (cifrado en tránsito,
            controles de acceso, registro de actividad). Ningún sistema es infalible; debes
            proteger tu contraseña y notificar usos indebidos.
          </p>
        </LegalSection>

        <LegalSection title="9. Menores de edad">
          <p>
            El servicio no está dirigido a menores de dieciséis (16) años. Si detectamos
            datos de menores recogidos sin autorización válida, tomaremos medidas para
            eliminarlos.
          </p>
        </LegalSection>

        <LegalSection title="10. Cambios en esta política">
          <p>
            Publicaremos actualizaciones en esta página. El uso continuado del servicio
            tras cambios relevantes puede requerir nueva aceptación cuando la ley lo
            exija.
          </p>
        </LegalSection>

        <LegalSection title="11. Más información">
          <p>
            Los <strong>términos y condiciones</strong> del servicio complementan esta
            política:{' '}
            <Link
              to="/terminos"
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
