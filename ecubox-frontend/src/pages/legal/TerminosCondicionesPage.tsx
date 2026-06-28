import { Link } from '@tanstack/react-router';
import { LegalPageLayout, LegalSection } from '@/pages/legal/LegalPageLayout';
import { LegalContactBlock } from '@/pages/legal/LegalContactBlock';
import { usePublicCanalesDisponibles } from '@/hooks/useCanalesComunicacion';

export function TerminosCondicionesPage() {
  const { hasCanales, isLoading: loadingCanales } = usePublicCanalesDisponibles();
  const muestraCanales = !loadingCanales && hasCanales;

  return (
    <LegalPageLayout
      title="Términos y condiciones"
      subtitle="Condiciones para usar la plataforma ECUBOX y los servicios de casillero, gestión logística, rastreo y entrega entre Estados Unidos y Ecuador."
    >
      <div className="space-y-10">
        <LegalSection title="1. Aceptación">
          <p>
            Al crear una cuenta, iniciar sesión, registrar destinatarios, consultar el
            rastreo o usar canales digitales de ECUBOX, aceptas estos términos y las
            políticas vinculadas. Si no estás de acuerdo, no utilices la plataforma.
          </p>
          <p>
            ECUBOX puede actualizar estos términos. Los cambios se publicarán en esta
            página con su fecha y versión. Cuando el cambio sea relevante, podremos
            pedir una nueva aceptación antes de continuar usando ciertos servicios.
          </p>
        </LegalSection>

        <LegalSection title="2. Descripción del servicio">
          <p>
            ECUBOX ofrece herramientas digitales y operación logística para recibir,
            registrar, preparar, transportar, rastrear y entregar paquetes comprados o
            enviados desde Estados Unidos hacia Ecuador. El servicio puede incluir
            casillero en USA, registro de guías, consolidación, despachos, manifiestos,
            liquidaciones, rastreo público y notificaciones operativas.
          </p>
          <p>
            La plataforma no reemplaza asesoría legal, tributaria, aduanera ni comercial.
            Las condiciones específicas de un envío, tarifa, seguro, plazo o entrega
            pueden constar en comunicaciones operativas, comprobantes, liquidaciones o
            documentos emitidos para ese caso.
          </p>
        </LegalSection>

        <LegalSection title="3. Cuenta y seguridad">
          <ul>
            <li>Debes proporcionar datos veraces, completos y actualizados.</li>
            <li>Eres responsable de mantener la confidencialidad de tu contraseña.</li>
            <li>
              ECUBOX puede rechazar, suspender o limitar cuentas ante fraude, abuso,
              uso no autorizado, incumplimiento legal o riesgo para la operación.
            </li>
            <li>
              Si sospechas acceso indebido a tu cuenta, debes comunicarlo por los
              canales oficiales disponibles.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="4. Casillero USA">
          <p>
            El casillero o dirección de recepción en Estados Unidos debe usarse solo
            para compras o envíos permitidos. Debes escribir correctamente los datos
            de identificación indicados por ECUBOX para asociar cada paquete a tu cuenta.
          </p>
          <p>
            ECUBOX puede pedir información adicional sobre remitente, tienda, contenido,
            valor, factura o destinatario cuando sea necesaria para operar el envío o
            atender requerimientos de terceros logísticos o autoridades.
          </p>
        </LegalSection>

        <LegalSection title="5. Destinatarios">
          <p>
            Puedes registrar una o varias personas, oficinas, sucursales o ubicaciones
            de entrega como destinatarios. Si registras datos de otra persona, declaras
            que tienes autorización o una base válida para entregarlos a ECUBOX con el
            fin de gestionar el envío.
          </p>
          <p>
            Los cambios en un destinatario aplican a envíos futuros. Los documentos o
            despachos ya generados pueden conservar una copia histórica de los datos
            vigentes al momento de la operación para preservar la trazabilidad.
          </p>
        </LegalSection>

        <LegalSection title="6. Guías, paquetes y rastreo">
          <ul>
            <li>Debes registrar números de guía reales y asociarlos al destinatario correcto.</li>
            <li>
              El contenido, peso, estado y avance de un paquete pueden ser verificados
              o corregidos durante la operación.
            </li>
            <li>
              El rastreo público muestra información limitada para confirmar el avance
              del envío; no debe usarse para scraping, abuso, enumeración de códigos ni
              extracción automatizada no autorizada.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="7. Productos prohibidos o restringidos">
          <p>
            No se aceptan productos prohibidos por la normativa de Ecuador, Estados
            Unidos, transporte internacional o políticas operativas aplicables. Pueden
            existir restricciones sobre armas, dinero en efectivo, sustancias controladas,
            materiales peligrosos, perecibles, falsificaciones, bienes regulados,
            mercancía sin documentación suficiente u otros artículos no admitidos.
          </p>
          <p>
            ECUBOX puede retener, rechazar, devolver, reportar o gestionar el tratamiento
            de mercancía restringida conforme a la ley y a las instrucciones de
            autoridades o terceros logísticos competentes.
          </p>
        </LegalSection>

        <LegalSection title="8. Aduanas y tributos">
          <p>
            El usuario o destinatario es responsable de la veracidad de la información
            declarada y del cumplimiento de requisitos aduaneros, tributarios, permisos,
            cupos, categorías courier y restricciones aplicables. Los tributos, tasas,
            multas, recargos, almacenajes, inspecciones o costos adicionales no incluidos
            expresamente en una tarifa corren por cuenta del usuario o destinatario.
          </p>
        </LegalSection>

        <LegalSection title="9. Pesos, tarifas y pagos">
          <p>
            Las tarifas pueden calcularse según peso real, peso volumétrico, tipo de
            entrega, servicio contratado, costos de distribución, recargos y otros
            factores operativos. Las calculadoras públicas o cotizaciones iniciales son
            referenciales hasta que el paquete sea verificado.
          </p>
          <p>
            Si la plataforma muestra liquidaciones, estados de pago o comprobantes, esos
            documentos reflejan la operación registrada en el sistema. El código revisado
            no evidencia una pasarela de pago integrada; si ECUBOX usa medios externos,
            sus condiciones deberán informarse por el canal correspondiente.
          </p>
        </LegalSection>

        <LegalSection title="10. Entrega e incidencias">
          <p>
            Las entregas pueden realizarse a domicilio, agencia, punto de entrega u otra
            modalidad disponible. Podría requerirse identificación, código de rastreo,
            confirmación de recepción o información adicional para completar la entrega.
          </p>
          <p>
            Los plazos son estimados salvo acuerdo expreso distinto. Pueden presentarse
            demoras por aduana, clima, seguridad, errores de datos, productos restringidos,
            fuerza mayor, terceros logísticos o causas fuera del control razonable de
            ECUBOX.
          </p>
        </LegalSection>

        <LegalSection title="11. Límites de responsabilidad">
          <p>
            En la medida permitida por la ley aplicable, ECUBOX no responderá por daños
            indirectos, lucro cesante, pérdida de oportunidad, fallas de terceros o
            demoras fuera de su control razonable. Las reclamaciones por pérdida, daño o
            incidencia de mercancía se atenderán según la evidencia disponible, el servicio
            contratado, límites operativos o seguros aplicables, y los derechos del
            consumidor que correspondan.
          </p>
        </LegalSection>

        <LegalSection title="12. Suspensión y terminación">
          <p>
            ECUBOX puede suspender funciones, bloquear operaciones o cerrar una cuenta
            cuando exista incumplimiento de estos términos, uso indebido, información
            falsa, actividad sospechosa, deuda pendiente, requerimiento de autoridad o
            riesgo para clientes, personal, terceros o infraestructura.
          </p>
        </LegalSection>

        <LegalSection title="13. Comunicaciones">
          <p>
            ECUBOX puede enviarte comunicaciones operativas sobre cuenta, paquetes,
            guías, entregas, incidencias, pagos o seguridad por la plataforma, correo,
            teléfono, WhatsApp, notificaciones web u otros canales disponibles. Las
            comunicaciones comerciales opcionales deberán respetar el consentimiento o
            mecanismos de oposición que correspondan.
          </p>
        </LegalSection>

        <LegalSection title="14. Propiedad intelectual">
          <p>
            La marca ECUBOX, logotipos, diseño, textos, interfaces y software pertenecen
            a ECUBOX o sus licenciantes. No se concede licencia distinta de la necesaria
            para usar la plataforma y los servicios contratados.
          </p>
        </LegalSection>

        <LegalSection title="15. Jurisdicción">
          <p>
            Salvo norma imperativa en contrario, estos términos se interpretan conforme
            a las leyes de la República del Ecuador. Las partes procurarán resolver
            diferencias de buena fe y podrán acudir a los mecanismos administrativos,
            judiciales o alternativos que correspondan.
          </p>
        </LegalSection>

        <LegalSection title="16. Contacto">
          <p>
            {muestraCanales
              ? 'Para consultas sobre estos términos, usa los canales oficiales publicados por ECUBOX.'
              : 'Para consultas sobre estos términos, comunícate con ECUBOX cuando los canales oficiales estén publicados.'}{' '}
            La forma en que tratamos tus datos se explica en la{' '}
            <Link
              to="/politica-de-privacidad"
              className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              política de privacidad
            </Link>
            .
          </p>
          <LegalContactBlock />
        </LegalSection>
      </div>
    </LegalPageLayout>
  );
}
