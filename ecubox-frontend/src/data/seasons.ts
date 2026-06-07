/**
 * Catálogo de "temporadas" (días festivos) que tematizan el landing y las
 * páginas públicas. Cada temporada solo sobrescribe tokens CSS y activa slots
 * decorativos opcionales: la identidad de marca (morado #7B3FE4) permanece como
 * base y la temporada la matiza, nunca la reemplaza.
 *
 * Las fechas se calculan por año para soportar festivos móviles (Día de la
 * Madre, Carnaval, Semana Santa…). El rango es semiabierto [inicio, fin).
 *
 * Paletas: `tokens` define los colores para el tema claro y `tokensDark` los
 * ajusta para el tema oscuro (se fusionan sobre `tokens`). Solo se especifican
 * en `tokensDark` las variables que necesitan cambiar para verse bien sobre el
 * fondo oscuro (p. ej. acentos muy oscuros que deben aclararse).
 */

export type SeasonOrnamento =
  | 'flores'
  | 'corazones'
  | 'estrellas'
  | 'confeti'
  | 'nieve'
  | 'fuegos'
  | 'globos'
  | 'banderas'
  | 'calabazas';

/** Rutas internas admitidas como destino del CTA de un banner. */
export type SeasonCtaHref = '/calculadora' | '/registro';

export interface SeasonBanner {
  /** Mensaje principal del banner promocional. */
  texto: string;
  /** Llamado a la acción opcional (navegación SPA a una ruta interna). */
  cta?: { label: string; href: SeasonCtaHref };
}

export interface SeasonRango {
  inicio: Date;
  fin: Date;
}

/** Override de la ventana de una temporada (configurable desde administración). */
export interface SeasonVentana {
  diasAntes?: number;
  diasDespues?: number;
}

/** Overrides por id de temporada. */
export type SeasonVentanas = Record<string, SeasonVentana | undefined>;

export interface SeasonDefinition {
  /** Identificador estable; se expone como `data-season` en el landing-shell. */
  id: string;
  /** Nombre legible para administración. */
  nombre: string;
  /** Texto del badge que se muestra en el Hero. */
  badge: string;
  /** Capa decorativa animada. */
  ornamento: SeasonOrnamento;
  /** Overrides de variables CSS (tema claro) aplicados inline al landing-shell. */
  tokens: Record<string, string>;
  /** Ajustes de tokens para el tema oscuro; se fusionan sobre `tokens`. */
  tokensDark?: Record<string, string>;
  /** Banner promocional opcional con CTA. */
  banner?: SeasonBanner;
  /**
   * Fecha clave de la temporada (el día festivo en sí) para un año dado.
   * La ventana activa se construye alrededor de ella con `diasAntes`/`diasDespues`.
   */
  fechaClave: (year: number) => Date;
  /**
   * Días de anticipación con que se activa el tema antes de la fecha clave.
   * Es el principal parámetro configurable: súbelo para abrir antes (más margen
   * de envío) o bájalo para acercarlo al día.
   */
  diasAntes: number;
  /** Días que el tema permanece activo después de la fecha clave (0 = solo hasta ese día). */
  diasDespues: number;
}

/** Construye una fecha local a medianoche para evitar desfases por zona horaria. */
function fecha(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day, 0, 0, 0, 0);
}

/**
 * Devuelve el día del mes correspondiente a la n-ésima ocurrencia de un día de
 * la semana (0 = domingo). Ej.: 2º domingo de mayo → nthWeekday(year, 4, 0, 2).
 */
function nthWeekday(year: number, monthIndex: number, weekday: number, n: number): number {
  const primero = fecha(year, monthIndex, 1).getDay();
  const offset = (weekday - primero + 7) % 7;
  return 1 + offset + (n - 1) * 7;
}

/** Suma (o resta) días a una fecha sin mutarla. */
function addDays(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

/** Domingo de Pascua (algoritmo de Gauss/Computus, calendario gregoriano). */
function pascua(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3 = marzo, 4 = abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return fecha(year, mes - 1, dia);
}

/**
 * Calcula la ventana activa [inicio, fin) de una temporada para un año dado a
 * partir de su fecha clave y los días de anticipación/posterioridad.
 */
export function computeRango(
  season: SeasonDefinition,
  year: number,
  ventanas?: SeasonVentanas,
): SeasonRango {
  const override = ventanas?.[season.id];
  const diasAntes = override?.diasAntes ?? season.diasAntes;
  const diasDespues = override?.diasDespues ?? season.diasDespues;
  const clave = season.fechaClave(year);
  return {
    inicio: addDays(clave, -diasAntes),
    // `fin` es exclusivo, por eso el +1: el último día activo es clave + diasDespues.
    fin: addDays(clave, diasDespues + 1),
  };
}

export const SEASONS: SeasonDefinition[] = [
  {
    id: 'ano-nuevo',
    nombre: 'Año Nuevo y Reyes',
    badge: '🎆 Año Nuevo',
    ornamento: 'fuegos',
    tokens: {
      '--color-primary': '#A67C00',
      '--color-ecubox-acento-claro': '#E9C46A',
      '--color-landing-overlay-a': 'rgb(201 168 76 / 0.12)',
      '--color-landing-overlay-b': 'rgb(166 124 0 / 0.06)',
    },
    tokensDark: {
      '--color-primary': '#E0B84A',
      '--color-primary-foreground': '#1A1A1A',
      '--color-ecubox-acento-claro': '#F4D58D',
    },
    banner: {
      texto: 'Empieza el año estrenando: compra en USA tus pendientes y recíbelos en Ecuador.',
      cta: { label: 'Calcular mi envío', href: '/calculadora' },
    },
    // Del 27 de diciembre (5 días antes) al Día de Reyes, 6 de enero (5 días después).
    fechaClave: (year) => fecha(year, 0, 1),
    diasAntes: 5,
    diasDespues: 5,
  },
  {
    id: 'san-valentin',
    nombre: 'San Valentín',
    badge: '💕 San Valentín',
    ornamento: 'corazones',
    tokens: {
      '--color-primary': '#E11D62',
      '--color-ecubox-acento-claro': '#FF8FB1',
      '--color-landing-overlay-a': 'rgb(225 29 98 / 0.10)',
      '--color-landing-overlay-b': 'rgb(255 143 177 / 0.07)',
    },
    banner: {
      texto: 'Sorprende a quien amas el 14 de febrero: compra su regalo en USA y se lo llevamos a Ecuador.',
      cta: { label: 'Comprar su regalo', href: '/calculadora' },
    },
    fechaClave: (year) => fecha(year, 1, 14),
    diasAntes: 14,
    diasDespues: 0,
  },
  {
    id: 'carnaval',
    nombre: 'Carnaval',
    badge: '🎭 Carnaval',
    ornamento: 'confeti',
    tokens: {
      '--color-primary': '#D6336C',
      '--color-ecubox-acento-claro': '#FF922B',
      '--color-landing-overlay-a': 'rgb(214 51 108 / 0.10)',
      '--color-landing-overlay-b': 'rgb(255 146 43 / 0.08)',
    },
    banner: {
      texto: 'Llega Carnaval: adelanta tus compras en USA y disfruta el feriado sin esperar tus paquetes.',
      cta: { label: 'Ver tarifas', href: '/calculadora' },
    },
    // Martes de Carnaval = 47 días antes del Domingo de Pascua.
    fechaClave: (year) => addDays(pascua(year), -47),
    diasAntes: 4,
    diasDespues: 0,
  },
  {
    id: 'dia-mujer',
    nombre: 'Día de la Mujer',
    badge: '💜 Día de la Mujer',
    ornamento: 'flores',
    tokens: {
      '--color-primary': '#8E44AD',
      '--color-ecubox-acento-claro': '#C39BD3',
      '--color-landing-overlay-a': 'rgb(142 68 173 / 0.10)',
      '--color-landing-overlay-b': 'rgb(195 155 211 / 0.07)',
    },
    banner: {
      texto: 'Celebra a las mujeres que admiras: elige su regalo en USA y nosotros lo traemos a Ecuador.',
      cta: { label: 'Comprar un regalo', href: '/calculadora' },
    },
    fechaClave: (year) => fecha(year, 2, 8),
    diasAntes: 10,
    diasDespues: 0,
  },
  {
    id: 'semana-santa',
    nombre: 'Semana Santa',
    badge: '🕊️ Semana Santa',
    ornamento: 'flores',
    tokens: {
      '--color-primary': '#6B4FA0',
      '--color-ecubox-acento-claro': '#A78BD0',
      '--color-landing-overlay-a': 'rgb(107 79 160 / 0.09)',
      '--color-landing-overlay-b': 'rgb(167 139 208 / 0.06)',
    },
    banner: {
      texto: 'Aprovecha el feriado de Semana Santa: tus compras de USA llegan a Ecuador a tiempo.',
      cta: { label: 'Cotizar mi envío', href: '/calculadora' },
    },
    // Domingo de Pascua; ventana desde el inicio de Semana Santa hasta el lunes.
    fechaClave: (year) => pascua(year),
    diasAntes: 7,
    diasDespues: 1,
  },
  {
    id: 'dia-madre',
    nombre: 'Día de la Madre',
    badge: '💐 Día de la Madre',
    ornamento: 'flores',
    tokens: {
      '--color-primary': '#E5547F',
      '--color-ecubox-acento-claro': '#FF9EB5',
      '--color-landing-overlay-a': 'rgb(229 84 127 / 0.10)',
      '--color-landing-overlay-b': 'rgb(255 158 181 / 0.07)',
    },
    banner: {
      texto: 'Consiente a mamá: compra su regalo en USA y se lo enviamos a Ecuador con tiempo de sobra.',
      cta: { label: 'Comprar para mamá', href: '/calculadora' },
    },
    // Segundo domingo de mayo (Ecuador).
    fechaClave: (year) => fecha(year, 4, nthWeekday(year, 4, 0, 2)),
    diasAntes: 14,
    diasDespues: 0,
  },
  {
    id: 'dia-nino',
    nombre: 'Día del Niño',
    badge: '🎈 Día del Niño',
    ornamento: 'globos',
    tokens: {
      '--color-primary': '#0C8599',
      '--color-ecubox-acento-claro': '#FFC078',
      '--color-landing-overlay-a': 'rgb(12 133 153 / 0.10)',
      '--color-landing-overlay-b': 'rgb(255 192 120 / 0.08)',
    },
    banner: {
      texto: 'Hazlos felices: trae sus juguetes y antojos favoritos desde USA hasta Ecuador.',
      cta: { label: 'Comprar para los niños', href: '/calculadora' },
    },
    fechaClave: (year) => fecha(year, 5, 1),
    diasAntes: 10,
    diasDespues: 0,
  },
  {
    id: 'dia-padre',
    nombre: 'Día del Padre',
    badge: '🎁 Día del Padre',
    ornamento: 'estrellas',
    tokens: {
      '--color-primary': '#1F6FB2',
      '--color-ecubox-acento-claro': '#4FB0C6',
      '--color-landing-overlay-a': 'rgb(31 111 178 / 0.10)',
      '--color-landing-overlay-b': 'rgb(79 176 198 / 0.07)',
    },
    banner: {
      texto: 'Este Día del Padre, compra el regalo de papá en USA y nosotros lo traemos a Ecuador.',
      cta: { label: 'Comprar para papá', href: '/calculadora' },
    },
    // Tercer domingo de junio (Ecuador).
    fechaClave: (year) => fecha(year, 5, nthWeekday(year, 5, 0, 3)),
    diasAntes: 14,
    diasDespues: 0,
  },
  {
    id: 'fiestas-patrias',
    nombre: 'Fiestas Patrias (10 de Agosto)',
    badge: '🇪🇨 Fiestas Patrias',
    ornamento: 'banderas',
    tokens: {
      '--color-primary': '#1F4FA0',
      '--color-ecubox-acento-claro': '#FFD43B',
      '--color-landing-overlay-a': 'rgb(31 79 160 / 0.10)',
      '--color-landing-overlay-b': 'rgb(255 212 59 / 0.08)',
    },
    banner: {
      texto: 'Orgullo ecuatoriano: compra en USA y recibe en Ecuador con la confianza de siempre.',
      cta: { label: 'Calcular mi envío', href: '/calculadora' },
    },
    fechaClave: (year) => fecha(year, 7, 10),
    diasAntes: 7,
    diasDespues: 1,
  },
  {
    id: 'independencia-guayaquil',
    nombre: 'Fiestas de Guayaquil (9 de Octubre)',
    badge: '🇪🇨 Fiestas de Guayaquil',
    ornamento: 'banderas',
    tokens: {
      '--color-primary': '#2C7BBF',
      '--color-ecubox-acento-claro': '#8FC1E8',
      '--color-landing-overlay-a': 'rgb(44 123 191 / 0.10)',
      '--color-landing-overlay-b': 'rgb(143 193 232 / 0.07)',
    },
    banner: {
      texto: '¡Viva Guayaquil! Trae tus compras de USA y recíbelas en el Puerto Principal.',
      cta: { label: 'Ver tarifas', href: '/calculadora' },
    },
    fechaClave: (year) => fecha(year, 9, 9),
    diasAntes: 6,
    diasDespues: 1,
  },
  {
    id: 'halloween',
    nombre: 'Halloween',
    badge: '🎃 Halloween',
    ornamento: 'calabazas',
    tokens: {
      '--color-primary': '#C2410C',
      '--color-ecubox-acento-claro': '#7048E8',
      '--color-landing-overlay-a': 'rgb(194 65 12 / 0.12)',
      '--color-landing-overlay-b': 'rgb(112 72 232 / 0.08)',
    },
    tokensDark: {
      '--color-primary': '#E8590C',
      '--color-ecubox-acento-claro': '#9775FA',
    },
    banner: {
      texto: 'Prepara tu Halloween: disfraces, decoración y dulces desde USA, directo a Ecuador.',
      cta: { label: 'Comprar para Halloween', href: '/calculadora' },
    },
    fechaClave: (year) => fecha(year, 9, 31),
    diasAntes: 14,
    diasDespues: 0,
  },
  {
    id: 'black-friday',
    nombre: 'Black Friday & Cyber Monday',
    badge: '🛍️ Black Friday & Cyber Monday',
    ornamento: 'confeti',
    tokens: {
      '--color-primary': '#1A1A1A',
      '--color-ecubox-acento-claro': '#C9A84C',
      '--color-landing-overlay-a': 'rgb(201 168 76 / 0.12)',
      '--color-landing-overlay-b': 'rgb(26 26 26 / 0.05)',
    },
    tokensDark: {
      // En oscuro el negro se confunde con el fondo: usamos el dorado como color
      // principal con texto oscuro encima.
      '--color-primary': '#E8B84B',
      '--color-primary-foreground': '#1A1A1A',
      '--color-ecubox-acento-claro': '#F0D58A',
    },
    banner: {
      texto: 'Black Friday & Cyber Monday: compra en Amazon, eBay y Shein a los mejores precios y nosotros lo traemos.',
      cta: { label: 'Ver tarifas', href: '/calculadora' },
    },
    // Black Friday = día siguiente al 4º jueves de noviembre (Thanksgiving).
    // Desde el lunes previo (4 días antes) hasta el Cyber Monday (3 días después).
    fechaClave: (year) => fecha(year, 10, nthWeekday(year, 10, 4, 4) + 1),
    diasAntes: 4,
    diasDespues: 3,
  },
  {
    id: 'fiestas-quito',
    nombre: 'Fiestas de Quito',
    badge: '🎉 Fiestas de Quito',
    ornamento: 'confeti',
    tokens: {
      '--color-primary': '#C92A2A',
      '--color-ecubox-acento-claro': '#FFD43B',
      '--color-landing-overlay-a': 'rgb(201 42 42 / 0.10)',
      '--color-landing-overlay-b': 'rgb(255 212 59 / 0.08)',
    },
    banner: {
      texto: '¡Que viva Quito! Aprovecha el feriado y trae tus compras de USA a Ecuador.',
      cta: { label: 'Calcular mi envío', href: '/calculadora' },
    },
    fechaClave: (year) => fecha(year, 11, 6),
    diasAntes: 5,
    diasDespues: 0,
  },
  {
    id: 'navidad',
    nombre: 'Navidad',
    badge: '🎄 Navidad',
    ornamento: 'nieve',
    tokens: {
      '--color-primary': '#C0392B',
      '--color-ecubox-acento-claro': '#2E8B57',
      '--color-landing-overlay-a': 'rgb(192 57 43 / 0.10)',
      '--color-landing-overlay-b': 'rgb(46 139 87 / 0.07)',
    },
    banner: {
      texto: 'Adelanta tus compras navideñas: aún hay tiempo para que lleguen a Ecuador.',
      cta: { label: 'Calcular tiempos y costo', href: '/calculadora' },
    },
    // Fecha clave: Navidad (25 dic). Desde el 7 de diciembre (18 días antes,
    // tras las Fiestas de Quito) hasta el 26 de diciembre.
    fechaClave: (year) => fecha(year, 11, 25),
    diasAntes: 18,
    diasDespues: 1,
  },
];

export const SEASONS_BY_ID: Record<string, SeasonDefinition> = Object.fromEntries(
  SEASONS.map((s) => [s.id, s])
);

/** Resuelve la temporada activa por fecha, o `null` si no hay ninguna. */
export function resolveSeasonByDate(now: Date, ventanas?: SeasonVentanas): SeasonDefinition | null {
  const t = now.getTime();
  // Se prioriza el año en curso y luego se evalúan el siguiente y el anterior
  // para cubrir temporadas que cruzan el cambio de año (Año Nuevo a fin/inicio
  // de año, o colas largas de diciembre configuradas por el admin).
  for (const year of [now.getFullYear(), now.getFullYear() + 1, now.getFullYear() - 1]) {
    for (const season of SEASONS) {
      const { inicio, fin } = computeRango(season, year, ventanas);
      if (t >= inicio.getTime() && t < fin.getTime()) {
        return season;
      }
    }
  }
  return null;
}
