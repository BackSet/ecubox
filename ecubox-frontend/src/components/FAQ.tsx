import { HelpCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { usePublicCanalesDisponibles } from '@/hooks/useCanalesComunicacion';

const FAQ_ITEMS = [
  {
    q: '¿Cómo rastreo mi paquete?',
    a: 'Ingresa tu número de guía o el código del consolidador en la página de rastreo y verás en tiempo real el estado de tu envío y de cada pieza asociada.',
  },
  {
    q: '¿Necesito tarjeta o pagar mensualidad?',
    a: 'No. Crear tu casillero ECUBOX es 100% gratis. Solo pagas por los envíos que realices, según el peso real del paquete.',
  },
  {
    q: '¿Qué artículos no puedo enviar?',
    a: 'No se permiten explosivos, armas, dinero en efectivo, joyas de alto valor ni sustancias prohibidas. Si tienes dudas sobre un artículo específico, escríbenos antes de comprarlo.',
  },
  {
    q: '¿Cuánto tarda en llegar mi compra?',
    a: 'Desde USA suele tardar entre 8 y 12 días laborables una vez que tu paquete llega a nuestro almacén en New Jersey. Los tiempos pueden variar en temporada alta.',
  },
  {
    q: '¿Cómo funcionan las tarifas?',
    a: 'Cobramos por peso real según el tipo de servicio. Usa nuestra calculadora para obtener un costo aproximado antes de comprar y evita sorpresas al despacho.',
  },
  {
    q: '¿Puedo retirar en agencia o solo a domicilio?',
    a: 'Tenemos ambas opciones según tu provincia. Al crear tu envío puedes elegir retirar en una de nuestras agencias o en un punto de entrega aliado de un courier cercano a ti.',
  },
];

export function FAQ() {
  const { hasCanales } = usePublicCanalesDisponibles();

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="content-container mobile-safe-inline section-spacing max-w-4xl"
    >
      <div className="mb-9 text-center md:mb-12">
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-landing-border)] bg-[var(--color-landing-card-muted)] px-3 py-1 text-xs font-medium uppercase tracking-wider landing-text-muted">
          <HelpCircle className="h-3 w-3 text-[var(--color-primary)]" aria-hidden />
          Preguntas frecuentes
        </p>
        <h2 id="faq-heading" className="landing-text responsive-title font-bold">
          Todo lo que necesitas saber
        </h2>
        <p className="landing-text-muted mt-3 text-sm sm:text-base">
          {hasCanales
            ? 'Si no encuentras tu respuesta, escríbenos y te ayudamos en minutos.'
            : 'Revisa las respuestas más comunes sobre envíos, tarifas y casilleros.'}
        </p>
      </div>

      <Accordion type="single" collapsible className="space-y-3">
        {FAQ_ITEMS.map((item, i) => (
          <AccordionItem
            key={i}
            value={`item-${i}`}
            className="landing-card overflow-hidden transition-all duration-200 data-[state=open]:border-[var(--color-primary)]/40 data-[state=open]:shadow-md"
          >
            <AccordionTrigger className="w-full cursor-pointer px-4 py-3.5 text-left text-sm font-semibold landing-text transition hover:bg-[var(--color-landing-card-muted)] sm:px-5 sm:py-4 md:px-6 md:py-5 md:text-base">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="border-t border-[var(--color-landing-border)] px-4 pb-4 pt-3 text-sm leading-relaxed landing-text-muted sm:px-5 sm:pb-5 sm:pt-4 md:px-6 md:pb-6">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
