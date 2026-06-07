import { describe, expect, it } from 'vitest';
import { computeRango, resolveSeasonByDate, SEASONS } from './seasons';

/** Construye una fecha local a medianoche (mismo criterio que seasons.ts). */
function d(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

describe('resolveSeasonByDate', () => {
  it('activa Día del Padre dentro de su ventana (3er domingo de junio, 2026)', () => {
    // 3er domingo de junio 2026 = 21-jun; ventana por defecto: 14 días antes.
    expect(resolveSeasonByDate(d(2026, 5, 21))?.id).toBe('dia-padre');
    expect(resolveSeasonByDate(d(2026, 5, 7))?.id).toBe('dia-padre');
  });

  it('devuelve null (tema base) fuera de toda temporada', () => {
    // Principios de julio: sin festivos configurados.
    expect(resolveSeasonByDate(d(2026, 6, 5))).toBeNull();
  });

  it('cubre Año Nuevo a ambos lados del cambio de año', () => {
    expect(resolveSeasonByDate(d(2026, 11, 30))?.id).toBe('ano-nuevo'); // 30-dic
    expect(resolveSeasonByDate(d(2027, 0, 3))?.id).toBe('ano-nuevo'); // 3-ene
  });

  it('prioriza San Valentín sobre Carnaval en el solape (14-feb-2026)', () => {
    // En 2026 Carnaval (17-feb) empieza su ventana el 13-feb, solapando el fin
    // de San Valentín. San Valentín debe ganar por orden de prioridad.
    expect(resolveSeasonByDate(d(2026, 1, 14))?.id).toBe('san-valentin');
  });

  it('respeta los overrides de ventana configurados', () => {
    // 25-sep-2026 está fuera de toda temporada por defecto (Halloween abre el 17-oct).
    expect(resolveSeasonByDate(d(2026, 8, 25))).toBeNull();
    // Ampliando la anticipación de Halloween a 45 días, el 25-sep ya cae dentro.
    const ventanas = { halloween: { diasAntes: 45 } };
    expect(resolveSeasonByDate(d(2026, 8, 25), ventanas)?.id).toBe('halloween');
  });
});

describe('computeRango', () => {
  const navidad = SEASONS.find((s) => s.id === 'navidad')!;

  it('construye la ventana [clave - diasAntes, clave + diasDespues + 1)', () => {
    const { inicio, fin } = computeRango(navidad, 2026);
    // Navidad: clave 25-dic, 18 días antes = 7-dic; 1 día después → fin excl 27-dic.
    expect(inicio.getMonth()).toBe(11);
    expect(inicio.getDate()).toBe(7);
    expect(fin.getMonth()).toBe(11);
    expect(fin.getDate()).toBe(27);
  });

  it('aplica el override de ventana por encima de los valores por defecto', () => {
    const { inicio } = computeRango(navidad, 2026, { navidad: { diasAntes: 30 } });
    expect(inicio.getMonth()).toBe(10); // noviembre
    expect(inicio.getDate()).toBe(25);
  });
});

describe('catálogo de temporadas', () => {
  it('no tiene ids duplicados', () => {
    const ids = SEASONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todas las temporadas tienen badge, banner y tokens de color', () => {
    for (const s of SEASONS) {
      expect(s.badge.length).toBeGreaterThan(0);
      expect(s.banner?.texto.length ?? 0).toBeGreaterThan(0);
      expect(s.tokens['--color-primary']).toMatch(/^#/);
    }
  });
});
