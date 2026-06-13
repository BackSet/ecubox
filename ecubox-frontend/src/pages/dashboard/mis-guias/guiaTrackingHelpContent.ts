/**
 * Contenido estructurado (sin presentación) para la ayuda «¿Cómo encuentro el
 * número de guía?». Lo consumen el componente {@link GuiaTrackingHelp} (página
 * Mis guías y diálogo Registrar guías) y las pruebas, para evitar duplicar
 * texto entre superficies.
 *
 * IMPORTANTE: todos los códigos de ejemplo son FICTICIOS e ilustrativos. No
 * provienen de cuentas reales ni de capturas de terceros. Amazon y SHEIN se
 * mencionan solo como ejemplos educativos; la navegación exacta de cada tienda
 * puede cambiar.
 */

/** Mensaje principal: qué es el número de guía. */
export const GUIA_TRACKING_MENSAJE_PRINCIPAL =
  'El número de guía es el código de rastreo que aparece cuando la tienda confirma que tu paquete fue enviado. No es el número de pedido ni el número de factura.';

/** Qué hacer cuando una compra se divide en varios paquetes. */
export const GUIA_TRACKING_MENSAJE_DIVIDIDO =
  'Si la tienda dividió tu compra en varios paquetes y muestra varios números de rastreo, registra cada número como una guía separada.';

/** Texto breve para colocar debajo del campo de captura. */
export const GUIA_TRACKING_HINT_CAMPO =
  'Copia el número de rastreo, no el número del pedido.';

/** Dónde suele aparecer el número de guía. */
export const GUIA_TRACKING_DONDE_APARECE: readonly string[] = [
  'En el correo de "Pedido enviado" o "En camino" de la tienda.',
  'Dentro del detalle del pedido, en la sección "Rastrear" o "Seguimiento".',
  'En la confirmación del transportista (UPS, USPS, FedEx, etc.).',
];

/** Datos que SÍ son un número de guía. */
export const GUIA_TRACKING_DATOS_CORRECTOS: readonly string[] = [
  'Número de rastreo',
  'Tracking number',
  'Tracking ID',
  'Package tracking',
];

/** Datos que NO son un número de guía. */
export const GUIA_TRACKING_DATOS_INCORRECTOS: readonly string[] = [
  'Número de pedido',
  'Número de factura',
  'SKU',
  'Código del producto',
  'Referencia de pago',
];

export interface EjemploTiendaTracking {
  /** Nombre de la tienda (ejemplo educativo). */
  tienda: string;
  /** Pasos conceptuales para localizar el número de rastreo. */
  pasos: readonly string[];
  /** Ejemplos ficticios de números de guía correctos. */
  ejemplosCorrectos: readonly string[];
  /** Ejemplo ficticio de un dato que NO es la guía (número de pedido). */
  ejemploIncorrecto: { etiqueta: string; valor: string };
  /** Aclaración de variabilidad de formato. */
  nota: string;
}

export const EJEMPLO_AMAZON: EjemploTiendaTracking = {
  tienda: 'Amazon',
  pasos: [
    'Abre "Tus pedidos".',
    'Elige una compra que ya fue enviada.',
    'Abre "Rastrear paquete" o los detalles del envío.',
    'Copia el número de rastreo del transportista.',
  ],
  ejemplosCorrectos: ['1Z999AA10123456784', 'TBA123456789000'],
  ejemploIncorrecto: { etiqueta: 'Número de pedido', valor: 'Pedido # 114-1234567-1234567' },
  nota: 'Los formatos pueden variar; estos códigos son ilustrativos.',
};

export const EJEMPLO_SHEIN: EjemploTiendaTracking = {
  tienda: 'SHEIN',
  pasos: [
    'Abre "Mis pedidos".',
    'Entra al pedido enviado.',
    'Abre "Seguimiento" o "Rastrear".',
    'Copia el número de rastreo mostrado.',
  ],
  ejemplosCorrectos: ['YT2412345678901234', 'SF1234567890123'],
  ejemploIncorrecto: { etiqueta: 'Número de pedido', valor: 'Pedido GSHM00012345678' },
  nota: 'Los formatos pueden variar; estos códigos son ilustrativos.',
};

export const GUIA_TRACKING_EJEMPLOS: readonly EjemploTiendaTracking[] = [
  EJEMPLO_AMAZON,
  EJEMPLO_SHEIN,
];

/**
 * Heurística NO bloqueante para detectar, con alta confianza, un número de
 * pedido de Amazon en lugar de un número de guía.
 *
 * Regla documentada: el patrón canónico del *order number* de Amazon es
 * `ddd-ddddddd-ddddddd` (3-7-7 dígitos separados por guiones). La validación
 * real sigue aceptando cualquier número de guía (no se endurece por
 * transportista); esto solo produce un aviso suave que permite continuar.
 *
 * Se mantiene deliberadamente estrecho para evitar falsos positivos: un número
 * de guía real (p. ej. UPS `1Z…`, USPS, FedEx) no coincide con este patrón.
 */
const PATRON_PEDIDO_AMAZON = /^\d{3}-\d{7}-\d{7}$/;

export function pareceNumeroPedido(valor: string): boolean {
  const limpio = valor.trim().replace(/^pedido\s*#?\s*/i, '').trim();
  return PATRON_PEDIDO_AMAZON.test(limpio);
}

/** Aviso suave (no bloqueante) cuando el valor parece un número de pedido. */
export const GUIA_TRACKING_AVISO_PEDIDO =
  'Esto parece un número de pedido, no un número de guía. Revisa el número de rastreo del envío. Si estás seguro, puedes continuar.';
