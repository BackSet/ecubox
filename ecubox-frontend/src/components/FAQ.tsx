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
    <section className="mx-auto max-w-3xl px-6 py-16 lg:py-20">
      <h2 className="landing-text mb-10 text-center text-2xl font-bold md:text-3xl">
        Preguntas frecuentes
      </h2>
      <Accordion type="single" collapsible className="space-y-3">
        {FAQ_ITEMS.map((item, i) => (
          <AccordionItem
            key={i}
            value={`item-${i}`}
            className="landing-card overflow-hidden transition-all duration-200 data-[state=open]:border-[var(--color-primary)]/40"
          >
            <AccordionTrigger className="w-full cursor-pointer px-5 py-4 text-left font-semibold landing-text transition hover:bg-[var(--color-landing-card-muted)] md:px-6 md:py-5">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="border-t border-[var(--color-landing-border)] px-5 pb-5 pt-4 text-sm leading-relaxed landing-text-muted md:px-6 md:pb-6">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
