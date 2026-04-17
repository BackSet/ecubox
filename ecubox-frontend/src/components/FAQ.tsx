import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQ_ITEMS = [
  {
    q: '¿Cómo rastreo mi paquete?',
    a: 'Ingresa tu número de guía en la página de rastreo y verás en tiempo real el estado de tu envío.',
  },
  {
    q: '¿Qué artículos no puedo enviar?',
    a: 'No se permiten explosivos, armas, dinero en efectivo, joyas de alto valor o sustancias prohibidas.',
  },
  {
    q: '¿Cuánto tarda en llegar mi compra?',
    a: 'Desde USA suele tardar entre 8 y 12 días laborables una vez que llega a nuestro almacén en New Jersey.',
  },
  {
    q: '¿Cómo funcionan las tarifas?',
    a: 'Cobramos por peso real según el tipo de servicio. Usa nuestra calculadora para obtener un costo aproximado.',
  },
];

export function FAQ() {
  return (
    <section className="content-container mobile-safe-inline section-spacing max-w-4xl">
      <h2 className="landing-text responsive-title mb-8 text-center font-bold md:mb-10">
        Preguntas frecuentes
      </h2>
      <Accordion type="single" collapsible className="space-y-3">
        {FAQ_ITEMS.map((item, i) => (
          <AccordionItem
            key={i}
            value={`item-${i}`}
            className="landing-card overflow-hidden transition-all duration-200 data-[state=open]:border-[var(--color-primary)]/40"
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
