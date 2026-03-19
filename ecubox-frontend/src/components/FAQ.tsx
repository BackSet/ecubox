import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQ_ITEMS = [
  {
    q: '¿Cómo rastreo mi paquete?',
    a: 'Es muy fácil. Ingresa tu número de guía en la barra de búsqueda o en la página de rastreo y verás en tiempo real el estado de tu envío.',
  },
  {
    q: '¿Qué artículos no puedo enviar?',
    a: 'No se permiten explosivos, armas, dinero en efectivo, joyas de alto valor o sustancias prohibidas. Revisa nuestra sección de Prohibidos para más detalles.',
  },
  {
    q: '¿Cuánto tarda en llegar mi compra?',
    a: 'Desde USA suele tardar entre 5 y 8 días laborables una vez que llega a nuestro almacén en Miami. Despachamos con la mayor rapidez posible.',
  },
  {
    q: '¿Cómo funcionan las tarifas?',
    a: 'Cobramos por peso real según el tipo de servicio. Usa nuestra calculadora para obtener un costo aproximado antes de enviar.',
  },
];

export function FAQ() {
  return (
    <section className="max-w-4xl mx-auto px-6 py-16 lg:py-20">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-10 text-center">
        Preguntas frecuentes
      </h2>
      <Accordion type="single" collapsible className="space-y-3">
        {FAQ_ITEMS.map((item, i) => (
          <AccordionItem
            key={i}
            value={`item-${i}`}
            className="rounded-xl bg-[var(--color-landing-card)] border border-white/10 transition-all duration-300 data-[state=open]:border-[var(--color-ecubox-purple-light)]/50"
          >
            <AccordionTrigger className="flex justify-between items-center w-full p-5 md:p-6 cursor-pointer font-semibold text-white list-none text-left hover:bg-white/5 rounded-xl transition [&[data-state=open]>svg]:rotate-180">
                <span className="text-left pr-4">{item.q}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 shrink-0 transition-transform duration-300 text-[var(--color-ecubox-purple-light)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </AccordionTrigger>
            <AccordionContent className="px-5 md:px-6 pb-5 md:pb-6 text-sm text-white/70 leading-relaxed border-t border-white/10 pt-4 overflow-hidden">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
