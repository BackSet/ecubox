/**
 * Preguntas frecuentes públicas de la home. Fuente única consumida por el
 * componente {@code FAQ} (render visible) y por el JSON-LD `FAQPage`
 * ({@code buildFaqJsonLd} en `lib/seo.ts`), para que el contenido estructurado
 * y el visible nunca se desincronicen.
 */
export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: '¿Cómo rastreo mi paquete?',
    a: 'Ingresa tu número de guía o el número de tu paquete en la página de rastreo y verás en tiempo real el estado de tu envío y de cada paquete asociado.',
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
  {
    q: '¿Puedo enviar a varias personas con la misma cuenta?',
    a: 'Sí. Guarda varios destinatarios en tu cuenta y, al registrar cada guía, eliges quién recibirá sus paquetes. No necesitas crear cuentas adicionales.',
  },
  {
    q: '¿Un destinatario puede ser una oficina o sucursal?',
    a: 'Claro. Un destinatario puede ser una persona, un familiar, un colaborador, una oficina, una sucursal o una dirección habitual. Solo dale un nombre que reconozcas (por ejemplo “Oficina principal” o “Sucursal Cuenca”) y guarda su dirección.',
  },
  {
    q: '¿Puedo usar la misma cuenta para compras personales y de mi negocio?',
    a: 'Sí. Con una sola cuenta organizas tus compras personales, los regalos y los envíos de tu negocio, asignando cada guía al destinatario que corresponda.',
  },
  {
    q: '¿Qué pasa si cambio la dirección de un destinatario?',
    a: 'Al editar un destinatario, los cambios se aplican a tus envíos futuros. Las guías y los envíos que ya están en proceso conservan los datos que tenían en ese momento, para no afectar entregas en curso.',
  },
];
