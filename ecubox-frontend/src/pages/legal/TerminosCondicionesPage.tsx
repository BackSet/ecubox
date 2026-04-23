import { Link } from '@tanstack/react-router';
import { LegalPageLayout, LegalSection } from '@/pages/legal/LegalPageLayout';

export function TerminosCondicionesPage() {
  return (
    <LegalPageLayout
      title="Términos y condiciones de uso"
      subtitle="Reglas que aplican al uso del sitio web, la aplicación y los servicios de casillero, logística y rastreo ofrecidos bajo la marca ECUBOX."
    >
      <div className="space-y-10">
        <LegalSection title="1. Aceptación">
          <p>
            Al registrarte, iniciar sesión o utilizar los canales digitales de ECUBOX,
            declaras haber leído y aceptado estos términos. Si no estás de acuerdo, no
            utilices el servicio. El uso continuado tras cambios publicados implica la
            aceptación de la versión vigente.
          </p>
        </LegalSection>

        <LegalSection title="2. Objeto y descripción general del servicio">
          <p>
            ECUBOX ofrece, entre otros, servicios de{' '}
            <strong>casillero o dirección de recepción en Estados Unidos</strong>,
            recepción y gestión de paquetes, preparación de envíos,{' '}
            <strong>transporte internacional hacia Ecuador</strong>, herramientas de{' '}
            <strong>rastreo</strong>, cotización orientativa de tarifas y acceso a un
            panel para clientes. Las condiciones comerciales concretas (peso facturable,
            tiempos, coberturas, seguros opcionales, etc.) pueden detallarse en guías,
            manifiestos, liquidaciones o comunicaciones operativas y prevalecerán cuando
            constituyan el acuerdo específico de un envío, sin perjuicio de lo aquí
            establecido en materia de uso de la plataforma y responsabilidades generales.
          </p>
        </LegalSection>

        <LegalSection title="3. Cuenta, registro y veracidad de la información">
          <ul>
            <li>
              Debes proporcionar datos veraces, completos y actualizados. Eres responsable
              de la custodia de tu contraseña y de las actividades realizadas con tu
              cuenta.
            </li>
            <li>
              ECUBOX puede solicitar documentación adicional para verificar identidad,
              consignatarios o cumplimiento normativo (incluido comercio exterior y
              aduanas).
            </li>
            <li>
              Podemos suspender o cerrar cuentas ante uso fraudulento, abusivo o que
              ponga en riesgo la operación o a terceros.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="4. Uso permitido del sitio y de la API pública">
          <ul>
            <li>
              El sitio y las funciones públicas (por ejemplo rastreo o calculadora) deben
              usarse de forma razonable, sin intentar vulnerar seguridad, sobrecargar
              sistemas ni extraer datos de manera automatizada no autorizada.
            </li>
            <li>
              Las cotizaciones en línea son <strong>orientativas</strong>; el cobro final
              puede ajustarse al peso, medidas y clasificación verificados en bodega, así
              como a recargos o servicios adicionales aplicables.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="5. Mercancías prohibidas o restringidas">
          <p>
            No podrás enviar ni solicitar el manejo de bienes prohibidos por ley
            ecuatoriana, estadounidense o internacional, ni artículos que la transportista
            o ECUBOX consideren inseguros o no admitidos (por ejemplo, explosivos,
            armas y piezas, drogas, dinero en efectivo no declarado, restos biológicos,
            materiales corrosivos o radiactivos, marfil, especies protegidas, etc.). Listas
            no exhaustivas pueden publicarse en ayuda al cliente. El incumplimiento puede
            dar lugar a retención, destrucción conforme a norma, multas o denuncias a
            autoridad competente, a tu cargo.
          </p>
        </LegalSection>

        <LegalSection title="6. Aduanas, impuestos y declaraciones">
          <p>
            Eres el <strong>importador o responsable declarado</strong> ante las
            autoridades respecto de la mercancía que encargas enviar. Debes cumplir con
            aranceles, IVA, gravámenes, permisos, cupos y restricciones de producto.
            ECUBOX y sus socios logísticos actúan como intermediarios operativos; no
            sustituyen asesoría legal o tributaria. Retrasos o costos adicionales por
            inspección aduanera, retención o requerimiento documental corren por cuenta y
            riesgo del destinatario o quien figure como responsable del envío.
          </p>
        </LegalSection>

        <LegalSection title="7. Recepción, almacenamiento, plazos y paquetes no reclamados">
          <ul>
            <li>
              Los plazos de almacenamiento gratuito o de custodia, así como políticas de
              paquetes vencidos o abandonados, se comunicarán en el panel, por correo o
              según tarifario vigente.
            </li>
            <li>
              Transcurrido el plazo sin pago o instrucciones claras, ECUBOX podrá aplicar
              cargos de bodega, devolución a remitente o disposición conforme a política
              interna y a la ley, previa comunicación razonable cuando sea posible.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="8. Pesos, medidas y facturación">
          <p>
            El peso facturable puede ser el <strong>peso real o el peso volumétrico</strong>
            , el que sea mayor, según tabla de la transportista o política ECUBOX. Las
            medidas deben declararse de buena fe; discrepancias detectadas en báscula o
            cubiscan pueden reflejarse en el costo final.
          </p>
        </LegalSection>

        <LegalSection title="9. Entregas, retrasos y fuerza mayor">
          <p>
            Los plazos de tránsito son estimados y no garantizados. No nos hacemos
            responsables por demoras causadas por autoridades, clima, huelgas, pandemia,
            cierre de fronteras, fallos de terceros transportistas o causas fuera de
            control razonable de ECUBOX, sin perjuicio de los derechos que la ley aplicable
            otorgue al consumidor.
          </p>
        </LegalSection>

        <LegalSection title="10. Limitación de responsabilidad">
          <p>
            En la medida en que la ley aplicable lo permita, ECUBOX no será responsable por
            daños indirectos, lucro cesante o pérdida de datos salvo que medie dolo o
            culpa grave demostrable. Para extravío o daño de mercancía, cualquier
            indemnización se regirá por los límites establecidos en convenios
            internacionales aplicables (cuando corresponda), pólizas de seguro contratadas
            y/o condiciones tarifarias específicas del envío. Es tu responsabilidad
            contratar seguro adicional cuando esté disponible y convenga a tu mercancía.
          </p>
        </LegalSection>

        <LegalSection title="11. Propiedad intelectual">
          <p>
            Marca, logotipos, diseño del sitio, textos y software son propiedad de ECUBOX
            o sus licenciantes. No se concede licencia salvo la estrictamente necesaria
            para usar el servicio en forma personal y no comercial.
          </p>
        </LegalSection>

        <LegalSection title="12. Modificaciones">
          <p>
            ECUBOX puede actualizar estos términos. Publicaremos la versión vigente en
            esta página con la fecha de actualización. Te recomendamos revisarla
            periódicamente.
          </p>
        </LegalSection>

        <LegalSection title="13. Ley aplicable y resolución de controversias">
          <p>
            Salvo norma imperativa en contrario, estos términos se rigen por las leyes de
            la <strong>República del Ecuador</strong>. Las partes procurarán resolver
            diferencias de buena fe. Si no fuere posible, se someterán a los jueces
            competentes del domicilio principal de ECUBOX en Ecuador, sin perjuicio de
            mecanismos
            alternativos de resolución de conflictos que la ley de consumo habilite.
          </p>
        </LegalSection>

        <LegalSection title="14. Contacto">
          <p>
            Para consultas sobre estos términos, utiliza los canales oficiales indicados
            en el sitio web (correo o formulario de contacto). También puedes revisar la{' '}
            <Link
              to="/privacidad"
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
